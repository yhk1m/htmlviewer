// © 2026 김용현
// 화산 실제 지형 세 화면(한라산과 오름, 성산 일출봉과 우도, 울릉도 나리 분지)이 함께 쓰는 계산.
// 고도 자료는 tools/bake-dem.py로 구운 512칸 정사각형 격자(데시미터, 0 아래는 0)이고, 세로 0이 북쪽이다.
// 여기 있는 것은 모두 고도 자료에서 바로 계산한 값이며, 지명과 윤곽은 각 화면의 *-osm.js에서 온다.
export const N = 512;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const idx = (i, j) => j * N + i;
export const inside = (i, j) => i >= 0 && j >= 0 && i < N && j < N;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

export function readDem(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  return h;
}

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}

export function blur(a, r, passes) {
  let out = Float32Array.from(a);
  for (let q = 0; q < passes; q++) {
    const from = out.slice();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      let s = 0, c = 0;
      for (let y = Math.max(0, j - r); y <= Math.min(N - 1, j + r); y++) for (let x = Math.max(0, i - r); x <= Math.min(N - 1, i + r); x++) { s += from[y * N + x]; c++; }
      out[j * N + i] = s / c;
    }
  }
  return out;
}

// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 덜 흔들리게 높이를 잰다.
export function medianHeight(h, x, y, r = 2) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (inside(i, j)) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// r칸 안에서 가장 높은 칸 [가로, 세로, 높이]
export function highestNear(h, x, y, r) {
  let best = [Math.round(x), Math.round(y), -Infinity];
  for (let j = Math.round(y) - r; j <= Math.round(y) + r; j++) for (let i = Math.round(x) - r; i <= Math.round(x) + r; i++) {
    if (!inside(i, j) || (i - x) ** 2 + (j - y) ** 2 > r * r) continue;
    if (h[idx(i, j)] > best[2]) best = [i, j, h[idx(i, j)]];
  }
  return best;
}

// 바다: 고도 자료는 0 아래를 0으로 깎아 두었다. 창 가장자리에서 이어진 seaHeight보다 낮은 칸을 바다로 치고,
// 바다와 이어지지 않은 낮은 칸(바닷가 저지대의 자료 얼룩)은 땅으로 남긴다. 바다 칸은 모두 0m로 맞춘다.
export function seaMask(h, seaHeight = 0.5) {
  const sea = new Uint8Array(N * N), list = [];
  for (let n = 0; n < N; n++) for (const k of [n, (N - 1) * N + n, n * N, n * N + N - 1]) if (!sea[k] && h[k] < seaHeight) { sea[k] = 1; list.push(k); }
  for (let t = 0; t < list.length; t++) {
    const c = list[t], i = c % N, j = (c / N) | 0;
    for (const [a, b] of N4) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const o = idx(x, y);
      if (!sea[o] && h[o] < seaHeight) { sea[o] = 1; list.push(o); }
    }
  }
  let lowLand = 0;
  for (let k = 0; k < N * N; k++) { if (sea[k]) h[k] = 0; else if (h[k] < seaHeight) lowLand++; }
  return { sea, lowLand };
}

// 땅의 기울기(높이 차 / 거리, 이웃 두 칸 사이)
export function slopeOf(sh, cell) {
  const s = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    s[k] = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * cell);
  }
  return s;
}

// 다각형 안의 칸을 칠한다(가로줄마다 경계와 만나는 점을 찾는다).
export function fillPolygon(poly, mark, value = 1) {
  const p = poly[0][0] === poly.at(-1)[0] && poly[0][1] === poly.at(-1)[1] ? poly : [...poly, poly[0]];
  for (let j = 0; j < N; j++) {
    const xs = [], y = j + 0.5;
    for (let n = 0; n < p.length - 1; n++) {
      const [x0, y0] = p[n], [x1, y1] = p[n + 1];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] - 0.5)); i <= Math.min(N - 1, Math.floor(xs[q + 1] - 0.5)); i++) mark[idx(i, j)] = value;
  }
  return mark;
}

// 가장자리부터 물을 채운다: 창 가장자리 칸에서 시작해 가장 낮은 칸부터 네 이웃으로 넓혀 가며,
// 이웃이 지금 칸보다 낮으면 지금 칸 높이까지 메운다. 닫힌 웅덩이는 넘치는 높이(테두리)까지 차오른다.
export function fillDepressions(h) {
  const f = Float32Array.from(h), seen = new Uint8Array(N * N);
  const hk = new Int32Array(N * N), hv = new Float32Array(N * N);
  let size = 0;
  const push = (k, v) => {
    let i = size++;
    while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
    hk[i] = k; hv[i] = v;
  };
  const pop = () => {
    const k = hk[0], lk = hk[--size], lv = hv[size];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1;
      if (c >= size) break;
      if (c + 1 < size && hv[c + 1] < hv[c]) c++;
      if (hv[c] >= lv) break;
      hk[i] = hk[c]; hv[i] = hv[c]; i = c;
    }
    hk[i] = lk; hv[i] = lv;
    return k;
  };
  for (let n = 0; n < N; n++) for (const k of [n, (N - 1) * N + n, n * N, n * N + N - 1]) if (!seen[k]) { seen[k] = 1; push(k, f[k]); }
  while (size) {
    const k = pop(), i = k % N, j = (k / N) | 0;
    for (const [a, b] of N4) {
      const x = i + a, y = j + b;
      if (!inside(x, y)) continue;
      const q = idx(x, y);
      if (seen[q]) continue;
      seen[q] = 1;
      if (f[q] < f[k]) f[q] = f[k];
      push(q, f[q]);
    }
  }
  return f;
}

// 메운 칸을 여덟 이웃으로 이어 닫힌 웅덩이마다 잰다. rule(깊이 m, 칸 수)에 드는 것만 큰 것부터 번호를 붙인다.
// mask: 남긴 웅덩이 칸에 번호 + 1. 각 웅덩이: 가운데 칸, 가장 깊은 칸, 깊이, 넘치는 높이(테두리), 칸 수, 넓이와 같은 원의 지름.
export function findBasins(h, filled, rule, cell) {
  const label = new Int32Array(N * N).fill(-1), all = [], cellsOf = [];
  for (let k = 0; k < N * N; k++) {
    if (label[k] >= 0 || filled[k] - h[k] <= 0) continue;
    const id = all.length, stack = [k], cells = [];
    label[k] = id;
    let sx = 0, sy = 0, depth = 0, deepest = k;
    while (stack.length) {
      const q = stack.pop(), i = q % N, j = (q / N) | 0;
      cells.push(q); sx += i; sy += j;
      if (filled[q] - h[q] > depth) { depth = filled[q] - h[q]; deepest = q; }
      for (const [a, b] of N8) {
        const x = i + a, y = j + b;
        if (!inside(x, y)) continue;
        const r = idx(x, y);
        if (label[r] >= 0 || filled[r] - h[r] <= 0) continue;
        label[r] = id; stack.push(r);
      }
    }
    const c = cells.length;
    all.push({ x: sx / c, y: sy / c, depth, rim: filled[k], cells: c, deepest: [deepest % N, (deepest / N) | 0] });
    cellsOf.push(cells);
  }
  const keep = all.map((d, n) => ({ ...d, n })).filter(d => d.depth >= rule.depth && d.cells >= rule.cells).sort((a, b) => b.cells - a.cells);
  const mask = new Int16Array(N * N);
  const list = keep.map((d, id) => {
    for (const q of cellsOf[d.n]) mask[q] = id + 1;
    const areaM2 = d.cells * cell * cell;
    return { id, x: d.x, y: d.y, depth: d.depth, rim: d.rim, cells: d.cells, deepest: d.deepest, areaM2, diamM: 2 * Math.sqrt(areaM2 / Math.PI), bottom: d.rim - d.depth };
  });
  return { list, mask, allCount: all.length };
}

// 가운데 점에서 가장 가까운 웅덩이(없으면 null)
export function basinNear(list, x, y, maxDist = 6) {
  let best = null, bd = maxDist;
  for (const o of list) { const e = Math.hypot(o.x - x, o.y - y); if (e < bd) { bd = e; best = o; } }
  return best;
}

// 마스크 칸 가운데 여덟 이웃에 다른 칸이 있는 가장자리 칸
export function edgeOf(mask) {
  const edge = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    if (!mask[k]) continue;
    for (const [a, b] of N8) { const x = i + a, y = j + b; if (!inside(x, y) || mask[idx(x, y)] !== mask[k]) { edge[k] = 1; break; } }
  }
  return edge;
}

// 꺾은 선 way([가로, 세로] 칸들)를 따라 step칸마다 잰 높이. 바다 칸은 water로 표시한다.
export function pathProfile(h, sea, way, cell, step = 0.5) {
  const out = [];
  let m = 0;
  for (let n = 0; n < way.length - 1; n++) {
    const [x0, y0] = way[n], [x1, y1] = way[n + 1], L = Math.hypot(x1 - x0, y1 - y0), s = Math.max(1, Math.round(L / step));
    for (let q = n === 0 ? 0 : 1; q <= s; q++) {
      const x = x0 + ((x1 - x0) * q) / s, y = y0 + ((y1 - y0) * q) / s, k = idx(clamp(Math.round(x), 0, N - 1), clamp(Math.round(y), 0, N - 1));
      out.push({ m: m + (q / s) * L * cell, x, y, z: sea[k] ? 0 : sampleH(h, x, y), water: sea[k] === 1 });
    }
    m += L * cell;
  }
  return out;
}
// 단면 위에서 칸 [x, y]에 가장 가까운 점 번호
export function nearestOnPath(points, [x, y]) {
  let best = 0, bd = Infinity;
  points.forEach((p, n) => { const e = (p.x - x) ** 2 + (p.y - y) ** 2; if (e < bd) { bd = e; best = n; } });
  return best;
}

// 표면 칠: 바다, 가파른 바위, 낮고 평평한 땅의 밭, 나머지 숲과 풀. extra(k)가 { farm, grass, forest } 일부를 바꿀 수 있다.
export function paintSurface({ h, sh, sea, slope }, { farmTop = 300, rockSlope = [0.9, 1.3], grassTop = Infinity, extra } = {}) {
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) {
    if (sea[k]) { splatB[k * 4 + 1] = 255; water[k] = 1; continue; }
    const s = slope[k];
    let farm = (1 - smooth(0.06, 0.14, s)) * (1 - smooth(farmTop * 0.8, farmTop, sh[k]));
    let grass = smooth(grassTop - 150, grassTop, sh[k]) * (1 - farm);
    const rocky = smooth(rockSlope[0], rockSlope[1], s) * (1 - farm);
    if (extra) { const e = extra(k, { farm, grass }); if (e) { farm = e.farm ?? farm; grass = e.grass ?? grass; } }
    const fo = clamp(1 - rocky - farm - grass);
    splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255;
    forest[k] = fo; mountain[k] = 1;
  }
  return { h, splatA, splatB, forest, water, total, mountain };
}
