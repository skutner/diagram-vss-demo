#!/bin/bash
# q03_baseline.sh: Q0.3 of QWEN3_FINETUNE_PLAN.md (QWEN3_FINETUNE_RUNLOG.md has the declaration). Run under the GPU lock:
#   flock -n ~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock bash q03_baseline.sh
# The shipped reader (collect_qwen.mjs) through llama.cpp b11364 CUDA (the release build; CUDA runtime from the local cuda-dependencies,
# hashes in RUNS/cuda_libs.sha256), all sets, then the drawing variant on nl_a and scenes_test. Records in ~/.cache/diagram-vss-qwen/runs/q03.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); R=~/.cache/diagram-vss-qwen/runtime/b11364-cuda/llama-b11364; RUNS=~/.cache/diagram-vss-qwen/runs/q03
GGUF=~/.cache/diagram-vss-qwen/models/Qwen3-0.6B-Q8_0.gguf; SHA=9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031; TD=~/.cache/diagram-vss-modernbert/arms/data/F0
export CUDA_VISIBLE_DEVICES=GPU-905b8484-3b1e-30f6-defd-05d44f00f692 LD_LIBRARY_PATH=$HOME/learningAI/local-llm/runtime/cuda-dependencies:$R
"$R/llama-server" -m "$GGUF" --host 127.0.0.1 --port 8096 -ngl 99 -c 6144 -b 512 -np 1 --jinja --seed 0 > "$RUNS/server-cuda-8096.log" 2>&1 &
SP=$!; trap 'kill $SP 2>/dev/null' EXIT
for i in $(seq 60); do curl -sf 127.0.0.1:8096/health >/dev/null && break; sleep 1; done
curl -sf 127.0.0.1:8096/health >/dev/null || { echo "server did not start"; exit 1; }
cd "$HERE"
run() { local out=$1; shift; SERVER=http://127.0.0.1:8096 GGUF_SHA256=$SHA TOP2=1 KEEP_PROMPT=1 timeout 20000 node collect_qwen.mjs --train-data "$TD" "$RUNS/$out" "$@" > "$RUNS/$out.out" 2> "$RUNS/$out.log"; echo "$out rc $?"; }
VARIANT=baseline-b11364-cuda run shipped.nl_a.jsonl nl_a
VARIANT=baseline-b11364-cuda run shipped.collected_1.jsonl collected_1
VARIANT=baseline-b11364-cuda run shipped.scenes_test.jsonl scenes_test
VARIANT=baseline-b11364-cuda run shipped.fresh2_short3.jsonl fresh2 short3
DRAWING=setup VARIANT=baseline-drawing-b11364-cuda run drawing.nl_a.jsonl nl_a
DRAWING=setup VARIANT=baseline-drawing-b11364-cuda run drawing.scenes_test.jsonl scenes_test
echo done
