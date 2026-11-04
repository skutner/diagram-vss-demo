// Streaming SHA-256 (FIPS 180-4) for the Qwen3 reader: the model file is hashed while it is downloaded and again when it is loaded
// from the browser's private file system, without holding the 639 MB in one buffer (WebCrypto's digest has no streaming form).
// Plain JavaScript, no dependency; checked against WebCrypto in training/qwen/test_qwen_contract.mjs.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);

export class Sha256 {
  constructor() {
    this.h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    this.w = new Uint32Array(64); this.buf = new Uint8Array(64); this.n = 0; this.bytes = 0; this.done = false;
  }
  /** one 64-byte block of `d` at offset `o` */
  block(d, o) {
    const w = this.w, h = this.h;
    for (let i = 0; i < 16; i++, o += 4) w[i] = (d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3];
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3), s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let A = h[0], B = h[1], C = h[2], D = h[3], E = h[4], F = h[5], G = h[6], H = h[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((E >>> 6) | (E << 26)) ^ ((E >>> 11) | (E << 21)) ^ ((E >>> 25) | (E << 7)), ch = (E & F) ^ (~E & G);
      const t1 = (H + S1 + ch + K[i] + w[i]) | 0;
      const S0 = ((A >>> 2) | (A << 30)) ^ ((A >>> 13) | (A << 19)) ^ ((A >>> 22) | (A << 10)), mj = (A & B) ^ (A & C) ^ (B & C);
      const t2 = (S0 + mj) | 0;
      H = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
    }
    h[0] = (h[0] + A) | 0; h[1] = (h[1] + B) | 0; h[2] = (h[2] + C) | 0; h[3] = (h[3] + D) | 0;
    h[4] = (h[4] + E) | 0; h[5] = (h[5] + F) | 0; h[6] = (h[6] + G) | 0; h[7] = (h[7] + H) | 0;
  }
  /** add bytes (a Uint8Array); returns this */
  update(d) {
    if (this.done) throw new Error('Sha256: update after digest');
    let i = 0; const L = d.length; this.bytes += L;
    if (this.n) { while (this.n < 64 && i < L) this.buf[this.n++] = d[i++]; if (this.n === 64) { this.block(this.buf, 0); this.n = 0; } }
    for (; i + 64 <= L; i += 64) this.block(d, i);
    while (i < L) this.buf[this.n++] = d[i++];
    return this;
  }
  /** the digest as lower-case hex (the object cannot be updated afterwards) */
  hex() {
    if (!this.done) {
      const bits = this.bytes * 8, pad = new Uint8Array(((this.n < 56 ? 56 : 120) - this.n) + 8); pad[0] = 0x80;
      const hi = Math.floor(bits / 0x100000000), lo = bits >>> 0, e = pad.length - 8;
      pad[e] = hi >>> 24; pad[e + 1] = hi >>> 16; pad[e + 2] = hi >>> 8; pad[e + 3] = hi; pad[e + 4] = lo >>> 24; pad[e + 5] = lo >>> 16; pad[e + 6] = lo >>> 8; pad[e + 7] = lo;
      const n = this.bytes; this.update(pad); this.bytes = n; this.done = true;
    }
    return [...this.h].map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
}

/** the SHA-256 of a Blob (or File), read in slices of `chunk` bytes; onProgress(doneBytes, totalBytes) after each slice */
export async function sha256Blob(blob, onProgress, chunk = 8 << 20) {
  const s = new Sha256();
  for (let o = 0; o < blob.size; o += chunk) {
    s.update(new Uint8Array(await blob.slice(o, Math.min(blob.size, o + chunk)).arrayBuffer()));
    if (onProgress) onProgress(Math.min(blob.size, o + chunk), blob.size);
  }
  return s.hex();
}
