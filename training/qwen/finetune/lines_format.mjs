// lines_format.mjs: the candidate output format of a fine-tuned Qwen reader: one line per request, in the annotation's own form,
// `[trigger words] type key=value key=value ...`; descriptions and $new inline as the annotation writes them (target=mention(color=red,shape=circle)),
// a value with a space or a quote as a JSON string. writeLines(wires) and parseLines(text) are inverse on annotated wires (format_oracle.mjs,
// make_examples.mjs check it row by row).
const valueOut = v => { const s = String(v); return /^mention\(/.test(s) || !/[\s"]/.test(s) ? s : JSON.stringify(s); };
export const writeLines = wires => wires.map(w => `[${w.trigger || ''}] ${w.type} ` + Object.entries(w.args).map(([k, v]) => `${k}=${valueOut(v)}`).join(' ')).join('\n');
export function parseLines(text) {
  const out = [], bad = [];
  text.split('\n').filter(l => l.trim()).forEach((l, i) => {
    const m = /^\[([^\]]*)\]\s+(command|question|fact|rule)\s*(.*)$/.exec(l.trim());
    if (!m) return bad.push({ line: i, why: 'not a request line' });
    const args = {}; let s = m[3], ok = true;
    while (s.length) {
      const km = /^([A-Za-z][A-Za-z0-9]*)=/.exec(s); if (!km) { ok = false; break; }
      s = s.slice(km[0].length); let val;
      if (s.startsWith('"')) { let j = 1; while (j < s.length && (s[j] !== '"' || s[j - 1] === '\\')) j++; try { val = JSON.parse(s.slice(0, j + 1)); } catch { ok = false; break; } s = s.slice(j + 1); }
      else { let j = 0, d = 0; while (j < s.length && (d > 0 || s[j] !== ' ')) { if (s[j] === '(') d++; if (s[j] === ')') d--; j++; } val = s.slice(0, j); s = s.slice(j); }
      args[km[1]] = val; s = s.trimStart();
    }
    if (!ok) return bad.push({ line: i, why: 'bad key=value' });
    out.push({ trigger: m[1], type: m[2], args });
  });
  return { wires: out, bad };
}
