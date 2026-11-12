// © 2026 김용현
// 화산 지형 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 1. 화산체 모양 비교(순상화산, 성층화산, 종상화산) 2. 작은 화산 네 가지 단면(분석구, 응회구, 응회환, 마르)
// 3. 칼데라가 생기는 차례(네 단계) 4. 철원 용암대지와 한탄강 협곡(세 단면과 지류 폭포의 종단면)
// y는 화면(그림 픽셀) 좌표로, 아래로 갈수록 크다.

export const ZONE_TEXT = {
  shield: { name: '순상화산', text: '규산(실리카)이 적어 아주 묽은 현무암질 용암이 여러 번 사방으로 넓게 흘러 쌓인 화산입니다. 너비가 높이보다 훨씬 커서, 엎어 놓은 방패처럼 경사가 완만합니다. 한라산 정상부를 뺀 제주도 몸체가 큰 순상화산이고, 하와이의 화산들도 순상화산입니다.' },
  strato: { name: '성층화산', text: '폭발하며 뿜어낸 화산재와 돌 조각(화산 쇄설물)과, 조용히 흘러나온 용암이 번갈아 겹겹이 쌓인 화산입니다. 주로 중간 정도로 끈끈한 안산암질 마그마가 만들며, 경사가 급하고 높은 원뿔 모양입니다. 일본 후지산이 대표적인 예입니다. 백두산은 넓은 용암대지 위에 쌓인 성층화산으로 보며, 꼭대기의 천지는 칼데라호입니다.' },
  dome: { name: '종상화산(용암원정구)', text: '규산이 많아 아주 끈끈한 조면암질이나 안산암질 용암이 멀리 흐르지 못하고 화구 위로 천천히 부풀어 올라 굳은 종 모양 화산입니다. 순상화산보다 작고 경사가 급합니다. 제주 산방산과 한라산 정상부가 용암원정구입니다. 울릉도도 물 위로 드러난 부분은 조면암 등으로 이루어진 경사가 급한 용암원정구 형태입니다(바닷속 부분은 순상화산과 비슷함).' },
  plateau: { name: '용암대지', text: '아주 묽은 현무암질 용암이 땅의 갈라진 틈(열하)에서 많이 흘러나와 낮은 골짜기를 메우고 넓게 덮어 생긴 평평한 땅입니다. 백두산 둘레의 백두 용암대지, 강원 철원과 북한 평강 일대의 철원 평강 용암대지가 예입니다.' },
  scoria: { name: '분석구(스코리아콘)', text: '땅 위에서 가스가 빠지며 터진 마그마 조각이 화구 둘레에 쌓인 작은 화산입니다. 구멍이 많고 검붉은 돌 조각(스코리아, 제주말 송이)으로 되어 있고, 조각이 쌓일 수 있는 가장 급한 경사(약 30도 넘게)를 이룹니다. 높이는 대개 수십 m에서 수백 m입니다. 제주 오름의 상당수가 분석구이며, 다랑쉬오름이 대표적입니다. 용암이 한쪽으로 흘러나가 화구가 말굽 모양으로 열린 것도 많습니다.' },
  tuffcone: { name: '응회구', text: '얕은 바다나 물이 많은 땅에서 마그마가 물과 만나 물이 순식간에 수증기가 되며 크게 터져 생긴 화산입니다. 고운 화산재가 층층이 쌓여 굳은 응회암으로 되어 있습니다. 분석구보다 화구가 크고, 응회환보다 높고 경사가 급합니다. 성산 일출봉과 우도 쇠머리오름이 응회구입니다.' },
  tuffring: { name: '응회환', text: '응회구처럼 마그마가 물과 만나 터져 생겼지만, 더 세게 터져 화산재가 낮고 넓게 퍼진 화산입니다. 응회구보다 낮고 밑지름과 화구가 큽니다. 둘의 차이는 만난 물의 양과 물이 들어오는 빠르기 등에 따라 달라집니다. 책은 송악산, 수월봉, 용머리 해안, 서귀포 하논을 응회환으로 봅니다.' },
  maar: { name: '마르', text: '마그마의 가스나 물이 땅속에서 폭발해, 땅을 파고들어 생긴 크고 둥근 화구입니다. 깊이에 비해 아주 넓고, 둘레의 고리 모양 언덕은 아주 낮습니다. 독일 아이펠 지방에 많습니다. 제주 산굼부리는 흔히 마르로 소개되지만, 책은 화도를 따라 올라온 용암이 굳는 과정에서 생긴 빈 공간 위의 땅이 꺼져 생긴 함몰 화구로 봅니다. 그래서 우리나라에는 마르로 볼 지형이 없다고 봅니다.' },
  chamber: { name: '마그마 방', text: '땅속 깊은 곳에서 녹아 올라온 마그마가 모여 있는 곳입니다. 큰 분출로 마그마가 한꺼번에 많이 빠져나가면 그 위가 비게 됩니다.' },
  pyro: { name: '화쇄류', text: '뜨거운 화산재와 돌 조각, 가스가 한데 섞여 산비탈을 빠르게 흘러내리는 흐름입니다. 큰 폭발로 높이 솟은 분출 기둥이 무너질 때 잘 생깁니다.' },
  caldera: { name: '칼데라', text: '큰 분출로 마그마 방이 비자, 받쳐 줄 것이 없어진 꼭대기가 둥근 단층을 따라 통째로 꺼져 생긴 솥 모양 분지입니다. 폭발로 생긴 분화구보다 훨씬 커서 지름이 수 km에 이르기도 합니다. 울릉도 나리 분지 일대와 천지를 담은 백두산 꼭대기 분지가 칼데라입니다.' },
  somma: { name: '외륜산', text: '칼데라를 빙 둘러싼 산입니다. 꺼지지 않고 남은 옛 화산의 몸체로, 칼데라 쪽 안쪽 비탈이 아주 급합니다. 울릉도 성인봉에서 북쪽으로 뻗은 능선이 외륜산입니다.' },
  atrio: { name: '화구원', text: '칼데라 바닥에 무너진 비탈의 흙과 돌, 화산재가 쌓여 생긴 평평한 땅입니다. 울릉도 나리 분지(약 350m)와 알봉 분지(약 450m)가 화구원이며, 바닥 높이가 달라 계단 모양입니다.' },
  central: { name: '중앙화구구', text: '칼데라 안에서 다시 분출해 생긴 작은 화산입니다. 울릉도 알봉이 중앙화구구이며, 약 6,300년 전에 생겼습니다. 칼데라와 중앙화구구가 함께 있어 나리 분지 일대는 복합 화산입니다.' },
  calderaLake: { name: '칼데라호', text: '칼데라에 물이 고여 생긴 호수입니다. 백두산 천지가 칼데라호입니다. 한라산 백록담은 칼데라가 아니라 분화구에 물이 고인 화구호입니다.' },
  fissure: { name: '열하 분출', text: '땅이 길게 갈라진 틈(열하)을 따라 용암이 흘러나오는 분출입니다. 아주 묽은 현무암질 용암이 많이 나와 넓게 퍼지므로 용암대지가 생깁니다. 철원 용암대지는 주로 추가령 구조곡 방향의 틈에서 흘러나왔다고 봅니다.' },
  ori: { name: '오리산(분석구)', text: '철원 용암대지를 만든 분출의 끝 무렵에는 한 곳에서 터지는 분출로 바뀌어, 북한 평강의 오리산 같은 분석구가 생겼다고 봅니다.' },
  valley: { name: '추가령 구조곡', text: '서울에서 원산까지 길게 이어진 골짜기입니다. 오랫동안 단층과 마그마의 관입, 화산 활동과 깎임이 겹쳐 생긴 곧은 골짜기로, 철원 용암대지의 용암이 이 골짜기를 따라 흘렀습니다. 화산 활동을 강조해 추가령 열곡이라고도 합니다.' },
  canyon: { name: '한탄강 협곡', text: '용암이 골짜기를 메운 뒤, 한탄강이 다시 아래로 깎아 내려가 생긴 깊고 좁은 골짜기입니다. 강은 용암과 그 아래 퇴적층이나 바위가 만나는 경계를 따라 잘 파고들어, 양쪽에 현무암 절벽이 섭니다.' },
  column: { name: '주상절리', text: '두꺼운 용암이 식으며 부피가 줄면 갈라진 틈이 바위를 다각형 기둥 모양으로 나누는데, 이것이 주상절리입니다. 기둥은 식는 면에 수직으로 생겨 대개 위아래로 길지만, 경주 양남처럼 누운 것도 있습니다. 주로 현무암에 생기지만 안산암, 조면암, 응회암에도 생깁니다. 한탄강 협곡, 제주 대포 해안, 포항 달전리, 경주 양남에서 볼 수 있습니다.' },
  baegui: { name: '백의리층', text: '용암에 덮이기 전 옛 하천이 쌓은 자갈과 모래층입니다. 한탄강 협곡 아래쪽에 드러나 있으며, 지금 강바닥 높이와 비슷해 강이 용암대지가 생기기 전 높이를 거의 되찾았다고 봅니다.' },
  falls: { name: '폭포(재인폭포)', text: '물이 많은 본류는 협곡을 빨리 깎아 내려가지만, 물이 적은 지류는 용암대지 높이에 남아 본류로 떨어지며 폭포가 됩니다. 폭포는 떨어지는 물에 아래가 깎여 무너지며 조금씩 상류로 물러납니다. 연천 재인폭포는 본류에서 약 350m, 포천 비둘기낭폭포는 약 150m 상류에 있습니다.' },
};

// ---------- 1. 화산체 모양 ----------
// 밑지름의 반(R)과 높이(H), 그림 픽셀
export const BODY = { W: 360, H: 230, base: 188 };
export const SHAPES = {
  shield: { R: 165, H: 52 },
  strato: { R: 128, H: 128 },
  dome: { R: 62, H: 96 },
};
export const BODY_NAMES = ['순상화산', '성층화산', '종상화산(용암원정구)'];
// 모양 함수: 가운데에서 떨어진 비율 u(0에서 1)의 높이 비율
export const profile = {
  shield: u => 1 - u * u,
  strato: u => (1 - u) * (1 - u) * 0.75 + (1 - u) * 0.25,
  dome: u => 1 - u * u * u * u,
};

// ---------- 2. 작은 화산 ----------
// h: 땅(바다 밑 바닥)에서 테두리까지 높이, w: 밑지름의 반, cw: 화구 반지름, floor: 화구 바닥 높이(땅 기준, 음수면 땅 아래)
export const SMALL_W = 300, SMALL_H = 220, SMALL_GROUND = 158, SEA_Y = 146;
export const SMALL = {
  scoria: { h: 104, w: 72, cw: 18, floor: 78, sea: false },
  tuffcone: { h: 88, w: 112, cw: 50, floor: 34, sea: true },
  tuffring: { h: 38, w: 136, cw: 84, floor: 4, sea: true },
  maar: { h: 12, w: 142, cw: 96, floor: -46, sea: false },
};
export const SMALL_NAMES = { scoria: '분석구', tuffcone: '응회구', tuffring: '응회환', maar: '마르' };
// 작은 화산의 표면 높이(땅 기준, 위로 +). 테두리에서 바깥으로는 곧게, 안쪽은 사발 모양
export function smallTop(kind, x) {
  const s = SMALL[kind], d = Math.abs(x);
  if (d >= s.w) return 0;
  if (d >= s.cw) { const q = (s.w - d) / (s.w - s.cw); return s.h * (0.55 * q + 0.45 * q * q * (3 - 2 * q)); }
  const q = d / s.cw;
  return s.floor + (s.h - s.floor) * q * q;
}

// ---------- 3. 칼데라 ----------
export const CAL = { W: 720, H: 380, base: 300, cx: 360, ring: 100 };
// 큰 화산의 비탈 모양(가운데에서 떨어진 비율 u의 높이 비율)
const calProf = u => (1 - u) * 0.6 + (1 - u) * (1 - u) * 0.4;
export const CAL_NAMES = ['화산 아래 마그마 방', '큰 분출과 꺼짐', '화구원이 생김', '중앙화구구와 칼데라호'];
export const CAL_NOTES = [
  '화산 아래 마그마 방: 땅속 마그마 방 위에 큰 화산이 솟아 있습니다. 꼭대기에는 작은 분화구가 있습니다.',
  '큰 분출과 꺼짐: 아주 큰 분출로 마그마가 한꺼번에 많이 빠져나가, 마그마 방 위쪽에 빈 공간이 생깁니다. 화산재 기둥이 솟고 화쇄류가 비탈을 흘러내립니다. 땅속이 비어 불안정해진 꼭대기는 둥근 단층을 따라 통째로 꺼져 내리며 빈 공간을 메웁니다.',
  '화구원이 생김: 꺼진 솥 모양 분지가 칼데라이고, 둘레에 남은 산이 외륜산입니다. 무너진 비탈의 흙과 돌, 화산재가 바닥을 메워 평평한 화구원이 생깁니다. 울릉도 나리 분지가 화구원입니다.',
  '중앙화구구와 칼데라호: 칼데라 안에서 다시 분출해 작은 화산(중앙화구구)이 솟고, 바닥에 물이 고이면 칼데라호가 됩니다. 울릉도 알봉이 중앙화구구이고, 백두산 천지가 칼데라호입니다. 울릉도 칼데라에는 큰 호수가 없습니다.',
];
// 단계마다: 꼭대기 높이(y), 칼데라 바닥 높이(y, 없으면 0), 마그마 방에 남은 마그마 비율(나머지 위쪽은 빈 공간이었다가 꺼진 덩어리가 메운다), 중앙화구구 높이(픽셀), 호수 수면(y, 없으면 0)
export const CAL_STAGE = [
  { summit: 74, floor: 0, chamber: 1, cone: 0, lake: 0 },
  { summit: 74, floor: 262, chamber: 0.4, cone: 0, lake: 0 },
  { summit: 74, floor: 250, chamber: 0.4, cone: 0, lake: 0 },
  { summit: 74, floor: 250, chamber: 0.4, cone: 42, lake: 239 },
];
// 화산 표면(y). 칼데라가 생기면 둥근 단층 안쪽이 꺼진다.
export function calSurface(x, stage) {
  const { cx, base, ring } = CAL, st = CAL_STAGE[stage], u = Math.abs(x - cx) / 300;
  let y = u >= 1 ? base : base - (base - st.summit) * calProf(u);
  if (stage === 0 && Math.abs(x - cx) < 22) y += 18 * (1 - ((x - cx) / 22) * ((x - cx) / 22));
  if (st.floor) {
    const d = Math.abs(x - cx);
    // 둥근 단층 안쪽: 단계 1은 꺼진 덩어리, 단계 2부터는 메워진 평평한 바닥
    if (d < ring) y = stage === 1 ? st.floor + (d / ring) * 6 : st.floor;
    // 중앙화구구: 꼭대기에 작은 화구가 있는 원뿔
    if (st.cone) {
      const cd = Math.abs(x - (cx - 30));
      if (cd < 46) { let h = st.cone * (1 - cd / 46); if (cd < 8) h -= 10 * (1 - cd / 8); y = Math.min(y, st.floor - h); }
    }
  }
  return y;
}

// ---------- 4. 철원 용암대지 ----------
export const CW = { W: 360, H: 230, valley: 172, plateau: 106 };
export const CW_NAMES = ['옛 골짜기(추가령 구조곡)', '용암이 골짜기를 메움', '한탄강이 협곡을 깎음'];
// 옛 땅(화강암과 편마암) 표면: 가운데가 넓은 골짜기
export function oldGround(x) {
  const d = Math.abs(x - 180);
  if (d < 92) return CW.valley - 6 * (1 - (d / 92) * (d / 92));
  const q = Math.min(1, (d - 92) / 70);
  return CW.valley - (CW.valley - 52) * q * q * (3 - 2 * q) + 4 * Math.sin(x / 9);
}
// 단계 2, 3의 땅 표면
export function cwSurface(x, stage) {
  const g = oldGround(x);
  if (stage === 0) return g;
  let y = Math.min(g, CW.plateau);
  if (stage === 2) {
    // 협곡: 용암과 옛 땅의 경계 가까이(오른쪽)를 따라 깎였다.
    const c = 232, d = Math.abs(x - c);
    if (d < 26) y = Math.max(y, CW.valley + 2 - (d < 16 ? 0 : (d - 16) * 0.4));
  }
  return y;
}
export const CANYON = { x: 232, half: 16 };
// 지류 폭포가 본류에서 물러난 거리(m)
export const FALLS_M = 350;
export const PIGEON_M = 150;

export const CAPTION = '이름을 누르면 설명이 나옵니다. 모든 그림은 크기와 높이를 크게 과장한 예시이며, 아주 오랜 시간을 몇 단계로 줄여 보여 줍니다. 화산체 모양은 용암의 끈끈함과, 용암과 화산 쇄설물의 비율에 따라 달라집니다. 응회구와 응회환, 마르를 나누는 기준과 몇몇 지형이 어디에 드는지에는 다른 해석도 있습니다. 철원 용암대지의 실제 지형과 형성 과정은 "용암대지와 한탄강 협곡" 장면에서 더 자세히 볼 수 있습니다.';

const BASALT = '#3f3c3b', BASALT2 = '#4d4a48', TEPHRA = '#b59a72', TRACHYTE = '#a99a8c', SCORIA = '#8a3a24', SCORIA2 = '#a4492c', TUFF = '#cbab6d', TUFF_LINE = '#9c8048';
const MAGMA = '#e8642a', MAGMA_HOT = '#ffb347', SEA = '#3f8fd0', SEA_LIGHT = '#9fd0f2', OLD = '#8f8070', OLD_LINE = '#6f6254', GRAVEL = '#c9b48a', GRASS = '#7e9a5c', ASH = '#8a857e', SKY = '#22313a', INK = '#16201f', DARK_TEXT = '#22261f', LIGHT = '#f3f1ea';
const f1 = v => v.toFixed(1);
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const range = (a, b, d) => { const r = []; for (let x = a; x <= b + 1e-9; x += d) r.push(x); return r; };
const say = (zone, text, x, y, color = LIGHT, size = 16, anchor = 'middle', rock = false) => `<text class="zone${rock ? ' rk' : ''}" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
const plain = (text, x, y, color = '#e6e2d4', size = 12, anchor = 'middle', rock = false) => `<text${rock ? ' class="rk"' : ''} x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
const lead = (x0, y0, x1, y1, color = LIGHT) => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.4"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.3" fill="${color}"/>`;
const textStyle = cls => `<style>svg.${cls} text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round} svg.${cls} text.rk{stroke:#f1ece0}</style>`;
const arrow = (x0, y0, x1, y1, color, w = 2.2, size = 6) => {
  const a = Math.atan2(y1 - y0, x1 - x0), c = Math.cos(a), s = Math.sin(a), hx = x1 - size * 1.3 * c, hy = y1 - size * 1.3 * s;
  return `<path d="M${f1(x0)} ${f1(y0)}L${f1(hx)} ${f1(hy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(hx - size * 0.7 * s)} ${f1(hy + size * 0.7 * c)}L${f1(x1)} ${f1(y1)}L${f1(hx + size * 0.7 * s)} ${f1(hy - size * 0.7 * c)}Z" fill="${color}"/>`;
};
let clipN = 0;
const clipOf = (poly, inner) => { const id = `vc-clip-${++clipN}`; return `<defs><clipPath id="${id}"><polygon points="${pts(poly)}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };

// ---------- 그림 1: 화산체 모양 ----------
function bodyPanel(kind) {
  const { W, H, base } = BODY, S = SHAPES[kind], cx = W / 2, prof = profile[kind];
  const top = x => { const u = Math.abs(x - cx) / S.R; return u >= 1 ? base : base - S.H * prof(u); };
  const surf = range(0, W, 3).map(x => [x, top(x)]);
  const body = [...surf, [W, H], [0, H]];
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>`;
  if (kind === 'shield') {
    // 얇게 겹친 현무암 용암 층
    for (let k = 0; k < 9; k++) {
      const f = 1 - k / 9, ly = range(0, W, 4).map(x => { const u = Math.abs(x - cx) / (S.R * (0.55 + 0.45 * f)); return [x, u >= 1 ? base : base - S.H * f * prof(u)]; });
      inner += `<polygon points="${pts([...ly, [W, base + 1], [0, base + 1]])}" fill="${k % 2 ? BASALT : BASALT2}" stroke="#8a4c36" stroke-width="1"/>`;
    }
  } else if (kind === 'strato') {
    // 아래의 넓은 용암대지(백두산처럼)와, 용암(검정)과 화산 쇄설물(갈색)이 번갈아 쌓인 원뿔
    inner += `<rect x="0" y="${base - 14}" width="${W}" height="20" fill="${BASALT}"/>`;
    for (let k = 0; k < 8; k++) {
      const f = 1 - k / 8, ly = range(0, W, 3).map(x => { const u = Math.abs(x - cx) / (S.R * f); return [x, u >= 1 ? base - 14 : base - 14 - (S.H - 14) * f * prof(Math.min(1, u))]; });
      inner += `<polygon points="${pts([...ly, [W, base], [0, base]])}" fill="${k % 2 ? TEPHRA : BASALT2}"/>`;
    }
    inner += `<rect x="${cx - 4}" y="${base - S.H}" width="8" height="${S.H + 30}" fill="${MAGMA}"/>`;
  } else {
    inner += `<rect x="0" y="${base - 8}" width="${W}" height="14" fill="${BASALT}"/>`;
    inner += `<polygon points="${pts(surf.map(([x, y]) => [x, Math.min(y, base - 8)]).concat([[W, base], [0, base]]))}" fill="${TRACHYTE}"/>`;
    // 부풀어 오르며 생긴 흐름 자국
    for (let k = 1; k <= 4; k++) inner += `<polyline points="${pts(range(cx - S.R * 0.9, cx + S.R * 0.9, 3).map(x => [x, base - 8 - (S.H - 8) * (k / 5) * prof(Math.min(1, Math.abs(x - cx) / (S.R * 0.95)))]))}" fill="none" stroke="#857669" stroke-width="1.2"/>`;
    inner += `<rect x="${cx - 4}" y="${base - 6}" width="8" height="40" fill="${MAGMA}"/>`;
  }
  s += clipOf(body, inner);
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
  if (kind === 'strato') s += `<path d="M${cx - 12} ${f1(top(cx - 12))}L${cx} ${f1(top(cx) + 10)}L${cx + 12} ${f1(top(cx + 12))}" fill="${SKY}" stroke="#1e1a18" stroke-width="1.6"/>`;
  let n = '';
  if (kind === 'shield') {
    n += say('shield', '순상화산', cx, 48, '#ffe9b0', 19);
    n += plain('묽은 현무암질 용암이 넓게 흐름', cx, 70, '#e6e2d4', 13);
    n += plain('너비가 높이보다 훨씬 큼, 경사가 완만함', cx, 88, '#e6e2d4', 13);
    n += plain('예: 제주도 몸체, 하와이', cx, H - 12, DARK_TEXT, 13, 'middle', true);
  } else if (kind === 'strato') {
    n += say('strato', '성층화산', 70, 40, '#ffe9b0', 19);
    n += plain('용암과 화산 쇄설물이', 70, 60, '#e6e2d4', 12) + plain('번갈아 쌓임, 경사가 급함', 70, 76, '#e6e2d4', 12);
    n += say('plateau', '용암대지', W - 46, base - 22, '#e6e2d4', 13);
    n += plain('예: 후지산, 백두산', cx, H - 12, DARK_TEXT, 13, 'middle', true);
  } else {
    n += say('dome', '종상화산', 72, 44, '#ffe9b0', 19);
    n += plain('(용암원정구)', 72, 63, '#ffe9b0', 13);
    n += plain('끈끈한 용암이 솟아 굳음', W - 84, 52, '#e6e2d4', 12) + plain('작고 경사가 급함', W - 84, 68, '#e6e2d4', 12);
    n += plain('예: 산방산, 한라산 정상부', cx, H - 12, DARK_TEXT, 13, 'middle', true);
  }
  return `<svg class="vc-body" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${BODY_NAMES[['shield', 'strato', 'dome'].indexOf(kind)]}을 세로로 자른 단면">${textStyle('vc-body')}${s}${n}</svg>`;
}

// ---------- 그림 2: 작은 화산 ----------
function smallPanel(kind) {
  const W = SMALL_W, H = SMALL_H, S = SMALL[kind], cx = W / 2, g = SMALL_GROUND;
  const top = x => g - smallTop(kind, x - cx);
  const surf = range(0, W, 2).map(x => [x, top(x)]);
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  // 바다(응회구, 응회환): 해수면이 땅(바다 밑 바닥)보다 위에 있다.
  if (S.sea) s += `<rect x="0" y="${SEA_Y}" width="${W}" height="${H - SEA_Y}" fill="${SEA}" opacity="0.75"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>`;
  inner += range(g + 12, H, 14).map(y => `<path d="M0 ${y}H${W}" stroke="${OLD_LINE}" stroke-width="1"/>`).join('');
  const fill = kind === 'scoria' ? SCORIA : TUFF;
  if (kind !== 'maar') {
    inner += `<polygon points="${pts([...surf, [W, g], [0, g]])}" fill="${fill}"/>`;
    // 쌓인 켜: 분석구는 거친 알갱이, 응회구와 응회환은 바깥으로 기운 얇은 층
    if (kind === 'scoria') { for (let a = 0; a < 140; a++) { const x = cx - S.w + ((a * 37) % (2 * S.w)), y = g - ((a * 53) % 80); if (y > top(x) + 2) inner += `<circle cx="${f1(x)}" cy="${f1(y)}" r="1.5" fill="${SCORIA2}"/>`; } }
    else for (let k = 1; k <= 5; k++) inner += `<polyline points="${pts(range(cx - S.w, cx + S.w, 3).map(x => [x, g - (g - top(x)) * (k / 6)]))}" fill="none" stroke="${TUFF_LINE}" stroke-width="1"/>`;
  } else {
    // 마르: 땅을 파고든 화구 아래에 부서진 돌로 메워진 깔때기(화도)
    inner += `<polygon points="${pts([[cx - S.cw, g], [cx - 30, H], [cx + 30, H], [cx + S.cw, g]])}" fill="#7a6d62"/>`;
    for (let a = 0; a < 70; a++) { const x = cx - 60 + ((a * 41) % 120), y = g + 8 + ((a * 29) % 60); inner += `<rect x="${f1(x)}" y="${f1(y)}" width="4" height="3" fill="#5e544b"/>`; }
    inner += `<polygon points="${pts([...surf.filter(([x]) => Math.abs(x - cx) >= S.cw), [cx + S.w, g], [cx - S.w, g]])}" fill="${TUFF}"/>`;
  }
  // 화도
  inner += `<path d="M${cx - 4} ${H}L${cx - 3} ${f1(top(cx))}L${cx + 3} ${f1(top(cx))}L${cx + 4} ${H}Z" fill="${MAGMA}" opacity="${kind === 'maar' ? 0 : 0.9}"/>`;
  s += clipOf([...surf, [W, H], [0, H]], inner);
  // 화구 안 물(응회환, 마르는 바닥이 낮아 물이 고이기도 한다)
  if (kind === 'maar') s += `<polygon points="${pts(surf.filter(([x, y]) => y > g + 30))}" fill="${SEA}" opacity="0.8"/>`;
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
  if (S.sea) s += `<path d="M0 ${SEA_Y}H${f1(cx - S.w * 0.62)}M${f1(cx + S.w * 0.62)} ${SEA_Y}H${W}" stroke="${SEA_LIGHT}" stroke-width="1.6"/>`;
  let n = '';
  const name = SMALL_NAMES[kind];
  n += say(kind, name, cx, 24, '#ffe9b0', 18);
  const sub = { scoria: '땅 위에서 터짐, 높고 급함', tuffcone: '얕은 바다에서 터짐, 화구가 큼', tuffring: '더 낮고 넓게 퍼짐', maar: '땅을 파고든 큰 화구' }[kind];
  n += plain(sub, cx, 42, '#e6e2d4', 12);
  const ex = { scoria: '예: 다랑쉬오름', tuffcone: '예: 성산 일출봉', tuffring: '예: 송악산, 수월봉, 하논', maar: '예: 독일 아이펠 지방' }[kind];
  n += plain(ex, cx, H - 10, DARK_TEXT, 12, 'middle', true);
  if (S.sea) n += plain('해수면', 8, SEA_Y - 5, SEA_LIGHT, 11, 'start');
  return `<svg class="vc-small" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name}을 세로로 자른 단면">${textStyle('vc-small')}${s}${n}</svg>`;
}

// ---------- 그림 3: 칼데라 ----------
function calderaPanel(stage) {
  const { W, H, base, cx, ring } = CAL, st = CAL_STAGE[stage];
  const surf = range(0, W, 3).map(x => [x, calSurface(x, stage)]);
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  // 큰 분출: 화산재 기둥
  if (stage === 1) {
    for (let k = 0; k < 14; k++) { const r = 16 + k * 3.2, y = 170 - k * 11, x = cx + Math.sin(k * 1.7) * 10; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${ASH}" opacity="0.8"/>`; }
  }
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>`;
  // 화산 몸체: 용암과 쇄설물 층
  for (let k = 0; k < 7; k++) {
    const f = 1 - k / 7, ly = range(0, W, 4).map(x => { const u = Math.abs(x - cx) / (300 * f); return [x, u >= 1 ? base : base - (base - st.summit) * f * calProf(u)]; });
    inner += `<polygon points="${pts([...ly, [W, base], [0, base]])}" fill="${k % 2 ? TEPHRA : BASALT2}"/>`;
  }
  // 꺼진 덩어리: 둥근 단층 안쪽이 통째로 내려앉는다(층이 그대로 아래로 옮겨진다).
  if (st.floor) {
    const drop = st.floor - calSurface(cx, 0) - 22;
    const blk = range(cx - ring, cx + ring, 4);
    let b = '';
    for (let k = 0; k < 7; k++) {
      const f = 1 - k / 7, ly = blk.map(x => { const u = Math.abs(x - cx) / (300 * f); return [x, (u >= 1 ? base : base - (base - st.summit) * f * calProf(u)) + drop]; });
      b += `<polygon points="${pts([...ly, [cx + ring, base + drop], [cx - ring, base + drop]])}" fill="${k % 2 ? TEPHRA : BASALT2}"/>`;
    }
    inner += `<rect x="${cx - ring}" y="0" width="${2 * ring}" height="${H}" fill="${OLD}"/>` + b;
    if (stage >= 2) inner += `<rect data-atrio="1" x="${cx - ring}" y="${st.floor}" width="${2 * ring}" height="${f1(Math.max(0, 290 - st.floor))}" fill="${GRAVEL}"/>`;
  }
  // 마그마 방과 화도. 방의 크기는 그대로이고, 마그마가 빠져나간 위쪽은 빈 공간(공동)이 된다.
  // 단계 1(꺼지는 중)은 빈 공간 위로 덩어리가 내려앉는 중이고, 단계 2부터는 내려앉은 덩어리가 빈 공간을 메웠다.
  const rx = 190, ry = 34, cy0 = H - 26, mTop = cy0 + ry - 2 * ry * st.chamber;
  inner += `<ellipse data-chamber="1" cx="${cx}" cy="${cy0}" rx="${rx}" ry="${ry}" fill="${MAGMA}"/><ellipse cx="${cx}" cy="${H - 18}" rx="${f1(rx * 0.55)}" ry="${f1(ry * 0.35)}" fill="${MAGMA_HOT}"/>`;
  if (st.chamber < 1) {
    const voidTop = stage === 1 ? cy0 - ry + (mTop - (cy0 - ry)) * 0.45 : mTop;
    const half = x => ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
    const xs = range(cx - rx, cx + rx, 4);
    // 빈 공간: 지붕(내려앉은 만큼)과 마그마 윗면 사이
    const top = xs.map(x => [x, Math.min(mTop, Math.max(cy0 - half(x), voidTop))]);
    const bot = xs.map(x => [x, Math.min(mTop, cy0 + half(x))]).reverse();
    if (stage === 1) inner += `<polygon data-void="1" points="${pts([...top, ...bot])}" fill="#141010"/>`;
    // 빈 공간으로 내려앉은 바위(단계 1은 조금, 단계 2부터는 다 메움)
    const rock = xs.map(x => [x, cy0 - half(x)]), fillTo = xs.map(x => [x, Math.min(mTop, Math.max(cy0 - half(x), voidTop))]).reverse();
    inner += `<polygon points="${pts([...rock, ...fillTo])}" fill="${OLD}"/>`;
    inner += `<path d="M${cx - rx + 20} ${f1(mTop)}H${cx + rx - 20}" stroke="${MAGMA_HOT}" stroke-width="2"/>`;
  }
  if (stage === 0 || stage === 1 || stage === 3) {
    const tx = stage === 3 ? cx - 30 : cx;
    const vb = Math.min(H - 30, mTop + 2);
    inner += `<path d="M${tx - 4} ${f1(vb)}L${tx - 3} ${f1(calSurface(tx, stage))}L${tx + 3} ${f1(calSurface(tx, stage))}L${tx + 4} ${f1(vb)}Z" fill="${MAGMA}"/>`;
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  // 둥근 단층
  if (st.floor) for (const x of [cx - ring, cx + ring]) s += `<path data-fault="1" d="M${x} ${f1(calSurface(x + (x < cx ? -2 : 2), stage))}L${x + (x < cx ? 10 : -10)} ${H - 40}" stroke="#1e1a18" stroke-width="2" stroke-dasharray="7 5"/>`;
  // 화쇄류
  if (stage === 1) for (const sgn of [-1, 1]) s += `<path d="M${cx + sgn * 120} ${f1(calSurface(cx + sgn * 120, 1) - 4)}Q${cx + sgn * 200} ${f1(calSurface(cx + sgn * 200, 1) - 16)} ${cx + sgn * 286} ${base - 6}L${cx + sgn * 300} ${base}L${cx + sgn * 120} ${f1(calSurface(cx + sgn * 120, 1) + 2)}Z" fill="#b3aca2" opacity="0.85"/>`;
  // 칼데라호
  if (st.lake) s += `<polygon data-lake="1" points="${pts(surf.filter(([x, y]) => Math.abs(x - cx) < ring && y > st.lake).map(([x]) => [x, st.lake]).concat(surf.filter(([x, y]) => Math.abs(x - cx) < ring && y > st.lake).reverse()))}" fill="${SEA}"/>`;
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
  s += `<path d="M0 ${base}H${W}" stroke="#1e1a18" stroke-width="1"/>`;
  let n = '';
  n += say('chamber', '마그마 방', cx - rx - 56, H - 20, '#ffd0a0', 16);
  if (stage === 0) n += plain('분화구', cx, 50, '#e6e2d4', 13);
  if (stage === 1) n += say('chamber', '빈 공간', cx, cy0 - 2, '#f3e6d6', 13);
  if (stage === 1) {
    n += say('pyro', '화쇄류', cx - 230, 196, LIGHT, 16) + say('pyro', '화쇄류', cx + 230, 196, LIGHT, 16);
    n += plain('화산재 기둥', cx + 70, 34, '#e6e2d4', 13);
    n += say('caldera', '둥근 단층을 따라 꺼짐', cx, 236, LIGHT, 15);
  }
  if (stage >= 2) {
    n += say('caldera', '칼데라', cx, 46, '#ffe9b0', 19);
    n += say('somma', '외륜산', cx - 200, 92, LIGHT, 16) + lead(cx - 200, 98, cx - 160, calSurface(cx - 160, stage) - 3);
    n += say('somma', '외륜산', cx + 200, 92, LIGHT, 16) + lead(cx + 200, 98, cx + 160, calSurface(cx + 160, stage) - 3);
  }
  if (stage === 2) n += say('atrio', '화구원', cx, st.floor - 14, '#ffe9b0', 16);
  if (stage === 3) {
    n += say('central', '중앙화구구', cx - 30, st.floor - st.cone - 14, '#ffe9b0', 16);
    n += say('calderaLake', '칼데라호', cx + 62, st.lake - 10, SEA_LIGHT, 15);
  }
  return `<svg class="vc-cal" viewBox="0 0 ${W} ${H}" role="img" aria-label="칼데라가 생기는 차례. ${CAL_NAMES[stage]} 단계이다.">${textStyle('vc-cal')}${s}${n}
    <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-size="12" font-weight="700" fill="${DARK_TEXT}" class="rk">크기와 깊이를 크게 과장한 예시입니다.</text></svg>`;
}

// ---------- 그림 4: 철원 용암대지 ----------
function cwPanel(stage) {
  const { W, H, valley, plateau } = CW;
  const surf = range(0, W, 2).map(x => [x, cwSurface(x, stage)]);
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>`;
  inner += range(70, H, 18).map(y => `<path d="M0 ${y}Q${W / 2} ${y + 8} ${W} ${y}" stroke="${OLD_LINE}" stroke-width="1" fill="none"/>`).join('');
  // 옛 하천 자갈층(백의리층)
  const gravel = range(88, 272, 2).map(x => [x, oldGround(x)]);
  inner += `<polygon data-gravel="1" points="${pts([...gravel, [272, valley + 14], [88, valley + 14]])}" fill="${GRAVEL}"/>`;
  if (stage >= 1) {
    // 현무암: 옛 골짜기를 평평하게 메운 여러 장의 용암
    const lava = range(0, W, 2).map(x => [x, Math.min(oldGround(x), plateau)]);
    inner += `<polygon data-lava="1" points="${pts([...lava, ...range(0, W, 2).reverse().map(x => [x, oldGround(x)])])}" fill="${BASALT}"/>`;
    for (let k = 1; k < 4; k++) { const y = plateau + (valley - plateau) * k / 4; inner += `<path d="M${f1(Math.max(0, 88 - 30 * (1 - k / 4)))} ${f1(y)}H${f1(Math.min(W, 272 + 30 * (1 - k / 4)))}" stroke="#8a4c36" stroke-width="1"/>`; }
  }
  if (stage === 2) {
    // 협곡 벽의 주상절리
    for (const x of range(CANYON.x - 34, CANYON.x + 34, 5)) if (Math.abs(x - CANYON.x) > CANYON.half - 2) inner += `<path d="M${x} ${plateau + 2}V${valley - 8}" stroke="#1a1716" stroke-width="1.2"/>`;
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  // 하천
  if (stage === 0) s += `<ellipse cx="180" cy="${valley - 4}" rx="18" ry="3.5" fill="${SEA}"/>`;
  if (stage === 2) s += `<ellipse cx="${CANYON.x}" cy="${valley}" rx="${CANYON.half - 4}" ry="3" fill="${SEA}"/>`;
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
  // 풀(용암대지 위 논밭)
  if (stage >= 1) s += `<path d="M90 ${plateau}H${stage === 2 ? CANYON.x - CANYON.half - 4 : 270}" stroke="${GRASS}" stroke-width="3"/>`;
  let n = '';
  if (stage === 0) {
    n += say('valley', '추가령 구조곡', 180, 34, '#ffe9b0', 17);
    n += plain('옛 하천', 180, valley - 16, SEA_LIGHT, 12);
    n += say('baegui', '옛 하천 자갈층', 180, valley + 30, DARK_TEXT, 13, 'middle', true);
    n += plain('화강암, 편마암 산지', 60, 40, '#e6e2d4', 12);
  }
  if (stage === 1) {
    n += say('plateau', '용암대지', 180, 70, '#ffe9b0', 17);
    n += say('fissure', '열하 분출', 150, plateau + 44, LIGHT, 13);
    n += `<path d="M150 ${H}L146 ${plateau + 56}" stroke="${MAGMA}" stroke-width="3"/>`;
    // 오리산(분석구, 말기)
    s += `<path d="M250 ${plateau}Q262 ${plateau - 18} 268 ${plateau - 20}Q274 ${plateau - 18} 286 ${plateau}Z" fill="${SCORIA}"/>`;
    n += say('ori', '분석구(오리산)', 290, plateau - 30, LIGHT, 12);
  }
  if (stage === 2) {
    n += say('canyon', '한탄강 협곡', CANYON.x, 70, '#ffe9b0', 16);
    n += say('column', '주상절리', CANYON.x - 70, plateau + 30, LIGHT, 13) + lead(CANYON.x - 70, plateau + 36, CANYON.x - CANYON.half - 6, plateau + 40);
    n += say('baegui', '백의리층', CANYON.x + 66, valley + 14, DARK_TEXT, 13, 'middle', true) + lead(CANYON.x + 40, valley + 10, CANYON.x + CANYON.half - 2, valley + 4, DARK_TEXT);
    n += plain('현무암 절벽', CANYON.x - 92, plateau - 8, '#e6e2d4', 12);
  }
  return `<svg class="vc-cw" viewBox="0 0 ${W} ${H}" role="img" aria-label="철원 용암대지를 가로로 자른 단면. ${CW_NAMES[stage]}.">${textStyle('vc-cw')}${s}${n}</svg>`;
}

// 지류 폭포의 종단면: 본류 협곡으로 떨어지던 폭포가 상류로 물러났다.
export const FALL = { W: 720, H: 220, plateau: 74, river: 176, mainX: 600, fallX: 380 };
function fallsPanel() {
  const { W, H, plateau, river, mainX, fallX } = FALL;
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  // 땅: 용암대지(현무암) 아래 옛 땅. 지류는 폭포 아래쪽으로 좁은 골짜기를 파 놓았다.
  const ground = [[0, plateau], [fallX, plateau], [fallX + 4, river - 6], [mainX - 30, river - 2], [mainX, river + 4], [W, river + 4], [W, H], [0, H]];
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/><rect x="0" y="${plateau}" width="${W}" height="${river - 30 - plateau}" fill="${BASALT}"/><rect x="0" y="${river - 30}" width="${W}" height="16" fill="${GRAVEL}"/>`;
  for (const x of range(8, W, 10)) inner += `<path d="M${x} ${plateau + 4}V${river - 34}" stroke="#1a1716" stroke-width="1"/>`;
  s += clipOf(ground, inner);
  s += `<polyline points="${pts(ground.slice(0, 6))}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
  // 물: 지류는 대지 위를 흐르다 폭포로 떨어진다.
  s += `<path d="M0 ${plateau - 3}H${fallX + 2}" stroke="${SEA}" stroke-width="4"/>`;
  s += `<path d="M${fallX + 3} ${plateau}C${fallX + 10} ${plateau + 20} ${fallX + 8} ${river - 40} ${fallX + 10} ${river - 8}" stroke="${SEA_LIGHT}" stroke-width="4" fill="none"/>`;
  s += `<path d="M${fallX + 10} ${river - 7}L${mainX - 30} ${river - 3}L${mainX} ${river + 2}" stroke="${SEA}" stroke-width="3" fill="none"/>`;
  s += `<rect x="${mainX + 6}" y="${river - 2}" width="${W - mainX - 6}" height="8" fill="${SEA}"/>`;
  // 예전 폭포 자리(본류와 만나는 곳)와 물러난 방향
  s += `<path d="M${mainX - 4} ${plateau}V${river}" stroke="${LIGHT}" stroke-width="1.6" stroke-dasharray="6 5"/>`;
  s += arrow(mainX - 14, plateau - 18, fallX + 18, plateau - 18, '#ffe9b0', 2.4, 7);
  let n = '';
  n += say('falls', '폭포(재인폭포)', fallX - 70, plateau - 30, '#ffe9b0', 16);
  n += plain(`본류에서 약 ${FALLS_M}m 상류로 물러남`, (fallX + mainX) / 2, plateau - 30, '#e6e2d4', 13);
  n += plain('예전 폭포 자리', mainX - 4, plateau - 44, '#e6e2d4', 12);
  n += say('canyon', '본류(한탄강)', mainX + 58, river - 14, SEA_LIGHT, 14);
  n += plain('지류', 60, plateau - 10, SEA_LIGHT, 13);
  n += say('plateau', '현무암(용암대지)', 140, plateau + 40, LIGHT, 14);
  n += say('baegui', '자갈층', 140, river - 18, DARK_TEXT, 13, 'middle', true);
  return `<svg class="vc-falls" viewBox="0 0 ${W} ${H}" role="img" aria-label="지류를 따라 세로로 자른 종단면. 본류 협곡으로 떨어지던 폭포가 상류로 물러났다.">${textStyle('vc-falls')}${s}${n}</svg>`;
}

const sw = inner => `<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${inner}</svg>`;
const LEGEND = [
  [`<rect width="22" height="14" fill="${BASALT}"/><path d="M0 7H22" stroke="#8a4c36" stroke-width="1"/>`, '현무암 용암'],
  [`<rect width="22" height="14" fill="${TEPHRA}"/>`, '화산 쇄설물'],
  [`<rect width="22" height="14" fill="${TRACHYTE}"/>`, '조면암'],
  [`<rect width="22" height="14" fill="${SCORIA}"/>`, '스코리아'],
  [`<rect width="22" height="14" fill="${TUFF}"/>`, '응회암'],
  [`<rect width="22" height="14" fill="${MAGMA}"/>`, '마그마'],
  [`<rect width="22" height="14" fill="${OLD}"/>`, '화산보다 오래된 바위'],
  [`<rect width="22" height="14" fill="${GRAVEL}"/>`, '자갈과 모래층'],
  [`<rect width="22" height="14" fill="${SEA}"/>`, '바다, 호수, 하천'],
];

// options.steps: 칼데라 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? 3, zone = null, zoneAt = 'body';
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    clipN = 0;
    const buttons = options.steps !== false ? `<div class="row" aria-label="칼데라 단계">${CAL_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    const note = (where, fallback = '') => zone && zoneAt === where ? `<p class="schem-note"><b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}</p>` : fallback;
    root.innerHTML = `
      <h2>화산체의 모양 (모식도)</h2>
      <div class="schem-trio">${['shield', 'strato', 'dome'].map((k, i) => `<figure>${bodyPanel(k)}<figcaption>${BODY_NAMES[i]}</figcaption></figure>`).join('')}</div>
      ${note('body', '<p class="schem-note">용암이 묽을수록 멀리 흘러 넓고 완만한 화산이, 끈끈할수록 좁고 급한 화산이 됩니다. 폭발로 뿜어낸 화산 쇄설물이 많이 섞이면 높고 급한 성층화산이 됩니다.</p>')}
      <h2>작은 화산 네 가지 (모식도)</h2>
      <div class="schem-quad">${Object.keys(SMALL).map(k => `<figure>${smallPanel(k)}<figcaption>${SMALL_NAMES[k]}</figcaption></figure>`).join('')}</div>
      ${note('small', '<p class="schem-note">땅 위에서 터지면 분석구가, 마그마가 물과 만나 터지면 응회구나 응회환이 생깁니다. 응회환은 응회구보다 낮고 넓습니다. 마르는 땅을 파고든 큰 화구입니다. 책은 제주 산굼부리를 마르가 아닌 함몰 화구로, 하논을 응회환으로 보며, 우리나라에는 마르로 볼 지형이 없다고 봅니다.</p>')}
      <h2>칼데라가 생기는 차례 (모식도)</h2>
      ${buttons}
      <figure>${calderaPanel(stage)}</figure>
      ${note('cal', `<p class="schem-note">${CAL_NOTES[stage]}</p>`)}
      <h2>철원 용암대지와 한탄강 협곡 (모식도)</h2>
      <div class="schem-trio">${CW_NAMES.map((t, i) => `<figure>${cwPanel(i)}<figcaption>${i + 1}. ${t}</figcaption></figure>`).join('')}</div>
      <figure>${fallsPanel()}<figcaption>지류를 따라 자른 종단면: 폭포가 상류로 물러남</figcaption></figure>
      ${note('cw', `<p class="schem-note">철원 용암대지는 추가령 구조곡을 따라 주로 땅의 틈(열하)에서 흘러나온 현무암이 옛 골짜기를 메워 생겼고, 분출 끝 무렵에는 오리산 같은 분석구가 생겼습니다. 그 뒤 한탄강이 용암과 아래 땅의 경계를 따라 깎아 현무암 절벽과 주상절리가 드러난 협곡이 생겼습니다. 물이 적은 지류는 대지 높이에 남아 본류로 떨어지는 폭포가 되었고, 폭포는 조금씩 상류로 물러났습니다(재인폭포 약 ${FALLS_M}m, 비둘기낭폭포 약 ${PIGEON_M}m).</p>`)}
      <div class="schem-legend">${LEGEND.map(([q, t]) => `<span>${sw(q)}${t}</span>`).join('')}</div>
      <p class="schem-cap">${CAPTION}</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    const where = z.closest('svg.vc-body') ? 'body' : z.closest('svg.vc-small') ? 'small' : z.closest('svg.vc-cal') ? 'cal' : 'cw';
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
