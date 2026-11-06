#!/bin/bash
# build_arm_data.sh: the training rows of one arm of MODERNBERT_PARITY_PLAN.md, outside the repository, gated by the label round trip.
#   bash training/neural/parity/build_arm_data.sh ARM OUT_DIR
# ARM, each the first run's data list (make_roles.py --all with its 12 EXTRA_DIRS) plus:
#   M1   nothing: the rows must equal FIRST_ROLES (default ~/.cache/diagram-vss-modernbert/roles) byte for byte, a check of this builder
#   L1   NUM_WORDS=table (number words by the mechanical table)
#   L2   LABEL_FIXES=parity/LABEL_FIXES_L2.jsonl and IMPLIED_SCALE=1 (the scale a request states without writing it)
#   M2s  + llm_train/scenes_r3, scenes_r3b, opus_r3_gaps
#   M2n  + llm_train/opus_tgt_1, opus_tgt_2, ops_groups, ops_positions, opus_short_r2
# An arm builds on the last that passed, so a later arm takes the earlier switches by env: WITH_L1=1 (L2, M2s, M2n), WITH_L2=1 (M2s, M2n), WITH_M2S=1 (M2n).
# EXTRA_NL="nl_p1_x nl_p1_y" (not M1): folders llm_train/nl_p*, read from their opus/ labels (make_data.py label_files). The test sets (llm_bench/nl_a, nl_b, fresh2,
# short3, collected_*, scenes_test) are refused as training data, by path and by message id.
# Steps: make_roles.py --all into OUT_DIR.building; roles_roundtrip.py --compare-rows on it with the same switches and --gate 95 1 (scenes_r3b is also read when it is
# not trained: its gate was 94.7% before L1); trigger_inventory.json (parity/trigger_inventory.mjs); OUT_DIR.building becomes OUT_DIR only when every step passed, else
# OUT_DIR.failed. The round trip's work and the report stay in OUT_DIR.work (nothing beside the rows in OUT_DIR, whose files the trainer's manifest hashes).
# Env: PYTHON (default python3), FIRST_ROLES, ALSO_DIRS (more folders read by the round trip, not trained), ROLE_TOO_RICH=context (make_roles.py: a role whose
# gold holds a mention beside another part is learned as context; passed to make_roles.py and roles_roundtrip.py; not for M1).
set -euo pipefail
ARM=${1:?usage: build_arm_data.sh ARM OUT_DIR}; OUT=${2:?usage: build_arm_data.sh ARM OUT_DIR}
OUT=$(realpath -m "$OUT")
HERE=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$HERE/../../.." && pwd); SK=$REPO/training/sketch; NEURAL=$REPO/training/neural
PY=${PYTHON:-python3}
FIRST_ROLES=${FIRST_ROLES:-$HOME/.cache/diagram-vss-modernbert/roles}
die() { echo "build_arm_data: $*" >&2; exit 2; }

FIRST="llm_train/opus_train_a llm_train/opus_train_b llm_train/opus_train_c llm_train/opus_train_d llm_train/opus_gen_1 llm_train/opus_gen_2 llm_train/synth_rules llm_train/synth_rules_ops llm_train/synth_rules_ext llm_train/ops_formulations llm_train/opus_ext_1 llm_train/synth_combo"
M2S="llm_train/scenes_r3 llm_train/scenes_r3b llm_train/opus_r3_gaps"
M2N="llm_train/opus_tgt_1 llm_train/opus_tgt_2 llm_train/ops_groups llm_train/ops_positions llm_train/opus_short_r2"
L1=0; L2=0; ADD=""
want() { [ "${!1:-0}" = 1 ] || [ "${!1:-0}" = 0 ] || die "$1 must be 0 or 1"; [ "${!1:-0}" = 1 ]; }
allow() { for v in "$@"; do want "$v" && die "$ARM does not take $v: an arm takes only the switches of the arms before it"; done; return 0; }
case "$ARM" in
  M1)  allow WITH_L1 WITH_L2 WITH_M2S; [ -z "${EXTRA_NL:-}" ] || die "M1 adds nothing (EXTRA_NL is set)";;
  L1)  allow WITH_L1 WITH_L2 WITH_M2S; L1=1;;
  L2)  allow WITH_L2 WITH_M2S; L2=1; want WITH_L1 && L1=1;;
  M2s) allow WITH_M2S; ADD=$M2S; want WITH_L1 && L1=1; want WITH_L2 && L2=1;;
  M2n) ADD=$M2N; want WITH_M2S && ADD="$M2S $M2N"; want WITH_L1 && L1=1; want WITH_L2 && L2=1;;
  *)   die "unknown arm $ARM (M1, L1, L2, M2s, M2n)";;
esac
case "${ROLE_TOO_RICH:-}" in ""|context) ;; *) die "ROLE_TOO_RICH must be unset or context";; esac
[ "$ARM" != M1 ] || [ -z "${ROLE_TOO_RICH:-}" ] || die "M1 adds nothing (ROLE_TOO_RICH is set)"
[ -z "${EXTRA_DIRS:-}" ] || die "EXTRA_DIRS is set in the environment: the arm decides the data list (new folders: EXTRA_NL)"
for n in ${EXTRA_NL:-}; do
  [[ "$n" =~ ^nl_p[A-Za-z0-9_.-]*$ ]] || die "EXTRA_NL: $n is not a folder name llm_train/nl_p*"
  ADD="$ADD llm_train/$n"
done
DIRS="$FIRST $ADD"
# the test sets are never training data: no folder of the list may resolve into one (symlinks, .., absolute paths included)
for d in $DIRS; do
  [ -d "$SK/$d" ] || die "no folder training/sketch/$d"
  rel=$(realpath "$SK/$d"); rel=${rel#"$(realpath "$SK")/"}
  case "$rel" in llm_bench/nl_a|llm_bench/nl_a/*|llm_bench/nl_b|llm_bench/nl_b/*|llm_bench/fresh2|llm_bench/fresh2/*|llm_bench/short3|llm_bench/short3/*|llm_bench/collected_*|llm_bench/scenes_test|llm_bench/scenes_test/*)
    die "$d is a test set ($rel): refused as training data";; esac
done
case "$OUT" in "$REPO"|"$REPO"/*) die "OUT_DIR is inside the repository: data stays outside git";; esac
[ "$OUT" != "$(realpath -m "$FIRST_ROLES")" ] || die "OUT_DIR is the first run's rows"
for p in "$OUT" "$OUT.building" "$OUT.work"; do [ ! -e "$p" ] || die "$p exists: remove it first"; done
mkdir -p "$OUT.work"; LOG=$OUT.work/build.log

export EXTRA_DIRS="$FIRST $ADD"
unset NUM_WORDS LABEL_FIXES IMPLIED_SCALE
[ -n "${ROLE_TOO_RICH:-}" ] && export ROLE_TOO_RICH || unset ROLE_TOO_RICH
[ "$L1" = 1 ] && export NUM_WORDS=table
[ "$L2" = 1 ] && export LABEL_FIXES=$HERE/LABEL_FIXES_L2.jsonl IMPLIED_SCALE=1
ALSO=""; case " $DIRS " in *" llm_train/scenes_r3b "*) ;; *) ALSO="llm_train/scenes_r3b";; esac
for d in ${ALSO_DIRS:-}; do case " $DIRS $ALSO " in *" $d "*) ;; *) ALSO="$ALSO $d";; esac; done
export ALSO_DIRS="$ALSO"
{ echo "arm $ARM  $(date '+%F %T')"; echo "EXTRA_DIRS=$EXTRA_DIRS"; echo "NUM_WORDS=${NUM_WORDS:-} LABEL_FIXES=${LABEL_FIXES:-} IMPLIED_SCALE=${IMPLIED_SCALE:-} ALSO_DIRS=$ALSO_DIRS${ROLE_TOO_RICH:+ ROLE_TOO_RICH=$ROLE_TOO_RICH}"; } | tee "$LOG"

fail() { echo "build_arm_data: $*" | tee -a "$LOG" >&2; [ -d "$OUT.building" ] && mv "$OUT.building" "$OUT.failed"; exit 1; }
"$PY" -B "$NEURAL/make_roles.py" --all --out "$OUT.building" >> "$LOG" 2>&1 || fail "make_roles.py failed (see $LOG)"
grep -E "^(rows|label fixes|implied heads|span keys)" "$LOG" | cut -c1-400 || true

# no message of a test set in the rows, by id
"$PY" -B - "$OUT.building" "$SK" <<'E' >> "$LOG" 2>&1 || fail "a test-set message is in the rows (see $LOG)"
import json, glob, os, sys
out, sk = sys.argv[1:]
test = set()
for d in ("llm_bench/nl_a", "llm_bench/nl_b", "llm_bench/fresh2", "llm_bench/short3", "llm_bench/scenes_test") + tuple(os.path.relpath(p, sk) for p in glob.glob(sk + "/llm_bench/collected_*")):
    for f in glob.glob(os.path.join(sk, d, "**", "*.jsonl"), recursive=True):
        for l in open(f, encoding="utf8"):
            if l.strip():
                try: test.add(json.loads(l)["id"])
                except (ValueError, KeyError, TypeError): pass
ids = {json.loads(l)["id"] for l in open(os.path.join(out, "cut_train.jsonl"), encoding="utf8")}
bad = sorted(ids & test)
print(f"test-set ids checked: {len(test)}; training messages: {len(ids)}; shared: {len(bad)} {bad[:10]}")
sys.exit(1 if bad else 0)
E

if [ "$ARM" = M1 ]; then
  n=0
  for f in "$FIRST_ROLES"/*; do b=$(basename "$f"); cmp -s "$f" "$OUT.building/$b" || fail "M1: $b differs from $FIRST_ROLES"; n=$((n + 1)); done
  for f in "$OUT.building"/*; do [ -e "$FIRST_ROLES/$(basename "$f")" ] || fail "M1: $(basename "$f") is not in $FIRST_ROLES"; done
  echo "M1: the $n files equal $FIRST_ROLES byte for byte" | tee -a "$LOG"
fi

echo "round trip ($(date '+%T')) ..." | tee -a "$LOG"
RT=0; "$PY" -B "$NEURAL/roles_roundtrip.py" --work "$OUT.work/roundtrip" --compare-rows "$OUT.building" --gate 95 1 --md "$OUT.work/roundtrip" > "$OUT.work/roundtrip.txt" 2>&1 || RT=$?
grep -E "^(gate passed|GATE FAILED|  )" "$OUT.work/roundtrip.txt" | grep -v "^    " | tee -a "$LOG" || true
"$PY" -B - "$OUT.work/roundtrip/roundtrip.json" <<'E' | tee -a "$LOG"
import json, sys
T = json.load(open(sys.argv[1]))["table"]
for d in ("llm_train/scenes_r3b", "llm_train/scenes_r3", "llm_train/opus_r3_gaps"):
    t = T.get(d)
    if t: print(f"{d} ({'trained' if t.get('train') else 'not trained'}): {t.get('gold', 0)} requests, right, reference only or asked {(t.get('right', 0) + t.get('right_or_ref', 0) + t.get('asked', 0)) / max(t.get('gold', 1), 1) * 100:.1f}%, silent wrong labels {t.get('silent', 0) / max(t.get('rows', 1), 1) * 100:.2f}% of {t.get('rows', 0)} rows")
tt = {k: sum(t.get(k, 0) for t in T.values() if t.get("train")) for k in ("gold", "right", "right_or_ref", "asked", "silent", "rows")}
print(f"ALL trained: {tt['gold']} requests, right, reference only or asked {(tt['right'] + tt['right_or_ref'] + tt['asked']) / max(tt['gold'], 1) * 100:.2f}%, silent {tt['silent'] / max(tt['rows'], 1) * 100:.2f}%")
E
[ "$RT" = 0 ] || fail "the round trip gate did not pass (exit $RT; $OUT.work/roundtrip.txt)"

PYTHON=$PY node "$HERE/trigger_inventory.mjs" "$OUT.building/trigger_inventory.json" $EXTRA_DIRS >> "$LOG" 2>&1 || fail "trigger_inventory.mjs failed (see $LOG)"
tail -1 "$LOG"
mv "$OUT.building" "$OUT"
( cd "$OUT" && sha256sum * ) > "$OUT.work/sha256.txt"
echo "built $ARM -> $OUT ($(date '+%T'))" | tee -a "$LOG"
