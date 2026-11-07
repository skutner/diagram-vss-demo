#!/bin/bash
# q2_run.sh: Q2 end to end (QWEN3_FINETUNE_RUNLOG.md "Q2: declared"). Waits until the ModernBERT session's curve queue has released the GPU
# (its marker "C25-s1 train rc", agreed by message), or 03:00, then: training under the lock (flock -w), export, own rows and fidelity
# records (native CPU), fidelity (GPU), browser smoke, browser collection (nice 10). Scoring and the comparisons are run after the review.
set -u
HERE=$(cd "$(dirname "$0")" && pwd); cd "$HERE"
MARK=/tmp/claude-1000/-home-skutner-browserLLM/9513b574-4d97-458d-ac22-c34db6a2ad5e/scratchpad/queue_curve.out
LOCK=~/.cache/diagram-vss-modernbert/locks/GPU-905b8484-3b1e-30f6-defd-05d44f00f692.lock; A=~/.cache/diagram-vss-qwen/arms/Q2; mkdir -p $A/run-s0
log() { echo "$(date +%H:%M) $*" | tee -a $A/q2_run.log; }
until grep -q "C25-s1 train rc" $MARK 2>/dev/null; do [ "$(date +%H%M)" -ge 0300 ] && [ "$(date +%H%M)" -lt 0700 ] && { log "no GPU slot by 03:00: Q2 not run"; exit 4; }; sleep 60; done
log "marker seen; training"
PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True CUDA_VISIBLE_DEVICES=GPU-905b8484-3b1e-30f6-defd-05d44f00f692 flock -w 3600 $LOCK timeout 14400 ~/.cache/diagram-vss-modernbert/venv/bin/python -B train_qwen.py --examples $A/examples.jsonl --gguf ~/.cache/diagram-vss-qwen/models/Qwen3-0.6B-Q8_0.gguf --base ~/.cache/diagram-vss-qwen/base --out $A/run-s0 --merge --token-budget 4096 --deadline 2026-11-07T06:45:00 > $A/run-s0/train.out 2>&1
rc=$?; log "train rc $rc"; [ $rc -eq 0 ] || exit $rc
for step in export native fidelity smoke collect; do ARM=Q2 TDLIST=M3 timeout 21600 ./q1_eval.sh $step > $A/step.$step.out 2>&1; log "$step rc $?"; done
log "done (scoring waits for the review)"
