// lists.mjs: the training folder lists of the Qwen arms, under training/sketch/. F0 is the encoders' first-run list as
// ~/.cache/diagram-vss-modernbert/arms/data/F0.out records it: training/neural/make_data.py DIRS + SAMPLE_DIRS (--all) + EXTRA_DIRS of
// arm L2, with L2's label overlay; the same messages as the same-data controls F0-s* and SOP-F0-s*.
import { resolve } from 'node:path';
export const SK = resolve(new URL('../../sketch', import.meta.url).pathname);
export const F0 = ['llm_train/sonnet_msg', 'llm_train/haiku_msg', 'llm_train/sonnet_msg2', 'llm_train/haiku_msg2', 'llm_train/sonnet_long',
  'llm_bench/fresh1/sonnet', 'llm_bench/fresh1/haiku', 'llm_train/sonnet_short', 'llm_train/haiku_short',
  'llm_bench/sonnet_spans', 'llm_bench/haiku_spans',
  'llm_train/opus_train_a', 'llm_train/opus_train_b', 'llm_train/opus_train_c', 'llm_train/opus_train_d', 'llm_train/opus_gen_1', 'llm_train/opus_gen_2',
  'llm_train/synth_rules', 'llm_train/synth_rules_ops', 'llm_train/synth_rules_ext', 'llm_train/ops_formulations', 'llm_train/opus_ext_1', 'llm_train/synth_combo'];
/** ModernBERT's M2s + M2n folders (Q2) and the natural-language round (Q2, Q3) */
export const M2 = ['llm_train/scenes_r3', 'llm_train/scenes_r3b', 'llm_train/opus_r3_gaps', 'llm_train/opus_tgt_1', 'llm_train/opus_tgt_2', 'llm_train/ops_groups', 'llm_train/ops_positions', 'llm_train/opus_short_r2'];
export const NL = ['llm_train/nl_p1'];
export const abs = list => list.map(d => resolve(SK, d));
