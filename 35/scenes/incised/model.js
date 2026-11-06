// © 2026 김용현
// 감입 곡류와 하안 단구 형성 모형의 계산. 화면과 분리되어 있어 node에서도 실행할 수 있다.
// 넓은 범람원을 자유 곡류하는 강에서 시작한다. 땅이 솟으면 강은 같은 굽이를 지키며 아래로 파고들고,
// 멈춘 동안에는 강이 좌우로 옮겨 다니며 물이 닿은 사면 발치만 깎아 바닥을 넓힌다. 다음 솟음 때 그 바닥의 남은 조각이 단구면이 된다.
// 강의 큰 중심선은 경사를 따라가며 찾지 않고 처음부터 수식으로 정한다. 옆 이동도 수식이고, 정지기가 끝나면 중심선으로 돌아온다.
// 그래서 수치가 조금 달라도 갈라지지 않고, 곡류 모양이 다음 파고듦으로 이어진다.
// 미앤더 핵 조건(path: 'omega')만 고리 물길을 쓴다. 고리의 목이 잘리면 강의 기하가 지름길 물길로 바뀌고, 옛 고리는 구하도로 남는다.
import { rng32 } from '../../shared/rng.js';

export const N = 256;
export const CHANNEL = 3.4; // 강 너비의 절반(칸)
const FLOOR_UP = 0.9; // 강바닥에서 골짜기 바닥(범람원)까지의 높이
const GRAVEL = 1.1; // 바닥에 남는 자갈층 두께
const WALL = 2.8; // 깎인 벽의 경사(칸당 높이). 높이를 과장한 값이다.
const RISE_SECONDS = 4;
const CUT_SECONDS = 4;
const WAVE_SECONDS = 3; // 파고듦이 강 끝에서 위쪽으로 올라가는 데 걸리는 시간
const FREE_SECONDS = 4;
const WIDEN_WIDTH = [6.6, 19.8, 33]; // 남은 솟음이 0, 1, 2번일 때 정지기 동안 넓어지는 칸 수(평균)
const WIDEN_SECONDS = [6, 8, 12]; // 같은 순서의 정지기 길이
const SWING_LENGTH = 160; // 강의 옆 이동 파동의 길이(칸)
const SWING_SECONDS = 5; // 한 점이 한 번 왕복하는 데 걸리는 시간(약)
const MIN_SWINGS = 1.6; // 정지기마다 최소 왕복 수. 강의 어느 점이든 진폭이 큰 동안 양쪽을 한 번씩 지나게 한다.
const GRID = 60; // 옆 이동을 계산하는 고정 시간 격자(초당). tick 크기와 무관하게 같은 지형이 나온다.
const INNER_LIMIT = 0.7; // 안쪽 굽이로 옮겨 갈 수 있는 거리(곡률 반지름에 대한 비). 물띠가 꼬이지 않게 한다.
const BEND_EFFECT = 0.35; // 바깥 굽이는 이 비율만큼 더, 안쪽 굽이는 덜 깎인다.
// 미앤더 핵 조건에서만 쓰는 값. 목이 잘리는 시점과 위치는 설명을 위해 정한 값이다.
const NECK_SECONDS = 14; // 목 양쪽에서 벽을 깎는 정지기
const CUTOFF_SECONDS = 1.5; // 잘린 곳으로 물이 흐르기 시작하는 시간
const DRAIN_SECONDS = 2.5; // 옛 고리에서 물이 빠지는 시간(줄어드는 것은 앞쪽 2초)
const NECK_LEFT = 0.8; // 잘리기 직전 물 가장자리와 목 한가운데의 거리
const NECK_SPREAD = 13; // 목을 때리는 물길 구간의 길이(가우스 폭)
const BREACH_SWING = 11; // 잘린 뒤 새 물길이 핵 쪽으로 옮겨 가 터진 곳을 넓히는 거리
const BREACH_SPREAD = 13;
const FINAL_SECONDS = 5; // 다시 파고든 뒤 지금 강이 좁은 골짜기 바닥을 넓히는 시간
const FINAL_REACH = [2.6, 9.6]; // 그때 강이 옮겨 가는 쪽별 거리. 앞쪽(카메라 쪽)을 넓혀 위에서 물이 벽에 가려지지 않게 하고, 핵 쪽은 좁게 둔다.

export const OPTIONS = {
  uplift: { none: 0, low: 7, mid: 10, high: 14 },
  times: { 1: 1, 2: 2, 3: 3 },
  sea: { same: 0, low: 9 },
};

export const PRESETS = {
  textbook: { name: '교과서 하안 단구', options: { uplift: 'mid', times: '3', sea: 'same', path: 'river' } },
  once: { name: '솟음 한 번', options: { uplift: 'mid', times: '1', sea: 'same', path: 'river' } },
  sea: { name: '해수면 낮아짐', options: { uplift: 'none', times: '2', sea: 'low', path: 'river' } },
  core: { name: '미앤더 핵', options: { uplift: 'high', times: '2', sea: 'same', path: 'omega' } },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const idx = (i, j) => j * N + i;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const swingsIn = seconds => Math.max(MIN_SWINGS, seconds / SWING_SECONDS);
// 옆 이동의 크기: 처음부터 천천히 커지고 끝에서 0으로 돌아온다.
const swingSize = u => smooth(0, 0.4, u) * (1 - smooth(0.85, 1, u));

// 파동의 위상마다 그 점이 정지기 동안 닿는 가장 큰 비율. 진폭을 이 값으로 나누면 점마다 목표 너비에 닿는다.
function swingPeaks(swings) {
  const PH = 64, table = new Float32Array(PH * 2);
  for (let ph = 0; ph < PH; ph++) for (let i = 1; i < 120; i++) {
    const u = i / 120, v = swingSize(u) * Math.sin(2 * Math.PI * (ph / PH - swings * u));
    if (v > table[ph * 2 + 1]) table[ph * 2 + 1] = v;
    if (-v > table[ph * 2]) table[ph * 2] = -v;
  }
  return (s, c) => {
    const f = ((s / SWING_LENGTH) % 1) * PH, a = Math.floor(f) % PH, b = (a + 1) % PH, w = f - Math.floor(f);
    return Math.max(0.3, table[a * 2 + c] * (1 - w) + table[b * 2 + c] * w);
  };
}

function valueNoise(seed) {
  const r = rng32(seed), S = 256;
  const g = new Float32Array(S * S).map(() => r());
  const at = (x, y) => g[((y % S) + S) % S * S + ((x % S) + S) % S];
  const n = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b;
  };
  return (x, y, oct = 3) => { let s = 0, w = 0.5, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += w * n(x * f, y * f); t += w; w *= 0.5; f *= 2; } return s / t; };
}

// 강 중심선: 방향각이 사인꼴로 흔들리는 곡선(Kinoshita 곡선). 씨앗마다 위상과 파장이 조금 다르다.
function tracePath(seed, omega) {
  const r = rng32(seed * 131 + 7);
  const lam = 270 + r() * 30, phi0 = r() * Math.PI * 2;
  const pts = [];
  let x = -16, y = 0, phi = phi0, s = 0;
  while (x < N + 16 && pts.length < 1600) {
    const wob = 1 + 0.12 * Math.sin(s * 0.011 + phi0 * 3);
    const th = omega * wob * Math.sin(phi) + 0.06 * omega ** 3 * Math.sin(3 * phi);
    pts.push({ x, y, th });
    x += Math.cos(th); y += Math.sin(th); s += 1;
    phi += (2 * Math.PI) / (lam * (1 + 0.1 * Math.sin(s * 0.017 + phi0)));
  }
  const ys = pts.map(p => p.y), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
  for (const p of pts) p.y += 128 - mid;
  return { pts, span: Math.max(...ys) - Math.min(...ys) };
}

function minLimbGap(pts) {
  let gap = Infinity;
  for (let a = 0; a < pts.length; a += 4) for (let b = a + 140; b < pts.length; b += 4) {
    const d = Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y);
    if (d < gap) gap = d;
  }
  return gap;
}

function buildPath(seed) {
  let omega = 1.62;
  for (;;) {
    const t = tracePath(seed, omega);
    if ((t.span <= 206 && minLimbGap(t.pts) >= 58) || omega < 1) return t.pts;
    omega -= 0.03;
  }
}

// 미앤더 핵 조건의 물길: 블록 가운데에 목이 좁은 고리(오메가 모양) 하나를 둔다. 곡률을 구간별로 정해 적분하는 수식이라 환경에 따라 달라지지 않는다.
// 고리 쪽은 좌우 대칭이고, 양 끝의 완만한 굽이만 씨앗마다 조금 다르다.
function buildOmegaPath(seed) {
  const r = rng32(seed * 211 + 13);
  const R = 47 + r() * 5, R1 = 18, BETA = Math.PI / 3, TURN = Math.PI / 2 + BETA, TAIL = 260;
  const lamUp = 115 + r() * 30, ampUp = (r() < 0.5 ? -1 : 1) * (0.26 + r() * 0.08);
  const lamDown = 115 + r() * 30, ampDown = (r() < 0.5 ? -1 : 1) * (0.26 + r() * 0.08);
  const raw = [];
  for (let d = TAIL; d > 0; d--) raw.push(ampUp * Math.sin((2 * Math.PI * d) / lamUp));
  const entry = Math.round(R1 * TURN), loop = Math.round(R * 2 * TURN);
  for (let i = 1; i <= entry; i++) raw.push((-TURN * i) / entry);
  for (let i = 1; i <= loop; i++) raw.push(-TURN + (2 * TURN * i) / loop);
  for (let i = 1; i <= entry; i++) raw.push(TURN * (1 - i / entry));
  for (let d = 1; d <= TAIL; d++) raw.push(ampDown * Math.sin((2 * Math.PI * d) / lamDown));
  const th = raw.map((_, i) => { let s = 0, c = 0; for (let q = -4; q <= 4; q++) if (raw[i + q] !== undefined) { s += raw[i + q]; c++; } return s / c; });
  const xs = [0], ys = [0];
  for (let i = 1; i < th.length; i++) { xs.push(xs[i - 1] + Math.cos(th[i])); ys.push(ys[i - 1] + Math.sin(th[i])); }
  const apex = TAIL + entry + (loop >> 1), dx = 128 - xs[apex], dy = 50 - ys[apex];
  let from = 0, to = th.length - 1;
  for (let i = apex; i >= 0; i--) if (xs[i] + dx < -16) { from = i; break; }
  for (let i = apex; i < th.length; i++) if (xs[i] + dx > N + 16) { to = i; break; }
  const path = [];
  for (let i = from; i <= to; i++) path.push({ x: xs[i] + dx, y: ys[i] + dy, th: th[i] });
  // 강이 곧장 위로 향하는 곳이 목 쪽으로 가장 불룩한 곳이다. 상류에서 내려오며 처음 만나는 점을 고른다.
  const center = apex - from;
  let neckFrom = center;
  for (let s = TAIL - from; s < center; s++) if (path[s].th <= -Math.PI / 2) { neckFrom = s; break; }
  const neckTo = 2 * center - neckFrom;
  return { path, R, neckFrom, neckTo, center: { x: 128, y: 50 + R }, neck: { x: (path[neckFrom].x + path[neckTo].x) / 2, y: (path[neckFrom].y + path[neckTo].y) / 2 } };
}

// 잘린 뒤의 물길: 목보다 조금 위아래에서 옛 물길을 떠나, 잘린 곳을 지나 다시 만나는 곡선(에르미트). 칸 하나 간격으로 다시 찍는다.
function buildShortcut(omega) {
  const { path, neckFrom, neckTo, neck } = omega;
  const back = 13, sa = neckFrom - back, sb = neckTo + back, a = path[sa], b = path[sb];
  const T = (((neck.y + 3 - a.y) * 8) / (Math.sin(a.th) - Math.sin(b.th)));
  const curve = [];
  for (let i = 0; i <= 300; i++) {
    const u = i / 300, h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    curve.push({ x: h00 * a.x + h10 * T * Math.cos(a.th) + h01 * b.x + h11 * T * Math.cos(b.th), y: h00 * a.y + h10 * T * Math.sin(a.th) + h01 * b.y + h11 * T * Math.sin(b.th) });
  }
  const bridge = [];
  let run = 0, next = 1;
  for (let i = 1; i < curve.length; i++) {
    const seg = Math.hypot(curve[i].x - curve[i - 1].x, curve[i].y - curve[i - 1].y);
    while (run + seg >= next) {
      const f = (next - run) / seg, th = Math.atan2(curve[i].y - curve[i - 1].y, curve[i].x - curve[i - 1].x);
      bridge.push({ x: curve[i - 1].x + (curve[i].x - curve[i - 1].x) * f, y: curve[i - 1].y + (curve[i].y - curve[i - 1].y) * f, th });
      next++;
    }
    run += seg;
  }
  bridge.length = Math.max(0, bridge.length - (run - bridge.length < 0.5 ? 1 : 0));
  const out = [...path.slice(0, sa + 1), ...bridge, ...path.slice(sb)];
  return { path: out, sa, sb, ta: sa, tb: sa + bridge.length + 1 };
}

// 강바닥 높이: 물길이 곧장 나아가는 곳은 블록 왼쪽에서 오른쪽으로 일정하게 낮아지고, 고리 안에서는 양 끝 높이를 천천히 잇는다.
const zAtX = x => 4 - (x / N) * 4;

// 칸마다 가장 가까운 중심선 점, 거리, 어느 쪽 강둑인지 미리 재 둔다.
function buildGeometry(seed) { return geometryOf(buildPath(seed)); }
function geometryOf(path) {
  const M = path.length;
  const near = new Int16Array(N * N), dist = new Float32Array(N * N), side = new Uint8Array(N * N);
  const clear = new Float32Array(M * 2);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let best = Infinity, bs = 0;
    for (let s = 0; s < M; s++) {
      const dx = path[s].x - i, dy = path[s].y - j, q = dx * dx + dy * dy;
      if (q < best) { best = q; bs = s; }
    }
    const k = idx(i, j), p = path[bs], d = Math.sqrt(best);
    near[k] = bs; dist[k] = d;
    side[k] = Math.cos(p.th) * (j - p.y) - Math.sin(p.th) * (i - p.x) > 0 ? 1 : 0;
    const c = bs * 2 + side[k];
    if (d > clear[c]) clear[c] = d;
  }
  // 굽음: 양수면 강이 side 1 쪽으로 돈다.
  const curve = new Float32Array(M);
  for (let s = 0; s < M; s++) {
    const a = path[Math.max(0, s - 12)].th, b = path[Math.min(M - 1, s + 12)].th;
    curve[s] = (b - a) / Math.max(1, Math.min(M - 1, s + 12) - Math.max(0, s - 12));
  }
  // 옆 굽이까지의 여유. 가까운 점이 없는 곳이 끼지 않게 넓게 고르고, 작은 값을 따른다.
  const room = new Float32Array(M * 2);
  for (let c = 0; c < 2; c++) for (let s = 0; s < M; s++) {
    let sum = 0, w = 0;
    for (let q = -14; q <= 14; q++) { const t = s + q; if (t < 0 || t >= M) continue; const v = clear[t * 2 + c]; if (v > 0) { sum += Math.min(v, 90); w++; } }
    room[s * 2 + c] = w ? sum / w : 90;
  }
  return { path, M, near, dist, side, curve, room };
}

export function createModel(seed = 11) {
  const riverGeo = buildGeometry(seed);
  const noise = valueNoise(seed + 40);
  const options = { uplift: 'mid', times: '3', sea: 'same', path: 'river' };
  // 지금 강의 기하. 미앤더 핵 조건에서는 고리 물길과 지름길 물길로 바뀐다.
  let { path, M, near, dist, side, curve, room } = riverGeo;
  const riverZ0 = new Float32Array(M);
  {
    let far = -16;
    for (let s = 0; s < M; s++) { far = Math.max(far, path[s].x); riverZ0[s] = 4 - (far / N) * 4; }
  }
  let z0 = riverZ0;
  const mask = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) if (dist[k] < CHANNEL) mask[k] = 2;
  const wallRough = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) wallRough[idx(i, j)] = (noise(i * 0.09, j * 0.09, 3) - 0.5) * 6;

  const riverOff = new Float32Array(M), riverReach = new Float32Array(M * 2);
  let off = riverOff; // 중심선 점마다 지금 강이 옆으로 옮겨 간 거리. +는 side 1 쪽이다.
  let reach = riverReach; // 이번 정지기에 물 가장자리가 쪽별로 닿은 가장 먼 거리. 벽 발치가 여기까지 물러난다.
  const lastCut = new Float32Array(N * N); // 칸이 옆으로 깎여 바닥이 된 시각. 방금 깎인 자리를 칠할 때 쓴다.

  let h, rock, age, bed, plan, clock, step, stepClock, seaLevel, widths, amps, sectionAt, lifted, gridDone, contactId;
  // 미앤더 핵 조건에서만 쓰는 것. omega는 고리와 지름길의 기하(한 번만 계산), run은 이번 실행의 상태다.
  let omega = null, run = null;

  const lowering = () => OPTIONS.uplift[options.uplift] + OPTIONS.sea[options.sea];
  const count = () => OPTIONS.times[options.times];
  const isCore = () => options.path === 'omega';

  function useGeometry(g, z, o, r) {
    ({ path, M, near, dist, side, curve, room } = g);
    z0 = z; off = o; reach = r;
  }

  function buildOmega() {
    if (omega) return omega;
    const shape = buildOmegaPath(seed), cut = buildShortcut(shape);
    const P = geometryOf(shape.path), Q = geometryOf(cut.path);
    const { sa, sb } = cut, zp = new Float32Array(P.M), zq = new Float32Array(Q.M); // 강바닥 높이
    for (let s = 0; s < P.M; s++) {
      if (s <= sa || s >= sb) zp[s] = zAtX(shape.path[s].x);
      else zp[s] = zAtX(shape.path[sa].x) + (zAtX(shape.path[sb].x) - zAtX(shape.path[sa].x)) * ((s - sa) / (sb - sa));
    }
    for (let t = 0; t < Q.M; t++) zq[t] = zAtX(cut.path[t].x);
    // 목을 때리는 물길의 모양과 나머지 강의 옆 이동 크기. 고리 바깥은 넓게, 고리 안쪽(핵 쪽)과 작은 굽이 안쪽은 좁게 옮겨 다닌다.
    const gap = Math.hypot(shape.path[shape.neckTo].x - shape.path[shape.neckFrom].x, shape.path[shape.neckTo].y - shape.path[shape.neckFrom].y);
    const peak = swingPeaks(swingsIn(NECK_SECONDS)), raw = new Float32Array(P.M * 2), amp = new Float32Array(P.M * 2), bump = new Float32Array(P.M);
    const gauss = (d, w) => Math.exp(-0.5 * (d / w) ** 2);
    for (let s = 0; s < P.M; s++) {
      const hit = gauss(s - shape.neckFrom, NECK_SPREAD) + gauss(s - shape.neckTo, NECK_SPREAD);
      bump[s] = (gap / 2 - NECK_LEFT - CHANNEL) * hit;
      const inLoop = s > shape.neckFrom && s < shape.neckTo, atArc = !inLoop && (s > shape.neckFrom - 34) && (s < shape.neckTo + 34);
      const a0 = inLoop ? 8 : atArc ? 3 : 7, a1 = inLoop ? 4.5 : atArc ? 3 : 7;
      raw[s * 2] = a0 * (1 - hit); raw[s * 2 + 1] = a1 * (1 - hit);
    }
    for (let c = 0; c < 2; c++) for (let s = 0; s < P.M; s++) {
      let sum = 0, cnt = 0;
      for (let q = -9; q <= 9; q++) { const t = s + q; if (t >= 0 && t < P.M) { sum += raw[t * 2 + c]; cnt++; } }
      const rough = 0.85 + (noise(s * 0.03 + 3, c * 37 + 5, 2) - 0.5) * 0.7;
      amp[s * 2 + c] = (sum / cnt) * rough / peak(s, c);
    }
    // 단면: 핵 한가운데를 지나 양옆의 구하도와 그 너머의 지금 강까지 비스듬히 자른다.
    const dirX = Math.cos(0.87), dirY = Math.sin(0.87), C = shape.center, at = r => ({ x: C.x + dirX * r, y: C.y + dirY * r });
    let ringA = -shape.R, ringB = shape.R, river = shape.R + 45, rs = cut.sb + 20;
    const minDist = (r, a, b) => { const p = at(r); let best = Infinity, bs = a; for (let s = a; s <= b; s++) { const d = Math.hypot(shape.path[s].x - p.x, shape.path[s].y - p.y); if (d < best) { best = d; bs = s; } } return [best, bs]; };
    { let v = Infinity; for (let r = -shape.R - 15; r < -shape.R + 15; r += 0.5) { const [d] = minDist(r, sa, sb); if (d < v) { v = d; ringA = r; } } }
    { let v = Infinity; for (let r = shape.R - 15; r < shape.R + 15; r += 0.5) { const [d] = minDist(r, sa, sb); if (d < v) { v = d; ringB = r; } } }
    for (let r = ringB + 18; r < ringB + 110; r += 0.5) { const [d, s] = minDist(r, sb, P.M - 1); if (d < 1) { river = r; rs = s; break; } }
    const A = at(-shape.R - 26), B = at(river + 38), len = Math.hypot(B.x - A.x, B.y - A.y), rA = -shape.R - 26;
    const frac = r => (r - rA) / len;
    const section = { s: rs, sP: rs, sQ: cut.tb + (rs - sb), ax: A.x, ay: A.y, bx: B.x, by: B.y, riverAt: frac(river), marks: { ringA: frac(ringA), core: frac(0), ringB: frac(ringB), river: frac(river) } };
    omega = { shape, cut, P, Q, zp, zq, gap, amp, bump, section, sa, sb };
    return omega;
  }

  function startCoreRun() {
    const { P, Q, zp, zq, section } = buildOmega();
    run = {
      offP: new Float32Array(P.M), reachP: new Float32Array(P.M * 2), offQ: new Float32Array(Q.M), offStart: new Float32Array(Q.M), reachQ: new Float32Array(Q.M * 2),
      wideP: new Float32Array(P.M).fill(1), wideQ: new Float32Array(Q.M), bedP: zp.slice(), bedQ: zq.slice(), severed: false,
    };
    useGeometry(P, zp, run.offP, run.reachP);
    sectionAt = section; section.s = section.sP;
    bed = run.bedP;
    run.streams = [
      { path: P.path, bed: run.bedP, off: run.offP, wide: run.wideP, dots: 110, rate: 0.03 },
      { path: Q.path, bed: run.bedQ, off: run.offQ, wide: run.wideQ, dots: 80, rate: 0.03 * (P.M / Q.M) },
    ];
  }

  // 고리 물길을 따라 옮겨 다니되, 목 양쪽 구간은 점점 목 쪽으로 파고든다. 옮겨 간 곳까지만 reach가 늘어난다.
  function swingNeck(u, swings) {
    const { amp, bump } = omega, size = swingSize(u), grow = smooth(0.06, 1, u) * (1 + 0.06 * Math.sin(u * 6 * Math.PI));
    for (let s = 1; s < M - 1; s++) {
      const v = Math.sin(2 * Math.PI * (s / SWING_LENGTH - swings * u));
      const a0 = amp[s * 2], a1 = amp[s * 2 + 1], o = size * v * (a0 + (a1 - a0) * (1 + v) / 2) + bump[s] * Math.min(1, grow);
      off[s] = o;
      const c = s * 2 + (o > 0 ? 1 : 0), edge = Math.abs(o) + CHANNEL;
      if (edge > reach[c]) reach[c] = edge;
    }
  }

  // 다시 파고든 뒤: 지금 강이 좌우로 옮겨 다니며 바닥을 조금 넓힌다. 물이 닿은 곳까지만 넓어진다.
  function swingFinal(u, swings) {
    const peak = omega.finalPeak ??= swingPeaks(swings), size = swingSize(u);
    for (let t = 1; t < M - 1; t++) {
      const v = Math.sin(2 * Math.PI * (t / SWING_LENGTH - swings * u));
      const a0 = FINAL_REACH[0] / peak(t, 0), a1 = FINAL_REACH[1] / peak(t, 1), o = size * v * (a0 + (a1 - a0) * (1 + v) / 2);
      off[t] = o;
      const c = t * 2 + (o > 0 ? 1 : 0), edge = Math.abs(o) + CHANNEL;
      if (edge > reach[c]) reach[c] = edge;
    }
  }

  // 목이 잘리는 순간: 지금 강의 기하를 지름길 물길로 바꾼다. 옛 고리의 물은 잠시 그대로 남는다.
  function sever() {
    const { Q, zq, cut } = omega, { sa, sb, ta, tb } = cut;
    const { offP, reachP, offQ, offStart, reachQ, wideP, wideQ, bedQ } = run;
    run.severed = true;
    for (let t = 0; t < Q.M; t++) {
      bedQ[t] = zq[t] + seaLevel;
      const s = t <= ta ? t : t >= tb ? sb + (t - tb) : -1;
      for (const c of [0, 1]) reachQ[t * 2 + c] = s >= 0 ? reachP[s * 2 + c] : CHANNEL + 1;
      if (s >= 0) offStart[t] = offP[s];
      else offStart[t] = offP[sa] * Math.exp(-(t - ta) / 6) + offP[sb] * Math.exp(-(tb - t) / 6);
      wideQ[t] = t > ta && t < tb ? 0 : 1;
    }
    // 지금 강과 겹치는 앞뒤 구간의 옛 물띠는 새 물띠가 이어받는다.
    for (let s = 0; s < wideP.length; s++) if (s <= sa || s >= sb) wideP[s] = 0;
    offQ.set(offStart);
    useGeometry(Q, zq, offQ, reachQ);
    bed = bedQ;
    sectionAt.s = sectionAt.sQ;
  }

  // 잘린 뒤 tau초: 옛 고리는 위쪽부터 말라 가고, 새 물길은 터진 곳을 넓힌 뒤 제자리로 온다.
  function afterCut(tau) {
    const { cut } = omega, { sa, sb, ta, tb } = cut, { offQ, offStart, reachQ, wideP, wideQ } = run;
    const total = CUTOFF_SECONDS + DRAIN_SECONDS;
    const rest = tau >= total - 1e-9 ? 0 : 1 - smooth(CUTOFF_SECONDS, total, tau), push = tau >= total - 1e-9 ? 0 : Math.sin(Math.PI * Math.min(1, tau / total)) ** 2;
    const mid = (ta + tb) >> 1, open = Math.min(1, tau / 0.8);
    for (let t = 1; t < M - 1; t++) {
      const o = offStart[t] * rest - BREACH_SWING * push * Math.exp(-0.5 * ((t - mid) / BREACH_SPREAD) ** 2);
      offQ[t] = o;
      const c = t * 2 + (o > 0 ? 1 : 0), edge = Math.abs(o) + CHANNEL;
      if (edge > reachQ[c]) reachQ[c] = edge;
      if (t > ta && t < tb) wideQ[t] = open;
    }
    if (tau >= total - 1e-9) { offQ.fill(0); wideQ.fill(1); }
    const front = clamp((tau - CUTOFF_SECONDS) / 2) * 1.25;
    for (let s = sa + 1; s < sb; s++) wideP[s] = clamp(((s - sa) / (sb - sa) - front + 0.25) / 0.25);
  }

  // 옛 고리의 바닥: 물이 있는 곳에는 물길 홈이 있고, 물이 빠진 곳은 자갈이 덮인 평평한 바닥이 된다.
  function paintOldLoop() {
    const { P } = omega, { offP, reachP, wideP, bedP } = run, S = P.near, D = P.dist, C = P.side;
    for (let k = 0; k < N * N; k++) {
      if (age[k] !== 1) continue;
      const s = S[k], d = D[k], c = C[k];
      if (d > reachP[s * 2 + c] || dist[k] <= reach[near[k] * 2 + side[k]]) continue;
      const q = Math.abs((c ? d : -d) - offP[s]) / CHANNEL, wet = q < wideP[s];
      const floor = bedP[s] + FLOOR_UP;
      h[k] = wet ? bedP[s] + FLOOR_UP * q * q : floor;
      if (wet) mask[k] = 2;
    }
  }

  // 정지기마다 강둑의 어느 곳까지 물이 갈지 정한다. 굽이 바깥이 더 멀리 가고, 곳곳이 들쭉날쭉해 조각이 남는다.
  function buildWidths() {
    widths = []; amps = [];
    const n = count();
    const oldest = WIDEN_WIDTH[n - 1] * 1.3;
    for (let e = 0; e < n; e++) {
      const left = n - 1 - e, w = new Float32Array(M * 2);
      const target = WIDEN_WIDTH[left];
      for (let s = 0; s < M; s++) for (let c = 0; c < 2; c++) {
        const inner = clamp(curve[s] * 45, -1, 1) * (c === 1 ? 1 : -1);
        const rough = clamp(0.8 + (noise(s * 0.03 + 50 * e + 3, c * 37 + e * 11 + 5, 2) - 0.5) * 3.2, 0.15, 1.3);
        // 옆 굽이가 가까우면 계단 전체를 같은 비율로 줄여 산줄기(곡류 안쪽 언덕)를 남긴다.
        // 안쪽 굽이는 곡률 반지름 안에서만 옮겨 갈 수 있으므로 같은 방법으로 줄인다.
        const bend = inner > 0 ? (INNER_LIMIT / Math.max(1e-3, Math.abs(curve[s]))) / oldest : 1;
        const fit = Math.min(1, (room[s * 2 + c] * 0.8 - CHANNEL - 1) / oldest, bend);
        w[s * 2 + c] = CHANNEL + 1 + target * rough * (1 - BEND_EFFECT * inner) * fit;
      }
      // 강을 따라 부드럽게 이어지게 한다.
      const out = new Float32Array(M * 2);
      for (let c = 0; c < 2; c++) for (let s = 0; s < M; s++) {
        let sum = 0, cnt = 0;
        for (let q = -7; q <= 7; q++) { const t = s + q; if (t >= 0 && t < M) { sum += w[t * 2 + c]; cnt++; } }
        out[s * 2 + c] = Math.max(CHANNEL + 1, sum / cnt);
      }
      widths.push(out);
      // 물 가장자리가 위 너비에 닿도록 쪽별 진폭을 정한다.
      const peak = swingPeaks(swingsIn(WIDEN_SECONDS[left])), amp = new Float32Array(M * 2);
      for (let s = 0; s < M; s++) for (let c = 0; c < 2; c++) amp[s * 2 + c] = (out[s * 2 + c] - CHANNEL) / peak(s, c);
      amps.push(amp);
    }
  }

  // 단면을 자를 곳: 옆 굽이가 멀고, 양쪽 강둑에 남을 단구가 가장 넓은 곳.
  function chooseSection() {
    const n = count();
    const scoreAt = s => {
      let sc = Math.min(room[s * 2], room[s * 2 + 1]) * 0.05;
      for (let e = 0; e + 1 < n; e++) {
        const setback = lowering() / WALL;
        const l = widths[e][s * 2] - widths[e + 1][s * 2] - setback, r = widths[e][s * 2 + 1] - widths[e + 1][s * 2 + 1] - setback;
        sc += Math.min(Math.max(l, 0), 8) + Math.min(Math.max(r, 0), 8) + (l > 2 && r > 2 ? 6 : 0);
      }
      return sc;
    };
    let best = M >> 1, bestS = -Infinity;
    for (let s = Math.floor(M * 0.2); s < M * 0.8; s += 2) {
      if (Math.min(room[s * 2], room[s * 2 + 1]) < 30) continue;
      const p = path[s], len = 54;
      const px = -Math.sin(p.th), py = Math.cos(p.th);
      const ok = [-len, len].every(o => { const x = p.x + px * o, y = p.y + py * o; return x > 4 && y > 4 && x < N - 5 && y < N - 5; });
      if (!ok) continue;
      const v = scoreAt(s);
      if (v > bestS) { bestS = v; best = s; }
    }
    // 옆 굽이의 골짜기까지 넘어가지 않도록 강둑마다 길이를 줄인다.
    const p = path[best], px = -Math.sin(p.th), py = Math.cos(p.th);
    const lenA = Math.min(54, room[best * 2] - 2), lenB = Math.min(54, room[best * 2 + 1] - 2);
    sectionAt = { s: best, ax: p.x - px * lenA, ay: p.y - py * lenA, bx: p.x + px * lenB, by: p.y + py * lenB, riverAt: lenA / (lenA + lenB) };
  }

  function reset() {
    if (isCore()) startCoreRun();
    else { run = null; useGeometry(riverGeo, riverZ0, riverOff, riverReach); }
    h = new Float32Array(N * N); rock = new Float32Array(N * N); age = new Int8Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = idx(i, j);
      h[k] = 4 - (clamp(i, 0, N) / N) * 4 + FLOOR_UP + 0.7 + (noise(i * 0.05, j * 0.05, 3) - 0.5) * 1.4;
      rock[k] = h[k] - GRAVEL - 0.4;
      if (dist[k] < CHANNEL + 2) {
        const c = z0[near[k]] + FLOOR_UP * Math.min(1, (dist[k] / CHANNEL) ** 2);
        if (h[k] > c) h[k] = c;
        if (rock[k] > h[k] - 0.2) rock[k] = h[k] - 0.2;
      }
    }
    if (!isCore()) bed = z0.slice();
    clock = 0; stepClock = 0; step = 0; seaLevel = 0; lifted = 0; gridDone = 0; contactId = null;
    off.fill(0); reach.fill(CHANNEL + 1); lastCut.fill(-99);
    for (let k = 0; k < N * N; k++) mask[k] = dist[k] < CHANNEL ? 2 : 0;
    plan = [{ kind: 'free', e: -1, t: FREE_SECONDS }];
    if (isCore()) {
      plan.push({ kind: 'cut', e: 0, t: RISE_SECONDS + CUT_SECONDS });
      plan.push({ kind: 'widen', e: 0, t: NECK_SECONDS, swings: swingsIn(NECK_SECONDS) });
      plan.push({ kind: 'cutoff', e: 0, t: CUTOFF_SECONDS });
      plan.push({ kind: 'drain', e: 0, t: DRAIN_SECONDS });
      plan.push({ kind: 'cut', e: 1, t: RISE_SECONDS + CUT_SECONDS });
      plan.push({ kind: 'widen', e: 1, t: FINAL_SECONDS, swings: swingsIn(FINAL_SECONDS) });
      return;
    }
    buildWidths();
    chooseSection();
    const n = count();
    for (let e = 0; e < n; e++) {
      plan.push({ kind: 'cut', e, t: RISE_SECONDS + CUT_SECONDS });
      const t = WIDEN_SECONDS[n - 1 - e];
      plan.push({ kind: 'widen', e, t, swings: swingsIn(t) });
    }
  }

  // 고정 격자 한 칸만큼 강을 옮기고, 물 가장자리가 닿은 가장 먼 거리를 늘린다.
  function swingTo(e, u, swings) {
    const amp = amps[e], size = swingSize(u);
    // 중심선의 맨 끝 점은 블록 밖에 있고, 그 점이 가장 가까운 칸은 강의 옆이 아니므로 옮기지 않는다.
    for (let s = 1; s < M - 1; s++) {
      const v = Math.sin(2 * Math.PI * (s / SWING_LENGTH - swings * u));
      // 쪽마다 진폭이 달라도 강이 중심선을 지날 때 꺾이지 않도록 두 진폭을 부드럽게 섞는다.
      const a0 = amp[s * 2], a1 = amp[s * 2 + 1], o = size * v * (a0 + (a1 - a0) * (1 + v) / 2);
      off[s] = o;
      const c = s * 2 + (o > 0 ? 1 : 0), edge = Math.abs(o) + CHANNEL;
      if (edge > reach[c]) reach[c] = edge;
    }
  }

  // 한 번에 격자 전체를 깎는다. 정지기(widen)에는 물이 닿았던 곳까지만 바닥이 되고, 물길 홈은 지금 물이 있는 곳에만 있다.
  function carve(e, widen) {
    if (lowering() <= 0) return;
    const surface = e + 1;
    for (let k = 0; k < N * N; k++) {
      const s = near[k], d = dist[k], bedS = bed[s];
      const floor = bedS + FLOOR_UP;
      const W = widen ? reach[s * 2 + side[k]] : CHANNEL + 1;
      if (d <= W) {
        // 잘린 뒤 새 물길 바닥은 옛 바닥보다 조금 높을 수 있다. 물이 닿으면 그 높이의 바닥으로 맞춘다.
        if (h[k] >= floor || (widen && run?.severed)) {
          if (widen && age[k] !== surface) lastCut[k] = clock;
          h[k] = floor; age[k] = surface;
        }
        if (age[k] === surface && rock[k] > floor - GRAVEL) rock[k] = floor - GRAVEL;
      } else {
        const out = d - W;
        const top = floor + WALL * out + wallRough[k] * Math.min(1, out / 6);
        if (h[k] > top) { h[k] = Math.max(top, floor); age[k] = -1; }
      }
      if (widen) {
        // 물이 떠난 자리에는 자갈이 쌓여 바닥 높이로 돌아온다.
        const q = Math.abs((side[k] ? d : -d) - off[s]) / CHANNEL;
        // 목이 잘린 뒤에는 새 물길이 닿은 곳만 다듬는다. 옛 고리의 바닥은 paintOldLoop가 따로 맡는다.
        if (age[k] === surface && (!run?.severed || d <= W)) h[k] = q < 1 ? bedS + FLOOR_UP * q * q : floor;
        mask[k] = q < 1 ? 2 : 0;
      } else if (d < CHANNEL) {
        const c = bedS + FLOOR_UP * (d / CHANNEL) ** 2;
        if (h[k] > c) { h[k] = c; age[k] = surface; }
      }
      if (rock[k] > h[k]) rock[k] = h[k];
    }
  }

  // 지금 물이 벽에 닿아 깎고 있는 대표 지점. 파동의 마루 하나를 따라가므로 같은 굽이를 타고 하류로 움직인다.
  function contact() {
    const p = plan[step];
    if (!p || p.kind !== 'widen' || lowering() <= 0) return null;
    const u = gridDone / Math.round(p.t * GRID);
    if (run?.severed) return null;
    if (run) {
      // 미앤더 핵 조건에서는 목을 때리는 두 곳이 대표 지점이다. 번갈아 보여 준다.
      const s = Math.floor(u * 6) % 2 ? omega.shape.neckTo : omega.shape.neckFrom, o = off[s], a = path[s];
      if (o < 2) return null;
      const r = o + CHANNEL - 0.5;
      return { x: a.x - Math.sin(a.th) * r, y: a.y + Math.cos(a.th) * r, s, side: 1 };
    }
    let best = null;
    for (const c of [0, 1]) {
      const q = c ? 0.25 : 0.75, base = p.swings * u + q;
      for (let n = Math.ceil(-base); ; n++) {
        const s = Math.round(SWING_LENGTH * (base + n));
        if (s >= M) break;
        if (s < 0) continue;
        const o = off[s], a = path[s];
        if ((o > 0 ? 1 : 0) !== c || Math.abs(o) < 2 || reach[s * 2 + c] - (Math.abs(o) + CHANNEL) >= 1.2) continue;
        const r = o + (c ? CHANNEL - 0.5 : 0.5 - CHANNEL), x = a.x - Math.sin(a.th) * r, y = a.y + Math.cos(a.th) * r;
        if (x < 12 || y < 12 || x > N - 13 || y > N - 13) continue;
        const id = c * 1000 + n, keep = id === contactId;
        if (!best || keep || (!best.keep && Math.abs(o) > Math.abs(off[best.s]))) best = { x, y, s, side: c, id, keep };
      }
    }
    if (!best) return null;
    contactId = best.id;
    return { x: best.x, y: best.y, s: best.s, side: best.side };
  }

  function advanceStep(p, dt) {
    if (p.kind === 'cut') {
      const after = stepClock + dt;
      const riseFrac = (Math.min(after, RISE_SECONDS) - Math.min(stepClock, RISE_SECONDS)) / RISE_SECONDS;
      const up = OPTIONS.uplift[options.uplift] * riseFrac, down = OPTIONS.sea[options.sea] * riseFrac;
      if (up > 0) {
        for (let k = 0; k < N * N; k++) { h[k] += up; rock[k] += up; }
        for (let s = 0; s < M; s++) bed[s] += up;
        if (run?.severed) for (let s = 0; s < run.bedP.length; s++) run.bedP[s] += up;
        lifted += up;
      }
      seaLevel -= down;
      const speed = (lowering() * 1.05 + 1) / Math.max(0.5, RISE_SECONDS + CUT_SECONDS - WAVE_SECONDS - 0.2);
      for (let s = 0; s < M; s++) {
        const delay = WAVE_SECONDS * (1 - s / (M - 1));
        if (after > delay) bed[s] = Math.max(z0[s] + seaLevel, bed[s] - speed * dt);
      }
      if (after >= p.t - 1e-6) for (let s = 0; s < M; s++) bed[s] = z0[s] + seaLevel;
      carve(p.e, false);
    } else if (p.kind === 'widen') {
      if (stepClock === 0) { reach.fill(CHANNEL + 1); gridDone = 0; contactId = null; }
      if (lowering() <= 0) return;
      const total = Math.round(p.t * GRID), after = stepClock + dt;
      const target = after >= p.t - 1e-9 ? total : Math.min(total, Math.floor(after * GRID + 1e-9));
      if (target <= gridDone) return;
      while (gridDone < target) { gridDone++; if (run?.severed) swingFinal(gridDone / total, p.swings); else if (run) swingNeck(gridDone / total, p.swings); else swingTo(p.e, gridDone / total, p.swings); }
      carve(p.e, true);
    } else if (p.kind === 'cutoff' || p.kind === 'drain') {
      if (stepClock === 0) { gridDone = 0; if (!run.severed) { sever(); carve(0, true); paintOldLoop(); } }
      const total = Math.round(p.t * GRID), after = stepClock + dt, base = p.kind === 'drain' ? CUTOFF_SECONDS : 0;
      const target = after >= p.t - 1e-9 ? total : Math.min(total, Math.floor(after * GRID + 1e-9));
      if (target <= gridDone) return;
      while (gridDone < target) afterCut(base + (++gridDone / total) * p.t);
      carve(0, true);
      paintOldLoop();
    }
  }

  function tick(dt) {
    let remain = dt;
    while (remain > 1e-9 && step < plan.length) {
      const p = plan[step], use = Math.min(remain, p.t - stepClock);
      advanceStep(p, use);
      stepClock += use; clock += use; remain -= use;
      if (stepClock >= p.t - 1e-9) { step++; stepClock = 0; }
    }
  }

  const sample = (x, y) => {
    x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
  };
  const sampleRock = (x, y) => {
    x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
    return rock[k] * (1 - u) * (1 - v) + rock[k + 1] * u * (1 - v) + rock[k + N] * (1 - u) * v + rock[k + N + 1] * u * v;
  };

  // 이름표 자리: 계산 결과에서 실제로 남은 면을 찾아 그 위에 놓는다.
  function spots() {
    const flat = k => {
      const i = k % N, j = (k / N) | 0;
      if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) return false;
      return Math.hypot(h[k + 1] - h[k - 1], h[k + N] - h[k - N]) / 2 < 0.45;
    };
    const seen = new Uint8Array(N * N), groups = [];
    for (let k = 0; k < N * N; k++) {
      if (seen[k] || age[k] < 0 || !flat(k) || dist[k] < CHANNEL) continue;
      const a = age[k], stack = [k], cells = [];
      seen[k] = 1;
      while (stack.length) {
        const c = stack.pop();
        cells.push(c);
        for (const o of [1, -1, N, -N]) {
          const q = c + o;
          if (q < 0 || q >= N * N || seen[q] || age[q] !== a || dist[q] < CHANNEL || !flat(q)) continue;
          seen[q] = 1; stack.push(q);
        }
      }
      if (cells.length >= 14) groups.push({ age: a, cells });
    }
    const centerOf = g => {
      // 앞쪽(화면 아래)에 가까운 면 안에서, 강에서 가장 먼 칸을 고르면 면 한가운데에 가깝다.
      let sx = 0, sy = 0;
      for (const c of g.cells) { sx += c % N; sy += (c / N) | 0; }
      sx /= g.cells.length; sy /= g.cells.length;
      let best = g.cells[0], bd = Infinity;
      for (const c of g.cells) { const d = Math.hypot((c % N) - sx, ((c / N) | 0) - sy); if (d < bd) { bd = d; best = c; } }
      return { x: best % N, y: (best / N) | 0, size: g.cells.length };
    };
    const done = risenDone();
    const pick = a => {
      const list = groups.filter(g => g.age === a).map(centerOf).filter(p => p.x > 16 && p.x < N - 16 && p.y > 16 && p.y < N - 16);
      list.sort((p, q) => (q.size + q.y * 1.5) - (p.size + p.y * 1.5));
      return list[0] || null;
    };
    const out = { treads: [] };
    out.old = pick(0);
    for (let e = 1; e < done; e++) { const t = pick(e); if (t) out.treads.push({ age: e, ...t }); }
    out.floor = done > 0 ? pick(done) : null;
    // 단구애: 가장 넓은 단구면 또는 지금 바닥에서 강 반대쪽으로 걸어 나가 처음 만나는 벽.
    const from = out.treads[out.treads.length - 1] || out.floor;
    if (from) {
      const p = path[near[idx(from.x, from.y)]];
      const dx = from.x - p.x, dy = from.y - p.y, l = Math.hypot(dx, dy) || 1;
      for (let r = 1; r < 40; r++) {
        const x = Math.round(from.x + (dx / l) * r), y = Math.round(from.y + (dy / l) * r);
        if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1) break;
        if (age[idx(x, y)] === -1) { out.scarp = { x, y }; break; }
      }
    }
    // 강: 블록 가운데에 가장 가까운 굽이 꼭대기.
    let bs = M >> 1, bv = -1;
    for (let s = 20; s < M - 20; s += 2) {
      const p = path[s];
      if (p.x < 30 || p.x > N - 30 || p.y < 30 || p.y > N - 30) continue;
      const v = Math.abs(curve[s]) * 200 - Math.hypot(p.x - 128, p.y - 150) * 0.05;
      if (v > bv) { bv = v; bs = s; }
    }
    out.river = { x: path[bs].x, y: path[bs].y };
    if (run) coreSpots(out, groups, centerOf);
    return out;
  }
  // 미앤더 핵 조건의 이름표 자리. 모두 계산에 쓰는 기하에서 읽는다.
  function coreSpots(out, groups, centerOf) {
    const { shape, cut } = omega, C = shape.center;
    out.treads = []; out.floor = null; delete out.scarp;
    const far = groups.filter(g => g.age === 0).map(centerOf).filter(p => Math.hypot(p.x - C.x, p.y - C.y) > shape.R + 8 && p.x > 16 && p.x < N - 16 && p.y > 16 && p.y < N - 16);
    far.sort((p, q) => q.size - p.size);
    out.old = far[0] || null;
    out.neck = { x: shape.neck.x, y: shape.neck.y };
    out.core = { x: C.x, y: C.y };
    const apex = shape.path[(shape.neckFrom + shape.neckTo) >> 1];
    out.oldChannel = { x: apex.x, y: apex.y };
    const mid = omega.Q.path[(cut.ta + cut.tb) >> 1];
    out.shortcut = { x: mid.x, y: mid.y };
    // 강 이름표는 굽이가 잘 보이는 곳에: 자르기 전에는 고리, 자른 뒤에는 위쪽 물길.
    if (run.severed) { const up = path.find(p => p.x >= 48); out.river = { x: up.x, y: up.y }; }
    else { const side0 = shape.path[Math.round(shape.neckFrom + (shape.neckTo - shape.neckFrom) * 0.25)]; out.river = { x: side0.x, y: side0.y }; }
  }
  const risenDone = () => { let c = 0; for (let t = 0; t < Math.min(step + 1, plan.length); t++) if (plan[t].kind === 'cut') c++; return c; };

  reset();
  return {
    tick, reset, sample, sampleRock, spots, contact,
    applyPreset(name) { Object.assign(options, PRESETS[name].options); reset(); },
    setOption(name, value) { options[name] = value; },
    get options() { return options; },
    get h() { return h; }, get rock() { return rock; }, get age() { return age; },
    get mask() { return mask; }, get path() { return path; }, get bed() { return bed; }, get z0() { return z0; },
    get offset() { return off; }, get reach() { return reach; }, get lastCut() { return lastCut; },
    get near() { return near; }, get dist() { return dist; }, get side() { return side; },
    get clock() { return clock; }, get seaLevel() { return seaLevel; }, get lifted() { return lifted; }, get section() { return sectionAt; },
    get phase() { return step >= plan.length ? 'done' : plan[step].kind; },
    get risen() { return risenDone(); },
    get count() { return count(); },
    get finished() { return step >= plan.length; },
    get totalSeconds() { return plan.reduce((a, p) => a + p.t, 0); },
    // 미앤더 핵 조건에서만 값이 있다.
    get severed() { return run ? run.severed : false; },
    get streams() { return run ? run.streams : null; },
    get core() {
      if (!run) return null;
      const { shape, cut, Q, gap } = omega;
      return { center: shape.center, neck: shape.neck, neckFrom: shape.neckFrom, neckTo: shape.neckTo, gap, oldPath: shape.path, loopFrom: cut.sa, loopTo: cut.sb, shortcut: Q.path.slice(cut.ta, cut.tb + 1), shortcutMid: (cut.ta + cut.tb) >> 1, R: shape.R };
    },
  };
}

// 단면 값: A에서 B까지 땅 높이와 기반암 높이를 그대로 읽는다. 화면과 검사가 같은 값을 본다.
export function sectionProfile(m, samples = 240) {
  const S = m.section, top = new Float32Array(samples), rock = new Float32Array(samples), age = new Int8Array(samples);
  for (let t = 0; t < samples; t++) {
    const f = t / (samples - 1), x = S.ax + (S.bx - S.ax) * f, y = S.ay + (S.by - S.ay) * f;
    top[t] = m.sample(x, y); rock[t] = m.sampleRock(x, y);
    age[t] = m.age[Math.round(y) * N + Math.round(x)];
  }
  return { top, rock, age };
}
