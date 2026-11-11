// © 2026 김용현
// 여울, 소, 모래톱 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 처음 고른 바닥, 1은 깎이고 쌓임, 2는 소와 여울이 번갈아 늘어선 모습이다.
// 평면은 왼쪽에서 오른쪽으로 흐르는 굽이진 물길이다. 단면 두 개(소 자리, 여울 자리)와 물길을 따라 자른 단면이 함께 바뀐다.
// y는 화면(그림 픽셀) 좌표로, 아래로 갈수록 크다.

export const ZONE_TEXT = {
  pool: { name: '소', text: '물이 굽이 바깥쪽으로 쏠려 부딪히면서 바닥을 깊게 판 곳입니다. 수면의 물이 한곳으로 모여 바닥으로 내려가며 바닥을 깎습니다. 평소에는 물이 깊고 느리게 고여 있어 물고기가 쉬거나 숨는 곳이 됩니다. 굽이 바깥쪽 둑은 깎여 가파릅니다. 물이 적은 평소에는 바닥에 고운 모래와 진흙이 가라앉기도 합니다.' },
  riffle: { name: '여울', text: '한 굽이에서 다음 굽이로 물길이 건너가는 곳입니다. 수면의 물이 양쪽으로 퍼지고 가운데에서는 물이 위로 올라오므로 바닥 가운데에 자갈이 쌓여 넓고 얕아집니다. 그래서 바닥에 자갈이 깔려 있고 평소에 물이 빠르게 흐르며 물결이 입니다. 물이 뒤섞여 산소가 많아 물속 생물이 많이 삽니다.' },
  bar: { name: '모래톱', text: '굽이 안쪽에 모래와 자갈이 쌓인 땅입니다. 지형학에서는 포인트바(모래와 자갈이 쌓인 사력 퇴적체)라고 합니다. 굽이 안쪽은 물이 느리게 흘러 실려 온 모래가 가라앉습니다. 평소 물이 적을 때는 물 위로 드러나고, 큰물이 지면 물에 잠깁니다.' },
  thalweg: { name: '최심하상선', text: '물길에서 바닥이 가장 깊은 곳을 이은 줄입니다. 물이 가장 빠르게 흐르는 곳도 거의 이 줄을 따릅니다. 굽이마다 바깥쪽 둑으로 쏠렸다가 여울에서 반대쪽으로 건너갑니다.' },
  outer: { name: '굽이 바깥', text: '굽이 바깥(공격 사면, 침식 하안)은 물이 빠르게 부딪혀 둑과 바닥이 깎입니다. 그래서 둑이 가파르고 바로 앞에 깊은 소가 생깁니다.' },
  inner: { name: '굽이 안쪽', text: '굽이 안쪽(활주 사면, 퇴적 사면)은 물이 느리고 얕아 모래와 자갈이 쌓입니다. 그래서 바닥이 완만하게 올라가 모래톱으로 이어집니다. 굽이 안쪽에 붙은 모래톱은 물 가운데 섬처럼 생긴 하중도와는 다릅니다.' },
  flood: { name: '홍수 때', text: '평소에는 소에서 평평하고 여울에서 급하던 수면이 홍수 때는 고르게 기울어집니다. 이때 소로 모여든 물이 빨라져 소 바닥을 깎고, 여울에는 자갈이 쌓인다는 설명이 널리 알려져 있습니다. 평소와 빠르기가 뒤바뀐다는 이 설명에는 다른 해석도 있습니다. 물이 소로 모여드는 방식이나 물길 모양으로 설명하기도 합니다.' },
};

export const STAGE_NAMES = ['처음 고른 바닥', '깎이고 쌓임', '소와 여울이 번갈아'];
export const FLAT = 0, GROW = 1, DONE = 2;
export const NOTES = [
  '처음 고른 바닥: 바닥 높이가 고른 굽이진 물길입니다. 바닥이 고르더라도 물은 굽이마다 바깥쪽으로 쏠려 빠르게 흐르고, 안쪽은 느리게 흐릅니다.',
  '깎이고 쌓임: 굽이 바깥쪽은 빠른 물이 부딪혀 바닥과 둑이 깎이고, 굽이 안쪽은 물이 느려 모래가 쌓이기 시작합니다. 굽이 사이 물길이 건너가는 곳에는 자갈이 쌓입니다.',
  '소와 여울이 번갈아: 굽이 바깥쪽에는 깊은 소, 굽이 안쪽에는 모래톱, 굽이 사이에는 얕은 여울이 생겼습니다. 물길을 따라가면 소와 여울이 번갈아 나타나며, 소에서 다음 소까지는 물길 너비의 약 5배에서 7배 떨어져 있습니다.',
];
export const CAPTION = '이름을 누르면 설명이 나옵니다. 물길 너비, 깊이, 높이는 실제보다 크게 과장했고, 물길 모양은 설명을 위한 예시입니다. 오랜 시간을 세 단계로 줄여 보여 줍니다. 홍수 때 소와 여울의 물 빠르기가 뒤바뀐다는 설명에는 다른 해석도 있습니다.';
export const FLOW_NAMES = ['평소', '홍수 때'];

// 단계마다 소와 모래톱이 얼마나 자랐는지(0이면 고른 바닥, 1이면 다 자람)
export const GROWTH = [0, 0.55, 1];

const LAND = '#7e9a5c', LAND_DARK = '#5f7a45', WATER = '#4fa6dc', SHALLOW = '#9ad6f2', DEEP = '#1f5f9a', DEEPEST = '#174a7a';
const SAND = '#e6cf90', SAND_EDGE = '#b89a55', GRAVEL = '#a39a88', GRAVEL_EDGE = '#6e6656', SOIL = '#6b5a45', ACCENT = '#e4b15a', FAST = '#ff7a4a', INK = '#1c211e';
const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const pathOf = arr => `M${arr.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`;
// 가운데가 1이고 양 끝(|t|=1)이 0인 매끄러운 혹
const bump = t => { const u = clamp(1 - t * t, 0, 1); return u * u * (3 - 2 * u); };

// ---------- 평면 ----------
export const PLAN = { W: 720, H: 360, mid: 178, A: 86, L: 320, X0: 20, HW: 21 };
const K = 2 * Math.PI / PLAN.L;
const phase = x => K * (x - PLAN.X0);
export const centerY = x => PLAN.mid + PLAN.A * Math.sin(phase(x));
// 물길 가운데 선의 기울기와, 아래쪽(+y)을 향한 단위 법선
const slope = x => PLAN.A * K * Math.cos(phase(x));
export const normal = x => { const s = slope(x), l = Math.hypot(s, 1); return [-s / l, 1 / l]; };
// 굽이 바깥쪽 방향: +1이면 법선 쪽(아래), -1이면 반대(위). 굽이 꼭대기에서 바깥은 굽이가 볼록한 쪽이다.
export const outSide = x => Math.sign(Math.sin(phase(x))) || 1;
// 물길 가운데에서 법선으로 d만큼 떨어진 점
export const at = (x, d) => { const [nx, ny] = normal(x); return [x + nx * d, centerY(x) + ny * d]; };
// 굽이 꼭대기(소 자리)와 굽이 사이 건너가는 곳(여울 자리)
export const APEXES = [100, 260, 420, 580];
export const CROSSINGS = [20, 180, 340, 500, 660];
// 물이 가장 빠른 줄: 굽이 꼭대기를 조금 지나 바깥쪽 둑에 가장 가깝고, 여울에서 반대쪽으로 건너간다.
export const fastOffset = x => 0.66 * PLAN.HW * Math.sin(phase(x) - 0.3);
// 물길을 따라 잰 길이
export function arcLength(x0, x1) { let L = 0; for (let x = x0; x < x1; x += 0.5) L += Math.hypot(0.5, centerY(x + 0.5) - centerY(x)); return L; }

const POOL_HALF = 54, BAR_HALF = 74, RIFFLE_HALF = 22;
// 소: 바깥쪽 둑에서 물길 안쪽으로 파인 깊은 곳(렌즈 모양). 앞쪽은 바깥 둑, 뒤쪽은 물길 안쪽 끝.
export function poolShape(xa, g, core = 1) {
  const s = outSide(xa), out = [], back = [], half = POOL_HALF * (0.6 + 0.4 * g) * core;
  for (let x = xa - half + 6; x <= xa + half + 6; x += 3) {
    const b = bump((x - xa - 6) / half), w = PLAN.HW * 2 * (0.72 * g * core) * b;
    out.push(at(x, s * (PLAN.HW - 1)));
    back.push(at(x, s * (PLAN.HW - 1 - w)));
  }
  return [...out, ...back.reverse()];
}
// 모래톱: 안쪽 둑에 붙어 물길 쪽으로 볼록한 초승달. 조금 하류 쪽으로 치우친다.
export function barShape(xa, g) {
  const s = -outSide(xa), out = [], back = [], half = BAR_HALF * (0.55 + 0.45 * g);
  for (let x = xa - half + 10; x <= xa + half + 10; x += 3) {
    const b = bump((x - xa - 10) / half), w = PLAN.HW * 0.8 * g * b;
    out.push(at(x, s * (PLAN.HW + 4 * b)));
    back.push(at(x, s * (PLAN.HW - w)));
  }
  return [...out, ...back.reverse()];
}
export function riffleShape(xc) {
  const a = [], b = [];
  for (let x = xc - RIFFLE_HALF; x <= xc + RIFFLE_HALF; x += 2) { a.push(at(x, -PLAN.HW)); b.push(at(x, PLAN.HW)); }
  return [...a, ...b.reverse()];
}
export const centroid = poly => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];

function arrowHead(x, y, ang, color, size = 8) {
  const c = Math.cos(ang), s = Math.sin(ang), hx = x - size * 1.3 * c, hy = y - size * 1.3 * s;
  return `<path d="M${f1(hx - size * 0.7 * s)} ${f1(hy + size * 0.7 * c)}L${f1(x)} ${f1(y)}L${f1(hx + size * 0.7 * s)} ${f1(hy - size * 0.7 * c)}Z" fill="${color}"/>`;
}
function arrow(x0, y0, x1, y1, color, w = 2.6, size = 7) {
  const a = Math.atan2(y1 - y0, x1 - x0), hx = x1 - size * 1.2 * Math.cos(a), hy = y1 - size * 1.2 * Math.sin(a);
  return `<path d="M${f1(x0)} ${f1(y0)}L${f1(hx)} ${f1(hy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>${arrowHead(x1, y1, a, color, size)}`;
}
const say = (zone, text, x, y, color = '#f3f1ea', size = 18, anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
const plain = (text, x, y, color = '#e6e2d4', size = 13, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
const lead = (x0, y0, x1, y1, color = '#f3f1ea') => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.5"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.4" fill="${color}"/>`;

// 소 단면(A)과 여울 단면(B)을 자르는 자리
export const CUT_A = 580, CUT_B = 660;

function plan(stage) {
  const { W, H, HW } = PLAN, g = GROWTH[stage];
  const left = [], right = [];
  for (let x = -30; x <= W + 30; x += 2) { left.push(at(x, -HW)); right.push(at(x, HW)); }
  const channel = [...left, ...right.slice().reverse()];
  let body = `<rect width="${W}" height="${H}" fill="${LAND}"/>`;
  // 들판의 풀 무늬(물길에서 떨어진 곳만)
  let grass = '', n = 0;
  for (let y = 12; y < H; y += 22) for (let x = 10 + ((y / 22) % 2) * 11; x < W; x += 24) {
    n++;
    const gx = x + 6 * (hash(n, 3) - 0.5), gy = y + 6 * (hash(n, 4) - 0.5);
    if (Math.abs(gy - centerY(gx)) < HW / Math.abs(normal(gx)[1]) + 16) continue;
    grass += `<path d="M${f1(gx - 3)} ${f1(gy)}l3 -5l3 5"/>`;
  }
  body += `<g fill="none" stroke="${LAND_DARK}" stroke-width="1.3" opacity="0.8">${grass}</g>`;
  body += `<defs><clipPath id="rb-ch"><polygon points="${pts(channel)}"/></clipPath></defs>`;
  body += `<polygon data-channel="1" points="${pts(channel)}" fill="${WATER}"/>`;
  let inside = '';
  if (g > 0) {
    for (const xc of CROSSINGS) {
      const poly = riffleShape(xc);
      inside += `<polygon data-riffle="1" points="${pts(poly)}" fill="${SHALLOW}" opacity="${f1(0.45 + 0.55 * g)}"/>`;
      // 자갈
      for (let i = 0; i < 16 * g; i++) {
        const x = xc + (hash(i, xc) - 0.5) * 2 * RIFFLE_HALF, [px, py] = at(x, (hash(i, xc + 1) - 0.5) * 1.7 * HW);
        inside += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(2 + 1.4 * hash(i, 9))}" ry="${f1(1.6 + hash(i, 7))}" fill="${GRAVEL}" stroke="${GRAVEL_EDGE}" stroke-width="0.6"/>`;
      }
      // 물결: 흐름에 가로로 놓인, 하류 쪽으로 휜 짧은 물결 줄
      if (stage === DONE) for (const dx of [-14, 0, 14]) {
        const [ax, ay] = at(xc + dx, -0.62 * HW), [cx, cy] = at(xc + dx + 7, 0), [bx, by] = at(xc + dx, 0.62 * HW);
        inside += `<path d="M${f1(ax)} ${f1(ay)}Q${f1(cx)} ${f1(cy)} ${f1(bx)} ${f1(by)}" fill="none" stroke="#f2fbff" stroke-width="1.6"/>`;
      }
    }
    for (const xa of APEXES) {
      inside += `<polygon data-pool="1" points="${pts(poolShape(xa, g))}" fill="${DEEP}"/>`;
      if (stage === DONE) inside += `<polygon points="${pts(poolShape(xa, g, 0.55))}" fill="${DEEPEST}"/>`;
    }
  }
  body += `<g clip-path="url(#rb-ch)">${inside}</g>`;
  // 둑 선
  body += `<polyline points="${pts(left)}" fill="none" stroke="#3f5a33" stroke-width="2"/><polyline points="${pts(right)}" fill="none" stroke="#3f5a33" stroke-width="2"/>`;
  // 굽이 바깥 가파른 둑(빗금)
  if (g > 0) for (const xa of APEXES) {
    const s = outSide(xa);
    let d = '';
    for (let x = xa - 40; x <= xa + 52; x += 5) { const [x0, y0] = at(x, s * HW), [x1, y1] = at(x, s * (HW + 6 + 3 * g)); d += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`; }
    body += `<path data-cutbank="1" d="${d}" stroke="#3b2f22" stroke-width="1.6"/>`;
  }
  // 모래톱
  if (g > 0) for (const xa of APEXES) body += `<polygon data-bar="1" points="${pts(barShape(xa, g))}" fill="${SAND}" stroke="${SAND_EDGE}" stroke-width="1.2"/>`;
  // 깎이고 쌓이는 방향(단계 1)
  if (stage === GROW) for (const xa of [260]) {
    const s = outSide(xa), [ox, oy] = at(xa + 8, s * (HW - 14)), [oe, of] = at(xa + 8, s * (HW + 14));
    body += arrow(ox, oy, oe, of, '#ffb38a', 3, 7);
    const [ix, iy] = at(xa + 10, -s * (HW - 4)), [ie, iff] = at(xa + 10, -s * (HW - 18));
    body += arrow(ie, iff, ix, iy, SAND, 3, 7);
  }
  // 물이 가장 빠른 줄
  const fast = []; for (let x = -30; x <= W + 30; x += 3) fast.push(at(x, fastOffset(x)));
  body += `<polyline data-fast="1" points="${pts(fast)}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round" opacity="0.55"/>`;
  body += `<polyline points="${pts(fast)}" fill="none" stroke="${FAST}" stroke-width="2.6" stroke-dasharray="9 6" stroke-linejoin="round"/>`;
  for (const x of [60, 220, 380, 540, 700]) {
    const [ax, ay] = at(x - 1, fastOffset(x - 1)), [bx, by] = at(x + 1, fastOffset(x + 1));
    body += arrowHead(bx, by, Math.atan2(by - ay, bx - ax), FAST, 7);
  }
  // 단면 자리 A-A'(소), B-B'(여울)
  const cut = (x, name, ext) => {
    const s = outSide(x) || 1, [x0, y0] = at(x, -s * (HW + ext)), [x1, y1] = at(x, s * (HW + ext));
    return `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="#fff6dc" stroke-width="2.2" stroke-dasharray="4 4"/>` +
      `<text x="${f1(x1)}" y="${f1(y1 + (y1 < y0 ? -5 : 15))}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff6dc">${name}</text>` +
      `<text x="${f1(x0)}" y="${f1(y0 + (y0 < y1 ? -5 : 15))}" text-anchor="middle" font-size="15" font-weight="800" fill="#fff6dc">${name}'</text>`;
  };
  body += cut(CUT_A, 'A', 14);
  body += cut(CUT_B, 'B', 12);

  // 이름. 위쪽 굽이(x=260)의 바깥은 위, 안쪽은 아래다. 오른쪽 굽이(x=580)와 여울(x=660)은 단면 자리다.
  let names = '';
  names += say('thalweg', '최심하상선', 100, 150, FAST, 16);
  names += lead(150, 156, ...at(172, fastOffset(172)), FAST);
  if (stage === FLAT) {
    names += plain('바닥 높이가 고른 굽이진 물길', 420, 140, '#f3f1ea', 15);
    names += say('outer', '굽이 바깥', 180, 52, '#ffb38a', 17);
    names += lead(222, 50, ...at(250, -HW - 2), '#ffb38a');
    names += say('inner', '굽이 안쪽', 260, 166, '#ffe9b0', 17);
    names += lead(260, 148, ...at(262, HW + 2), '#ffe9b0');
  } else {
    names += say('pool', '소', 180, 42, '#bfe3ff', 21);
    names += plain('굽이 바깥, 깊음', 180, 61, '#e6e2d4', 13);
    names += lead(232, 56, ...at(256, -HW + 7), '#bfe3ff');
    names += say('bar', '모래톱', 260, 166, '#ffe9b0', 19);
    names += plain('굽이 안쪽, 쌓임', 260, 184, '#e6e2d4', 13);
    names += lead(260, 148, ...at(266, HW - 5), '#ffe9b0');
    names += say('riffle', '여울', 420, 126, '#e8f8ff', 21);
    names += plain('굽이 사이, 얕고 빠름', 420, 145, '#e6e2d4', 13);
    names += lead(392, 152, ...at(348, 0), '#e8f8ff');
    names += say('pool', '소', 420, 326, '#bfe3ff', 19);
    if (stage === GROW) {
      names += plain('깎임', 292, 58, '#ffb38a', 14, 'start');
    }
  }
  // 흐름 방향
  const flow = `<g>${arrow(18, 336, 82, 336, '#f3f1ea', 3, 8)}<text x="90" y="341" font-size="14" font-weight="700" fill="#f3f1ea">물 흐름</text></g>`;
  return `<svg class="plan" viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 본 굽이진 물길. 왼쪽에서 오른쪽으로 흐른다. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.plan text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round}</style>
    ${body}
    ${names}
    ${flow}
    <text x="${W - 10}" y="${H - 12}" text-anchor="end" font-size="13" font-weight="700" fill="#efe9d8">물길 너비를 크게 과장한 예시입니다.</text>
  </svg>`;
}

// ---------- 가로 단면(소 자리, 여울 자리) ----------
export const XS = { W: 360, H: 250, land: 70, water: 92, floodWater: 52 };
const lerpPts = (P, x) => { if (x <= P[0][0]) return P[0][1]; for (let i = 1; i < P.length; i++) if (x <= P[i][0]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i], t = (x - x0) / (x1 - x0), u = t * t * (3 - 2 * t); return y0 + (y1 - y0) * u; } return P.at(-1)[1]; };
// 처음 고른 바닥(두 단면 같음). 왼쪽이 굽이 바깥, 오른쪽이 굽이 안쪽.
const FLAT_BED = [[0, 70], [44, 70], [70, 140], [292, 140], [316, 70], [360, 70]];
// 다 자란 소: 바깥쪽 둑 앞이 가장 깊고, 안쪽으로 완만하게 올라가 물 위로 드러난 모래톱으로 이어진다.
const POOL_BED = [[0, 70], [44, 70], [56, 196], [84, 212], [140, 190], [196, 148], [246, 106], [280, 86], [306, 78], [324, 70], [360, 70]];
// 다 자란 여울: 얕고 평평한 자갈 바닥
const RIFFLE_BED = [[0, 70], [44, 70], [62, 112], [90, 118], [272, 118], [300, 112], [316, 70], [360, 70]];
export const poolBed = (x, g) => (1 - g) * lerpPts(FLAT_BED, x) + g * lerpPts(POOL_BED, x);
export const riffleBed = (x, g) => (1 - g) * lerpPts(FLAT_BED, x) + g * lerpPts(RIFFLE_BED, x);

function xsec(kind, stage, flood) {
  const { W, H, land } = XS, g = GROWTH[stage], wl = flood ? XS.floodWater : XS.water;
  const bedF = kind === 'pool' ? x => poolBed(x, g) : x => riffleBed(x, g);
  const bed = []; for (let x = 0; x <= W; x += 2) bed.push([x, bedF(x)]);
  let s = `<rect width="${W}" height="${H}" fill="#23302a"/>`;
  if (flood) s += `<rect x="0" y="${wl}" width="${W}" height="${land - wl + 1}" fill="${WATER}" opacity="0.55"/>`;
  s += `<rect data-water="1" x="0" y="${wl < land ? land : wl}" width="${W}" height="${H - land}" fill="${WATER}"/>`;
  s += `<polygon points="0,${H} ${pts(bed)} ${W},${H}" fill="${SOIL}"/>`;
  // 바닥 위 퇴적물: 소 쪽은 모래톱(안쪽), 여울은 자갈
  if (kind === 'pool' && g > 0) {
    const top = bed.filter(([x]) => x >= 196 && x <= 330), under = top.map(([x, y]) => [x, y + 6 + 14 * g * bump((x - 270) / 80)]);
    s += `<polygon data-bar="1" points="${pts([...top, ...under.reverse()])}" fill="${SAND}"/>`;
  }
  if (kind === 'riffle' && g > 0) {
    let gv = '';
    for (let x = 70, i = 0; x < 300; x += 7, i++) { const y = bedF(x); gv += `<ellipse cx="${f1(x)}" cy="${f1(y + 3)}" rx="${f1(3 + 1.5 * hash(i, 2))}" ry="${f1(2.4 + hash(i, 3))}" fill="${GRAVEL}" stroke="${GRAVEL_EDGE}" stroke-width="0.7"/>`; }
    s += `<g data-gravel="1">${gv}</g>`;
  }
  s += `<polyline points="${pts(bed)}" fill="none" stroke="#3b2f22" stroke-width="2.2"/>`;
  // 물 표면
  if (kind === 'riffle' && !flood && g > 0) {
    let d = `M56 ${wl}`; for (let x = 56; x < 306; x += 10) d += `Q${x + 5} ${wl - 4} ${x + 10} ${wl}`;
    s += `<path d="${d}" fill="none" stroke="#f2fbff" stroke-width="1.8"/>`;
  } else s += `<path d="M0 ${wl}H${W}" stroke="#d8f0ff" stroke-width="1.6" ${flood ? 'stroke-dasharray="6 4"' : ''}/>`;
  if (flood) s += `<path d="M0 ${XS.water}H${W}" stroke="#d8f0ff" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.8"/>`;
  // 이름
  // 양쪽 끝 이름: 소 단면은 A(굽이 바깥)와 A'(굽이 안쪽), 여울 단면은 B와 B'(굽이 사이라 안팎이 없다)
  let names = kind === 'pool'
    ? plain('A 굽이 바깥', 10, 22, '#ffb38a', 14, 'start').replace('<text', '<text class="zone" data-zone="outer" style="cursor:pointer"') +
      plain("굽이 안쪽 A'", W - 10, 22, '#ffe9b0', 14, 'end').replace('<text', '<text class="zone" data-zone="inner" style="cursor:pointer"')
    : plain('B', 12, 22, '#fff6dc', 15, 'start') + plain("B'", W - 12, 22, '#fff6dc', 15, 'end');
  if (kind === 'pool') {
    if (g > 0) {
      names += say('pool', '소', 112, 150 + 30 * (1 - g), '#e8f8ff', 20);
      names += plain(flood ? '물이 빨라져 바닥을 깎음' : '깊고 물이 느림', 112, 170 + 30 * (1 - g), '#e8f8ff', 13);
      names += plain('가파른 둑', 70, 40, '#f3f1ea', 13, 'start');
      names += lead(80, 45, 52, 120);
      if (stage === DONE) { names += say('bar', '모래톱', 284, 46, '#ffe9b0', 15); names += lead(286, 51, 294, 80, '#ffe9b0'); }
    } else names += plain('고른 바닥', 180, 128, '#e8f8ff', 14);
  } else if (g > 0) {
    names += say('riffle', '여울', 180, 112 - 26, '#e8f8ff', 18).replace(/y="[^"]*"/, `y="${flood ? 108 : 84}"`);
    if (!flood) names += plain('얕고 물이 빠름, 물결이 임', 180, 62, '#e8f8ff', 13);
    names += plain('자갈', 180, 148, '#e6e2d4', 13);
    names += lead(180, 138, 180, 124, '#e6e2d4');
  } else names += plain('고른 바닥', 180, 128, '#e8f8ff', 14);
  // 물높이 이름: 소는 가운데 위, 여울은 왼쪽 둑 옆(가운데에는 여울 이름이 있다)
  const wx = kind === 'pool' ? 200 : 66, wa = kind === 'pool' ? 'middle' : 'start';
  if (flood) { names += plain('홍수 때 물높이', wx, wl - 6, '#d8f0ff', 12, wa); names += plain('평소 물높이', wx, XS.water - 5, '#d8f0ff', 11, wa); }
  else names += plain('평소 물높이', wx, wl - 6, '#d8f0ff', 12, wa);
  const title = kind === 'pool' ? "A-A' 소 자리" : "B-B' 여울 자리";
  return `<svg class="xs" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind === 'pool' ? '소 자리를 가로로 자른 단면. 굽이 바깥쪽이 깊고 가파르며 안쪽은 완만하게 올라가 모래톱이 된다.' : '여울 자리를 가로로 자른 단면. 얕고 평평한 자갈 바닥이다.'}">
    <style>svg.xs text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round}</style>
    ${s}${names}
    <text x="${W / 2}" y="22" text-anchor="middle" font-size="15" font-weight="800" fill="#fff6dc">${title}</text>
    <text x="${W - 10}" y="${H - 10}" text-anchor="end" font-size="12" font-weight="700" fill="#efe9d8">깊이를 크게 과장했습니다.</text>
  </svg>`;
}

// ---------- 물길을 따라 자른 단면(가장 깊은 곳을 따라) ----------
export const LP = { W: 720, H: 300, top: 100, drop: 0.11, amp: 34, period: 160, first: 40, dr: 15, flood: 64 };
// 고른 바닥의 높이(하류로 갈수록 낮아짐)
const baseBed = x => LP.top + LP.drop * x;
// 바닥(y). 여울 꼭대기는 x = first + n*period, 소 바닥은 그 사이.
export const profileBed = (x, g) => baseBed(x) + g * LP.amp * -Math.cos(2 * Math.PI * (x - LP.first) / LP.period);
export const RIFFLE_X = [40, 200, 360, 520, 680], POOL_X = [120, 280, 440, 600];
// 평소 물높이(y): 소에서는 아래쪽 여울 꼭대기가 물을 막아 평평하고, 여울에서는 바닥을 따라 얕고 급하게 내려간다.
export function profileWater(x, g, flood = false) {
  if (flood) return baseBed(x) - LP.flood;
  // 지금 자리부터 다음 여울 꼭대기까지 바닥이 가장 높은 곳이 물을 막는다.
  const next = RIFFLE_X.find(r => r >= x) ?? x + LP.period;
  let top = profileBed(x, g);
  for (let q = x; q <= next; q += 1) top = Math.min(top, profileBed(q, g));
  return Math.min(top, profileBed(x, g)) - LP.dr; // 물은 늘 바닥보다 dr 이상 위에 있다
}
// 화살표 길이로 보이는 물 빠르기(그림 값)
export function speed(kind, flood) { if (!flood) return kind === 'riffle' ? 46 : 18; return kind === 'riffle' ? 34 : 50; }

function profile(stage, flood) {
  const { W, H } = LP, g = GROWTH[stage];
  const bed = [], water = [];
  for (let x = 0; x <= W; x += 2) { bed.push([x, profileBed(x, g)]); water.push([x, profileWater(x, g, flood)]); }
  let s = `<rect width="${W}" height="${H}" fill="#23302a"/>`;
  s += `<polygon data-water="1" points="${pts([...water, [W, H], [0, H]])}" fill="${WATER}"/>`;
  if (flood) { const normal = []; for (let x = 0; x <= W; x += 2) normal.push([x, profileWater(x, g, false)]); s += `<polyline points="${pts(normal)}" fill="none" stroke="#d8f0ff" stroke-width="1.3" stroke-dasharray="3 4"/>`; }
  s += `<polygon points="${pts([...bed, [W, H], [0, H]])}" fill="${SOIL}"/>`;
  if (g > 0) {
    let gv = '';
    for (const r of RIFFLE_X) for (let i = 0; i < 9; i++) { const x = r - 32 + i * 8; if (x < 2 || x > W - 2) continue; gv += `<ellipse cx="${f1(x)}" cy="${f1(profileBed(x, g) + 3)}" rx="3.4" ry="2.6" fill="${GRAVEL}" stroke="${GRAVEL_EDGE}" stroke-width="0.7"/>`; }
    s += `<g data-gravel="1">${gv}</g>`;
  }
  s += `<polyline points="${pts(bed)}" fill="none" stroke="#3b2f22" stroke-width="2.2"/>`;
  s += `<polyline data-surface="1" points="${pts(water)}" fill="none" stroke="#e8f8ff" stroke-width="2.2"/>`;
  // 물 빠르기 화살표(물속, 오른쪽으로)
  let ar = '';
  const yIn = x => (profileWater(x, g, flood) + profileBed(x, g)) / 2;
  if (g > 0) {
    for (const r of RIFFLE_X.slice(1, 4)) {
      // 여울 화살표는 얕은 물 가운데를 따라 휜다
      const L = speed('riffle', flood), p = []; for (let x = r - L / 2 + 6; x <= r + L / 2 + 6; x += 3) p.push([x, yIn(x)]);
      const [a, b] = p.slice(-2);
      ar += `<polyline points="${pts(p.slice(0, -1))}" fill="none" stroke="${FAST}" stroke-width="2.4" stroke-linecap="round"/>${arrowHead(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), FAST, 6)}`;
    }
    for (const p of POOL_X.slice(0, 4)) { const L = speed('pool', flood); ar += arrow(p - L / 2, yIn(p) + 8, p + L / 2, yIn(p) + 8, FAST, 2.4, 6); }
  }
  s += ar;
  let names = '';
  if (g > 0) {
    // 이름은 땅속(바닥 아래)에 적어 물 표면과 겹치지 않게 한다
    for (const r of [200, 360, 520]) names += say('riffle', '여울', r, profileBed(r, g) + 30, '#e8f8ff', 17);
    for (const p of [280, 440]) names += say('pool', '소', p, profileBed(p, g) + 28, '#e8f8ff', 17);
    if (!flood) {
      names += plain('여울: 수면이 급하고 물이 빠름', W - 12, 30, '#e8f8ff', 14, 'end');
      names += plain('소: 수면이 평평하고 물이 느림', W - 12, 50, '#e8f8ff', 14, 'end');
    } else {
      names += say('flood', '홍수 때', W - 12, 28, '#ff9a6b', 17, 'end');
      names += plain('수면이 고르게 기울고 소의 물이 빨라져 바닥을 깎음', W - 12, 48, '#ffd8c4', 13, 'end');
      names += plain('(빠르기가 뒤바뀐다는 이 설명에는 다른 해석도 있음)', W - 12, 66, '#ffd8c4', 13, 'end');
    }
  } else names += plain('처음에는 바닥이 고르게 낮아짐', W - 12, 30, '#e8f8ff', 14, 'end');
  names += plain('상류', 12, H - 14, '#e6e2d4', 14, 'start') + plain('하류', W - 12, H - 32, '#e6e2d4', 14, 'end');
  return `<svg class="lp" viewBox="0 0 ${W} ${H}" role="img" aria-label="물길에서 가장 깊은 곳을 따라 자른 단면. ${g > 0 ? '깊은 소와 얕은 여울이 번갈아 나온다.' : '바닥이 고르다.'} ${FLOW_NAMES[flood ? 1 : 0]} 물높이를 보인다.">
    <style>svg.lp text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round}</style>
    ${s}${names}
    <text x="${W - 12}" y="${H - 12}" text-anchor="end" font-size="13" font-weight="700" fill="#efe9d8">높이를 크게 과장했습니다. 화살표 길이는 물 빠르기입니다.</text>
  </svg>`;
}

const LEGEND = [
  [`<rect width="22" height="14" fill="${DEEP}"/>`, '소(깊음)'],
  [`<rect width="22" height="14" fill="${SHALLOW}"/><circle cx="7" cy="7" r="2.4" fill="${GRAVEL}"/><circle cx="15" cy="8" r="2.4" fill="${GRAVEL}"/>`, '여울(얕음, 자갈)'],
  [`<rect width="22" height="14" fill="${SAND}"/>`, '모래톱'],
  [`<path d="M1 7H21" stroke="${FAST}" stroke-width="2.6" stroke-dasharray="6 4"/>`, '최심하상선(가장 깊고 빠른 줄)'],
  [`<path d="M2 2v10M7 2v10M12 2v10M17 2v10" stroke="#3b2f22" stroke-width="1.6"/>`, '가파른 둑'],
];

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? DONE, flood = false, zone = null, zoneAt = 'plan';
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    const flows = `<div class="row" aria-label="물의 양">${FLOW_NAMES.map((t, n) => `<button data-schem-flow="${n}" class="${(n === 1) === flood ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    const note = where => zone && zoneAt === where ? `<p class="schem-note">${`<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}`}</p>` : '';
    root.innerHTML = `
      <h2>위에서 본 굽이진 물길 (모식도)</h2>
      ${buttons}
      <figure>${plan(stage)}</figure>
      <div class="schem-legend">${LEGEND.map(([sw, t]) => `<span><svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${sw}</svg>${t}</span>`).join('')}</div>
      ${zone && zoneAt === 'plan' ? note('plan') : `<p class="schem-note">${NOTES[stage]}</p>`}
      <h2>가로로 자른 단면 (모식도)</h2>
      ${flows}
      <div class="schem-pair"><figure>${xsec('pool', stage, flood)}</figure><figure>${xsec('riffle', stage, flood)}</figure></div>
      ${note('xs')}
      <h2>물길을 따라 자른 단면 (모식도)</h2>
      <figure>${profile(stage, flood)}</figure>
      ${note('lp')}
      <p class="schem-cap">${CAPTION}</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const f = e.target.closest('[data-schem-flow]');
    if (f) { flood = f.dataset.schemFlow === '1'; paint(); return; }
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    const where = z.closest('svg.xs') ? 'xs' : z.closest('svg.lp') ? 'lp' : 'plan';
    zone = zone === z.dataset.zone && zoneAt === where ? null : z.dataset.zone;
    zoneAt = where;
    paint();
    onZone(zone);
  });
  paint();
  return {
    setStage(n) { if (n !== stage) { stage = n; zone = null; paint(); } },
    setFlood(v) { if (!!v !== flood) { flood = !!v; paint(); } },
    get stage() { return stage; },
    get flood() { return flood; },
  };
}
