// © 2026 김용현
// 화강암 풍화 지형 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 1. 토르와 돔이 생기는 두 단계(단면 세 단계)와 토르의 두 가지 생김새
// 2. 바위 겉의 작은 지형(나마, 타포니, 그루브)과 돔 겉의 판상 절리, 박리
// 3. 돌산과 흙산 4. 화강암 침식 분지(춘천 분지) 5. 우리나라 사례
// y는 화면(그림 픽셀) 좌표로, 아래로 갈수록 크다. 그림만 그리는 코드라 계산 제한은 없다.

export const ZONE_TEXT = {
  joint: { name: '절리', text: '바위에 생긴 갈라진 틈입니다. 화강암은 땅속 깊은 곳에서 마그마가 천천히 식어 굳은 바위로, 위를 누르던 두꺼운 바위가 깎여 나가면서 세로 틈과 가로 틈이 생깁니다. 틈이 촘촘한 곳, 알맞게 벌어진 곳, 거의 없는 곳이 섞여 있습니다.' },
  saprolite: { name: '새프롤라이트(그루스)', text: '땅속에서 화학적으로 썩어 물러진 바위층입니다. 망치로 쉽게 깨지고 심하면 손으로도 부서집니다. 화강암에서는 약한 장석과 흑운모가 먼저 변하고, 단단한 석영 알갱이가 낱알로 떨어져 굵은 모래 같은 그루스가 됩니다. 흔히 마사라고 부릅니다. 화강암은 알갱이가 굵고 절리가 많아 이 층이 특히 두껍게 생깁니다.' },
  corestone: { name: '핵석', text: '절리로 나뉜 바위 덩어리는 꼭짓점이 세 면에서, 모서리가 두 면에서 물을 만나 가장 먼저 썩습니다. 그래서 가운데의 덜 썩은 부분이 둥글게 남는데, 이것이 핵석이고 이렇게 둥글어지는 풍화를 구상 풍화라고 합니다. 땅 표면 가까이의 핵석은 작고 둥글며, 깊을수록 크고 각이 남아 있습니다.' },
  front: { name: '풍화 전선', text: '풍화층과 그 아래 싱싱한 기반암의 경계입니다. 풍화가 내려간 가장 깊은 선이라, 풍화 전선이 깊을수록 풍화층이 두껍습니다. 절리가 촘촘한 곳은 물이 잘 스며 깊게 내려가고, 절리가 거의 없는 곳은 얕게 머뭅니다.' },
  bedrock: { name: '기반암', text: '아직 썩지 않은 단단한 화강암입니다. 물이 덜 닿는 깊은 곳이라 풍화가 거의 일어나지 않았고, 절리로 큰 덩어리로 나뉘어 있습니다.' },
  deep: { name: '땅속 깊은 풍화(심층 풍화)', text: '빗물이 절리를 따라 땅속 깊이 스며들어 오랫동안 바위를 화학적으로 썩히는 일입니다. 덥고 습할수록 활발합니다. 책은 우리나라의 심층 풍화가 신생대 제3기와 제4기 간빙기처럼 지금보다 따뜻하고 습했던 시기에 주로 일어났다고 추정합니다. 시기는 짐작이라는 점을 기억해 두세요.' },
  strip: { name: '풍화층이 벗겨짐', text: '책은 제4기 빙기의 추운 기후에서 풍화층이 벗겨졌다고 추정합니다. 땅이 얼었다 녹기를 되풀이하면 물을 머금은 풍화층이 비탈 아래로 천천히 흘러내립니다(솔리플럭션). 그러면 풍화 전선 아래의 단단한 바위와 핵석이 땅 위로 드러납니다.' },
  tor: { name: '토르', text: '기반암 위에 바위 덩어리(우리나라는 둥근 것이 많음)가 쌓여 탑이나 무더기처럼 솟은 지형입니다. 땅속에서 생긴 핵석이 풍화층이 벗겨지며 드러난 것으로, 아래 기반암과는 절리면을 경계로 나뉩니다. 우리나라 화강암 산의 꼭대기와 능선에서 흔히 볼 수 있습니다.' },
  dome: { name: '돔(보른하르트)', text: '절리가 거의 없는 큰 화강암 덩어리는 물이 잘 스며들지 못해 덜 썩습니다. 둘레의 풍화층이 벗겨지면 이 덩어리가 통째로 드러나 둥근 지붕 모양의 바위산이 되는데, 이를 보른하르트라고 합니다. 평지에 섬처럼 홀로 솟은 구릉(도상 구릉)의 하나입니다.' },
  etch: { name: '드러난 기반암 면', text: '풍화층이 벗겨진 뒤 드러난, 풍화 전선 아래의 기반암 면입니다. 이렇게 넓고 완만하게 드러난 면을 동체 평원이라고 하며, 그 위에 토르와 돔이 솟아 있습니다. 절리가 촘촘해 깊이 썩었던 곳은 낮게 남습니다.' },
  savanna: { name: '둥근 토르(사바나형)', text: '땅속에서 핵석이 둥글게 다듬어진 뒤 풍화층이 벗겨져 드러난 토르입니다. 화학적 풍화가 강한 따뜻한 곳의 땅속 풍화로 생긴다고 보아 사바나형이라고 부르며, 바위가 둥급니다. 책은 팔공산 갓바위와 영랑호 범바위를 예로 듭니다.' },
  periglacial: { name: '각진 토르(주빙하형)', text: '추운 곳에서 땅 위로 드러난 기반암의 절리에 스민 물이 얼었다 녹기를 되풀이하며 바위를 쪼개 생긴 토르입니다. 땅 위에서 생겨 바위가 각져 있습니다. 책은 비슬산 대견사지의 토르를 예로 듭니다. 우리나라 토르는 둥근 것이 더 많아, 책은 땅속 풍화와 관련이 크다고 봅니다.' },
  gnamma: { name: '나마', text: '평평하거나 완만한 바위 윗면에 아래로 오목하게 파인 웅덩이입니다. 대개 하나씩 따로 생깁니다. 책은 작은 틈이나 오목한 곳에 고인 물이 바위를 썩히는 일, 식물이 내는 물질, 얼었다 녹기 등 여러 원인을 함께 적고 하나로 정하지 않습니다. 북한산에서도 볼 수 있습니다.' },
  tafoni: { name: '타포니', text: '거의 수직인 바위 벽에 옆으로 파고든 구멍입니다. 여러 개가 모여 나타나고 서로 이어지며 커지기도 합니다. 소금 결정이 자라는 염 풍화, 얼었다 녹기, 젖었다 마르기 등으로 알갱이가 떨어지거나 얇게 벗겨져 자란다고 봅니다. 원인은 한 가지로 정해져 있지 않습니다.' },
  groove: { name: '그루브', text: '가파른 바위 벽을 따라 위에서 아래로 길게 파인 홈입니다. 바위 겉의 풍화와 빗물이 쓸어내리는 침식(우세)이 함께 작용해 생긴다고 알려져 있습니다. 하천, 빙하, 파도, 바람으로 생기는 홈도 있습니다. 책은 서울 불암산의 홈을 예로 듭니다.' },
  sheeting: { name: '판상 절리', text: '땅속 깊은 곳의 화강암은 위를 덮은 바위의 무게에 눌려 있습니다. 위가 깎여 나가 누르던 무게가 사라지면 바위가 바깥으로 부풀며, 땅 표면과 나란한 판 모양의 틈이 겹겹이 생깁니다. 이것이 판상 절리입니다. 돔에서는 둥근 겉면을 따라 휘어 있고, 겉에 가까울수록 촘촘합니다.' },
  exfoliation: { name: '박리', text: '바위 겉이 표면과 나란한 틈을 따라 양파 껍질처럼 겹겹이 벗겨져 떨어지는 일입니다. 판상 절리가 잘 생기는 화강암에서 잘 일어납니다. 판상 절리와 박리를 나누는 정해진 기준은 없고, 틈이 작고 촘촘하면 대개 박리라고 부릅니다.' },
  dolsan: { name: '돌산(석산)', text: '겉에 바위나 바위 부스러기가 많이 드러난 산입니다. 풍화와 침식에 강한 바위라 흙이 두껍게 쌓이지 못하고, 비탈 대부분이 바위 비탈입니다. 책은 화강암, 화산암, 사암, 역암 지역에서 잘 생긴다고 적습니다. 이 장면의 북한산은 화강암 바위가 드러난 산입니다.' },
  heuksan: { name: '흙산(토산)', text: '겉이 주로 흙으로 덮인 산입니다. 풍화가 잘 진행되어 두꺼운 흙층이 생겼고, 비탈 대부분이 흙으로 덮여 있습니다. 책은 편마암, 편암 같은 변성암과 셰일 지역에서 잘 생긴다고 적습니다.' },
  granite: { name: '절리가 많은 화강암', text: '춘천 분지 안은 중생대 흑운모 화강암입니다. 절리가 많고 풍화에 약한 사장석과 흑운모가 많은 화강암은 물이 잘 스며들어 깊이 썩습니다. 같은 화강암이라도 절리가 적고 석영과 정장석이 많으면 단단해 돌산이 되기도 합니다.' },
  meta: { name: '둘레 산지(변성암)', text: '춘천 분지를 둘러싼 산지는 흑운모 편암, 편마암처럼 퇴적암이 열과 압력을 받아 바뀐 변성암으로 되어 있습니다. 분지 안의 화강암보다 덜 썩고 덜 깎여 높은 산으로 남았습니다.' },
  creep: { name: '토양 포행과 우세', text: '흙이 비탈을 따라 아주 천천히 내려가는 토양 포행과, 빗물이 땅 겉을 쓸어내리는 우세가 두꺼운 풍화층을 조금씩 실어 갔습니다. 책은 이 과정도 추정이라고 적습니다.' },
  basin: { name: '화강암 침식 분지', text: '높은 산지로 둘러싸인 낮고 평평한 땅이 풍화와 침식으로 생긴 것을 침식 분지라고 합니다. 우리나라에서는 풍화에 약한 화강암이 상대적으로 강한 변성암에 둘러싸인 곳에서 화강암만 깊이 썩고 깎여 분지가 된 경우가 많습니다. 춘천 분지와 양구 해안 분지가 책의 예입니다.' },
  residual: { name: '잔류 구릉(봉의산)', text: '분지 안에서 단단한 부분이 덜 깎여 홀로 솟아 남은 언덕입니다. 책은 춘천 분지 가운데의 봉의산을 이런 잔류 구릉으로 설명합니다.' },
};

// ---------- 1. 토르와 돔이 생기는 단면 ----------
export const STAGE_NAMES = ['절리가 생긴 화강암', '땅속 깊은 풍화', '풍화층이 벗겨짐'];
export const JOINTED = 0, DEEP = 1, EXPOSED = 2;
export const NOTES = [
  '절리가 생긴 화강암: 땅속 깊은 곳에서 굳은 화강암이, 위를 덮은 땅이 깎여 나가면서 땅 표면 가까이 올라왔습니다. 바위에는 세로와 가로로 절리가 생겼는데, 곳에 따라 촘촘하기도 하고, 알맞게 벌어지기도 하고, 거의 없기도 합니다.',
  '땅속 깊은 풍화: 빗물이 절리를 따라 땅속 깊이 스며들어 오랫동안 바위를 썩혔습니다. 썩은 부분은 그루스가 섞인 새프롤라이트가 되고, 절리로 나뉜 덩어리의 가운데는 둥근 핵석으로 남았습니다. 절리가 촘촘한 곳은 깊이 썩고, 절리가 거의 없는 덩어리는 조금만 썩었습니다. 책은 이 일이 신생대 제3기와 제4기 간빙기처럼 따뜻하고 습했던 시기에 일어났다고 추정합니다.',
  '풍화층이 벗겨짐: 추운 시기에 얼었다 녹기를 되풀이하며 풍화층이 비탈 아래로 흘러내려(솔리플럭션) 벗겨져 나갔습니다. 그러자 핵석이 기반암 위에 쌓인 채 드러나 토르가 되고, 절리가 거의 없던 큰 덩어리는 통째로 드러나 둥근 돔(보른하르트)이 되었습니다. 책은 이 시기를 제4기 빙기로 추정합니다. 위를 덮던 수 km 두께의 바위가 깎여 나갈 때 땅속에서 이미 생긴 판상 절리는, 돔이 드러난 뒤 벌어져 얇은 판이 벗겨집니다(박리).',
];
export const SEC = { W: 720, H: 380 };
// 절리 간격이 다른 세 구역: 촘촘함(왼쪽), 알맞음(가운데), 거의 없음(오른쪽)
export const ZONES = { dense: [0, 230], mid: [230, 450], sparse: [450, 720] };
export const zoneOf = x => x < ZONES.mid[0] ? 'dense' : x < ZONES.sparse[0] ? 'mid' : 'sparse';
export const DENSE_STEP = 23, DENSE_D = 21; // 촘촘한 곳의 세로 절리 간격, 가로 절리 간격
export const MID_X = [230, 285, 340, 395, 450]; // 가운데 구역의 세로 절리
export const MID_D = [0, 34, 72, 116, 166, 226, 300]; // 가운데 구역의 가로 절리 깊이(깊을수록 간격이 넓다)
export const SPARSE_D = [236, 300]; // 큰 덩어리 아래 깊은 곳에만 있는 가로 절리
export const SPARSE_V = [{ x: 610, d: 236 }]; // 깊은 곳에만 있는 세로 절리
export const TOR_COLS = [1, 2]; // 토르가 되는 기둥(가운데 구역의 두 칸)
export const DOME = { cx: 585, half: 135, top: 22 };
const SHRINK = [0.5, 0.62, 0.74, 0.86]; // 핵석이 처음 덩어리에서 남는 비율(깊을수록 크다)
const ROUND = [0.5, 0.42, 0.32, 0.22]; // 모서리 반지름 비율(얕을수록 둥글다)

const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
// 늘 같은 값이 나오는 0과 1 사이의 수(그림이 매번 같게)
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const line = (f, a, b, step = 4) => { const p = []; for (let x = a; x <= b; x += step) p.push([x, f(x)]); if (p.at(-1)[0] !== b) p.push([b, f(b)]); return p; };

// 처음 땅 표면
export const ground0 = x => 92 + 4 * Math.sin(x / 47);
// 큰 덩어리(돔)가 될 곳의 풍화 깊이
export const domeDepth = x => { const u = (x - DOME.cx) / DOME.half; return DOME.top + 184 * u * u; };
// 풍화 전선의 깊이(처음 땅 표면에서 잰 값)
export function frontDepth(x) {
  if (x >= ZONES.sparse[0]) return Math.min(x < DOME.cx ? 166 : 205, domeDepth(x));
  const knob = Math.min(ramp(x, 279, 291), 1 - ramp(x, 389, 401)); // 토르 아래는 조금 덜 썩었다
  const dense = 1 - ramp(x, 222, 240);
  return 166 + 39 * dense - 50 * knob;
}
export const frontY = x => ground0(x) + frontDepth(x);
// 단계마다 땅 표면. 벗겨진 뒤에는 풍화 전선이 땅이 되고, 낮은 곳에만 얇은 풍화층이 남는다.
export const groundAt = (x, stage) => stage < EXPOSED ? ground0(x) : frontY(x) - 10 * ramp(frontDepth(x), 185, 200);

// 절리 선(꺾은선 목록)
export function jointLines() {
  const { H } = SEC, L = [];
  for (let x = ZONES.dense[0]; x <= ZONES.dense[1]; x += DENSE_STEP) L.push([[x, ground0(x) - 30], [x, H]]);
  for (let d = DENSE_D; ground0(0) + d < H; d += DENSE_D) L.push(line(x => ground0(x) + d, ZONES.dense[0], ZONES.dense[1], 6));
  for (const x of MID_X) L.push([[x, ground0(x) - 30], [x, H]]);
  for (const d of MID_D.slice(1)) L.push(line(x => ground0(x) + d, ZONES.mid[0], ZONES.mid[1], 6));
  for (const d of SPARSE_D) L.push(line(x => ground0(x) + d, ZONES.sparse[0], ZONES.sparse[1], 6));
  for (const v of SPARSE_V) L.push([[v.x, ground0(v.x) + v.d], [v.x, H]]);
  return L;
}
// 땅속 풍화 뒤의 핵석. corner는 둥근 모서리 반지름(크면 둥글다).
export function corestones() {
  const out = [];
  for (let c = 0; c < MID_X.length - 1; c++) {
    const x0 = MID_X[c], x1 = MID_X[c + 1], xc = (x0 + x1) / 2, fd = frontDepth(xc);
    for (let k = 0; k < SHRINK.length && MID_D[k + 1] <= fd + 0.5; k++) {
      const j = 0.94 + 0.08 * hash(c * 7 + k, 3);
      const w = (x1 - x0) * SHRINK[k] * j, h = (MID_D[k + 1] - MID_D[k]) * SHRINK[k] * j;
      out.push({ zone: 'mid', c, k, x: xc + 4 * (hash(c, k) - 0.5), y: ground0(xc) + (MID_D[k] + MID_D[k + 1]) / 2, w, h, corner: ROUND[k] * Math.min(w, h) });
    }
  }
  // 절리가 촘촘한 곳은 거의 다 썩고, 풍화 전선 가까이에만 작은 핵석이 남는다.
  for (let x0 = ZONES.dense[0]; x0 + DENSE_STEP <= ZONES.dense[1]; x0 += DENSE_STEP) {
    const xc = x0 + DENSE_STEP / 2;
    for (const n of [7, 8]) {
      const w = DENSE_STEP * 0.55, h = DENSE_D * 0.55;
      out.push({ zone: 'dense', c: x0 / DENSE_STEP, k: n, x: xc, y: ground0(xc) + (n + 0.5) * DENSE_D, w, h, corner: 0.3 * Math.min(w, h) });
    }
  }
  return out;
}
// 벗겨진 뒤의 토르: 핵석이 기반암 위에 차례로 얹혀 있다(아래부터).
export function torStacks() {
  return TOR_COLS.map(c => {
    const x0 = MID_X[c], x1 = MID_X[c + 1], xc = (x0 + x1) / 2;
    let y = frontY(xc);
    const out = [];
    for (let k = 2; k >= 0; k--) {
      const w = (x1 - x0) * SHRINK[k], h = (MID_D[k + 1] - MID_D[k]) * SHRINK[k];
      out.push({ c, k, x: xc + (k === 1 ? 3 : k === 0 ? -2 : 0) * (c === TOR_COLS[0] ? 1 : -1), y: y - h / 2, w, h, corner: ROUND[k] * Math.min(w, h) });
      y -= h;
    }
    return out;
  });
}
// 벗겨진 뒤 땅 위에 흩어진 핵석(땅 위에 얹혀 있다)
export function looseStones() {
  const out = [];
  const rest = (x, w) => { let m = Infinity; for (let t = -0.4; t <= 0.4; t += 0.1) m = Math.min(m, groundAt(x + t * w, EXPOSED)); return m; };
  for (const [c, dx] of [[0, -6], [3, 8]]) {
    const xc = (MID_X[c] + MID_X[c + 1]) / 2 + dx, w = 55 * SHRINK[3], h = 50 * SHRINK[3];
    out.push({ c, k: 3, x: xc, y: rest(xc, w) - h / 2, w, h, corner: ROUND[3] * Math.min(w, h) + 4 });
  }
  for (const x of [40, 98, 160, 668, 702]) { const w = 14 + 4 * hash(x, 2), h = w * 0.8; out.push({ c: -1, k: 8, x, y: rest(x, w) - h / 2, w, h, corner: 0.42 * h }); }
  return out;
}
// 돔 겉의 판상 절리 깊이(겉에 가까울수록 촘촘하다)
export const SHEET_D = [10, 22, 38, 60];

// ---------- 2. 바위 겉의 작은 지형 ----------
export const ROCK = { W: 720, H: 340 };
export const ROCK_TOP = [[120, 112], [470, 88], [592, 128], [212, 152]]; // 수평에 가까운 윗면
export const ROCK_FRONT = [[212, 152], [592, 128], [602, 300], [222, 304]]; // 수직에 가까운 벽
export const ROCK_LEFT = [[120, 112], [212, 152], [222, 304], [96, 300]]; // 가파른 벽
export const NAMA = [{ x: 300, y: 126, rx: 34, ry: 8, water: true }, { x: 410, y: 108, rx: 20, ry: 5, water: false }, { x: 505, y: 118, rx: 14, ry: 4, water: true }];
export const TAFONI = [[300, 250, 22], [338, 236, 15], [364, 262, 19], [396, 244, 12], [422, 268, 22], [456, 250, 14], [480, 274, 12], [318, 282, 10], [388, 286, 9], [440, 226, 9], [270, 268, 9], [506, 256, 10]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
export const GROOVES = [0.18, 0.4, 0.62, 0.84].map(t => ({ top: lerp(ROCK_LEFT[0], ROCK_LEFT[1], t), bot: lerp(ROCK_LEFT[3], ROCK_LEFT[2], t) }));
export function inside(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// 판상 절리와 박리가 보이는 돔 단면
export const DOMEFIG = { W: 720, H: 320, cx: 360, half: 260, base: 292, h: 196, cover: 44 };
export const DOME_SHEETS = [10, 22, 38, 60, 88];
// 겉에서 d만큼 안쪽에 있는 판상 절리 곡선(d = 0이면 돔 겉)
export function domeFig(x, d = 0) {
  const { cx, half, base, h } = DOMEFIG, u = (x - cx) / (half - 1.3 * d);
  return Math.abs(u) >= 1 ? base : base - (h - d) * Math.pow(1 - u * u, 0.75);
}

// ---------- 3. 돌산과 흙산 ----------
export const MT = { W: 360, H: 240 };
export const SOIL_THICK = { dol: 4, heuk: 22 };
const DOL_P = [[0, 200], [30, 190], [62, 160], [88, 118], [104, 84], [118, 70], [132, 80], [146, 52], [160, 40], [176, 58], [192, 92], [214, 104], [232, 96], [252, 128], [282, 160], [318, 186], [360, 198]];
export function dolY(x) {
  x = clamp(x, 0, MT.W);
  let i = 0; while (i < DOL_P.length - 2 && x > DOL_P[i + 1][0]) i++;
  const [x0, y0] = DOL_P[i], [x1, y1] = DOL_P[i + 1];
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
export const heukY = x => 206 - 146 * Math.exp(-(((x - 180) / 98) ** 2)) + 3 * Math.sin(x / 17);
export const MT_ROCKS = { dol: '화강암, 화산암, 사암, 역암', heuk: '편마암, 편암 같은 변성암, 셰일' };

// ---------- 4. 화강암 침식 분지 ----------
export const BASIN = { W: 360, H: 230, gx: [80, 290], hill: [178, 216] };
export const BASIN_NAMES = ['땅속 깊은 풍화', '풍화층이 벗겨짐', '오늘날 분지'];
export const BASIN_NOTE = '화강암 침식 분지가 생긴 차례: 따뜻하고 습했던 시기에 화강암 지역이 깊이 썩어 두꺼운 새프롤라이트가 생기고, 그 뒤 토양 포행과 빗물의 쓸림(우세)으로 이 층이 벗겨지며 땅이 낮아져 분지가 되었다고 책은 추정합니다. 분지 안의 단단한 부분은 잔류 구릉으로 남았습니다. 모든 분지가 이렇지는 않아서, 원주 분지처럼 분지와 둘레가 모두 화강암인 곳은 절리가 얼마나 촘촘한지의 차이로 설명합니다.';
export const basin0 = x => 70 + 8 * Math.sin(x / 17) + 5 * Math.sin(x / 37 + 1);
export const inGranite = x => Math.min(ramp(x, BASIN.gx[0], BASIN.gx[0] + 38), 1 - ramp(x, BASIN.gx[1] - 38, BASIN.gx[1]));
const hillW = x => Math.min(ramp(x, BASIN.hill[0], BASIN.hill[0] + 12), 1 - ramp(x, BASIN.hill[1] - 12, BASIN.hill[1]));
// 풍화층 깊이: 화강암은 깊고, 변성암은 얕다. 단단한 부분(잔류 구릉)은 덜 썩었다.
export const basinFront = x => 10 + 64 * inGranite(x) - 42 * hillW(x) * inGranite(x);
export function basinSurface(x, stage) {
  if (stage === 0) return basin0(x);
  if (stage === 1) return basin0(x) + 0.55 * (basinFront(x) - 10);
  const g = inGranite(x);
  return basin0(x) * (1 - g) + 74 * g + basinFront(x);
}

// ---------- 5. 우리나라 사례 ----------
export const EXAMPLES = [
  { name: '울산바위', what: '설악산의 큰 바위 구릉. 캐슬코피나 보른하르트로 보기도 함' },
  { name: '팔공산 갓바위', what: '땅속 풍화로 생긴 둥근 토르' },
  { name: '영랑호 범바위', what: '땅속 풍화로 생긴 둥근 토르' },
  { name: '비슬산 대견사지', what: '땅 위 풍화로 생긴 각진 토르' },
  { name: '북한산', what: '화강암 알갱이가 낱낱이 떨어지는 입상 붕괴와 나마' },
  { name: '여수 거북바위', what: '화강암 구릉 위쪽의 판상 절리와 박리, 아랫부분의 타포니' },
];
export const CONGLOMERATE = { name: '마이산', what: '화강암이 아니라 역암으로 된 바위 봉우리. 벽에 타포니가 많음' };

export const TOR2_NOTE = '책은 토르가 생기는 길을 두 가지로 설명합니다. 땅속에서 둥글어진 핵석이 드러난 둥근 토르(사바나형)와, 땅 위에 드러난 바위가 얼었다 녹기로 쪼개진 각진 토르(주빙하형)입니다. 우리나라 토르는 둥근 것이 더 많아, 책은 땅속 풍화와 관련이 크다고 추정합니다.';
export const MICRO_NOTE = '바위가 드러난 뒤에도 풍화는 계속됩니다. 평평한 윗면에는 나마, 수직에 가까운 벽에는 타포니, 가파른 벽에는 그루브가 생기고, 돔의 겉에는 판상 절리와 박리가 나타납니다. 책은 나마와 타포니의 원인을 여러 가지로 적으며, 판상 절리와 박리를 나누는 정해진 기준은 없다고 합니다. 여수 거북바위는 한 바위에 판상 절리, 박리, 타포니가 함께 보이는 예입니다.';
export const MOUNT_NOTE = '돌산과 흙산은 산의 겉이 바위인지 흙인지로 나눕니다. 책은 돌산이 화강암, 화산암, 사암, 역암 지역에서, 흙산이 편마암, 편암 같은 변성암과 셰일 지역에서 잘 생긴다고 적습니다. 다만 같은 화강암이라도 절리가 적고 석영과 정장석이 많으면 단단한 돌산이 되고, 절리가 많고 사장석과 흑운모가 많으면 쉽게 썩어 분지가 되기도 합니다.';
export const CAPTION = '이름을 누르면 설명이 나옵니다. 모든 그림은 크기와 높이를 크게 과장한 예시이며, 아주 긴 시간을 몇 단계로 줄여 보여 줍니다. 토르와 분지가 생긴 시기는 책도 추정이라고 적은 짐작입니다. 토르의 생김새, 나마와 타포니의 원인, 침식 분지가 생긴 과정에는 다른 해석도 있습니다. 출처: 『이미지로 이해하는 지형학』 2판.';

// ---------- 그리기 도구 ----------
const SKY = '#23302a', WARM_SKY = '#2d3326', COLD_SKY = '#25303b', GRANITE = '#9a948a', GRANITE_TOP = '#c9c3b6', GRANITE_SIDE = '#857e73', JOINT_C = '#2e2b27';
const SAPRO = '#c09468', SAPRO_DOT = '#8f6a43', CORE = '#cdc7bb', CORE_EDGE = '#4a463f', ICE = '#d8f0ff', ACCENT = '#e4b15a', WATER = '#4f9bd6', WATER_LIGHT = '#9fd0f2';
const META = '#7b7f6b', META_LINE = '#5d6152', SOIL = '#7a5a3a', SOIL_DOT = '#5c4229', FOREST = '#3f6a3a', FOREST_DARK = '#2c4a2a', GRAVEL = '#c9b48a';
const INK = '#16201f', LIGHT = '#f3f1ea', DIM = '#e6e2d4', NAME = '#ffe9b0', DARK_TEXT = '#22261f';
const say = (zone, text, x, y, color = LIGHT, size = 16, anchor = 'middle', rock = false) => `<text class="zone${rock ? ' rk' : ''}" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
const plain = (text, x, y, color = DIM, size = 13, anchor = 'middle', rock = false) => `<text${rock ? ' class="rk"' : ''} x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
const lead = (x0, y0, x1, y1, color = LIGHT) => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.4"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.3" fill="${color}"/>`;
const textStyle = cls => `<style>svg.${cls} text{paint-order:stroke;stroke:${INK};stroke-width:3.5px;stroke-linejoin:round} svg.${cls} text.rk{stroke:#f1ece0}</style>`;
const arrow = (x0, y0, x1, y1, color, w = 2.2, size = 6) => {
  const a = Math.atan2(y1 - y0, x1 - x0), c = Math.cos(a), s = Math.sin(a), hx = x1 - size * 1.3 * c, hy = y1 - size * 1.3 * s;
  return `<path d="M${f1(x0)} ${f1(y0)}L${f1(hx)} ${f1(hy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(hx - size * 0.7 * s)} ${f1(hy + size * 0.7 * c)}L${f1(x1)} ${f1(y1)}L${f1(hx + size * 0.7 * s)} ${f1(hy - size * 0.7 * c)}Z" fill="${color}"/>`;
};
// 땅을 따라 휘는 화살표(x0에서 x1 쪽으로)
function arrowOn(f, x0, x1, off, color) {
  const p = []; for (let i = 0; i <= 12; i++) { const x = x0 + (x1 - x0) * i / 12; p.push([x, f(x) + off]); }
  const [ax, ay] = p.at(-2), [bx, by] = p.at(-1), ang = Math.atan2(by - ay, bx - ax);
  const hx = bx - 9 * Math.cos(ang), hy = by - 9 * Math.sin(ang), nx = -Math.sin(ang) * 5.5, ny = Math.cos(ang) * 5.5;
  const body = w => `<polyline points="${pts(p.slice(0, -1))}" fill="none" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(hx + nx)} ${f1(hy + ny)}L${f1(bx)} ${f1(by)}L${f1(hx - nx)} ${f1(hy - ny)}Z"/>`;
  return `<g stroke="${INK}" fill="${INK}" stroke-linejoin="round">${body(5.6)}</g><g stroke="${color}" fill="${color}">${body(2.6)}</g>`;
}
const ice = (x, y, s = 5) => { let d = ''; for (const a of [0, 60, 120]) { const r = a * Math.PI / 180; d += `M${f1(x - Math.cos(r) * s)} ${f1(y - Math.sin(r) * s)}L${f1(x + Math.cos(r) * s)} ${f1(y + Math.sin(r) * s)}`; } return d; };
const tree = (x, y, s = 1) => `<path d="M${f1(x)} ${f1(y)}v${f1(-6 * s)}" stroke="#5b4a35" stroke-width="${f1(2 * s)}"/><circle cx="${f1(x)}" cy="${f1(y - 10 * s)}" r="${f1(6.5 * s)}" fill="${FOREST}" stroke="${FOREST_DARK}" stroke-width="1"/>`;
const rrect = (c, fill = CORE, stroke = CORE_EDGE) => `<rect x="${f1(-c.w / 2)}" y="${f1(-c.h / 2)}" width="${f1(c.w)}" height="${f1(c.h)}" rx="${f1(c.corner)}" transform="translate(${f1(c.x)} ${f1(c.y)})" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>`;
const polyPath = L => L.map(p => `M${p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`).join('');
let clipN = 0;
const clipOf = (poly, inner) => { const id = `gr-clip-${++clipN}`; return `<defs><clipPath id="${id}"><polygon points="${pts(poly)}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };
// 그루스(굵은 모래) 무늬
const dots = (poly, color = SAPRO_DOT) => { const id = `gr-dots-${++clipN}`; return `<defs><pattern id="${id}" width="9" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="${color}"/><circle cx="6.5" cy="6" r="0.9" fill="${color}"/></pattern></defs><polygon points="${pts(poly)}" fill="url(#${id})"/>`; };

// ---------- 그림 1: 단면 ----------
function section(stage) {
  const { W, H } = SEC;
  const g = x => groundAt(x, stage);
  const ground = line(g, 0, W, 2), front = line(frontY, 0, W, 2);
  const sky = stage === EXPOSED ? COLD_SKY : stage === DEEP ? WARM_SKY : SKY;
  let s = `<rect width="${W}" height="${H}" fill="${sky}"/>`;
  const joints = polyPath(jointLines());
  const below = [...front, [W, H], [0, H]];
  let inner = `<rect width="${W}" height="${H}" fill="${GRANITE}"/>`;
  if (stage === JOINTED) inner += `<path d="${joints}" stroke="${JOINT_C}" stroke-width="1.8" fill="none"/>`;
  else {
    inner += clipOf(below, `<path d="${joints}" stroke="${JOINT_C}" stroke-width="1.6" fill="none"/>`);
    const sap = [...line(x => ground0(x) - 20, 0, W, 4), ...front.slice().reverse()];
    if (stage === DEEP) {
      inner += `<polygon data-sapro="1" points="${pts(sap)}" fill="${SAPRO}"/>${dots(sap)}`;
      inner += clipOf(sap, `<path d="${joints}" stroke="${SAPRO_DOT}" stroke-width="1" stroke-dasharray="3 4" fill="none" opacity="0.8"/>`);
      inner += corestones().map(c => rrect(c)).join('');
      inner += `<polyline data-front="1" points="${pts(front)}" fill="none" stroke="#5a4630" stroke-width="2.2"/>`;
    } else {
      // 낮은 곳에 얇게 남은 풍화층
      const thin = [...ground, ...front.slice().reverse()];
      inner += `<polygon points="${pts(thin)}" fill="${SAPRO}"/>${dots(thin)}`;
      // 돔 겉의 판상 절리
      let sh = '';
      for (const d of SHEET_D) { const p = line(x => frontY(x) + d, 452, 718, 3).filter(([x]) => domeDepth(x) + d < 170); if (p.length > 1) sh += `<polyline points="${pts(p)}"/>`; }
      inner += `<g data-sheet="1" fill="none" stroke="${JOINT_C}" stroke-width="1.5">${sh}</g>`;
    }
  }
  s += clipOf([...ground, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(ground)}" fill="none" stroke="${stage === EXPOSED ? '#cfd8d6' : '#6b6359'}" stroke-width="2.6" stroke-linejoin="round"/>`;
  let top = '', n = '';
  if (stage === JOINTED) {
    n += say('joint', '절리가 생긴 화강암', 360, 30, NAME, 18);
    n += plain('위를 덮던 땅이 깎여 화강암이 땅 표면 가까이 올라옴', 360, 52);
    n += plain('절리가 촘촘함', 115, 80, LIGHT, 14) + plain('절리 간격이 알맞음', 340, 80, LIGHT, 14) + plain('절리가 거의 없는 큰 덩어리', 585, 80, LIGHT, 14);
    n += say('joint', '절리', 312, 152, NAME, 17) + lead(300, 156, 285, 168, NAME);
    n += say('bedrock', '화강암(기반암)', 585, 250, LIGHT, 17);
  } else if (stage === DEEP) {
    n += say('deep', '땅속 깊은 풍화', 360, 30, NAME, 18);
    n += plain('따뜻하고 습했던 시기(책의 추정)', 360, 52);
    // 절리를 따라 스며드는 빗물
    for (const x of [46, 138, 285, 395]) top += arrow(x, ground0(x) - 14, x, ground0(x) + 30, WATER_LIGHT, 2.4, 6);
    n += plain('빗물이 절리를 따라 스며듦', 92, 76, WATER_LIGHT, 13);
    n += plain('절리가 촘촘해 깊이 썩음', 115, 160, DARK_TEXT, 13, 'middle', true);
    n += say('saprolite', '새프롤라이트(그루스)', 115, 196, DARK_TEXT, 15, 'middle', true);
    n += say('corestone', '핵석', 258, 74, NAME, 17) + lead(258, 79, 258, ground0(258) + 16, NAME);
    n += plain('위쪽 핵석은 작고 둥글고, 아래쪽은 크고 각짐', 340, 322, LIGHT, 13);
    n += say('front', '풍화 전선', 650, 212, NAME, 16) + lead(650, 198, 650, frontY(650) + 2, NAME);
    n += plain('절리가 거의 없어 조금만 썩음', 585, 300, LIGHT, 13);
    n += say('bedrock', '기반암', 115, 350, LIGHT, 16);
  } else {
    // 처음 땅 표면(점선)
    top += `<polyline points="${pts(line(ground0, 0, W, 4))}" fill="none" stroke="${LIGHT}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.7"/>`;
    for (const stack of torStacks()) top += `<g data-tor="1">${stack.map(c => rrect(c)).join('')}</g>`;
    top += looseStones().map(c => rrect(c, '#bdb7ab')).join('');
    let d = '';
    for (let x = 14; x < W; x += 38) d += ice(x + 9 * hash(x, 1), g(x) - 8 - 6 * hash(x, 2), 4.2);
    top += `<path data-ice="1" d="${d}" stroke="${ICE}" stroke-width="1.7" stroke-linecap="round"/>`;
    top += arrowOn(g, 650, 704, -8, ACCENT) + arrowOn(g, 520, 474, -8, ACCENT) + arrowOn(g, 248, 212, -8, ACCENT);
    n += say('strip', '풍화층이 벗겨짐', 360, 30, NAME, 18);
    n += plain('추운 시기(책의 추정)', 360, 52);
    n += plain('처음 땅 표면(점선)', 115, 80, LIGHT, 13);
    const torTop = Math.min(...torStacks().flat().map(c => c.y - c.h / 2));
    n += say('tor', '토르', 340, torTop - 12, NAME, 19) + plain('핵석이 기반암 위에 쌓임', 282, 150, LIGHT, 13, 'end');
    n += say('dome', '돔(보른하르트)', DOME.cx, frontY(DOME.cx) - 16, NAME, 18);
    n += say('sheeting', '판상 절리', DOME.cx, 214, LIGHT, 14);
    n += say('etch', '드러난 기반암 면', 115, 236, LIGHT, 15) + lead(115, 242, 115, g(115) - 3);
    n += say('strip', '흙이 비탈 아래로 흘러내림', 150, 196, ACCENT, 14) + lead(206, 202, 226, g(226) - 12, ACCENT);
  }
  return `<svg class="gr-sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="화강암 지대를 세로로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">${textStyle('gr-sec')}${s}${top}${n}
    <text x="10" y="${H - 10}" font-size="12" font-weight="700" fill="${DIM}">높이와 바위 크기를 크게 과장한 예시입니다.</text></svg>`;
}

// ---------- 그림 1의 덧붙임: 토르의 두 가지 생김새 ----------
function torKind(kind) {
  const W = 360, H = 230, gy = x => 182 + 3 * Math.sin(x / 23);
  let s = `<rect width="${W}" height="${H}" fill="${kind === 'savanna' ? WARM_SKY : COLD_SKY}"/>`;
  const ground = line(gy, 0, W, 4);
  let inner = `<rect width="${W}" height="${H}" fill="${GRANITE}"/><path d="M0 206H${W}M120 182V${H}M250 184V${H}" stroke="${JOINT_C}" stroke-width="1.4"/>`;
  s += clipOf([...ground, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(ground)}" fill="none" stroke="#6b6359" stroke-width="2"/>`;
  let n = '';
  if (kind === 'savanna') {
    // 둥근 핵석이 쌓인 무더기와 발치의 그루스
    const st = [{ x: 172, y: 160, w: 104, h: 44, corner: 22 }, { x: 186, y: 121, w: 78, h: 34, corner: 17 }, { x: 170, y: 91, w: 54, h: 26, corner: 13 }, { x: 246, y: 166, w: 40, h: 32, corner: 16 }];
    const sand = [[90, gy(90)], [130, 174], [222, 175], [280, gy(280)], [280, gy(280) + 4], [90, gy(90) + 4]];
    s += `<polygon points="${pts(sand)}" fill="${SAPRO}"/>`;
    s += st.map(c => rrect(c)).join('');
    n += say('savanna', '둥근 토르', 180, 28, NAME, 18);
    n += plain('땅속에서 둥글어진 핵석이 드러남', 180, 50);
    n += plain('발치의 그루스', 314, 160, DIM, 12);
    n += plain('사바나형, 예: 팔공산 갓바위', 180, H - 9, DARK_TEXT, 13, 'middle', true);
  } else {
    // 각진 블록 무더기, 틈 속 얼음, 발치에 떨어진 각진 돌
    const st = [{ x: 176, y: 158, w: 100, h: 48, corner: 2 }, { x: 160, y: 116, w: 62, h: 36, corner: 2 }, { x: 214, y: 118, w: 34, h: 40, corner: 2 }, { x: 170, y: 82, w: 48, h: 32, corner: 2 }];
    s += st.map(c => rrect(c, '#bdb7ab')).join('');
    let d = '';
    for (const [x, y] of [[196, 116], [176, 99], [160, 136], [206, 136]]) d += ice(x, y, 4);
    s += `<path d="${d}" stroke="${ICE}" stroke-width="1.8" stroke-linecap="round"/>`;
    for (const [x, w, h, a] of [[96, 20, 12, -12], [118, 14, 10, 18], [252, 22, 14, 10], [276, 16, 10, -20], [298, 12, 8, 6]]) s += `<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${w}" height="${h}" transform="translate(${x} ${f1(gy(x) - h / 2 + 1)}) rotate(${a})" fill="#a9a397" stroke="${CORE_EDGE}" stroke-width="1.2"/>`;
    n += say('periglacial', '각진 토르', 180, 28, NAME, 18);
    n += plain('땅 위에서 얼음이 절리를 벌려 쪼갬', 180, 50);
    n += plain('얼었다 녹기', 290, 94, ICE, 12);
    n += plain('주빙하형, 예: 비슬산 대견사지', 180, H - 9, DARK_TEXT, 13, 'middle', true);
  }
  return `<svg class="gr-tor2" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind === 'savanna' ? '둥근 바위로 된 토르' : '각진 바위로 된 토르'}">${textStyle('gr-tor2')}${s}${n}</svg>`;
}

// ---------- 그림 2: 바위 겉의 작은 지형 ----------
function rockFace() {
  const { W, H } = ROCK;
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  const gnd = [[0, 296], [W, 292], [W, H], [0, H]];
  s += `<polygon points="${pts(gnd)}" fill="${SAPRO}"/>${dots(gnd)}`;
  s += `<polygon points="${pts(ROCK_LEFT)}" fill="${GRANITE_SIDE}"/><polygon points="${pts(ROCK_FRONT)}" fill="${GRANITE}"/><polygon points="${pts(ROCK_TOP)}" fill="${GRANITE_TOP}"/>`;
  // 바위의 절리 몇 개
  s += `<path d="M216 190Q400 176 596 170M470 132L476 300" stroke="${JOINT_C}" stroke-width="1.3" fill="none" opacity="0.7"/>`;
  // 그루브: 가파른 벽의 세로 홈
  let gr = '';
  for (const { top, bot } of GROOVES) {
    const mx = (top[0] + bot[0]) / 2 + 4, my = (top[1] + bot[1]) / 2;
    gr += `<path d="M${f1(top[0])} ${f1(top[1] + 3)}Q${f1(mx)} ${f1(my)} ${f1(bot[0])} ${f1(bot[1] - 6)}" stroke="#4f493f" stroke-width="7" stroke-linecap="round" fill="none"/>`;
    gr += `<path d="M${f1(top[0] + 3)} ${f1(top[1] + 4)}Q${f1(mx + 3)} ${f1(my)} ${f1(bot[0] + 3)} ${f1(bot[1] - 6)}" stroke="#b8b1a4" stroke-width="1.4" fill="none"/>`;
  }
  s += `<g data-groove="1">${gr}</g>`;
  // 나마: 윗면의 오목한 웅덩이
  let nm = '';
  for (const p of NAMA) {
    nm += `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="#6e675c"/><ellipse cx="${p.x}" cy="${f1(p.y + p.ry * 0.25)}" rx="${f1(p.rx * 0.82)}" ry="${f1(p.ry * 0.62)}" fill="${p.water ? WATER : '#4c463d'}"/>`;
  }
  s += `<g data-nama="1">${nm}</g>`;
  // 타포니: 수직 벽의 구멍 무리
  let tf = '';
  for (const [x, y, r] of TAFONI) {
    tf += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${f1(r * 0.82)}" fill="#4b453d"/><ellipse cx="${x}" cy="${f1(y + r * 0.18)}" rx="${f1(r * 0.72)}" ry="${f1(r * 0.55)}" fill="#2c2722"/>`;
    tf += `<path d="M${f1(x - r)} ${y}A${r} ${f1(r * 0.82)} 0 0 1 ${f1(x + r)} ${y}" stroke="#c3bcaf" stroke-width="1.5" fill="none"/>`;
  }
  s += `<g data-tafoni="1">${tf}</g>`;
  s += `<polygon points="${pts([...ROCK_LEFT.slice(0, 1), ...ROCK_TOP.slice(1, 3), ROCK_FRONT[2], ROCK_FRONT[3], ROCK_LEFT[3]])}" fill="none" stroke="#2a2622" stroke-width="2"/>`;
  let n = '';
  n += say('gnamma', '나마', 300, 40, NAME, 19) + plain('수평에 가까운 윗면에 오목하게 파임', 300, 62) + lead(300, 70, 300, 120, NAME);
  n += say('tafoni', '타포니', 646, 200, NAME, 19) + plain('수직에 가까운 벽에', 646, 222) + plain('옆으로 파인 구멍들', 646, 240) + lead(612, 250, 512, 258, NAME);
  n += say('groove', '그루브', 50, 140, NAME, 19) + plain('가파른 벽의', 50, 162) + plain('세로 홈', 50, 180) + lead(64, 190, 136, 226, NAME);
  n += plain('크기와 개수를 과장한 예시입니다.', W - 10, H - 10, DARK_TEXT, 12, 'end', true);
  return `<svg class="gr-rock" viewBox="0 0 ${W} ${H}" role="img" aria-label="화강암 바위를 비스듬히 본 그림. 윗면에 나마, 수직 벽에 타포니, 가파른 벽에 그루브가 있다.">${textStyle('gr-rock')}${s}${n}</svg>`;
}

function domeSheets() {
  const { W, H, base, cover, cx } = DOMEFIG;
  const surf = line(x => domeFig(x, 0), 0, W, 3);
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  // 예전에 위를 덮던 바위(깎여 없어짐)
  s += `<polygon points="${pts([[0, cover], [W, cover], ...surf.slice().reverse()])}" fill="#6b5d4c" opacity="0.28"/>`;
  s += `<path d="M0 ${cover}H${W}" stroke="${DIM}" stroke-width="1.5" stroke-dasharray="7 6"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${GRANITE}"/>`;
  let sh = '';
  for (const d of DOME_SHEETS) sh += `<polyline points="${pts(line(x => domeFig(x, d), 0, W, 3).filter(([, y]) => y < base - 2))}"/>`;
  inner += `<g data-sheet="1" fill="none" stroke="${JOINT_C}" stroke-width="1.6">${sh}</g>`;
  // 박리: 오른쪽 비탈의 겉껍질이 틈을 따라 들떠 벗겨진다.
  const a = 478, b = 574;
  const outer = line(x => domeFig(x, 0), a, b, 3), innerL = line(x => domeFig(x, DOME_SHEETS[0]), a, b, 3);
  inner += `<polygon points="${pts([...innerL.map(([x, y]) => [x, y - 1]), ...innerL.slice().reverse().map(([x, y]) => [x + 2, y + 3])])}" fill="#1c1916"/>`;
  s += clipOf([...surf, [W, H], [0, H]], inner);
  s += `<polygon data-exfol="1" points="${pts([...outer, ...innerL.slice().reverse()].map(([x, y]) => [x + 5, y - 4]))}" fill="${GRANITE_TOP}" stroke="${JOINT_C}" stroke-width="1.3"/>`;
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#2a2622" stroke-width="2"/>`;
  for (const [x, w, h, r] of [[606, 18, 4, 14], [628, 14, 4, -8], [652, 20, 5, 4], [618, 10, 3, 30]]) s += `<rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${w}" height="${h}" transform="translate(${x} ${base - 3}) rotate(${r})" fill="${GRANITE_TOP}" stroke="${CORE_EDGE}" stroke-width="1"/>`;
  // 누르던 무게가 사라져 바깥으로 부풂
  for (const x of [250, cx, 470]) { const dx = (x - cx) * 0.14; s += arrow(x, domeFig(x, 46), x + dx, domeFig(x + dx, 0) - 16, ACCENT, 2.4, 6); }
  let n = '';
  n += plain('예전에 위를 덮던 바위(깎여 없어짐)', cx, cover - 12, DIM, 13);
  n += plain('누르던 무게가 사라져 바깥으로 부풂', 136, 96, ACCENT, 13);
  n += say('sheeting', '판상 절리', 236, 214, LIGHT, 17) + lead(236, 220, 278, domeFig(278, 22), LIGHT);
  n += say('exfoliation', '박리', 650, 180, NAME, 19) + plain('겉이 얇게 벗겨져 떨어짐', 650, 202) + lead(624, 186, 548, domeFig(548, 0) - 4, NAME);
  n += plain('겉에 가까울수록 틈이 촘촘함', cx, 268, DARK_TEXT, 12, 'middle', true);
  n += plain('크기와 틈 간격을 과장한 예시입니다.', W - 10, H - 8, DARK_TEXT, 12, 'end', true);
  return `<svg class="gr-dome" viewBox="0 0 ${W} ${H}" role="img" aria-label="화강암 돔을 세로로 자른 단면. 겉면과 나란한 판상 절리가 겹겹이 있고, 오른쪽 겉껍질이 벗겨지고 있다.">${textStyle('gr-dome')}${s}${n}</svg>`;
}

// ---------- 그림 3: 돌산과 흙산 ----------
function mountain(kind) {
  const { W, H } = MT, f = kind === 'dol' ? dolY : heukY;
  const surf = line(f, 0, W, 2);
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  let inner = '';
  if (kind === 'dol') {
    inner += `<rect width="${W}" height="${H}" fill="${GRANITE}"/>`;
    inner += `<path d="M60 170Q160 120 300 176M150 60V${H}M232 100V${H}M90 120V${H}" stroke="${JOINT_C}" stroke-width="1.3" fill="none" opacity="0.7"/>`;
    // 완만한 곳에만 얇은 흙
    let soil = '';
    for (let x = 0; x < W; x += 2) { const sl = Math.abs(f(x + 1) - f(x - 1)) / 2; if (sl < 0.5) soil += `<rect x="${x}" y="${f1(f(x))}" width="2.2" height="${SOIL_THICK.dol}"/>`; }
    inner += `<g data-soil="dol" fill="${SOIL}">${soil}</g>`;
  } else {
    inner += `<rect width="${W}" height="${H}" fill="${META}"/>`;
    for (let k = 0; k < 14; k++) inner += `<path d="M-20 ${70 + k * 14}Q90 ${58 + k * 14} 180 ${76 + k * 14}T380 ${66 + k * 14}" stroke="${META_LINE}" stroke-width="1.3" fill="none"/>`;
    const soil = [...surf, ...line(x => f(x) + SOIL_THICK.heuk, 0, W, 2).reverse()];
    inner += `<polygon data-soil="heuk" points="${pts(soil)}" fill="${SOIL}"/>${dots(soil, SOIL_DOT)}`;
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(surf)}" fill="none" stroke="${kind === 'dol' ? '#d9d3c6' : '#3e2d1c'}" stroke-width="${kind === 'dol' ? 3 : 2}" stroke-linejoin="round"/>`;
  let t = '';
  if (kind === 'dol') { for (const x of [16, 40, 222, 232, 300, 330, 346]) t += tree(x, f(x) + 1, 0.8); }
  else for (let x = 8; x < W; x += 13) t += tree(x, f(x) + 2, 0.85);
  s += t;
  let n = '';
  if (kind === 'dol') {
    n += say('dolsan', '돌산(석산)', 10, 28, NAME, 18, 'start') + plain('겉에 바위가 드러남', 10, 48, DIM, 13, 'start');
    n += plain(`예: ${MT_ROCKS.dol}`, W / 2, H - 10, DARK_TEXT, 13, 'middle', true);
  } else {
    n += say('heuksan', '흙산(토산)', 10, 28, NAME, 18, 'start') + plain('겉이 두꺼운 흙으로 덮임', 10, 48, DIM, 13, 'start');
    n += plain(`예: ${MT_ROCKS.heuk}`, W / 2, H - 10, DARK_TEXT, 13, 'middle', true);
  }
  return `<svg class="gr-mt" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind === 'dol' ? '겉에 바위가 드러난 돌산' : '겉이 흙으로 덮인 흙산'}을 세로로 자른 단면">${textStyle('gr-mt')}${s}${n}</svg>`;
}

// ---------- 그림 4: 화강암 침식 분지 ----------
function basinPanel(stage) {
  const { W, H, gx } = BASIN;
  const sf = x => basinSurface(x, stage);
  const surf = line(sf, 0, W, 2);
  const frontL = line(x => basin0(x) + basinFront(x), 0, W, 2);
  let s = `<rect width="${W}" height="${H}" fill="${stage === 0 ? WARM_SKY : SKY}"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${META}"/>`;
  for (let k = 0; k < 12; k++) inner += `<path d="M-10 ${60 + k * 16}L${W + 10} ${40 + k * 16}" stroke="${META_LINE}" stroke-width="1.2"/>`;
  // 화강암 덩어리: 아래로 갈수록 조금 넓어진다.
  const gL = y => gx[0] - (y - 74) * 0.12, gR = y => gx[1] + (y - 74) * 0.12;
  const gpoly = [[gL(40), 40], [gR(40), 40], [gR(H), H], [gL(H), H]];
  inner += `<polygon data-granite="1" points="${pts(gpoly)}" fill="${GRANITE}"/>`;
  inner += clipOf(gpoly, Array.from({ length: 12 }, (_, i) => `<path d="M${60 + i * 22} 40V${H}" stroke="${JOINT_C}" stroke-width="1" opacity="0.6"/>`).join('') + Array.from({ length: 9 }, (_, i) => `<path d="M60 ${90 + i * 18}H310" stroke="${JOINT_C}" stroke-width="1" opacity="0.6"/>`).join(''));
  if (stage < 2) {
    const sap = [...surf, ...frontL.slice().reverse()];
    inner += `<polygon data-sapro="1" points="${pts(sap)}" fill="${SAPRO}"/>${dots(sap)}`;
  } else {
    // 분지 바닥의 얇은 퇴적층
    inner += `<polygon points="${pts([...line(sf, 120, 176, 2), ...line(x => sf(x) + 5, 120, 176, 2).reverse()])}" fill="${GRAVEL}"/>`;
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#2a2622" stroke-width="2"/>`;
  let n = '';
  if (stage === 0) {
    n += plain('따뜻하고 습한 시기', W / 2, 24, DIM, 13);
    n += say('saprolite', '두꺼운 새프롤라이트', W / 2, 118, DARK_TEXT, 13, 'middle', true);
    n += say('granite', '화강암', W / 2, 200, LIGHT, 15);
    n += say('meta', '변성암', 40, 190, LIGHT, 14) + say('meta', '변성암', 322, 190, LIGHT, 14);
  } else if (stage === 1) {
    s += arrowOn(sf, 84, 118, -7, ACCENT) + arrowOn(sf, 286, 252, -7, ACCENT);
    s += `<ellipse cx="150" cy="${f1(sf(150) - 1)}" rx="14" ry="3" fill="${WATER}"/>`;
    n += say('creep', '토양 포행과 우세', W / 2, 24, NAME, 15);
    n += say('granite', '화강암', W / 2, 205, LIGHT, 15);
    n += say('meta', '변성암', 40, 190, LIGHT, 14);
  } else {
    s += `<ellipse cx="150" cy="${f1(sf(150) - 1)}" rx="15" ry="3" fill="${WATER}"/>`;
    for (const x of [232, 242, 252]) s += `<rect x="${x - 3}" y="${f1(sf(x) - 7)}" width="7" height="7" fill="${DIM}" stroke="#2a2622" stroke-width="0.8"/>`;
    let t = '';
    for (const x of [10, 26, 42, 58, 306, 322, 338, 352]) t += tree(x, sf(x) + 1, 0.7);
    s += t;
    const hx = (BASIN.hill[0] + BASIN.hill[1]) / 2;
    n += say('basin', '침식 분지', 140, sf(140) - 18, NAME, 15);
    n += say('residual', '봉의산', hx, sf(hx) - 12, NAME, 14);
    n += say('meta', '변성암 산지', 52, 30, LIGHT, 14) + say('meta', '변성암 산지', 308, 30, LIGHT, 14);
    n += say('granite', '화강암', W / 2, 205, LIGHT, 15);
  }
  return `<svg class="gr-basin" data-stage="${stage}" viewBox="0 0 ${W} ${H}" role="img" aria-label="화강암 침식 분지를 가로로 자른 단면. ${BASIN_NAMES[stage]} 단계이다.">${textStyle('gr-basin')}${s}${n}</svg>`;
}

const sw = inner => `<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${inner}</svg>`;
const LEGEND = [
  [`<rect width="22" height="14" fill="${GRANITE}"/><path d="M8 0V14M0 7H22" stroke="${JOINT_C}" stroke-width="1"/>`, '화강암과 절리'],
  [`<rect width="22" height="14" fill="${SAPRO}"/><circle cx="5" cy="5" r="1" fill="${SAPRO_DOT}"/><circle cx="14" cy="9" r="1" fill="${SAPRO_DOT}"/>`, '새프롤라이트(그루스)'],
  [`<rect x="2" y="1" width="18" height="12" rx="5" fill="${CORE}" stroke="${CORE_EDGE}"/>`, '핵석'],
  [`<rect width="22" height="14" fill="${META}"/><path d="M0 10L22 4" stroke="${META_LINE}" stroke-width="1.2"/>`, '변성암(편마암, 편암)'],
  [`<rect width="22" height="14" fill="${SOIL}"/>`, '흙(토양층)'],
  [`<rect width="22" height="14" fill="${WATER}"/>`, '물'],
];

export const exampleList = () => `<ul class="gr-ex">${EXAMPLES.map(e => `<li><b>${e.name}</b> ${e.what}</li>`).join('')}</ul>
  <p class="gr-ex-sep"><b>화강암이 아닌 예</b></p>
  <ul class="gr-ex"><li><b>${CONGLOMERATE.name}</b> ${CONGLOMERATE.what}</li></ul>`;

// options.steps: 단면 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? EXPOSED, zone = null, zoneAt = 'sec';
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    clipN = 0;
    const buttons = options.steps !== false ? `<div class="row" aria-label="단면 단계">${STAGE_NAMES.map((t, i) => `<button data-schem-stage="${i}" class="${i === stage ? 'on' : ''}">${i + 1}. ${t}</button>`).join('')}</div>` : '';
    const note = (where, fallback) => `<p class="schem-note">${zone && zoneAt === where ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : fallback}</p>`;
    root.innerHTML = `
      <h2>토르와 돔이 생기는 두 단계 (모식도)</h2>
      ${buttons}
      <figure>${section(stage)}</figure>
      ${note('sec', NOTES[stage])}
      <h2>토르의 두 가지 생김새 (모식도)</h2>
      <div class="schem-duo"><figure>${torKind('savanna')}<figcaption>둥근 토르: 땅속 풍화</figcaption></figure><figure>${torKind('periglacial')}<figcaption>각진 토르: 땅 위 풍화</figcaption></figure></div>
      ${note('tor2', TOR2_NOTE)}
      <h2>바위 겉의 작은 지형 (모식도)</h2>
      <figure>${rockFace()}<figcaption>나마, 타포니, 그루브</figcaption></figure>
      <figure>${domeSheets()}<figcaption>돔 겉의 판상 절리와 박리</figcaption></figure>
      ${note('micro', MICRO_NOTE)}
      <h2>돌산과 흙산 (모식도)</h2>
      <div class="schem-duo"><figure>${mountain('dol')}<figcaption>돌산: 겉에 바위가 드러남</figcaption></figure><figure>${mountain('heuk')}<figcaption>흙산: 겉이 흙으로 덮임</figcaption></figure></div>
      ${note('mount', MOUNT_NOTE)}
      <h2>화강암 침식 분지: 춘천 분지 (모식도)</h2>
      <div class="schem-trio">${BASIN_NAMES.map((t, i) => `<figure>${basinPanel(i)}<figcaption>${i + 1}. ${t}</figcaption></figure>`).join('')}</div>
      ${note('basin', BASIN_NOTE)}
      <h2>우리나라 사례</h2>
      ${exampleList()}
      <div class="schem-legend">${LEGEND.map(([q, t]) => `<span>${sw(q)}${t}</span>`).join('')}</div>
      <p class="schem-cap">${CAPTION}</p>`;
  };
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    const svg = z.closest('svg');
    const where = svg.classList.contains('gr-sec') ? 'sec' : svg.classList.contains('gr-tor2') ? 'tor2' : svg.classList.contains('gr-mt') ? 'mount' : svg.classList.contains('gr-basin') ? 'basin' : 'micro';
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
