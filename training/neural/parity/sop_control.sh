#!/bin/bash
# sop_control.sh: the SOP-BERT control of an arm, trained on the same rows with the shipped SOP-BERT's own trainer and recipe
# (finetune_roles.py: DistilBERT base uncased, lr 6e-5, batch 32, 8 epochs, fp16; an empty held-out trains the fixed 8 epochs and keeps the last).
#   bash training/neural/parity/sop_control.sh NAME SEED DATA_DIR
# Work and export go to ~/.cache/diagram-vss-modernbert/arms/SOP-NAME-sSEED/ (run/, export/sop-bert-NAME-sSEED, train.log); nothing in the repository.
# The base is read offline from the task's Hugging Face cache (revision 12040accade4e8a0f71eabdb258fecc2e7e948be, MODERNBERT_RUNLOG.md).
# finetune_roles.py takes no GPU lock of its own, so this holds the GPU lock (flock on the file the ModernBERT trainer locks) for the whole run.
# Evaluate it like an arm: READER=sop bash training/neural/parity/arm_eval.sh SOP-NAME-sSEED DATA_DIR
set -u
NAME=$1; SEED=$2; DATA=$3
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
C=$HOME/.cache/diagram-vss-modernbert; PY=$C/venv/bin/python
UUID=GPU-905b8484-3b1e-30f6-defd-05d44f00f692; LOCK=$C/locks/$UUID.lock
STOP="${STOP_AT:-2026-11-06 06:45}"
W=$C/arms/SOP-$NAME-s$SEED; mkdir -p "$W"
LEFT=$(( $(date -d "$STOP" +%s) - $(date +%s) ))
[ "$LEFT" -gt 300 ] || { echo "too close to the deadline: $LEFT s left"; exit 9; }
[ -f "$DATA/reader.json" ] && [ -f "$DATA/train.jsonl" ] || { echo "no arm data in $DATA"; exit 2; }
export CUDA_VISIBLE_DEVICES=$UUID PYTHONUNBUFFERED=1 HF_HOME=$C/hf HF_HUB_OFFLINE=1
cd "$REPO"
{
  date '+start %F %T'
  rm -rf "$W/export"
  flock -w "$LEFT" "$LOCK" timeout "$LEFT" "$PY" -B training/neural/finetune_roles.py --base distilbert-base-uncased --name "sop-bert-$NAME-s$SEED" \
    --data "$DATA" --work "$W/run" --out "$W/export/sop-bert-$NAME-s$SEED" --seed "$SEED"; T=$?
  echo "training exit $T"
  date '+end %F %T'
  [ "$T" -eq 0 ]
} >> "$W/train.log" 2>&1
RC=$?
tail -5 "$W/train.log" | cut -c1-160
exit $RC
