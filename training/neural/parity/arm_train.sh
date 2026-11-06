#!/bin/bash
# arm_train.sh: one arm's training and export on this machine, with the plan's hard deadline.
#   bash training/neural/parity/arm_train.sh ARM SEED DATA_DIR [extra trainer flags]
# Work goes to ~/.cache/diagram-vss-modernbert/arms/ARM[-sSEED]/: run/ (checkpoints), export/ (the Transformers.js folder), train.log. Nothing is written to the repository.
set -u
ARM=$1; SEED=$2; DATA=$3; shift 3
REPO=$(cd "$(dirname "$0")/../../.." && pwd)
C=$HOME/.cache/diagram-vss-modernbert; PY=$C/venv/bin/python
UUID=GPU-905b8484-3b1e-30f6-defd-05d44f00f692
STOP="${STOP_AT:-2026-11-06 06:45}"
W=$C/arms/$ARM-s$SEED; mkdir -p "$W"
LOCK=$C/locks/$UUID.lock
export CUDA_VISIBLE_DEVICES=$UUID PYTHONUNBUFFERED=1
LEFT=$(( $(date -d "$STOP" +%s) - $(date +%s) ))
[ "$LEFT" -gt 300 ] || { echo "too close to the deadline: $LEFT s left"; exit 9; }
cd "$REPO"
{
  date '+start %F %T'
  nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv,noheader
  # the trainer takes the GPU lock non-blocking: wait here until it is free (another job may hold it between arms)
  flock -w "$LEFT" "$LOCK" true || { echo "GPU lock not free within $LEFT s"; exit 1; }
  timeout 300 "$PY" -B training/neural/finetune_modernbert_batched.py --overfit-gate --data "$DATA" --work "$W/gate" --seed "$SEED" --gpu-uuid "$UUID" --stop-at "$STOP" "$@"; G=$?
  echo "overfit gate exit $G"
  [ "$G" -eq 0 ] || exit 1
  # any existing checkpoint is resumed, so the trainer validates settings, data and sources before it says "already complete"
  if [ -f "$W/run/checkpoint.pt" ]; then RESUME=--resume; else RESUME=; fi
  flock -w "$LEFT" "$LOCK" true || { echo "GPU lock not free within $LEFT s"; exit 1; }
  timeout "$LEFT" "$PY" -B training/neural/finetune_modernbert_batched.py --data "$DATA" --work "$W/run" --seed "$SEED" --gpu-uuid "$UUID" --stop-at "$STOP" $RESUME "$@"; T=$?
  echo "training exit $T"
  [ "$T" -eq 0 ] || exit 3
  [ -f "$W/run/complete.json" ] || exit 3
  rm -rf "$W/export"
  env -u CUDA_VISIBLE_DEVICES timeout 1800 "$PY" -B training/neural/parity/arm_export.py --work "$W/run" --data "$DATA" --out "$W/export/modernbert-$ARM-s$SEED"; E=$?
  echo "export exit $E (2 = PyTorch and Node differ on near ties: reported, not a gate)"
  date '+end %F %T'
  [ "$E" -eq 0 ] || [ "$E" -eq 2 ]
} >> "$W/train.log" 2>&1
RC=$?
tail -5 "$W/train.log" | cut -c1-160
exit $RC
