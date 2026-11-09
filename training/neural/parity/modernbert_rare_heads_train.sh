#!/bin/bash
# Only the three registered trajectories. The trainer owns the GPU UUID lock.
set -euo pipefail
[[ $# == 2 ]] || { echo 'usage: STOP_AT="YYYY-MM-DD HH:MM" modernbert_rare_heads_train.sh W 0|F 1|W 1' >&2; exit 2; }
case "$1-$2" in W-0|F-1|W-1) ;; *) echo 'unregistered trajectory' >&2; exit 2;; esac
: "${STOP_AT:?STOP_AT must be an explicit finite deadline}"
NAME="$1-s$2"
HERE=$(cd -- "$(dirname -- "$0")" && pwd)
export OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 TOKENIZERS_PARALLELISM=false HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
exec node "$HERE/modernbert_rare_heads_measure.mjs" launch-train --name "$NAME" --stop-at "$STOP_AT"
