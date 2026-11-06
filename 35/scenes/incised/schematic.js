// © 2026 김용현
// 감입 곡류와 하안 단구 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 솟기 전, 1~3은 솟은 횟수다. 위에서 본 평면과 A-B 단면이 같은 구역을 공유한다.

export const ZONE_TEXT = {
  meander: { name: '감입 곡류', text: '강이 굽이 모양을 지킨 채 아래로 파고들어, 깊은 골짜기 속에서 굽이치는 모습입니다.' },
  old: { name: '옛 범람원', text: '땅이 솟기 전 강이 흐르던 넓은 범람원입니다. 지금은 가장 높은 곳에 남았고 자갈층이 얇게 있습니다. 솟은 횟수가 둘 이상이면 계단의 맨 위이므로 가장 높은 단구면이기도 합니다.' },
  tread: { name: '단구면', text: '옛 골짜기 바닥이 강보다 높은 곳에 남은 평평한 면입니다. 높을수록 오래되었습니다. 홍수에 잠기지 않아 마을과 밭이 들어서기도 합니다.' },
  scarp: { name: '단구애', text: '단구면 앞의 가파른 경사입니다. 강이 파고들 때 깎여 생겼습니다.' },
  floor: { name: '지금 범람원', text: '지금의 강이 좌우로 옮겨 다니며 사면 아래를 깎아 넓힌 낮은 바닥입니다. 물이 떠난 자리에는 자갈이 쌓이고, 홍수 때 물에 잠깁니다.' },
  neck: { name: '목', text: '고리의 밑동에서 강과 강 사이가 좁아진 땅입니다. 양쪽에서 강이 벽을 깎아 점점 얇아지다가 끝내 잘립니다.' },
  shortcut: { name: '신하도', text: '잘린 목으로 난 새 물길입니다. 긴 고리를 돌지 않고 지름길로 흐릅니다.' },
  oldChannel: { name: '구하도', text: '물이 끊긴 옛 고리입니다. 평탄한 바닥과 자갈층이 남아 있고, 강이 더 파고들면 지금 강보다 높은 곳에 남습니다.' },
  core: { name: '미앤더 핵', text: '구하도와 신하도 사이에 섬처럼 남은 언덕입니다. 곡류핵이라고도 합니다. 꼭대기에는 옛 범람원 면이 남아 있습니다.' },
};

// 조건(kind)마다 말이 다르다. uplift는 땅이 솟음, sea는 해수면이 낮아짐, both는 둘 다, still은 아무 변화 없음.
const STILL_NOTE = '변화 없음: 땅도 해수면도 그대로라 강이 파고들지 않고 자유 곡류로 남습니다.';
export const STAGE_NAMES = {
  uplift: ['솟기 전', '한 번 솟음', '두 번 솟음', '세 번 솟음'],
  sea: ['낮아지기 전', '한 번 낮아짐', '두 번 낮아짐', '세 번 낮아짐'],
  both: ['변화 전', '한 번 파고듦', '두 번 파고듦', '세 번 파고듦'],
  still: ['변화 없음', '변화 없음', '변화 없음', '변화 없음'],
};
export const CORE_STAGE_NAMES = ['목 좁아짐', '목 절단', '미앤더 핵'];
const CORE_NOTES = [
  '목 좁아짐: 감입 곡류의 고리가 깊어지면 고리 밑동이 좁아집니다. 목 양쪽에서 강이 벽을 깎아 목이 점점 얇아집니다.',
  '목 절단: 양쪽의 침식이 만나 목이 잘립니다. 물은 잘린 곳으로 난 지름길(신하도)로 흐르기 시작하고, 옛 고리의 물은 줄어듭니다.',
  '미앤더 핵: 옛 고리는 물이 끊긴 구하도가 되고, 구하도와 신하도 사이의 언덕은 섬처럼 남습니다. 강이 더 파고들면 구하도는 지금 강보다 높은 곳에 남습니다.',
];
const HEAD = {
  uplift: ['땅이 솟기 전', '한 번 솟음', '두 번 솟음', '세 번 솟음'],
  sea: ['멀리 하류의 해수면이 낮아지기 전', '멀리 하류의 해수면이 한 번 낮아짐', '멀리 하류의 해수면이 두 번 낮아짐', '멀리 하류의 해수면이 세 번 낮아짐'],
  both: ['땅이 솟거나 해수면이 낮아지기 전', '땅이 솟거나 해수면이 낮아져 한 번 파고듦', '땅이 솟거나 해수면이 낮아져 두 번 파고듦', '땅이 솟거나 해수면이 낮아져 세 번 파고듦'],
};
function noteFor(stage, kind) {
  if (kind === 'still') return STILL_NOTE;
  const head = HEAD[kind][stage];
  if (stage === 0) return `${head}: 강이 넓은 범람원 위를 자유롭게 굽이쳐 흐릅니다.`;
  if (stage === 1) return `${head}: ` + (kind === 'sea'
    ? '강의 침식 기준면이 낮아져 하류부터 위쪽으로 차례로 굽이 모양 그대로 파고듭니다. 땅은 솟지 않았지만 옛 범람원이 강 양옆의 높은 평탄면으로 남습니다.'
    : '강이 굽이 모양 그대로 파고든 감입 곡류가 됩니다. 옛 범람원이 강 양옆의 높은 평탄면으로 남습니다.');
  if (stage === 2) return `${head}: 두 번 파고들어 전의 골짜기 바닥이 단구면으로 남고, 그 앞에 단구애가 생깁니다. 옛 범람원은 가장 높은 단구면이 됩니다.`;
  return `${head}: 세 번 파고들어 계단이 남았습니다. 맨 위는 옛 범람원(가장 높은 단구면)이고, 그 아래 두 층은 옛 골짜기 바닥이 남은 단구면입니다. 높을수록 오래되었습니다.`;
}

const ROCK = '#55524c', ROCK_LINE = '#6b675f', GRAVEL = '#c9b178', WATER = '#59b7f0', ACCENT = '#e4b15a', PLAIN = '#6d8a58', TREAD = '#b59f62', FLOOR = '#d8cfae';
const f1 = v => v.toFixed(1);
const LEVEL = 58, BED = 272, RIVER = 356, GRAVEL_T = 8;
// 강 왼쪽과 오른쪽의 너비. 왼쪽과 오른쪽이 일부러 다르다.
const SIDES = [
  { dir: -1, floor: 26, benches: [64, 40] },
  { dir: 1, floor: 44, benches: [34, 70] },
];
const WALL = 20;

// 한 쪽 강둑의 윤곽을 강에서 밖으로 만든다. 반환: 점 목록과 면 조각들.
function bankShape(side, stage, width) {
  const pts = [], treads = [], scarps = [];
  let x = 14, y = BED - 12;
  pts.push([RIVER + side.dir * x, y]);
  x += side.floor;
  pts.push([RIVER + side.dir * x, y]);
  const floorSeg = { a: RIVER + side.dir * 14, b: RIVER + side.dir * x, y };
  for (let lvl = 1; lvl <= stage; lvl++) {
    const x0 = x;
    x += WALL; y -= LEVEL;
    pts.push([RIVER + side.dir * x, y]);
    scarps.push({ x0: RIVER + side.dir * x0, x1: RIVER + side.dir * x, y0: y + LEVEL, y1: y });
    if (lvl < stage) {
      const b = side.benches[lvl - 1];
      const xa = x;
      x += b;
      pts.push([RIVER + side.dir * x, y]);
      treads.push({ a: RIVER + side.dir * xa, b: RIVER + side.dir * x, y, order: lvl });
    }
  }
  pts.push([RIVER + side.dir * width, y]);
  return { pts, treads, scarps, floorSeg, oldSeg: stage > 0 ? { a: RIVER + side.dir * x, b: RIVER + side.dir * width, y } : null, top: y };
}

function section(stage, kind) {
  const W = 720, H = 340;
  const left = bankShape(SIDES[0], stage, RIVER), right = bankShape(SIDES[1], stage, W - RIVER);
  const l = left.pts, r = right.pts;
  const channel = [[RIVER - 14, BED - 12], [RIVER - 8, BED], [RIVER + 8, BED], [RIVER + 14, BED - 12]];
  const outline = [...[...l].reverse(), ...channel.slice(1, 3), ...r];
  const ground = `0,${H} ${outline.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ')} ${W},${H}`;
  const strip = (a, b, y, cls = '') => `<rect class="${cls}" x="${f1(Math.min(a, b))}" y="${f1(y)}" width="${f1(Math.abs(b - a))}" height="${GRAVEL_T}" fill="${GRAVEL}"/>`;
  let layers = '', hits = '', texts = '';
  const pebble = (a, b, y, seed) => {
    let s = '';
    const lo = Math.min(a, b), hi = Math.max(a, b);
    for (let x = lo + 5, n = seed; x < hi - 3; x += 9, n++) s += `<circle cx="${f1(x)}" cy="${f1(y + 4 + (n % 2))}" r="${n % 3 ? 1.6 : 2.3}" fill="#8d8373"/>`;
    return s;
  };
  // 솟기 전에는 넓은 범람원 전체에 자갈층이 얇게 깔려 있다. 형성 모형의 단면과 같다.
  if (stage === 0) {
    layers += strip(0, RIVER - 14, BED - 12) + pebble(0, RIVER - 14, BED - 12, 1) + strip(RIVER + 14, W, BED - 12) + pebble(RIVER + 14, W, BED - 12, 2);
  }
  [left, right].forEach((b, n) => {
    layers += strip(b.floorSeg.a, b.floorSeg.b, b.floorSeg.y) + pebble(b.floorSeg.a, b.floorSeg.b, b.floorSeg.y, n);
    for (const t of b.treads) {
      layers += strip(t.a, t.b, t.y) + pebble(t.a, t.b, t.y, n + t.order);
      hits += `<g class="zone" data-zone="tread" style="cursor:pointer"><rect class="zone-band" x="${f1(Math.min(t.a, t.b))}" y="${f1(t.y - 26)}" width="${f1(Math.abs(t.b - t.a))}" height="34" fill="${ACCENT}" fill-opacity="0"/></g>`;
    }
    if (b.oldSeg) {
      layers += strip(b.oldSeg.a, b.oldSeg.b, b.oldSeg.y) + pebble(b.oldSeg.a, b.oldSeg.b, b.oldSeg.y, n + 2);
      hits += `<g class="zone" data-zone="old" style="cursor:pointer"><rect class="zone-band" x="${f1(Math.min(b.oldSeg.a, b.oldSeg.b))}" y="${f1(b.oldSeg.y - 26)}" width="${f1(Math.abs(b.oldSeg.b - b.oldSeg.a))}" height="34" fill="${ACCENT}" fill-opacity="0"/></g>`;
    }
    for (const s of b.scarps) if (stage >= 2) hits += `<polygon class="zone zone-band" data-zone="scarp" points="${f1(s.x0)},${f1(s.y0)} ${f1(s.x1)},${f1(s.y1)} ${f1(s.x1 + (n ? 14 : -14))},${f1(s.y1)} ${f1(s.x0 + (n ? 14 : -14))},${f1(s.y0)}" fill="${ACCENT}" fill-opacity="0" style="cursor:pointer"/>`;
  });
  const label = (zone, text, x, y, anchor = 'middle', color = 'currentColor') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  if (stage === 0) {
    texts += label('old', '넓은 범람원', 170, BED - 24);
  } else {
    texts += label('old', '옛 범람원', 70, left.top - 14, 'start');
    texts += label('old', '옛 범람원', W - 70, right.top - 14, 'end');
    // 계단이 생긴 뒤에는 맨 위 면이 가장 높은 단구면이기도 하다. 작은 글씨로 덧붙인다.
    if (stage >= 2) {
      const sub = (x, y, anchor) => `<text class="zone" data-zone="old" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="16" font-weight="700" fill="#f3f1ea" style="cursor:pointer">(가장 높은 단구면)</text>`;
      texts += sub(70, left.top - 36, 'start') + sub(W - 70, right.top - 36, 'end');
    }
    left.treads.concat(right.treads).forEach(t => { texts += label('tread', '단구면', (t.a + t.b) / 2, t.y - 10, 'middle', '#ffd36b'); });
    if (stage >= 2) {
      const s = left.scarps[0];
      texts += label('scarp', '단구애', (s.x0 + s.x1) / 2 - 32, (s.y0 + s.y1) / 2 + 6, 'end', '#f3a58a');
    }
    texts += label('floor', '지금 범람원', (right.floorSeg.a + right.floorSeg.b) / 2 + 6, BED - 52);
  }
  const upArrows = kind === 'sea' || kind === 'still' ? '' : `
    <g stroke="#efe9d8" stroke-width="2.4" fill="#efe9d8">
      <path d="M30 322V${f1(BED)}" fill="none"/><path d="M30 ${f1(BED - 10)}l-6 12h12z"/>
      <path d="M${W - 30} 322V${f1(BED)}" fill="none"/><path d="M${W - 30} ${f1(BED - 10)}l-6 12h12z"/>
    </g>
    <text x="46" y="316" font-size="17" font-weight="700" fill="#efe9d8">땅이 솟음</text>`;
  const arrows = stage > 0 ? `${upArrows}
    <g stroke="${WATER}" stroke-width="2.4" fill="${WATER}"><path d="M${RIVER} ${f1(BED + 8)}v30" fill="none"/><path d="M${RIVER} ${f1(BED + 44)}l-6-12h12z"/></g>
    <text x="${RIVER + 12}" y="${f1(BED + 36)}" font-size="17" font-weight="700" fill="${WATER}">하방 침식</text>` : '';
  const sideArrow = stage > 0 ? `<g stroke="${WATER}" stroke-width="2.4"><path d="M${f1(RIVER + 18)} ${f1(BED - 18)}h34" fill="none"/></g><path d="M${f1(RIVER + 62)} ${f1(BED - 18)}l-10-5v10z" fill="${WATER}"/><text x="${f1(RIVER + 18)}" y="${f1(BED - 26)}" font-size="16" font-weight="700" fill="${WATER}">측방 침식</text>` : '';
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="골짜기를 A에서 B로 자른 단면. 솟은 횟수만큼 면이 계단처럼 남고, 면 위에는 자갈층이 얇게 있다.">
    <defs><pattern id="incRock" width="18" height="12" patternUnits="userSpaceOnUse"><rect width="18" height="12" fill="${ROCK}"/><path d="M0 6h18M9 0v6" stroke="${ROCK_LINE}" stroke-width="1"/></pattern></defs>
    <polygon points="${ground}" fill="url(#incRock)"/>
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    ${layers}
    <polygon points="${channel.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ')}" fill="${WATER}"/>
    ${hits}${arrows}${sideArrow}${texts}
    <text x="${RIVER}" y="${f1(BED - 16)}" text-anchor="middle" font-size="17" font-weight="700" fill="${WATER}">강</text>
    <text x="170" y="${H - 8}" font-size="16" font-weight="700" fill="#efe9d8">기반암</text>
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${W - 10}" y="24" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
  </svg>`;
}

// 강 중심선: 형성 모형과 같은 종류의 곡선을 모식도 크기로 그린다.
function riverLine() {
  const pts = [];
  let x = -30, y = 150, phi = 0.4;
  while (x < 750) {
    const th = 1.42 * Math.sin(phi) + 0.17 * Math.sin(3 * phi);
    pts.push([x, y]);
    x += Math.cos(th) * 4; y += Math.sin(th) * 4;
    phi += (2 * Math.PI) / 190;
  }
  const ys = pts.map(p => p[1]), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map(p => [p[0], p[1] + 150 - mid]);
}

// 단구면 조각: 강에서 일정한 거리에 놓인 나뭇잎 모양. 조각마다 놓일 곳을 손으로 정했다.
// [시작, 끝, 어느 쪽(-1, 1), 굵기]. 시작과 끝은 강 길이의 비율이다.
const PATCHES = {
  outer: [[0.03, 0.12, -1, 1], [0.16, 0.25, 1, 0.8], [0.31, 0.42, -1, 0.9], [0.46, 0.56, 1, 1], [0.6, 0.67, -1, 0.7], [0.72, 0.83, 1, 0.9], [0.87, 0.97, -1, 1]],
  inner: [[0.06, 0.15, 1, 0.9], [0.2, 0.33, -1, 1], [0.37, 0.45, 1, 0.8], [0.5, 0.61, -1, 0.9], [0.66, 0.76, 1, 1], [0.79, 0.9, -1, 0.8], [0.93, 1, 1, 0.9]],
};
const REACH = 72; // A-B선이 강 중심에서 양쪽으로 뻗는 길이. 가장 넓은 골짜기 띠(절반 56)를 지나 옛 범람원까지 닿는다.
const BAND_HALF = [0, 19, 36, 56];

// 단면 자리: 가운데 근처에서 위아래로 지나는 굽이를 가로지른다.
function sectionSpot(pts) {
  const at = pts.reduce((b, p, i) => (Math.abs(p[0] - 300) + Math.abs(p[1] - 150) < Math.abs(pts[b][0] - 300) + Math.abs(pts[b][1] - 150) ? i : b), 0);
  const a0 = pts[at - 2], a1 = pts[at + 2], th = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]);
  return { at, nx: -Math.sin(th), ny: Math.cos(th) };
}

// 단면과 같은 순서로 지나도록, A-B선이 지나는 자리에 양쪽 단구면 조각을 하나씩 반드시 둔다.
function patchSet(pts, at) {
  const L = pts.length - 3, span = 10, f = (at - 1) / L, near = p => (p[0] + p[1]) / 2 > f - 0.07 && (p[0] + p[1]) / 2 < f + 0.07;
  const here = side => [(at - span - 1 + 1e-6) / L, (at + span - 1 + 1e-6) / L, side, 1];
  const keep = list => list.filter(p => !near(p));
  return { outer: [...keep(PATCHES.outer), here(-1), here(1)], inner: [...keep(PATCHES.inner), here(-1), here(1)] };
}

function patchPoly(pts, [a, b, side, fat], d0, d1) {
  const from = Math.floor(a * (pts.length - 3)) + 1, to = Math.floor(b * (pts.length - 3)) + 1;
  const edge = [], back = [];
  for (let t = from; t <= to; t++) {
    const u = (t - from) / Math.max(1, to - from), bulge = Math.sin(Math.PI * u) ** 0.6;
    const th = Math.atan2(pts[t + 1][1] - pts[t - 1][1], pts[t + 1][0] - pts[t - 1][0]);
    const nx = -Math.sin(th) * side, ny = Math.cos(th) * side, wide = d0 + (d1 - d0) * bulge * fat;
    edge.push([pts[t][0] + nx * d0, pts[t][1] + ny * d0]);
    back.unshift([pts[t][0] + nx * wide, pts[t][1] + ny * wide]);
  }
  return [...edge, ...back];
}
const patchPath = (pts, patch, d0, d1) => `M${patchPoly(pts, patch, d0, d1).map(q => `${f1(q[0])} ${f1(q[1])}`).join('L')}Z`;
const insidePoly = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

// 평면의 A-B선을 따라 걸으며 만나는 지형을 차례로 적는다(검사용). 단면의 순서와 같아야 한다.
export function planCross(stage) {
  const pts = riverLine(), { at, nx, ny } = sectionSpot(pts), set = patchSet(pts, at);
  const polys = [];
  if (stage >= 2) set.inner.forEach(p => polys.push(patchPoly(pts, p, 17, stage === 3 ? 32 : 34)));
  if (stage === 3) set.outer.forEach(p => polys.push(patchPoly(pts, p, 34, 54)));
  const out = [];
  for (let o = -REACH; o <= REACH; o += 0.5) {
    const x = pts[at][0] + nx * o, y = pts[at][1] + ny * o, d = Math.abs(o);
    const z = d < 3.5 ? 'river' : stage === 0 ? 'old' : d < 13 ? 'floor' : polys.some(q => insidePoly(q, x, y)) ? 'tread' : d < BAND_HALF[stage] ? 'scarp' : 'old';
    if (out[out.length - 1] !== z) out.push(z);
  }
  return out;
}

function plan(stage) {
  const pts = riverLine(), { at, nx, ny } = sectionSpot(pts), set = patchSet(pts, at);
  const d = `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
  const band = (w, color) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const patches = (list, d0, d1, color) => list.map(p => `<path d="${patchPath(pts, p, d0, d1)}" fill="${color}" stroke="#4d463d" stroke-width="1"/>`).join('');
  let body = '';
  // 바깥 층부터 그린다.
  if (stage === 3) body += band(112, '#6f665a') + patches(set.outer, 34, 54, TREAD) + patches(set.inner, 17, 32, '#cdb97c') + band(26, FLOOR);
  else if (stage === 2) body += band(72, '#6f665a') + patches(set.inner, 17, 34, '#cdb97c') + band(26, FLOOR);
  else if (stage === 1) body += band(38, '#6f665a') + band(26, FLOOR);
  body += band(7, WATER);
  const A = [pts[at][0] - nx * REACH, pts[at][1] - ny * REACH], B = [pts[at][0] + nx * REACH, pts[at][1] + ny * REACH];
  const apex = pts.reduce((b, p) => (p[0] > 200 && p[0] < 560 && p[1] > b[1] ? p : b), [0, 0]);
  const name = stage === 0 ? '자유 곡류' : '감입 곡류';
  return `<svg viewBox="0 0 720 300" role="img" aria-label="위에서 본 강과 골짜기. 강의 굽이는 처음과 같고, 솟은 횟수만큼 골짜기가 넓어지며 단구면 조각이 양쪽에 남는다.">
    <rect width="720" height="300" fill="${PLAIN}"/>
    ${body}
    <line x1="${f1(A[0])}" y1="${f1(A[1])}" x2="${f1(B[0])}" y2="${f1(B[1])}" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="4 5"/>
    <text x="${f1(A[0])}" y="${f1(A[1] - 6)}" text-anchor="middle" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${f1(B[0])}" y="${f1(B[1] + 18)}" text-anchor="middle" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    <text class="zone" data-zone="meander" x="${f1(apex[0])}" y="${f1(Math.min(292, apex[1] + 30))}" text-anchor="middle" font-size="20" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${name}</text>
    ${stage > 0 ? `<text class="zone" data-zone="old" x="16" y="28" font-size="19" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">옛 범람원</text>` : `<text class="zone" data-zone="old" x="16" y="28" font-size="19" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">넓은 범람원</text>`}
  </svg>`;
}

// 미앤더 핵 과정의 모식도. 평면의 고리를 먼저 만들고, 단면은 평면의 A-B선을 걸으며 만난 구간을 그대로 옮겨 그린다.
const CORE = { R: 78, R1: 26, cy: 118, cx: 330, valley: 46, floor: 28 };
function coreLine() {
  const { R, R1, cx, cy } = CORE, TURN = (5 * Math.PI) / 6, th = [], tail = 200, step = 2;
  for (let d = tail; d > 0; d--) th.push(0.26 * Math.sin((2 * Math.PI * d * step) / 190));
  const entry = Math.round((R1 * TURN) / step), loop = Math.round((R * 2 * TURN) / step);
  for (let i = 1; i <= entry; i++) th.push((-TURN * i) / entry);
  for (let i = 1; i <= loop; i++) th.push(-TURN + (2 * TURN * i) / loop);
  for (let i = 1; i <= entry; i++) th.push(TURN * (1 - i / entry));
  for (let d = 1; d <= tail; d++) th.push(0.26 * Math.sin((2 * Math.PI * d * step) / 190));
  const pts = [[0, 0]];
  for (let i = 1; i < th.length; i++) pts.push([pts[i - 1][0] + Math.cos(th[i]) * step, pts[i - 1][1] + Math.sin(th[i]) * step]);
  const apex = tail + entry + (loop >> 1), dx = cx - pts[apex][0], dy = cy - R - pts[apex][1];
  const out = pts.map(p => [p[0] + dx, p[1] + dy]);
  // 강이 곧장 위로 향하는 곳이 목이다.
  const neckFrom = tail + Math.round(entry * (90 / 150)), neckTo = 2 * apex - neckFrom;
  return { pts: out, neckFrom, neckTo, apex };
}
function coreGeometry() {
  const { pts, neckFrom, neckTo } = coreLine();
  const back = 5, sa = neckFrom - back, sb = neckTo + back;
  const neck = [(pts[neckFrom][0] + pts[neckTo][0]) / 2, (pts[neckFrom][1] + pts[neckTo][1]) / 2];
  // 지름길: 목 위아래에서 옛 물길을 떠나 잘린 곳을 지나 다시 만난다.
  const a = pts[sa], b = pts[sb], cut = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24, v = 1 - u;
    cut.push([v * v * a[0] + 2 * u * v * neck[0] + u * u * b[0], v * v * a[1] + 2 * u * v * (2 * neck[1] - (a[1] + b[1]) / 2) + u * u * b[1]]);
  }
  const before = pts.slice(0, sa + 1), after = pts.slice(sb), loop = pts.slice(sa, sb + 1);
  const dirX = Math.cos(0.87), dirY = Math.sin(0.87), C = [CORE.cx, CORE.cy];
  const A = [C[0] - dirX * (CORE.R + 44), C[1] - dirY * (CORE.R + 44)];
  // B는 지금 강을 건너 옛 범람원에 닿는 곳에 둔다. 평면 그림 안에 들어와야 한다.
  const B = [C[0] + dirX * 215, C[1] + dirY * 215];
  return { pts, loop, before, after, cut, neck, A, B };
}
const distTo = (list, x, y) => { let best = Infinity; for (let i = 1; i < list.length; i++) { const [ax, ay] = list[i - 1], [bx, by] = list[i], vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1))); best = Math.min(best, Math.hypot(ax + vx * t - x, ay + vy * t - y)); } return best; };
// 평면의 A-B선을 걸으며 만나는 구간. 단면은 이 구간을 그대로 그린다.
function coreWalk(stage) {
  const g = coreGeometry(), rest = [...g.before, ...g.cut, ...g.after], out = [], half = CORE.valley / 2;
  for (let f = 0; f <= 1.0001; f += 0.002) {
    const x = g.A[0] + (g.B[0] - g.A[0]) * f, y = g.A[1] + (g.B[1] - g.A[1]) * f;
    const dLoop = distTo(g.loop, x, y), dNow = stage === 0 ? distTo(g.pts, x, y) : distTo(rest, x, y);
    const insideRing = Math.hypot(x - CORE.cx, y - CORE.cy) < CORE.R;
    let zone = insideRing ? 'core' : 'plain';
    if (stage === 2) { if (dNow < half) zone = 'river'; else if (dLoop < half) zone = 'oldChannel'; }
    else if (dLoop < half || dNow < half) zone = 'valley';
    const last = out[out.length - 1];
    if (last && last.zone === zone) last.to = f; else out.push({ zone, from: f, to: f });
  }
  return out;
}
export const coreCross = stage => coreWalk(stage).map(z => z.zone);

function corePlan(stage) {
  const g = coreGeometry(), line = list => `M${list.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
  const full = line(g.pts), rest = line([...g.before, ...g.cut, ...g.after]), loop = line(g.loop), cut = line(g.cut);
  const band = (d, w, color) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const { valley, floor } = CORE;
  let body = '';
  if (stage === 0) body += band(full, valley, '#6f665a') + band(full, floor, FLOOR) + band(full, 7, WATER);
  if (stage === 1) body += band(full, valley, '#6f665a') + band(cut, valley, '#6f665a') + band(full, floor, FLOOR) + band(cut, floor, FLOOR) + band(loop, 4, WATER) + band(rest, 7, WATER);
  if (stage === 2) body += band(loop, valley, '#6f665a') + band(loop, floor, TREAD) + band(rest, valley, '#544c43') + band(rest, floor, FLOOR) + band(rest, 7, WATER);
  const say = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  let names = '';
  const [nx, ny] = g.neck;
  if (stage === 0) {
    names += say('neck', '목', nx, ny - 26, '#ffd36b');
    const push = (x, dir) => `<path d="M${f1(x)} ${f1(ny)}h${dir * 7}" stroke="#14507c" stroke-width="3" fill="none"/><path d="M${f1(x + dir * 15)} ${f1(ny)}l${-dir * 9}-5v10z" fill="#14507c"/>`;
    names += push(nx - 22, 1) + push(nx + 22, -1);
    names += `<text x="${f1(nx + 72)}" y="${f1(ny + 6)}" font-size="16" font-weight="700" fill="${WATER}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5">측방 침식</text>`;
    names += say('core', '고리 안쪽 언덕', CORE.cx, CORE.cy);
  }
  if (stage === 1) {
    names += say('shortcut', '목 절단', nx, ny + 44, '#ffd36b');
    names += say('core', '고리 안쪽 언덕', CORE.cx, CORE.cy);
  }
  if (stage === 2) {
    names += say('core', '미앤더 핵', CORE.cx, CORE.cy, '#ffd36b');
    names += say('oldChannel', '구하도', CORE.cx, CORE.cy - CORE.R + 6);
    names += say('shortcut', '신하도', nx, ny + 44, '#8fd6ff');
  }
  names += `<text class="zone" data-zone="old" x="16" y="28" font-size="19" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">옛 범람원</text>`;
  return `<svg viewBox="0 0 720 300" role="img" aria-label="위에서 본 고리 모양 강. 고리의 목이 잘리면 강은 지름길로 흐르고 옛 고리는 물 없는 구하도가 되어 언덕을 둘러싼다.">
    <rect width="720" height="300" fill="${PLAIN}"/>
    ${body}
    <line x1="${f1(g.A[0])}" y1="${f1(g.A[1])}" x2="${f1(g.B[0])}" y2="${f1(g.B[1])}" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="4 5"/>
    <text x="${f1(g.A[0])}" y="${f1(g.A[1] - 6)}" text-anchor="middle" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${f1(g.B[0] + 14)}" y="${f1(g.B[1] + 6)}" text-anchor="middle" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
  </svg>`;
}

function coreSection(stage) {
  const W = 720, H = 340, TOP = 96, FLOORY = 188, RIVERY = 278, WALLX = 20, walk = coreWalk(stage);
  const yOf = zone => (zone === 'plain' || zone === 'core' ? TOP : zone === 'river' ? RIVERY : FLOORY);
  const xOf = f => f * W;
  // 구간마다 윤곽 점을 만든다. 낮은 구간의 양 끝을 안쪽으로 줄여 벽이 비스듬해지게 한다.
  const outline = [];
  walk.forEach(z => {
    const a = xOf(z.from), b = xOf(z.to), y = yOf(z.zone), low = z.zone !== 'plain' && z.zone !== 'core';
    const inset = low ? Math.min(WALLX, (b - a) / 3) : 0;
    outline.push([a + inset, y], [b - inset, y]);
  });
  const ground = `0,${H} ${outline.map(p => `${f1(p[0])},${f1(p[1])}`).join(' ')} ${W},${H}`;
  let layers = '', names = '';
  const strip = (a, b, y) => `<rect x="${f1(a)}" y="${f1(y)}" width="${f1(b - a)}" height="${GRAVEL_T}" fill="${GRAVEL}"/>`;
  const label = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  walk.forEach(z => {
    const a = xOf(z.from), b = xOf(z.to), mid = (a + b) / 2, y = yOf(z.zone), low = z.zone !== 'plain' && z.zone !== 'core';
    const inset = low ? Math.min(WALLX, (b - a) / 3) : 0, ax = a + inset, bx = b - inset;
    layers += strip(ax, bx, y);
    if (z.zone === 'valley' || z.zone === 'river') layers += `<rect x="${f1(ax + 6)}" y="${f1(y - 10)}" width="${f1(Math.max(0, bx - ax - 12))}" height="10" fill="${WATER}"/>`;
    if (z.zone === 'core') names += label('core', stage === 2 ? '미앤더 핵' : '언덕', mid, y - 14, stage === 2 ? '#ffd36b' : '#f3f1ea');
    if (z.zone === 'oldChannel') names += label('oldChannel', '구하도', mid, y - 14);
    if (z.zone === 'river') names += label('meander', '지금 강', mid, y - 18, '#8fd6ff');
    if (z.zone === 'valley') names += label('meander', '강', mid, y - 18, '#8fd6ff');
    if (z.zone === 'plain' && b - a > 60) names += label('old', '옛 범람원', mid, y - 14);
  });
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="고리를 A에서 B로 자른 단면. 언덕 양옆으로 강이나 구하도가 있고, 그 너머에 지금 강이 있다.">
    <defs><pattern id="coreRock" width="18" height="12" patternUnits="userSpaceOnUse"><rect width="18" height="12" fill="${ROCK}"/><path d="M0 6h18M9 0v6" stroke="${ROCK_LINE}" stroke-width="1"/></pattern></defs>
    <polygon points="${ground}" fill="url(#coreRock)"/>
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    ${layers}${names}
    <text x="24" y="${H - 8}" font-size="16" font-weight="700" fill="#efe9d8">기반암</text>
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${W - 10}" y="24" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? 3, kind = 'uplift', zone = null;
  const shown = () => (kind === 'still' ? 0 : stage);
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const st = shown();
    const core = kind === 'core';
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES[core ? 'uplift' : kind].map((t, n) => `<button data-schem-stage="${n}" class="${!core && n === st ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="row" aria-label="미앤더 핵 과정">${CORE_STAGE_NAMES.map((t, n) => `<button data-schem-core="${n}" class="${core && n === st ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>위에서 본 모습 (모식도)</h2>
      ${buttons}
      <figure>${core ? corePlan(st) : plan(st)}</figure>
      <h2>A에서 B로 자른 단면 (모식도)</h2>
      <figure>${core ? coreSection(st) : section(st, kind)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : core ? CORE_NOTES[st] : noteFor(st, kind)}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 이 그림은 높이를 크게 과장했습니다.</p>`;
    root.querySelectorAll(`[data-zone="${zone}"].zone-band, .zone[data-zone="${zone}"] .zone-band`).forEach(b => b.setAttribute('fill-opacity', '0.28'));
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; if (kind === 'core') { kind = 'uplift'; zone = null; } paint(); return; }
    const c = e.target.closest('[data-schem-core]');
    if (c) { stage = +c.dataset.schemCore; if (kind !== 'core') zone = null; kind = 'core'; paint(); return; }
    const g = e.target.closest('[data-zone]');
    if (!g) return;
    zone = zone === g.dataset.zone ? null : g.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n, k = kind) { if (n !== stage || k !== kind) { if ((k === 'core') !== (kind === 'core')) zone = null; stage = n; kind = k; paint(); } }, get stage() { return stage; } };
}
