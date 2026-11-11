// © 2026 김용현
// 카르스트 지형 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단면은 네 단계(빗물이 스며 녹임, 돌리네, 우발레와 석회 동굴, 오늘날)로 바뀐다.
// 동굴 속 확대는 종유석, 석순, 석주가 생기는 차례를 세 칸으로, 평면은 돌리네가 이어져 우발레가 되는 모습을 두 칸으로 보인다.
// y는 화면(그림 픽셀) 좌표로, 아래로 갈수록 크다.

export const ZONE_TEXT = {
  solution: { name: '용식', text: '빗물에는 공기와 흙 속의 이산화 탄소가 녹아 있어 약한 산성을 띱니다. 이 물이 석회암의 갈라진 틈을 따라 스며들면서 석회암을 조금씩 녹입니다. 이렇게 물에 녹아 깎이는 것을 용식이라고 합니다. 아주 오랜 시간 용식이 이어지면 땅 위와 땅속에 카르스트 지형이 생깁니다.' },
  joint: { name: '절리', text: '바위가 갈라진 틈입니다. 빗물이 이 틈을 따라 스며들기 때문에 틈 둘레부터 먼저 녹아 넓어집니다. 틈이 많이 모인 곳은 더 많이 녹아 돌리네가 생기기 쉽습니다.' },
  doline: { name: '돌리네', text: '땅 위가 사발이나 깔때기 모양으로 움푹 꺼진 곳입니다. 빗물이 모여 스며드는 곳이 많이 녹아 생기기도 하고, 땅속 빈 곳 위가 무너져 생기기도 합니다. 바닥의 틈으로 물이 빠져 물이 잘 고이지 않습니다. 정선 민둥산 둘레 발구덕 마을의 돌리네가 잘 알려진 예입니다.' },
  uvala: { name: '우발레', text: '돌리네 여러 개가 넓어지면서 서로 이어진 더 큰 웅덩이입니다. 돌리네 사이를 나누던 둔덕이 낮아져 하나로 합쳐집니다. 바닥이 넓어 밭이나 집이 들어서기도 합니다.' },
  terra: { name: '테라로사', text: '석회암이 녹고 남은 찌꺼기 흙이 쌓인 붉은 흙입니다. 흙 속의 철 성분이 산소와 만나 붉은빛을 띱니다. 빗물에 씻겨 돌리네와 우발레 바닥에 두껍게 모이기 쉽습니다.' },
  farm: { name: '돌리네 밭', text: '돌리네와 우발레 바닥에는 테라로사가 모여 쌓여 밭으로 많이 씁니다. 물이 땅속으로 잘 빠져 논보다 밭이 많습니다. 정선 민둥산 발구덕 마을처럼 돌리네 안에 밭과 집이 있는 곳이 있습니다.' },
  stream: { name: '땅속으로 사라지는 하천', text: '석회암 땅에서는 물이 틈과 구멍으로 쉽게 빠집니다. 그래서 땅 위를 흐르던 하천이 구멍으로 빠져 땅속으로 사라지기도 합니다. 석회암 땅에는 땅 위 하천이 적고, 비가 와도 물이 금방 빠집니다.' },
  cave: { name: '석회 동굴', text: '땅속으로 스며든 물이 지하수면 근처에서 석회암을 녹여 넓힌 빈 곳입니다. 처음에는 지하수로 가득 차 있다가, 지하수면이 낮아지면 물이 빠지고 공기가 찹니다. 단양 고수동굴이 잘 알려진 예입니다. 동굴이 지하수면 바로 근처에서 생기는지, 더 깊은 곳에서도 생기는지에 대해서는 다른 해석도 있습니다.' },
  watertable: { name: '지하수면', text: '땅속에서 틈이 물로 가득 찬 부분의 윗면입니다. 이 아래는 지하수로 차 있습니다. 근처 하천이 바닥을 깎아 내려가거나 땅이 솟아오르면 지하수면이 낮아집니다.' },
  stalactite: { name: '종유석', text: '동굴 천장에서 고드름처럼 아래로 자란 돌입니다. 천장 틈에서 스며 나온 물방울에 녹아 있던 탄산 칼슘이 조금씩 쌓여 자랍니다.' },
  stalagmite: { name: '석순', text: '동굴 바닥에서 죽순처럼 위로 자란 돌입니다. 천장에서 떨어진 물방울 속 탄산 칼슘이 바닥에 쌓여 자랍니다. 그래서 종유석 바로 아래에 생기는 일이 많습니다.' },
  column: { name: '석주', text: '위에서 내려온 종유석과 아래에서 올라온 석순이 만나 이어진 돌기둥입니다.' },
};

export const STAGE_NAMES = ['빗물이 스며 녹임', '돌리네가 생김', '우발레와 석회 동굴', '오늘날의 카르스트 지형'];
export const RAIN = 0, DOLINE = 1, CAVE_STAGE = 2, TODAY = 3;
export const NOTES = [
  '빗물이 스며 녹임: 이산화 탄소가 녹아 약한 산성을 띤 빗물이 석회암의 갈라진 틈(절리)을 따라 스며들며 석회암을 녹입니다. 이것을 용식이라고 합니다. 아직은 땅 위로 하천이 흐릅니다.',
  '돌리네가 생김: 빗물이 모여 스며드는 곳이 많이 녹아 땅 위가 움푹 꺼진 돌리네가 생깁니다. 땅 위 하천은 구멍으로 빠져 땅속으로 사라집니다. 지하수면 근처에서는 틈이 녹아 넓어지기 시작합니다.',
  '우발레와 석회 동굴: 돌리네가 넓어지며 서로 이어져 우발레가 됩니다. 지하수면 근처에서는 석회암이 녹아 넓은 석회 동굴이 생깁니다. 이때 동굴은 지하수로 가득 차 있습니다.',
  '오늘날의 카르스트 지형: 지하수면이 낮아져 동굴에 물이 빠졌습니다. 천장에는 종유석, 바닥에는 석순이 자라고, 둘이 이어진 석주도 생깁니다. 땅 위는 붉은 테라로사가 덮고, 돌리네와 우발레 바닥은 밭으로 씁니다. 정선 민둥산 발구덕 마을의 돌리네 밭과 단양 고수동굴이 이런 지형의 예입니다.',
];
export const ZOOM_NAMES = ['물방울이 떨어짐', '종유석과 석순이 자람', '이어져 석주가 됨'];
export const ZOOM_NOTE = '동굴 천장의 틈에서 물방울이 스며 나옵니다. 물방울이 공기와 만나면 녹아 있던 이산화 탄소가 빠져나가고, 물에 녹아 있던 탄산 칼슘이 돌이 되어 쌓입니다. 천장에 매달린 채 쌓이면 종유석, 떨어진 물방울이 바닥에 쌓이면 석순이 됩니다. 둘이 자라 만나면 석주가 됩니다. 아주 오랜 시간이 걸리며, 자라는 빠르기는 곳마다 다릅니다.';
export const PLAN_NAMES = ['돌리네가 따로 있을 때', '돌리네가 이어진 우발레'];
export const CAPTION = '이름을 누르면 설명이 나옵니다. 돌리네와 동굴의 크기, 땅의 높이와 깊이는 실제보다 크게 과장했고, 그림은 설명을 위한 예시입니다. 아주 오랜 시간을 네 단계로 줄여 보여 줍니다. 돌리네가 생기는 방식(녹아서 꺼짐, 무너져 꺼짐)과 동굴이 생기는 깊이에는 다른 해석도 있습니다.';

const LIME = '#d4d4cc', LIME_LINE = '#a9a99f', JOINT = '#7d7e76', TERRA = '#9a4a2a', TERRA_DARK = '#6e3018', WATER = '#3f8fd0', WATER_LIGHT = '#9fd0f2';
const CAVE_AIR = '#2c2a26', CROP = '#8fc25a', CROP_DARK = '#4f7a2c', GRASS = '#7e9a5c', GRASS_DARK = '#5f7a45', STONE = '#ece6d4', STONE_EDGE = '#9c9480', INK = '#1c211e', DARK_TEXT = '#22261f';
const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
// 가운데가 1이고 양 끝(|t|=1)이 0인 매끄러운 혹
export const bump = t => { const u = clamp(1 - t * t, 0, 1); return u * u * (3 - 2 * u); };

function arrowHead(x, y, ang, color, size = 8) {
  const c = Math.cos(ang), s = Math.sin(ang), hx = x - size * 1.3 * c, hy = y - size * 1.3 * s;
  return `<path d="M${f1(hx - size * 0.7 * s)} ${f1(hy + size * 0.7 * c)}L${f1(x)} ${f1(y)}L${f1(hx + size * 0.7 * s)} ${f1(hy - size * 0.7 * c)}Z" fill="${color}"/>`;
}
function arrow(x0, y0, x1, y1, color, w = 2.6, size = 7, dash = '') {
  const a = Math.atan2(y1 - y0, x1 - x0), hx = x1 - size * 1.2 * Math.cos(a), hy = y1 - size * 1.2 * Math.sin(a);
  return `<path d="M${f1(x0)} ${f1(y0)}L${f1(hx)} ${f1(hy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>${arrowHead(x1, y1, a, color, size)}`;
}
// 밝은 바탕(하늘, 동굴 속)에는 밝은 글자, 석회암 위에는 어두운 글자(rock)를 쓴다.
const say = (zone, text, x, y, color = '#f3f1ea', size = 17, anchor = 'middle', rock = false) => `<text class="zone${rock ? ' rk' : ''}" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
const plain = (text, x, y, color = '#e6e2d4', size = 13, anchor = 'middle', rock = false) => `<text${rock ? ' class="rk"' : ''} x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
const lead = (x0, y0, x1, y1, color = '#f3f1ea') => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.5"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.4" fill="${color}"/>`;
const textStyle = cls => `<style>svg.${cls} text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round} svg.${cls} text.rk{stroke:#eeeee8}</style>`;

// ---------- 단면 ----------
export const XS = { W: 720, H: 420, ground: 112 };
// 돌리네 세 개: 왼쪽은 혼자 있는 돌리네, 오른쪽 둘은 넓어져 이어지는 우발레다.
export const DOLINE_X = 170;
export const UVALA_X = [440, 548];
const DEPTH = [0, 18, 34, 38], RADIUS = [0, 34, 60, 64], MERGE = [0, 0, 14, 17];
// 우발레가 이어지는 둔덕 자리(두 돌리네 한가운데)
export const UVALA_RIM = (UVALA_X[0] + UVALA_X[1]) / 2;
// 돌리네가 얼마나 파였는지(그림 픽셀)
export function hollow(x, stage) {
  const r = RADIUS[stage], d = DEPTH[stage];
  if (!r) return 0;
  let h = d * 1.1 * bump((x - DOLINE_X) / r);
  for (const c of UVALA_X) h += d * bump((x - c) / r);
  h += MERGE[stage] * bump((x - UVALA_RIM) / 110);
  return h;
}
// 땅 표면(y)
export const surfaceY = (x, stage) => XS.ground + 4 * Math.sin(x / 53) + hollow(x, stage);
// 테라로사 두께: 단계 2부터 덮이고, 돌리네 바닥에 두껍게 모인다.
export const terraThick = (x, stage) => stage < CAVE_STAGE ? 0 : (stage === TODAY ? 1 : 0.5) * (5 + 12 * hollow(x, stage) / 40);
// 지하수면(y): 단계 3에 낮아진다.
export const WATER_TABLE = [218, 218, 218, 336];
// 석회 동굴: 단계 1에 틈이 넓어지기 시작하고 단계 2에 다 자란다.
export const CAVE = { x0: 252, x1: 612, mid: 262, half: 32 };
const CAVE_SIZE = [0, 0.28, 1, 1];
const caveEnd = x => Math.sqrt(clamp(Math.min(x - CAVE.x0, CAVE.x1 - x) / 46, 0, 1));
export const caveTop = (x, stage) => CAVE.mid - CAVE_SIZE[stage] * (CAVE.half + 4 * Math.sin(x / 19)) * caveEnd(x);
export const caveBot = (x, stage) => CAVE.mid + CAVE_SIZE[stage] * (CAVE.half - 2 + 2 * Math.sin(x / 31)) * caveEnd(x);
// 동굴 속 돌(오늘날만): 종유석은 천장에서, 석순은 바닥에서, 석주는 천장부터 바닥까지
export const SPELEO = [
  { kind: 'stalactite', x: 314, len: 24 }, { kind: 'stalactite', x: 332, len: 14 }, { kind: 'stalactite', x: 450, len: 18 },
  { kind: 'stalagmite', x: 392, h: 22 }, { kind: 'stalagmite', x: 408, h: 12 },
  { kind: 'column', x: 520 },
];
// 땅 위 하천이 땅속으로 빠지는 구멍(절리 자리)
export const SINK_X = 110;
const JOINTS = [40, 110, 180, 250, 320, 390, 460, 530, 600, 670];
const jointX = (j, y) => j + 2.5 * Math.sin(y / 17 + j);

function section(stage) {
  const { W, H } = XS, wt = WATER_TABLE[stage];
  const surf = []; for (let x = 0; x <= W; x += 3) surf.push([x, surfaceY(x, stage)]);
  let s = '';
  // 석회암
  s += `<polygon points="${pts([...surf, [W, H], [0, H]])}" fill="${LIME}"/>`;
  // 층리(가로 줄)
  let bed = '';
  for (let y = 150; y < H; y += 44) bed += `<path d="M0 ${y + 2 * Math.sin(y)}H${W}"/>`;
  s += `<g stroke="${LIME_LINE}" stroke-width="1.2" clip-path="url(#ks-rock)">${bed}</g>`;
  // 절리: 위쪽이 녹아 넓어진다.
  const widen = [0.6, 1.6, 3, 3.4][stage];
  let jt = '';
  for (const j of JOINTS) {
    const top = surfaceY(j, stage), L = [], R = [];
    for (let y = top; y <= H; y += 6) {
      const w = 0.8 + widen * Math.max(0, 1 - (y - top) / 130);
      L.push([jointX(j, y) - w, y]); R.push([jointX(j, y) + w, y]);
    }
    jt += `<polygon points="${pts([...L, ...R.reverse()])}" fill="${JOINT}"/>`;
  }
  s += `<g data-joints="1">${jt}</g>`;
  // 지하수: 지하수면 아래를 파랗게
  s += `<rect data-groundwater="1" x="0" y="${wt}" width="${W}" height="${H - wt}" fill="${WATER}" opacity="0.28"/>`;
  if (stage === TODAY) s += `<path d="M0 ${WATER_TABLE[0]}H${W}" stroke="${WATER_LIGHT}" stroke-width="1.4" stroke-dasharray="3 5" opacity="0.9"/>`;
  s += `<path data-watertable="1" d="M0 ${wt}H${W}" stroke="${WATER}" stroke-width="2.4" stroke-dasharray="10 6"/>`;
  // 동굴
  if (CAVE_SIZE[stage] > 0) {
    const top = [], bot = [];
    for (let x = CAVE.x0; x <= CAVE.x1; x += 3) { top.push([x, caveTop(x, stage)]); bot.push([x, caveBot(x, stage)]); }
    const poly = [...top, ...bot.reverse()];
    s += `<polygon data-cave="1" points="${pts(poly)}" fill="${stage === TODAY ? CAVE_AIR : WATER}" stroke="#55534c" stroke-width="1.6"/>`;
    if (stage === TODAY) {
      let sp = '';
      for (const o of SPELEO) {
        const t = caveTop(o.x, stage), b = caveBot(o.x, stage);
        if (o.kind === 'stalactite') sp += `<polygon data-stalactite="1" points="${pts([[o.x - 5, t - 2], [o.x + 5, t - 2], [o.x, t + o.len]])}" fill="${STONE}" stroke="${STONE_EDGE}" stroke-width="0.8"/>`;
        if (o.kind === 'stalagmite') sp += `<path data-stalagmite="1" d="M${f1(o.x - 8)} ${f1(b + 2)}Q${f1(o.x - 4)} ${f1(b - o.h)} ${f1(o.x)} ${f1(b - o.h)}Q${f1(o.x + 4)} ${f1(b - o.h)} ${f1(o.x + 8)} ${f1(b + 2)}Z" fill="${STONE}" stroke="${STONE_EDGE}" stroke-width="0.8"/>`;
        if (o.kind === 'column') { const m = (t + b) / 2; sp += `<path data-column="1" d="M${f1(o.x - 9)} ${f1(t - 2)}L${f1(o.x - 3)} ${f1(m)}L${f1(o.x - 10)} ${f1(b + 2)}L${f1(o.x + 10)} ${f1(b + 2)}L${f1(o.x + 3)} ${f1(m)}L${f1(o.x + 9)} ${f1(t - 2)}Z" fill="${STONE}" stroke="${STONE_EDGE}" stroke-width="0.8"/>`; }
      }
      s += sp;
    }
  }
  // 테라로사
  if (stage >= CAVE_STAGE) {
    const lo = []; for (let x = 0; x <= W; x += 3) lo.push([x, surfaceY(x, stage) + terraThick(x, stage)]);
    s += `<polygon data-terra="1" points="${pts([...surf, ...lo.reverse()])}" fill="${TERRA}"/>`;
  }
  s += `<polyline points="${pts(surf)}" fill="none" stroke="${stage >= CAVE_STAGE ? TERRA_DARK : '#77776e'}" stroke-width="2"/>`;
  // 하천: 단계 0은 땅 위로 흐르고, 그 뒤에는 구멍으로 빠져 땅속으로 사라진다.
  const streamEnd = stage === RAIN ? 210 : SINK_X - 4;
  const band = []; for (let x = 0; x <= streamEnd; x += 3) band.push([x, surfaceY(x, stage) - 4]);
  const bandLo = band.map(([x]) => [x, surfaceY(x, stage) + 1]);
  s += `<polygon data-stream="1" points="${pts([...band, ...bandLo.reverse()])}" fill="${WATER}"/>`;
  s += arrow(16, surfaceY(16, stage) - 12, 66, surfaceY(66, stage) - 12, WATER_LIGHT, 2.4, 6);
  if (stage > RAIN) {
    const top = surfaceY(SINK_X, stage);
    s += `<ellipse cx="${SINK_X}" cy="${f1(top + 1)}" rx="6" ry="3.5" fill="#2a2c2a"/>`;
    s += arrow(jointX(SINK_X, top + 14) + 9, top + 14, jointX(SINK_X, wt - 8) + 9, wt - 8, WATER, 2.4, 6, '6 4');
  }
  // 빗물이 틈을 따라 스며드는 화살표(단계 0, 1)
  if (stage <= DOLINE) for (const j of [250, 390, 600]) {
    const t = surfaceY(j, stage);
    s += arrow(jointX(j, t) + 8, t + 10, jointX(j, t + 60) + 8, t + 62, WATER, 2.4, 6);
  }
  // 빗줄기(단계 0, 1): 이름표 자리는 비운다.
  if (stage <= DOLINE) {
    let rain = '';
    const skip = stage === RAIN ? [[220, 12, 280, 50], [62, 66, 86, 26]] : [[150, 30, 80, 30], [460, 24, 70, 26]];
    for (let i = 0; i < 70; i++) {
      const x = 12 + hash(i, 1) * (W - 24), y = 8 + hash(i, 2) * 70;
      if (y + 16 > surfaceY(x, stage) - 6) continue;
      if (skip.some(([a, b, w, h]) => x > a - 6 && x < a + w + 6 && y + 16 > b && y < b + h)) continue;
      if (x < 120 && stage === DOLINE) continue;
      rain += `<path d="M${f1(x)} ${f1(y)}l-3 14"/>`;
    }
    s += `<g stroke="${WATER_LIGHT}" stroke-width="1.6" stroke-linecap="round" opacity="0.8">${rain}</g>`;
  }
  // 돌리네 밭(오늘날): 돌리네와 우발레 바닥의 작물
  if (stage === TODAY) {
    let crop = '';
    const rows = [...range(150, 192, 8), ...range(448, 532, 8)];
    for (const x of rows) { const y = surfaceY(x, stage); crop += `<path d="M${x} ${f1(y)}l-3 -7M${x} ${f1(y)}l0 -8M${x} ${f1(y)}l3 -7"/>`; }
    s += `<g data-farm="1" stroke="${CROP}" stroke-width="1.8" stroke-linecap="round">${crop}</g>`;
    // 집 한 채
    const hx = 552, hy = surfaceY(hx, stage);
    s += `<path d="M${hx - 9} ${f1(hy)}V${f1(hy - 10)}H${hx + 9}V${f1(hy)}Z" fill="#e8dcc0"/><path d="M${hx - 12} ${f1(hy - 9)}L${hx} ${f1(hy - 18)}L${hx + 12} ${f1(hy - 9)}Z" fill="#8a5a3a"/>`;
  }

  // 이름
  let n = '';
  const sky = (zone, text, x, y, tx, ty, color = '#f3f1ea', size = 17) => say(zone, text, x, y, color, size) + lead(x, y + 6, tx, ty, color);
  if (stage === RAIN) {
    n += say('solution', '빗물이 석회암을 녹임 (용식)', 360, 34, WATER_LIGHT, 18);
    n += plain('빗물에 이산화 탄소가 녹아 약한 산성', 360, 54, '#e6e2d4', 13);
    n += say('stream', '땅 위 하천', 104, 84, WATER_LIGHT, 15);
    n += say('joint', '절리 (갈라진 틈)', 285, 205, DARK_TEXT, 16, 'start', true);
    n += plain('빗물이 틈을 따라 스며듦', 285, 224, DARK_TEXT, 13, 'start', true);
  } else {
    n += say('stream', '땅속으로', 8, 52, WATER_LIGHT, 15, 'start') + say('stream', '사라지는 하천', 8, 70, WATER_LIGHT, 15, 'start');
    n += lead(70, 76, SINK_X - 2, surfaceY(SINK_X, stage) - 4, WATER_LIGHT);
  }
  if (stage === DOLINE) {
    n += sky('doline', '돌리네', DOLINE_X + 20, 50, DOLINE_X + 4, surfaceY(DOLINE_X, stage) - 3, '#ffe9b0');
    n += say('doline', '돌리네', UVALA_RIM, 44, '#ffe9b0');
    n += lead(UVALA_RIM - 14, 50, UVALA_X[0] + 2, surfaceY(UVALA_X[0], stage) - 3, '#ffe9b0') + lead(UVALA_RIM + 14, 50, UVALA_X[1] - 2, surfaceY(UVALA_X[1], stage) - 3, '#ffe9b0');
    n += say('joint', '틈이 녹아 넓어지기 시작', 430, CAVE.mid + 34, DARK_TEXT, 14, 'middle', true);
  }
  if (stage >= CAVE_STAGE) {
    n += sky('doline', '돌리네', DOLINE_X + 30, 50, DOLINE_X + 4, surfaceY(DOLINE_X, stage) - 3, '#ffe9b0');
    n += sky('uvala', '우발레', UVALA_X[0] - 6, 46, UVALA_X[0] - 6, surfaceY(UVALA_X[0] - 6, stage) - (stage === TODAY ? 12 : 3), '#ffe9b0', 18);
    n += plain('돌리네가 이어짐', UVALA_X[0] - 6, 22, '#e6e2d4', 13);
  }
  if (stage === CAVE_STAGE) {
    n += say('cave', '석회 동굴 (물에 잠김)', 432, CAVE.mid + 6, '#f3f1ea', 16);
    n += say('terra', '테라로사', 306, 84, '#ffb48f', 15);
    n += lead(306, 90, 306, surfaceY(306, stage) + 1, '#ffb48f');
  }
  if (stage === TODAY) {
    n += sky('terra', '테라로사', 306, 78, 306, surfaceY(306, stage) + 2, '#ffb48f');
    n += sky('farm', '돌리네 밭', 640, 58, 500, surfaceY(500, stage) - 10, CROP, 17);
    n += say('stalactite', '종유석', 302, 274, '#f3f1ea', 14);
    n += say('stalagmite', '석순', 420, 286, '#f3f1ea', 14, 'start');
    n += say('column', '석주', 556, 270, '#f3f1ea', 14);
    n += say('cave', '석회 동굴 (물이 빠짐)', 430, 318, DARK_TEXT, 15, 'middle', true);
    n += plain('예전 지하수면', W - 10, WATER_TABLE[0] - 6, '#2c6aa0', 12, 'end', true);
  }
  n += say('watertable', stage === TODAY ? '낮아진 지하수면' : '지하수면', W - 10, wt - 7, '#1f5f9a', 15, 'end', true);
  if (stage <= CAVE_STAGE) n += plain('지하수', W - 10, wt + 22, '#1f5f9a', 13, 'end', true);
  return `<svg class="ks-xs" viewBox="0 0 ${W} ${H}" role="img" aria-label="석회암 땅을 세로로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    ${textStyle('ks-xs')}
    <defs><clipPath id="ks-rock"><polygon points="${pts([...surf, [W, H], [0, H]])}"/></clipPath></defs>
    ${s}${n}
    <text x="${W - 10}" y="${H - 12}" text-anchor="end" font-size="13" font-weight="700" fill="${DARK_TEXT}" class="rk">크기와 깊이를 크게 과장한 예시입니다.</text>
  </svg>`;
}
function range(a, b, d) { const r = []; for (let x = a; x <= b; x += d) r.push(x); return r; }

// ---------- 동굴 속 확대 ----------
export const ZOOM = { W: 300, H: 250, ceil: 46, floor: 214, x: 150 };
// 단계마다 종유석 길이와 석순 높이(그림 픽셀)
export const ZOOM_GROW = [{ down: 12, up: 6 }, { down: 58, up: 44 }, { down: 96, up: 72 }];
export const zoomJoined = i => ZOOM_GROW[i].down + ZOOM_GROW[i].up >= ZOOM.floor - ZOOM.ceil;

function zoom(i) {
  const { W, H, ceil, floor, x } = ZOOM, { down, up } = ZOOM_GROW[i], joined = zoomJoined(i);
  let s = `<rect width="${W}" height="${H}" fill="${CAVE_AIR}"/>`;
  const ceilLine = [], floorLine = [];
  for (let px = 0; px <= W; px += 6) { ceilLine.push([px, ceil + 3 * Math.sin(px / 23)]); floorLine.push([px, floor + 2 * Math.sin(px / 31)]); }
  s += `<polygon points="${pts([[0, 0], ...ceilLine, [W, 0]])}" fill="${LIME}"/>`;
  s += `<polygon points="${pts([[0, H], ...floorLine, [W, H]])}" fill="${LIME}"/>`;
  // 천장 틈과 스며 나오는 물
  s += `<path d="M${x - 2} 0L${x + 3} 16L${x - 1} 30L${x} ${ceil}" fill="none" stroke="${JOINT}" stroke-width="2.4"/>`;
  s += `<path d="M${x - 2} 0L${x + 3} 16L${x - 1} 30L${x} ${ceil}" fill="none" stroke="${WATER}" stroke-width="1.2" stroke-dasharray="3 3"/>`;
  // 종유석(위)
  const wT = 6 + down * 0.1, tip = ceil + down;
  s += `<path data-zstalactite="1" d="M${f1(x - wT - 4)} ${ceil - 2}Q${f1(x - wT)} ${ceil + 4} ${f1(x - 2)} ${f1(tip - 4)}L${x} ${f1(tip)}L${f1(x + 2)} ${f1(tip - 4)}Q${f1(x + wT)} ${ceil + 4} ${f1(x + wT + 4)} ${ceil - 2}Z" fill="${STONE}" stroke="${STONE_EDGE}" stroke-width="1"/>`;
  // 석순(아래): 종유석보다 굵고 끝이 뭉툭하다.
  const wB = 10 + up * 0.22, top = floor - up;
  s += `<path data-zstalagmite="1" d="M${f1(x - wB - 6)} ${floor + 3}Q${f1(x - wB)} ${floor - 2} ${f1(x - 5)} ${f1(top + 6)}Q${x} ${f1(top - 2)} ${f1(x + 5)} ${f1(top + 6)}Q${f1(x + wB)} ${floor - 2} ${f1(x + wB + 6)} ${floor + 3}Z" fill="${STONE}" stroke="${STONE_EDGE}" stroke-width="1"/>`;
  // 쌓인 켜(석순 안의 줄)
  for (let k = 1; k <= Math.floor(up / 14); k++) { const yy = floor - k * 12; if (yy > top + 6) { const hw = (wB) * (yy - top) / up; s += `<path d="M${f1(x - hw)} ${f1(yy)}Q${x} ${f1(yy - 5)} ${f1(x + hw)} ${f1(yy)}" fill="none" stroke="${STONE_EDGE}" stroke-width="0.8"/>`; } }
  let n = '';
  if (!joined) {
    // 물방울: 끝에 매달린 것 하나, 떨어지는 것 하나
    const drop = (cx, cy) => `<path d="M${cx} ${cy - 6}Q${cx + 4} ${cy} ${cx} ${cy + 3}Q${cx - 4} ${cy} ${cx} ${cy - 6}Z" fill="${WATER_LIGHT}"/>`;
    const mid = (tip + top) / 2;
    s += drop(x, tip + 6) + drop(x, mid + 2);
    s += `<path d="M${x} ${f1(mid + 10)}V${f1(top - 6)}" stroke="${WATER_LIGHT}" stroke-width="1.4" stroke-dasharray="2 4"/>`;
    n += plain('물방울', x + 22, mid + 6, WATER_LIGHT, 14, 'start');
    n += say('stalactite', i === 0 ? '종유석이 자라기 시작' : '종유석', x - 18, ceil + 22, '#f3f1ea', 14, 'end');
    n += say('stalagmite', i === 0 ? '석순이 자라기 시작' : '석순', x - wB - 10, floor - 12, '#f3f1ea', 14, 'end');
    n += plain('탄산 칼슘이 쌓임', x + wB + 10, floor - 12, '#e6e2d4', 13, 'start');
  } else {
    // 이어진 석주
    s += `<rect x="${x - 4}" y="${tip - 8}" width="8" height="${top - tip + 16}" fill="${STONE}"/>`;
    n += say('column', '석주', x + 22, (ceil + floor) / 2 + 5, '#f3f1ea', 16, 'start');
    n += plain('종유석과 석순이 만남', x + 22, (ceil + floor) / 2 + 24, '#e6e2d4', 13, 'start');
  }
  return `<svg class="ks-zoom" viewBox="0 0 ${W} ${H}" role="img" aria-label="동굴 속을 크게 본 그림. ${ZOOM_NAMES[i]}.">
    ${textStyle('ks-zoom')}
    ${s}${n}
  </svg>`;
}

// ---------- 평면 ----------
export const PLAN = { W: 360, H: 260 };
// [x, y, 반지름]. 왼쪽은 따로 떨어진 돌리네, 오른쪽은 이어져 우발레가 된 돌리네(와 따로 남은 작은 돌리네 하나).
export const PLAN_SPLIT = [[78, 86, 36], [200, 70, 30], [150, 188, 34], [282, 168, 40]];
export const PLAN_UVALA = [[96, 120, 50], [170, 104, 44], [240, 138, 52]];
export const PLAN_LONE = [306, 50, 24];
const inside = (px, py, c) => Math.hypot(px - c[0], py - c[1]) < c[2];

function planPanel(kind) {
  const { W, H } = PLAN, id = `ks-pl-${kind}`;
  const groups = kind === 'split' ? PLAN_SPLIT.map(c => [c]) : [PLAN_UVALA, [PLAN_LONE]];
  let s = `<rect width="${W}" height="${H}" fill="${GRASS}"/>`;
  let grass = '';
  for (let y = 10, k = 0; y < H; y += 20) for (let x = 8 + ((y / 20) % 2) * 10; x < W; x += 22) {
    k++;
    const gx = x + 6 * (hash(k, 3) - 0.5), gy = y + 6 * (hash(k, 4) - 0.5);
    if (groups.flat().some(c => Math.hypot(gx - c[0], gy - c[1]) < c[2] + 8)) continue;
    grass += `<path d="M${f1(gx - 3)} ${f1(gy)}l3 -5l3 5"/>`;
  }
  s += `<g fill="none" stroke="${GRASS_DARK}" stroke-width="1.2">${grass}</g>`;
  let defs = '';
  groups.forEach((g, gi) => {
    // 바깥 테두리만 남기려고 테두리 원을 먼저 그리고 안을 덮는다.
    s += g.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${TERRA}" stroke="#3e2a1c" stroke-width="3"/>`).join('');
    s += g.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 1.5}" fill="${TERRA}"/>`).join('');
    // 안쪽(낮은 쪽)을 향한 짧은 빗금: 움푹 꺼진 땅
    let tick = '';
    for (const c of g) for (let a = 0; a < 360; a += 14) {
      const r = a * Math.PI / 180, px = c[0] + c[2] * Math.cos(r), py = c[1] + c[2] * Math.sin(r);
      if (g.some(o => o !== c && inside(px, py, o))) continue;
      tick += `<path d="M${f1(px)} ${f1(py)}L${f1(c[0] + (c[2] - 7) * Math.cos(r))} ${f1(c[1] + (c[2] - 7) * Math.sin(r))}"/>`;
    }
    s += `<g stroke="#3e2a1c" stroke-width="1.4">${tick}</g>`;
    defs += `<clipPath id="${id}-${gi}">${g.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 9}"/>`).join('')}</clipPath>`;
  });
  // 밭: 바닥에 줄지어 심은 작물. 따로 있을 때는 한 돌리네에만, 우발레는 넓은 바닥 전체에
  const fieldGroups = kind === 'split' ? [2] : [0];
  for (const gi of fieldGroups) {
    let rows = '';
    for (let y = 0; y < H; y += 9) rows += `<path d="M0 ${y}L${W} ${y - 30}" />`;
    s += `<g clip-path="url(#${id}-${gi})" data-farm="1"><rect width="${W}" height="${H}" fill="#a9683c"/><g stroke="${CROP_DARK}" stroke-width="4">${rows}</g><g stroke="${CROP}" stroke-width="2">${rows}</g></g>`;
  }
  if (kind === 'uvala') s += `<g data-house="1"><rect x="168" y="96" width="16" height="12" fill="#e8dcc0" stroke="#3e2a1c" stroke-width="1"/><path d="M165 97L176 88L187 97Z" fill="#8a5a3a"/></g>`;
  let n = '';
  if (kind === 'split') {
    n += say('doline', '돌리네', 78, 140, '#ffe9b0', 16) + lead(78, 128, 78, 112, '#ffe9b0');
    n += say('doline', '돌리네', 296, 236, '#ffe9b0', 16) + lead(290, 222, 286, 200, '#ffe9b0');
    n += say('farm', '돌리네 밭', 236, 250, CROP, 15) + lead(214, 238, 166, 206, CROP);
    n += plain('돌리네마다 따로 움푹 꺼짐', W / 2, 22, '#f3f1ea', 14);
  } else {
    n += say('uvala', '우발레', 120, 204, '#ffe9b0', 18) + lead(120, 190, 110, 160, '#ffe9b0');
    n += say('farm', '돌리네 밭', 286, 228, CROP, 15) + lead(270, 214, 246, 170, CROP);
    n += say('doline', '돌리네', 252, 34, '#ffe9b0', 15) + lead(274, 38, 288, 46, '#ffe9b0');
    n += plain('돌리네가 넓어져 이어짐', 110, 24, '#f3f1ea', 14);
  }
  return `<svg class="ks-plan" viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 본 석회암 땅. ${kind === 'split' ? PLAN_NAMES[0] : PLAN_NAMES[1]}.">
    ${textStyle('ks-plan')}
    <defs>${defs}</defs>
    ${s}${n}
  </svg>`;
}

const sw = inner => `<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${inner}</svg>`;
const LEGEND = [
  [`<rect width="22" height="14" fill="${LIME}"/><path d="M3 4H19M3 10H19" stroke="${LIME_LINE}" stroke-width="1.2"/>`, '석회암'],
  [`<rect width="22" height="14" fill="${LIME}"/><path d="M11 0L10 7L12 14" stroke="${JOINT}" stroke-width="2.4" fill="none"/>`, '절리(갈라진 틈)'],
  [`<rect width="22" height="14" fill="${TERRA}"/>`, '테라로사'],
  [`<rect width="22" height="14" fill="${LIME}"/><rect width="22" height="14" fill="${WATER}" opacity="0.4"/><path d="M0 2H22" stroke="${WATER}" stroke-width="2.4" stroke-dasharray="5 3"/>`, '지하수면과 지하수'],
  [`<rect width="22" height="14" fill="${CAVE_AIR}"/><path d="M6 0L8 8L10 0Z" fill="${STONE}"/><path d="M12 14Q15 5 18 14Z" fill="${STONE}"/>`, '석회 동굴'],
  [`<rect width="22" height="14" fill="${TERRA}"/><path d="M5 12l-2 -6M5 12l0 -7M5 12l2 -6M14 12l-2 -6M14 12l0 -7M14 12l2 -6" stroke="${CROP}" stroke-width="1.6"/>`, '돌리네 밭'],
];

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? TODAY, zone = null, zoneAt = 'xs';
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    const note = where => zone && zoneAt === where ? `<p class="schem-note"><b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}</p>` : '';
    root.innerHTML = `
      <h2>석회암 땅을 자른 단면 (모식도)</h2>
      ${buttons}
      <figure>${section(stage)}</figure>
      <div class="schem-legend">${LEGEND.map(([s, t]) => `<span>${sw(s)}${t}</span>`).join('')}</div>
      ${zone && zoneAt === 'xs' ? note('xs') : `<p class="schem-note">${NOTES[stage]}</p>`}
      <h2>동굴 속을 크게 보기: 종유석, 석순, 석주가 생기는 차례 (모식도)</h2>
      <div class="schem-trio">${ZOOM_NAMES.map((t, i) => `<figure>${zoom(i)}<figcaption>${i + 1}. ${t}</figcaption></figure>`).join('')}</div>
      ${zone && zoneAt === 'zoom' ? note('zoom') : `<p class="schem-note">${ZOOM_NOTE}</p>`}
      <h2>위에서 본 돌리네와 우발레 (모식도)</h2>
      <div class="schem-pair"><figure>${planPanel('split')}<figcaption>${PLAN_NAMES[0]}</figcaption></figure><figure>${planPanel('uvala')}<figcaption>${PLAN_NAMES[1]}</figcaption></figure></div>
      ${note('plan')}
      <p class="schem-cap">${CAPTION}</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    const where = z.closest('svg.ks-zoom') ? 'zoom' : z.closest('svg.ks-plan') ? 'plan' : 'xs';
    zone = zone === z.dataset.zone && zoneAt === where ? null : z.dataset.zone;
    zoneAt = where;
    paint();
    onZone(zone);
  });
  paint();
  return {
    setStage(n) { if (n !== stage) { stage = n; zone = null; paint(); } },
    get stage() { return stage; },
  };
}
