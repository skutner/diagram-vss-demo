#!/bin/bash
# Only the single registered J-s0 trajectory. The trainer owns the GPU UUID lock.
set -euo pipefail
[[ $# == 2 ]] || { echo 'usage: STOP_AT="YYYY-MM-DD HH:MM" modernbert_request_weight_train.sh J 0' >&2; exit 2; }
case "$1-$2" in J-0) ;; *) echo 'unregistered trajectory' >&2; exit 2;; esac
: "${STOP_AT:?STOP_AT must be an explicit finite deadline}"
NAME="$1-s$2"
HERE=$(cd -- "$(dirname -- "$0")" && pwd)
export OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 TOKENIZERS_PARALLELISM=false HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1
exec node "$HERE/modernbert_request_weight_measure.mjs" launch-train --name "$NAME" --stop-at "$STOP_AT"
