// trigger_inventory.mjs: the lower-cased annotation triggers of an arm's training messages, for the seen / unseen split of collect_set.mjs.
//   node trigger_inventory.mjs OUT.json EXTRA_DIR...      (EXTRA_DIR as make_data.py EXTRA_DIRS, e.g. llm_train/opus_train_a)
// The rows of a make_roles.py train.jsonl hold no trigger, so the registered definition (calibrate_modernbert.mjs trainingInventory: the
// triggers of the annotated wires of the training messages) is read from the annotations by make_data.py. Put OUT.json beside the arm's
// train.jsonl as trigger_inventory.json and pass that folder to collect_set.mjs --train-data. The published models' list is
// docs/model/neural/modernbert/config.json reader.training_manifest.extra_dirs. Writes no training data.
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const [out, ...dirs] = process.argv.slice(2);
if (!out || !dirs.length) throw new Error('usage: trigger_inventory.mjs OUT.json EXTRA_DIR...');
const script = "import sys,json,os;sys.path.insert(0,sys.argv[1]);os.environ['EXTRA_DIRS']=' '.join(json.loads(sys.argv[2]));import make_data as M;ms,_,_,_=M.split_messages(None,0,True);a,q=M.acts_from_neural_js();acts=set(a+q+['fact','rule']);ws=[w for m in ms for w in m.get('wires',[]) if w.get('span') and w['span'] in m['text'] and M.act_of(w.get('type'),w.get('args',{})) in acts];print(json.dumps({'messages':len(ms),'requests':len(ws),'triggers':sorted({str(w['trigger']).lower() for w in ws if w.get('trigger')})}))";
const info = JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-c', script, resolve(ROOT, 'training/neural'), JSON.stringify(dirs)], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
writeFileSync(out, JSON.stringify({ source: 'make_data.split_messages annotation triggers (calibrate_modernbert.mjs trainingInventory)', extra_dirs: dirs, ...info }, null, 1) + '\n');
console.log(`${info.messages} messages, ${info.requests} requests, ${info.triggers.length} triggers -> ${out}`);
