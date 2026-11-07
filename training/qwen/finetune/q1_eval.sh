#!/bin/bash
# [ARM=Q2] q1_eval.sh STEP: an arm's evaluation (default Q1) after training (QWEN3_FINETUNE_RUNLOG.md, Q1's declaration and the decisions of 10:35).
# Steps, run in this order: export | native | fidelity | smoke | collect | grammar | score.  Everything into ~/.cache/diagram-vss-qwen/arms/Q1.
set -u -o pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ARM=${ARM:-Q1}; arm=$(echo $ARM | tr A-Z a-z); A=~/.cache/diagram-vss-qwen/arms/$ARM; RD=$A/run-s0; G0=~/.cache/diagram-vss-qwen/models/Qwen3-0.6B-Q8_0.gguf
P=~/.cache/diagram-vss-modernbert/venv/bin/python; B=~/.cache/diagram-vss-qwen/base; GQ=$A/$ARM-s0.gguf; KEYS=~/.cache/diagram-vss-qwen/arms/act_keys.ALL.json
TD=~/.cache/diagram-vss-modernbert/arms/data/${TDLIST:-F0}; EX=$A/examples.jsonl; E=/home/skutner/browserLLM/diagram-vss-demo/reports/evidence/qwen3-finetune-plan/$arm
LOCK=~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock; GPU=GPU-905b8484-3b1e-30f6-defd-05d44f00f692
SETS="fresh2 short3 nl_a collected_1 scenes_test"; NS=${NS:-8}
mkdir -p $E; cd "$HERE"
server() { (cd ~/.cache/diagram-vss-qwen/runtime/b11364-cpu/llama-b11364 && CUDA_VISIBLE_DEVICES= exec ./llama-server -m "$GQ" --host 127.0.0.1 --port 8101 -c 2048 -b 512 -np 1 --jinja --seed 0 -t 8 > $A/server-8101.log 2>&1) & echo $! > $A/server.pid; until curl -sf 127.0.0.1:8101/health >/dev/null; do sleep 1; done; }
stop() { kill "$(cat $A/server.pid)" 2>/dev/null; rm -f $A/server.pid; }
case "$1" in
export) timeout 1800 $P -B write_gguf.py --gguf $G0 --out $GQ --weights $RD/merged.pt | tee $A/export.out ;;
native)
  server
  SERVER=http://127.0.0.1:8101 timeout 7200 node own_rows.mjs --keys $KEYS --examples $EX --out $E/${arm}_own_rows.json --n 1000 --seed 0
  rm -f $A/fidelity.native50.jsonl; SERVER=http://127.0.0.1:8101 GGUF=$GQ LIMIT=50 PART=calibration VARIANT=${arm}-fidelity-native-cpu timeout 1800 node collect_lines.mjs --examples $EX --allow-text-overlap --keys $KEYS --train-data $TD $A/fidelity.native50.jsonl nl_a
  stop ;;
fidelity) CUDA_VISIBLE_DEVICES=$GPU flock -n $LOCK timeout 1800 $P -B teacher_forced.py --records $A/fidelity.native50.jsonl --gguf $G0 --base $B --weights $RD/merged.pt --dtype fp32 --n 50 --out $E/${arm}_export_fidelity.json ;;
smoke) rm -f $A/smoke20.jsonl; BACKEND=wllama GGUF=$GQ LIMIT=20 PART=calibration VARIANT=${arm}-smoke timeout 3600 node collect_lines.mjs --examples $EX --allow-text-overlap --keys $KEYS --train-data $TD $A/smoke20.jsonl nl_a ;;
collect)
  for i in $(seq 0 $((NS-1))); do [ -f $A/b.$i.jsonl.manifest.json ] && grep -q '"complete": true' $A/b.$i.jsonl.manifest.json && continue
    BACKEND=wllama GGUF=$GQ SHARD=$i/$NS VARIANT=${arm}-s0-browser nice -n 10 timeout 18000 node collect_lines.mjs --examples $EX --allow-text-overlap --keys $KEYS --train-data $TD $A/b.$i.jsonl $SETS > $A/b.$i.out 2> $A/b.$i.log & done; wait
  node merge_shards.mjs $A/${arm}.browser.jsonl $(for i in $(seq 0 $((NS-1))); do echo $A/b.$i.jsonl; done) ;;
grammar)
  for i in $(seq 0 $((NS-1))); do BACKEND=wllama GGUF=$GQ GRAMMAR=$A/../grammar.ALL.gbnf PART=development SHARD=$i/$NS VARIANT=${arm}-s0-browser-grammar timeout 18000 node collect_lines.mjs --examples $EX --allow-text-overlap --keys $KEYS --train-data $TD $A/g.$i.jsonl nl_a > $A/g.$i.out 2> $A/g.$i.log & done; wait
  node merge_shards.mjs $A/${arm}.browser.grammar.nl_a_dev.jsonl $(for i in $(seq 0 $((NS-1))); do echo $A/g.$i.jsonl; done) ;;
score)
  node calibrate_qwen.mjs --cal fresh2,short3,nl_a $A/${arm}.confidence.json $E/${arm}_calibration.json $A/${arm}.browser.jsonl || { echo 'calibration failed'; exit 1; }
  node ../../neural/parity/score_arm.mjs $A/${arm}.confidence.json $E/${arm}.score.json $A/${arm}.browser.jsonl | tee $E/${arm}.score.log
  # comparisons from the repository root (score files name their per-message files relative to it); CONTROLS: "name=path ..." (default SOP-F0-s0)
  cd /home/skutner/browserLLM/diagram-vss-demo
  for c in ${CONTROLS:-SOP-F0-s0=reports/evidence/qwen3-finetune-plan/controls/SOP-F0-s0.score.json}; do n=${c%%=*}; f=${c#*=}
    node training/qwen/finetune/compare_qwen.mjs $E/${arm}.score.json $f $E/${arm}_minus_$n.json | tee $E/${arm}_minus_$n.log; done ;;
*) echo "step?"; exit 2 ;;
esac
