"""Small numerical and adversarial checks for the exact compatibility rewrite."""
import unittest

import numpy as np
import onnx
from onnx import TensorProto as T, helper as h, numpy_helper as nh
import onnxruntime as ort

from modernbert_weight_only import convert, initializer_hashes


def fixture(shared=False, scalar=False):
    weight = np.array([[3, 9, 5], [7, 9, 1]], dtype=np.uint8)
    scale = np.array(.25, dtype=np.float32) if scalar else np.array([.25, .5, 2.], dtype=np.float32)
    zero = np.array(9, dtype=np.uint8) if scalar else np.array([2, 9, 1], dtype=np.uint8)
    init = [nh.from_array(v, k) for k, v in [("W", weight), ("S", scale), ("Z", zero), ("bias", np.array([.5, -1, 2], np.float32))]]
    nodes = [h.make_node("DynamicQuantizeLinear", ["A"], ["Aq", "As", "Az"])]
    outputs = []
    for i in range(2 if shared else 1):
        p = str(i)
        nodes += [h.make_node("MatMulInteger", ["Aq", "W", "Az", "Z"], ["I" + p], name="integer" + p),
                  h.make_node("Cast", ["I" + p], ["F" + p], to=T.FLOAT),
                  h.make_node("Mul", ["As", "S"], ["S" + p]),
                  h.make_node("Mul", ["S" + p, "F" + p], ["Y" + p]),
                  h.make_node("Add", ["Y" + p, "bias"], ["B" + p])]
        outputs.append(h.make_tensor_value_info("B" + p, T.FLOAT, [None, None, 3]))
    m = h.make_model(h.make_graph(nodes, "tiny", [h.make_tensor_value_info("A", T.FLOAT, [None, None, 2])], outputs, init),
                     opset_imports=[h.make_opsetid("", 17)])
    m.ir_version = 9
    return m


class Conversion(unittest.TestCase):
    def test_nonsquare_padded_batch_bias_zero_channel_and_shared_producer(self):
        for shared in (False, True):
            for scalar in (False, True):
                model = fixture(shared, scalar)
                original = model.SerializeToString()
                candidate, report = convert(model, 2 if shared else 1, 1)
                self.assertEqual(model.SerializeToString(), original)
                self.assertEqual(initializer_hashes(candidate), initializer_hashes(model))
                self.assertEqual(report["converted_blocks"], 2 if shared else 1)
                self.assertEqual(report["forbidden_operators"], {})
                a = np.array([[[1., -2.], [0., 0.]], [[.1, .2], [100., -5.]]], np.float32)
                values = {t.name: nh.to_array(t) for t in model.graph.initializer}
                expected = a @ ((values["W"].astype(np.float32) - values["Z"]) * values["S"]) + values["bias"]
                # The approved per-model BASIC policy preserves float arithmetic;
                # ORT 1.29's extended MatMulNBits fusion quantizes activations.
                options = ort.SessionOptions()
                options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_BASIC
                session = ort.InferenceSession(candidate.SerializeToString(), options, providers=["CPUExecutionProvider"])
                for actual in session.run(None, {"A": a}): np.testing.assert_allclose(actual, expected, atol=1e-6, rtol=1e-6)
                with self.assertRaisesRegex(ValueError, "inventory"):
                    convert(candidate, 2 if shared else 1, 1)

    def test_unexpected_consumers_and_intermediate_outputs(self):
        for name in ("Aq", "As", "Az", "I0", "F0", "S0"):
            m = fixture()
            m.graph.node.append(h.make_node("Identity", [name], ["leak"]))
            with self.assertRaises(ValueError, msg=name): convert(m, 1, 1)
            m = fixture(); m.graph.output.append(h.make_tensor_value_info(name, T.FLOAT, None))
            with self.assertRaises(ValueError, msg=name): convert(m, 1, 1)

    def test_missing_or_wrong_constant_types_shapes_and_values(self):
        for name in ("W", "S", "Z"):
            m = fixture()
            keep = [x for x in m.graph.initializer if x.name != name]
            del m.graph.initializer[:]; m.graph.initializer.extend(keep)
            with self.assertRaisesRegex(ValueError, "Missing initializer"): convert(m, 1, 1)
        invalid = [("W", np.ones((2, 3), np.int8)), ("S", np.ones(3, np.float64)),
                   ("Z", np.zeros(3, np.int32)), ("S", np.ones(2, np.float32)),
                   ("Z", np.zeros((1, 3), np.uint8)), ("W", np.zeros((2, 0), np.uint8)),
                   ("S", np.array([0, 1, 1], np.float32)), ("S", np.array([1, np.nan, 1], np.float32))]
        for name, value in invalid:
            m = fixture()
            for tensor in m.graph.initializer:
                if tensor.name == name: tensor.CopyFrom(nh.from_array(value, name))
            with self.assertRaises(ValueError, msg=str((name, value))): convert(m, 1, 1)

    def test_wrong_cast_scale_pair_and_inventory(self):
        for change in ("cast", "scale", "activation", "opset", "extra"):
            m = fixture()
            if change == "cast": m.graph.node[2].attribute[0].i = T.DOUBLE
            elif change == "scale": m.graph.node[3].input[0] = "Az"
            elif change == "activation": m.graph.node[1].input[2] = "Z"
            elif change == "opset": m.opset_import[0].version = 18
            else: m.graph.node.append(h.make_node("QuantizeLinear", ["A", "S", "Z"], ["bad"]))
            with self.assertRaises(ValueError, msg=change): convert(m, 1, 1)


if __name__ == "__main__": unittest.main()
