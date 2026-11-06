// © 2026 김용현
// 감입 곡류와 하안 단구 형성 모형의 계산. 화면과 분리되어 있어 node에서도 실행할 수 있다.
// 넓은 범람원을 자유 곡류하는 강에서 시작한다. 땅이 솟으면 강은 같은 굽이를 지키며 아래로 파고들고,
// 멈춘 동안에는 옆으로 깎아 바닥을 넓힌다. 다음 솟음 때 그 바닥의 남은 조각이 단구면이 된다.
// 강의 중심선은 경사를 따라가며 찾지 않고 처음부터 수식으로 정한다. 그래서 수치가 조금 달라도 갈라지지 않는다.
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
const WIDEN_RATE = 3.3; // 초당 넓어지는 칸 수(평균)
const WIDEN_SECONDS = [2, 6, 10]; // 남은 솟음이 0, 1, 2번일 때의 정지기 길이

export const OPTIONS = {
  uplift: { none: 0, low: 7, mid: 10, high: 14 },
  times: { 1: 1, 2: 2, 3: 3 },
  sea: { same: 0, low: 9 },
};

export const PRESETS = {
  textbook: { name: '교과서 하안 단구', options: { uplift: 'mid', times: '3', sea: 'same' } },
  once: { name: '솟음 한 번', options: { uplift: 'mid', times: '1', sea: 'same' } },
  sea: { name: '해수면 낮아짐', options: { uplift: 'none', times: '2', sea: 'low' } },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const idx = (i, j) => j * N + i;

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

// 칸마다 가장 가까운 중심선 점, 거리, 어느 쪽 강둑인지 미리 재 둔다.
function buildGeometry(seed) {
  const path = buildPath(seed), M = path.length;
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
  const { path, M, near, dist, side, curve, room } = buildGeometry(seed);
  const noise = valueNoise(seed + 40);
  const options = { uplift: 'mid', times: '3', sea: 'same' };
  const z0 = new Float32Array(M);
  {
    let far = -16;
    for (let s = 0; s < M; s++) { far = Math.max(far, path[s].x); z0[s] = 4 - (far / N) * 4; }
  }
  const mask = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) if (dist[k] < CHANNEL) mask[k] = 2;
  const wallRough = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) wallRough[idx(i, j)] = (noise(i * 0.09, j * 0.09, 3) - 0.5) * 6;

  let h, rock, age, bed, plan, clock, step, stepClock, seaLevel, widths, sectionAt, lifted;

  const lowering = () => OPTIONS.uplift[options.uplift] + OPTIONS.sea[options.sea];
  const count = () => OPTIONS.times[options.times];

  // 정지기마다 강둑의 어느 곳이 얼마나 넓어질지 정한다. 굽이 안쪽이 더 넓고, 곳곳이 들쭉날쭉해 조각이 남는다.
  function buildWidths() {
    widths = [];
    const n = count();
    const oldest = WIDEN_SECONDS[n - 1] * WIDEN_RATE * 1.3;
    for (let e = 0; e < n; e++) {
      const left = n - 1 - e, w = new Float32Array(M * 2);
      const target = WIDEN_SECONDS[left] * WIDEN_RATE;
      for (let s = 0; s < M; s++) for (let c = 0; c < 2; c++) {
        const inner = clamp(curve[s] * 45, -1, 1) * (c === 1 ? 1 : -1);
        const rough = clamp(0.8 + (noise(s * 0.03 + 50 * e + 3, c * 37 + e * 11 + 5, 2) - 0.5) * 3.2, 0.15, 1.3);
        // 옆 굽이가 가까우면 계단 전체를 같은 비율로 줄여 산줄기(곡류 안쪽 언덕)를 남긴다.
        const fit = Math.min(1, (room[s * 2 + c] * 0.8 - CHANNEL - 1) / oldest);
        w[s * 2 + c] = CHANNEL + 1 + target * rough * (1 + 0.25 * inner) * fit;
      }
      // 강을 따라 부드럽게 이어지게 한다.
      const out = new Float32Array(M * 2);
      for (let c = 0; c < 2; c++) for (let s = 0; s < M; s++) {
        let sum = 0, cnt = 0;
        for (let q = -7; q <= 7; q++) { const t = s + q; if (t >= 0 && t < M) { sum += w[t * 2 + c]; cnt++; } }
        out[s * 2 + c] = Math.max(CHANNEL + 1, sum / cnt);
      }
      widths.push(out);
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
    bed = z0.slice();
    clock = 0; stepClock = 0; step = 0; seaLevel = 0; lifted = 0;
    buildWidths();
    chooseSection();
    plan = [{ kind: 'free', e: -1, t: FREE_SECONDS }];
    const n = count();
    for (let e = 0; e < n; e++) {
      plan.push({ kind: 'cut', e, t: RISE_SECONDS + CUT_SECONDS });
      plan.push({ kind: 'widen', e, t: WIDEN_SECONDS[n - 1 - e] });
    }
  }

  // 한 번에 격자 전체를 깎는다.
  function carve(e, widen, progress) {
    if (lowering() <= 0) return;
    const w = widen ? widths[e] : null;
    const surface = e + 1;
    for (let k = 0; k < N * N; k++) {
      const s = near[k], d = dist[k], bedS = bed[s];
      const floor = bedS + FLOOR_UP;
      const W = widen ? CHANNEL + 1 + (w[s * 2 + side[k]] - CHANNEL - 1) * progress : CHANNEL + 1;
      if (d <= W) {
        if (h[k] > floor) { h[k] = floor; age[k] = surface; }
        if (age[k] === surface && rock[k] > floor - GRAVEL) rock[k] = floor - GRAVEL;
      } else {
        const out = d - W;
        const top = floor + WALL * out + wallRough[k] * Math.min(1, out / 6);
        if (h[k] > top) { h[k] = Math.max(top, floor); age[k] = -1; }
      }
      if (d < CHANNEL) {
        const c = bedS + FLOOR_UP * (d / CHANNEL) ** 2;
        if (h[k] > c) { h[k] = c; age[k] = surface; }
      }
      if (rock[k] > h[k]) rock[k] = h[k];
    }
  }

  function advanceStep(p, dt) {
    if (p.kind === 'cut') {
      const after = stepClock + dt;
      const riseFrac = (Math.min(after, RISE_SECONDS) - Math.min(stepClock, RISE_SECONDS)) / RISE_SECONDS;
      const up = OPTIONS.uplift[options.uplift] * riseFrac, down = OPTIONS.sea[options.sea] * riseFrac;
      if (up > 0) { for (let k = 0; k < N * N; k++) { h[k] += up; rock[k] += up; } for (let s = 0; s < M; s++) bed[s] += up; lifted += up; }
      seaLevel -= down;
      const speed = (lowering() * 1.05 + 1) / Math.max(0.5, RISE_SECONDS + CUT_SECONDS - WAVE_SECONDS - 0.2);
      for (let s = 0; s < M; s++) {
        const delay = WAVE_SECONDS * (1 - s / (M - 1));
        if (after > delay) bed[s] = Math.max(z0[s] + seaLevel, bed[s] - speed * dt);
      }
      if (after >= p.t - 1e-6) for (let s = 0; s < M; s++) bed[s] = z0[s] + seaLevel;
      carve(p.e, false, 0);
    } else if (p.kind === 'widen') {
      carve(p.e, true, clamp((stepClock + dt) / p.t));
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
    return out;
  }
  const risenDone = () => { let c = 0; for (let t = 0; t < Math.min(step + 1, plan.length); t++) if (plan[t].kind === 'cut') c++; return c; };

  reset();
  return {
    tick, reset, sample, sampleRock, spots,
    applyPreset(name) { Object.assign(options, PRESETS[name].options); reset(); },
    setOption(name, value) { options[name] = value; },
    get options() { return options; },
    get h() { return h; }, get rock() { return rock; }, get age() { return age; },
    get mask() { return mask; }, get path() { return path; }, get bed() { return bed; }, get z0() { return z0; },
    get near() { return near; }, get dist() { return dist; }, get side() { return side; },
    get clock() { return clock; }, get seaLevel() { return seaLevel; }, get lifted() { return lifted; }, get section() { return sectionAt; },
    get phase() { return step >= plan.length ? 'done' : plan[step].kind; },
    get risen() { return risenDone(); },
    get count() { return count(); },
    get finished() { return step >= plan.length; },
    get totalSeconds() { return plan.reduce((a, p) => a + p.t, 0); },
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
