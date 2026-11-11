// © 2026 김용현
// 자유 곡류 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 굽이의 시작, 1은 굽이가 커짐, 2는 목 절단, 3은 직강 공사다. 평면의 A-B선은 굽이 꼭대기를 바깥(A)에서 안쪽(B)으로 자른다.

export const ZONE_TEXT = {
  channel: { name: '물길', text: '평소 강물이 흐르는 길입니다. 넓은 들판에서는 옆으로 옮겨 가는 것을 막는 산이 멀리 있어 자유롭게 굽습니다.' },
  outer: { name: '공격 사면', text: '굽이 바깥쪽 강둑입니다. 굽이를 도는 물은 원심력 때문에 바깥으로 쏠려 빠르고 깊어서 둑이 옆으로 깎이고(측방 침식) 가파릅니다. 둑 앞 바닥은 깊게 파여 소가 됩니다. 침식 하안이라고도 합니다.' },
  inner: { name: '활주 사면', text: '굽이 안쪽 강둑입니다. 물이 느리고 얕아 모래와 자갈이 쌓여 완만합니다. 퇴적 사면, 퇴적 하안이라고도 합니다. 이렇게 쌓인 모래와 자갈 더미를 포인트바라고 합니다.' },
  scroll: { name: '곡류 흔적', text: '물길이 옆으로 옮겨 가면서 옛 물길 가장자리는 낮은 모래 능선으로, 옛 물길 바닥은 낮은 땅(와지)으로 남은 것입니다. 능선과 낮은 땅이 물결처럼 번갈아 나옵니다.' },
  neck: { name: '곡류의 목', text: '이웃한 두 굽이 사이의 좁은 땅입니다. 양쪽 바깥 둑이 깎이면 점점 좁아지다가 끊어집니다.' },
  cut: { name: '새 물길', text: '목이 끊겨 생긴 짧은 물길입니다(목 절단). 물이 돌아가지 않고 곧장 흘러 강 길이가 그만큼 짧아지고, 끊긴 자리 앞뒤의 바닥 높이 차이 때문에 경사가 급해집니다.' },
  oxbow: { name: '우각호', text: '구하도에 물이 고인 호수입니다. C자나 U자 모양이라 소뿔이나 초승달처럼 보입니다. 큰물이 넘칠 때 들어온 고운 흙과 물풀이 쌓이면 습지가 되고 메워집니다.' },
  old: { name: '구하도', text: '예전에 강이 흐르던 옛 물길입니다. 끊긴 굽이는 모두 구하도이고, 거기에 물이 고이면 우각호입니다. 메워져도 주변보다 조금 낮아 지도와 논밭의 모양에 흔적이 남습니다.' },
  levee: { name: '인공 제방', text: '직강 공사에서 곧은 물길 양쪽에 쌓은 둑입니다. 물길이 옆으로 옮겨 가지 못하게 합니다. 둑 안의 물이 빨리 내려가므로 하류의 홍수 위험은 오히려 커질 수 있습니다.' },
};

export const STAGE_NAMES = ['굽이의 시작', '굽이가 커짐', '목 절단', '직강 공사'];
const NOTES = [
  '굽이의 시작: 조금 휜 곳에서 물이 바깥으로 쏠립니다. 수면의 물은 바깥으로 가서 바닥으로 내려가고, 바닥을 따라 안쪽으로 돌아옵니다(나선 모양의 흐름). 그래서 바깥쪽 둑은 깎이고 안쪽에는 모래가 쌓입니다.',
  '굽이가 커짐: 바깥이 깎이고 안쪽이 쌓이기를 되풀이해 굽이가 옆으로 커지고(측방 확대), 굽이 꼭대기보다 조금 하류 쪽이 더 깎여 하류로도 옮겨 갑니다(곡류의 이동). 이웃한 굽이 사이의 목이 좁아집니다.',
  '목 절단: 목이 끊기면 물은 짧은 새 물길로 흐릅니다. 옛 굽이는 물이 흐르지 않는 구하도가 되고, 양쪽 끝이 막혀 물이 고이면 우각호가 됩니다.',
  '직강 공사: 농경지와 시가지를 넓히려고 곧은 물길을 파고 둑을 쌓습니다. 강이 짧아져 경사가 급해지고 물이 빨라져 하류의 홍수 위험이 커지고 생태계가 망가질 수 있습니다. 만경강, 동진강처럼 넓은 평야를 흐르던 우리나라의 자유 곡류 하천 대부분이 이렇게 바뀌었습니다.',
];

const SAND = '#e6cf90', WATER = '#59b7f0', ACCENT = '#e4b15a', GRASS = '#8ea765', SOIL = '#6b5a45', MARSH = '#76924f', LEVEE = '#a9a79b';
const f1 = v => v.toFixed(1);
const PLAN = { W: 720, H: 380, mid: 190 };
// 목 절단 직전 물길의 조절점(왼쪽에서 오른쪽으로 흐른다). 앞 단계는 이 모양을 눌러 낮춘 것이어서 단계마다 같은 굽이가 자란다.
const FULL = [[-30, 212], [36, 196], [92, 112], [150, 70], [216, 86], [282, 128], [340, 176], [302, 232], [298, 296], [360, 336], [424, 298], [420, 232], [372, 176], [440, 124], [516, 76], [588, 74], [646, 124], [684, 180], [750, 194]];
const GENTLE = FULL.map((p, n) => [-30 + (780 * n) / (FULL.length - 1), PLAN.mid + (p[1] - PLAN.mid) * 0.26]);
const SHARE = [0, 0.66, 1, 1];
const APEX_POINT = 3; // 단면을 자르는 굽이 꼭대기의 조절점
const controls = stage => FULL.map((p, n) => [GENTLE[n][0] + (p[0] - GENTLE[n][0]) * SHARE[stage], GENTLE[n][1] + (p[1] - GENTLE[n][1]) * SHARE[stage]]);

// 조절점을 지나는 매끄러운 곡선
function spline(ctrl) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)], m = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 1.5));
    for (let q = 0; q < m; q++) {
      const t = q / m, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(a => 0.5 * (2 * p1[a] + (p2[a] - p0[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (3 * p1[a] - p0[a] - 3 * p2[a] + p3[a]) * t3)));
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}
const lengthOf = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };

// 목: 물길로는 멀고 땅에서는 가까운 두 점
function neckOf(pts) {
  let best = Infinity, bi = 0, bj = 0;
  const skip = 90;
  for (let i = 0; i < pts.length - skip; i += 2) for (let j = i + skip; j < pts.length; j += 2) {
    const d = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
    if (d < best && lengthOf(pts.slice(i, j + 1)) > d * 2) { best = d; bi = i; bj = j; }
  }
  return { i: bi, j: bj, d: best };
}
// 물길에서 곡률 방향이 바뀌는 자리로 나눈 굽이들. 굽이 안쪽 땅을 칠할 때 쓴다.
function bends(pts) {
  const sign = i => { const a = pts[i - 6], b = pts[i], c = pts[i + 6]; return (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) > 0 ? 1 : -1; };
  const out = [];
  let from = 6, cur = sign(6);
  for (let i = 7; i < pts.length - 6; i++) {
    const s = sign(i);
    if (s !== cur) { if (i - from > 30) out.push(pts.slice(from, i + 1)); from = i; cur = s; }
  }
  if (pts.length - 6 - from > 30) out.push(pts.slice(from, pts.length - 6));
  return out;
}
function oldPieces(pts) {
  // 곧은 물길 위아래로 나뉜 옛 굽이 조각. 곧은 물길과 둑에 가까운 부분은 뺀다.
  const out = [];
  let run = [];
  for (const p of pts) {
    if (Math.abs(p[1] - PLAN.mid) > 30 && p[0] > 6 && p[0] < PLAN.W - 6) run.push(p);
    else { if (run.length > 30) out.push(run); run = []; }
  }
  if (run.length > 30) out.push(run);
  return out;
}

// 검사와 그림이 함께 쓰는 평면 자료.
export function planData(stage) {
  const ctrl = controls(stage), pts = spline(ctrl), apex = ctrl[APEX_POINT];
  // 첫 굽이는 위쪽으로 볼록하다. 바깥(A)은 위, 안쪽(B)은 아래다.
  const cross = { x: apex[0], ay: apex[1] - 52, by: apex[1] + 62, apexY: apex[1], inner: 1 };
  if (stage === 3) {
    return { river: [[-20, PLAN.mid], [PLAN.W + 20, PLAN.mid]], straight: true, oxbows: oldPieces(pts), length: PLAN.W + 40, neckGap: null, cross: { x: 180, ay: PLAN.mid - 62, by: PLAN.mid + 62, apexY: PLAN.mid, inner: 1 }, cutAt: null, bendShapes: [] };
  }
  const neck = neckOf(pts);
  if (stage < 2) return { river: pts, oxbows: [], length: lengthOf(pts), neckGap: neck.d, neckAt: { x: (pts[neck.i][0] + pts[neck.j][0]) / 2, y: (pts[neck.i][1] + pts[neck.j][1]) / 2 }, cross, cutAt: null, bendShapes: bends(pts) };
  const shorter = [...pts.slice(0, neck.i + 1), ...pts.slice(neck.j)], loop = pts.slice(neck.i, neck.j + 1);
  return { river: shorter, oxbows: [loop.slice(14, loop.length - 14)], length: lengthOf(shorter), fullLength: lengthOf(pts), neckGap: 0, cross, cutAt: { x: (pts[neck.i][0] + pts[neck.j][0]) / 2, y: (pts[neck.i][1] + pts[neck.j][1]) / 2 }, bendShapes: bends(pts) };
}

// 단면의 물길 바닥. 비대칭 정도 skew(0은 대칭, 1은 크게 기움). o는 물길 가운데에서 잰 값 -1(바깥)에서 1(안쪽)까지.
export function bedDepth(o, skew) {
  const v = -o, sym = 1 - v * v, tilt = ((1 + v) * (1 + v) * (1 + v) * (1 - v)) / 1.6875;
  return sym * (1 - skew) + tilt * skew;
}
export const SKEW = [0.45, 0.95, 0.95, 0];
const SEC = { W: 720, H: 300, top: 120, left: 210, right: 510, deep: 118, water: 150 };
export function sectionShape(stage) {
  const pts = [], sk = SKEW[stage], half = (SEC.right - SEC.left) / 2, mid = (SEC.left + SEC.right) / 2;
  for (let x = SEC.left; x <= SEC.right; x += 3) pts.push([x, SEC.top + SEC.deep * bedDepth((x - mid) / half, sk)]);
  return pts;
}

// 굽이에서 도는 물: 수면 가까이는 바깥(왼쪽)으로, 바닥을 따라서는 안쪽(오른쪽)으로 간다. 모두 물속을 지난다(검사가 확인한다).
export function spiralPaths(stage) {
  const { water } = SEC, wet = sectionShape(stage).filter(p => p[1] > water + 20);
  let deep = wet[0];
  for (const p of wet) if (p[1] > deep[1]) deep = p;
  const left = wet[0][0], right = wet.at(-1)[0];
  return { water, surface: [[right - 4, water + 9], [left + 8, water + 9]], bed: wet.filter(p => p[0] >= deep[0]).map(p => [p[0], p[1] - 9]).filter(p => p[1] > water + 13) };
}

function section(stage) {
  const bed = sectionShape(stage), { W, H, top, left, right, water } = SEC;
  const base = stage === 3 ? top - 2 : top, leveeH = 26;
  const ground = stage === 3
    ? `0,${H} 0,${base} ${left - 56},${base} ${left - 34},${base - leveeH} ${left - 16},${base - leveeH} ${left},${base} ${bed.map(p => `${p[0]},${f1(p[1])}`).join(' ')} ${right},${base} ${right + 16},${base - leveeH} ${right + 34},${base - leveeH} ${right + 56},${base} ${W},${base} ${W},${H}`
    : `0,${H} 0,${top} ${bed.map(p => `${p[0]},${f1(p[1])}`).join(' ')} ${W},${top} ${W},${H}`;
  const under = bed.filter(p => p[1] > water);
  const waterPoly = `${under[0][0]},${water} ${under[under.length - 1][0]},${water} ${[...under].reverse().map(p => `${p[0]},${f1(p[1])}`).join(' ')}`;
  // 안쪽에 쌓인 모래: 물길 가운데보다 안쪽의 바닥 위와 그 옆 들판 아래가 모래다.
  let sand = '';
  if (stage < 3) {
    const mid = bed[Math.floor(bed.length * 0.56)], list = bed.filter(p => p[0] >= mid[0]);
    const lower = list.map(p => `${p[0]},${f1(p[1] + 16)}`).reverse().join(' ');
    sand = `<polygon data-sand="1" points="${list.map(p => `${p[0]},${f1(p[1])}`).join(' ')} ${W - 60},${top} ${W - 60},${top + 16} ${lower}" fill="${SAND}"/>`;
  }
  // 나선 흐름: 수면은 바깥으로, 바닥은 안쪽으로. 굽이일 때만 그린다.
  let spiral = '';
  if (stage < 3) {
    const a = spiralPaths(stage), head = (p, q) => { const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l; return `<path d="M${f1(p[0] + ux * 6)} ${f1(p[1] + uy * 6)}L${f1(p[0] - ux * 8 - uy * 6)} ${f1(p[1] - uy * 8 + ux * 6)}L${f1(p[0] - ux * 8 + uy * 6)} ${f1(p[1] - uy * 8 - ux * 6)}Z" fill="#f2fbff" stroke="none"/>`; };
    const line = pts => `<path d="M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}"/>`;
    spiral = `<g fill="none" stroke="#f2fbff" stroke-width="2.6">${line(a.surface)}${head(a.surface.at(-1), a.surface.at(-2))}${line(a.bed)}${head(a.bed.at(-1), a.bed.at(-2))}</g>`;
  }
  const say = (zone, text, x, y, color = '#f3f1ea', anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  let names = '';
  if (stage < 3) {
    names += say('outer', '공격 사면', 110, top - 22, '#ffb38a') + `<text x="110" y="${top + 28}" text-anchor="middle" font-size="16" font-weight="700" fill="#efe9d8">빠르고 깊다, 깎인다</text>`;
    names += say('inner', '활주 사면', 610, top - 22, '#ffd36b') + `<text x="610" y="${top - 2}" text-anchor="middle" font-size="16" font-weight="700" fill="#efe9d8">느리고 얕다, 쌓인다</text>`;
  } else {
    names += say('levee', '인공 제방', left - 90, top - 40, '#d7d5c8') + say('levee', '인공 제방', right + 90, top - 40, '#d7d5c8') + say('channel', '곧은 물길', 360, water - 40, '#8fd6ff');
  }
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="${stage < 3 ? '굽이를 바깥에서 안쪽으로 자른 단면. 바깥쪽은 깊고 가파르며 안쪽은 얕고 완만하다.' : '곧은 물길을 자른 단면. 양쪽 깊이가 비슷하고 둑이 있다.'}">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <polygon points="${ground}" fill="${SOIL}"/>
    ${stage === 3 ? `<polygon points="${left - 56},${base} ${left - 34},${base - leveeH} ${left - 16},${base - leveeH} ${left},${base}" fill="${LEVEE}"/><polygon points="${right},${base} ${right + 16},${base - leveeH} ${right + 34},${base - leveeH} ${right + 56},${base}" fill="${LEVEE}"/>` : ''}
    ${sand}
    <polygon data-water="1" points="${waterPoly}" fill="${WATER}"/>
    ${spiral}
    ${names}
    <text x="12" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${W - 12}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <g font-size="15" font-weight="700" fill="#efe9d8">
      ${stage < 3 ? `<rect x="16" y="${H - 26}" width="16" height="12" fill="${SAND}"/><text x="38" y="${H - 15}">쌓인 모래</text><text x="${W - 16}" y="${H - 15}" text-anchor="end">흰 화살표는 굽이에서 도는 물의 흐름</text>` : `<text x="16" y="${H - 15}">물길을 곧게 하면 굽이의 비대칭이 사라집니다.</text>`}
    </g>
  </svg>`;
}

function plan(stage) {
  const d = planData(stage);
  const path = pts => `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
  const sw = 15;
  const label = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  let body = '', names = '';
  const c = d.cross;
  if (stage < 3) {
    // 굽이 안쪽 땅에만 모래가 쌓인다. 옛 강둑 자리는 굽이를 줄인 줄무늬로 그린다.
    for (const b of d.bendShapes) {
      const a = b[0], z = b[b.length - 1], mx = (a[0] + z[0]) / 2, my = (a[1] + z[1]) / 2;
      const shrink = k => b.map(p => [mx + (p[0] - mx) * k, my + (p[1] - my) * k]);
      // 굽이 안쪽 강둑을 따라 초승달 모양으로 쌓인다.
      body += `<path data-bar="1" d="${path(b)}L${shrink(0.42).reverse().map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z" fill="${SAND}"/>`;
      if (stage >= 1) for (const k of [0.8, 0.61]) body += `<path d="${path(shrink(k))}" fill="none" stroke="#b49c5e" stroke-width="2"/>`;
    }
    body += `<path data-river="1" d="${path(d.river)}" fill="none" stroke="${WATER}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const o of d.oxbows) body += `<path data-oxbow="1" d="${path(o)}" fill="none" stroke="${WATER}" stroke-width="${sw - 3}" stroke-linecap="round"/>`;
    const lead = (x1, y1, x2, y2, color) => `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${color}" stroke-width="2"/>`;
    names += lead(c.x + 62, c.ay + 8, c.x + 34, c.apexY - 7 + (stage === 0 ? 3 : 8), '#ffb38a') + label('outer', '공격 사면', c.x + 92, c.ay + 2, '#ffb38a');
    names += lead(c.x + 40, c.by + 8, c.x + 24, c.apexY + 14 + (stage === 0 ? 2 : 8), '#ffd36b') + label('inner', '활주 사면', c.x + 70, c.by + 26, '#ffd36b');
    if (stage === 1) names += label('neck', '곡류의 목', d.neckAt.x, d.neckAt.y + 6, '#ffe9b0') + label('scroll', '곡류 흔적', 590, 150, '#ffd36b');
    if (stage === 2) {
      names += `<circle cx="${f1(d.cutAt.x)}" cy="${f1(d.cutAt.y)}" r="20" fill="none" stroke="#ffe9b0" stroke-width="2.4"/>` + label('cut', '새 물길', d.cutAt.x + 64, d.cutAt.y - 6, '#ffe9b0');
      names += label('oxbow', '우각호', d.cutAt.x + 2, 368, '#8fd6ff');
    }
    names += label('channel', '물길', 44, stage === 0 ? PLAN.mid - 26 : 170, '#8fd6ff');
  } else {
    body += `<path d="M-20 ${PLAN.mid - 21}H${PLAN.W + 20}M-20 ${PLAN.mid + 21}H${PLAN.W + 20}" stroke="${LEVEE}" stroke-width="7"/>`;
    d.oxbows.forEach(o => {
      const isLake = o[0][1] > PLAN.mid; // 아래쪽 큰 굽이는 아직 물이 있고, 위쪽 굽이는 메워졌다.
      body += `<path ${isLake ? 'data-oxbow="1"' : 'data-old="1"'} d="${path(o)}" fill="none" stroke="${isLake ? WATER : MARSH}" stroke-width="11" stroke-linecap="round"/>`;
    });
    body += `<path data-river="1" d="M-20 ${PLAN.mid}H${PLAN.W + 20}" fill="none" stroke="${WATER}" stroke-width="${sw}"/>`;
    names += label('oxbow', '우각호', 360, 368, '#8fd6ff') + label('old', '구하도', 150, 110, '#e8f2c4') + label('old', '구하도', 552, 110, '#e8f2c4');
    names += label('levee', '인공 제방', 382, PLAN.mid - 32, '#d7d5c8') + label('channel', '곧은 물길', 90, PLAN.mid + 7, '#e8f6ff');
  }
  const Ay = c.ay, By = c.by;
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 강. ${STAGE_NAMES[stage]} 단계의 물길 모양을 보여 준다.">
    <rect width="${PLAN.W}" height="${PLAN.H}" fill="${GRASS}"/>
    ${body}
    <line x1="${f1(c.x)}" y1="${f1(Ay)}" x2="${f1(c.x)}" y2="${f1(By)}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/>
    <text x="${f1(c.x + 10)}" y="${f1(Ay + 6)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${f1(c.x + 10)}" y="${f1(By + 6)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
    <g stroke="#1c211e" stroke-width="2.4" fill="#1c211e"><path d="M14 ${PLAN.H - 22}h34" fill="none"/><path d="M56 ${PLAN.H - 22}l-10-5v10z"/></g>
    <text x="64" y="${PLAN.H - 16}" font-size="15" font-weight="700" fill="#1c211e">물 흐름</text>
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? 2, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>위에서 본 모습 (모식도)</h2>
      ${buttons}
      <figure>${plan(stage)}</figure>
      <h2>A에서 B로 자른 단면 (모식도)</h2>
      <figure>${section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 이 그림은 높이를 크게 과장했고, 단면은 물길 부분을 넓혀 그렸습니다. 굽이의 모양과 크기는 설명을 위한 예시입니다.</p>`;
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
  return { setStage(n) { if (n !== stage) { stage = n; if (zone) { zone = null; onZone(null); } paint(); } }, get stage() { return stage; } };
}
