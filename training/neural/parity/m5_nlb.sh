#!/bin/bash
# m5_nlb.sh: M5's single reading of the sealed set nl_b by one arm (MODERNBERT_PARITY_PLAN.md M5; MODERNBERT_RUNLOG.md "nl_b, read once").
#   bash training/neural/parity/m5_nlb.sh ARM-sSEED READER [MODEL]            READER = modernbert | sop
# In order, for an arm that was already evaluated (arm_eval.sh) so that its own confidence exists:
#   1. collect_set.mjs --allow-text-overlap --train-data <the arm's data> on nl_b (records + manifest);
#   2. score_arm.mjs with the arm's OWN confidence file eval/cal-fresh2-short3-nl_a.confidence.json: nothing is fitted on nl_b (no calibration part);
#   3. free_run_set.mjs on nl_b with the same confidence file: the sessions on the reader's own drawing, gate on and off (modes all and gate) and the
#      do-nothing floor. Skipped for a model whose reader reads the drawing (arm M4): free_run_set.mjs does not build its drawing lines;
#   4. the paired comparisons FINAL minus CONTROL and FINAL minus each side arm, on nl_b (minus_X.json) and on fresh2/short3 (fs_minus_X.json),
#      whenever both arms' scores exist; it can be run in any order, each run writes the comparisons its arm completes.
# Everything goes to ~/.cache/diagram-vss-modernbert/arms/ARM-sSEED/nlb/ (nothing in the repository). The data of the arm is
# arms/data/<NAME> (ARM-sSEED without a leading SOP- and its -sSEED; the SOP-BERT control reads F0's list); MODEL defaults to the one folder in ARM/export/.
# Env: FINAL (F0-s0), CONTROL (SOP-F0-s0), SIDES ("M4-s0 M3-s0"), DATA_DIR, THREADS (5), ARMS_DIR, PARITY_DIR, STOP_AT (2026-11-06 06:45).
# The set nl_b must be unsealed in sets.mjs; until then collect_set.mjs stops with "Unknown set nl_b" and nothing is read.
set -u
NAME=${1:?usage: m5_nlb.sh ARM-sSEED modernbert|sop [MODEL]}; READER=${2:?}; MODEL=${3:-}
case "$READER" in modernbert|sop) ;; *) echo "READER must be modernbert or sop"; exit 2;; esac
REPO=$(cd "$(dirname "$0")/../../.." && pwd); cd "$REPO"
C=$HOME/.cache/diagram-vss-modernbert; ARMS=${ARMS_DIR:-$C/arms}; W=$ARMS/$NAME; OUT=$W/nlb
P=${PARITY_DIR:-training/neural/parity}
FINAL=${FINAL:-F0-s0}; CONTROL=${CONTROL:-SOP-F0-s0}; SIDES=${SIDES:-"M4-s0 M3-s0"}
BASE=${NAME#SOP-}; BASE=${BASE%-s[0-9]*}
DATA=${DATA_DIR:-$ARMS/data/$BASE}
CONF=$W/eval/cal-fresh2-short3-nl_a.confidence.json
[ -n "$MODEL" ] || MODEL=$(ls -d "$W"/export/* 2>/dev/null | head -1)
[ -f "$MODEL/config.json" ] || { echo "no model folder: $MODEL"; exit 2; }
[ -f "$CONF" ] || { echo "no confidence file of the arm: $CONF (run arm_eval.sh first)"; exit 2; }
[ -f "$DATA/train.jsonl" ] || { echo "no training data in $DATA"; exit 2; }
STOP="${STOP_AT:-2026-11-06 06:45}"; LEFT=$(( $(date -d "$STOP" +%s) - $(date +%s) ))
[ "$LEFT" -gt 120 ] || { echo "too close to the deadline"; exit 9; }
mkdir -p "$OUT"
export READER MODEL THREADS=${THREADS:-5}
{
date '+nlb start %F %T'
echo "arm $NAME reader $READER model $MODEL data $DATA confidence $CONF"
# 1. the reading (resumes after a stop; refuses a changed configuration)
timeout "$LEFT" nice -n 10 node $P/collect_set.mjs --allow-text-overlap --train-data "$DATA" "$OUT/rec_nlb.jsonl" nl_b > "$OUT/collect.log" 2>&1; RC=$?
tail -n 2 "$OUT/collect.log" | cut -c1-200
[ "$RC" -eq 0 ] || { echo "collect_set.mjs exit $RC"; exit "$RC"; }
# 2. the arm's own confidence; nothing is fitted here
node $P/score_arm.mjs "$CONF" "$OUT/nlb.score.json" "$OUT/rec_nlb.jsonl" > "$OUT/score.log" 2>&1 || { echo "score_arm.mjs failed"; tail -n 5 "$OUT/score.log"; exit 3; }
tail -n 2 "$OUT/score.log" | cut -c1-240
# 3. the sessions on the reader's own drawing, gate on and off
if node -e "const c=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));process.exit(c.reader&&c.reader.drawing?0:1)" "$MODEL/config.json"; then
  echo "free run skipped: this model reads the drawing (arm M4) and free_run_set.mjs does not build the drawing lines"
else
  timeout "$LEFT" nice -n 10 node $P/free_run_set.mjs --confidence "$CONF" "$OUT/nlb.free_run.json" nl_b > "$OUT/free_run.log" 2>&1 || { echo "free_run_set.mjs failed"; tail -n 5 "$OUT/free_run.log"; }
  tail -n 3 "$OUT/free_run.log" | cut -c1-240
fi
# 4. the paired comparisons, FINAL minus the others
cmp() {   # A B: A minus B, when both are scored
  local A=$1 B=$2
  [ -f "$ARMS/$A/nlb/nlb.score.json" ] && [ -f "$ARMS/$B/nlb/nlb.score.json" ] || return 0
  node $P/compare_arms.mjs "$ARMS/$A/nlb/nlb.score.json" "$ARMS/$B/nlb/nlb.score.json" "$ARMS/$A/nlb/minus_$B.json" > "$ARMS/$A/nlb/minus_$B.log" 2>&1 && echo "wrote $ARMS/$A/nlb/minus_$B.json"
  node $P/compare_arms.mjs "$ARMS/$A/eval/cal-fresh2-short3-nl_a.score.json" "$ARMS/$B/eval/cal-fresh2-short3-nl_a.score.json" "$ARMS/$A/nlb/fs_minus_$B.json" > "$ARMS/$A/nlb/fs_minus_$B.log" 2>&1 && echo "wrote $ARMS/$A/nlb/fs_minus_$B.json"
}
if [ "$NAME" = "$FINAL" ]; then for X in $CONTROL $SIDES; do cmp "$FINAL" "$X"; done
else cmp "$FINAL" "$NAME"; fi
date '+nlb end %F %T'
} 2>&1 | tee -a "$OUT/m5_nlb.log"
exit "${PIPESTATUS[0]}"
