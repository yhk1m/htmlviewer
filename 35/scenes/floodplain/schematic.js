// © 2026 김용현
// 범람원 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 첫 홍수, 1은 여러 번의 홍수, 2는 오늘날이다. 평면과 단면은 같은 구역 경계(ZONES)를 쓰므로 순서와 폭의 비율이 항상 같다.

export const ZONE_TEXT = {
  channel: { name: '하도', text: '평소에 강물이 흐르는 물길입니다. 홍수 때 물이 불어나 둑을 넘치면 양쪽 평지로 퍼져 나갑니다.' },
  levee: { name: '자연 제방', text: '물이 넘치면서 느려져 강바닥을 따라 구르던 모래 같은 굵은 알갱이가 하도 바로 옆에 먼저 멈춘 곳입니다. 하도 양옆에 길고 낮은 둑처럼 쌓여 주변보다 높습니다. 홍수 피해가 적고 물이 잘 빠져 밭과 취락이 들어섭니다.' },
  swamp: { name: '배후 습지', text: '자연 제방 뒤쪽, 골짜기 가장자리의 낮은 땅입니다. 물에 떠서 실려 가던 고운 진흙(부유 하중)이 멀리까지 와서 얇게 쌓였고, 물이 잘 빠지지 않아 논으로 이용해 왔습니다. 요즘은 우포늪처럼 습지로 보존하기도 합니다.' },
  flood: { name: '넘친 물', text: '하도를 넘친 물입니다. 이 물이 닿은 곳에만 입자가 쌓입니다. 물이 빠져도 낮은 배후 습지에는 물이 고입니다.' },
};

export const STAGE_NAMES = ['첫 홍수', '여러 번', '오늘날'];
const NOTES = [
  '첫 홍수: 평평한 골짜기 바닥으로 물이 넘쳐 퍼집니다. 하도 가까이에는 모래가, 멀리에는 진흙이 얇게 내려앉습니다. 아직 제방은 낮습니다.',
  '여러 번: 홍수 때마다 하도 옆에 모래가 더 쌓여 자연 제방이 높아집니다. 진흙은 그 뒤쪽 낮은 땅에 얇은 층으로 쌓입니다. 제방이 높아지면 작은 홍수는 넘치지 못합니다.',
  '오늘날: 높고 물이 잘 빠지는 자연 제방에는 밭과 취락이 있고, 낮고 물이 잘 빠지지 않는 배후 습지는 논으로 씁니다. 배후 습지를 습지 그대로 보존하는 곳도 있습니다.',
];

const ROCK = '#55524c', ROCK_LINE = '#6b675f', SAND = '#e2cb8c', SAND2 = '#d3b976', MUD = '#6d5a48', MUD2 = '#5e4c3c', WATER = '#59b7f0', FLOOD = '#8f6c45', ACCENT = '#e4b15a', GRASS = '#8ea765', HILL = '#46603a', FIELD = '#b7bd6f', PADDY = '#5f8f55';
const f1 = v => v.toFixed(1);
const POND_SECTION = [[-226, -170], [188, 244]]; // 오늘날 단면에서 고인 물 구간(강 중심에서 잰 칸)

// 강 중심에서 잰 구역 경계(단면 그림의 칸). 첫째는 A쪽, 둘째는 B쪽이다. 일부러 대칭이 아니다.
const RIVER = 24;
const LEVEE = [130, 150], SWAMP = [262, 276];
const RIVER_X = 330, SEC_W = 720, SEC_H = 340, GROUND = 214;
const LEVEE_H = [12, 32, 42], SWAMP_H = [3, 8, 11], BED = 46, ROWS = [1, 2, 3];
const BED_SHARE = 0.18, SURFACE_ABOVE_BED = 20; // 제방이 오른 만큼의 이 비율로 하도 바닥과 평소 수면이 오른다. 형성 모형의 비율과 비슷하되 그림에서 보이게 조금 크게 잡았다.
// 하도 바닥이 처음보다 오른 높이(그림 칸)
const bedRise = stage => BED_SHARE * sectionTops(stage).levee;
// 단계별 높이(그림의 y, 작을수록 높다). 수면은 언제나 습지 땅보다 낮다.
export function channelLevels(stage) {
  const rise = bedRise(stage), bed = GROUND + BED - rise, tops = sectionTops(stage);
  return { rise, bed, surface: bed - SURFACE_ABOVE_BED, swamp: GROUND - tops.swamp, levee: GROUND - tops.levee };
}

const zoneAt = o => {
  const d = Math.abs(o), side = o < 0 ? 0 : 1;
  return d < RIVER ? 'channel' : d < LEVEE[side] ? 'levee' : d < SWAMP[side] ? 'swamp' : 'hill';
};
// 평면의 A-B선을 걸으며 만나는 구역(검사용). 단면과 같은 순서여야 한다.
export function planCross() {
  const out = [];
  for (let o = -300; o <= 300; o += 2) { const z = zoneAt(o); if (out[out.length - 1] !== z) out.push(z); }
  return out;
}

// 쌓인 두께(그림 칸). 하도 옆에서 두껍고 멀어질수록 얇아진다. 형성 모형의 단면과 같은 꼴이다.
function thickAt(o, stage) {
  const d = Math.abs(o), side = o < 0 ? 0 : 1, lv = LEVEE[side], sw = SWAMP[side];
  if (d < RIVER || d >= sw) return 0;
  const edge = Math.min(1, (sw - d) / 26), mud = SWAMP_H[stage] * Math.sqrt(edge);
  if (d >= lv) return mud;
  const u = (d - RIVER) / (lv - RIVER), rise = Math.min(1, u / 0.1);
  return mud + LEVEE_H[stage] * Math.sqrt(rise) * (1 - u) ** 1.3;
}
// 땅 높이(그림의 y). 작을수록 높다.
function topAt(o, stage) {
  const d = Math.abs(o), side = o < 0 ? 0 : 1;
  if (d < RIVER) {
    // 하도: 평평한 바닥에서 양쪽 둑까지 비스듬히 오른다.
    const wall = Math.max(0, (d - RIVER * 0.55) / (RIVER * 0.45)), bank = GROUND - thickAt((o < 0 ? -1 : 1) * (RIVER + 1), stage), bed = GROUND + BED - bedRise(stage);
    return bed - (bed - bank) * wall;
  }
  if (d >= SWAMP[side]) return GROUND - (d - SWAMP[side]) * 0.72;
  return GROUND - thickAt(o, stage);
}
// 단면을 걸으며 구역마다 가장 높은 땅을 잰다(검사용). 작은 y가 높은 땅이다.
export function sectionTops(stage) {
  const out = { levee: Infinity, swamp: Infinity };
  for (let o = -300; o <= 300; o += 2) { const z = zoneAt(o); if (z in out) out[z] = Math.min(out[z], topAt(o, stage)); }
  return { levee: GROUND - out.levee, swamp: GROUND - out.swamp };
}

function section(stage) {
  const xs = [];
  for (let x = 0; x <= SEC_W; x += 3) xs.push(x);
  const pts = (fn, list = xs) => list.map(x => `${x},${f1(fn(x - RIVER_X))}`).join(' ');
  const ground = `0,${SEC_H} ${pts(o => Math.max(topAt(o, stage), zoneAt(o) === 'hill' || zoneAt(o) === 'channel' ? topAt(o, stage) : GROUND))} ${SEC_W},${SEC_H}`;
  // 층: 처음 땅 위에 홍수 묶음마다 모래를 먼저, 그 위에 진흙을 칠한다. 하도에서 멀수록 진흙 비율이 커진다.
  const sandShare = o => { const d = Math.abs(o), side = o < 0 ? 0 : 1, lv = LEVEE[side]; return d >= lv ? 0.06 : 0.92 - 0.5 * ((d - RIVER) / (lv - RIVER)) ** 1.5; };
  const laid = xs.filter(x => { const z = zoneAt(x - RIVER_X); return z === 'levee' || z === 'swamp'; });
  const left = laid.filter(x => x < RIVER_X), right = laid.filter(x => x > RIVER_X);
  const rows = ROWS[stage];
  let layers = '';
  for (const part of [left, right]) for (let r = 0; r < rows; r++) {
    const at = (o, f) => GROUND - thickAt(o, stage) * ((r + f) / rows);
    const band = (f0, f1v, color) => `<polygon points="${pts(o => at(o, f0 === 's' ? sandShare(o) : f0), part)} ${pts(o => at(o, f1v === 's' ? sandShare(o) : f1v), [...part].reverse())}" fill="${color}"/>`;
    layers += band(0, 's', r % 2 ? SAND2 : SAND) + band('s', 1, r % 2 ? MUD2 : MUD);
  }
  // 입자 크기: 제방 안의 굵은 모래와 습지 쪽의 고운 진흙을 점 크기로 보여 준다.
  let grains = '';
  if (stage >= 1) {
    for (const [a, b] of [[-104, -32], [32, 118]]) for (let o = a; o < b; o += 9) { const t = thickAt(o, stage); if (t > 12) grains += `<circle cx="${RIVER_X + o}" cy="${f1(GROUND - t * 0.32)}" r="2.3" fill="#a6894d"/>`; }
    for (const [a, b] of [[-250, -140], [160, 262]]) for (let o = a; o < b; o += 11) grains += `<circle cx="${RIVER_X + o}" cy="${f1(GROUND - thickAt(o, stage) * 0.55)}" r="0.9" fill="#231a12"/>`;
  }
  // 물: 첫 홍수와 여러 번은 흙탕물이 양쪽으로 퍼진 모습, 오늘날은 하도의 물과 배후 습지에 고인 물
  const level = GROUND - LEVEE_H[stage] - SWAMP_H[stage] - 18, normal = channelLevels(stage), inChannel = xs.filter(x => Math.abs(x - RIVER_X) < RIVER && topAt(x - RIVER_X, stage) > normal.surface);
  let water = '';
  if (stage < 2) {
    const under = xs.filter(x => topAt(x - RIVER_X, stage) > level);
    water += `<polygon points="${under.map(x => `${x},${f1(level)}`).join(' ')} ${pts(o => topAt(o, stage), [...under].reverse())}" fill="${FLOOD}" fill-opacity="0.72"/>`;
    // 홍수 물에 잠겨 있어도 평소 수면 자리를 점선으로 남겨 단계마다 오르는 것을 보여 준다.
    water += `<line data-surface="${f1(normal.surface)}" x1="${inChannel[0]}" x2="${inChannel[inChannel.length - 1]}" y1="${f1(normal.surface)}" y2="${f1(normal.surface)}" stroke="#d8efff" stroke-width="2" stroke-dasharray="5 4"/>`;
  } else {
    water += `<polygon data-surface="${f1(normal.surface)}" points="${inChannel.map(x => `${x},${f1(normal.surface)}`).join(' ')} ${pts(o => topAt(o, stage), [...inChannel].reverse())}" fill="${WATER}"/>`;
    for (const [a, b] of POND_SECTION) water += `<rect x="${RIVER_X + a}" y="${f1(GROUND - SWAMP_H[2] - 3)}" width="${b - a}" height="3" fill="${WATER}"/>`;
  }
  const say = (zone, text, o, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(RIVER_X + o)}" y="${f1(y)}" text-anchor="middle" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  let names = say('channel', '하도', 0, normal.bed + 24, '#8fd6ff');
  const crest = GROUND - LEVEE_H[stage] - SWAMP_H[stage];
  if (stage === 0) {
    names += say('levee', '모래가 먼저 멈춤', -92, level - 12, '#ffd36b') + say('swamp', '진흙은 멀리 감', 196, level - 12) + say('flood', '넘친 물', -210, level + 20, '#ffdca6');
  } else if (stage === 1) {
    names += say('levee', '자연 제방', -74, level - 12, '#ffd36b') + say('levee', '자연 제방', 80, level - 12, '#ffd36b');
    names += say('swamp', '배후 습지', -196, GROUND - SWAMP_H[1] - 8) + say('swamp', '배후 습지', 208, GROUND - SWAMP_H[1] - 8);
    names += say('flood', '넘친 물', 208, level - 12, '#ffdca6');
  } else {
    names += say('levee', '자연 제방', -74, crest - 16, '#ffd36b') + say('levee', '자연 제방', 80, crest - 16, '#ffd36b');
    names += say('swamp', '배후 습지', -196, GROUND - SWAMP_H[2] - 12) + say('swamp', '배후 습지', 208, GROUND - SWAMP_H[2] - 12);
    const use = (t, o) => `<text x="${RIVER_X + o}" y="${GROUND + 24}" text-anchor="middle" font-size="16" font-weight="700" fill="#efe9d8">${t}</text>`;
    names += use('밭, 취락', -80) + use('밭, 취락', 88) + use('논', -196) + use('논', 208);
  }
  return `<svg class="sec" viewBox="0 0 ${SEC_W} ${SEC_H}" role="img" aria-label="골짜기를 A에서 B로 자른 단면. 하도 양옆에 모래가 많은 자연 제방이 높고, 그 뒤쪽에 진흙이 얇게 쌓인 배후 습지가 낮다.">
    <defs><pattern id="fpRock" width="18" height="12" patternUnits="userSpaceOnUse"><rect width="18" height="12" fill="${ROCK}"/><path d="M0 6h18M9 0v6" stroke="${ROCK_LINE}" stroke-width="1"/></pattern></defs>
    <polygon points="${ground}" fill="url(#fpRock)"/>
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    ${layers}${grains}${water}${names}
    <g font-size="15" font-weight="700" fill="#efe9d8">
      <rect x="16" y="${SEC_H - 26}" width="16" height="12" fill="${SAND}"/><text x="38" y="${SEC_H - 15}">모래(굵은 알갱이)</text>
      <rect x="176" y="${SEC_H - 26}" width="16" height="12" fill="${MUD}"/><text x="198" y="${SEC_H - 15}">진흙(고운 알갱이)</text>
      <text x="${SEC_W - 16}" y="${SEC_H - 15}" text-anchor="end">처음 골짜기 바닥</text>
    </g>
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC_W - 10}" y="24" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
  </svg>`;
}

// 평면: 왼쪽에서 오른쪽으로 흐르는 완만한 강. 띠의 폭은 단면의 구역 폭을 같은 비율(K)로 옮긴 것이다.
const PLAN = { W: 720, H: 340, K: 0.42, mid: 170 };
const riverY = x => PLAN.mid + 18 * Math.sin((x / 720) * Math.PI * 2 * 1.15 + 3.14);
const CROSS_X = 360;

// dir -1은 위쪽(A쪽), 1은 아래쪽(B쪽)이다.
function bandPath(d0, d1, dir) {
  const a = [], b = [];
  for (let x = -10; x <= 730; x += 10) { a.push([x, riverY(x) + dir * d0 * PLAN.K]); b.unshift([x, riverY(x) + dir * d1 * PLAN.K]); }
  return `M${[...a, ...b].map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}Z`;
}

// 오늘날 평면의 고인 물 타원. A-B선에 걸치고, 세로 폭은 단면의 물 구간을 평면 비율(K)로 옮긴 것이다. a, b는 강 중심에서 잰 단면 칸으로 되돌린 값이다.
export function planPonds() {
  return POND_SECTION.map(([a, b]) => {
    const dy0 = a * PLAN.K, dy1 = b * PLAN.K, ry = +((dy1 - dy0) / 2).toFixed(1), cx = CROSS_X + 6, cy = riverY(CROSS_X) + (dy0 + dy1) / 2, rx = 44;
    return { cx, cy, rx, ry, a: (cy - ry - riverY(CROSS_X)) / PLAN.K, b: (cy + ry - riverY(CROSS_X)) / PLAN.K, crossing: Math.abs(cx - CROSS_X) < rx };
  });
}
export const sectionPonds = () => POND_SECTION.map(([a, b]) => ({ a, b }));

function plan(stage) {
  const river = [];
  for (let x = -10; x <= 730; x += 10) river.push(`${x} ${f1(riverY(x))}`);
  const both = (zone, color, opacity = 1) => {
    const d0 = zone === 'levee' ? [RIVER, RIVER] : zone === 'swamp' ? LEVEE : [RIVER, RIVER], d1 = zone === 'levee' ? LEVEE : SWAMP;
    return `<path d="${bandPath(d0[0], d1[0], -1)}" fill="${color}" fill-opacity="${opacity}"/><path d="${bandPath(d0[1], d1[1], 1)}" fill="${color}" fill-opacity="${opacity}"/>`;
  };
  let bands = both('all', GRASS);
  if (stage === 0) bands += both('levee', SAND, 0.75) + both('swamp', MUD, 0.45) + both('all', FLOOD, 0.45);
  if (stage === 1) bands += both('swamp', MUD) + both('levee', SAND) + both('all', FLOOD, 0.3);
  let use = '';
  if (stage === 2) {
    bands += both('swamp', PADDY) + both('levee', FIELD);
    // 논은 네모 칸, 밭은 줄무늬, 취락은 작은 집 윤곽, 고인 물은 푸른 타원이다.
    for (let x = 30; x < 700; x += 46) for (const [dir, d] of [[-1, 166], [-1, 226], [1, 186], [1, 246]]) {
      const y = riverY(x) + dir * d * PLAN.K;
      use += `<rect x="${x - 16}" y="${f1(y - 9)}" width="32" height="18" fill="none" stroke="#3e6b3a" stroke-width="1.2"/><path d="M${x} ${f1(y - 9)}v18" stroke="#3e6b3a" stroke-width="1"/>`;
    }
    for (const x of [80, 170, 270, 450, 540, 640]) for (const dir of [-1, 1]) {
      const y = riverY(x) + dir * (dir < 0 ? 66 : 74) * PLAN.K;
      use += `<path d="M${x - 5} ${f1(y + 4)}v-6l5-5 5 5v6z" fill="#f1ead8" stroke="#3a342a" stroke-width="1"/>`;
    }
    for (const p of planPonds()) use += `<ellipse cx="${p.cx}" cy="${f1(p.cy)}" rx="${p.rx}" ry="${p.ry}" fill="${WATER}"/>`;
  }
  const yc = riverY(CROSS_X), Ay = yc - SWAMP[0] * PLAN.K - 16, By = yc + SWAMP[1] * PLAN.K + 16;
  const say = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  let names = say('channel', '하도', 118, riverY(118) + 6, '#8fd6ff');
  if (stage >= 1) {
    names += say('levee', stage === 2 ? '자연 제방 (밭, 취락)' : '자연 제방', 600, riverY(600) - 76 * PLAN.K + 6, '#ffd36b');
    names += say('swamp', stage === 2 ? '배후 습지 (논)' : '배후 습지', 600, riverY(600) - 196 * PLAN.K + 6);
    names += say('levee', stage === 2 ? '자연 제방 (밭, 취락)' : '자연 제방', 220, riverY(220) + 84 * PLAN.K + 6, '#ffd36b');
    names += say('swamp', stage === 2 ? '배후 습지 (논)' : '배후 습지', 220, riverY(220) + 208 * PLAN.K + 6);
  } else {
    names += say('flood', '넘친 물', 600, riverY(600) - 150 * PLAN.K, '#ffdca6');
  }
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 강과 범람원. 하도 양옆에 띠처럼 자연 제방이 있고 그 바깥에 배후 습지, 맨 바깥에 산지가 있다.">
    <rect width="${PLAN.W}" height="${PLAN.H}" fill="${HILL}"/>
    ${bands}${use}
    <path d="M${river.join('L')}" fill="none" stroke="${stage < 2 ? FLOOD : WATER}" stroke-width="${f1(RIVER * 2 * PLAN.K)}" stroke-linejoin="round"/>
    <line x1="${CROSS_X}" y1="${f1(Ay)}" x2="${CROSS_X}" y2="${f1(By)}" stroke="${ACCENT}" stroke-width="2" stroke-dasharray="4 5"/>
    <text x="${CROSS_X + 14}" y="${f1(Ay + 14)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${CROSS_X + 14}" y="${f1(By)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
    <text x="14" y="24" font-size="16" font-weight="700" fill="#efe9d8" paint-order="stroke" stroke="#1c211e" stroke-width="3">산지</text>
    <text x="${PLAN.W - 14}" y="${PLAN.H - 12}" text-anchor="end" font-size="16" font-weight="700" fill="#efe9d8" paint-order="stroke" stroke="#1c211e" stroke-width="3">산지</text>
    <g stroke="#f2fbff" stroke-width="2.4" fill="#f2fbff"><path d="M30 ${f1(riverY(30))}h26" fill="none"/><path d="M64 ${f1(riverY(30))}l-10-5v10z"/></g>
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
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 이 그림은 높이를 크게 과장했습니다. 구역의 폭과 토지 이용은 설명을 위한 예시입니다.${stage < 2 ? " 하도의 점선은 평소 수면 자리입니다." : ""} 하도 바닥과 평소 수면도 단계마다 조금씩 오릅니다.</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; paint(); return; }
    const g = e.target.closest('[data-zone]');
    if (!g) return;
    zone = zone === g.dataset.zone ? null : g.dataset.zone;
    paint();
    onZone(zone);
  });
  paint();
  return { setStage(n) { if (n !== stage) { stage = n; paint(); } }, get stage() { return stage; } };
}
