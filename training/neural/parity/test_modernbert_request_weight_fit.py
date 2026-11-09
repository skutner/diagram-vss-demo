"""Small fixture contracts only: these tests never establish model accuracy."""
import copy
import hashlib
import os
import subprocess
from contextlib import contextmanager
import json
from pathlib import Path
import sys
import signal
import tempfile
import types
import time
import unittest
from unittest.mock import patch

import modernbert_request_weight_fit as fit


@contextmanager
def exported_fixture(passed=False):
    """Exercise load_context without importing the trainer or loading model bytes."""
    root=Path(tempfile.gettempdir())/"diagram-request-weight-fit-fixtures"
    root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=root) as tmp:
        base=Path(tmp);run=base/"run";model=base/"model";data=base/"data";neural=base/"neural"
        for d in (run,model,data,neural,run/"tokenizer",run/"encoder_config",model/"onnx"):d.mkdir(parents=True,exist_ok=True)
        def put(p,x):p.write_text(json.dumps(x) if not isinstance(x,str) else x)
        source=neural/"fixture_source.py";put(source,"# fixture source, never executed\n")
        put(run/"checkpoint.pt","fixture weight bytes, never loaded")
        put(run/"tokenizer/tokenizer.json",{});put(run/"encoder_config/config.json",{})
        context, _ = fixture(); layout=context["layout"]
        objective={"formula":"request-max-positive-sqrt-v1","fixture":True}; objective_path=base/"objective.json";put(objective_path,objective)
        put(data/"reader.json",layout);put(data/"train.jsonl","fixture data, never trained\n")
        files={p.name:fit.digest(p) for p in data.iterdir()}
        settings=dict(seed=0, epochs=8, lr=6e-5, head_lr=6e-5, batch=32, cut_batch=8, weight_decay=.01, warmup=.06, clip=1., request_cap=128, message_cap=512, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=0)
        settings["request_class_loss"]={"formula":"request-max-positive-sqrt-v1","sha256":fit.digest(objective_path),"manifest":objective}
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
        selections=base/"selections.json";populations=base/"populations.json";put(selections,context["selections"]);put(populations,context["populations"])
        jp=base/"joint-populations.json";js=base/"joint-selections.json";put(jp,context["joint_populations"]);put(js,context["joint_selections"])
        arm=dict(arm="J",seed=0,objective="request-max-positive-sqrt-v1",training=str(run),model=str(model),train_data=str(data))
        frozen=dict(arms={"J-s0":arm},task_root=str(base),inputs={str(data/"reader.json"):fit.digest(data/"reader.json")},sources={str(source):fit.digest(source)},selections=dict(path=str(selections),sha256=fit.digest(selections),populations=dict(path=str(populations),sha256=fit.digest(populations))))
        frozen.update(loss_manifest={"path":str(objective_path),"sha256":fit.digest(objective_path),"formula":"request-max-positive-sqrt-v1"},joint_populations={"path":str(jp),"sha256":fit.digest(jp)},joint_selections={"path":str(js),"sha256":fit.digest(js)})
        stub=types.ModuleType("modernbert_request_weight");stub.verify_frozen=lambda _:copy.deepcopy(frozen)
        with patch.dict(sys.modules,{"modernbert_request_weight":stub}),patch.object(fit,"NEURAL",neural):
            yield dict(base=base,run=run,model=model,data=data,source=source,protocol=protocol,receipt=receipt,config=config,put=put)


def fixture():
    layout = dict(acts=["create", "set"], tags=["O", "B-name"], classes=[["outline", ["none", "red", "none"]], ["color", ["none", "blue", "red"]], ["desc:size", ["none", "small"]], ["size", ["none", "large"]]] + [["absent"+str(i), ["none", "populated"]] for i in range(48)])
    populations = {k: [] for k in fit.POPULATIONS}
    selections, requests, decoded = [], [], []
    for family, count, key, target, population in [("outline_create", 89, "outline", 1, "outline_create"), ("outline_set", 97, "outline", 1, "outline_set"), ("description_size:target", 35, "desc:size", 1, "desc_r2"), ("description_size:from", 24, "desc:size", 1, "desc_old"), ("count_size", 14, "size", 1, "count_size"), ("outline_create", 1440, "outline", 0, "absent_controls")]:
        for j in range(count):
            i = len(selections); classes = {k: 0 for k,_ in layout["classes"]}
            classes[key] = 2 if population == "outline_create" and j >= 74 else target
            if population == "outline_create" and j < 57: classes["color"] = 1
            targets = list(classes.values())
            populations[population].append(i)
            if population == "outline_create" and j < 74: populations["outline_coloured_create"].append(i)
            if population == "desc_r2" and j < 21: populations["desc_r2_canonical"].append(i)
            duplicate = population == "outline_create" and j >= 85
            request = j-4 if duplicate else len(requests)
            text = requests[request]["text"] if duplicate else "Café 東京 " + str(i)
            selection = dict(arm="F", source="frozen", ordinal=request, id="duplicate-id", family=family, head=key, gold=layout["classes"][[k for k,_ in layout["classes"]].index(key)][1][classes[key]], compiled=None, representation="encoded", absent_control=population=="absent_controls", targets=targets, act="create", tags=["O"], request=request)
            selections.append(selection)
            if not duplicate:
                requests.append(dict(arm="F",text=text,cap=128))
                read = dict(act="create",classes=classes,tags=["O"],words=[text],truncated=False,unreadFrom=None)
                decoded.append(dict(request=request,words=[text],python=copy.deepcopy(read),node=copy.deepcopy(read)))
    joint={"fill_outline":list(range(57)),"outline_without_fill":list(range(57,89))}
    records=[]
    for observation in range(89):
        row=selections[observation];text=requests[row["request"]]["text"]
        records.append(dict(observation=observation,request=row["request"],ordinal=row["ordinal"],id=row["id"],text=text,text_sha256=hashlib.sha256(text.encode()).hexdigest(),targets=row["targets"],act=row["act"],tags=row["tags"]))
    return dict(name="J-s0",runtime="ort",layout=layout,selections=dict(selections=selections,requests=requests),populations=populations,joint_populations=joint,joint_selections=records),decoded


class FitContracts(unittest.TestCase):
    def test_load_context_finalized_exit2_is_reported_for_both_runtimes(self):
        for passed in (False,True):
            with exported_fixture(passed) as f:
                for runtime in ("float","ort"):
                    with self.subTest(passed=passed,runtime=runtime):
                        context=fit.load_context(f["protocol"],"J-s0",runtime)
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
                    with self.assertRaises((ValueError,OSError,KeyError)):fit.load_context(f["protocol"],"J-s0",runtime)

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
        raw=dict(token_logits=dict(dims=[2,2,2],data=[0.]*8),seq_logits=dict(dims=[2,108],data=[0.]*216),cut_logits=dict(dims=[2,2,3],data=[0.]*12))
        fit.validate_tensors(raw,arrays,c["layout"])
        for kind in ("missing","shape","nonfinite","ragged"):
            r=copy.deepcopy(raw);a=copy.deepcopy(arrays)
            if kind=="missing":r.pop("cut_logits")
            elif kind=="shape":r["token_logits"]["dims"]=[2,1,2]
            elif kind=="nonfinite":r["token_logits"]["data"][-1]=float("nan")
            else:a["attention_mask"][-1].pop()
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.validate_tensors(r,a,c["layout"])

    def test_wrong_model_seed_objective_and_incomplete(self):
        arm=dict(arm="J",seed=0,objective="request-max-positive-sqrt-v1")
        settings=dict(seed=0, epochs=8, lr=6e-5, head_lr=6e-5, batch=32, cut_batch=8, weight_decay=.01, warmup=.06, clip=1., request_cap=128, message_cap=512, attn="sdpa", autocast="bfloat16", weights="float32", gradient_checkpointing=False, max_updates=0)
        settings["request_class_loss"]={"formula":"request-max-positive-sqrt-v1"}
        good=dict(complete=True,full_schedule=True,max_updates=0,state=dict(epoch=8,update=14640,total=14640),metadata=dict(base="answerdotai/ModernBERT-base",revision="8949b909ec900327062f0ebf497f51aef5e6f0c8",settings=settings))
        fit.validate_completion(good,arm)
        for kind in ("seed","model","objective","schedule","complete"):
            x=copy.deepcopy(good)
            if kind=="seed":x["metadata"]["settings"]["seed"]=1
            elif kind=="model":x["metadata"]["revision"]="other"
            elif kind=="objective":x["metadata"]["settings"]["request_class_loss"]={}
            elif kind=="schedule":x["state"]["update"]-=1
            else:x["complete"]=False
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.validate_completion(x,arm)

    def test_layout_order(self):
        c,_=fixture();bad=copy.deepcopy(c["layout"]);bad["classes"].reverse()
        with self.assertRaisesRegex(ValueError,"layout differs"):fit.validate_layout(bad,c["layout"])

    def test_receipts_reject_relabel_truncation_and_zero_checks(self):
        root=Path(tempfile.gettempdir())/"diagram-request-weight-fit-fixtures"
        root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            out=Path(tmp);c,d=fixture();fit.save(out/"context.json",c)
            for n in ("batches.jsonl","decoded.jsonl","engine.stderr.log"):(out/n).write_text("fixture-only\n")
            p=dict(scope="actual-python-ort-versus-production-node-q8",atol=.001,rtol=.001,includes_padding=True,batches=212,values=100,padding_values=3,action_compared=1695,class_compared=5097,tag_compared=1695,numerical_failed=0,padding_failed=0,action_different=0,class_different=0,tag_different=0,word_different=0,passed=True)
            r=dict(version="modernbert-request-weight-fit-node-v1",name="J-s0",runtime="ort",context_sha256=fit.digest(out/"context.json"),requests=1695,batches=212,started=1.,ended=2.,engine=dict(finished=True,code=0,signal=None,batches=212,argv=["fixture"],versions={"python":"fixture"}),outputs={n:fit.digest(out/n) for n in ("batches.jsonl","decoded.jsonl","engine.stderr.log")},parity=p)
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


    def test_joint_gate_catches_correct_outline_wrong_cotarget_or_action_tags(self):
        for observation in (0,57):
            for kind in ("fill","absent","action","tags"):
                c,d=fixture();r=d[c["selections"]["selections"][observation]["request"]]["node"]
                if kind=="fill":r["classes"]["color"]=2
                elif kind=="absent":r["classes"]["absent47"]=1
                elif kind=="action":r["act"]="set"
                else:r["tags"]=["B-name"]
                rows,summary=fit.summarize(c,d)
                key="fill_outline" if observation==0 else "outline_without_fill"
                self.assertTrue(all(p["passed"] is not False for p in summary["populations"].values()))
                self.assertFalse(summary["passed"]);self.assertFalse(summary["joint"][key]["passed"])
                self.assertTrue(rows[observation]["node"]["correct"])
                self.assertFalse(rows[observation]["node"]["joint_correct"])
                c["runtime"]="float";self.assertTrue(fit.summarize(c,d)[1]["passed"])

    def test_joint_membership_rejects_substitution_duplicates_and_target_changes(self):
        for kind in ("duplicate","wrong-group","record","target","request"):
            c,d=fixture()
            if kind=="duplicate":c["joint_populations"]["fill_outline"][-1]=0
            elif kind=="wrong-group":c["joint_populations"]["fill_outline"][0]=57
            elif kind=="record":c["joint_selections"][0]["text_sha256"]="0"*64
            elif kind=="target":c["selections"]["selections"][0]["targets"][1]=0
            else:c["selections"]["selections"][0]["request"]=1
            with self.subTest(kind=kind),self.assertRaises(ValueError):fit.summarize(c,d)

    def test_internal_engine_refuses_before_importing_model_libraries(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"context.json";p.write_text(json.dumps({"task_root":tmp,"runtime":"float"}))
            result=subprocess.run([sys.executable,"-B",str(Path(fit.__file__)),"--engine",str(p)],capture_output=True,text=True,timeout=5)
            self.assertNotEqual(result.returncode,0);self.assertIn("unregistered internal fit context",result.stderr)
            self.assertNotIn("torch",sys.modules)

    def test_cpu_lock_rejects_symlink_and_preserves_external_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);outside=root/"outside";outside.write_text("retain")
            (root/"cpu.lock").symlink_to(outside)
            with self.assertRaises(ValueError),fit.cpu_lock(root):pass
            self.assertEqual(outside.read_text(),"retain")

    def test_failed_fit_reservation_is_durable_and_cannot_retry(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/"J-s0").mkdir();(root/"frozen").mkdir();protocol=root/"frozen/protocol.json"
            protocol.write_text(json.dumps({"task_root":str(root)}));out=root/"J-s0/fit-float"
            with patch.object(fit,"TASK",root),patch.object(fit,"public_fit_argv",return_value=["fixture"]),patch.object(fit,"load_context",side_effect=ValueError("fixture preparation failure")):
                with self.assertRaisesRegex(ValueError,"fixture preparation"):fit.run_fit(protocol,"J-s0","float",out)
                self.assertTrue((out/"attempt.json").exists());self.assertFalse(fit.read_json(out/"attempt-result.json")["complete"])
                with self.assertRaisesRegex(ValueError,"fresh registered"):fit.run_fit(protocol,"J-s0","float",out)


class FitProcessOwnership(unittest.TestCase):
    """Only sleeping synthetic workers run; no model libraries are imported."""

    def run_interruption(self, signum, during_launch=False, normal_exit=False):
        with tempfile.TemporaryDirectory(prefix="request-fit-cancel-") as tmp, fit.reap_owned_children():
            root=Path(tmp);(root/"J-s0").mkdir();(root/"frozen").mkdir()
            (root/"frozen/protocol.json").write_text(json.dumps({"task_root":tmp}))
            worker=root/"worker.py"
            worker.write_text('''import json,os,signal,subprocess,sys,time
from pathlib import Path
root=Path(sys.argv[1]);fd=int(os.environ["REQUEST_WEIGHT_FIT_CPU_FD"])
code="import os,signal,time;from pathlib import Path;signal.signal(signal.SIGTERM,signal.SIG_IGN);signal.signal(signal.SIGINT,signal.SIG_IGN);Path("+repr(str(root/"ready"))+").write_text(str(os.getpid()));time.sleep(60)"
child=subprocess.Popen([sys.executable,"-c",code],pass_fds=(fd,))
(root/"pids.json").write_text(json.dumps([os.getpid(),child.pid]))
while not (root/"ready").exists():time.sleep(.01)
if sys.argv[2]=="normal":sys.exit(0)
time.sleep(60)
''')
            supervisor=root/"supervisor.py"
            supervisor.write_text('''import os,signal,subprocess,sys,time
from pathlib import Path
sys.path.insert(0,sys.argv[1]);import modernbert_request_weight_fit as fit
root=Path(sys.argv[2]);fit.TASK=root
fit.public_fit_argv=lambda *a:["fixture"]
fit.load_context=lambda *a:{"identities":{}}
fit.resources=lambda:None
real_popen=subprocess.Popen
def spawn(argv,**kw):
    child=real_popen([sys.executable,str(root/"worker.py"),str(root),sys.argv[5]],**kw)
    if sys.argv[4]=="launch":
        until=time.monotonic()+5
        while not (root/"ready").exists():
            if time.monotonic()>until:raise TimeoutError("fixture readiness")
            time.sleep(.01)
        os.kill(os.getpid(),int(sys.argv[3]))
    return child
fit.subprocess.Popen=spawn
fit.run_fit(root/"frozen/protocol.json","J-s0","float",root/"J-s0/fit-float")
''')
            process=subprocess.Popen([sys.executable,"-B",str(supervisor),str(Path(fit.__file__).parent),tmp,str(signum),"launch" if during_launch else "wait","normal" if normal_exit else "sleep"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            pids=[]
            try:
                until=time.monotonic()+5
                while not (root/"ready").exists():
                    if process.poll() is not None:self.fail(str(process.communicate()))
                    if time.monotonic()>until:self.fail("fixture readiness timeout")
                    time.sleep(.01)
                pids=json.loads((root/"pids.json").read_text())
                if not during_launch and not normal_exit:os.kill(process.pid,signum)
                stdout,stderr=process.communicate(timeout=12)
                self.assertNotEqual(process.returncode,0,(stdout,stderr))
                self.assertEqual([pid for pid in pids if Path(f"/proc/{pid}").exists()],[],stderr)
                with self.assertRaises(ProcessLookupError):os.killpg(pids[0],0)
                with fit.cpu_lock(root):pass
                out=root/"J-s0/fit-float"
                result=fit.read_json(out/"attempt-result.json")
                self.assertFalse(result["complete"]);self.assertIsNone(result["passed"])
                if not normal_exit:self.assertIn("deadline" if signum==signal.SIGALRM else signal.Signals(signum).name,result["error"])
                execution=fit.read_json(out/"execution.json")
                self.assertTrue(execution["cleanup"]["group_gone"])
                self.assertTrue(execution["cleanup"]["escalated"])
                self.assertIn(pids[1],execution["cleanup"]["reaped_descendants"])
                if normal_exit:self.assertEqual(execution["exit_code"],0)
                self.assertFalse((out/"receipt.json").exists())
            finally:
                if not pids and (root/"pids.json").exists():pids=json.loads((root/"pids.json").read_text())
                if pids:
                    try:os.killpg(pids[0],signal.SIGKILL)
                    except ProcessLookupError:pass
                if process.poll() is None:process.kill();process.wait(timeout=5)
                until=time.monotonic()+3
                while any(Path(f"/proc/{pid}").exists() for pid in pids) and time.monotonic()<until:
                    for pid in pids:
                        try:os.waitpid(pid,os.WNOHANG)
                        except ChildProcessError:pass
                    time.sleep(.01)
                self.assertTrue(all(not Path(f"/proc/{pid}").exists() for pid in pids),"fixture cleanup incomplete")

    def test_sigterm_reaps_descendant_that_outlives_leader_and_releases_lock(self):
        self.run_interruption(signal.SIGTERM)

    def test_sigint_reaps_descendant_that_outlives_leader_and_releases_lock(self):
        self.run_interruption(signal.SIGINT)

    def test_cancellation_between_spawn_and_assignment_keeps_process_owned(self):
        for sig in (signal.SIGTERM,signal.SIGINT,signal.SIGALRM):
            with self.subTest(signal=sig):self.run_interruption(sig,during_launch=True)

    def test_normal_leader_exit_still_cleans_surviving_descendant(self):
        self.run_interruption(signal.SIGTERM,normal_exit=True)

    def test_cleanup_does_not_signal_an_unrelated_process_group(self):
        with fit.reap_owned_children():
            owned=subprocess.Popen([sys.executable,"-c","import time;time.sleep(60)"],start_new_session=True)
            other=subprocess.Popen([sys.executable,"-c","import time;time.sleep(60)"],start_new_session=True)
            try:
                receipt=fit.cleanup_group(owned)
                self.assertTrue(receipt["group_gone"])
                self.assertIsNone(other.poll())
            finally:
                for process in (owned,other):
                    if process.poll() is None:process.kill()
                    process.wait(timeout=5)

    def test_node_owner_loss_kills_own_group_and_releases_inherited_lock(self):
        with tempfile.TemporaryDirectory(prefix="request-fit-owner-loss-") as tmp, fit.reap_owned_children():
            root=Path(tmp)
            script=root/"worker.mjs"
            script.write_text('''import fs from 'node:fs';import {spawn} from 'node:child_process';
const [module,root,python]=process.argv.slice(2);const {watchFitOwner}=await import(module);
const owner=process.ppid,argv=fs.readFileSync('/proc/'+owner+'/cmdline').toString().split('\\0').filter(Boolean);
watchFitOwner(owner,argv,Date.now()/1000+10);
const code="import os,signal,time;from pathlib import Path;signal.signal(signal.SIGTERM,signal.SIG_IGN);Path("+JSON.stringify(root+'/ready')+").write_text(str(os.getpid()));time.sleep(60)";
const child=spawn(python,['-c',code],{stdio:['ignore','ignore','ignore',Number(process.env.FIXTURE_LOCK_FD)]});
fs.writeFileSync(root+'/pids.json',JSON.stringify([process.pid,child.pid]));
''')
            supervisor=root/"supervisor.py"
            supervisor.write_text('''import fcntl,os,subprocess,sys,time
from pathlib import Path
root=Path(sys.argv[1]);fd=os.open(root/"cpu.lock",os.O_CREAT|os.O_RDWR,0o600);fcntl.flock(fd,fcntl.LOCK_EX)
with (root/"node.stderr").open("w") as stderr:
    child=subprocess.Popen(["node",str(root/"worker.mjs"),sys.argv[2],str(root),sys.executable],env=dict(os.environ,FIXTURE_LOCK_FD=str(fd)),pass_fds=(fd,),start_new_session=True,stdout=subprocess.DEVNULL,stderr=stderr)
    child.wait()
''')
            module=Path(fit.__file__).with_suffix(".mjs").as_uri()
            process=subprocess.Popen([sys.executable,"-B",str(supervisor),tmp,module],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            pids=[]
            try:
                until=time.monotonic()+5
                while not (root/"ready").exists():
                    if process.poll() is not None:self.fail(str(process.communicate())+(root/"node.stderr").read_text())
                    if time.monotonic()>until:self.fail("owner-loss fixture readiness timeout")
                    time.sleep(.01)
                pids=json.loads((root/"pids.json").read_text());process.kill();process.communicate(timeout=5)
                until=time.monotonic()+5
                while any(Path(f"/proc/{pid}").exists() for pid in pids) and time.monotonic()<until:
                    for pid in pids:
                        try:os.waitpid(pid,os.WNOHANG)
                        except ChildProcessError:pass
                    time.sleep(.01)
                self.assertTrue(all(not Path(f"/proc/{pid}").exists() for pid in pids),(root/"node.stderr").read_text())
                with self.assertRaises(ProcessLookupError):os.killpg(pids[0],0)
                with fit.cpu_lock(root):pass
            finally:
                if not pids and (root/"pids.json").exists():pids=json.loads((root/"pids.json").read_text())
                if pids:
                    try:os.killpg(pids[0],signal.SIGKILL)
                    except ProcessLookupError:pass
                if process.poll() is None:process.kill();process.wait(timeout=5)
                for pid in pids:
                    try:os.waitpid(pid,0)
                    except ChildProcessError:pass


if __name__ == "__main__": unittest.main(verbosity=2)
