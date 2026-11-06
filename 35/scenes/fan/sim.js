// © 2026 김용현
// 선상지 시안의 지형 계산.
// 1) 산지와 평지를 만들고 빗방울 침식으로 산의 주름을 새긴다.
// 2) 곡구에서 나온 물길(워커)이 퇴적물을 쌓고, 쌓인 곳을 피해 물길을 옮기며 부채꼴을 만든다.
// 3) 칸마다 입자 크기와 마지막으로 퇴적된 시점을 기억해 표면 재질을 정한다.
import { rng32 } from '../../shared/rng.js';

export const N = 512;
export const SITES = {
  gurye: { size: 9000, waterLevel: -100 },
  synthetic: { size: 6000, waterLevel: 22 },
};
let SITE = 'synthetic', SIZE = SITES.synthetic.size, CELL = SIZE / (N - 1), WATER_LEVEL = SITES.synthetic.waterLevel;
function useSite(name) {
  SITE = name;
  SIZE = SITES[name].size;
  CELL = SIZE / (N - 1);
  WATER_LEVEL = SITES[name].waterLevel;
}

const idx = (i, j) => j * N + i;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function makeNoise(seed) {
  const rand = rng32(seed);
  const perm = new Uint16Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); [p[i], p[k]] = [p[k], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = Array.from({ length: 256 }, () => { const a = rand() * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const dot = (ix, iy, dx, dy) => { const g = grad[perm[(perm[ix & 255] + iy) & 255]]; return g[0] * dx + g[1] * dy; };
    const u = fade(xf), v = fade(yf);
    return lerp(lerp(dot(xi, yi, xf, yf), dot(xi + 1, yi, xf - 1, yf), u),
      lerp(dot(xi, yi + 1, xf, yf - 1), dot(xi + 1, yi + 1, xf - 1, yf - 1), u), v) * 1.5;
  };
  const fbm = (x, y, oct = 5) => { let s = 0, a = 0.5, f = 1; for (let o = 0; o < oct; o++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2.03; } return s; };
  const ridged = (x, y, oct = 6) => {
    let s = 0, a = 0.5, f = 1, w = 1;
    for (let o = 0; o < oct; o++) {
      let n = 1 - Math.abs(noise(x * f + o * 13.1, y * f - o * 7.7));
      n *= n; n *= w; w = clamp(n * 1.8);
      s += n * a; a *= 0.5; f *= 2.1;
    }
    return s;
  };
  return { noise, fbm, ridged };
}

export function frontAt(x, nz) { return 0.4 + 0.05 * nz.fbm(x * 3.1, 7.3, 3); }
const riverAt = x => 0.9 + 0.025 * Math.sin(x * 9) + 0.012 * Math.sin(x * 23 + 1);

function plainAt(x, z, nz) {
  const rz = riverAt(x);
  const b = z < rz ? 24 + 60 * (rz - z) : 24 + 30 * (z - rz);
  return b + 1.6 * nz.fbm(x * 18, z * 18, 3);
}

const APEX_X = 0.46;
const FRONT_RISE = 0.09, SHOULDER_HEIGHT = 210, SHOULDER_WIDTH = 650;
// 곡구 좌우로 산줄기가 평지 쪽으로 튀어나와 부채꼴 꼭짓점을 양옆에서 감싼다.
const shoulderAt = (x, d) => { const side = (x - APEX_X) * SIZE / SHOULDER_WIDTH; return smooth(-0.012, 0.03, d) * Math.exp(-side * side); };
// 곡구에서 위로 d만큼 들어간 곳의 골짜기 중심. 조금씩 굽이친다.
const valleyX = d => APEX_X + 0.035 * Math.sin(d * 11) * smooth(0, 0.12, d) + 0.012 * Math.sin(d * 31) * smooth(0, 0.06, d);

function buildBase(nz) {
  const h = new Float32Array(N * N);
  const mountain = new Float32Array(N * N);
  const frontApex = frontAt(APEX_X, nz);
  const apexH = plainAt(APEX_X, frontApex, nz);
  for (let j = 0; j < N; j++) {
    const z = j / (N - 1);
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const d = frontAt(x, nz) - z;
      const wx = 0.35 * nz.fbm(x * 3 + 5.2, z * 3 + 1.3, 3), wz = 0.35 * nz.fbm(x * 3 - 2.8, z * 3 + 8.1, 3);
      const r = 0.62 * nz.ridged((x + wx) * 4.6, (z + wz) * 4.6, 5) + 0.38 * (0.5 + nz.fbm((x + wx) * 6, (z + wz) * 6, 5));
      const m = smooth(-0.012, FRONT_RISE, d);
      const reach = smooth(0, 0.34, d);
      const spur = nz.ridged(x * 15 + wx * 2, z * 3.6 + wz, 4);
      let v = plainAt(x, z, nz) + m * (40 + 190 * reach + 560 * Math.pow(r, 1.05) * (0.3 + 0.7 * reach) + 300 * smooth(0.0, 0.14, d) * (spur - 0.45));
      // 곡구 양옆의 어깨: 산줄기가 곡구까지 내려온다.
      const shoulder = shoulderAt(x, d);
      v += SHOULDER_HEIGHT * shoulder;
      // 앞쪽의 본류
      const rz = riverAt(x);
      const t = Math.abs(z - rz) / 0.011;
      v = lerp(WATER_LEVEL - 2.5, v, smooth(0.55, 1.5, t));
      h[idx(i, j)] = v;
      mountain[idx(i, j)] = Math.max(smooth(-0.004, 0.016, d), smooth(0.08, 0.3, shoulder));
    }
  }
  return { h, mountain };
}

// 산지에 곡구로 내려오는 골짜기를 판다. 침식이 끝난 뒤에 파서 바닥에 턱이 남지 않는다.
function carveValley(h, nz) {
  const FLOOR_SLOPE = 0.14, CORE = 25, WALL_TAN = 0.7, FUNNEL = 260, SOFT = 18;
  const front = frontAt(APEX_X, nz), apexH = plainAt(APEX_X, front, nz);
  const mask = new Float32Array(N * N), channel = new Float32Array(N * N), center = new Float32Array(N);
  for (let j = 0; j < N; j++) center[j] = valleyX(Math.max(0, front - j / (N - 1))) * (N - 1);
  for (let j = 0; j < N; j++) {
    const z = j / (N - 1);
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1), d = frontAt(x, nz) - z;
      if (d < -0.03 || d > 0.42) continue;
      const dd = Math.max(0, d), q = Math.abs(x - valleyX(dd)) * SIZE, k = idx(i, j);
      const fade = smooth(-0.03, -0.018, d) * smooth(0.42, 0.3, dd);
      const floor = apexH + dd * SIZE * FLOOR_SLOPE;
      // 벽은 일정한 경사의 V자로, 약간 울퉁불퉁하게. 곡구 앞에서는 입구가 나팔처럼 벌어진다.
      const open = Math.max(0, q - CORE - FUNNEL * smooth(0.012, -0.024, d));
      const wall = floor + open * WALL_TAN * (1 + 0.5 * nz.fbm(x * 40 + 3, z * 40 + 7, 3));
      if (h[k] > wall - SOFT) {
        const t = clamp((h[k] - wall + SOFT) / (2 * SOFT));
        h[k] = lerp(h[k], lerp(h[k], wall, t * t * (3 - 2 * t)), fade);
      }
      const inside = smooth(-0.022, -0.006, d) * fade; // 자갈 바닥은 곡구를 지나 부채꼴 꼭짓점까지 이어진다.
      mask[k] = smooth(CORE * 2.4, CORE, q) * inside;
      channel[k] = smooth(CELL * 1.6, CELL * 0.6, q) * inside;
    }
  }
  return { mask, channel, center };
}

function dropletErosion(h, mountain, rand, count) {
  const inertia = 0.06, capF = 5, minCap = 0.012, erode = 0.28, depo = 0.25, evap = 0.012, grav = 4, life = 48;
  const radius = 2;
  const br = [];
  let sum = 0;
  for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
    const d = Math.hypot(x, y); if (d <= radius) { const w = 1 - d / radius; br.push([x, y, w]); sum += w; }
  }
  br.forEach(b => { b[2] /= sum; });
  const SC = 0.001;
  const height = (x, y) => {
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
  };
  for (let n = 0; n < count; n++) {
    let x = 3 + rand() * (N - 6), y = 3 + rand() * (N * 0.5);
    if (mountain[idx(x | 0, y | 0)] < 0.4) continue;
    let dx = 0, dy = 0, sp = 1, w = 1, sed = 0;
    for (let t = 0; t < life; t++) {
      const i = x | 0, j = y | 0;
      if (i < 2 || j < 2 || i >= N - 3 || j >= N - 3 || mountain[idx(i, j)] < 0.05) break;
      const u = x - i, v = y - j, k = idx(i, j);
      const gx = (h[k + 1] - h[k]) * (1 - v) + (h[k + N + 1] - h[k + N]) * v;
      const gy = (h[k + N] - h[k]) * (1 - u) + (h[k + N + 1] - h[k + 1]) * u;
      dx = dx * inertia - gx * SC * (1 - inertia);
      dy = dy * inertia - gy * SC * (1 - inertia);
      const len = Math.hypot(dx, dy);
      if (len < 1e-7) break;
      dx /= len; dy /= len;
      const nx = x + dx, ny = y + dy;
      if (nx < 2 || ny < 2 || nx >= N - 3 || ny >= N - 3) break;
      const hOld = height(x, y) * SC, hNew = height(nx, ny) * SC;
      const dh = hNew - hOld;
      const cap = Math.max(-dh * sp * w * capF, minCap * 0.02);
      if (sed > cap || dh > 0) {
        const dep = dh > 0 ? Math.min(dh, sed) : (sed - cap) * depo;
        sed -= dep;
        const a = dep / SC;
        h[k] += a * (1 - u) * (1 - v); h[k + 1] += a * u * (1 - v); h[k + N] += a * (1 - u) * v; h[k + N + 1] += a * u * v;
      } else {
        const er = Math.min((cap - sed) * erode, -dh);
        for (const b of br) {
          const q = idx(i + b[0], j + b[1]);
          const a = er * b[2] / SC;
          h[q] -= a;
        }
        sed += er;
      }
      sp = Math.sqrt(Math.max(0, sp * sp - dh * grav));
      w *= 1 - evap;
      x = nx; y = ny;
    }
  }
}

// 지나치게 가파른 곳을 무너뜨려 산을 둥글게 만든다.
function slump(h, mountain, tanMax, passes) {
  const maxDrop = tanMax * CELL;
  for (let it = 0; it < passes; it++) {
    for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
      const k = idx(i, j);
      if (mountain[k] < 0.02) continue;
      for (const o of [1, -1, N, -N]) {
        const diff = h[k] - h[k + o];
        if (diff > maxDrop) { const m = (diff - maxDrop) * 0.22; h[k] -= m; h[k + o] += m; }
      }
    }
  }
}

function sampleH(h, x, y) {
  x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
  const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
  return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
}

function growFan(world, events, onSnap) {
  const { h, apex, rand, coarse, total, last, recent, mountain } = world;
  const WALKERS = 460, VOL = 8;
  for (let e = 1; e <= events; e++) {
    const flood = 0.7 + rand() * 0.8;
    // 이번 홍수의 물길: 쌓여서 높아진 쪽을 피해 낮은 쪽을 고른다.
    let bestA = 0, bestH = Infinity;
    for (let c = 0; c < 6; c++) {
      const a = (rand() - 0.5) * 2.5;
      const v = sampleH(h, apex.i + Math.sin(a) * 55, apex.j + Math.cos(a) * 55) + rand() * 2;
      if (v < bestH) { bestH = v; bestA = a; }
    }
    const biasX = Math.sin(bestA), biasY = Math.cos(bestA);
    for (let n = 0; n < WALKERS * flood; n++) {
      let x = apex.i + (rand() - 0.5) * 3, y = apex.j + (rand() - 0.5) * 2;
      let dx = biasX + (rand() - 0.5) * 0.5, dy = biasY + (rand() - 0.5) * 0.5;
      let sed = VOL, dist = 0;
      for (let s = 0; s < 290 && sed > VOL * 0.02; s++) {
        const gx = (sampleH(h, x + 2, y) - sampleH(h, x - 2, y)) / (4 * CELL);
        const gy = (sampleH(h, x, y + 2) - sampleH(h, x, y - 2)) / (4 * CELL);
        const pull = 0.3 * Math.exp(-dist / 60);
        let ndx = dx * 0.62 - gx * 9 + (rand() - 0.5) * 0.42 + biasX * pull;
        let ndy = dy * 0.62 - gy * 9 + (rand() - 0.5) * 0.42 + biasY * pull;
        const l = Math.hypot(ndx, ndy) || 1;
        dx = ndx / l; dy = ndy / l;
        x += dx; y += dy; dist += 1;
        if (x < 3 || y < 3 || x >= N - 4 || y >= N - 4) break;
        if (sampleH(h, x, y) <= WATER_LEVEL) break;
        const slope = -(gx * dx + gy * dy);
        const rate = clamp(0.002 + 0.00016 * dist + (slope < 0.012 ? 0.012 : 0), 0, 0.2);
        const dep = sed * rate;
        sed -= dep;
        const i = x | 0, j = y | 0;
        const c = Math.exp(-dist / 62);
        for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) {
          const w = (p === 0 && q === 0) ? 0.28 : (p === 0 || q === 0 ? 0.12 : 0.06);
          const k = idx(i + p, j + q);
          h[k] += dep * w;
          total[k] += dep * w;
          coarse[k] += dep * w * c;
          if (dep * w > 0.035) last[k] = e;
          recent[k] += dep * w;
        }
      }
    }
    // 너무 가파른 곳은 흘러내려 안정 경사로 맞춘다.
    const maxDrop = 0.034 * CELL;
    const j0 = Math.max(2, apex.j - 8), j1 = Math.min(N - 3, apex.j + 240), i0 = Math.max(2, apex.i - 220), i1 = Math.min(N - 3, apex.i + 220);
    for (let it = 0; it < 4; it++) {
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = idx(i, j);
        if (total[k] < 0.02) continue;
        for (const o of [1, -1, N, -N]) {
          const diff = h[k] - h[k + o];
          if (diff > maxDrop) { const m = (diff - maxDrop) * 0.25; h[k] -= m; h[k + o] += m; }
        }
      }
    }
    for (let k = 0; k < recent.length; k++) recent[k] *= 0.5;
    onSnap?.(e);
  }
}

// 구례의 곡구 안쪽 메우기: 퇴적면이 곡구에서 위로 이어져 산지 사면과 만나게 해 선정이 산지에 바로 붙는다.
// 선정 줄의 가로 단면을 그대로 위로 옮겨 쓰므로 부채꼴 옆면과 이어지고 옆에 벽이 생기지 않는다.
// 쌓는 계산 안에서 메우면 메운 흙이 다시 흘러내려 부채꼴이 끝없이 높아지므로, 단계 사진에만 더한다.
function fillBehindApex(world, snap) {
  const { apex, base } = world;
  const { h, total, coarse, last, e } = snap;
  const SLOPE = 0.05, NEAR = 4, FAR = 16, ROUND_ROWS = 14, FLAT = 40, EDGE = 60;
  const section = width => {
    const m = new Float32Array(N);
    for (let i = width; i < N - width; i++) {
      for (let p = -width; p <= width; p++) m[i] += h[idx(i + p, apex.j)] / (2 * width + 1);
    }
    return m.map(v => Math.max(0, m[apex.i] - v));
  };
  const near = section(NEAR), far = section(FAR);
  let crest = 0;
  for (let p = -2; p <= 2; p++) crest += h[idx(apex.i + p, apex.j)] / 5;
  for (let dj = 1; dj < 90 && apex.j - dj >= 3; dj++) {
    const j = apex.j - dj, top = crest + dj * CELL * SLOPE;
    let ground = 0;
    for (let p = -2; p <= 2; p++) ground += base[idx(apex.i + p, j)] / 5;
    if (ground >= top) break;
    // 위로 갈수록 뾰족한 선정 단면에서 둥근 단면으로 바꿔 등성이처럼 보이지 않게 한다.
    const round = smooth(0, ROUND_ROWS, dj);
    for (let i = Math.max(FAR, apex.i - EDGE); i <= Math.min(N - FAR - 1, apex.i + EDGE); i++) {
      const k = idx(i, j);
      const add = (top - lerp(near[i], far[i], round) - h[k]) * smooth(EDGE, FLAT, Math.abs(i - apex.i));
      if (add <= 0) continue;
      h[k] += add; total[k] += add; coarse[k] += add * 0.9; last[k] = e;
    }
  }
}

// 계산 지형의 곡구 안쪽 메우기: 퇴적면이 골짜기 벽 사이로만 올라가 바닥과 만나면 끝난다.
function fillValley(world, snap) {
  const { apex, base, valley } = world;
  const { h, total, coarse, last, e } = snap;
  const SLOPE = 0.04, SMOOTH = 4, REACH = 20;
  let crest = 0;
  for (let p = -2; p <= 2; p++) crest += h[idx(apex.i + p, apex.j)] / 5;
  // 곡구 바로 뒤에서는 부채꼴의 가로 단면을 따라 가장자리가 낮아지고, 벽 사이로 들어가면 평평해진다.
  const drop = new Float32Array(REACH + 1);
  const across = i => { let m = 0; for (let p = -SMOOTH; p <= SMOOTH; p++) m += h[idx(i + p, apex.j)] / (2 * SMOOTH + 1); return m; };
  for (let n = 0; n <= REACH; n++) drop[n] = Math.max(0, across(apex.i) - (across(apex.i - n) + across(apex.i + n)) / 2);
  for (let dj = 1; dj < 90 && apex.j - dj >= 3; dj++) {
    const j = apex.j - dj, cx = Math.round(valley.center[j]), top = crest + dj * CELL * SLOPE;
    let ground = 0;
    for (let p = -2; p <= 2; p++) ground += base[idx(cx + p, j)] / 5;
    if (ground >= top) break;
    for (const dir of [-1, 1]) for (let n = dir < 0 ? 1 : 0; n <= REACH; n++) {
      const k = idx(cx + dir * n, j);
      const add = (top - drop[n] * smooth(10, 3, dj) - h[k]) * smooth(REACH, REACH - 6, n);
      if (add <= 0) break;
      h[k] += add; total[k] += add; coarse[k] += add * 0.9; last[k] = e;
    }
  }
}

function takeSnap(world, e) {
  const { apex } = world;
  const water = new Float32Array(N * N);
  for (let k = 0; k < water.length; k++) {
    const jj = (k / N) | 0, ii = k - jj * N;
    const dd = Math.hypot(ii - apex.i, jj - apex.j);
    water[k] = smooth(1.3, 2.6, world.recent[k] * (0.18 + dd / 42)) * smooth(2, 10, dd);
  }
  const snap = { e, h: world.h.slice(), coarse: world.coarse.slice(), total: world.total.slice(), last: world.last.slice(), recent: world.recent.slice(), water };
  if (world.valley) {
    fillValley(world, snap);
    for (let k = 0; k < water.length; k++) water[k] = Math.max(water[k], world.valley.channel[k]);
  } else fillBehindApex(world, snap);
  return snap;
}

function traceStream(h, apex, R, rand, opt = {}) {
  const gain = opt.gain ?? 3.5, maxT = opt.maxT ?? Infinity;
  const pts = [];
  let x = apex.i, y = apex.j, dx = opt.startX ?? 0, dy = opt.startY ?? 1, dist = 0;
  for (let s = 0; s < 900; s++) {
    const gx = (sampleH(h, x + 3, y) - sampleH(h, x - 3, y)) / (6 * CELL);
    const gy = (sampleH(h, x, y + 3) - sampleH(h, x, y - 3)) / (6 * CELL);
    let nx = dx * 0.86 - gx * gain + (rand() - 0.5) * 0.2;
    let ny = dy * 0.86 - gy * gain + (rand() - 0.5) * 0.2;
    const l = Math.hypot(nx, ny) || 1; dx = nx / l; dy = ny / l;
    x += dx * 0.8; y += dy * 0.8; dist += 0.8;
    pts.push({ x, y, t: dist / R });
    if (x < 5 || y < 5 || x >= N - 6 || y >= N - 6 || sampleH(h, x, y) <= WATER_LEVEL + 0.2 || dist / R > maxT) break;
  }
  return pts;
}

function makeSplats(world, snap, stageIndex) {
  const { nz, mountain, base, apex, R } = world;
  const { h, coarse, total, last, recent, e, water } = snap;
  const a = new Uint8Array(N * N * 4), b = new Uint8Array(N * N * 4);
  const forestWeight = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j);
    const il = Math.max(i - 1, 0), ir = Math.min(i + 1, N - 1), jl = Math.max(j - 1, 0), jr = Math.min(j + 1, N - 1);
    const sx = (h[idx(ir, j)] - h[idx(il, j)]) / ((ir - il) * CELL), sy = (h[idx(i, jr)] - h[idx(i, jl)]) / ((jr - jl) * CELL);
    const slope = Math.hypot(sx, sy);
    const x = i / (N - 1), z = j / (N - 1);
    const n1 = nz.fbm(x * 26, z * 26, 3), n2 = nz.fbm(x * 70 + 3, z * 70 + 9, 2);
    const thick = h[k] - base[k];
    const onFan = smooth(0.4, 2.2, thick) * (1 - mountain[k] * 0.9);
    const grain = total[k] > 0.05 ? coarse[k] / total[k] : 0;
    const age = e - last[k];
    const dist = Math.hypot(i - apex.i, j - apex.j) / R;

    // 산지: 급경사는 암벽, 나머지는 숲. 산 아래쪽 숲은 더 빽빽하다.
    const rock = smooth(0.8 + n1 * 0.5, 1.05 + n1 * 0.5, slope) * smooth(0.02, 0.22, n1 + 0.1);
    let forest = mountain[k] * (1 - rock);
    let grass = 0, soil = 0, gravel = 0, farm = 0;

    const lowland = 1 - mountain[k];
    if (stageIndex < 2) {
      // 아직 사람이 이용하지 않는 시기: 새 퇴적면은 자갈과 모래, 오래된 면은 풀과 숲
      const fresh = Math.exp(-age / 2.5) * onFan;
      const oldV = 1 - Math.exp(-age / 10);
      gravel = fresh * smooth(0.04, 0.34, grain + n2 * 0.08);
      soil = fresh * (1 - smooth(0.04, 0.34, grain + n2 * 0.08)) + onFan * (1 - fresh) * (1 - oldV) * 0.75;
      grass = lowland * (onFan * (1 - fresh) * oldV * 0.7 + (1 - onFan) * 0.7);
      forest += lowland * (onFan * (1 - fresh) * oldV * smooth(-0.02, 0.2, n1) * 0.65 + (1 - onFan) * smooth(0.02, 0.24, n1) * 0.6);
    } else {
      // 오늘날: 평지 대부분은 논밭, 군데군데 숲과 풀
      const patch = smooth(0.2, 0.3, n1 + 0.1 * Math.sin(x * 40));
      const flat = 1 - smooth(0.1, 0.2, slope);
      farm = lowland * flat * (1 - patch * 0.85);
      forest += lowland * patch * 0.7;
      grass = lowland * (1 - farm) * (1 - patch * 0.7);
      soil = lowland * (1 - flat) * 0.4;
    }

    // 곡구 안쪽 골짜기 바닥은 자갈이 드러난다.
    const valleyFloor = mountain[k] * smooth(0.25, 0.0, slope);
    gravel += valleyFloor * 0.6;
    forest *= 1 - valleyFloor * 0.6;

    // 물길 주변의 젖은 자갈띠
    const w = water[k];
    gravel = Math.max(gravel, smooth(0.0, 0.5, w) * 0.85);
    farm *= 1 - smooth(0.0, 0.4, w);
    forest *= 1 - smooth(0.0, 0.4, w);

    // 곡구로 내려오는 골짜기 바닥은 자갈뿐이고 나무가 없다.
    const channelFloor = world.valley ? world.valley.mask[k] : 0;
    gravel = Math.max(gravel, channelFloor);
    forest *= 1 - channelFloor; grass *= 1 - channelFloor; soil *= 1 - channelFloor; farm *= 1 - channelFloor;

    a[k * 4] = 255 * clamp(gravel);
    a[k * 4 + 1] = 255 * clamp(soil);
    a[k * 4 + 2] = 255 * clamp(grass);
    a[k * 4 + 3] = 255 * clamp(forest);
    b[k * 4] = 255 * clamp(farm);
    b[k * 4 + 1] = 255 * clamp(w);
    b[k * 4 + 2] = 255 * clamp(grain * 2.2);
    // 땅 이용 구역: 선앙은 밭과 과수원, 선정과 선단 아래는 논
    const dry = onFan * smooth(0.18, 0.34, dist) * (1 - smooth(0.72, 0.95, dist));
    b[k * 4 + 3] = 255 * clamp(dry);
    forestWeight[k] = clamp(forest);
  }
  return { a, b, forestWeight };
}

export function simulate(onProgress = () => {}) {
  useSite('synthetic');
  const nz = makeNoise(20261105);
  const rand = rng32(4242);
  onProgress('산지 뼈대 만드는 중');
  const { h, mountain } = buildBase(nz);
  onProgress('빗방울로 산의 주름 새기는 중');
  slump(h, mountain, 1.0, 10);
  dropletErosion(h, mountain, rand, 420000);
  slump(h, mountain, 0.95, 6);
  // 뾰족한 봉우리의 끝을 눌러 우리나라 산지처럼 둥글게 만든다.
  for (let k = 0; k < h.length; k++) if (h[k] > 520) h[k] = 520 + (h[k] - 520) * 0.42;
  slump(h, mountain, 0.8, 4);
  const valley = carveValley(h, nz);
  const base = h.slice();

  const frontApex = frontAt(APEX_X, nz);
  const apex = { i: Math.round(APEX_X * (N - 1)), j: Math.round(frontApex * (N - 1)) + 2 };
  const world = {
    nz, rand, h, base, mountain, apex, valley, R: 150,
    coarse: new Float32Array(N * N), total: new Float32Array(N * N), last: new Float32Array(N * N), recent: new Float32Array(N * N),
  };

  onProgress('선상지 쌓는 중');
  const EVENTS = 80;
  const marks = { 16: 0, 44: 1, 80: 2 };
  const snaps = [];
  growFan(world, EVENTS, e => {
    if (marks[e] === undefined) return;
    snaps[marks[e]] = takeSnap(world, e);
  });

  // 부채꼴 크기
  let maxR = 0;
  for (let j = apex.j; j < N; j++) for (let i = 0; i < N; i++) {
    if (h[idx(i, j)] - base[idx(i, j)] > 2) maxR = Math.max(maxR, Math.hypot(i - apex.i, j - apex.j));
  }
  world.R = maxR;
  // 물길은 곡구 위쪽 골짜기에서 시작한다.
  const upstream = [];
  for (let dj = Math.round(500 / CELL); dj >= 1; dj--) upstream.push({ x: valley.center[apex.j - dj], y: apex.j - dj, t: 0 });
  const stream = [...upstream, ...traceStream(snaps[2].h, apex, maxR, rand)];
  return finish(world, snaps, stream, onProgress);
}

// 고도 격자(정수, 데시미터)의 물 방향과 집수 칸 수. 우선순위 채우기라 웅덩이에 갇히지 않고,
// 정수 높이와 칸 번호로 순서를 정하므로 node와 브라우저의 결과가 같다.
export function flowField(dem) {
  const size = dem.length, heap = new Float64Array(size + 1);
  let n = 0;
  const push = v => {
    let c = n++;
    while (c > 0) { const p = (c - 1) >> 1; if (heap[p] <= v) break; heap[c] = heap[p]; c = p; }
    heap[c] = v;
  };
  const pop = () => {
    const top = heap[0], v = heap[--n];
    for (let c = 0; ;) {
      let m = c * 2 + 1;
      if (m >= n) { heap[c] = v; break; }
      if (m + 1 < n && heap[m + 1] < heap[m]) m++;
      if (heap[m] >= v) { heap[c] = v; break; }
      heap[c] = heap[m]; c = m;
    }
    return top;
  };
  const down = new Int32Array(size).fill(-1), area = new Int32Array(size).fill(1), seen = new Uint8Array(size), order = new Int32Array(size);
  const seed = k => { if (!seen[k]) { seen[k] = 1; push(dem[k] * size + k); } };
  for (let a = 0; a < N; a++) { seed(idx(a, 0)); seed(idx(a, N - 1)); seed(idx(0, a)); seed(idx(N - 1, a)); }
  let done = 0;
  while (n > 0) {
    const key = pop(), k = key % size, level = (key - k) / size, j = (k / N) | 0, i = k - j * N;
    order[done++] = k;
    for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) {
      const a = i + p, b = j + q;
      if ((!p && !q) || a < 0 || b < 0 || a >= N || b >= N) continue;
      const o = idx(a, b);
      if (seen[o]) continue;
      seen[o] = 1; down[o] = k;
      push(Math.max(level, dem[o]) * size + o);
    }
  }
  // 나중에 채워진 칸이 위쪽이므로 거꾸로 더해 내려온다.
  for (let t = done - 1; t >= 0; t--) if (down[order[t]] >= 0) area[down[order[t]]] += area[order[t]];
  return { down, area };
}

// 곡구를 지나는 실제 물줄기: 위로는 집수 칸이 가장 큰 쪽을 따라 올라가고, 아래로는 물 방향을 따라 내려간다.
// 칸을 잇는 꺾임이 보이지 않게 이동 평균으로 다듬는다. 곡구 위쪽 점의 t는 0이다.
function streamThrough(flow, apex, R, upCells, maxT) {
  const { down, area } = flow;
  let at = idx(apex.i, apex.j);
  for (let q = -3; q <= 3; q++) for (let p = -3; p <= 3; p++) if (area[idx(apex.i + p, apex.j + q)] > area[at]) at = idx(apex.i + p, apex.j + q);
  const up = [];
  for (let c = at, n = 0; n < upCells; n++) {
    const j = (c / N) | 0, i = c - j * N;
    let best = -1;
    for (let q = -1; q <= 1; q++) for (let p = -1; p <= 1; p++) {
      const o = idx(clamp(i + p, 0, N - 1), clamp(j + q, 0, N - 1));
      if (down[o] === c && (best < 0 || area[o] > area[best])) best = o;
    }
    if (best < 0) break;
    up.push(best); c = best;
  }
  const cells = [...up.reverse()], first = cells.length;
  for (let c = at, dist = 0; c >= 0 && dist / R <= maxT; c = down[c]) {
    cells.push(c);
    if (down[c] >= 0) { const e = down[c], dx = (e % N) - (c % N), dy = ((e / N) | 0) - ((c / N) | 0); dist += Math.hypot(dx, dy); }
  }
  const raw = cells.map(c => ({ x: c % N, y: (c / N) | 0 }));
  const W = 4, pts = [];
  let dist = 0;
  raw.forEach((_, n) => {
    let sx = 0, sy = 0, cnt = 0;
    for (let m = Math.max(0, n - W); m <= Math.min(raw.length - 1, n + W); m++) { sx += raw[m].x; sy += raw[m].y; cnt++; }
    const x = sx / cnt, y = sy / cnt;
    if (n > first) dist += Math.hypot(x - pts[n - 1].x, y - pts[n - 1].y);
    pts.push({ x, y, t: n > first ? dist / R : 0 });
  });
  return { pts, first };
}

// 곡구 위쪽 물줄기를 물로 그린다. 산에서 나온 물이 곡구로 들어오게 한다.
function stampWater(water, pts) {
  for (const p of pts) {
    const i = p.x | 0, j = p.y | 0;
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
      if (Math.hypot(r + i - p.x, q + j - p.y) < 1.6) water[idx(i + r, j + q)] = 1;
    }
  }
}

// 실제 고도 자료로 만드는 구례 화엄사 선상지.
// 오늘날 단계는 실제 고도 그대로이고, 초기와 성장 단계는 부채꼴 두께를 빼낸 뒤 같은 계산으로 다시 쌓은 추정이다.
export function simulateGurye(dem, onProgress = () => {}) {
  useSite('gurye');
  const nz = makeNoise(20261105);
  const rand = rng32(4242);
  const h = new Float32Array(N * N);
  for (let k = 0; k < h.length; k++) h[k] = dem[k] / 10;

  onProgress('산지와 평지 나누는 중');
  let sl = new Float32Array(N * N);
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    sl[idx(i, j)] = Math.hypot(h[idx(i + 1, j)] - h[idx(i - 1, j)], h[idx(i, j + 1)] - h[idx(i, j - 1)]) / (2 * CELL);
  }
  const rawSlope = sl;
  for (let pass = 0; pass < 3; pass++) {
    const c = new Float32Array(N * N);
    for (let j = 3; j < N - 3; j++) for (let i = 3; i < N - 3; i++) {
      let s = 0;
      for (let q = -3; q <= 3; q++) for (let p = -3; p <= 3; p++) s += sl[idx(i + p, j + q)];
      c[idx(i, j)] = s / 49;
    }
    sl = c;
  }
  const mountain = new Float32Array(N * N);
  for (let k = 0; k < mountain.length; k++) mountain[k] = smooth(0.085, 0.17, sl[k]);

  // 곡구: 화엄사 골짜기 물줄기를 고도에서 따라 내려가 한쪽 벽이 끝나는 곳(대략 북위 35.244, 동경 127.490, 높이 약 134m).
  // 물줄기를 flowField로 구해 찾은 칸이고, 검사가 물줄기 위에 있는지와 양옆 벽을 확인한다.
  const apex = { i: 307, j: 231 };
  const R = 3000 / CELL;
  const base = h.slice();
  // 곡구 바로 앞은 옆 산의 경사가 넓게 번져 산지로 잡힌다. 부채꼴 방향 안에서는 덜 번진 경사로 다시 판단해
  // 평평한 퇴적면을 산지에서 빼고, 경사가 급한 사면은 그대로 산지로 남겨 부채꼴에 들어가지 않게 한다.
  const sectorAt = (i, j) => {
    const dx = i - apex.i, dy = j - apex.j, d = Math.hypot(dx, dy);
    if (d >= R) return 0;
    const bearing = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const b = bearing < 0 ? bearing + 360 : bearing;
    return smooth(150, 170, b) * smooth(280, 255, b);
  };
  for (let j = 4; j < N - 4; j++) for (let i = 4; i < N - 4; i++) {
    const sector = sectorAt(i, j);
    if (sector <= 0) continue;
    let s = 0;
    for (let q = -2; q <= 2; q++) for (let p = -2; p <= 2; p++) s += rawSlope[idx(i + p, j + q)];
    const k = idx(i, j);
    mountain[k] = lerp(mountain[k], Math.min(mountain[k], smooth(0.12, 0.22, s / 25)), sector);
  }
  const thickNow = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = Math.hypot(i - apex.i, j - apex.j), sector = sectorAt(i, j);
    if (sector <= 0) continue;
    const k = idx(i, j);
    const th = 28 * Math.pow(1 - d / R, 1.2) * sector * (1 - mountain[k]);
    thickNow[k] = th;
    base[k] -= th;
  }

  onProgress('선상지 쌓아 보는 중');
  const world = {
    nz, rand, h: base.slice(), base, mountain, apex, R, thick: thickNow,
    coarse: new Float32Array(N * N), total: new Float32Array(N * N), last: new Float32Array(N * N), recent: new Float32Array(N * N),
  };
  const marks = { 14: 0, 40: 1 };
  const snaps = [];
  growFan(world, 40, e => { if (marks[e] !== undefined) snaps[marks[e]] = takeSnap(world, e); });

  const coarse = new Float32Array(N * N), total = new Float32Array(N * N), last = new Float32Array(N * N).fill(40);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = idx(i, j), d = Math.hypot(i - apex.i, j - apex.j);
    total[k] = thickNow[k];
    coarse[k] = thickNow[k] * Math.exp(-d / (R * 0.42));
  }
  snaps[2] = { e: 40, h: h.slice(), coarse, total, last, recent: new Float32Array(N * N), water: new Float32Array(N * N) };

  // 물길은 실제 고도에서 구한 물줄기를 따른다. 곡구 위쪽 골짜기에서 내려와 곡구를 지나 부채꼴로 나간다.
  const { pts: stream, first } = streamThrough(flowField(dem), apex, R, Math.round(1500 / CELL), 1.2);
  const upstream = stream.slice(0, first);
  for (const n of [0, 1]) stampWater(snaps[n].water, upstream);
  // 단면은 골짜기 위쪽 물줄기에서 곡구를 지나 부채꼴로 곧게 내려간다.
  world.profileHead = upstream[Math.max(0, first - Math.round(1000 / CELL))];
  return finish(world, snaps, stream, onProgress);
}

// 오늘날 단계: 물길 하나로 정리되고, 선앙에서는 물이 땅속으로 스며든다.
function paintStream(today, stream) {
  today.water.fill(0);
  for (const p of stream) {
    const i = p.x | 0, j = p.y | 0;
    const depth = lerp(6.5, 0.9, clamp(p.t));
    const widthCells = 6000 / SIZE;
    const vis = p.t < 0.36 ? 1 : p.t < 0.56 ? smooth(0.56, 0.36, p.t) : p.t < 0.82 ? 0 : smooth(0.82, 0.92, p.t);
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) {
      const d = Math.hypot(r + i - p.x, q + j - p.y);
      const k = idx(i + r, j + q);
      if (d < 3.2) today.h[k] = Math.min(today.h[k], today.h[k] - depth * 0.1 * (1 - d / 3.2));
      if (d < widthCells) today.water[k] = Math.max(today.water[k], vis);
    }
  }
  const w = today.water, c = w.slice();
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    const k = idx(i, j);
    w[k] = (c[k] * 4 + c[k - 1] * 2 + c[k + 1] * 2 + c[k - N] * 2 + c[k + N] * 2 + c[k - N - 1] + c[k - N + 1] + c[k + N - 1] + c[k + N + 1]) / 16;
  }
}

// 곡구에서 본 부채꼴의 대표 방향: 곡구 아래쪽 퇴적 두께의 무게중심 쪽.
function fanAxis(h, base, apex) {
  let sx = 0, sy = 0;
  for (let j = apex.j + 1; j < N; j++) for (let i = 0; i < N; i++) {
    const t = h[idx(i, j)] - base[idx(i, j)];
    if (t > 0) { sx += t * (i - apex.i); sy += t * (j - apex.j); }
  }
  const l = Math.hypot(sx, sy) || 1;
  return { x: sx / l, y: sy / l };
}

function finish(world, snaps, stream, onProgress) {
  const { nz, mountain, base, apex, R } = world;
  const today = snaps[2];
  const axis = fanAxis(world.thick ?? today.h, world.thick ? new Float32Array(N * N) : base, apex);
  paintStream(today, stream);

  onProgress('표면 재질 정하는 중');
  const stages = snaps.map((s, n) => { const m = makeSplats(world, s, n); return { h: s.h, splatA: m.a, splatB: m.b, forest: m.forestWeight, water: s.water, total: s.total }; });
  const fanRelief = today.h[idx(apex.i, apex.j + 6)] - base[idx(apex.i, apex.j + 6)];

  // 땅 표면의 작은 기복. 평지의 낮은 물결과 전체의 잔 울퉁불퉁함을 더한다.
  onProgress('표면 기복 더하는 중');
  const bump = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / (N - 1), z = j / (N - 1), k = idx(i, j);
    bump[k] = 2.2 * nz.fbm(x * 85, z * 85, 3) + 6 * (1 - mountain[k]) * nz.fbm(x * 16 + 11, z * 16 + 4, 3) + 7 * mountain[k] * nz.fbm(x * 42 + 2, z * 42, 3);
  }
  if (world.valley) for (let k = 0; k < bump.length; k++) bump[k] *= 1 - world.valley.mask[k];
  for (const s of snaps) for (let k = 0; k < bump.length; k++) s.h[k] += bump[k] * smooth(WATER_LEVEL + 1, WATER_LEVEL + 5, s.h[k]);

  const toWorld = p => ({ x: (p.x / (N - 1) - 0.5) * SIZE, z: (p.y / (N - 1) - 0.5) * SIZE });
  const apexG = { x: apex.i, y: apex.j }, MOUTH_ROWS = 5;
  // 물길은 부채꼴의 한쪽으로 치우치므로(구례는 동쪽 산자락을 따라 흐른다) 이름표는 부채꼴의 대표 방향에 놓는다.
  const toeG = { x: apex.i + axis.x * R * 0.9, y: apex.j + axis.y * R * 0.9 };
  const midG = { x: apex.i + axis.x * R * 0.5, y: apex.j + axis.y * R * 0.5 };
  // 계산 지형의 곡구 뒤 사면은 완만해서, 단면이 산지에서 시작하도록 더 멀리서 시작한다.
  const BEHIND = 0.4;
  const profile = !world.profileHead
    ? { from: { x: apex.i - axis.x * R * BEHIND, y: apex.j - axis.y * R * BEHIND }, to: { x: apex.i + axis.x * R, y: apex.j + axis.y * R } }
    : (() => {
      const a = world.profileHead, l = Math.hypot(apex.i - a.x, apex.j - a.y);
      return { from: { x: a.x, y: a.y }, to: { x: apex.i + ((apex.i - a.x) / l) * R * 0.9, y: apex.j + ((apex.j - a.y) / l) * R * 0.9 } };
    })();
  const places = {
    apex: toWorld(apexG), mid: toWorld(midG), toe: toWorld(toeG), R: R * CELL,
    streamToe: stream.filter(p => p.t > 0.8 && p.t < 1.05).map(toWorld),
    profile: { from: toWorld(profile.from), to: toWorld(profile.to) },
    mouth: toWorld(world.valley ? { x: world.valley.center[apex.j - MOUTH_ROWS], y: apex.j - MOUTH_ROWS } : apexG),
    streamHead: toWorld(stream[0]),
  };
  return { site: SITE, stages, places, base, mountain, stats: { fanRadiusM: Math.round(R * CELL), fanReliefM: Math.round(fanRelief), streamEndT: +stream[stream.length - 1].t.toFixed(2) } };
}

export { sampleH };
