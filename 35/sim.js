// © 2026 김용현
// 선상지 시안의 지형 계산.
// 1) 산지와 평지를 만들고 빗방울 침식으로 산의 주름을 새긴다.
// 2) 곡구에서 나온 물길(워커)이 퇴적물을 쌓고, 쌓인 곳을 피해 물길을 옮기며 부채꼴을 만든다.
// 3) 칸마다 입자 크기와 마지막으로 퇴적된 시점을 기억해 표면 재질을 정한다.

export const SITE = new URLSearchParams(location.search).get('site') === 'gurye' ? 'gurye' : 'synthetic';
export const N = 512;
export const SIZE = SITE === 'gurye' ? 9000 : 6000;
export const CELL = SIZE / (N - 1);
export const WATER_LEVEL = SITE === 'gurye' ? -100 : 22;

const idx = (i, j) => j * N + i;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function rng32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
      const m = smooth(-0.012, 0.2, d);
      const reach = smooth(0, 0.34, d);
      const spur = nz.ridged(x * 15 + wx * 2, z * 3.6 + wz, 4);
      let v = plainAt(x, z, nz) + m * (40 + 190 * reach + 560 * Math.pow(r, 1.05) * (0.3 + 0.7 * reach) + 300 * smooth(0.0, 0.14, d) * (spur - 0.45));
      // 산지를 지나 곡구로 내려오는 큰 골짜기
      if (d > -0.01) {
        const dd = Math.max(0, d);
        const cx = APEX_X + 0.05 * Math.sin(dd * 13) * smooth(0, 0.1, dd) + 0.02 * Math.sin(dd * 37);
        const w = 0.008 + 0.075 * dd;
        const q = (x - cx) / w;
        const floor = apexH + dd * SIZE * 0.07 + 95 * smooth(0, 0.07, dd);
        const carve = Math.exp(-q * q) * 0.92 * smooth(0.37, 0.2, dd);
        if (v > floor) v = lerp(v, floor, carve);
      }
      // 앞쪽의 본류
      const rz = riverAt(x);
      const t = Math.abs(z - rz) / 0.011;
      v = lerp(WATER_LEVEL - 2.5, v, smooth(0.55, 1.5, t));
      h[idx(i, j)] = v;
      mountain[idx(i, j)] = smooth(-0.004, 0.03, d);
    }
  }
  return { h, mountain };
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
  const WALKERS = 460, VOL = 10;
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
        const rate = clamp(0.0035 + 0.00032 * dist + (slope < 0.012 ? 0.012 : 0), 0, 0.2);
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
    // 곡구 안쪽 메우기: 쌓인 면이 골짜기를 따라 위로 이어져 선정이 산지에 바로 붙게 한다.
    // 골짜기 바닥을 한 줄씩 따라 올라가며, 양옆 벽 사이의 좁은 폭만 메운다.
    const head = (h[idx(apex.i, apex.j + 2)] + h[idx(apex.i - 1, apex.j + 2)] + h[idx(apex.i + 1, apex.j + 2)]) / 3;
    let cx = apex.i;
    for (let dj = 0; dj < 50; dj++) {
      const j = apex.j - dj;
      if (j < 3) break;
      const top = head + dj * CELL * 0.05;
      let low = cx;
      for (let p = -6; p <= 6; p++) if (h[idx(cx + p, j)] < h[idx(low, j)]) low = cx + p;
      cx = low;
      if (h[idx(cx, j)] >= top) break;
      let l = cx, r = cx;
      while (cx - l < 16 && h[idx(l - 1, j)] < top) l--;
      while (r - cx < 16 && h[idx(r + 1, j)] < top) r++;
      if (cx - l >= 16 || r - cx >= 16) break; // 벽이 없으면 골짜기가 아니므로 멈춘다.
      for (let i = l; i <= r; i++) {
        const k = idx(i, j);
        const add = top - h[k];
        h[k] = top; total[k] += add; coarse[k] += add * 0.9; last[k] = e;
      }
    }
    for (let k = 0; k < recent.length; k++) recent[k] *= 0.5;
    onSnap?.(e);
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
  return { e, h: world.h.slice(), coarse: world.coarse.slice(), total: world.total.slice(), last: world.last.slice(), recent: world.recent.slice(), water };
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
  const base = h.slice();

  const frontApex = frontAt(APEX_X, nz);
  const apex = { i: Math.round(APEX_X * (N - 1)), j: Math.round(frontApex * (N - 1)) + 2 };
  const world = {
    nz, rand, h, base, mountain, apex, R: 150,
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
  const stream = traceStream(snaps[2].h, apex, maxR, rand);
  return finish(world, snaps, stream, onProgress);
}

// 실제 고도 자료로 만드는 구례 화엄사 선상지.
// 오늘날 단계는 실제 고도 그대로이고, 초기와 성장 단계는 부채꼴 두께를 빼낸 뒤 같은 계산으로 다시 쌓은 추정이다.
export function simulateGurye(dem, onProgress = () => {}) {
  const nz = makeNoise(20261105);
  const rand = rng32(4242);
  const h = new Float32Array(N * N);
  for (let k = 0; k < h.length; k++) h[k] = dem[k] / 10;

  onProgress('산지와 평지 나누는 중');
  let sl = new Float32Array(N * N);
  for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
    sl[idx(i, j)] = Math.hypot(h[idx(i + 1, j)] - h[idx(i - 1, j)], h[idx(i, j + 1)] - h[idx(i, j - 1)]) / (2 * CELL);
  }
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

  // 곡구: 화엄사 계곡 입구 (북위 35.2465, 동경 127.4835)
  const apex = { i: Math.round((318 / SIZE + 0.5) * (N - 1)), j: Math.round((-724 / SIZE + 0.5) * (N - 1)) };
  const R = 3000 / CELL;
  const base = h.slice();
  const thickNow = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = i - apex.i, dy = j - apex.j, d = Math.hypot(dx, dy);
    if (d >= R) continue;
    const bearing = (Math.atan2(dx, -dy) * 180) / Math.PI;
    const b = bearing < 0 ? bearing + 360 : bearing;
    const sector = smooth(150, 170, b) * smooth(280, 255, b);
    const k = idx(i, j);
    const th = 28 * Math.pow(1 - d / R, 1.2) * sector * (1 - mountain[k]);
    thickNow[k] = th;
    base[k] -= th;
  }

  onProgress('선상지 쌓아 보는 중');
  const world = {
    nz, rand, h: base.slice(), base, mountain, apex, R,
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

  // 물길은 잔 기복에 갇히지 않도록 부드럽게 만든 고도로 찾는다.
  let soft = snaps[2].h.slice();
  for (let pass = 0; pass < 4; pass++) {
    const c = soft.slice();
    for (let j = 4; j < N - 4; j++) for (let i = 4; i < N - 4; i++) {
      let s = 0;
      for (let q = -4; q <= 4; q++) for (let p = -4; p <= 4; p++) s += c[idx(i + p, j + q)];
      soft[idx(i, j)] = s / 81;
    }
  }
  const stream = traceStream(soft, apex, R, rand, { gain: 9, maxT: 1.2, startX: -0.45, startY: 0.9 });
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

function finish(world, snaps, stream, onProgress) {
  const { nz, mountain, base, apex, R } = world;
  const today = snaps[2];
  paintStream(today, stream);

  onProgress('표면 재질 정하는 중');
  const stages = snaps.map((s, n) => { const m = makeSplats(world, s, n); return { h: s.h, splatA: m.a, splatB: m.b, forest: m.forestWeight, water: s.water }; });
  const fanRelief = today.h[idx(apex.i, apex.j + 6)] - base[idx(apex.i, apex.j + 6)];

  // 땅 표면의 작은 기복. 평지의 낮은 물결과 전체의 잔 울퉁불퉁함을 더한다.
  onProgress('표면 기복 더하는 중');
  const bump = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / (N - 1), z = j / (N - 1), k = idx(i, j);
    bump[k] = 2.2 * nz.fbm(x * 85, z * 85, 3) + 6 * (1 - mountain[k]) * nz.fbm(x * 16 + 11, z * 16 + 4, 3) + 7 * mountain[k] * nz.fbm(x * 42 + 2, z * 42, 3);
  }
  for (const s of snaps) for (let k = 0; k < bump.length; k++) s.h[k] += bump[k] * smooth(WATER_LEVEL + 1, WATER_LEVEL + 5, s.h[k]);

  const at = t => { let best = stream[0]; for (const p of stream) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p; return best; };
  const toWorld = p => ({ x: (p.x / (N - 1) - 0.5) * SIZE, z: (p.y / (N - 1) - 0.5) * SIZE });
  const places = {
    apex: toWorld({ x: apex.i, y: apex.j }), mid: toWorld(at(0.5)), toe: toWorld(at(0.9)), R: R * CELL,
    streamToe: stream.filter(p => p.t > 0.8 && p.t < 1.05).map(toWorld),
  };
  return { stages, places, base, mountain, stats: { fanRadiusM: Math.round(R * CELL), fanReliefM: Math.round(fanRelief), streamEndT: +stream[stream.length - 1].t.toFixed(2) } };
}

export { rng32, sampleH };
