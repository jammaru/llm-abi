// SHA-256 based on Dmitry Chestnykh's public-domain fast-sha256-js.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function hashBlocks(w: Int32Array, v: Int32Array, p: Uint8Array, pos: number, len: number): number {
  while (len >= 64) {
    let a = v[0]!;
    let b = v[1]!;
    let c = v[2]!;
    let d = v[3]!;
    let e = v[4]!;
    let f = v[5]!;
    let g = v[6]!;
    let h = v[7]!;
    for (let i = 0; i < 16; i += 1) {
      const j = pos + i * 4;
      w[i] =
        ((p[j]! & 0xff) << 24) |
        ((p[j + 1]! & 0xff) << 16) |
        ((p[j + 2]! & 0xff) << 8) |
        (p[j + 3]! & 0xff);
    }
    for (let i = 16; i < 64; i += 1) {
      const u = w[i - 2]!;
      const t1 = ((u >>> 17) | (u << 15)) ^ ((u >>> 19) | (u << 13)) ^ (u >>> 10);
      const u2 = w[i - 15]!;
      const t2 = ((u2 >>> 7) | (u2 << 25)) ^ ((u2 >>> 18) | (u2 << 14)) ^ (u2 >>> 3);
      w[i] = ((t1 + w[i - 7]!) | 0) + ((t2 + w[i - 16]!) | 0);
    }
    for (let i = 0; i < 64; i += 1) {
      const t1 =
        ((((((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) +
          ((e & f) ^ (~e & g))) |
          0) +
          ((h + ((K[i]! + w[i]!) | 0)) | 0)) |
        0;
      const t2 =
        ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) +
          ((a & b) ^ (a & c) ^ (b & c))) |
        0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    v[0] = (v[0]! + a) | 0;
    v[1] = (v[1]! + b) | 0;
    v[2] = (v[2]! + c) | 0;
    v[3] = (v[3]! + d) | 0;
    v[4] = (v[4]! + e) | 0;
    v[5] = (v[5]! + f) | 0;
    v[6] = (v[6]! + g) | 0;
    v[7] = (v[7]! + h) | 0;
    pos += 64;
    len -= 64;
  }
  return pos;
}

export function sha256Hex(message: string): string {
  const data = new TextEncoder().encode(message);
  const state = new Int32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const temp = new Int32Array(64);
  const buffer = new Uint8Array(128);
  let bufferLength = 0;
  let bytesHashed = 0;
  let dataPos = 0;
  let dataLength = data.length;
  bytesHashed += dataLength;
  if (dataLength >= 64) {
    dataPos = hashBlocks(temp, state, data, dataPos, dataLength);
    dataLength %= 64;
  }
  while (dataLength > 0) {
    buffer[bufferLength] = data[dataPos]!;
    bufferLength += 1;
    dataPos += 1;
    dataLength -= 1;
  }
  const bitLenHi = (bytesHashed / 0x20000000) | 0;
  const bitLenLo = bytesHashed << 3;
  const padLength = bytesHashed % 64 < 56 ? 64 : 128;
  buffer[bufferLength] = 0x80;
  for (let i = bufferLength + 1; i < padLength - 8; i += 1) {
    buffer[i] = 0;
  }
  buffer[padLength - 8] = (bitLenHi >>> 24) & 0xff;
  buffer[padLength - 7] = (bitLenHi >>> 16) & 0xff;
  buffer[padLength - 6] = (bitLenHi >>> 8) & 0xff;
  buffer[padLength - 5] = bitLenHi & 0xff;
  buffer[padLength - 4] = (bitLenLo >>> 24) & 0xff;
  buffer[padLength - 3] = (bitLenLo >>> 16) & 0xff;
  buffer[padLength - 2] = (bitLenLo >>> 8) & 0xff;
  buffer[padLength - 1] = bitLenLo & 0xff;
  hashBlocks(temp, state, buffer, 0, padLength);
  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i += 1) {
    out[i * 4] = (state[i]! >>> 24) & 0xff;
    out[i * 4 + 1] = (state[i]! >>> 16) & 0xff;
    out[i * 4 + 2] = (state[i]! >>> 8) & 0xff;
    out[i * 4 + 3] = state[i]! & 0xff;
  }
  return [...out].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
