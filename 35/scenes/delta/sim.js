// © 2026 김용현
// 김해 낙동강 하구 실제 지형 화면의 재료. 땅 높이만 실제 자료이고, 물길은 OpenStreetMap 물줄기를 격자로 옮긴 것이며, 표면 재질은 규칙으로 만든 예시다.
export const N = 512;
export const SIZE = 22000;
export const SITE = { lat: 35.14, lon: 128.92, km: 22 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 물길 경유점(격자). 상류에서 하류 순서다. 물길 참고: OpenStreetMap contributors (ODbL), 낙동강 way 853609026, 서낙동강 way 450736291, 평강천 way 1037171700, 321388212, 을숙도 서쪽 물길 way 857999378.
// 맨 끝 몇 점은 OSM 선이 끝난 뒤 바다까지 고도 자료의 낮은 골을 따라 이었다.
export const MAIN_WAY = [[424, 1], [422, 8], [421, 16], [419, 25], [418, 39], [416, 52], [414, 58], [412, 71], [410, 80], [403, 91], [396, 99], [385, 109], [377, 115], [371, 119], [356, 128], [350, 134], [346, 140], [345, 146], [345, 155], [348, 174], [348, 182], [347, 191], [345, 201], [342, 214], [341, 229], [340, 255], [339, 262], [338, 269], [336, 280], [335, 288], [328, 324], [326, 340], [327, 365], [319, 392], [300, 418], [285, 450]];
export const SEO_WAY = [[420, 18], [413, 16], [402, 25], [395, 29], [381, 34], [363, 37], [347, 37], [338, 36], [328, 37], [318, 36], [307, 34], [299, 34], [291, 35], [284, 40], [274, 49], [266, 57], [259, 62], [252, 77], [246, 84], [232, 96], [226, 102], [224, 113], [227, 130], [228, 140], [227, 152], [221, 182], [219, 208], [217, 226], [217, 249], [220, 274], [221, 282], [220, 293], [214, 300], [209, 306], [205, 340], [202, 380], [200, 410]];
export const WEST_WAY = [[335, 288], [317, 300], [312, 304], [305, 314], [290, 334], [282, 352], [280, 380]];
// 단면을 재는 길: 평강천을 따라 평원 가운데를 내려와 명지 쪽을 지나 바다로 간다.
export const PLAIN_WAY = [[309, 52], [307, 68], [298, 82], [290, 94], [280, 105], [277, 120], [264, 128], [257, 142], [253, 159], [248, 174], [253, 191], [259, 209], [264, 223], [269, 239], [258, 260], [246, 269], [234, 277], [221, 282]];
export const SECTION_END = [[224, 385], [224, 475]];
export const EULSUK = [308, 359]; // 을숙도(북위 35.10도, 동경 128.945도)
export const DAM = [325, 340]; // 낙동강 하굿둑 자리. OSM 낙동강 선이 끝나는 곳이다.
export const PLAIN_SPOT = [292, 230]; // 김해 평야 가운데
export const MYEONGJI = [224, 385]; // 명지(북위 35.09도, 동경 128.905도)
export const BARS = [239, 463]; // 하구 앞 모래섬. 고도 자료에 1m 안팎으로 낮게 드러나는 곳이다.
export const SEA_SPOT = [270, 495];
const WIDTH = { main: 8, seo: 5, west: 5 }; // 물길 반폭(칸). 약 340m, 215m다.
const SEA_HEIGHT = 0.8; // 다듬은 고도가 이보다 낮고 남쪽 바다와 이어지면 바다로 친다.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;

export function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = j * N + i;
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}
function blur(a, r, passes) {
  let out = a.slice();
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
// 경유점을 모두 지나는 매끈한 선(Catmull-Rom). 점 간격은 1칸 안팎이다.
export function spline(way) {
  const out = [];
  for (let n = 0; n < way.length - 1; n++) {
    const a = way[Math.max(0, n - 1)], b = way[n], c = way[n + 1], d = way[Math.min(way.length - 1, n + 2)];
    const steps = Math.max(1, Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1])));
    for (let q = 0; q < steps; q++) {
      const t = q / steps, t2 = t * t, t3 = t2 * t;
      const at = v => 0.5 * (2 * b[v] + (c[v] - a[v]) * t + (2 * a[v] - 5 * b[v] + 4 * c[v] - d[v]) * t2 + (3 * b[v] - a[v] - 3 * c[v] + d[v]) * t3);
      out.push({ x: at(0), y: at(1) });
    }
  }
  const e = way[way.length - 1];
  out.push({ x: e[0], y: e[1] });
  return out;
}
function distanceTo(paths) {
  const dist = new Float32Array(N * N).fill(1e9), near = new Int32Array(N * N).fill(-1), all = paths.flat();
  all.forEach((p, s) => { const i = Math.round(p.x), j = Math.round(p.y); if (i < 0 || j < 0 || i >= N || j >= N) return; const k = idx(i, j); near[k] = s; dist[k] = 0; });
  const tryFrom = (k, o) => {
    if (near[o] < 0) return;
    const p = all[near[o]], d = Math.hypot((k % N) - p.x, ((k / N) | 0) - p.y);
    if (d < dist[k]) { dist[k] = d; near[k] = near[o]; }
  };
  for (let round = 0; round < 2; round++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j);
      if (i > 0) tryFrom(k, k - 1);
      if (j > 0) { tryFrom(k, k - N); if (i > 0) tryFrom(k, k - N - 1); if (i < N - 1) tryFrom(k, k - N + 1); }
    }
    for (let j = N - 1; j >= 0; j--) for (let i = N - 1; i >= 0; i--) {
      const k = idx(i, j);
      if (i < N - 1) tryFrom(k, k + 1);
      if (j < N - 1) { tryFrom(k, k + N); if (i < N - 1) tryFrom(k, k + N + 1); if (i > 0) tryFrom(k, k + N - 1); }
    }
  }
  return dist;
}
// 남쪽 끝에서 이어진 낮은 칸을 바다로 친다. 들판의 낮은 웅덩이는 이어지지 않아 빠진다.
function seaMask(sh) {
  const mark = new Uint8Array(N * N), list = [];
  for (let i = 0; i < N; i++) { const k = idx(i, N - 1); if (sh[k] < SEA_HEIGHT) { mark[k] = 1; list.push(k); } }
  for (let t = 0; t < list.length; t++) {
    const c = list[t], i = c % N, j = (c / N) | 0;
    if (j < 330) continue; // 바다가 물길을 타고 평야로 번지지 않게 한다.
    for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
      if (a < 0 || b < 0 || a >= N || b >= N) continue;
      const o = idx(a, b);
      if (!mark[o] && sh[o] < SEA_HEIGHT) { mark[o] = 1; list.push(o); }
    }
  }
  return mark;
}

export function buildGimhae(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const sh = blur(h, 2, 2);
  const main = spline(MAIN_WAY), seo = spline(SEO_WAY), west = spline(WEST_WAY), paths = [main, seo, west];
  const sea = seaMask(sh);
  const dMain = distanceTo([main]), dSeo = distanceTo([seo]), dWest = distanceTo([west]);
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N);
  let seaCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = Math.max(sea[k], 1 - smooth(WIDTH.main - 2, WIDTH.main, dMain[k]), 1 - smooth(WIDTH.seo - 2, WIDTH.seo, dSeo[k]), 1 - smooth(WIDTH.west - 2, WIDTH.west, dWest[k]));
    const flat = 1 - smooth(0.05, 0.12, slope), low = 1 - smooth(14, 26, sh[k]);
    const farm = flat * low * (1 - wet);
    const rocky = smooth(0.7, 1.1, slope), grass = (1 - flat) * low * (1 - smooth(0.2, 0.4, slope)) * 0.8;
    const fo = clamp(1 - rocky - farm - grass - wet);
    splatA[k * 4] = 0; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = grass * 255; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255; splatB[k * 4 + 3] = 0;
    forest[k] = fo; water[k] = wet;
    mountain[k] = 1 - flat * low;
    if (sea[k]) seaCells++;
  }
  return { h, sh, sea, paths, mountain, stage: { h, splatA, splatB, forest, water, total }, stats: { seaCells } };
}

// r칸 안의 가운데 값. 약 30m 자료의 점 오차와 논밭 정리 자국에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(sh, x, y, r = 5) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i >= 0 && j >= 0 && i < N && j < N) v.push(sh[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// 평원 가운데를 따라 바다까지 걸으며 잰 높이.
export function plainProfile(sim, samples = 240) {
  const line = spline([...PLAIN_WAY, ...SECTION_END]);
  const cum = [0];
  for (let t = 1; t < line.length; t++) cum.push(cum[t - 1] + Math.hypot(line[t].x - line[t - 1].x, line[t].y - line[t - 1].y));
  const len = cum[cum.length - 1], out = [];
  for (let n = 0, t = 0; n < samples; n++) {
    const want = (len * n) / (samples - 1);
    while (t < line.length - 2 && cum[t + 1] < want) t++;
    const u = clamp((want - cum[t]) / Math.max(1e-6, cum[t + 1] - cum[t])), x = line[t].x + (line[t + 1].x - line[t].x) * u, y = line[t].y + (line[t + 1].y - line[t].y) * u;
    const isSea = sim.sea[idx(Math.round(x), Math.round(y))] === 1;
    out.push({ m: want * CELL, x, y, z: isSea ? 0 : medianHeight(sim.sh, x, y), water: isSea });
  }
  return out;
}

export function profileMarks(points) {
  const nearest = g => points.reduce((b, p, t) => (Math.hypot(p.x - g[0], p.y - g[1]) < Math.hypot(points[b].x - g[0], points[b].y - g[1]) ? t : b), 0);
  return [
    { at: nearest(PLAIN_SPOT), text: '김해 평야', color: '#e8f2c4' },
    { at: nearest(MYEONGJI), text: '명지', color: '#ffd36b' },
    { at: points.length - 1, text: '바다', color: '#8fd6ff' },
  ];
}

export function placesOf(sim) {
  const [main, seo] = sim.paths;
  const on = (path, f) => { const p = path[Math.floor(path.length * f)]; return [p.x, p.y]; };
  return {
    main: { name: '낙동강', grid: on(main, 0.5) },
    seo: { name: '서낙동강', sub: '갈라져 나온 물길', grid: on(seo, 0.5) },
    plain: { name: '김해 평야', sub: '상부 삼각주의 평원', grid: PLAIN_SPOT },
    eulsuk: { name: '을숙도', sub: '하구의 하중도', grid: EULSUK },
    dam: { name: '낙동강 하굿둑', grid: DAM },
    myeongji: { name: '명지', sub: '하구의 낮은 땅', grid: MYEONGJI },
    bars: { name: '연안 사주', sub: '파랑이 쌓은 모래섬(등)', grid: BARS },
    sea: { name: '남해', grid: SEA_SPOT },
  };
}
