// © 2026 김용현
// 암괴원과 암괴류 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 절리가 생긴 화강암, 1은 땅속 풍화와 핵석, 2는 빙기에 흙이 흘러내림, 3은 암괴류와 암괴원이다.
// 단면은 산꼭대기(왼쪽 위)에서 골짜기 아래(오른쪽 아래)로 비탈을 따라 자른다. y는 화면(단면 픽셀) 좌표로, 아래로 갈수록 크다.

export const ZONE_TEXT = {
  joint: { name: '절리', text: '바위에 생긴 틈입니다. 화강암은 땅속 깊은 곳에서 마그마가 식어 굳은 바위입니다. 식으면서 부피가 줄어들고, 위를 덮던 땅이 깎여 누르던 힘이 줄면서 세로 틈과 땅 표면과 나란한 틈(판상 절리)이 생깁니다. 땅 표면 가까이는 틈이 촘촘하고, 깊은 곳은 간격이 넓습니다.' },
  corestone: { name: '핵석', text: '절리를 따라 스며든 물이 바위를 썩히면(풍화), 덩어리의 꼭짓점과 모서리는 여러 방향에서 물이 닿아 가장 먼저 깎입니다. 그래서 가운데의 덜 썩은 단단한 부분이 둥글게 남는데, 이것을 핵석이라고 하고, 이렇게 둥글어지는 풍화를 구상 풍화라고 합니다. 절리 간격이 넓은 깊은 곳일수록 핵석이 큽니다.' },
  saprolite: { name: '풍화층(마사토)', text: '화강암이 땅속에서 썩어 부서진 층입니다. 약해진 광물 사이에서 석영 같은 단단한 알갱이가 낱낱이 떨어져(입상 붕괴) 굵은 모래 같은 흙이 되는데, 이를 그루스 또는 마사토라고 부릅니다. 둥근 핵석은 이 흙 속에 박혀 있습니다. 풍화층과 아래 단단한 기반암의 경계를 풍화 전선이라고 합니다.' },
  bedrock: { name: '기반암', text: '아직 썩지 않은 단단한 화강암입니다. 깊은 곳은 물이 덜 스며들어 풍화가 거의 일어나지 않았고, 절리 간격도 넓습니다.' },
  freeze: { name: '얼었다 녹기와 흙의 흘러내림', text: '빙기에는 지금보다 훨씬 추워서, 산지 비탈은 땅속의 물이 얼었다 녹기를 되풀이하는 주빙하 환경과 비슷했습니다. 물이 얼면 부피가 늘어 흙을 들어 올리고 바위 틈을 벌려 쪼개며(동결 파쇄), 녹으면 흙이 조금씩 비탈 아래로 내려앉습니다(동상 포행). 녹아 물을 머금은 흙은 질척해져 비탈 아래로 천천히 흘러내렸습니다(솔리플럭션). 고운 흙은 물에 씻겨 나가, 흙 속에 묻혀 있던 핵석이 땅 위로 드러났습니다.' },
  stream: { name: '암괴류', text: '바위 덩어리가 골짜기를 따라 강물처럼 길게 모여 있는 지형입니다. 물이 흐르는 곳이 아니라 바위가 모인 곳입니다. 대구 비슬산 암괴류가 대표적이며 천연기념물로 지정되어 있고, 길이가 약 2km에 이른다고 알려져 있습니다.' },
  field: { name: '암괴원', text: '완만한 비탈이나 평평한 땅에 바위 덩어리가 넓게 깔려 있는 지형입니다. 바위가 한쪽으로 길게 모이지 않고 넓은 면에 퍼져 있습니다. 암괴류처럼 추운 기후에서 고운 흙이 빠지고 바위만 남아 생깁니다.' },
  forest: { name: '둘레 숲', text: '오늘날 바위 지대 둘레는 숲으로 덮여 있습니다. 바위 사이는 흙이 빠져 빈틈이 많아 나무가 자라기 어렵습니다. 지금 기후에서는 바위 덩어리가 거의 움직이지 않아, 추웠던 빙기에 만들어진 옛 지형으로 봅니다.' },
};

export const STAGE_NAMES = ['절리가 생긴 화강암', '땅속 풍화와 핵석', '빙기에 흙이 흘러내림', '암괴류와 암괴원'];
export const JOINT = 0, WEATHER = 1, COLD = 2, BLOCKS = 3;
export const NOTES = [
  '절리가 생긴 화강암: 땅속 깊은 곳에서 마그마가 식어 굳은 화강암이, 위를 덮은 땅이 깎여 나가면서 땅 표면에 가까워졌습니다. 바위에는 세로 틈과 땅 표면과 나란한 틈(절리)이 생겼는데, 표면 가까이는 촘촘하고 깊은 곳은 간격이 넓습니다.',
  '땅속 풍화와 핵석: 절리를 따라 스며든 물이 오랫동안 바위를 썩혀 흙(마사토)으로 만들었습니다. 덩어리의 모서리는 여러 방향에서 물이 닿아 먼저 깎이고, 가운데의 단단한 부분은 둥근 핵석으로 남았습니다. 절리 간격이 넓은 깊은 곳일수록 핵석이 큽니다(구상 풍화). 이 일은 모두 땅속에서 일어났으며(심층 풍화), 신생대 제3기와 제4기 간빙기처럼 따뜻하고 습했던 시기에 주로 일어났다고 봅니다.',
  '빙기에 흙이 흘러내림: 빙기에는 지금보다 훨씬 추웠습니다. 땅이 얼었다 녹기를 되풀이하면서 물을 머금은 풍화층이 비탈 아래로 천천히 흘러내렸고(솔리플럭션), 고운 흙은 물에 씻겨 나갔습니다. 그러자 흙 속에 묻혀 있던 둥근 핵석이 땅 위로 드러났습니다.',
  '암괴류와 암괴원: 드러난 바위 덩어리가 모였습니다. 오목한 골짜기를 따라 길게 모인 것이 암괴류, 완만한 비탈이나 평평한 땅에 넓게 깔린 것이 암괴원입니다. 바위 사이는 흙이 빠져 빈틈이 많고, 둘레는 숲입니다. 지금 기후에서는 거의 움직이지 않는 옛 지형입니다.',
];
export const CAPTION = '이름을 누르면 설명이 나옵니다. 높이와 바위 크기는 실제보다 크게 과장했고, 땅의 모양은 설명을 위한 예시입니다. 아주 긴 시간을 네 단계로 줄여 보여 줍니다. 암괴류와 암괴원의 형성 시기와 과정에는 다른 해석도 있습니다.';

const AIR = '#23302a', COLD_AIR = '#25303b', GRANITE = '#8c877e', JOINT_C = '#2e2b27', SAPRO = '#b48a5c', SAPRO_DOT = '#8f6a43';
const CORE = '#c4beb2', CORE_EDGE = '#4a463f', ICE = '#d8f0ff', ACCENT = '#e4b15a', FOREST = '#3f6a3a', FOREST_DARK = '#2c4a2a', VOID = '#2a2723';
const LAND = '#6f8b58';
const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 늘 같은 값이 나오는 0~1 사이의 수(그림이 매번 같게)
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };

// ---------- 단면 ----------
export const SEC = { W: 720, H: 360 };
// 처음 땅 표면: 산꼭대기(왼쪽) → 완만한 곳 → 급한 비탈 → 오목한 골짜기(오른쪽)
const SP = [[0, 58], [50, 56], [110, 66], [190, 78], [280, 92], [340, 114], [410, 154], [480, 192], [560, 220], [640, 234], [720, 240]];
const SM = (() => {
  const n = SP.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((SP[i + 1][1] - SP[i][1]) / (SP[i + 1][0] - SP[i][0]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return m;
})();
// 처음 땅 표면의 y(부드럽게 이은 곡선, 오르내림이 생기지 않는다)
export function surface0(x) {
  x = clamp(x, 0, SEC.W);
  let i = 0; while (i < SP.length - 2 && x > SP[i + 1][0]) i++;
  const [x0, y0] = SP[i], [x1, y1] = SP[i + 1], h = x1 - x0, t = (x - x0) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * SM[i] + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * SM[i + 1];
}
export const slopeAt = x => (surface0(x + 2) - surface0(x - 2)) / 4;
// 단계마다 흙이 빠져 낮아진 깊이
export const LOWER = [0, 0, 18, 24];
export const surfaceAt = (x, stage) => surface0(x) + LOWER[stage];
// 절리 띠: 표면에서 잰 깊이(D)와 가로 간격(S). 깊을수록 간격이 넓다.
export const BAND_D = [0, 18, 40, 68, 104, 150, 210, 290];
export const BAND_S = [20, 26, 34, 44, 58, 76, 96];
export const WEATHER_DEPTH = BAND_D[4]; // 풍화가 닿은 깊이(띠 0~3)
const SHRINK = [0.5, 0.62, 0.74, 0.84]; // 핵석이 처음 덩어리에서 남는 비율(깊을수록 크다)

// 절리로 나뉜 덩어리(띠 k). 윗변과 아랫변은 땅 표면과 나란하고 옆변은 곧게 선다.
export function cells(k) {
  const out = [], s = BAND_S[k];
  for (let x0 = -((k * 9) % s) - s; x0 < SEC.W + s; x0 += s) {
    const x1 = x0 + s;
    out.push({ k, x0, x1, pts: [[x0, surface0(x0) + BAND_D[k]], [x1, surface0(x1) + BAND_D[k]], [x1, surface0(x1) + BAND_D[k + 1]], [x0, surface0(x0) + BAND_D[k + 1]]] });
  }
  return out;
}
// 핵석: 덩어리 가운데에 둥글게 남은 바위. corner는 둥근 모서리 반지름(0이면 각진 덩어리).
export function corestones(stage) {
  if (stage === JOINT) return [];
  const out = [];
  for (let k = 0; k < 4; k++) {
    if (stage === BLOCKS && k <= 1) continue; // 드러나 모인 바위가 되었다
    for (const c of cells(k)) {
      const xc = (c.x0 + c.x1) / 2, j = 0.9 + 0.12 * hash(xc, k);
      const w = (c.x1 - c.x0) * SHRINK[k] * j, h = (BAND_D[k + 1] - BAND_D[k]) * SHRINK[k] * j;
      let x = xc, y = surface0(xc) + (BAND_D[k] + BAND_D[k + 1]) / 2;
      if (stage === COLD && k === 0) { x = xc + 6 + 10 * slopeAt(xc); y = surfaceAt(x, COLD) - h * 0.32; } // 흙이 빠져 땅 위로 드러남
      out.push({ k, x, y, w, h, corner: 0.46 * Math.min(w, h), angle: Math.atan(slopeAt(x)) * 180 / Math.PI });
    }
  }
  return out.filter(c => c.x > -20 && c.x < SEC.W + 20);
}
// 오늘날 모인 바위(단면). 완만한 곳(암괴원)과 골짜기의 오목한 비탈(암괴류).
export const FIELD_X = [74, 286], STREAM_X = [404, 700];
function pack(a, b, rMin, rMax, seed, layers) {
  const out = [];
  let x = a, i = 0;
  while (x < b) {
    const r = rMin + (rMax - rMin) * hash(i, seed);
    const cx = x + r;
    if (cx + r > b) break;
    out.push({ x: cx, y: surfaceAt(cx, BLOCKS) - r * 0.62, r, layer: 0 });
    x = cx + r + 1.5 + 2 * hash(i, seed + 3); i++;
  }
  if (layers > 1) {
    const base = out.slice();
    for (let n = 0; n < base.length - 1; n++) {
      if (hash(n, seed + 7) < (layers > 2 ? 0.15 : 0.6)) continue;
      const p = base[n], q = base[n + 1], r = Math.min(p.r, q.r) * (0.75 + 0.3 * hash(n, seed + 9));
      const mx = (p.x + q.x) / 2;
      out.push({ x: mx, y: Math.min(p.y, q.y) - r * 0.85, r, layer: 1 });
    }
  }
  return out;
}
export const sectionBoulders = () => ({ field: pack(FIELD_X[0], FIELD_X[1], 7, 13, 1, 2), stream: pack(STREAM_X[0], STREAM_X[1], 8, 16, 2, 3) });

const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const line = (f, a, b, step = 4) => { const p = []; for (let x = a; x <= b; x += step) p.push([x, f(x)]); if (p.at(-1)[0] !== b) p.push([b, f(b)]); return p; };
function arrowAlong(x0, x1, off, color, w = 2.6) {
  const p = line(x => surface0(x) + off, x0, x1, 3);
  const [ax, ay] = p.at(-2), [bx, by] = p.at(-1), ang = Math.atan2(by - ay, bx - ax);
  const hx = bx - 9 * Math.cos(ang), hy = by - 9 * Math.sin(ang), nx = -Math.sin(ang) * 5.5, ny = Math.cos(ang) * 5.5;
  const body = `<polyline points="${pts(p.slice(0, -1))}" fill="none" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(hx + nx)} ${f1(hy + ny)}L${f1(bx)} ${f1(by)}L${f1(hx - nx)} ${f1(hy - ny)}Z"/>`;
  return `<g stroke="#1c211e" stroke-width="3" fill="#1c211e" stroke-linejoin="round">${body.replace(`stroke-width="${w}"`, `stroke-width="${w + 3}"`)}</g><g stroke="${color}" fill="${color}">${body}</g>`;
}
const ice = (x, y, s = 5) => { let d = ''; for (const a of [0, 60, 120]) { const r = a * Math.PI / 180; d += `M${f1(x - Math.cos(r) * s)} ${f1(y - Math.sin(r) * s)}L${f1(x + Math.cos(r) * s)} ${f1(y + Math.sin(r) * s)}`; } return d; };
const tree = (x, y, s = 1) => `<path d="M${f1(x)} ${f1(y)}v${f1(-8 * s)}" stroke="#5b4a35" stroke-width="${f1(2.2 * s)}"/><circle cx="${f1(x)}" cy="${f1(y - 13 * s)}" r="${f1(8 * s)}" fill="${FOREST}" stroke="${FOREST_DARK}" stroke-width="1.2"/>`;
const rrect = (c, fill, stroke) => `<rect x="${f1(-c.w / 2)}" y="${f1(-c.h / 2)}" width="${f1(c.w)}" height="${f1(c.h)}" rx="${f1(c.corner)}" transform="translate(${f1(c.x)} ${f1(c.y)}) rotate(${f1(c.angle)})" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`;
const boulder = (b, i) => {
  const fills = ['#b5afa3', '#a39d92', '#c2bcb0', '#9a958b'];
  return `<ellipse cx="${f1(b.x)}" cy="${f1(b.y)}" rx="${f1(b.r)}" ry="${f1(b.r * 0.84)}" transform="rotate(${f1(Math.atan(slopeAt(b.x)) * 180 / Math.PI + 18 * (hash(i, 5) - 0.5))} ${f1(b.x)} ${f1(b.y)})" fill="${fills[i % 4]}" stroke="${CORE_EDGE}" stroke-width="1.3"/>`;
};

function section(stage) {
  const { W, H } = SEC;
  const say = (zone, text, x, y, color = '#f3f1ea', size = 17, anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  const plain = (text, x, y, color = '#e6e2d4', size = 14, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
  const lead = (x0, y0, x1, y1, color = '#f3f1ea') => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.5"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.4" fill="${color}"/>`;
  const sf = x => surfaceAt(x, stage);
  const ground = line(sf, 0, W, 2);
  let back = '', under = '', top = '', names = '';
  // 땅속(절리, 풍화층, 핵석)은 땅 모양으로 잘라 그린다.
  for (let k = stage === JOINT ? 0 : 4; k < BAND_S.length; k++) for (const c of cells(k)) under += `<polygon points="${pts(c.pts)}"/>`;
  under = `<g fill="none" stroke="${JOINT_C}" stroke-width="${stage === JOINT ? 1.8 : 1.5}" stroke-linejoin="round">${under}</g>`;
  if (stage >= WEATHER) {
    const front = line(x => surface0(x) + WEATHER_DEPTH, 0, W, 4);
    under += `<polygon data-sapro="1" points="${pts([...line(x => surface0(x) - 30, 0, W, 4), ...front.slice().reverse()])}" fill="${SAPRO}"/>`;
    under += `<polygon points="${pts([...line(x => surface0(x) - 30, 0, W, 4), ...front.slice().reverse()])}" fill="url(#bf-dots)"/>`;
    // 풍화층 속에 희미하게 남은 옛 절리 자리
    let ghost = '';
    for (let k = 0; k < 4; k++) for (const c of cells(k)) ghost += `<polygon points="${pts(c.pts)}"/>`;
    under += `<g fill="none" stroke="${SAPRO_DOT}" stroke-width="1" stroke-dasharray="3 4" opacity="0.7">${ghost}</g>`;
    under += `<polyline points="${pts(front)}" fill="none" stroke="#5a4630" stroke-width="2"/>`;
    for (const c of corestones(stage)) if (!(stage === COLD && c.k === 0)) under += rrect(c, CORE, CORE_EDGE);
  }
  // 하늘에서 보이는 것
  if (stage === COLD) {
    for (const c of corestones(COLD)) if (c.k === 0) top += rrect(c, CORE, CORE_EDGE);
    top += `<polyline points="${pts(line(surface0, 0, W, 4))}" fill="none" stroke="#f3f1ea" stroke-width="1.6" stroke-dasharray="5 5" opacity="0.75"/>`;
    let d = '';
    for (let x = 22; x < W; x += 34) d += ice(x + 9 * hash(x, 1), sf(x) + 6 + 5 * hash(x, 2), 4.2);
    top += `<path data-ice="1" d="${d}" stroke="${ICE}" stroke-width="1.8" stroke-linecap="round"/>`;
    // 흙이 비탈 아래로 천천히 흘러내림(풍화층 윗부분 속 화살표)
    for (const x of [120, 230, 340, 440, 540]) top += arrowAlong(x, x + 52, LOWER[COLD] + 15, ACCENT);
    // 씻겨 나가는 고운 흙
    for (let i = 0; i < 9; i++) { const x = 608 + i * 11; top += `<circle cx="${f1(x)}" cy="${f1(sf(x) - 3 - 3 * hash(i, 8))}" r="1.8" fill="#e0bb8a"/>`; }
    names += say('freeze', '얼었다 녹기 되풀이', 380, 36, ICE, 18);
    names += plain('빙기: 지금보다 훨씬 추움', 380, 58, '#c8dcea', 14);
    names += plain('처음 땅 표면(점선)', 200, 56, '#e6e2d4', 13);
    names += lead(200, 62, 200, surface0(200) - 1);
    names += say('corestone', '땅 위로 드러난 핵석', 330, 90, '#f3f1ea', 15);
    names += lead(330, 96, 322, sf(322) - 6);
    names += say('freeze', '흙이 비탈 아래로 천천히 흘러내림', 470, 124, ACCENT, 16, 'start');
    names += lead(468, 130, 462, sf(462) + 14, ACCENT);
    names += plain('고운 흙은 씻겨 나감', 708, 214, '#e8cfa8', 14, 'end');
  }
  if (stage === BLOCKS) {
    // 골짜기 양옆 비탈의 숲(뒤쪽)
    const rz = x => surface0(x) - 44 - 7 * Math.sin(x / 37) - 4 * Math.sin(x / 13);
    back += `<polygon points="0,${H} ${pts(line(rz, 0, W, 4))} ${W},${H}" fill="${FOREST_DARK}"/>`;
    let canopy = '';
    for (let x = 6; x < W; x += 15) canopy += `<circle cx="${x}" cy="${f1(rz(x) + 4)}" r="${f1(8 + 3 * hash(x, 6))}"/>`;
    back += `<g data-forest="1" fill="${FOREST_DARK}" stroke="#3a5c37" stroke-width="1.2">${canopy}</g>`;
    const { field, stream } = sectionBoulders();
    // 바위 사이 빈틈(흙이 빠진 자리): 바위 아래 어두운 바탕
    for (const [a, b, th] of [[FIELD_X[0] + 2, FIELD_X[1] - 2, 8], [STREAM_X[0] + 2, STREAM_X[1] - 2, 12]]) {
      top += `<polygon data-void="1" points="${pts([...line(x => sf(x) - th, a, b, 3), ...line(x => sf(x) + 3, a, b, 3).reverse()])}" fill="${VOID}"/>`;
    }
    const order = arr => [...arr.filter(b => b.layer === 0), ...arr.filter(b => b.layer === 1)];
    top += `<g data-field="1">${order(field).map(boulder).join('')}</g>`;
    top += `<g data-stream="1">${order(stream).map(boulder).join('')}</g>`;
    for (const x of [10, 32, 54, 306, 328, 350, 372, 392]) top += tree(x, sf(x) + 1, 1);
    names += say('field', '암괴원', 180, 34, '#f6ead0', 20);
    names += plain('완만한 곳에 넓게 깔림', 180, 54, '#e6e2d4', 14);
    names += lead(180, 60, 180, sf(180) - 20, '#f6ead0');
    names += say('forest', '둘레 숲', 350, 72, '#bfe0a8', 16);
    names += lead(350, 78, 350, sf(350) - 24, '#bfe0a8');
    names += say('stream', '암괴류', 560, 150, '#f6ead0', 20);
    names += plain('골짜기를 따라 길게 모임', 560, 170, '#e6e2d4', 14);
    names += lead(560, 176, 560, sf(560) - 26, '#f6ead0');
    names += plain('바위 사이 빈틈', 430, 150, '#e6e2d4', 13, 'end');
    names += lead(432, 154, 452, sf(452) - 6);
    names += plain('지금은 거의 움직이지 않는 옛 지형', 710, 48, ACCENT, 14, 'end');
  }
  // 땅속 이름
  if (stage === JOINT) {
    names += say('joint', '절리', 214, sf(214) + 30, '#f6ead0', 18);
    names += plain('표면 가까이는 촘촘하게', 300, sf(300) + 54, '#f3f1ea', 14);
    names += plain('깊은 곳은 넓게 갈라짐', 210, 300, '#f3f1ea', 14);
    names += say('bedrock', '화강암(기반암)', 420, 336, '#f3f1ea', 17);
    names += plain('위를 덮은 땅이 깎여 화강암이 땅 표면에 가까워짐', 340, 36, '#e6e2d4', 14);
  } else {
    names += say('saprolite', '풍화층(마사토)', 130, sf(130) + (stage === BLOCKS ? 40 : 36), '#3a2a18', 16).replace('<text ', '<text style="cursor:pointer;paint-order:stroke;stroke:#ead6b6" ');
    names += say('bedrock', '기반암', 200, 320, '#f3f1ea', 17);
    names += plain('풍화가 닿은 깊이', 30, surface0(30) + WEATHER_DEPTH + 18, '#f3f1ea', 13, 'start');
    if (stage === WEATHER) {
      names += say('corestone', '둥근 핵석', 320, 80, '#f3f1ea', 17);
      names += lead(320, 86, 323, surface0(323) + 54);
      names += plain('깊을수록 큰 핵석', 470, 160, '#f3f1ea', 14, 'start');
      names += lead(468, 156, 440, surface0(440) + 84);
      names += plain('절리를 따라 물이 스며들어 바위가 썩음', 340, 36, '#e6e2d4', 14);
    }
  }
  const sky = stage === COLD ? COLD_AIR : AIR;
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="산꼭대기에서 골짜기 아래로 비탈을 따라 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <defs>
      <clipPath id="bf-ground"><polygon points="0,${H} ${pts(ground)} ${W},${H}"/></clipPath>
      <pattern id="bf-dots" width="9" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${SAPRO_DOT}"/><circle cx="6.5" cy="6" r="0.9" fill="${SAPRO_DOT}"/></pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="${sky}"/>
    ${back}
    <polygon points="0,${H} ${pts(ground)} ${W},${H}" fill="${GRANITE}"/>
    <g clip-path="url(#bf-ground)">${under}</g>
    <polyline points="${pts(ground)}" fill="none" stroke="${stage === COLD ? '#cfd8d6' : stage === BLOCKS ? '#5f7a45' : '#6b6359'}" stroke-width="3" stroke-linejoin="round"/>
    ${top}
    ${names}
    <text x="10" y="24" font-size="15" font-weight="700" fill="#e6e2d4">산꼭대기 쪽</text>
    <text x="${W - 10}" y="24" text-anchor="end" font-size="15" font-weight="700" fill="#e6e2d4">골짜기 아래쪽</text>
    <text x="${W - 10}" y="${H - 12}" text-anchor="end" font-size="13" font-weight="700" fill="#efe9d8">높이와 바위 크기를 크게 과장했습니다.</text>
  </svg>`;
}

// ---------- 평면(오늘날, 위에서 본 모습) ----------
export const PLAN = { W: 720, H: 320 };
// 골짜기 바닥 선(위가 비탈 위쪽, 아래가 비탈 아래쪽)
export const valleyX = y => 520 + 12 * Math.sin(y / 55);
// 등고선 k의 y. 왼쪽은 완만한 땅(k=3과 4 사이가 넓다), 오른쪽은 고르게 급하다. 골짜기에서는 비탈 위쪽으로 휘어 들어간다(V자).
const YL = [20, 38, 56, 76, 202, 236, 262, 288, 312];
const YR = [20, 56, 92, 128, 164, 200, 236, 272, 308];
const smooth01 = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function contourY(k, x) {
  const w = smooth01(320, 410, x), y = (1 - w) * YL[k] + w * YR[k];
  return y - 30 * Math.exp(-(((x - valleyX(y)) / 40) ** 2));
}
export const CONTOURS = YL.length;
// 암괴류: 골짜기 바닥을 따라 길고 좁은 혀 모양. 아래쪽 끝이 조금 넓다.
export const STREAM_Y = [34, 300];
const halfW = y => 12 + 10 * (y - STREAM_Y[0]) / (STREAM_Y[1] - STREAM_Y[0]) + 2.5 * Math.sin(y / 21);
export const STREAM_PATCH = (() => {
  const L = [], R = [];
  for (let y = STREAM_Y[0]; y <= STREAM_Y[1]; y += 10) { L.push([valleyX(y) - halfW(y), y]); R.push([valleyX(y) + halfW(y), y]); }
  const yb = STREAM_Y[1], cb = valleyX(yb), hb = halfW(yb);
  const toe = []; for (let a = 20; a < 180; a += 30) { const r = a * Math.PI / 180; toe.push([cb + hb * Math.cos(r), yb + hb * 0.5 * Math.sin(r)]); }
  return [[valleyX(STREAM_Y[0]), STREAM_Y[0] - 6], ...R, ...toe, ...L.reverse()];
})();
// 암괴원: 완만한 땅(등고선 간격이 넓은 곳)에 넓게 퍼진 바위 지대
export const FIELD_C = [182, 140];
export const FIELD_PATCH = (() => { const out = []; for (let a = 0; a < 360; a += 20) { const r = a * Math.PI / 180, j = 1 + 0.08 * Math.sin(a / 23 * 3) + 0.05 * Math.cos(a / 17 * 2); out.push([FIELD_C[0] + 88 * j * Math.cos(r), FIELD_C[1] + 50 * j * Math.sin(r)]); } return out; })();
export const extent = poly => { const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const near = (poly, x, y, m) => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].some(([dx, dy]) => inside(poly, x + dx, y + dy));
const closedSmooth = p => { const q = [...p, p[0], p[1]]; let d = `M${f1((p[0][0] + p[1][0]) / 2)} ${f1((p[0][1] + p[1][1]) / 2)}`; for (let i = 1; i < q.length - 1; i++) { const mx = (q[i][0] + q[i + 1][0]) / 2, my = (q[i][1] + q[i + 1][1]) / 2; d += `Q${f1(q[i][0])} ${f1(q[i][1])} ${f1(mx)} ${f1(my)}`; } return `${d}Z`; };
function rocks(poly, seed) {
  const e = extent(poly);
  let s = '', i = 0;
  for (let y = e.y0 + 3; y < e.y1; y += 9) for (let x = e.x0 + (((y - e.y0) / 9) % 2) * 5; x < e.x1; x += 10) {
    i++;
    const jx = x + 3 * (hash(i, seed) - 0.5), jy = y + 3 * (hash(i, seed + 1) - 0.5), r = 2.6 + 2.6 * hash(i, seed + 2);
    if (!inside(poly, jx, jy) || !inside(poly, jx, jy - r * 0.6) || !inside(poly, jx, jy + r * 0.6)) continue;
    s += `<ellipse cx="${f1(jx)}" cy="${f1(jy)}" rx="${f1(r)}" ry="${f1(r * 0.85)}" fill="${['#b5afa3', '#a39d92', '#c2bcb0', '#958f85'][i % 4]}"/>`;
  }
  return s;
}
function plan() {
  const { W, H } = PLAN;
  const L = (zone, text, x, y, color = '#f3f1ea', size = 17, anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  const P = (text, x, y, color = '#e6e2d4', size = 13, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3">${text}</text>`;
  let body = `<rect width="${W}" height="${H}" fill="${LAND}"/>`;
  // 숲(나무 기호). 바위 지대에는 나무가 없다.
  let trees = '', n = 0;
  for (let y = 10; y < H; y += 17) for (let x = 8 + ((y / 17) % 2) * 9; x < W; x += 18) {
    n++;
    const tx = x + 5 * (hash(n, 11) - 0.5), ty = y + 5 * (hash(n, 12) - 0.5);
    if (near(STREAM_PATCH, tx, ty, 13) || near(FIELD_PATCH, tx, ty, 13)) continue;
    if (tx < 40 && ty > 238) continue; // 방향 표시 자리
    trees += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="${f1(5 + 1.5 * hash(n, 13))}"/>`;
  }
  body += `<g data-forest="1" fill="${FOREST}" stroke="${FOREST_DARK}" stroke-width="1">${trees}</g>`;
  // 등고선
  let cont = '';
  for (let k = 0; k < CONTOURS; k++) { const p = []; for (let x = 0; x <= W; x += 4) p.push([x, contourY(k, x)]); cont += `<polyline points="${pts(p)}"/>`; }
  body += `<g data-contour="1" fill="none" stroke="#f1e6c4" stroke-width="1.6" opacity="0.85">${cont}</g>`;
  // 바위 지대: 어두운 바탕은 바위 사이 빈틈
  body += `<path data-stream="1" d="${closedSmooth(STREAM_PATCH)}" fill="${VOID}" stroke="#d9d3c6" stroke-width="1.6"/>`;
  body += `<g>${rocks(STREAM_PATCH, 21)}</g>`;
  body += `<path data-field="1" d="${closedSmooth(FIELD_PATCH)}" fill="${VOID}" stroke="#d9d3c6" stroke-width="1.6"/>`;
  body += `<g>${rocks(FIELD_PATCH, 31)}</g>`;
  // 바위가 천천히 내려온 방향(골짜기를 따라)
  let arrows = '';
  // 양옆 비탈에서 골짜기 바닥으로 모여든 뒤 골짜기를 따라 내려간다(비스듬한 화살표)
  const arrowTo = (x0, y0, x1, y1, color) => { const a = Math.atan2(y1 - y0, x1 - x0), c = Math.cos(a), sn = Math.sin(a); const hx = x1 - 10 * c, hy = y1 - 10 * sn; return `<path d="M${f1(x0)} ${f1(y0)}L${f1(hx)} ${f1(hy)}" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/><path d="M${f1(hx - 6 * sn)} ${f1(hy + 6 * c)}L${f1(x1)} ${f1(y1)}L${f1(hx + 6 * sn)} ${f1(hy - 6 * c)}Z" fill="${color}"/>`; };
  for (const y of [70, 150, 230]) arrows += arrowTo(valleyX(y) + 78, y - 22, valleyX(y + 16) + 30, y + 16, ACCENT);
  for (const y of [60, 236]) arrows += arrowTo(valleyX(y) - 78, y - 22, valleyX(y + 16) - 30, y + 16, ACCENT);
    body += arrows;
  let names = '';
  const sx = valleyX(120) - 34;
  names += L('stream', '암괴류', sx, 108, '#f6ead0', 20, 'end');
  names += P('골짜기를 따라 길게 모임', sx, 128, '#e6e2d4', 13, 'end');
  names += P('물이 아니라 바위가 모인 곳', sx, 146, '#e6e2d4', 13, 'end');
  names += P('예: 대구 비슬산 암괴류', sx, 164, '#f2d79a', 13, 'end');
  names += P('바위가 골짜기로', valleyX(250) + 60, 246, ACCENT, 13, 'start');
  names += P('모여든 방향', valleyX(250) + 60, 262, ACCENT, 13, 'start');
  names += L('field', '암괴원', FIELD_C[0], FIELD_C[1] - 62, '#f6ead0', 20);
  names += P('완만한 땅에 넓게 깔림', FIELD_C[0], FIELD_C[1] + 70, '#e6e2d4', 13);
  names += P('(등고선 간격이 넓은 곳)', FIELD_C[0], FIELD_C[1] + 86, '#f1e6c4', 12);
  names += L('forest', '둘레 숲', 352, 224, '#dff2c8', 16);
  names += P('등고선이 비탈 위쪽으로 휘어 든 골짜기', valleyX(300) - 34, 304, '#f1e6c4', 13, 'end');
  // 비탈 방향 표시
  const dir = `<g transform="translate(22 262)"><path d="M0 -10V26" stroke="#f3f1ea" stroke-width="2.2"/><path d="M-6 18L0 28L6 18Z" fill="#f3f1ea"/><text x="0" y="-16" text-anchor="middle" font-size="12" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3">높음</text><text x="12" y="30" font-size="12" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3">낮음</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 본 오늘날 모습. 위쪽이 비탈 위쪽(높은 곳)이다. 오른쪽 골짜기를 따라 바위가 길게 모인 암괴류, 왼쪽 완만한 땅에 바위가 넓게 깔린 암괴원이 있고 둘레는 숲이다.">
    ${body}
    ${names}${dir}
    <text x="10" y="20" font-size="14" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3">비탈 위쪽</text>
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? BLOCKS, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>산꼭대기에서 골짜기 아래로 자른 단면 (모식도)</h2>
      ${buttons}
      <figure>${section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <h2>위에서 본 오늘날 모습 (모식도)</h2>
      <figure>${plan()}</figure>
      <p class="schem-cap">${CAPTION}</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const g2 = e.target.closest('[data-zone]');
    if (!g2) return;
    zone = zone === g2.dataset.zone ? null : g2.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n) { if (n !== stage) { stage = n; zone = null; paint(); } }, get stage() { return stage; } };
}
