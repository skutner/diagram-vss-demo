"""Small fixture contracts only: these tests never establish model accuracy."""
import copy
from contextlib import contextmanager
import json
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

import modernbert_rare_heads_fit as fit


@contextmanager
def exported_fixture(passed=False):
    """Exercise load_context without importing the trainer or loading model bytes."""
    root=Path.home()/".cache/diagram-vss-modernbert/rare-heads-2026-11-09/fit-dev"
    root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=root) as tmp:
        base=Path(tmp);run=base/"run";model=base/"model";data=base/"data";neural=base/"neural"
        for d in (run,model,data,neural,run/"tokenizer",run/"encoder_config",model/"onnx"):d.mkdir(parents=True,exist_ok=True)
        def put(p,x):p.write_text(json.dumps(x) if not isinstance(x,str) else x)
        source=neural/"fixture_source.py";put(source,"# fixture source, never executed\n")
        put(run/"checkpoint.pt","fixture weight bytes, never loaded")
        put(run/"tokenizer/tokenizer.json",{});put(run/"encoder_config/config.json",{})
        layout=dict(acts=["create"],tags=["O"],classes=[["outline",["none","red","none"]]])
        put(data/"reader.json",layout);put(data/"train.jsonl","fixture data, never trained\n")
        files={p.name:fit.digest(p) for p in data.iterdir()}
        settings=dict(seed=1, epochs=8, lr=6e-5, head_lr=6e-5, batch=32, cut_batch=8, weight_decay=.01, warmup=.06, clip=1., request_cap=128, message_cap=512, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=0)
        meta=dict(base="answerdotai/ModernBERT-base",revision="8949b909ec900327062f0ebf497f51aef5e6f0c8",settings=settings,data=dict(files=files),tokenization="wordwise-bpe-prefix-space-v1",sources={source.name:fit.digest(source)})
        complete=dict(complete=True,full_schedule=True,max_updates=0,state=dict(epoch=8,update=14640,total=14640),metadata=meta)
        put(run/"complete.json",complete)
        policy=dict(graph_optimization="basic",arithmetic="float32",weight_storage="uint8")
        config=dict(reader=dict(layout,training_provenance={k:meta[k] for k in ("base","revision","settings","tokenization","sources")},training_manifest=meta["data"],export_mode="weight-only-u8-fp32",execution_policy=policy),**{"transformers.js_config":{"use_external_data_format":1}})
        put(model/"config.json",config)
        for name in ("tokenizer.json","tokenizer_config.json","special_tokens_map.json","conversion.json","export_parity.json","references.json"):put(model/name,{"fixture":True})
        put(model/"onnx/model_quantized.onnx","fixture graph bytes, never loaded")
        put(model/"onnx/model_quantized.onnx_data","fixture shard bytes, never loaded")
        differences=[] if passed else [{"text":"fixture","differences":[{"key":"class:outline","torch":"none","node":None}]}]
        receipt=dict(schema="arm-export-receipt-v1",passed=passed,weights=dict(source_file="checkpoint.pt",sha256=fit.digest(run/"checkpoint.pt"),epoch=8,update=14640,total=14640,full_schedule=True,max_updates=0,source_changes_since_training=[]),
            export_mode="weight-only-u8-fp32",execution_policy=policy,shards=["model_quantized.onnx_data"],source_changes_since_training=[],
            torch_vs_node=dict(texts=1,counts={"act":{"agree":1,"total":1}},differences=differences,per_text=[]),cases_where_q8_decodes_differently_from_float=differences,
            python_ort_vs_node=dict(fixtures=3,singles=1,batches=2,ids=True,outputs=True,decoded=True,cuts=True,readMany=True,max_abs=[0.,0.,0.]),tolerance=dict(atol=.001,rtol=.001),conversion=dict(blocks=1,quantizers=1),
            runtime=dict(transformers_js="fixture",onnxruntime="fixture",node="fixture",backend="cpu",python="fixture",python_onnxruntime="fixture"),
            files={str(p.relative_to(model)):dict(sha256=fit.digest(p),bytes=p.stat().st_size) for p in model.rglob("*") if p.is_file()})
        put(model/"arm_receipt.json",receipt)
        protocol=base/"frozen.json";put(protocol,{"fixture":True})
        selections=base/"selections.json";populations=base/"populations.json";put(selections,{"selections":[],"requests":[]});put(populations,{})
        arm=dict(seed=1,objective="ordinary-ce-v1",training=str(run),model=str(model),train_data=str(data))
        frozen=dict(arms={"F-s1":arm},task_root=str(base),inputs={str(data/"reader.json"):fit.digest(data/"reader.json")},sources={str(source):fit.digest(source)},selections=dict(path=str(selections),sha256=fit.digest(selections),populations=dict(path=str(populations),sha256=fit.digest(populations))))
        stub=types.ModuleType("modernbert_rare_heads");stub.verify_frozen=lambda _:copy.deepcopy(frozen)
        with patch.dict(sys.modules,{"modernbert_rare_heads":stub}),patch.object(fit,"NEURAL",neural):
            yield dict(base=base,run=run,model=model,data=data,source=source,protocol=protocol,receipt=receipt,config=config,put=put)


def fixture():
    layout = dict(acts=["create", "set"], tags=["O", "B-name"], classes=[["outline", ["none", "red", "none"]], ["desc:size", ["none", "small"]], ["size", ["none", "large"]]])
    populations = {k: [] for k in fit.POPULATIONS}
    selections, requests, decoded = [], [], []
    for family, count, key, target, population in [("outline_create", 89, "outline", 1, "outline_create"), ("outline_set", 97, "outline", 1, "outline_set"), ("description_size:target", 35, "desc:size", 1, "desc_r2"), ("description_size:from", 24, "desc:size", 1, "desc_old"), ("count_size", 14, "size", 1, "count_size"), ("outline_create", 1440, "outline", 0, "absent_controls")]:
        for j in range(count):
            i = len(selections); classes = {k: 0 for k,_ in layout["classes"]}
            classes[key] = 2 if population == "outline_create" and j >= 74 else target
            targets = list(classes.values())
            populations[population].append(i)
            if population == "outline_create" and j < 74: populations["outline_coloured_create"].append(i)
            if population == "desc_r2" and j < 21: populations["desc_r2_canonical"].append(i)
            text = "Café 東京 " + str(i)
            s = dict(arm="F", source="frozen", ordinal=i, id="duplicate-id", family=family, head=key, gold=layout["classes"][[k for k,_ in layout["classes"]].index(key)][1][classes[key]], compiled=None, representation="encoded", absent_control=population=="absent_controls", targets=targets, act="create", tags=["O"], request=i)
            selections.append(s);requests.append(dict(arm="F",text=text,cap=128))
            read = dict(act="create",classes=classes,tags=["O"],words=[text],truncated=False,unreadFrom=None)
            decoded.append(dict(request=i,words=[text],python=copy.deepcopy(read),node=copy.deepcopy(read)))
    return dict(name="W-s0",runtime="ort",layout=layout,selections=dict(selections=selections,requests=requests),populations=populations),decoded


class FitContracts(unittest.TestCase):
    def test_load_context_finalized_exit2_is_reported_for_both_runtimes(self):
        for passed in (False,True):
            with exported_fixture(passed) as f:
                for runtime in ("float","ort"):
                    with self.subTest(passed=passed,runtime=runtime):
                        context=fit.load_context(f["protocol"],"F-s1",runtime)
                        self.assertIs(context["export_diagnostics"]["float_vs_node_categorical_passed"],passed)
                        self.assertEqual(context["export_diagnostics"]["receipt_sha256"],fit.digest(f["model"]/"arm_receipt.json"))
                        self.assertEqual(context["runtime"],runtime)
                        self.assertIn(str(f["model"]/"onnx/model_quantized.onnx_data"),context["identities"])

    def test_load_context_rejects_invalid_finalized_export_both_runtimes(self):
        for runtime in ("float","ort"):
            for kind in ("missing-receipt","schema","boolean","runtime","runtime-check","zero-checks","policy","missing-graph-inventory","missing-shard","missing-shard-inventory","checkpoint","source","provenance"):
                with self.subTest(runtime=runtime,kind=kind),exported_fixture() as f:
                    r=copy.deepcopy(f["receipt"])
                    if kind=="missing-receipt":(f["model"]/"arm_receipt.json").unlink()
                    elif kind=="schema":r["schema"]="unfinished"
                    elif kind=="boolean":r["passed"]=None
                    elif kind=="runtime":r["runtime"]["backend"]="cuda"
                    elif kind=="runtime-check":r["python_ort_vs_node"]["outputs"]=False
                    elif kind=="zero-checks":r["python_ort_vs_node"]["fixtures"]=0
                    elif kind=="policy":r["execution_policy"]["graph_optimization"]="all"
                    elif kind=="missing-graph-inventory":r["files"].pop("onnx/model_quantized.onnx")
                    elif kind=="missing-shard":(f["model"]/"onnx/model_quantized.onnx_data").unlink()
                    elif kind=="missing-shard-inventory":r["files"].pop("onnx/model_quantized.onnx_data")
                    elif kind=="checkpoint":r["weights"]["sha256"]="0"*64
                    elif kind=="source":f["source"].write_text("# changed source\n")
                    else:
                        config=copy.deepcopy(f["config"]);config["reader"]["training_provenance"]["revision"]="wrong"
                        f["put"](f["model"]/"config.json",config)
                    if kind!="missing-receipt":f["put"](f["model"]/"arm_receipt.json",r)
                    with self.assertRaises((ValueError,OSError,KeyError)):fit.load_context(f["protocol"],"F-s1",runtime)

    def test_exhaustive_counts_literal_none_duplicate_ids(self):
        c,d = fixture(); rows,s = fit.summarize(c,d)
        self.assertEqual((s["observations"],s["positives"],s["absents"]),(1699,259,1440))
        self.assertTrue(s["passed"])
        self.assertEqual(s["populations"]["outline_coloured_create"]["correct"],74)
        self.assertEqual(rows[74]["node"]["head_index"],2)
        self.assertEqual(rows[74]["gold"],"none")
        self.assertTrue(rows[74]["node"]["correct"])
        self.assertEqual(rows[0]["id"],rows[1]["id"])
        self.assertNotEqual(rows[0]["observation"],rows[1]["observation"])
        self.assertEqual(rows[221]["label_scope"],"old-contextual")

    def test_real_raw_denominators_and_node_selected(self):
        c,d = fixture(); d[-1]["node"]["classes"]["outline"] = 1
        _,s = fit.summarize(c,d)
        self.assertFalse(s["passed"])
        self.assertEqual(s["populations"]["absent_controls"]["correct"],1439)
        c["runtime"]="float";_,s=fit.summarize(c,d)
        self.assertTrue(s["passed"])

    def test_missing_duplicate_reordered_request(self):
        for kind in ("missing","duplicate","reorder"):
            c,d=fixture()
            if kind=="missing": d.pop()
            elif kind=="duplicate": d[-1]=d[0]
            else: d[0],d[1]=d[1],d[0]
            with self.subTest(kind=kind),self.assertRaisesRegex(ValueError,"decoded request"): fit.summarize(c,d)

    def test_truncation_unknown_tag_head_order(self):
        for kind in ("truncation","tag","head-order","unknown-index"):
            c,d=fixture();r=d[0]["node"]
            if kind=="truncation":r["truncated"]=True
            elif kind=="tag":r["tags"]=["bad"]
            elif kind=="head-order":r["classes"]=dict(reversed(list(r["classes"].items())))
            else:r["classes"]["outline"]=100
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.summarize(c,d)

    def test_population_missing_duplicate_invalid_index(self):
        for kind in ("missing","duplicate","index"):
            c,d=fixture();p=c["populations"]["desc_r2"]
            if kind=="missing":p.pop()
            elif kind=="duplicate":p[-1]=p[0]
            else:p[-1]=99999
            with self.subTest(kind=kind),self.assertRaisesRegex(ValueError,"population"):fit.summarize(c,d)

    def test_tensor_shapes_missing_nonfinite(self):
        c,_=fixture();arrays=dict(input_ids=[[1,2],[1,0]],attention_mask=[[1,1],[1,0]])
        raw=dict(token_logits=dict(dims=[2,2,2],data=[0.]*8),seq_logits=dict(dims=[2,9],data=[0.]*18),cut_logits=dict(dims=[2,2,3],data=[0.]*12))
        fit.validate_tensors(raw,arrays,c["layout"])
        for kind in ("missing","shape","nonfinite","ragged"):
            r=copy.deepcopy(raw);a=copy.deepcopy(arrays)
            if kind=="missing":r.pop("cut_logits")
            elif kind=="shape":r["token_logits"]["dims"]=[2,1,2]
            elif kind=="nonfinite":r["token_logits"]["data"][-1]=float("nan")
            else:a["attention_mask"][-1].pop()
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.validate_tensors(r,a,c["layout"])

    def test_wrong_model_seed_objective_and_incomplete(self):
        arm=dict(seed=0,objective="ordinary-ce-v1")
        settings=dict(seed=0, epochs=8, lr=6e-5, head_lr=6e-5, batch=32, cut_batch=8, weight_decay=.01, warmup=.06, clip=1., request_cap=128, message_cap=512, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=0)
        good=dict(complete=True,full_schedule=True,max_updates=0,state=dict(epoch=8,update=14640,total=14640),metadata=dict(base="answerdotai/ModernBERT-base",revision="8949b909ec900327062f0ebf497f51aef5e6f0c8",settings=settings))
        fit.validate_completion(good,arm)
        for kind in ("seed","model","objective","schedule","complete"):
            x=copy.deepcopy(good)
            if kind=="seed":x["metadata"]["settings"]["seed"]=1
            elif kind=="model":x["metadata"]["revision"]="other"
            elif kind=="objective":x["metadata"]["settings"]["class_loss"]={}
            elif kind=="schedule":x["state"]["update"]-=1
            else:x["complete"]=False
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.validate_completion(x,arm)

    def test_layout_order(self):
        c,_=fixture();bad=copy.deepcopy(c["layout"]);bad["classes"].reverse()
        with self.assertRaisesRegex(ValueError,"layout differs"):fit.validate_layout(bad,c["layout"])

    def test_receipts_reject_relabel_truncation_and_zero_checks(self):
        root=Path.home()/".cache/diagram-vss-modernbert/rare-heads-2026-11-09/fit-dev"
        root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            out=Path(tmp);c,d=fixture();fit.save(out/"context.json",c)
            for n in ("batches.jsonl","decoded.jsonl","engine.stderr.log"):(out/n).write_text("fixture-only\n")
            p=dict(scope="actual-python-ort-versus-production-node-q8",atol=.001,rtol=.001,includes_padding=True,batches=213,values=100,padding_values=3,action_compared=1699,class_compared=5097,tag_compared=1699,numerical_failed=0,padding_failed=0,action_different=0,class_different=0,tag_different=0,word_different=0,passed=True)
            r=dict(version="modernbert-rare-heads-fit-node-v1",name="W-s0",runtime="ort",context_sha256=fit.digest(out/"context.json"),requests=1699,batches=213,started=1.,ended=2.,engine=dict(finished=True,code=0,signal=None,batches=213,argv=["fixture"],versions={"python":"fixture"}),outputs={n:fit.digest(out/n) for n in ("batches.jsonl","decoded.jsonl","engine.stderr.log")},parity=p)
            fit.validate_node_receipt(r,c,out)
            for kind in ("runtime","truncated","zero","failed","engine","output","time"):
                x=copy.deepcopy(r)
                if kind=="runtime":x["runtime"]="float"
                elif kind=="truncated":x["requests"]-=1
                elif kind=="zero":x["parity"]["padding_values"]=0
                elif kind=="failed":x["parity"]["padding_failed"]=1
                elif kind=="engine":x["engine"]["code"]=1
                elif kind=="output":x["outputs"].pop("batches.jsonl")
                else:x["ended"]=float("nan")
                with self.subTest(kind=kind),self.assertRaises(ValueError):fit.validate_node_receipt(x,c,out)


if __name__ == "__main__": unittest.main(verbosity=2)
