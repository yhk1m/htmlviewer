// © 2026 김용현
// 선상지 형성 모형의 계산. 화면과 분리되어 있어 node에서도 실행할 수 있다.
// 빈 산지와 평지에서 시작한다. 곡구에서 나온 입자는 물의 힘이 약해지는 곳에서 멈추고,
// 멈춘 자리의 땅이 실제로 높아진다. 높아진 땅이 다음 입자와 물길의 경로를 바꾸어 부채꼴이 자란다.
import { rng32 } from '../../shared/rng.js';

export const N = 256;
const CENTER = 128;
export const MOUTH = { i: CENTER, j: 76 };

// power: 이 값보다 물의 힘이 약해지면 멈춘다. 교육용으로 정한 값이며 실측값이 아니다.
export const GRAINS = [
  { key: 'gravel', name: '자갈', color: '#8f8c84', power: 0.085, size: 1.25, speed: 34 },
  { key: 'sand', name: '모래', color: '#e3c677', power: 0.03, size: 0.72, speed: 46 },
  { key: 'mud', name: '진흙', color: '#94603d', power: 0.0105, size: 0.46, speed: 58 },
];

export const OPTIONS = {
  sediment: { low: 0.55, mid: 1, high: 1.7 },
  water: { low: 0.72, mid: 1, high: 1.35 },
  gravel: { low: 0.14, mid: 0.3, high: 0.55 },
};

export const PRESETS = {
  textbook: { name: '교과서 선상지', options: { sediment: 'mid', water: 'mid', gravel: 'mid' } },
  dry: { name: '물이 적은 곳', options: { sediment: 'mid', water: 'low', gravel: 'high' } },
  wet: { name: '물이 많은 곳', options: { sediment: 'mid', water: 'high', gravel: 'low' } },
};

const FLOOD_SECONDS = 7;
const CALM_SECONDS = 3;
export const MAX_FLOODS = 14;
const VOLUME = 8.5;
const SPAWN_PER_SECOND = 260;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const idx = (i, j) => j * N + i;

function valueNoise(seed) {
  const r = rng32(seed), S = 256;
  const g = new Float32Array(S * S).map(() => r());
  const at = (x, y) => g[((y % S) + S) % S * S + ((x % S) + S) % S];
  const n = (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, a = u * u * (3 - 2 * u), b = v * v * (3 - 2 * v);
    return (at(i, j) * (1 - a) + at(i + 1, j) * a) * (1 - b) + (at(i, j + 1) * (1 - a) + at(i + 1, j + 1) * a) * b;
  };
  return (x, y, oct = 4) => { let s = 0, w = 0.5, f = 1, t = 0; for (let o = 0; o < oct; o++) { s += w * n(x * f, y * f); t += w; w *= 0.5; f *= 2; } return s / t; };
}

const frontAt = i => 72 + 5 * Math.sin(i * 0.031) + 2.5 * Math.sin(i * 0.09 + 1);
const valleyAt = d => CENTER + 7 * Math.sin(d * 0.075) * smooth(0, 14, d);

function buildTerrain(seed) {
  const noise = valueNoise(seed);
  const h = new Float32Array(N * N), mountain = new Float32Array(N * N);
  const plainLevel = (i, j) => 15 - (j - 72) * 0.035 + 0.5 * (noise(i * 0.06, j * 0.06, 3) - 0.5);
  const mouthH = plainLevel(CENTER, MOUTH.j);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = frontAt(i) - j;
    const plain = plainLevel(i, j);
    const m = smooth(-2, 46, d);
    const ridge = 1 - Math.abs(noise(i * 0.022 + 4, j * 0.022 + 9, 4) * 2 - 1);
    let v = plain + m * (30 + 44 * ridge * smooth(0, 40, d)) + m * 8 * (noise(i * 0.09, j * 0.09, 4) - 0.5);
    if (d > -6) {
      const dd = Math.max(0, d);
      const q = (i - valleyAt(dd)) / (3.2 + dd * 0.2);
      const floor = mouthH + dd * 0.3;
      const carve = Math.exp(-q * q) * 0.96;
      if (v > floor) v += (floor - v) * carve;
    }
    h[idx(i, j)] = v;
    mountain[idx(i, j)] = smooth(0, 7, d);
  }
  return { h, mountain };
}

export function createModel(seed = 11) {
  let rand, h, mountain, base, thick, mask, surf, parcels, drops, section, stats, floodCount, clock, flooding, lobe, spawnDebt, dropDebt, calmPath, fanR;
  const options = { sediment: 'mid', water: 'mid', gravel: 'mid' };

  const sample = (x, y) => {
    x = clamp(x, 0, N - 1.001); y = clamp(y, 0, N - 1.001);
    const i = x | 0, j = y | 0, u = x - i, v = y - j, k = idx(i, j);
    return h[k] * (1 - u) * (1 - v) + h[k + 1] * u * (1 - v) + h[k + N] * (1 - u) * v + h[k + N + 1] * u * v;
  };

  // 부채꼴 길이: 곡구에서 여러 방향으로 나가며 눈에 띄게 쌓인 곳까지의 평균.
  const measureFan = () => {
    let sum = 0, n = 0;
    for (let deg = -60; deg <= 60; deg += 20) {
      const a = (deg * Math.PI) / 180;
      let last = 0;
      for (let r = 4; r < 200; r += 2) {
        const x = (MOUTH.i + Math.sin(a) * r) | 0, y = (MOUTH.j + Math.cos(a) * r) | 0;
        if (x < 3 || y < 3 || x >= N - 3 || y >= N - 3) break;
        let s = 0;
        for (let q = -2; q <= 2; q++) for (let p = -2; p <= 2; p++) s += thick[idx(x + p, y + q)];
        if (s / 25 > 1.2) last = r;
      }
      sum += last; n++;
    }
    fanR = sum / n;
  };

  const startFlood = () => {
    measureFan();
    flooding = true;
    floodCount++;
    // 이번 홍수의 물길: 쌓여서 높아진 쪽을 피해 낮은 쪽을 고른다.
    let best = 0, bestH = Infinity;
    for (let c = 0; c < 7; c++) {
      const a = (rand() - 0.5) * 2.5;
      const reach = 14 + fanR * 0.6;
      const v = sample(MOUTH.i + Math.sin(a) * reach, MOUTH.j + Math.cos(a) * reach) + rand() * 0.8;
      if (v < bestH) { bestH = v; best = a; }
    }
    lobe = { x: Math.sin(best), y: Math.cos(best) };
  };

  function reset() {
    rand = rng32(seed);
    ({ h, mountain } = buildTerrain(seed));
    base = h.slice();
    thick = new Float32Array(N * N);
    mask = new Float32Array(N * N);
    surf = new Float32Array(N * N * 3);
    parcels = []; drops = [];
    section = Array.from({ length: N }, () => []);
    stats = GRAINS.map(() => ({ count: 0, sum: 0 }));
    floodCount = 0; clock = 0; spawnDebt = 0; dropDebt = 0; calmPath = []; fanR = 0;
    startFlood();
  }

  const spawnPoint = () => {
    const d = 16;
    return { x: valleyAt(d) + (rand() - 0.5) * 2, y: frontAt(CENTER) - d };
  };

  // 물의 힘: 경사가 급하고 물이 모여 있을수록 세다. 곡구를 벗어나면 물이 퍼지고 스며들어 약해진다.
  const flowShare = dist => 0.12 + 0.88 * Math.exp(-dist / 40);

  function advance(p, dtSteps, isWater) {
    for (let s = 0; s < dtSteps; s++) {
      const gx = (sample(p.x + 2, p.y) - sample(p.x - 2, p.y)) / 4;
      const gy = (sample(p.x, p.y + 2) - sample(p.x, p.y - 2)) / 4;
      const past = Math.max(0, p.y - MOUTH.j);
      const pull = 0.34 * Math.exp(-past / 45) * (p.y > MOUTH.j - 2 ? 1 : 0);
      let nx = p.dx * 0.6 - gx * 3.2 + (rand() - 0.5) * 0.34 + lobe.x * pull;
      let ny = p.dy * 0.6 - gy * 3.2 + (rand() - 0.5) * 0.34 + lobe.y * pull;
      const l = Math.hypot(nx, ny) || 1;
      p.dx = nx / l; p.dy = ny / l;
      p.x += p.dx; p.y += p.dy;
      if (p.x < 3 || p.y < 3 || p.x >= N - 4 || p.y >= N - 4) return 'gone';
      if (isWater) {
        const k = idx(p.x | 0, p.y | 0);
        mask[k] = Math.min(4, mask[k] + 0.22);
        // 그림에서 물줄기를 지나온 길대로 휘어 그리도록 최근 24칸의 자리를 기억한다(계산에는 쓰지 않음).
        const path = p.path || (p.path = []);
        path.unshift(p.x, p.y);
        if (path.length > 48) path.length = 48;
        p.age = (p.age || 0) + 1;
        if (p.age > 460) return 'gone';
      } else {
        const dist = Math.hypot(p.x - MOUTH.i, p.y - MOUTH.j) * (p.y > MOUTH.j ? 1 : 0);
        // 물의 힘 = 넓은 범위의 경사 x 물의 양. 잔 울퉁불퉁함에 흔들리지 않게 넓게 잰다.
        const wx = (sample(p.x + 5, p.y) - sample(p.x - 5, p.y)) / 10;
        const wy = (sample(p.x, p.y + 5) - sample(p.x, p.y - 5)) / 10;
        const pw = Math.hypot(wx, wy) * OPTIONS.water[options.water] * flowShare(dist);
        p.age++;
        p.force += (pw - p.force) * 0.12;
        if (p.force < p.limit || p.age > 500) return 'stop';
        // 웅덩이에 갇혀 맴돌면 그 자리에 쌓여 웅덩이를 메운다.
        if (p.age % 24 === 0) {
          if (p.mark && Math.hypot(p.x - p.mark.x, p.y - p.mark.y) < 7) return 'stop';
          p.mark = { x: p.x, y: p.y };
        }
      }
    }
    return 'go';
  }

  function deposit(p) {
    const ci = p.x | 0, cj = p.y | 0;
    const R = 2;
    let w = 0;
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) w += Math.max(0, 1 - Math.hypot(r, q) / (R + 0.6));
    const G = p.cls;
    for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) {
      const a = Math.max(0, 1 - Math.hypot(r, q) / (R + 0.6)) / w * VOLUME;
      if (a <= 0) continue;
      const i = ci + r, j = cj + q;
      if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) continue;
      const k = idx(i, j);
      h[k] += a; thick[k] += a;
      const mix = Math.min(1, a / 1.3);
      for (let c = 0; c < 3; c++) surf[k * 3 + c] += ((c === G ? 1 : 0) - surf[k * 3 + c]) * mix;
      if (Math.abs(i - CENTER) <= 1) {
        const st = section[j], last = st[st.length - 1];
        if (last && last.c === G) last.t += a / 3; else st.push({ c: G, t: a / 3 });
      }
      // 너무 가파르면 흘러내린다(안식각).
      for (const o of [1, -1, N, -N]) {
        const diff = h[k] - h[k + o];
        if (diff > 0.46) { const m = (diff - 0.46) * 0.5; h[k] -= m; h[k + o] += m; thick[k] = Math.max(0, thick[k] - m); thick[k + o] += m; surf[(k + o) * 3 + G] = Math.max(surf[(k + o) * 3 + G], 0.5); }
      }
    }
    const dist = Math.max(0, Math.hypot(p.x - MOUTH.i, p.y - MOUTH.j) * (p.y > MOUTH.j ? 1 : 0));
    stats[G].count++; stats[G].sum += dist;
  }

  // 평상시 물길: 곡구에서 낮은 곳을 따라가며, 선앙에서 스며들고 선단에서 다시 나온다.
  function buildCalmPath() {
    calmPath = [];
    const toT = (x, y) => (y > MOUTH.j ? Math.hypot(x - MOUTH.i, y - MOUTH.j) : 0) / Math.max(fanR, 1);
    const front = frontAt(CENTER);
    // 골짜기 안쪽 구간은 골짜기 중심선을 그대로 따른다.
    for (let d = 16; d >= 0; d--) {
      const vx = valleyAt(d), vy = front - d;
      calmPath.push({ x: vx, y: vy, t: toT(vx, vy) });
    }
    // 곡구 아래는 한 줄씩 내려가며, 넓게 평균한 높이가 가장 낮은 쪽으로 옮겨 간다. y가 늘기만 하므로 맴돌 수 없다.
    const y0 = Math.floor(front) + 1, y1 = Math.min(N - 5, Math.floor(MOUTH.j + fanR * 1.35));
    const rows = [];
    let x = valleyAt(0);
    for (let y = y0; y <= y1; y++) {
      let bestX = x, bestC = Infinity;
      for (let dx = -1; dx <= 1; dx += 0.5) {
        let c = 0;
        for (const ox of [-4, -2, 0, 2, 4]) for (const oy of [-3, 0, 3]) c += sample(x + dx + ox, y + oy);
        c = c / 15 + 0.02 * Math.abs(dx);
        if (c < bestC) { bestC = c; bestX = x + dx; }
      }
      x = bestX;
      rows.push({ x, y });
    }
    for (let pass = 0; pass < 2; pass++) {
      const xs = rows.map(r => r.x);
      rows.forEach((r, i) => {
        let sum = 0, n = 0;
        for (let k = -4; k <= 4; k++) { const q = xs[i + k]; if (q !== undefined) { sum += q; n++; } }
        r.x = sum / n;
      });
    }
    // 골짜기 구간과 이어지도록 첫 점을 맞추고, 차이는 위쪽 줄에서 서서히 줄인다.
    const off = valleyAt(0) - rows[0].x;
    rows.forEach((r, i) => { r.x += off * Math.max(0, 1 - i / 30); });
    for (const r of rows) calmPath.push({ x: r.x, y: r.y, t: toT(r.x, r.y) });
  }

  function tick(dt) {
    clock += dt;
    const cycle = clock % (FLOOD_SECONDS + CALM_SECONDS);
    const nowFlood = cycle < FLOOD_SECONDS;
    if (nowFlood && !flooding && floodCount < MAX_FLOODS) startFlood();
    if (!nowFlood && flooding) { flooding = false; measureFan(); buildCalmPath(); }

    if (flooding) {
      spawnDebt += SPAWN_PER_SECOND * OPTIONS.sediment[options.sediment] * dt;
      const shareG = OPTIONS.gravel[options.gravel];
      const shareS = (1 - shareG) * 0.55;
      while (spawnDebt >= 1) {
        spawnDebt--;
        const u = rand(), cls = u < shareG ? 0 : u < shareG + shareS ? 1 : 2;
        const { x, y } = spawnPoint();
        parcels.push({ x, y, dx: 0, dy: 1, cls, age: 0, limit: GRAINS[cls].power * (0.7 + rand() * 0.6), carry: 0, force: 0.3 });
      }
      dropDebt += 150 * dt;
      while (dropDebt >= 1) {
        dropDebt--;
        const { x, y } = spawnPoint();
        drops.push({ x, y, dx: 0, dy: 1, carry: 0 });
      }
    }

    parcels = parcels.filter(p => {
      p.carry += GRAINS[p.cls].speed * dt;
      const steps = p.carry | 0; p.carry -= steps;
      const r = advance(p, steps, false);
      if (r === 'stop') { deposit(p); return false; }
      return r === 'go';
    });
    drops = drops.filter(p => {
      p.carry += 72 * dt;
      const steps = p.carry | 0; p.carry -= steps;
      return advance(p, steps, true) === 'go';
    });

    const decay = Math.pow(flooding ? 0.45 : 0.08, dt);
    for (let k = 0; k < mask.length; k++) mask[k] *= decay;
    if (!flooding) {
      for (const p of calmPath) {
        const visible = p.t < 0.34 || p.t > 0.88;
        if (!visible) continue;
        for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) {
          const k = idx((p.x | 0) + r, (p.y | 0) + q);
          mask[k] = Math.max(mask[k], q === 0 && r === 0 ? 2 : 0.9);
        }
      }
    }
  }

  reset();
  return {
    tick, reset,
    applyPreset(name) { Object.assign(options, PRESETS[name].options); reset(); },
    setOption(name, value) { options[name] = value; },
    get options() { return options; },
    get h() { return h; }, get base() { return base; }, get thick() { return thick; },
    get mask() { return mask; }, get surf() { return surf; }, get mountain() { return mountain; },
    get parcels() { return parcels; }, get drops() { return drops; }, get section() { return section; },
    get flooding() { return flooding; }, get totalSeconds() { return (MAX_FLOODS - 1) * (FLOOD_SECONDS + CALM_SECONDS) + FLOOD_SECONDS; }, get finished() { return !flooding && floodCount >= MAX_FLOODS; }, get floodCount() { return floodCount; }, get fanR() { return fanR; },
    get calmPath() { return calmPath; }, get clock() { return clock; },
    sample,
    meanDistances() { return stats.map(s => (s.count ? s.sum / s.count : 0)); },
    counts() { return stats.map(s => s.count); },
  };
}
