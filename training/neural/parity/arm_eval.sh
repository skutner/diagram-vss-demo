#!/bin/bash
# arm_eval.sh: one exported arm read on every set, its confidence fitted, scored and compared with the shipped SOP-BERT and the previous arm.
#   bash training/neural/parity/arm_eval.sh ARM-sSEED TRAIN_DATA_DIR [PREVIOUS_ARM-sSEED]
# The model is the one folder in ~/.cache/diagram-vss-modernbert/arms/ARM-sSEED/export/ (READER=sop for a SOP-BERT control); TRAIN_DATA_DIR holds train.jsonl and
# trigger_inventory.json. Three readers run at once on the CPU (one per group of sets). Outputs: ~/.cache/.../arms/ARM-sSEED/eval/, and a
# summary under reports/evidence/modernbert-parity-baseline/arms/ARM-sSEED/.
set -u
NAME=$1; DATA=$2; PREV=${3:-}
REPO=$(cd "$(dirname "$0")/../../.." && pwd); cd "$REPO"
C=$HOME/.cache/diagram-vss-modernbert; W=$C/arms/$NAME; EV=$W/eval; mkdir -p "$EV"
MODEL=$(ls -d "$W"/export/* | head -1)
P=training/neural/parity; EVID=reports/evidence/modernbert-parity-baseline/arms/$NAME; mkdir -p "$EVID"
STOP="${STOP_AT:-2026-11-06 06:45}"; LEFT=$(( $(date -d "$STOP" +%s) - $(date +%s) ))
[ "$LEFT" -gt 120 ] || { echo "too close to the deadline"; exit 9; }
export READER=${READER:-modernbert} MODEL THREADS=5   # READER=sop for a SOP-BERT control (sop_control.sh)
if [ "${SKIP_COLLECT:-0}" != 1 ]; then   # SKIP_COLLECT=1: the records exist and are complete; calibrate, score and compare again only
date '+collect start %T'
timeout "$LEFT" nice -n 10 node $P/collect_set.mjs --allow-text-overlap --train-data "$DATA" "$EV/rec_fs.jsonl" fresh2 short3 > "$EV/collect_fs.log" 2>&1 &
timeout "$LEFT" nice -n 10 node $P/collect_set.mjs --allow-text-overlap --train-data "$DATA" "$EV/rec_nl.jsonl" nl_a > "$EV/collect_nl.log" 2>&1 &
timeout "$LEFT" nice -n 10 node $P/collect_set.mjs --allow-text-overlap --train-data "$DATA" "$EV/rec_cs.jsonl" collected_1 scenes_test > "$EV/collect_cs.log" 2>&1 &
wait
date '+collect end %T'
fi
R="$EV/rec_fs.jsonl $EV/rec_nl.jsonl $EV/rec_cs.jsonl"
for CAL in fresh2,short3 fresh2,short3,nl_a; do
  T=cal-${CAL//,/-}
  node $P/calibrate_arm.mjs --cal "$CAL" "$EV/$T.confidence.json" "$EV/$T.calibration.json" $R > "$EV/$T.calibrate.log" 2>&1
  node $P/score_arm.mjs "$EV/$T.confidence.json" "$EV/$T.score.json" $R > "$EV/$T.score.log" 2>&1
  node $P/compare_arms.mjs "$EV/$T.score.json" "$C/arms/baseline/sop.$T.score.json" "$EV/minus_sop.$T.json" > "$EV/minus_sop.$T.log" 2>&1
  [ -n "$PREV" ] && node $P/compare_arms.mjs "$EV/$T.score.json" "$C/arms/$PREV/eval/$T.score.json" "$EV/minus_prev.$T.json" > "$EV/minus_prev.$T.log" 2>&1
  cp "$EV/$T.calibration.json" "$EV/minus_sop.$T.json" "$EVID/" 2>/dev/null; [ -n "$PREV" ] && cp "$EV/minus_prev.$T.json" "$EVID/" 2>/dev/null
done
python3 $P/arm_summary.py "$EV" > "$EVID/summary.txt" 2>&1
cp "$W/run/fit.jsonl" "$EVID/fit.jsonl" 2>/dev/null; cp "$W/train.log" "$EVID/train.log" 2>/dev/null
cp "$MODEL/arm_receipt.json" "$EVID/" 2>/dev/null
grep -h "exit\|error" "$EV"/collect_*.log | tail -3
cat "$EVID/summary.txt"
