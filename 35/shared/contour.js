// 칸의 네 모서리 a(왼위) b(오른위) c(오른아래) d(왼아래)가 level보다 높은지로 선을 정한다.
// T: a-b 변, R: b-c 변, B: d-c 변, L: a-d 변
const CASES = {
  1: ['LT'], 2: ['TR'], 3: ['LR'], 4: ['RB'], 5: ['LT', 'RB'], 6: ['TB'], 7: ['LB'],
  8: ['LB'], 9: ['TB'], 10: ['TR', 'LB'], 11: ['RB'], 12: ['LR'], 13: ['TR'], 14: ['LT'],
};

export function contourSegments(h, N, level) {
  const out = [];
  const t = (p, q) => (level - p) / (q - p);
  for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
    const k = j * N + i;
    const a = h[k], b = h[k + 1], c = h[k + N + 1], d = h[k + N];
    const code = (a >= level ? 1 : 0) | (b >= level ? 2 : 0) | (c >= level ? 4 : 0) | (d >= level ? 8 : 0);
    const lines = CASES[code];
    if (!lines) continue;
    const edge = e => {
      if (e === 'T') return [i + t(a, b), j];
      if (e === 'R') return [i + 1, j + t(b, c)];
      if (e === 'B') return [i + t(d, c), j + 1];
      return [i, j + t(a, d)];
    };
    for (const line of lines) out.push(...edge(line[0]), ...edge(line[1]));
  }
  return Float32Array.from(out);
}

export function niceInterval(range) {
  const raw = range / 25;
  return [1, 2, 5, 10, 20, 50, 100].find(v => v >= raw) ?? 200;
}

export function contourLevels(min, max, interval) {
  const levels = [];
  for (let v = Math.ceil(min / interval) * interval; v <= max; v += interval) levels.push(v);
  return levels;
}

export function profileAlong(h, N, from, to, samples) {
  const out = new Float32Array(samples);
  for (let s = 0; s < samples; s++) {
    const f = s / (samples - 1);
    const x = Math.min(N - 1.001, Math.max(0, from.x + (to.x - from.x) * f));
    const y = Math.min(N - 1.001, Math.max(0, from.y + (to.y - from.y) * f));
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
    out[s] = h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
  }
  return out;
}
