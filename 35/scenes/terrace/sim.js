// © 2026 김용현
// 정동진 해안 단구 실제 지형 화면의 재료. 땅 높이만 실제 자료이고 표면 재질은 규칙으로 만든 예시다.
export const N = 512;
export const SIZE = 8000;
export const SITE = { lat: 37.668, lon: 129.03, km: 8 };
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = -100;
// 격자 자리. 지명 좌표는 OpenStreetMap에서 찾아 옮겼다(정동진역 37.6918N 129.0325E, 심곡리 37.6705N 129.0465E, 금진항 37.653N 129.0523E).
export const STATION = [270, 86];
export const SIMGOK = [348, 238];
export const GEUMJIN = [381, 362];
export const TERRACE_N = [362, 205]; // 북쪽 단구면 가운데
export const TERRACE_S = [372, 315]; // 남쪽 단구면 가운데
export const VALLEY = [368, 277]; // 두 단구면을 끊는 골짜기
export const BACK = [316, 225]; // 단구면 뒤쪽 비탈
export const CLIFF = [396, 300]; // 단구면 앞 바닷가 절벽
export const SEA_SPOT = [470, 250];
// 썬크루즈리조트. OpenStreetMap 건물 윤곽(way 479603968)의 가운데 37.6834N 129.0439E, 길이 약 153m, 폭 약 27m, 뱃머리는 북동쪽 바다를 본다. 높이 약 45m는 소개 자료의 값이다.
export const SHIP = { grid: [334, 146], length: 153, width: 27, height: 45, heading: 0.641 };
export const PROFILE = { j: 300, from: 322, to: 440 }; // 단면을 재는 동서 직선
export const FLAT_LO = 55, FLAT_HI = 95; // 단구면으로 칠할 높이 범위(m)
const SEA_HEIGHT = 0.8;

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
// 동쪽 끝에서 이어진 낮은 칸을 바다로 친다. 그다음 육지와 이어지지 않은 작은 얼룩도 바다로 친다.
function seaMask(h) {
  const sea = new Uint8Array(N * N), list = [];
  for (let j = 0; j < N; j++) { const k = idx(N - 1, j); if (h[k] < SEA_HEIGHT) { sea[k] = 1; list.push(k); } }
  const walk = (seen, test) => {
    for (let t = 0; t < list.length; t++) {
      const c = list[t], i = c % N, j = (c / N) | 0;
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        if (a < 0 || b < 0 || a >= N || b >= N) continue;
        const o = idx(a, b);
        if (!seen[o] && test(o)) { seen[o] = 1; list.push(o); }
      }
    }
  };
  walk(sea, o => h[o] < SEA_HEIGHT);
  const land = new Uint8Array(N * N);
  list.length = 0;
  for (let j = 0; j < N; j++) { const k = idx(0, j); if (!sea[k]) { land[k] = 1; list.push(k); } }
  walk(land, o => !sea[o]);
  let blobs = 0;
  for (let k = 0; k < N * N; k++) if (!sea[k] && !land[k]) { sea[k] = 1; blobs++; }
  for (let k = 0; k < N * N; k++) if (sea[k]) h[k] = 0; // 바다는 모두 0m로 그린다.
  return { sea, blobs };
}

export function buildJeongdongjin(dem) {
  const h = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) h[k] = dem[k] / 10;
  const { sea, blobs } = seaMask(h);
  const sh = blur(h, 2, 2);
  const splatA = new Uint8Array(N * N * 4), splatB = new Uint8Array(N * N * 4);
  const forest = new Float32Array(N * N), water = new Float32Array(N * N), mountain = new Float32Array(N * N), total = new Float32Array(N * N), flatLand = new Uint8Array(N * N);
  let flatCells = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = i > 0 ? k - 1 : k, ir = i < N - 1 ? k + 1 : k, jl = j > 0 ? k - N : k, jr = j < N - 1 ? k + N : k;
    const slope = Math.hypot(sh[ir] - sh[il], sh[jr] - sh[jl]) / (2 * CELL);
    const wet = sea[k] ? 1 : 0;
    // 바닷가에 가까운 단구 높이의 평평한 땅
    const onTerrace = i > 325 && sh[k] > FLAT_LO && sh[k] < FLAT_HI ? 1 - smooth(0.12, 0.2, slope) : 0;
    if (onTerrace > 0.5) { flatLand[k] = 1; flatCells++; }
    const lowFlat = (1 - smooth(0.05, 0.12, slope)) * (1 - smooth(14, 26, sh[k])) * (1 - wet);
    const farm = clamp(onTerrace + lowFlat);
    const rocky = smooth(0.55, 0.95, slope);
    const fo = clamp(1 - rocky - farm - wet);
    splatA[k * 4] = 0; splatA[k * 4 + 1] = 0; splatA[k * 4 + 2] = 0; splatA[k * 4 + 3] = fo * 255;
    splatB[k * 4] = farm * 255; splatB[k * 4 + 1] = wet * 255; splatB[k * 4 + 3] = 0;
    forest[k] = fo; water[k] = wet;
    mountain[k] = clamp(1 - farm - wet);
  }
  // 건물 자리에는 나무를 심지 않는다.
  for (let j = SHIP.grid[1] - 9; j <= SHIP.grid[1] + 9; j++) for (let i = SHIP.grid[0] - 9; i <= SHIP.grid[0] + 9; i++) { mountain[idx(i, j)] = 0; forest[idx(i, j)] = 0; }
  return { h, sh, sea, flatLand, mountain, stage: { h, splatA, splatB, forest, water, total }, stats: { blobs, flatCells } };
}

// r칸 안의 가운데 값. 약 30m 자료의 점 오차에 흔들리지 않게 땅 높이를 잰다.
export function medianHeight(h, x, y, r = 3) {
  const v = [];
  for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
    const i = Math.round(x) + a, j = Math.round(y) + b;
    if (i >= 0 && j >= 0 && i < N && j < N) v.push(h[j * N + i]);
  }
  v.sort((p, o) => p - o);
  return v[v.length >> 1];
}

// 내륙에서 단구면을 지나 바다까지 곧게 잰 높이. 옆으로 3칸씩의 가운데 값이다.
export function terraceProfile(sim, samples = 240) {
  const out = [];
  for (let n = 0; n < samples; n++) {
    const x = PROFILE.from + ((PROFILE.to - PROFILE.from) * n) / (samples - 1), isSea = sim.sea[idx(Math.round(x), PROFILE.j)] === 1;
    const v = [];
    for (let b = -3; b <= 3; b++) v.push(sim.h[idx(Math.round(x), PROFILE.j + b)]);
    v.sort((p, o) => p - o);
    out.push({ m: (x - PROFILE.from) * CELL, x, y: PROFILE.j, z: isSea ? 0 : v[3], water: isSea });
  }
  return out;
}

export function profileMarks(points) {
  const nearest = x => points.reduce((b, p, t) => (Math.abs(p.x - x) < Math.abs(points[b].x - x) ? t : b), 0);
  return [
    { at: nearest(330), text: '뒤쪽 비탈', color: '#e8f2c4' },
    { at: nearest(346), text: '경사가 바뀌는 곳 (구정선 후보)', color: '#ffb38a' },
    { at: nearest(370), text: '단구면', color: '#ffe9b0' },
    { at: nearest(CLIFF[0]), text: '바닷가 절벽', color: '#ffb38a' },
    { at: points.length - 1, text: '동해', color: '#8fd6ff' },
  ];
}

export function placesOf() {
  return {
    terraceN: { name: '해안 단구', sub: '높이 약 60m에서 85m의 평평한 땅', grid: TERRACE_N },
    terraceS: { name: '해안 단구', sub: '골짜기로 끊긴 남쪽 조각', grid: TERRACE_S },
    valley: { name: '골짜기', sub: '물길이 단구를 끊은 자리', grid: VALLEY },
    back: { name: '뒤쪽 비탈', sub: '단구애로 보이는 곳', grid: BACK },
    cliff: { name: '바닷가 절벽', sub: '아랫부분까지 파랑이 닿는 곳', grid: CLIFF },
    ship: { name: '썬크루즈 리조트', sub: '약 60m에서 70m 단구면의 절벽 가까이 선 배 모양 건물', grid: SHIP.grid },
    station: { name: '정동진역', grid: STATION },
    simgok: { name: '심곡리', grid: SIMGOK },
    geumjin: { name: '금진항', grid: GEUMJIN },
    sea: { name: '동해', grid: SEA_SPOT },
  };
}
