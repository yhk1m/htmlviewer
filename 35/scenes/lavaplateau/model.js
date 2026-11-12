// © 2026 김용현
// 용암대지와 한탄강 협곡 형성 모형 계산. DOM이 없어 node에서 그대로 검사한다.
// 블록은 화강암과 편마암 산지 사이의 넓은 골짜기 한 조각이다(약 3.8km x 3.8km). 골짜기는 뒤(상류)에서 앞(하류)으로 흐르고,
// 블록 앞면(y가 가장 큰 쪽)은 골짜기를 가로질러 잘라, 진행상황 칸의 단면과 같은 자리다.
// 1. 옛 골짜기: 넓은 골짜기 바닥에 옛 하천이 쌓은 자갈과 모래층(전곡의 백의리층 같은 층)이 있고, 양쪽 산지에서 지류가 들어온다.
// 2. 열하 분출: 골짜기 방향으로 길게 갈라진 틈에서 아주 묽은 현무암질 용암이 여러 번 흘러나와 낮은 곳부터 채운다(책 521, 529쪽).
// 3. 골짜기가 메워짐: 용암층이 겹겹이 쌓여 평평한 대지가 된다. 지류 입구가 용암에 막혀(용암댐) 지류 쪽에 호수가 생긴다(524, 531쪽).
//    분출 끝 무렵에는 한 곳에서 터지는 분출로 바뀌어 작은 분석구가 생긴다(평강의 오리산 같은, 529, 530쪽).
// 4. 협곡: 대지 위를 흐르던 본류가 하류부터 아래로 깎아 들어간다. 단단한 현무암과 그 아래 옛 땅의 경계를 따라 파고들어
//    좁고 깊은 협곡이 되고, 절벽에 주상절리가 드러나며 협곡 바닥 가까이 옛 하천 자갈층이 보인다(531, 532쪽).
// 5. 오늘날: 물이 적은 지류는 대지 높이에 남아 협곡으로 떨어지는 폭포가 되고, 폭포는 상류로 조금씩 물러난다(재인폭포 같은, 533쪽). 대지 위는 논이다(537쪽).
// 끈적한 용암은 멀리 흐르지 못하고 갈라진 틈 둘레에 두껍게 쌓여, 평평한 대지가 되지 않는다(용암대지는 묽은 현무암일 때 생김, 521쪽).
// 용암 양이 많으면 골짜기를 넘어 낮은 능선(분수계)까지 덮는다(521쪽).
// 모든 값은 시각 t의 식으로 바로 계산한다(같은 조건, 같은 시각이면 언제나 같은 땅). 진행 막대로 되돌려도 같다.
// 계산에는 사칙연산과 제곱근, 내림, 올림, 반올림, 큰 값, 작은 값, 절댓값만 쓴다. 다른 수학 함수는 node와 브라우저에서 값이 조금 달라 계산이 갈라진다.

export const N = 128; // 가로(x), 세로(y) 칸 수
export const CELL_M = 30; // 칸 한 변(m). 블록 한 변은 약 3.8km다.
export const ROUND = 0.2; // 계산 한 번의 때(초)
export const NF = 6; // 용암이 흐른 횟수(철원은 10번 안팎인데 줄였다)
export const T_ERUPT = 6; // 틈이 갈라지며 분출이 시작되는 때
export const FLOW0 = 7; // 첫 용암이 흐르기 시작하는 때
export const FLOW_GAP = 4; // 용암 흐름 사이(초)
export const FLOW_DUR = 3.6; // 용암 하나가 다 흐르는 데 걸리는 때(초)
export const COOL = 2.5; // 흐름이 멈춘 뒤 겉이 다 식는 데 걸리는 때(초)
export const T_FILL = FLOW0 + 3 * FLOW_GAP; // 넷째 흐름부터는 골짜기가 메워지는 단계
export const T_CONE = 32; // 한 곳에서 터지는 분출(분석구) 시작
export const CONE_DUR = 6;
export const T_CANYON = 41; // 본류가 깎기 시작
export const CANYON_END = 70; // 김(가장 오래 깎음)일 때 다 깎이는 때
export const T_LAKEFILL = [44, 64]; // 막힌 호수가 흙과 모래로 메워지는 때
export const T_TODAY = 62;
export const TODAY_END = 72;
export const T_END = 76;

export const FISSURE_Y = [12, 118]; // 갈라진 틈이 있는 y 범위(칸)
export const CW = 4.2; // 협곡 바닥 반너비(칸). 협곡 너비는 약 250m다.
export const SW = 1.3; // 폭포가 물러나며 판 좁은 골짜기의 반너비(칸)
export const GRAVEL_M = 8; // 옛 하천 자갈층 두께(m, 잘 보이게 두껍게 했다)
export const CUT_BELOW = 5; // 협곡 바닥이 옛 땅 겉(자갈층 윗면)보다 낮아지는 깊이(m)
export const S_DAM = { small: 5, big: 12 }; // 용암이 지류 입구로 밀고 들어가는 거리(칸). 그 위쪽은 막혀 호수가 된다.
export const KNOB = { x: 44, y: 94, r: 11, h: 118 }; // 골짜기 안의 둥근 옛 기반암 언덕(스텝토가 될 곳)
// 본류(새 물길)의 자리: 대지 가장자리(용암과 옛 땅의 경계)를 따라 크게 굽이친다(532쪽: 옛 하도 퇴적층 부근이나 기반암과 용암대지 사이의 경계를 따라 하방 침식).
// [y, x] 조절점을 부드럽게 잇는다. 오른쪽으로 굽은 곳은 협곡 오른쪽 벽이 옛 기반암(편마암)이다.
export const MEANDER = [[-24, 90], [0, 93], [22, 98], [46, 87], [72, 86], [98, 97], [116, 99], [127, 90], [150, 86]];
export function meanderX(j) {
  let q = 1;
  while (q < MEANDER.length - 3 && MEANDER[q + 1][0] <= j) q++;
  const [y1, p1] = MEANDER[q], [y2, p2] = MEANDER[q + 1], p0 = MEANDER[q - 1][1], p3 = MEANDER[q + 2][1], t = (j - y1) / (y2 - y1);
  return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
}
export const CONE = { y: 26, h: 55, r: 6.5, cr: 1.8, cd: 14 }; // 분석구: 높이(m), 밑 반지름(칸), 화구 반지름(칸), 화구 깊이(m)
export const SADDLE = { y0: 18, y1: 58, crest: 84 }; // 오른쪽 산지의 낮은 능선(분수계): 이 y 범위에서 골짜기 바닥보다 약 84m 높다.
// 지류: 입구(골짜기 가장자리)에서 산지 쪽으로 올라가는 점들(칸)과, 대지를 가로지르는 줄(y), 폭포가 물러날 수 있는 가장 먼 거리(칸)
export const TRIBS = [
  { name: '왼쪽 지류 1', side: -1, yc: 40, pts: [[30, 40], [20, 37], [10, 32], [-6, 27]], rmax: 12 },
  { name: '오른쪽 지류', side: 1, yc: 74, pts: [[98, 74], [108, 71], [118, 66], [134, 62]], rmax: 7 },
  { name: '왼쪽 지류 2', side: -1, yc: 108, pts: [[30, 108], [19, 112], [8, 118], [-6, 122]], rmax: 14 },
];

export const VISC = {
  fluid: { name: '묽음' },
  sticky: { name: '끈적' },
};
export const VOLUME = {
  small: { name: '적음', level: 48, sh: 15, sr: 1 },
  big: { name: '많음', level: 96, sh: 19, sr: 1.25 },
};
export const ERODE = {
  short: { name: '짧음', w: 0.4 },
  long: { name: '김', w: 1 },
};
export const PRESETS = {
  textbook: { visc: 'fluid', volume: 'big', erode: 'long' },
  small: { visc: 'fluid', volume: 'small', erode: 'long' },
  young: { visc: 'fluid', volume: 'big', erode: 'short' },
  sticky: { visc: 'sticky', volume: 'big', erode: 'long' },
};
export const DEFAULTS = { ...PRESETS.textbook };

export const FLAT_SLOPE = 0.03; // 이보다 완만하면 평평한 땅으로 센다(기울기 3%)
export const FALL_DROP = 12; // 지류가 이만큼(m) 넘게 떨어지면 폭포라고 말한다
export const PLATEAU_KM2 = 4; // 평평한 용암 땅이 이만큼(km²) 넘으면 용암대지가 되었다고 말한다

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function makeRng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function makeNoise(seed, cell) {
  const r = makeRng(seed * 7919 + 13), M = Math.ceil(N / cell) + 3, g = new Float64Array(M * M);
  for (let k = 0; k < g.length; k++) g[k] = r();
  const ease = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const u = clamp(x, 0, N) / cell, v = clamp(y, 0, N) / cell, i = Math.floor(u), j = Math.floor(v), a = ease(u - i), b = ease(v - j), o = j * M + i;
    return (g[o] * (1 - a) + g[o + 1] * a) * (1 - b) + (g[o + M] * (1 - a) + g[o + M + 1] * a) * b;
  };
}
const flowStart = f => FLOW0 + f * FLOW_GAP;

export function createModel(seed = 7) {
  const size = N * N;
  const zo = new Float32Array(size), zb = new Float32Array(size), gt = new Float32Array(size);
  const corr = new Int8Array(size).fill(-1), sArm = new Float32Array(size), dArm = new Float32Array(size);
  const finalTop = [], top = [], heat = new Float32Array(size), sed = new Float32Array(size), sedF = new Float32Array(size), cone = new Float32Array(size);
  const zp = new Float32Array(size), z = new Float32Array(size), wl = new Float32Array(size), lakeId = new Int8Array(size).fill(-1), lava = new Float32Array(size);
  for (let f = 0; f < NF; f++) { finalTop.push(new Float32Array(size)); top.push(new Float32Array(size)); }
  const fl = new Float32Array(N), xa = new Float32Array(N), xb = new Float32Array(N), xo = new Float32Array(N), xc = new Float32Array(N), xf = new Float32Array(N), mx = new Float32Array(N);
  const m = {
    zo, zb, gt, top, heat, sed, cone, zp, z, wl, lava, fl, xa, xb, xo, xc, xf, seed,
    options: { ...DEFAULTS }, clock: 0, finished: false, version: 0, bottom: -30,
  };
  let roundNo = 0, carry = 0, builtKey = '', spotCache = {};

  // 처음 땅: 넓은 골짜기와 양쪽 산지. 오른쪽 산지 뒤쪽 절반에는 낮은 능선(분수계)이 있다.
  const nA = makeNoise(seed + 1, 24), nB = makeNoise(seed + 2, 24), nO = makeNoise(seed + 3, 30), nC = makeNoise(seed + 4, 22), nF = makeNoise(seed + 5, 26);
  const nH = makeNoise(seed + 6, 20), nR = makeNoise(seed + 7, 7), n1 = makeNoise(seed + 8, 9);
  const rise = d => 1 - 1 / (1 + (d / 10) * (d / 10));
  function buildGround() {
    for (let j = 0; j < N; j++) {
      fl[j] = (6 * (N - 1 - j)) / (N - 1);
      xa[j] = 30 + 8 * (nA(3, j) - 0.5);
      xb[j] = 98 + 8 * (nB(3, j) - 0.5);
      xo[j] = 58 + 16 * (nO(3, j) - 0.5);
      mx[j] = meanderX(j) + 1.2 * (nC(3, j) - 0.5);
      xf[j] = 63 + 4 * (nF(3, j) - 0.5);
    }
    const r12 = rise(12);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i, base = fl[j] + 2.5;
      let h, g = 0;
      if (i >= xa[j] && i <= xb[j]) {
        // 골짜기 바닥: 가장자리로 조금 높아지고, 옛 하천이 얕은 물길을 판다. 바닥 전체에 자갈층이 깔려 있다.
        const d = Math.min(i - xa[j], xb[j] - i), c = (i - xo[j]) / 1.8;
        h = fl[j] + 2.5 * (1 - clamp(d / 6)) + 1.2 * (n1(i, j) - 0.5) * clamp(d / 3) - 3 * Math.max(0, 1 - c * c);
        g = GRAVEL_M * clamp(d / 5);
      } else if (i < xa[j]) {
        const d = xa[j] - i, H = 170 + 50 * (nH(i, j) - 0.5);
        h = base + H * rise(d) + 16 * (nR(i, j) - 0.5) * rise(d);
      } else {
        const d = i - xb[j], H = 150 + 40 * (nH(i, j) - 0.5);
        const sw = smooth(SADDLE.y0 - 8, SADDLE.y0 + 2, j) * (1 - smooth(SADDLE.y1 - 2, SADDLE.y1 + 8, j));
        const sad = d < 12 ? (SADDLE.crest * rise(d)) / r12 : SADDLE.crest - (SADDLE.crest - 40) * clamp((d - 12) / 17);
        h = base + H * rise(d) * (1 - sw) + sad * sw + 14 * (nR(i, j) - 0.5) * rise(d) * (1 - 0.6 * sw);
      }
      // 골짜기 안의 옛 봉우리
      const kx = (i - KNOB.x) / KNOB.r, ky = (j - KNOB.y) / KNOB.r, u2 = kx * kx + ky * ky;
      // 둥근 언덕 모양(꼭대기가 뾰족하지 않다)
      if (u2 < 1) { const q = 1 - u2; h = Math.max(h, fl[j] + 2 + KNOB.h * Math.sqrt(q * Math.sqrt(q))); g *= clamp(Math.sqrt(u2) * 1.6 - 0.6); }
      zo[k] = h; gt[k] = g;
    }
    // 지류 골짜기를 산지에 판다. 바닥은 입구에서 산지 쪽으로 높아지고, 옆 비탈이 있다.
    TRIBS.forEach((tr, ti) => {
      const jm = tr.pts[0][1];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const k = j * N + i;
        let best = 1e9, sBest = 0, acc = 0;
        for (let q = 0; q + 1 < tr.pts.length; q++) {
          const [ax, ay] = tr.pts[q], [bx, by] = tr.pts[q + 1], dx = bx - ax, dy = by - ay, L = Math.sqrt(dx * dx + dy * dy);
          const u = clamp(((i - ax) * dx + (j - ay) * dy) / (L * L)), px = ax + dx * u - i, py = ay + dy * u - j, d = Math.sqrt(px * px + py * py);
          if (d < best) { best = d; sBest = acc + u * L; }
          acc += L;
        }
        // 골짜기 쪽(입구 안쪽)은 지류가 아니다.
        const inside = tr.side < 0 ? i > xa[j] + 1 : i < xb[j] - 1;
        if (inside) continue;
        const s = sBest, zt = fl[jm] + 1 + 2.4 * s + 0.04 * s * s;
        zo[k] = Math.min(zo[k], zt + Math.max(0, best - 1.2) * 10);
        if (best < 6 && (corr[k] < 0 || best < dArm[k])) { corr[k] = ti; sArm[k] = s; dArm[k] = best; }
      }
    });
    for (let k = 0; k < size; k++) zb[k] = zo[k] - gt[k];
    m.bottom = -30;
    let hi = -1e9;
    for (let k = 0; k < size; k++) hi = Math.max(hi, zo[k]);
    m.top0 = Math.ceil(hi + 6);
  }

  // 조건에 따라 용암 흐름 하나하나가 다 흐른 뒤의 윗면을 미리 구한다.
  const dist = new Float32Array(size), domF = [];
  for (let f = 0; f < NF; f++) domF.push(new Uint8Array(size));
  const lobes = [];
  const lakes = [];
  const opt = () => ({ fluid: m.options.visc === 'fluid', V: VOLUME[m.options.volume], W: ERODE[m.options.erode].w, sDam: S_DAM[m.options.volume] });
  const levelAt = (f, j) => fl[j] + 2.5 + (VOLUME[m.options.volume].level * (f + 1)) / NF;
  let coneX = 63, maxDist = [];
  function buildLava() {
    const { fluid, V, sDam } = opt();
    // 묽은 용암이 골짜기를 메우면 본류는 대지 가장자리로 밀려 옛 산지 기슭을 파고들며 굽이친다(한쪽 벽이 옛 기반암이 된다).
    // 끈적한 용암일 때는 골짜기 바닥이 남아 있으므로 본류는 옛 골짜기 바닥 안에서 흐른다.
    for (let j = 0; j < N; j++) xc[j] = fluid ? Math.min(mx[j], xb[j] + 1.5) : Math.min(mx[j], xb[j] - CW - 1.5);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) dist[j * N + i] = Math.abs(i - xf[j]) + Math.max(0, FISSURE_Y[0] - j, j - FISSURE_Y[1]);
    lobes.length = 0;
    maxDist = [];
    let prev = zo;
    const queue = new Int32Array(size);
    for (let f = 0; f < NF; f++) {
      const out = finalTop[f], dom = domF[f];
      dom.fill(0);
      if (fluid) {
        // 갈라진 틈에서 시작해 이 흐름의 높이보다 낮은 땅을 이어 채운다. 막힌 지류 안쪽(입구에서 sDam칸 넘게 들어간 곳)은 채우지 않는다.
        let qh = 0, qt = 0, md = 0;
        for (let j = FISSURE_Y[0]; j <= FISSURE_Y[1]; j++) { const k = j * N + Math.round(xf[j]); if (prev[k] < levelAt(f, j)) { dom[k] = 1; queue[qt++] = k; } }
        while (qh < qt) {
          const k = queue[qh++], i = k % N, j = (k / N) | 0;
          md = Math.max(md, dist[k]);
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const a = i + di, b = j + dj;
            if (a < 0 || b < 0 || a >= N || b >= N) continue;
            const q = b * N + a;
            if (dom[q] || prev[q] >= levelAt(f, b) || (corr[q] >= 0 && sArm[q] > sDam)) continue;
            dom[q] = 1; queue[qt++] = q;
          }
        }
        maxDist.push(md);
        for (let k = 0; k < size; k++) out[k] = dom[k] ? Math.max(prev[k], levelAt(f, (k / N) | 0)) : prev[k];
      } else {
        // 끈적한 용암: 틈 몇 곳에서 나와 그 둘레에 두껍게 쌓인 덩어리(가장자리가 가파르다)
        const r = makeRng(seed * 101 + f * 17 + 5), ys = [[24, 64, 104], [40, 86, 120], [16, 56, 96], [30, 74, 112], [48, 92, 124], [36, 80, 118]][f];
        const nl = makeNoise(seed + 40 + f, 6), nb = makeNoise(seed + 60 + f, 2.2);
        const list = ys.map(y0 => {
          const yc = Math.min(N - 1, y0 + Math.round((r() - 0.5) * 8));
          return { f, x: xf[Math.min(N - 1, Math.max(0, yc))] + (r() - 0.5) * 3, y: yc, rx: (8 + 3 * r()) * V.sr, ry: (13 + 5 * r()) * V.sr, h: V.sh * (0.8 + 0.4 * r()) };
        });
        lobes.push(...list);
        for (let k = 0; k < size; k++) {
          const i = k % N, j = (k / N) | 0;
          let add = 0;
          for (const L of list) {
            const dx = (i - L.x) / L.rx, dy = (j - L.y) / L.ry, u2 = dx * dx + dy * dy;
            // 위가 넓고 가장자리가 가파른 두꺼운 덩어리. 겉은 굳은 덩이가 부서져 울퉁불퉁하다.
            if (u2 < 1) add += L.h * Math.sqrt(1 - u2 * u2) * (0.8 + 0.4 * nl(i, j)) * (0.9 + 0.2 * nb(i, j));
          }
          out[k] = prev[k] + add;
          if (add > 0.3) dom[k] = 1;
        }
        maxDist.push(0);
      }
      prev = out;
    }
    // 분석구 자리: 갈라진 틈 위, 뒤쪽
    coneX = Math.round(xf[CONE.y]);
    // 호수: 막힌 지류 안쪽에서, 댐(용암 윗면)보다 1.5m 낮게 물이 찬다.
    lakes.length = 0; lakeId.fill(-1); sedF.fill(-1e9);
    if (fluid) {
      const last = finalTop[NF - 1];
      TRIBS.forEach((tr, ti) => {
        // 댐 자리: 지류 줄을 따라 입구에서 sDam칸 들어간 곳 가까이에서 용암이 덮은 칸
        let dam = -1, best = 1e9;
        for (let k = 0; k < size; k++) if (corr[k] === ti && domF[NF - 1][k] && Math.abs(sArm[k] - sDam) < best && dArm[k] < 1.5) { best = Math.abs(sArm[k] - sDam); dam = k; }
        if (dam < 0) return;
        const level = last[dam] - 1.5;
        const cells = [];
        for (let k = 0; k < size; k++) if (corr[k] === ti && sArm[k] > sDam && zo[k] < level) { cells.push(k); lakeId[k] = ti; sedF[k] = level + 0.6; }
        if (cells.length) lakes.push({ ti, dam, level, cells });
      });
    }
  }

  // 협곡과 폭포
  const W = () => ERODE[m.options.erode].w;
  // 끈적한 용암일 때는 대지가 없으므로 본류는 옛 골짜기 바닥을 그대로 흐르고 협곡을 파지 않는다.
  const incP = t => (m.options.visc === 'fluid' ? Math.min(W(), smooth(T_CANYON, CANYON_END, t)) : 0);
  // 협곡이 하류(앞)에서 상류(뒤)로 파고들며, 지나간 곳은 점점 깊어진다.
  const depthF = (P, j) => clamp((P * 1.35 - (N - 1 - j) / (N - 1)) / 0.35) * Math.min(1, P / 0.8);
  const isCanyon = (i, j) => Math.abs(i - xc[j]) < CW;
  m.isCanyon = isCanyon;
  // 협곡 바닥이 깎여 내려갈 높이: 옛 골짜기 바닥(옛 하천 높이)보다 조금 낮게. 대지 가장자리에서 옛 산지를 파고든 곳도 같은 높이까지 깎는다.
  const floorAt = k => Math.min(zo[k] - CUT_BELOW, fl[(k / N) | 0] - 2.5);
  m.floorAt = floorAt;
  let fallStart = [];
  function buildFalls() {
    // 지류마다 폭포가 생기기 시작하는 P(협곡이 그 자리에서 FALL_DROP보다 깊어지는 때)
    fallStart = TRIBS.map(tr => {
      const j = tr.yc, k = j * N + Math.round(xc[j]), pre = surfaceFinal(k), floorT = floorAt(k);
      for (let P = 0; P <= 1.0001; P += 0.005) if (depthF(P, j) * (pre - floorT) - 1.5 > FALL_DROP) return P;
      return 9;
    });
  }
  const surfaceFinal = k => Math.max(finalTop[NF - 1][k], sedF[k]) + coneShape(k, 1);

  function coneShape(k, g) {
    // 끈적한 용암 조건에는 분석구를 두지 않는다.
    if (g <= 0 || m.options.visc !== 'fluid') return 0;
    const i = k % N, j = (k / N) | 0, dx = i - coneX, dy = j - CONE.y, r = Math.sqrt(dx * dx + dy * dy), R = CONE.r * (0.55 + 0.45 * g);
    if (r >= R) return 0;
    let a = CONE.h * g * Math.min(1, (1 - r / R) / 0.7);
    const cr = CONE.cr * (0.5 + 0.5 * g);
    if (r < cr) { const q = r / cr; a -= CONE.cd * g * (1 - q * q); }
    return a;
  }

  m.endTime = () => T_END;
  m.incision = () => incP(m.clock);
  m.todayFrac = () => smooth(T_TODAY, TODAY_END, m.clock);
  m.paddyFrac = () => smooth(T_TODAY - 1, TODAY_END - 2, m.clock);
  m.vegFrac = () => smooth(T_CONE + 4, T_CANYON + 6, m.clock);
  m.lakeFill = () => (opt().fluid ? smooth(T_LAKEFILL[0], T_LAKEFILL[1], m.clock) : 0);
  m.coneGrow = () => (m.options.visc === 'fluid' ? smooth(T_CONE, T_CONE + CONE_DUR, m.clock) : 0);
  m.coneX = () => coneX;
  m.lobes = () => lobes;
  m.lakes = () => lakes;
  m.flowState = f => {
    const ts = flowStart(f), t = m.clock;
    if (t < ts) return 'wait';
    if (t < ts + FLOW_DUR) return 'flow';
    if (t < ts + FLOW_DUR + COOL) return 'cool';
    return 'done';
  };
  m.flowsStarted = () => { let n = 0; for (let f = 0; f < NF; f++) if (m.clock >= flowStart(f)) n++; return n; };

  // 지금 때의 땅을 계산한다.
  let falls = [], slots = [];
  m.falls = () => falls;
  m.slots = () => slots;
  let vents = [];
  m.vents = () => vents;
  function update() {
    const t = m.clock, { fluid } = opt();
    heat.fill(0);
    let prev = zo;
    vents = [];
    for (let f = 0; f < NF; f++) {
      const out = top[f], fin = finalTop[f], ts = flowStart(f), te = ts + FLOW_DUR;
      if (t <= ts) { out.set(prev); prev = out; continue; }
      const p = clamp((t - ts) / FLOW_DUR);
      const cool = t <= te ? 1 : clamp(1 - (t - te) / COOL);
      if (fluid) {
        const R = (maxDist[f] + 8) * Math.min(1, p / 0.75);
        for (let k = 0; k < size; k++) {
          const add = fin[k] - prev[k];
          if (add <= 0) { out[k] = prev[k]; continue; }
          const d = dist[k], fr = p >= 1 ? 1 : clamp((R - d) / 8);
          out[k] = prev[k] + add * fr;
          // 흐르는 동안 겉은 얇게 굳어 검고, 갈라진 틈과 앞머리에서만 속이 빛난다.
          if (fr > 0.02 && cool > 0) heat[k] = Math.max(heat[k], t <= te ? 0.13 + 0.8 * clamp(1 - (R - d) / 7) * fr : 0.13 * cool);
        }
      } else {
        for (let k = 0; k < size; k++) out[k] = prev[k];
        for (const L of lobes) {
          if (L.f !== f) continue;
          const reach = 1.25 * p;
          for (let j = Math.max(0, Math.floor(L.y - L.ry)); j <= Math.min(N - 1, Math.ceil(L.y + L.ry)); j++) for (let i = Math.max(0, Math.floor(L.x - L.rx)); i <= Math.min(N - 1, Math.ceil(L.x + L.rx)); i++) {
            const k = j * N + i, dx = (i - L.x) / L.rx, dy = (j - L.y) / L.ry, u = Math.sqrt(dx * dx + dy * dy);
            if (u >= 1) continue;
            const g = clamp((reach - u) / 0.25);
            if (g <= 0) continue;
            const full = fin[k] - prev[k];
            out[k] = Math.max(out[k], prev[k] + full * g);
            if (cool > 0) heat[k] = Math.max(heat[k], cool * (t <= te ? 0.08 + 0.7 * clamp(1 - (reach - u) / 0.25) : 0.08) * g);
          }
        }
      }
      prev = out;
      // 갈라진 틈: 흐름이 나오는 동안 틈을 따라 용암이 솟는다(불의 커튼).
      if (t < te) {
        const a = FISSURE_Y[0] + ((f * 37) % 30), b = FISSURE_Y[1] - ((f * 23) % 26);
        if (fluid) {
          const g = 1 - smooth(0.75, 1, p);
          for (let j = a; j <= b; j++) for (let i = Math.floor(xf[j] - 2); i <= Math.ceil(xf[j] + 2); i++) {
            const d = Math.abs(i - xf[j]);
            if (d < 2) heat[j * N + i] = Math.max(heat[j * N + i], g * (1 - d / 2.4));
          }
        }
        if (fluid) vents.push({ kind: 'fissure', y0: a, y1: b, s: 1 - smooth(0.75, 1, p), f });
        else for (const L of lobes) if (L.f === f) vents.push({ kind: 'spot', x: L.x, y: L.y, s: 1 - smooth(0.75, 1, p), f });
      }
    }
    // 틈이 막 갈라질 때: 첫 흐름보다 조금 먼저 틈을 따라 빛이 보인다.
    if (t > T_ERUPT && t < FLOW0 + FLOW_DUR) {
      const g = smooth(T_ERUPT, FLOW0, t) * (t < FLOW0 + 1 ? 1 : 1 - smooth(FLOW0 + 1, FLOW0 + FLOW_DUR, t));
      for (let j = FISSURE_Y[0]; j <= FISSURE_Y[1]; j++) for (let i = Math.floor(xf[j] - 1); i <= Math.ceil(xf[j] + 1); i++) {
        const k = j * N + i, d = Math.abs(i - xf[j]);
        if (d < 1.2) heat[k] = Math.max(heat[k], g * (1 - d / 1.2));
      }
      if (t < FLOW0) vents.push({ kind: 'fissure', y0: FISSURE_Y[0] + 20, y1: FISSURE_Y[1] - 30, s: 0.35 * g, f: -1 });
    }
    const last = top[NF - 1];
    // 호수와 그 바닥을 메우는 흙과 모래
    wl.fill(-1e9); sed.fill(-1e9);
    const fill = m.lakeFill();
    for (const L of lakes) {
      const w = Math.min(L.level, last[L.dam] - 1.5);
      for (const k of L.cells) {
        if (w > zo[k]) wl[k] = w;
        if (fill > 0) sed[k] = zo[k] + (sedF[k] - zo[k]) * fill;
      }
    }
    // 분석구
    const cg = m.coneGrow();
    for (let k = 0; k < size; k++) {
      cone[k] = coneShape(k, cg);
      lava[k] = last[k] - zo[k];
      zp[k] = Math.max(last[k], sed[k]) + cone[k];
      // 분석구: 화구 둘레만 빛난다. 쌓인 스코리아는 금방 식어 검붉다.
      if (cone[k] > 0.5 && cg < 1) {
        const dx = (k % N) - coneX, dy = ((k / N) | 0) - CONE.y, r = Math.sqrt(dx * dx + dy * dy);
        heat[k] = Math.max(heat[k], 0.85 * clamp(1 - r / (CONE.cr * 1.15)) * (1 - smooth(0.85, 1, cg)));
      }
    }
    if (cg > 0 && t < T_CONE + CONE_DUR) vents.push({ kind: 'cone', x: coneX, y: CONE.y, s: 1 - smooth(0.85, 1, cg) });
    // 협곡: 협곡 바닥은 옛 땅 겉(자갈층 윗면)보다 CUT_BELOW만큼 낮아질 때까지 깎인다.
    const P = incP(t);
    z.set(zp);
    if (P > 0) {
      for (let j = 0; j < N; j++) {
        const df = depthF(P, j);
        if (df <= 0) continue;
        for (let i = Math.floor(xc[j] - CW); i <= Math.ceil(xc[j] + CW); i++) {
          if (!isCanyon(i, j)) continue;
          const k = j * N + i, floorT = floorAt(k);
          if (zp[k] > floorT) z[k] = zp[k] - df * (zp[k] - floorT);
        }
      }
    }
    // 폭포: 협곡이 지류 합류점에서 충분히 깊어지면 지류가 대지 높이에서 떨어진다. 그 뒤 폭포는 두부 침식으로 상류로 물러나며 좁은 골짜기를 판다.
    falls = []; slots = [];
    TRIBS.forEach((tr, ti) => {
      const j = tr.yc, kc = j * N + Math.round(xc[j]);
      // 폭포 아래 웅덩이는 협곡 바닥보다 1.5m 높다. 그 위로 FALL_DROP보다 높이 떨어질 때만 폭포라고 한다.
      const drop = zp[kc] - z[kc] - 1.5;
      if (drop <= FALL_DROP) return;
      const R = tr.rmax * clamp((P - fallStart[ti]) / 0.5);
      const xw = xc[j] + tr.side * CW, xh = xw + tr.side * R;
      const floor = z[kc] + 1.5;
      slots.push({ ti, y: j, xw, xh, floor });
      for (let jj = Math.ceil(j - SW); jj <= Math.floor(j + SW); jj++) for (let i = 0; i < N; i++) {
        const inSlot = tr.side < 0 ? i > xh && i < xw + 0.5 : i < xh && i > xw - 0.5;
        if (!inSlot || Math.abs(jj - j) >= SW) continue;
        const k = jj * N + i;
        if (z[k] > floor) z[k] = floor;
      }
      // 폭포 꼭대기는 그 자리의 대지 높이
      const ih = tr.side < 0 ? Math.floor(xh) : Math.ceil(xh), kh = j * N + Math.max(0, Math.min(N - 1, ih));
      falls.push({ ti, x: xh, y: j, top: zp[kh], bottom: floor, retreatM: Math.round(R * CELL_M), drop: Math.round(zp[kh] - floor) });
    });
  }

  const bil = (arr, x, y) => {
    const u = clamp(x, 0, N - 1.001), v = clamp(y, 0, N - 1.001), i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j, k = j * N + i;
    return (arr[k] * (1 - a) + arr[k + 1] * a) * (1 - b) + (arr[k + N] * (1 - a) + arr[k + N + 1] * a) * b;
  };
  m.sample = (x, y) => bil(z, x, y);
  m.samplePre = (x, y) => bil(zp, x, y);
  m.bil = bil;
  m.rowAt = (arr, y) => { const v = clamp(y, 0, N - 1.001), j = Math.floor(v), b = v - j; return arr[j] * (1 - b) + arr[j + 1] * b; };

  m.phase = () => {
    const t = m.clock;
    if (m.finished) return 'done';
    if (t < T_ERUPT) return 'valley';
    if (t < T_FILL) return 'fissure';
    if (t < T_CANYON) return 'fill';
    if (t < T_TODAY) return 'canyon';
    return 'today';
  };

  // 이름표 자리. 그 지형이 실제로 있는 곳만 고른다. x, y는 칸, z는 높이(m)다. 옆면 이름표는 앞면(y = N - 1) 위에 놓는다.
  function computeSpots() {
    const out = {}, F = N - 1, ph = m.phase(), t = m.clock, { fluid } = opt(), late = ph === 'today' || ph === 'done';
    const fk = x => F * N + x;
    // 앞면: 기반암과 옛 하천 자갈층
    { const x = 10, k = fk(x); out.granite = { x, y: F, z: Math.max(m.bottom + 6, zo[k] - 40) }; }
    { const x = 118, k = fk(x); out.gneiss = { x, y: F, z: Math.max(m.bottom + 6, zo[k] - 40) }; }
    {
      // 자갈층: 앞면에서 자갈층이 두껍고, 위가 덮여도 보이는 곳
      let best = -1;
      for (let x = 40; x < 80; x++) { const k = fk(x); if (gt[k] > GRAVEL_M - 0.5 && (best < 0 || Math.abs(x - 50) < Math.abs(best - 50))) best = x; }
      if (best >= 0) { const k = fk(best); out.gravel = { x: best, y: F, z: zo[k] - gt[k] * 0.5 }; }
    }
    if (ph === 'valley' || (ph === 'fissure' && t < FLOW0 + 1)) {
      const j = 70, x = xo[j];
      out.oldRiver = { x, y: j, z: m.sample(x, j) };
      out.oldValley = { x: 74, y: 30, z: m.sample(74, 30) };
      const tr = TRIBS[0], p = tr.pts[1];
      out.trib = { x: p[0], y: p[1], z: m.sample(p[0], p[1]) };
    }
    if (ph === 'fissure' && t >= T_ERUPT) { const j = 56, x = xf[j]; out.fissure = { x, y: j, z: m.sample(x, j) }; }
    // 흐르는 용암: 지금 흐르는 흐름의 앞머리 가까이
    if (ph === 'fissure' || ph === 'fill') {
      let best = -1;
      for (let k = 0; k < size; k += 3) if (heat[k] > 0.55 && (best < 0 || heat[k] > heat[best] || (heat[k] === heat[best] && k > best))) best = k;
      if (best >= 0 && t < flowStart(NF - 1) + FLOW_DUR) { const x = best % N, y = (best / N) | 0; out.lava = { x, y, z: z[best] }; }
    }
    // 앞면의 용암층
    if (m.flowsStarted() >= 2) {
      let best = -1, th = 0;
      for (let x = 34; x < 80; x++) { const k = fk(x); if (lava[k] > th && !isCanyon(x, F)) { th = lava[k]; best = x; } }
      if (best >= 0 && th > 6) { const k = fk(best); out.layers = { x: best, y: F, z: zo[k] + th * 0.55 }; }
    }
    if (lakes.length) {
      // 물이 가장 넓은 호수
      let bestL = null, bestN = 0;
      for (const L of lakes) { let n = 0; for (const k of L.cells) if (wl[k] > Math.max(zo[k], sed[k]) + 0.4) n++; if (n > bestN) { bestN = n; bestL = L; } }
      if (bestL && bestN > 6) {
        let sx = 0, sy = 0, c = 0;
        for (const k of bestL.cells) if (wl[k] > Math.max(zo[k], sed[k]) + 0.4) { sx += k % N; sy += (k / N) | 0; c++; }
        const k = Math.round(sy / c) * N + Math.round(sx / c);
        out.lake = { x: sx / c, y: sy / c, z: Math.max(wl[k], z[k]) };
      }
    }
    if (m.coneGrow() > 0.3) { const k = CONE.y * N + coneX; out.cone = { x: coneX, y: CONE.y, z: z[k] + CONE.cd * 0.4 }; }
    // 스텝토: 용암이 둘러쌌는데 봉우리가 남은 경우
    { const k = KNOB.y * N + KNOB.x, ka = (KNOB.y + KNOB.r + 2) * N + KNOB.x; if (lava[ka] > 10 && zo[k] > top[NF - 1][ka] + 5) out.steptoe = { x: KNOB.x, y: KNOB.y, z: zo[k] }; }
    if (fluid && t > flowStart(NF - 1) + FLOW_DUR) {
      const j = 64, x = 46;
      out.plateau = { x, y: j, z: z[j * N + x] };
    }
    if (!fluid && m.flowsStarted() >= 3) {
      let best = -1;
      for (let k = 0; k < size; k++) if (lava[k] > 20 && (best < 0 || lava[k] > lava[best])) best = k;
      if (best >= 0) out.mound = { x: best % N, y: (best / N) | 0, z: z[best] };
    }
    // 낮은 능선을 넘은 용암
    { const j = 38, x = Math.round(xb[j] + 12), k = j * N + x; if (lava[k] > 3) out.divide = { x, y: j, z: z[k] }; }
    // 본류와 협곡
    const P = incP(t);
    if (t > flowStart(NF - 1) + FLOW_DUR && (ph === 'fill' || (ph === 'canyon' && P < 0.25))) { const j = 50, x = xc[j]; out.river = { x, y: j, z: m.sample(x, j) }; }
    if (P > 0.05) {
      // 협곡: 깊이 깎인 곳 가운데 앞쪽
      let bj = -1;
      for (let j = N - 4; j > 4; j -= 2) { const k = j * N + Math.round(xc[j]); if (zp[k] - z[k] > 10) { bj = j; break; } }
      if (bj >= 0) { const x = xc[bj] + 3, k = bj * N + Math.round(x); out.canyon = { x, y: bj, z: zp[k] }; }
      // 주상절리: 협곡 왼쪽 벽 가운데 높이(깊은 곳)
      let cj = -1, cd = 0;
      for (let j = 60; j < N - 6; j += 2) { const k = j * N + Math.round(xc[j]), d = zp[k] - z[k]; if (d > cd) { cd = d; cj = j; } }
      if (cj >= 0 && cd > 20 && lava[cj * N + Math.round(xc[cj])] > 20) { const k = cj * N + Math.round(xc[cj]); out.columns = { x: xc[cj] - CW, y: cj, z: z[k] + (zp[k] - z[k]) * 0.55 }; }
      // 협곡 바닥 가까이 드러난 자갈층
      const kf = fk(Math.round(xc[F]));
      if (z[kf] < zo[kf] - 1 && zp[kf] - z[kf] > 15) out.gravelCanyon = { x: xc[F] - CW, y: F - 0.5, z: zo[kf] - 2 };
    }
    if (falls.length) {
      const fa = falls.reduce((p, c) => (c.retreatM > p.retreatM ? c : p));
      out.fall = { x: fa.x, y: fa.y, z: fa.top };
    }
    if (late && m.paddyFrac() > 0.4) {
      const j = fluid ? 84 : 20, x = fluid ? 60 : 36, k = j * N + x;
      out.paddy = { x, y: j, z: z[k] };
    }
    return out;
  }
  m.spots = () => spotCache;

  function round() {
    m.clock = Math.round((m.clock + ROUND) * 1000) / 1000; roundNo++;
    update();
    m.version++;
    if (roundNo % 5 === 0) spotCache = computeSpots();
    if (m.clock >= T_END - 1e-9) { m.finished = true; spotCache = computeSpots(); }
  }
  m.setOption = (name, v) => { m.options[name] = v; };
  m.applyPreset = name => { Object.assign(m.options, PRESETS[name]); m.reset(); };
  let grounded = false;
  m.reset = () => {
    if (!grounded) { buildGround(); grounded = true; }
    const key = `${m.options.visc}:${m.options.volume}`;
    if (key !== builtKey) { buildLava(); buildFalls(); builtKey = key; }
    else buildFalls();
    roundNo = 0; carry = 0; m.clock = 0; m.finished = false;
    update();
    m.version++;
    spotCache = computeSpots();
  };
  m.tick = seconds => {
    if (m.finished) return;
    carry += seconds;
    while (carry >= ROUND - 1e-9 && !m.finished) { carry -= ROUND; round(); }
  };
  m.reset();
  return m;
}

// 단면: 블록 앞면(y = N - 1)을 왼쪽(A)에서 오른쪽(B)으로 자른다. 골짜기와 협곡을 가로지른다.
export function sectionLine(samples = N) {
  const pts = [];
  for (let t = 0; t < samples; t++) pts.push([((N - 1) * t) / (samples - 1), N - 1]);
  return pts;
}

const slopeAt = (z, i, j) => {
  const i0 = Math.max(0, i - 1), i1 = Math.min(N - 1, i + 1), j0 = Math.max(0, j - 1), j1 = Math.min(N - 1, j + 1);
  const sx = (z[j * N + i1] - z[j * N + i0]) / ((i1 - i0) * CELL_M), sy = (z[j1 * N + i] - z[j0 * N + i]) / ((j1 - j0) * CELL_M);
  return Math.sqrt(sx * sx + sy * sy);
};

// 막대와 판정 문구를 한 번에 만든다. 화면의 숫자와 문구가 같은 집계에서 나온다.
export function plateauReport(m) {
  const ph = m.phase(), fluid = m.options.visc === 'fluid', F = N - 1;
  let lavaM = 0, flat = 0, canyonM = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i, th = m.lava[k];
    lavaM = Math.max(lavaM, th);
    if (th > 3 && slopeAt(m.z, i, j) < FLAT_SLOPE) flat++;
    if (m.isCanyon(i, j)) canyonM = Math.max(canyonM, m.zp[k] - m.z[k]);
  }
  lavaM = Math.round(lavaM);
  canyonM = Math.round(canyonM);
  const flatKm2 = Math.round((flat * CELL_M * CELL_M) / 100000) / 10;
  const layers = m.flowsStarted();
  const falls = m.falls();
  let retreatM = 0;
  for (const f of falls) retreatM = Math.max(retreatM, f.retreatM);
  let lakes = 0;
  for (const L of m.lakes()) { let n = 0; for (const k of L.cells) if (m.wl[k] > Math.max(m.zo[k], m.sed[k]) + 0.4) n++; if (n > 6) lakes++; }
  const coneM = Math.round(m.coneGrow() * 55);
  const kd = 38 * N + Math.round(m.xb[38] + 12), spill = m.lava[kd] > 3;
  const kf = F * N + Math.round(m.xc[F]), gravelShown = m.z[kf] < m.zo[kf] - 1;
  const plateau = fluid && flatKm2 >= PLATEAU_KM2;
  const paddy = (ph === 'today' || ph === 'done') && m.paddyFrac() > 0.4;
  const parts = [];
  if (ph === 'valley' || layers === 0) {
    parts.push('아직 용암이 나오지 않았습니다. 넓은 골짜기 바닥에 옛 하천이 쌓은 자갈과 모래층이 있고, 양쪽 산지에서 지류가 흘러듭니다.');
  } else {
    const going = ph === 'fissure' || ph === 'fill';
    parts.push(`용암층 ${layers}장이 쌓였고 가장 두꺼운 곳은 약 ${lavaM}m입니다.`);
    if (fluid) {
      if (flatKm2 >= 0.1) parts.push(`용암이 덮은 평평한 땅은 약 ${flatKm2}km²입니다.`);
      if (plateau && !going) parts.push('골짜기가 메워져 평평한 용암대지가 되었습니다.');
      if (spill) parts.push('용암이 낮은 능선(분수계)을 넘어 옆 골짜기까지 덮었습니다.');
      if (lakes) parts.push(`지류 입구가 용암에 막혀 호수 ${lakes}개가 생겼습니다.`);
    } else {
      parts.push(`끈적한 용암은 멀리 흐르지 못하고 갈라진 틈 둘레에 두껍게 쌓여 울퉁불퉁한 언덕이 되었습니다. 평평한 용암대지는 생기지 않았습니다${flatKm2 >= 0.1 ? `(용암이 덮은 평평한 땅 약 ${flatKm2}km²)` : ''}.`);
    }
    if (coneM >= 10) parts.push(`분출 끝 무렵 한 곳에서 터지는 분출로 높이 약 ${coneM}m의 분석구가 ${m.coneGrow() < 1 ? '쌓이고 있습니다' : '생겼습니다'}.`);
    if (canyonM >= 10) {
      if (fluid) {
        parts.push(`본류가 용암대지를 약 ${canyonM}m 깊이로 깎아 좁고 깊은 협곡이 ${ph === 'canyon' ? '되어 갑니다' : '되었습니다'}.`);
        if (gravelShown) parts.push('협곡 바닥 가까이 옛 하천 자갈층이 드러났습니다.');
        else if (m.options.erode === 'short') parts.push('강이 깎은 시간이 짧아 아직 옛 골짜기 바닥까지 깎지 못했습니다.');
      } else parts.push(`본류는 용암 언덕 옆 옛 골짜기 바닥을 흐르며 약 ${canyonM}m 깎았습니다.`);
    } else if (!fluid && m.clock > T_CANYON) parts.push('본류는 용암 언덕 옆으로 비켜 옛 골짜기 바닥을 흐릅니다. 깊은 협곡은 생기지 않았습니다.');
    if (falls.length) parts.push(`지류는 대지 높이에 남아 협곡으로 떨어지는 폭포가 되었고, ${retreatM >= 30 ? `가장 많이 물러난 폭포는 합류점에서 상류로 약 ${retreatM}m 물러났습니다` : '폭포는 아직 거의 물러나지 않았습니다'}.`);
    if (paddy) parts.push(fluid ? '평평한 대지 위는 논이 되었습니다.' : '남은 골짜기 바닥에 논이 생겼습니다.');
  }
  return { lavaM, layers, flatKm2, canyonM, retreatM, falls: falls.length, lakes, coneM, spill, gravelShown, plateau, paddy, text: parts.join(' ') };
}

export function noteText(m) {
  const ph = m.phase(), r = plateauReport(m), fluid = m.options.visc === 'fluid';
  if (ph === 'valley') return '화강암과 편마암 산지 사이에 넓은 골짜기가 있습니다(추가령 구조곡 같은 곳). 골짜기 바닥에는 옛 하천이 실어 온 둥근 자갈과 모래가 쌓여 있습니다(전곡의 백의리층 같은 층). 양쪽 산지에서 지류가 흘러들어 옵니다.';
  if (ph === 'fissure') return fluid
    ? '땅이 골짜기 방향으로 길게 갈라지고, 그 틈을 따라 아주 묽은 현무암질 용암이 솟아 나옵니다(열하 분출). 묽은 용암은 낮은 곳을 따라 멀리 흘러 골짜기 바닥부터 채웁니다. 흐르는 동안 겉은 금방 굳어 검게 되지만, 갈라진 틈으로 붉은 속이 보입니다. 한 번 흐른 용암이 식은 뒤 다음 용암이 그 위를 덮어 층이 겹칩니다.'
    : '땅이 골짜기 방향으로 갈라져 용암이 나오지만, 끈적한 용암이라 멀리 흐르지 못하고 나온 자리 둘레에 두껍게 쌓입니다.';
  if (ph === 'fill') {
    let t = fluid
      ? '용암이 여러 번 흘러 층이 겹겹이 쌓이고, 낮은 곳부터 차올라 골짜기가 메워집니다. 겉이 거의 평평한 용암대지가 됩니다. 지류 입구는 용암에 막혀(용암댐) 지류 쪽에 물이 고여 호수가 생겼을 것으로 봅니다.'
      : '끈적한 용암은 층이 쌓여도 갈라진 틈 둘레에만 두꺼운 언덕을 이루고, 골짜기 가장자리는 메워지지 않습니다. 그래서 평평한 대지가 되지 않습니다.';
    if (m.coneGrow() > 0) t += ' 분출 끝 무렵에는 틈 전체가 아니라 한 곳에서 터지는 분출(중심 분출)로 바뀌어, 구멍 많은 붉은 돌(스코리아)이 쌓인 작은 분석구가 생깁니다(평강의 오리산 같은).';
    return t;
  }
  if (ph === 'canyon') return fluid
    ? '용암대지 위를 흐르던 본류가 하류 쪽부터 아래로 깎아 들어갑니다. 깎기 쉬운 길, 곧 용암과 옛 땅(기반암)의 경계와 옛 하천 퇴적층 가까이를 따라 파고들어, 대지 가장자리를 따라 굽이치는 좁고 깊은 협곡이 됩니다. 한쪽 절벽은 현무암이고 다른 쪽 절벽은 옛 기반암인 곳도 있습니다. 현무암 절벽에는 용암이 식으며 줄어들어 생긴 기둥 모양의 틈(주상절리)이 드러납니다. 막혔던 호수는 흙과 모래로 메워져 평평한 땅이 됩니다.'
    : '본류는 용암 언덕을 비켜 옛 골짜기 바닥을 흐릅니다. 용암이 골짜기를 메우지 않았으므로 깊은 협곡이 생기지 않습니다.';
  let t = r.text;
  if (fluid) {
    t += ' 물이 많은 본류는 협곡을 빨리 파지만 물이 적은 지류는 대지 높이에 남습니다. 그래서 지류가 본류와 만나는 곳에서 폭포가 되고, 폭포 아래가 깎이며 폭포는 조금씩 상류로 물러납니다(두부 침식). 연천의 재인폭포가 이런 폭포입니다.';
    t += ' 철원 평야처럼 용암대지 위가 논이 된 것은 둘레 화강암, 편마암 산지에서 흘러오는 하천으로 물이 넉넉하고, 대지 위에 강이 깐 기름진 퇴적층이 있으며, 저수지와 양수장으로 물을 더 댔기 때문입니다.';
    if (m.options.volume === 'small') t += ' 용암 양이 적어 골짜기 바닥만 메웠고, 낮은 능선은 넘지 못했습니다.';
    if (m.options.erode === 'short') t += ' 강이 깎은 시간이 짧아 협곡이 아직 얕고 폭포도 조금만 물러났습니다.';
    t += ' 협곡이 옛 땅과의 경계를 따라 생긴 까닭과 호수가 메워진 차례는 책의 설명을 따라 단순하게 정한 것이며, 짐작(추정)이 들어 있습니다.';
  } else {
    t += ' 끈적한 용암은 분출구 둘레에 두껍게 쌓여 언덕이나 용암원정구 같은 모양이 됩니다. 넓고 평평한 용암대지는 묽은 현무암질 용암일 때 생깁니다.';
  }
  return t;
}

// 묽은 용암과 끈적한 용암 비교: 왼쪽은 묽은 용암, 오른쪽은 끈적한 용암. 용암 양과 강이 깎은 시간은 같다.
export const COMPARE_RULE = '두 블록은 용암 양과 강이 깎은 시간이 같고, 용암의 끈끈함만 다릅니다.';
export function compareBrief(a, b) {
  const t = m => {
    const r = plateauReport(m);
    const flat = r.flatKm2 >= 0.1 ? `평평한 땅 약 ${r.flatKm2}km²` : '평평한 땅 거의 없음';
    const canyon = r.canyonM >= 10 ? `협곡 깊이 약 ${r.canyonM}m` : '깊은 협곡 없음';
    return `가장 두꺼운 용암 약 ${r.lavaM}m, ${flat}, ${canyon}`;
  };
  const ra = plateauReport(a), rb = plateauReport(b);
  const parts = [COMPARE_RULE];
  if (ra.layers >= NF && a.clock > T_CONE) {
    parts.push(ra.plateau ? '묽은 용암은 골짜기를 따라 멀리 흘러 낮은 곳부터 메워 평평한 용암대지가 되었습니다.' : '묽은 용암도 아직 평평한 대지를 다 만들지 못했습니다.');
    parts.push('끈적한 용암은 멀리 가지 못하고 틈 둘레에 두껍게 쌓여 울퉁불퉁한 언덕이 되었습니다.');
    if (ra.canyonM >= 10 && rb.canyonM < ra.canyonM) parts.push('협곡은 용암대지를 깎은 왼쪽에서만 깊게 생깁니다.');
  }
  return { a: t(a), b: t(b), extra: parts.join(' ') };
}
