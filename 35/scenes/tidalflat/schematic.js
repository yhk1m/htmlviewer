// © 2026 김용현
// 갯벌 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 조차가 작은 바다, 1은 밀물, 2는 썰물(갯벌이 드러남), 3은 방조제를 쌓은 뒤다. 단면은 만 가운데쯤(A-B선)을 육지에서 바다로 자른다.

export const ZONE_TEXT = {
  sandflat: { name: '모래 갯벌', text: '갯벌의 바깥, 바다 쪽에 있습니다. 밀물과 썰물의 물살이 세서 고운 진흙은 쓸려 가고 비교적 굵은 모래가 남습니다. 모래가 90% 넘게 차지하는 갯벌로, 사질 갯벌이라고도 합니다. 밟으면 단단합니다.' },
  mixedflat: { name: '혼합 갯벌', text: '모래 갯벌과 펄 갯벌 사이에 있고, 모래와 진흙이 섞여 있어 혼성 갯벌이라고도 합니다. 물살의 세기도 그 중간쯤입니다.' },
  mudflat: { name: '펄 갯벌', text: '만 안쪽, 육지 가까운 곳에 있습니다. 물살이 약하고 바닷물이 오래 머물러 아주 고운 진흙(펄)이 가라앉아 쌓였습니다. 점토와 실트 같은 고운 알갱이가 90% 넘게 차지하는 갯벌로, 이질 갯벌이라고도 합니다. 발이 푹푹 빠지고, 조개, 게, 갯지렁이 같은 생물이 많이 삽니다.' },
  marsh: { name: '염생 식물', text: '갯벌 가운데 가장 높아 큰 밀물 때만 잠기는 곳에는 짠물에 견디는 식물이 자랍니다. 강물과 바닷물이 섞이는 하구 쪽에는 갈대, 갯벌 위쪽에는 가을에 붉게 물드는 칠면초, 퉁퉁마디, 나문재 같은 식물이 많습니다. 이런 곳을 염생 습지라고 합니다. 식물이 물살을 늦추면 흙이 더 잘 쌓여 땅이 높아지고, 점점 육지처럼 변해 갑니다.' },
  creek: { name: '갯골', text: '갯벌 안에서 밀물과 썰물의 물살(조류)이 드나드는 물길입니다. 특히 썰물 때 빠져나가는 바닷물이 모여 흐르며 파냅니다. 갯골로 모여드는 더 작은 물길은 조류세곡이라고 합니다. 바다 쪽에서 육지 쪽으로 갈수록 가늘게 여러 갈래로 갈라져 나뭇가지 모양이 됩니다. 밀물 때는 바닷물이 이 길을 따라 먼저 들어옵니다.' },
  intertidal: { name: '조간대', text: '밀물 때 해수면과 썰물 때 해수면 사이의 땅입니다. 밀물 때는 잠기고 썰물 때는 드러납니다. 높이에 따라 물 밖에 드러나는 때가 긴 상부, 평균 해수면 근처인 중부, 잠기는 때가 긴 하부 조간대로 나눕니다. 갯벌(간석지)은 이 조간대에 생기므로, 조차가 크고 바닥의 경사가 완만할수록 넓어집니다.' },
  flood: { name: '밀물', text: '바닷물이 육지 쪽으로 들어와 해수면이 높아지는 흐름(창조류)입니다. 밀물로 물이 가장 높아진 때를 만조(고조)라고 합니다. 밀물과 썰물은 하루에 대략 두 번씩 번갈아 일어납니다. 밀물에 실려 온 고운 흙은 물살이 느려지는 만 안쪽에 가라앉습니다.' },
  ebb: { name: '썰물', text: '바닷물이 빠져나가 해수면이 낮아지는 흐름(낙조류)입니다. 썰물로 물이 가장 낮아진 때를 간조(저조)라고 하며, 이때 갯벌이 가장 넓게 드러납니다. 만조와 간조의 해수면 높이 차이를 조차라고 하는데, 서해안은 조차가 커서 인천은 약 8m에 이릅니다.' },
  range: { name: '조차', text: '만조(밀물로 물이 가장 높을 때)와 간조(썰물로 물이 가장 낮을 때)의 해수면 높이 차이를 조차라고 합니다. 서해안은 크고(인천 약 8m, 군산 약 6m), 남해안은 서쪽에서 동쪽으로 갈수록 작아지며(목포 약 4m, 여수 약 3m, 부산 약 1m), 동해안은 약 0.3m 이하로 아주 작습니다. 우리나라 갯벌 넓이의 약 83%가 서해안에 있습니다. 조차가 작으면 드러나는 땅이 좁아 갯벌이 거의 생기지 않습니다. 동해안은 파랑도 세서 고운 흙이 쌓이기 어렵습니다.' },
  dike: { name: '방조제', text: '바닷물이 들어오지 못하게 바다를 가로질러 쌓은 둑입니다. 안쪽으로 흘러드는 하천 물은 배수 갑문을 열어 바다로 내보냅니다.' },
  reclaimed: { name: '간척지', text: '방조제 안쪽 갯벌에서 바닷물을 빼고 소금기를 씻어 만든 땅입니다. 논, 산업 단지, 도시로 씁니다. 땅은 넓어지지만, 생물이 사는 곳, 어패류를 기르는 곳, 오염 물질을 걸러 내는 일, 홍수 때 물을 받아 주고 태풍과 해일 피해를 줄여 주는 일 같은 갯벌의 기능은 사라집니다. 해안선이 단조로워지고, 방조제 안 호수의 물이 더러워지기도 합니다.' },
  river: { name: '하천', text: '하천이 고운 흙(진흙과 아주 고운 모래)을 바다로 실어 옵니다. 이 흙이 갯벌을 만드는 재료가 됩니다. 하구에서는 강물과 바닷물이 섞입니다.' },
  sea: { name: '바다', text: '만 바깥의 바다입니다. 만은 양쪽이 육지로 둘러싸여 파랑이 약하므로, 고운 흙이 쓸려 가지 않고 쌓일 수 있습니다.' },
};

export const STAGE_NAMES = ['조차가 작은 바다', '밀물', '썰물', '방조제를 쌓은 뒤'];
export const SMALL_RANGE = 0, FLOOD = 1, EBB = 2, DIKE = 3;
export const NOTES = [
  '조차가 작은 바다: 동해안처럼 밀물과 썰물의 높이 차이(조차)가 약 0.3m 이하로 작으면, 썰물 때 드러나는 땅이 아주 좁아 갯벌이 거의 생기지 않습니다.',
  '밀물: 바닷물이 만 안쪽까지 들어와 갯벌을 덮습니다. 바닷물에 섞여 들어온 고운 흙은 물살이 느려지는 만 안쪽과 높은 곳에 가라앉습니다. 조차가 큰 곳에서는 바닷물이 아주 멀리까지 오르내립니다.',
  '썰물: 바닷물이 빠지면 넓은 갯벌이 드러납니다. 물살이 센 바깥에는 모래 갯벌, 물살이 약한 안쪽에는 펄 갯벌이 생기고, 빠져나가는 물이 모여 나뭇가지 모양의 갯골을 팝니다.',
  '방조제를 쌓은 뒤: 방조제로 바닷물을 막으면 안쪽 갯벌은 말라 간척지가 되고, 논이나 산업 단지로 쓰입니다. 땅은 넓어지지만 생물이 사는 곳, 오염 물질 정화, 홍수 때 물을 받아 주는 일 같은 갯벌의 기능은 사라집니다. 방조제 바깥 갯벌만 남습니다.',
];

const SEA = '#3f8fc4', LAND = '#5a7346', HILL = '#46603a', AIR = '#23302a', ROCK = '#57524b', ACCENT = '#e4b15a';
const CREEK = '#4a8fbd', RIVER = '#3d8fc9', GRAVEL = '#cdbf98', DIKE_C = '#9a978c', PADDY = '#95b85c', PADDY2 = '#86aa50';
const REED = '#e2d096', SALTWORT = '#c2506a';
export const BAND_COLOR = { marsh: '#7c8650', mudflat: '#776a5a', mixedflat: '#a8936f', sandflat: '#dcc690' };
const f1 = v => v.toFixed(1);

// 평면: 위쪽이 육지, 아래쪽이 바다다. 만은 가운데에 U자 모양으로 들어와 있다.
export const PLAN = { W: 720, H: 380 };
export const CX = 360;
const uOf = x => (x - CX) / 300;
// 육지의 끝(갯벌이 시작하는 곳)과 썰물 때 해안선. 만 양쪽 끝은 곶이라 두 선이 만난다.
// 육지 끝은 조금씩 들쭉날쭉하고, 만 안쪽은 넓고 평평하며 양쪽 곶으로 갈수록 빠르게 바다 쪽으로 나온다.
export const landEdge = x => { const u = uOf(x); return 84 + 150 * u * u + 140 * u ** 6 + 5 * Math.sin(x / 23) + 4 * Math.sin(x / 61 + 1.3); };
export const lowEdge = x => { const u = uOf(x); return 298 + 40 * u * u + 60 * u ** 6; };
// 갯벌의 띠: t=0은 육지 끝, t=1은 썰물 때 해안선. 띠 경계는 조금씩 물결친다(양 끝에서는 0).
export function shoreY(x, t) {
  const D = Math.max(0, lowEdge(x) - landEdge(x));
  const wob = t > 0 && t < 1 ? (D / 222) * 5 * Math.sin(x / 41 + t * 7) * Math.sin(Math.PI * t) : 0;
  return landEdge(x) + t * D + wob;
}
// 바다 쪽에서 육지 쪽으로: 모래 갯벌, 혼합 갯벌, 펄 갯벌, 가장 높은 곳에 염생 식물.
export const HIGH_T = 0.14, LOW_T = 1;
export const BANDS = [
  { zone: 'marsh', t0: 0, t1: HIGH_T },
  { zone: 'mudflat', t0: HIGH_T, t1: 0.45 },
  { zone: 'mixedflat', t0: 0.45, t1: 0.72 },
  { zone: 'sandflat', t0: 0.72, t1: LOW_T },
];
// 하천: 위에서 내려와 만 안쪽 끝으로 들어오고, 갯벌을 가로지르는 큰 갯골로 이어진다.
export const RIVER_X = 310;
export const DIKE_Y = 215; // 방조제(평면 y). 만을 곧게 가로지른다.
const dikeEnds = () => {
  const find = (a, b) => { for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if ((landEdge(m) > DIKE_Y) === (landEdge(a) > DIKE_Y)) a = m; else b = m; } return (a + b) / 2; };
  return [find(0, CX), find(PLAN.W, CX)];
};
export const GATE_X = 330; // 배수 갑문

// 점 몇 개를 부드럽게 잇는다(Catmull-Rom).
function smooth(pts, n = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const s = k / n, s2 = s * s, s3 = s2 * s;
      const c = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * s + (2 * a - 5 * b + 4 * c2 - d) * s2 + (-a + 3 * b - 3 * c2 + d) * s3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// 갯골: 바다 쪽(굵음)에서 육지 쪽(가늚)으로 갈라지며 자란다. 끝은 염생 식물대 아래에서 멈춘다.
function grow(x, y, ang, len, w, depth, segs) {
  ang = Math.max(-1.25, Math.min(1.25, ang)); // 갈래는 늘 육지 쪽(위)을 향한다
  const dx = Math.sin(ang), dy = -Math.cos(ang);
  let ex = x + dx * len, ey = y + dy * len;
  const lim = shoreY(ex, HIGH_T * 0.8);
  const stop = ey <= lim + 6;
  if (ey < lim) ey = lim;
  if (ey > y - 4) return; // 염생 식물대에 막혀 더 자랄 데가 없다
  const bend = (depth % 2 ? 1 : -1) * len * 0.16, mx = (x + ex) / 2 - dy * bend, my = (y + ey) / 2 + dx * bend;
  const pts = [];
  for (let k = 0; k <= 8; k++) { const s = k / 8; pts.push([(1 - s) ** 2 * x + 2 * s * (1 - s) * mx + s * s * ex, (1 - s) ** 2 * y + 2 * s * (1 - s) * my + s * s * ey]); }
  segs.push({ pts, w0: w, w1: w * 0.7 });
  if (depth > 0 && !stop) {
    grow(ex, ey, ang + 0.5, len * 0.7, w * 0.7, depth - 1, segs);
    grow(ex, ey, ang - 0.46, len * 0.74, w * 0.7, depth - 1, segs);
  }
}
let creekCache = null;
// 갯골 목록. 각 갈래는 바다 쪽 끝(w0)이 굵고 육지 쪽 끝(w1)이 가늘다.
export function creeks() {
  if (creekCache) return creekCache;
  const segs = [];
  // 하천이 이어진 큰 갯골: 하구(가늚)에서 바다(굵음)로. 바다 쪽을 앞에 두려고 뒤집는다.
  const main = smooth([[RIVER_X, landEdge(RIVER_X) + 2], [296, 128], [320, 176], [300, 226], [322, 272], [326, lowEdge(326) + 14]], 8).reverse();
  segs.push({ pts: main, w0: 13, w1: 6, main: true });
  // 큰 갯골 양옆의 작은 갈래
  for (const [i, side] of [[14, 1], [22, -1], [30, 1], [8, -1]]) { const [px, py] = main[i]; grow(px, py, side * 1.05, 30, 4.5, 2, segs); }
  for (const [x, ang, len] of [[190, 0.15, 62], [450, -0.06, 70], [565, -0.2, 58]]) grow(x, lowEdge(x) + 8, ang, len, 8.5, 3, segs);
  creekCache = segs;
  return segs;
}
// 가늘어지는 물길을 다각형으로 그린다.
function taper(seg) {
  const { pts, w0, w1 } = seg, L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const m = Math.hypot(nx, ny) || 1; nx /= m; ny /= m;
    const w = (w0 + (w1 - w0) * (i / (pts.length - 1))) / 2;
    L.push(`${f1(pts[i][0] + nx * w)} ${f1(pts[i][1] + ny * w)}`);
    R.unshift(`${f1(pts[i][0] - nx * w)} ${f1(pts[i][1] - ny * w)}`);
  }
  return `M${L.join('L')}L${R.join('L')}Z`;
}

// 평면 띠 하나(t0부터 t1까지)
function bandPath(t0, t1) {
  const top = [], bot = [];
  for (let x = 0; x <= PLAN.W; x += 6) { top.push(`${x} ${f1(shoreY(x, t0))}`); bot.unshift(`${x} ${f1(shoreY(x, t1))}`); }
  return `M${top.join('L')}L${bot.join('L')}Z`;
}
function linePath(t) {
  const p = [];
  for (let x = 0; x <= PLAN.W; x += 6) p.push(`${x} ${f1(shoreY(x, t))}`);
  return `M${p.join('L')}`;
}
// 염생 식물: 하구 쪽은 갈대(옅은 노란 줄기), 그 밖은 칠면초(붉은 포기).
function plants(t0 = 0.015, t1 = HIGH_T - 0.02, clipY = 0) {
  let reeds = '', wort = '';
  for (let x = 14, n = 0; x < PLAN.W - 10; x += 11, n++) {
    for (const [k, tt] of [[0, 0.35], [1, 0.8]]) {
      const t = t0 + (t1 - t0) * tt, jx = x + ((n * 7 + k * 5) % 9) - 4, y = shoreY(jx, t) + ((n * 3 + k) % 3) - 1;
      if (y > PLAN.H - 4 || lowEdge(jx) - landEdge(jx) < 30 || y < clipY) continue;
      if (Math.abs(jx - RIVER_X) < 74) reeds += `<path d="M${f1(jx)} ${f1(y)}l-2.4 -6M${f1(jx)} ${f1(y)}l0 -7.5M${f1(jx)} ${f1(y)}l2.4 -6"/>`;
      else if ((n + k) % 2 === 0) wort += `<circle cx="${f1(jx)}" cy="${f1(y)}" r="1.9"/><circle cx="${f1(jx + 3)}" cy="${f1(y + 1)}" r="1.5"/><circle cx="${f1(jx + 1.5)}" cy="${f1(y - 2)}" r="1.4"/>`;
    }
  }
  return `<g stroke="${REED}" stroke-width="1.3" stroke-linecap="round" fill="none">${reeds}</g><g fill="${SALTWORT}">${wort}</g>`;
}
// 밀물과 썰물의 방향을 보이는 작은 화살표(위로 = 육지 쪽)
const chevron = (x, y, up, color = '#ffffff') => `<path d="M${x - 7} ${y + (up ? 5 : -5)}L${x} ${y + (up ? -4 : 4)}L${x + 7} ${y + (up ? 5 : -5)}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;

// 단면 자리: 평면의 세로선 x=AB_X를 A(위)에서 B(아래)로 자른다.
export const AB_X = 430, AB_Y0 = 44, AB_Y1 = 362;
export const SEC = { W: 720, H: 300, hi: 112, lo: 196, land: 100, paddy: 116, dikeTop: 96 };
// 단계별 밀물 때와 썰물 때 해수면(단면 y, 위가 작다). 조차가 작은 바다는 두 선이 거의 붙어 있다.
export const TIDE = [{ hi: 118, lo: 125 }, { hi: SEC.hi, lo: SEC.lo }, { hi: SEC.hi, lo: SEC.lo }, { hi: SEC.hi, lo: SEC.lo }];
export const secX = y => ((y - AB_Y0) / (AB_Y1 - AB_Y0)) * SEC.W;
// 평면 y를 A-B선 위의 t로 바꾼다(shoreY의 거꿀).
export function tAt(y) {
  const y0 = landEdge(AB_X), D = lowEdge(AB_X) - y0;
  if (y <= y0) return (y - y0) / D;
  if (y >= lowEdge(AB_X)) return 1 + (y - lowEdge(AB_X)) / D;
  let a = 0, b = 1;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (shoreY(AB_X, m) < y) a = m; else b = m; }
  return (a + b) / 2;
}
export const tToSecX = t => secX(t <= 0 || t >= 1 ? landEdge(AB_X) + t * (lowEdge(AB_X) - landEdge(AB_X)) : shoreY(AB_X, t));
// 땅 높이(단면 y). 갯벌은 밀물 때 해수면(t=HIGH_T)에서 썰물 때 해수면(t=LOW_T)까지 완만하게 내려간다.
// 조차가 작은 바다는 갯벌이 없어 바닷가가 곧바로 깊어진다.
export function groundY(t, stage = EBB) {
  if (t < 0) return SEC.land + t * 200;
  if (stage === SMALL_RANGE) return Math.min(250, SEC.land + t * 375) + Math.max(0, t - 0.4) * 10;
  if (t < HIGH_T) return SEC.land + (t / HIGH_T) * (SEC.hi - SEC.land);
  if (t <= LOW_T) return SEC.hi + ((t - HIGH_T) / (LOW_T - HIGH_T)) * (SEC.lo - SEC.hi);
  return SEC.lo + (t - LOW_T) * 196;
}
// 수면이 땅과 만나는 t
export function tCross(level, stage) {
  let a = -0.3, b = 2;
  for (let i = 0; i < 50; i++) { const m = (a + b) / 2; if (groundY(m, stage) < level) a = m; else b = m; }
  return (a + b) / 2;
}
// 방조제 자리(단면 x)와 발치의 반폭
export const DIKE_SX = secX(DIKE_Y), DIKE_HALF = 40;
// A-B선이 갯골을 지나는 곳(단면 x와 폭)
export function creekCrossings() {
  const out = [];
  for (const seg of creeks()) {
    const { pts, w0, w1 } = seg;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      if ((ax - AB_X) * (bx - AB_X) > 0 || ax === bx) continue;
      const s = (AB_X - ax) / (bx - ax), y = ay + (by - ay) * s, w = w0 + (w1 - w0) * ((i + s) / (pts.length - 1));
      out.push({ sx: secX(y), y, w });
      break;
    }
  }
  return out.sort((p, q) => p.sx - q.sx);
}
// 단계마다 보여 주는 때의 바닷물: 단면에서 x0부터 오른쪽(바다 쪽)까지 level 높이로 찬다.
export function seaWater(stage) {
  const level = stage === FLOOD ? TIDE[stage].hi : TIDE[stage].lo;
  let x0 = tToSecX(tCross(level, stage));
  if (stage === DIKE) x0 = Math.max(x0, DIKE_SX + DIKE_HALF * 0.5);
  return { level, x0 };
}

function plan(stage) {
  const L = (zone, text, x, y, color = '#f3f1ea', size = 18) => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  const plain = (text, x, y, color = '#f3f1ea', size = 16) => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5">${text}</text>`;
  const W = PLAN.W, H = PLAN.H;
  let body = `<rect width="${W}" height="${H}" fill="${LAND}"/><path d="M0 0H${W}V30C560 44 420 22 300 36C190 48 90 30 0 40Z" fill="${HILL}"/>`;
  const seaBelow = t => `<path d="${linePath(t)}L${W} ${H}L0 ${H}Z" fill="${SEA}"/>`;
  const river = `<path d="M338 0C318 22 346 44 ${RIVER_X} ${f1(landEdge(RIVER_X) + 3)}" fill="none" stroke="${RIVER}" stroke-width="6" stroke-linecap="round"/>`;
  const creekSvg = (op = 1) => `<g fill="${CREEK}" opacity="${op}">${creeks().map(s => `<path${s.main ? ' data-main="1"' : ''} d="${taper(s)}"/>`).join('')}</g>`;
  let names = '';
  if (stage === SMALL_RANGE) {
    const ta = tCross(TIDE[0].hi, 0), tb = tCross(TIDE[0].lo, 0);
    body += seaBelow(0) + `<path d="${bandPath(0, ta)}" fill="${LAND}"/><path data-strip="1" d="${bandPath(ta, tb + 0.02)}" fill="${GRAVEL}"/>`;
    body += river + `<path d="M${RIVER_X} ${f1(landEdge(RIVER_X))}l1 14" stroke="${RIVER}" stroke-width="6" stroke-linecap="round"/>`;
    for (let i = 0; i < 4; i++) body += `<path d="M${90 + i * 30} ${H - 6 - i * 26}Q${CX} ${H - 70 - i * 26} ${630 - i * 30} ${H - 6 - i * 26}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.55"/>`;
    names += plain('조차가 작아 갯벌이 거의 없음', CX - 20, 225, '#d8efff', 18);
    // 조차 이름표는 두 해안선 사이의 좁은 띠를 가리킨다.
    const px = 596, py = shoreY(px, (ta + tb) / 2);
    names += `<path d="M${px} ${f1(py + 2)}L${px - 22} ${f1(py + 36)}" stroke="#ffe7a8" stroke-width="1.8"/><circle cx="${px}" cy="${f1(py)}" r="3" fill="none" stroke="#ffe7a8" stroke-width="1.6"/>`;
    names += L('range', '조차 약 0.3m 이하', px - 50, py + 54, '#ffe7a8', 17);
    names += plain('좁은 바닷가', 196, shoreY(196, tb) + 22, GRAVEL, 15);
  } else {
    const inner = stage === DIKE;
    const clip = inner ? ` clip-path="url(#tf-out)"` : '';
    let flats = BANDS.map(b => `<path data-band="${b.zone}" d="${bandPath(b.t0, b.t1)}" fill="${BAND_COLOR[b.zone]}"/>`).join('');
    // 펄 갯벌 위의 잔물결 무늬와 모래 갯벌의 물결 자국
    let ripples = '';
    for (let x = 40, n = 0; x < W - 30; x += 46, n++) {
      for (const t of [0.6, 0.85]) {
        const y = shoreY(x + (n % 2) * 18, t);
        if (y < H - 6 && lowEdge(x) - landEdge(x) > 40) ripples += `<path d="M${f1(x + (n % 2) * 18 - 8)} ${f1(y)}q4 -3 8 0t8 0" fill="none" stroke="${t > 0.7 ? '#c2ab74' : '#94805e'}" stroke-width="1.2"/>`;
      }
    }
    flats += ripples + plants(0.015, HIGH_T - 0.02, inner ? DIKE_Y + 6 : 0) + creekSvg();
    body += `<defs><clipPath id="tf-out"><rect x="0" y="${DIKE_Y + 3}" width="${W}" height="${H}"/></clipPath></defs>`;
    body += `<g${clip}>${flats}</g>`;
    body += river;
    if (stage === FLOOD) {
      body += `<path d="${bandPath(HIGH_T, 2)}" fill="${SEA}" opacity="0.8"/>${seaBelow(LOW_T)}`;
      body += `<path data-high="1" d="${linePath(HIGH_T)}" fill="none" stroke="#d8efff" stroke-width="2.2"/>`;
      for (const [x, y] of [[190, 270], [450, 236], [565, 280], [300, 300], [250, 196], [520, 190]]) body += chevron(x, y, true);
      names += L('flood', '밀물 때 해안선', 128, shoreY(128, HIGH_T) - 14, '#d8efff', 17);
      names += L('intertidal', '바닷물에 잠긴 갯벌', 540, 248, '#d8efff');
    } else {
      body += seaBelow(LOW_T);
      if (!inner) body += `<path data-high="1" d="${linePath(HIGH_T)}" fill="none" stroke="#d8efff" stroke-width="2" stroke-dasharray="6 5"/>`;
      body += `<path data-low="1" d="${linePath(LOW_T)}" fill="none" stroke="#d8efff" stroke-width="2.2"/>`;
      if (!inner) for (const [x, y] of [[193, 300], [449, 284], [560, 310]]) body += chevron(x, y, false, '#d8efff');
      names += L('ebb', '썰물 때 해안선', 214, lowEdge(214) + 24, '#d8efff', 17);
    }
    if (inner) {
      const [e0, e1] = dikeEnds();
      const edge = [];
      for (let x = Math.ceil(e0); x <= e1; x += 4) edge.push(`${x} ${f1(landEdge(x))}`);
      body += `<defs><clipPath id="tf-in"><path d="M${f1(e0)} ${DIKE_Y}L${edge.join('L')}L${f1(e1)} ${DIKE_Y}Z"/></clipPath></defs>`;
      let fields = '';
      for (let y = 72, r = 0; y < DIKE_Y; y += 24, r++) for (let x = 60, c = 0; x < 660; x += 40, c++) fields += `<rect x="${x}" y="${y}" width="40" height="24" fill="${(r * 3 + c * 5) % 4 ? PADDY : PADDY2}" stroke="#71913f" stroke-width="1.2"/>`;
      body += `<g data-reclaimed="1" clip-path="url(#tf-in)"><rect x="0" y="0" width="${W}" height="${DIKE_Y + 2}" fill="#7f9a4c"/>${fields}`;
      body += `<path d="M200 0V${DIKE_Y}M490 0V${DIKE_Y}M120 ${DIKE_Y - 12}H600" stroke="${CREEK}" stroke-width="3" fill="none"/></g>`;
      // 하천은 간척지를 지나 배수 갑문으로 바다에 나간다.
      body += `<path d="M${RIVER_X} ${f1(landEdge(RIVER_X) + 2)}C${RIVER_X} 140 ${GATE_X} 160 ${GATE_X} ${DIKE_Y}" fill="none" stroke="${RIVER}" stroke-width="5"/>`;
      body += `<path data-dike="1" d="M${f1(e0 - 10)} ${DIKE_Y}H${f1(e1 + 10)}" stroke="${DIKE_C}" stroke-width="8" stroke-linecap="round"/><path d="M${f1(e0 - 10)} ${DIKE_Y - 3}H${f1(e1 + 10)}" stroke="#c9c6ba" stroke-width="1.6"/>`;
      body += `<rect x="${GATE_X - 9}" y="${DIKE_Y - 7}" width="18" height="14" rx="2" fill="#5d6a72" stroke="#d8efff" stroke-width="1.4"/>`;
      names += L('dike', '방조제', 560, DIKE_Y - 10, '#f0ead6');
      names += plain('배수 갑문', GATE_X, DIKE_Y + 26, '#d8efff', 14);
      names += L('reclaimed', '간척지(논)', 410, 150, '#f6f2c8');
      names += L('mixedflat', '혼합 갯벌', 236, shoreY(236, 0.66) + 8, '#f6ead0', 16);
      names += L('sandflat', '모래 갯벌', 520, shoreY(520, 0.87) + 6, '#3b3020', 16).replace('stroke="#1c211e"', 'stroke="#f3e6c0"');
      names += L('creek', '갯골', 610, 274, '#d8efff', 16);
    } else {
      // 이름은 띠 위에 바로 얹는다.
      names += L('marsh', '염생 식물', 548, landEdge(548) - 10, '#f2c9d2', 16);
      names += L('marsh', '갈대', 236, landEdge(236) - 10, REED, 15);
      if (stage === EBB) {
        names += L('mudflat', '펄 갯벌', 530, shoreY(530, 0.3) + 6);
        names += L('mixedflat', '혼합 갯벌', 222, shoreY(222, 0.6) + 6, '#f6ead0', 17);
        names += L('sandflat', '모래 갯벌', 520, shoreY(520, 0.87) + 6, '#3b3020', 17).replace('stroke="#1c211e"', 'stroke="#f3e6c0"');
        names += L('creek', '갯골', 354, 272, '#d8efff', 16);
        names += L('flood', '밀물 때 해안선', 118, shoreY(118, HIGH_T) - 12, '#d8efff', 15);
      }
    }
  }
  names += L('river', '하천', 372, 22, '#d8efff', 17) + L('sea', '바다', 640, H - 12, '#ffffff');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 본 만과 갯벌. ${STAGE_NAMES[stage]} 단계이다. 위쪽이 육지, 아래쪽이 바다다.">
    ${body}
    <line x1="${AB_X}" y1="${AB_Y0}" x2="${AB_X}" y2="${AB_Y1}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/>
    <text x="${AB_X + 8}" y="${AB_Y0 + 6}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${AB_X + 8}" y="${AB_Y1 + 4}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
  </svg>`;
}

function section(stage) {
  const { W, H } = SEC;
  const say = (zone, text, x, y, color = '#f3f1ea', size = 19) => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  const plain = (text, x, y, color = '#f3f1ea', size = 15, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
  const cross = stage === SMALL_RANGE ? [] : creekCrossings().filter(c => stage !== DIKE || c.sx > DIKE_SX + DIKE_HALF);
  const notch = sx => { let d = 0; for (const c of cross) { const hw = c.w * 1.4 + 5; d += (4 + c.w * 1.1) * Math.max(0, 1 - Math.abs(sx - c.sx) / hw); } return d; };
  const tOfSx = sx => tAt(AB_Y0 + (sx / W) * (AB_Y1 - AB_Y0));
  const gy = sx => groundY(tOfSx(sx), stage) + notch(sx);
  const ground = [];
  for (let sx = 0; sx <= W; sx += 3) ground.push([sx, gy(sx)]);
  const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
  const tide = TIDE[stage], water = seaWater(stage);
  let back = '', extra = '', names = '';
  // 바닷물: 수면에서 아래로 채우고, 땅이 그 위를 덮는다.
  back += `<rect data-sea="1" x="${f1(water.x0)}" y="${water.level}" width="${f1(W - water.x0)}" height="${H - water.level}" fill="${SEA}"/>`;
  // 썰물 때 갯골 바닥에는 물이 조금 남는다.
  if (stage === EBB || stage === DIKE) for (const c of cross) if (c.sx < water.x0) { const hw = c.w * 1.4 + 5; back += `<rect x="${f1(c.sx - hw)}" y="${f1(gy(c.sx) - (4 + c.w * 1.1) * 0.45)}" width="${f1(hw * 2)}" height="30" fill="${CREEK}"/>`; }
  if (stage === SMALL_RANGE) {
    const ta = tCross(tide.hi, 0), tb = tCross(tide.lo, 0);
    extra += `<path d="M${f1(tToSecX(ta))} ${tide.hi}L${f1(tToSecX(tb))} ${tide.lo}" stroke="${GRAVEL}" stroke-width="5"/>`;
    names += say('range', '조차가 아주 작음', 330, tide.hi - 40, '#ffe7a8');
    names += plain('갯벌이 거의 없음', 470, 200, '#d8efff', 18);
  } else {
    // 갯벌 흙(띠마다 색이 다르다). 두께는 바다 쪽 끝에서 얇아진다.
    for (const b of BANDS) {
      const x0 = tToSecX(b.t0), x1 = tToSecX(b.t1) + (b.zone === 'sandflat' ? 70 : 0), top = ground.filter(([x]) => x >= x0 - 1.5 && x <= x1 + 1.5);
      const th = x => (b.zone === 'marsh' ? 10 : 20) * (b.zone === 'sandflat' ? Math.max(0.15, Math.min(1, (x1 - x) / 90)) : 1);
      extra += `<polygon data-sband="${b.zone}" points="${pts(top)} ${pts(top.slice().reverse().map(([x, y]) => [x, y + th(x)]))}" fill="${BAND_COLOR[b.zone]}"/>`;
    }
    // 염생 식물 포기(A-B선 근처는 칠면초)
    const m0 = tToSecX(0.01), m1 = tToSecX(HIGH_T - 0.01);
    let tuft = '';
    if (stage !== DIKE) for (let sx = m0 + 4; sx < m1; sx += 9) { const y = gy(sx); tuft += `<circle cx="${f1(sx)}" cy="${f1(y - 3)}" r="2.6"/><circle cx="${f1(sx + 3)}" cy="${f1(y - 6)}" r="2"/><path d="M${f1(sx)} ${f1(y)}v-4" stroke="#7c8650" stroke-width="1.4"/>`; }
    extra += `<g fill="${SALTWORT}">${tuft}</g>`;
  }
  if (stage === DIKE) {
    // 방조제 안쪽: 땅을 고르게 메워 논을 만들었다. 바닷물은 들어오지 않는다.
    const a = tToSecX(tCross(SEC.paddy, DIKE)), b = DIKE_SX;
    const fill = ground.filter(([x]) => x >= a && x <= b);
    extra += `<polygon data-paddy="1" points="${f1(a)},${SEC.paddy} ${f1(b)},${SEC.paddy} ${pts(fill.slice().reverse().map(([x, y]) => [x, Math.max(y, SEC.paddy)]))}" fill="#8a7658"/>`;
    extra += `<rect x="${f1(a)}" y="${SEC.paddy - 3}" width="${f1(b - a)}" height="5" fill="${PADDY}"/>`;
    let rice = '';
    for (let sx = a + 6; sx < b - 4; sx += 12) rice += `<path d="M${f1(sx)} ${SEC.paddy - 3}l-2 -6M${f1(sx)} ${SEC.paddy - 3}l0 -7M${f1(sx)} ${SEC.paddy - 3}l2 -6"/>`;
    extra += `<g stroke="#b6d47a" stroke-width="1.3" stroke-linecap="round">${rice}</g>`;
    const foot = gy(DIKE_SX);
    extra += `<polygon data-dike="1" points="${f1(DIKE_SX - DIKE_HALF)},${f1(foot + 4)} ${f1(DIKE_SX - 9)},${SEC.dikeTop} ${f1(DIKE_SX + 9)},${SEC.dikeTop} ${f1(DIKE_SX + DIKE_HALF)},${f1(foot + 4)}" fill="${DIKE_C}" stroke="#c9c6ba" stroke-width="1.4"/>`;
    names += say('dike', '방조제', DIKE_SX, SEC.dikeTop - 12, '#f0ead6');
    names += say('reclaimed', '간척지(논)', (a + b) / 2, SEC.paddy - 22, '#f6f2c8');
    names += say('mixedflat', '혼합 갯벌', (DIKE_SX + DIKE_HALF + tToSecX(0.72)) / 2 + 6, gy((DIKE_SX + DIKE_HALF + tToSecX(0.72)) / 2) + 34, '#f6ead0', 16);
    names += say('sandflat', '모래 갯벌', (tToSecX(0.72) + tToSecX(1)) / 2, gy((tToSecX(0.72) + tToSecX(1)) / 2) + 34, '#f3e6c0', 16);
  } else if (stage !== SMALL_RANGE) {
    names += say('marsh', '염생 식물', (tToSecX(0) + tToSecX(HIGH_T)) / 2 - 6, SEC.land - 22, '#f2c9d2', 17);
    for (const b of BANDS.slice(1)) { const mx = (tToSecX(b.t0) + tToSecX(b.t1)) / 2; names += say(b.zone, ZONE_TEXT[b.zone].name, mx, gy(mx) + 36, b.zone === 'mudflat' ? '#f3f1ea' : '#f6ead0', 16); }
  }
  // 수면 선
  const hiX = tToSecX(tCross(tide.hi, stage)), loX = tToSecX(tCross(tide.lo, stage));
  if (stage === FLOOD) {
    extra += `<line data-hi="1" x1="${f1(hiX)}" x2="${W}" y1="${tide.hi}" y2="${tide.hi}" stroke="#d8efff" stroke-width="2.2"/>`;
    names += say('flood', '밀물 때 해수면', hiX + 150, tide.hi - 10, '#d8efff', 17);
    for (const x of [250, 610]) extra += `<path d="M${x - 14} ${tide.hi + 22}h24m-7 -6l7 6l-7 6" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180 ${x} ${tide.hi + 22})"/>`;
  } else {
    const hiFrom = stage === DIKE ? DIKE_SX + 9 : hiX;
    extra += `<line data-hi="1" x1="${f1(hiFrom)}" x2="${W}" y1="${tide.hi}" y2="${tide.hi}" stroke="#d8efff" stroke-width="2" stroke-dasharray="7 6"/>`;
    extra += `<line data-lo="1" x1="${f1(loX)}" x2="${W}" y1="${tide.lo}" y2="${tide.lo}" stroke="#d8efff" stroke-width="2.2"/>`;
    if (stage !== SMALL_RANGE) {
      names += say('flood', '밀물 때 해수면', stage === DIKE ? W - 200 : hiX + 120, tide.hi - 10, '#d8efff', 16);
      names += say('ebb', '썰물 때 해수면', W - 140, tide.lo - 10, '#d8efff', 16);
      // 조차: 오른쪽 끝에 두 수면의 높이 차
      extra += `<path d="M${W - 26} ${tide.hi + 4}V${tide.lo - 4}M${W - 32} ${tide.hi + 10}l6 -6l6 6M${W - 32} ${tide.lo - 10}l6 6l6 -6" stroke="#ffe7a8" stroke-width="2" fill="none"/>`;
      names += say('range', '조차', W - 50, (tide.hi + tide.lo) / 2 + 6, '#ffe7a8', 16);
    } else {
      names += say('flood', '밀물 때 해수면(점선)', 560, tide.hi - 10, '#d8efff', 15) + say('ebb', '썰물 때 해수면(실선)', 560, tide.lo + 22, '#d8efff', 15);
    }
  }
  if (stage === EBB) {
    // 조간대: 밀물 때 해수면과 썰물 때 해수면 사이에 드러난 땅
    const y = SEC.land - 48;
    extra += `<path d="M${f1(hiX)} ${tide.hi - 4}V${y}H${f1(loX)}V${tide.lo - 4}" fill="none" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="3 4"/>`;
    names += say('intertidal', '조간대 (썰물 때 드러남)', (hiX + loX) / 2, y - 8, ACCENT, 18);
    if (cross.length) { const c = cross.find(k => k.sx > hiX && k.sx < loX) ?? cross[0]; names += say('creek', '갯골', c.sx, gy(c.sx) - 16, '#d8efff', 15); }
  }
  if (stage === FLOOD) names += say('intertidal', '잠긴 갯벌 (조간대)', (hiX + loX) / 2 + 40, tide.hi + 26, '#d8efff', 16);
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="갯벌을 육지에서 바다로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${W}" height="${H}" fill="${AIR}"/>
    ${back}
    <polygon points="0,${H} ${pts(ground)} ${W},${H}" fill="${ROCK}"/>
    <polyline points="${pts(ground.filter(([x]) => x <= tToSecX(0) + 1))}" fill="none" stroke="#6d8a4a" stroke-width="7"/>
    ${extra}
    ${names}
    ${say('sea', '바다', W - 50, Math.max(water.level + 46, 170), '#ffffff')}
    <text x="10" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${W - 10}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <text x="16" y="${H - 12}" font-size="15" font-weight="700" fill="#efe9d8">세로를 크게 과장했습니다.</text>
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? EBB, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>위에서 본 모습 (모식도)</h2>
      ${buttons}
      <figure>${plan(stage)}</figure>
      <h2>갯벌을 A에서 B로 자른 단면 (모식도)</h2>
      <figure>${section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 흰 실선은 그때의 해안선, 흰 점선은 밀물 때 해안선입니다. 해안선과 규모는 설명을 위한 예시이고, 평면과 단면의 거리는 비율을 맞췄습니다.</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const g = e.target.closest('[data-zone]');
    if (!g) return;
    zone = zone === g.dataset.zone ? null : g.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n) { if (n !== stage) { stage = n; paint(); } }, get stage() { return stage; } };
}
