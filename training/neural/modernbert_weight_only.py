"""Fail-closed conversion of ORT dynamic uint8 MatMul blocks to float arithmetic."""
import copy
import hashlib
from collections import Counter, defaultdict

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

MODE = "weight-only-u8-fp32"
FORBIDDEN = {"DynamicQuantizeLinear", "MatMulInteger", "QLinearMatMul", "QuantizeLinear"}


def initializer_hashes(model):
    """Hash values, dimensions and type, independently of external-data locations."""
    result = {}
    for tensor in model.graph.initializer:
        array = numpy_helper.to_array(tensor)
        digest = hashlib.sha256()
        digest.update(str((tensor.data_type, list(tensor.dims))).encode())
        digest.update(array.tobytes())
        result[tensor.name] = digest.hexdigest()
    return result


def convert(model, expected_blocks=93, expected_quantizers=91):
    """Return a new graph and evidence; never mutate the supplied model.

    Counts are explicit so tiny regression models can exercise the same validator.
    The production caller uses the fixed 93/91 inventory.
    """
    graph = model.graph
    if [(x.domain, x.version) for x in model.opset_import] != [("", 17)]:
        raise ValueError("Expected the original standard ONNX opset 17")
    nodes = list(graph.node)
    producers, consumers = {}, defaultdict(set)
    for i, node in enumerate(nodes):
        if node.domain or node.attribute and node.op_type in FORBIDDEN:
            raise ValueError("Unsupported integer operator domain/attributes")
        for output in node.output:
            if output in producers: raise ValueError("Duplicate graph producer: " + output)
            producers[output] = i
        for name in node.input: consumers[name].add(i)
    outputs = {x.name for x in graph.output}
    initializers = {t.name: t for t in graph.initializer}
    if len(initializers) != len(graph.initializer): raise ValueError("Duplicate initializer")
    integers = [i for i, n in enumerate(nodes) if n.op_type == "MatMulInteger"]
    quantizers = {i for i, n in enumerate(nodes) if n.op_type == "DynamicQuantizeLinear"}
    if len(integers) != expected_blocks or len(quantizers) != expected_quantizers:
        raise ValueError("Unexpected integer/activation inventory (or already converted)")
    removed, replacements, accounts, blocks = set(), {}, defaultdict(set), []

    def require(condition, message):
        if not condition: raise ValueError(message)

    def producer(name, kind):
        require(name in producers, "Missing producer for " + name)
        i = producers[name]
        require(nodes[i].op_type == kind and not nodes[i].domain, "Expected " + kind + " for " + name)
        return i, nodes[i]

    def sole(name, kind):
        require(name not in outputs and len(consumers[name]) == 1, "Unexpected consumer/output of " + name)
        i = next(iter(consumers[name]))
        require(nodes[i].op_type == kind and not nodes[i].domain, "Expected consumer " + kind)
        return i, nodes[i]

    def constant(name, dtype):
        require(name in initializers, "Missing initializer " + name)
        tensor = initializers[name]
        require(tensor.data_type == dtype, "Wrong initializer type: " + name)
        return numpy_helper.to_array(tensor)

    for i in integers:
        mm = nodes[i]
        require(len(mm.input) == 4 and len(mm.output) == 1 and not mm.attribute, "Unsupported MatMulInteger")
        qi, q = producer(mm.input[0], "DynamicQuantizeLinear")
        require(len(q.input) == 1 and len(q.output) == 3 and not q.attribute, "Unsupported activation quantizer")
        require(mm.input[0] == q.output[0] and mm.input[2] == q.output[2], "Activation quantizer outputs do not agree")
        ci, cast = sole(mm.output[0], "Cast")
        require(len(cast.input) == 1 and len(cast.output) == 1 and
                len(cast.attribute) == 1 and cast.attribute[0].name == "to" and
                cast.attribute[0].i == TensorProto.FLOAT, "Integer result must cast to float32")
        fi, final = sole(cast.output[0], "Mul")
        require(len(final.input) == 2 and len(final.output) == 1 and not final.attribute, "Unsupported final rescale")
        scale_name = final.input[1] if final.input[0] == cast.output[0] else final.input[0]
        si, scales = producer(scale_name, "Mul")
        require(len(scales.input) == 2 and len(scales.output) == 1 and not scales.attribute,
                "Unsupported combined scale")
        require(consumers[scale_name] == {fi} and scale_name not in outputs, "Unexpected combined scale consumer")
        require(list(scales.input).count(q.output[1]) == 1, "Activation scale does not agree")
        bs = scales.input[1] if scales.input[0] == q.output[1] else scales.input[0]
        weight, scale, zero = constant(mm.input[1], TensorProto.UINT8), constant(bs, TensorProto.FLOAT), constant(mm.input[3], TensorProto.UINT8)
        require(weight.ndim == 2 and all(x > 0 for x in weight.shape), "Weight must be nonempty K by N")
        require(scale.shape == zero.shape and (scale.ndim == 0 or scale.shape == (weight.shape[1],)),
                "Scale/zero point must be matching scalars or output-channel vectors")
        require(np.isfinite(scale).all() and (scale > 0).all(), "Weight scales must be finite and positive")
        region = {i, ci, si, fi}
        require(not (removed & region), "Overlapping integer rewrite blocks")
        removed.update(region)
        accounts[q.output[0]].add(i); accounts[q.output[1]].add(si); accounts[q.output[2]].add(i)
        # Use an output-derived name; no existing value may be shadowed.
        name = final.output[0] + "_weight_only_dequantized"
        require(name not in producers and name not in initializers, "Replacement name collision")
        replacements[fi] = [helper.make_node("DequantizeLinear", [mm.input[1], bs, mm.input[3]], [name],
                                            name=mm.name + "_weight_only_dequantize", axis=1),
                            helper.make_node("MatMul", [q.input[0], name], list(final.output), name=mm.name + "_weight_only_matmul")]
        blocks.append({"integer": mm.name, "output": final.output[0], "weight": mm.input[1],
                       "scale": bs, "zero_point": mm.input[3], "shape": list(weight.shape)})
    for qi in quantizers:
        require(bool(accounts[nodes[qi].output[0]]), "Unmapped activation quantizer")
        for name in nodes[qi].output:
            require(name not in outputs and consumers[name] == accounts[name], "Unaccounted activation quantizer consumer: " + name)
        removed.add(qi)
    candidate = copy.deepcopy(model)
    del candidate.graph.node[:]
    for i, node in enumerate(nodes):
        if i in replacements: candidate.graph.node.extend(replacements[i])
        elif i not in removed: candidate.graph.node.append(node)
    remaining = Counter(n.op_type for n in candidate.graph.node if n.op_type in FORBIDDEN)
    require(not remaining, "Forbidden quantization operators remain")
    before = initializer_hashes(model)
    require(initializer_hashes(candidate) == before, "Initializer values changed")
    require([x.SerializeToString() for x in candidate.graph.input] == [x.SerializeToString() for x in graph.input]
            and [x.SerializeToString() for x in candidate.graph.output] == [x.SerializeToString() for x in graph.output],
            "Graph interface changed")
    onnx.checker.check_model(candidate)
    return candidate, {"export_mode": MODE, "converted_blocks": len(blocks), "removed_activation_quantizers": len(quantizers),
                       "forbidden_operators": dict(remaining), "initializer_hashes": before, "blocks": blocks,
                       "interfaces_unchanged": True, "opset": 17}
