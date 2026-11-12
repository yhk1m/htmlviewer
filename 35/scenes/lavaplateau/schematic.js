// © 2026 김용현
// 용암대지와 한탄강 협곡 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 1. 열하 분출과 중심 분출 2. 용암대지가 생기고 협곡이 깎이는 단면(네 단계)
// 3. 지류의 호수와 폭포(종단면 네 칸) 4. 주상절리가 생기는 원리 5. 철원과 제주의 논 6. 우리나라 사례
// 근거(인쇄 쪽): 분출 방식 509, 베개 용암 502, 주상절리 504, 용암대지와 스텝토 521, 백두 528, 철원-평강 528에서 534, 신계-곡산 533에서 534, 철원과 제주 537.
// y는 화면(그림 픽셀) 좌표로, 아래로 갈수록 크다. 그림만 그리는 코드라 계산 제한은 없다.

export const ZONE_TEXT = {
  fissure: { name: '열하 분출', text: '화구 한 곳이 아니라 땅에 길게 벌어진 틈(열하)을 따라 용암이 나오는 분출입니다. 틈새 분출이라고도 합니다. 주로 아주 묽은 현무암질 용암이 조용히 넘쳐흘러, 많이 나오면 낮은 골짜기를 따라 넓게 퍼져 용암대지가 됩니다. 철원-평강 용암대지는 주로 추가령 구조곡 방향의 틈에서 나온 용암으로 생겼습니다.' },
  central: { name: '중심 분출', text: '땅속에서 한 줄기 통로(화도)를 따라 올라온 마그마가 화구 한 곳에서 용암과 화산 쇄설물을 내뿜는 분출입니다. 분출물이 화구 둘레에 쌓이므로 분석구, 순상화산, 성층화산 같은 화산체가 솟습니다.' },
  cinder: { name: '분석구(오리산)', text: '화구에서 터져 나온 구멍 많은 돌 조각(스코리아)이 화구 둘레에 쌓인 작은 화산입니다. 철원-평강 용암대지를 만든 분출은 끝 무렵에 한 곳에서 나오는 분출로 바뀌어, 북한 평강의 오리산(453m) 같은 분석구와 검불랑 북쪽의 성산이 생겼습니다.' },
  valley: { name: '옛 골짜기(추가령 구조곡)', text: '서울과 원산 사이에 길이 약 160km로 곧게 뻗은 골짜기입니다. 오랫동안 단층과 습곡, 마그마의 관입, 화산 활동과 깎임이 겹쳐 생겼습니다. 철원-평강 용암대지의 용암은 이 골짜기를 따라 흘렀고, 남쪽으로 흐른 용암은 한탄강과 임진강 골짜기를 따라 파주까지 갔습니다. 화산 활동을 강조해 추가령 열곡이라고도 합니다.' },
  hills: { name: '화강암, 편마암 산지', text: '용암이 오기 전부터 있던 옛 땅입니다. 철원 용암대지 둘레의 산지는 화강암과 편마암 같은 바위로 되어 있습니다. 용암은 낮은 곳을 따라 흘러 높은 산지는 묻지 못했기 때문에, 산지는 대지 둘레에 그대로 솟아 있습니다. 이 산지에서 시작한 하천이 대지로 흘러들어 철원의 논에 물을 댑니다.' },
  baegui: { name: '백의리층(옛 하천 자갈층)', text: '용암에 덮이기 전 이곳을 흐르던 옛 하천이 쌓은 자갈과 모래층입니다. 연천 전곡읍 은대리처럼 협곡 아래쪽 현무암층 바로 밑에 드러나 있습니다. 이 층의 높이가 지금 강바닥과 거의 같아서, 강이 협곡을 깎아 용암대지가 생기기 전 높이를 거의 되찾았다고 봅니다.' },
  lava: { name: '현무암 용암층', text: '아주 묽은 현무암질 용암이 낮은 곳부터 채우며 흘러 식은 층입니다. 한 번 흐를 때마다 거의 평평한 층이 하나 생겨, 여러 번 흐르면 층이 겹겹이 쌓입니다. 철원-평강 용암대지는 용암이 10번 안팎 흘러 생겼다고 보며, 현무암층은 철원 일대에 많게는 11장이고, 용암대지 전체에서 가장 두꺼운 곳은 200m 정도입니다. 하류로 갈수록 층이 줄어 전곡에서는 4장, 파주에서는 1장입니다.' },
  plateau: { name: '용암대지', text: '묽은 현무암질 용암이 많이 나와 낮은 골짜기를 따라 흐르며 골짜기를 메우고, 양이 아주 많으면 낮은 능선(분수계)까지 넘어 원래의 높낮이를 덮어 생긴 평평하고 넓은 땅입니다. 그 가운데 특히 넓고 평탄한 곳은 용암평원이라고 합니다. 철원-평강 용암대지는 넓이가 약 826km²이고, 신생대 제4기 플라이스토세 중반에 주로 분출했다고 봅니다.' },
  steptoe: { name: '스텝토', text: '용암은 낮은 곳을 따라 흐르므로, 높은 언덕이나 봉우리는 묻히지 않고 남습니다. 이렇게 용암대지 위에 섬처럼 솟아 있는 옛 바위 언덕을 스텝토라고 합니다. 연천 전곡읍 신답리의 좌상바위가 예이고, 백두 용암대지의 남포태산도 묻히지 않은 화강암 봉우리로 스텝토의 하나입니다.' },
  pillow: { name: '베개 용암', text: '묽은 용암이 물속으로 흘러들어 급히 식으면, 겉이 바로 굳으며 둥글고 길쭉한 베개 모양 덩어리가 겹겹이 쌓입니다. 포천 아우라지 베개 용암은 한탄강과 영평천이 만나는 곳의 용암대지 아래쪽 절벽에 있으며, 용암이 옛 영평천 물속으로 흘러들며 생긴 것으로 추정합니다.' },
  topsed: { name: '대지 위 퇴적층', text: '용암대지가 생긴 직후 한탄강과 지류가 대지 위를 넓게 흐르고, 용암에 막혀 생긴 호수의 물도 넘쳐 흐르며 흙과 모래를 쌓았습니다. 이 비교적 기름진 퇴적층이 철원 평야의 논농사에 도움이 되었습니다.' },
  river: { name: '대지 위의 한탄강', text: '용암이 골짜기를 메운 직후 한탄강은 평평한 대지 위를 넓게 퍼져 흘렀습니다. 그런데 대지가 골짜기를 높여 놓아 하류 쪽 낮은 곳과 높이 차가 커졌으므로, 강은 곧 아래로 깎아 내려가기 시작했습니다.' },
  canyon: { name: '한탄강 협곡', text: '용암대지가 생긴 뒤 한탄강이 하류부터 아래로 깎고(하방 침식) 상류 쪽으로 파고들어(두부 침식) 생긴 좁고 깊은 골짜기입니다. 강은 깎기 쉬운 곳, 곧 옛 하천 퇴적층 부근이나 용암과 옛 땅이 만나는 경계를 따라 파고들었습니다. 그래서 양쪽에 현무암 절벽이 섭니다. 철원 동송읍 장흥리의 한탄강, 연천 전곡읍 은대리의 차탄천이 그런 곳입니다.' },
  column: { name: '주상절리', text: '두꺼운 용암이 식으며 부피가 줄 때 생긴 틈이 바위를 다각형 기둥으로 나눈 것입니다. 기둥은 식는 면에 수직으로 자라 대개 위아래로 길지만, 경주 양남처럼 누운 것도 있습니다. 주로 현무암에 생기지만 안산암, 조면암, 응회암에도 생깁니다. 한탄강 협곡, 제주 대포 해안, 포항 달전리, 경주 양남, 울릉도 국수바위(조면암), 무등산 입석대(응회암)에서 볼 수 있습니다.' },
  paddy: { name: '철원의 논', text: '철원 용암대지 위는 넓은 논입니다. 철원은 농경지의 약 80%가 논인데, 둘레 산지에서 흘러드는 하천 덕분에 물이 넉넉하고 대지 위에 기름진 퇴적층이 있기 때문입니다. 사람들은 객토를 하고 저수지와 양수장을 지어 논농사를 더 쉽게 만들었습니다.' },
  lake: { name: '용암댐에 막힌 호수', text: '용암이 본류 골짜기를 메우면 본류로 들어오던 지류의 어귀도 용암에 막힙니다. 이를 용암댐이라고 하며, 그 위쪽 지류 골짜기에는 물이 고여 큰 호수가 생겼을 것으로 추정합니다. 한탄강에 들어오는 영평천과 차탄천의 아래쪽이 이렇게 막혔다고 봅니다. 호수에는 고운 퇴적층이 쌓였습니다.' },
  falls: { name: '지류 폭포(재인폭포)', text: '물이 많은 본류는 협곡을 빨리 깎아 내려갔지만, 물이 적은 지류는 깎는 힘이 약해 대지 높이에 남았습니다. 그래서 지류가 본류 협곡과 만나는 곳에서 절벽 아래로 떨어지는 폭포가 생깁니다. 폭포는 시간이 지나며 두부 침식으로 조금씩 상류로 물러납니다. 연천 재인폭포는 한탄강 본류에서 약 350m, 포천 비둘기낭폭포는 약 150m 상류에 있습니다.' },
  pool: { name: '폭호', text: '폭포에서 떨어지는 물이 바닥을 세게 파서 생긴 깊은 웅덩이입니다. 폭포 아래가 깎이면 위의 절벽이 받침을 잃고 조금씩 무너져, 폭포가 상류 쪽으로 물러납니다. 재인폭포 아래에도 폭호가 있습니다.' },
  mainriver: { name: '본류(한탄강)', text: '물이 많아 깎는 힘이 센 큰 강입니다. 용암대지가 생긴 뒤 본류가 먼저 깊은 협곡을 파 내려가, 아직 대지 높이에 있는 지류보다 훨씬 낮아졌습니다.' },
  center: { name: '수축 중심', text: '용암 윗면이 공기에 닿아 빨리 식으며 굳을 때, 부피가 줄어드는 힘이 모이는 점들이 생깁니다. 이 점들이 고르게 퍼져 있으면 이웃한 두 점 사이가 갈라져 다각형 그물 모양의 틈이 생기고, 각 다각형이 기둥 하나가 됩니다.' },
  cooling: { name: '식는 면', text: '용암이 열을 빼앗기는 면입니다. 공기와 닿은 윗면이 가장 먼저 빨리 식어 굳고, 굳는 면이 용암층 안쪽으로 나아가면서 틈도 함께 안쪽으로 자랍니다. 그래서 기둥은 식는 면과 수직으로 길게 생깁니다.' },
  jejuRock: { name: '제주의 현무암', text: '제주도는 섬 전체가 화산암으로 되어 있습니다. 현무암의 주상절리와 틈으로 빗물이 쉽게 스며들어 땅 위에 물이 잘 머물지 않습니다. 대신 땅속에는 지하수가 많습니다.' },
  dry: { name: '건천', text: '비가 올 때만 물이 흐르고 평소에는 말라 있는 하천입니다. 제주도는 비가 많은 편이지만, 물이 주상절리와 틈으로 땅속에 스며들어 여름철을 빼면 하천 대부분이 건천입니다. 하천은 섬 가운데에서 사방으로 흘러 길이에 비해 유역이 좁습니다.' },
  spring: { name: '용천', text: '땅속으로 스며든 빗물(민물)이 지하수가 되어 해안 쪽으로 흐르다가, 바닷물보다 가벼워 바닷물 위로 떠서 솟아나는 샘입니다. 제주도에서는 예부터 해안의 용천을 중심으로 마을이 생겼습니다.' },
};

// ---------- 공통 도구 ----------
const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const smooth = q => { q = clamp(q, 0, 1); return q * q * (3 - 2 * q); };
// 늘 같은 값이 나오는 0과 1 사이의 수(그림이 매번 같게)
const hash = (i, s = 0) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const line = (f, a, b, step = 4) => { const p = []; for (let x = a; x <= b; x += step) p.push([x, f(x)]); if (p.at(-1)[0] !== b) p.push([b, f(b)]); return p; };

// ---------- 1. 열하 분출과 중심 분출 ----------
export const ERUPT = { W: 360, H: 250, a: 250, b: 150, h: 70, ox: 24, oy: 226 };
// 비스듬히 본 땅덩어리: x는 가로, y는 위, z는 안쪽
export const eproj = (x, y, z) => [ERUPT.ox + x + 0.5 * z, ERUPT.oy - y - 0.4 * z];
export const FISSURE_X = 125; // 틈은 안쪽(z) 방향으로 길게 난다.
export const ERUPT_NOTE = '용암이 나오는 길에 따라 분출을 둘로 나눕니다. 중심 분출은 한 줄기 통로(화도)를 따라 올라온 마그마가 화구 한 곳에서 나오는 것이고, 열하 분출은 땅에 길게 벌어진 틈(열하)을 따라 주로 현무암질 용암이 나오는 것입니다. 열하에서 아주 묽은 용암이 많이 나오면 낮은 골짜기를 따라 넓게 퍼져 용암대지가 됩니다. 철원-평강 용암대지는 주로 추가령 구조곡 방향의 틈에서 나온 용암으로 생겼고, 분출 끝 무렵에는 한 곳에서 나오는 분출로 바뀌어 평강의 오리산 같은 분석구가 생겼습니다.';

// ---------- 2. 용암대지가 생기고 협곡이 깎이는 단면 ----------
export const STAGE_NAMES = ['옛 골짜기', '용암이 흘러 들어옴', '골짜기가 메워짐', '협곡이 깎임'];
export const OLD_VALLEY = 0, FLOWING = 1, FILLED = 2, CANYON_CUT = 3;
export const NOTES = [
  '옛 골짜기: 용암이 오기 전, 화강암과 편마암으로 된 산지 사이에 넓은 골짜기가 있었습니다. 추가령 구조곡처럼 단층과 깎임이 오랫동안 겹쳐 생긴 곧은 골짜기입니다. 바닥에는 옛 하천이 흐르며 자갈과 모래를 쌓았고, 군데군데 낮은 언덕이 솟아 있었습니다.',
  '용암이 흘러 들어옴: 상류 쪽의 갈라진 틈에서 나온 아주 묽은 현무암질 용암이 낮은 골짜기를 따라 흘러 내려왔습니다. 용암은 낮은 곳부터 채우며 식어 거의 평평한 층이 됩니다. 옛 하천의 물속으로 들어간 용암은 급히 식어 둥근 베개 모양으로 굳기도 했습니다(베개 용암).',
  '골짜기가 메워짐: 용암이 여러 번 흘러와 층이 겹겹이 쌓이자 골짜기가 메워져 평평하고 넓은 용암대지가 되었습니다. 현무암층은 철원 일대에 많게는 11장이고, 용암대지 전체에서 가장 두꺼운 곳은 200m 정도입니다(그림은 다섯 장으로 줄임). 묻히지 않은 높은 언덕은 대지 위에 섬처럼 남아 스텝토가 되었습니다. 그 뒤 한탄강이 대지 위를 넓게 흐르며 흙과 모래를 얇게 덮었습니다.',
  '협곡이 깎임: 용암대지가 골짜기를 높여 놓자, 한탄강은 하류 쪽 낮은 곳과의 높이 차를 줄이려고 아래로 깎아 내려갔습니다. 강은 깎기 쉬운 곳, 곧 옛 하천 퇴적층 부근이나 용암과 옛 땅이 만나는 경계를 따라 파고들어 좁고 깊은 협곡을 만들었습니다. 협곡 벽에는 주상절리가 드러나고, 바닥 가까이에는 용암에 덮였던 옛 하천 자갈층(백의리층)이 보입니다. 이 층이 지금 강바닥과 높이가 비슷해, 강이 용암대지가 생기기 전 높이를 거의 되찾았다고 봅니다. 대지 위는 오늘날 논입니다.',
];
export const SEC = { W: 720, H: 380 };
export const FLOOR = 300; // 옛 골짜기 바닥
export const CH = { x: 478, half: 18, depth: 8 }; // 옛 하천 물길
export const STEP = { x: 318, half: 62, top: 124 }; // 묻히지 않을 언덕(스텝토)
export const LAYERS = [284, 256, 222, 186, 150]; // 용암층 윗면(아래부터 차례로)
export const PLATEAU = LAYERS[LAYERS.length - 1];
export const TOPSED = 6; // 대지 위 퇴적층 두께
export const GRAVEL_T = 14; // 옛 하천 자갈층 두께
export const CANYON = { x: 520, bot: 18, top: 32, floor: 310 };
export const LAYER_COUNT = [0, 2, LAYERS.length, LAYERS.length];

const chanDip = x => { const d = Math.abs(x - CH.x); return d < CH.half ? CH.depth * (1 - (d / CH.half) * (d / CH.half)) : 0; };
// 용암이 오기 전 땅 표면(화강암, 편마암 산지와 넓은 골짜기)
export function oldGround(x) {
  const hl = 98 + 7 * Math.sin(x / 19), hr = 86 + 7 * Math.sin(x / 23 + 1.3);
  const fl = FLOOR + 2.5 * Math.sin(x / 31) + chanDip(x);
  let y = x < 100 ? hl : x < 184 ? hl + (fl - hl) * smooth((x - 100) / 84) : x < 560 ? fl : x < 650 ? fl + (hr - fl) * smooth((x - 560) / 90) : hr;
  const k = Math.abs(x - STEP.x) / STEP.half;
  if (k < 1) y = Math.min(y, FLOOR - (FLOOR - STEP.top) * Math.pow(0.5 + 0.5 * Math.cos(Math.PI * k), 0.6));
  return y;
}
// 옛 하천 자갈층 두께(골짜기 바닥에만, 언덕 위에는 없다)
export const gravelT = x => GRAVEL_T * Math.min(ramp(x, 178, 202), 1 - ramp(x, 542, 566), ramp(Math.abs(x - STEP.x), STEP.half, STEP.half + 18));
export function canyonY(x) {
  const d = Math.abs(x - CANYON.x);
  if (d <= CANYON.bot) return CANYON.floor;
  if (d < CANYON.top) return CANYON.floor - (CANYON.floor - (PLATEAU - TOPSED - 2)) * (d - CANYON.bot) / (CANYON.top - CANYON.bot);
  return -Infinity;
}
// 단계마다 땅 표면
export function surface(x, stage) {
  const g = oldGround(x);
  if (stage === OLD_VALLEY) return g;
  if (stage === FLOWING) return Math.min(g, LAYERS[LAYER_COUNT[FLOWING] - 1]);
  const y = Math.min(g, PLATEAU - TOPSED);
  return stage === CANYON_CUT ? Math.max(y, canyonY(x)) : y;
}
// 베개 용암: 옛 물길 가까이, 맨 아래 용암층 안
export function pillows() {
  const out = [], rx = 8.5, ry = 5.2;
  for (const [row, y] of [[0, 290.5], [1, 300.5], [2, 308]]) {
    for (let x = CH.x - 36 + (row % 2) * 8; x <= CH.x + 36; x += 16.5) {
      const bot = Math.min(oldGround(x - rx * 0.7), oldGround(x), oldGround(x + rx * 0.7));
      if (y - ry >= LAYERS[0] + 1 && y + ry <= bot - 0.6) out.push({ x, y, rx, ry });
    }
  }
  return out;
}
// 주상절리 선(층마다 간격이 다르고 층 경계에서 끊긴다)
export function columnLines(n) {
  const L = [], gaps = [7, 9, 11, 9.5, 12];
  for (let k = 0; k < n; k++) {
    const top = LAYERS[k], bot = k ? LAYERS[k - 1] : FLOOR + 10;
    for (let x = 3 + 4 * hash(k, 1); x < SEC.W; x += gaps[k] * (0.85 + 0.3 * hash(Math.round(x), k))) L.push({ k, x, y0: top + 1.5, y1: bot - 1.5 });
  }
  return L;
}

// ---------- 3. 지류의 호수와 폭포(종단면) ----------
export const TRIB = { W: 360, H: 220, main: 190, end: 322, plat: 112, dam: 236, fall3: 262 };
export const TRIB_NAMES = ['용암이 오기 전', '용암이 지류 어귀를 막음', '본류가 먼저 협곡을 깎음', '폭포가 상류로 물러남'];
export const FALLS_M = 350, PIGEON_M = 150;
export const tribGround = x => x >= TRIB.end ? TRIB.main : TRIB.main - 132 * Math.pow(1 - x / TRIB.end, 1.8);
// 본류를 메운 용암이 지류 어귀로 밀고 들어온 모양(용암댐)
export const tribLava = x => x >= TRIB.dam ? TRIB.plat : TRIB.plat + (tribGround(x) - TRIB.plat) * ramp(TRIB.dam - x, 0, 16);
export const gorgeY = x => 182 + 8 * ramp(x, TRIB.fall3 + 10, TRIB.end) + (x < TRIB.fall3 + 12 ? 5 * Math.sin(Math.PI * (x - TRIB.fall3) / 12) : 0);
export function tribSurface(x, stage) {
  const g = tribGround(x);
  if (stage === 0) return g;
  if (stage === 1) return Math.min(g, tribLava(x));
  if (x >= TRIB.end) return TRIB.main;
  if (stage === 3 && x >= TRIB.fall3) return gorgeY(x);
  return Math.min(g, TRIB.plat);
}
// 호수가 시작하는 곳(지류 바닥이 호수 수면보다 낮아지는 곳)
export function lakeStart() { let x = 0; while (tribGround(x) < TRIB.plat) x += 0.5; return x; }
export const TRIB_NOTE = `용암이 본류 골짜기를 메우면 지류 어귀도 막혀(용암댐) 그 위쪽 지류 골짜기에 큰 호수가 생겼을 것으로 추정합니다. 호수와 강은 대지 위에 퇴적층을 남겼습니다. 그 뒤 물이 많은 본류는 협곡을 먼저 깊이 깎았지만, 물이 적은 지류는 깎는 힘이 약해 대지 높이에 남아 본류 협곡으로 떨어지는 폭포가 되었습니다. 폭포는 두부 침식으로 조금씩 상류로 물러납니다. 연천 재인폭포는 본류에서 약 ${FALLS_M}m, 포천 비둘기낭폭포는 약 ${PIGEON_M}m 상류에 있습니다.`;

// ---------- 4. 주상절리 ----------
// half-plane a*x + b*y <= c 로 다각형을 자른다(서덜랜드 호지먼).
export function clipHalf(poly, a, b, c) {
  const out = [], inside = p => a * p[0] + b * p[1] <= c + 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], ip = inside(p), iq = inside(q);
    if (ip) out.push(p);
    if (ip !== iq) {
      const t = (c - a * p[0] - b * p[1]) / (a * (q[0] - p[0]) + b * (q[1] - p[1]));
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}
// 수축 중심: 조금씩 흔든 육각 격자(틀 밖으로 한 줄 더 둔다)
export function colSites(x0, y0, x1, y1, S, seed = 0) {
  const out = [], dy = S * Math.sqrt(3) / 2;
  let r = 0;
  for (let y = y0 - dy; y <= y1 + dy; y += dy, r++) {
    for (let x = x0 - S + (r % 2) * S / 2; x <= x1 + S; x += S) {
      const i = out.length;
      out.push([x + 0.36 * S * (hash(i, seed + 1) - 0.5), y + 0.36 * S * (hash(i, seed + 2) - 0.5)]);
    }
  }
  return out;
}
// 각 수축 중심에 가장 가까운 곳을 모은 다각형(틈은 이웃한 두 중심의 한가운데에 생긴다)
export function voronoi(sites, [x0, y0, x1, y1]) {
  return sites.map(p => {
    let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    for (const q of sites) {
      if (q === p) continue;
      const dx = q[0] - p[0], dy = q[1] - p[1];
      if (dx * dx + dy * dy > 9e4) continue;
      poly = clipHalf(poly, dx, dy, (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2);
      if (poly.length < 3) break;
    }
    return { site: p, poly };
  }).filter(c => c.poly.length >= 3);
}
export const COL = { W: 360, H: 250, rect: [14, 64, 346, 238], S: 40 };
export const COLB = { W: 360, H: 250, a: 230, b: 110, h: 110, ox: 30, oy: 230, S: 30 };
export const cproj = (x, y, z) => [COLB.ox + x + 0.55 * z, COLB.oy - y - 0.42 * z];
export const topCells = () => voronoi(colSites(0, 0, COLB.a, COLB.b, COLB.S, 5), [0, 0, COLB.a, COLB.b]);
export const viewCells = () => voronoi(colSites(...COL.rect, COL.S, 2), COL.rect);
export const COL_NOTE = '두꺼운 용암은 공기와 닿은 윗면부터 빨리 식어 굳습니다. 식으면서 부피가 줄면 윗면 곳곳에 줄어드는 힘이 모이는 점(수축 중심)이 생기고, 이웃한 두 점 사이가 갈라집니다. 이 점들이 고르게 퍼져 있으면 틈이 다각형 그물을 이루고, 굳는 면이 안쪽으로 내려가면서 틈도 따라 내려가 단면이 다각형인 돌기둥 무리가 됩니다. 주로 현무암에 생기지만 안산암, 조면암, 응회암에도 생깁니다.';

// ---------- 5. 철원과 제주 ----------
export const FARM = { W: 360, H: 270, plat: 140, base: 228 };
export const PADDY = { cheorwon: 80, jeju: 1 }; // 농경지 가운데 논의 비율(%), 2010년대
export const PADDY_KM2 = { cheorwon: '100km² 넘음', jeju: '0.1km² 안팎' };
const cwOld = x => {
  const hl = 64 + 6 * Math.sin(x / 9), hr = 70 + 6 * Math.sin(x / 11 + 2), fl = 204;
  return x < 56 ? hl : x < 118 ? hl + (fl - hl) * smooth((x - 56) / 62) : x < 262 ? fl : x < 322 ? fl + (hr - fl) * smooth((x - 262) / 60) : hr;
};
export const CW_CANYON = { x: 214, half: 11, floor: 196 };
export function cwFarm(x) {
  let y = Math.min(cwOld(x), FARM.plat);
  const d = Math.abs(x - CW_CANYON.x);
  if (d < CW_CANYON.half) y = CW_CANYON.floor; else if (d < CW_CANYON.half + 4) y = Math.max(y, CW_CANYON.floor - (CW_CANYON.floor - FARM.plat) * (d - CW_CANYON.half) / 4);
  return y;
}
export const cwOldGround = cwOld;
export const JEJU = { sea: 180, cx: 180, R: 172, top: 70, floor: 214 };
export function jejuY(x) {
  const u = (x - JEJU.cx) / JEJU.R;
  let y = Math.abs(u) >= 1 ? JEJU.floor : JEJU.floor - (JEJU.floor - JEJU.top) * Math.pow(1 - u * u, 0.9);
  const d = Math.abs(x - 292); if (d < 10) y += 5 * (1 - (d / 10) * (d / 10)); // 하논 같은 작은 화구
  return y;
}
export function jejuCoast() { let x = JEJU.cx; while (jejuY(x) < JEJU.sea) x -= 0.5; const l = x; x = JEJU.cx; while (jejuY(x) < JEJU.sea) x += 0.5; return [l, x]; }
export const FARM_NOTE = '철원과 제주는 둘 다 현무암 대지가 넓지만 농사는 크게 다릅니다. 2010년대에 철원은 농경지의 약 80%(100km² 넘음)가 논이었고, 제주는 약 1%(0.1km² 안팎)만 논이었습니다. 철원 용암대지에는 둘레의 화강암, 편마암 산지에서 시작한 하천이 흘러들어 물이 넉넉하고, 대지가 생긴 직후 강이 대지 위에 비교적 기름진 퇴적층을 깔았습니다. 사람들은 겉흙을 좋은 흙으로 바꾸는 객토를 하고, 저수지와 한탄강의 양수장을 지어 물을 더 댔습니다. 제주는 섬 전체가 화산암이라 다른 산지에서 흘러드는 물이 없고, 하천이 섬 가운데에서 사방으로 흘러 길이에 비해 유역이 좁습니다. 게다가 물이 주상절리와 틈으로 스며들어 하천 대부분이 평소에 마른 건천입니다. 제주의 논은 서귀포 하논의 화구 안처럼 아주 일부에만 있습니다.';

// ---------- 6. 우리나라 사례 ----------
export const EXAMPLES = [
  { name: '철원-평강 용암대지', what: '추가령 구조곡을 따라 흐른 현무암이 옛 골짜기를 메운 곳. 한탄강 협곡과 주상절리, 재인폭포가 있음' },
  { name: '백두 용암대지', what: '백두산 둘레(개마고원 북부)를 넓게 덮은 용암대지. 대부분 해발 1,300m에서 1,400m, 현무암 두께는 200m에서 600m' },
  { name: '신계-곡산 용암대지', what: '황해북도 신계, 곡산, 수안 일대. 용암이 예성강 상류 골짜기를 메워 생김' },
  { name: '전곡 좌상바위', what: '연천 전곡읍 신답리. 용암에 묻히지 않고 대지 위에 섬처럼 남은 옛 언덕(스텝토)' },
  { name: '포천 아우라지 베개 용암', what: '한탄강과 영평천이 만나는 곳의 절벽. 용암이 옛 영평천 물속으로 흘러들어 급히 식은 것으로 추정' },
];
export const exampleList = () => `<ul class="lp-ex">${EXAMPLES.map(e => `<li><b>${e.name}</b> ${e.what}</li>`).join('')}</ul>`;

export const CAPTION = '이름을 누르면 설명이 나옵니다. 모든 그림은 크기와 높이를 크게 과장한 예시이며, 수십만 년에 걸친 일을 몇 단계로 줄여 보여 줍니다. 용암층의 수, 언덕과 호수와 폭포의 자리는 그림을 위해 고른 예시입니다. 용암댐 뒤의 호수와 베개 용암이 생긴 과정은 책도 추정이라고 적은 짐작이며, 다른 해석도 있습니다. 출처: 『이미지로 이해하는 지형학』 2판.';

// ---------- 그리기 도구 ----------
const SKY = '#22313a', HOT_SKY = '#2d2b2a', INK = '#16201f', LIGHT = '#f3f1ea', DIM = '#e6e2d4', NAME = '#ffe9b0', DARK_TEXT = '#22261f';
const BASALT = '#3f3c3b', BASALT2 = '#4d4a48', BASALT_TOP = '#5b5754', CRUST = '#8a4c36', JOINT = '#171514';
const OLD = '#8f8070', OLD_LINE = '#6f6254', OLD_TOP = '#a99a89', GRAVEL = '#c9b48a', GRAVEL_DOT = '#7f6a44', SED = '#bfae8c', SED_LINE = '#9c8a68', SOIL = '#7a5a3a';
const MAGMA = '#e8642a', MAGMA_HOT = '#ffb347', HOT_LAVA = '#7a3424', SCORIA = '#8a3a24', SCORIA2 = '#a4492c';
const WATER = '#3f8fd0', WATER_LIGHT = '#9fd0f2', PADDY_C = '#7e9a5c', PADDY_DARK = '#4f6b38', ACCENT = '#e4b15a';
const say = (zone, text, x, y, color = LIGHT, size = 16, anchor = 'middle', rock = false) => `<text class="zone${rock ? ' rk' : ''}" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
const plain = (text, x, y, color = DIM, size = 13, anchor = 'middle', rock = false) => `<text${rock ? ' class="rk"' : ''} x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
const lead = (x0, y0, x1, y1, color = LIGHT) => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${color}" stroke-width="1.4"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="2.6" fill="${color}" stroke="${INK}" stroke-width="1"/>`;
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
  const body = w => `<polyline points="${pts(p.slice(0, -1))}" fill="none" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${f1(hx + nx)} ${f1(hy + ny)}L${f1(bx)} ${f1(by)}L${f1(hx - nx)} ${f1(hy - ny)}Z"/>`;
  return `<g stroke="${INK}" fill="${INK}" stroke-linejoin="round">${body(5.6)}</g><g stroke="${color}" fill="${color}">${body(2.6)}</g>`;
}
let clipN = 0;
const clipOf = (poly, inner) => { const id = `lp-clip-${++clipN}`; return `<defs><clipPath id="${id}"><polygon points="${pts(poly)}"/></clipPath></defs><g clip-path="url(#${id})">${inner}</g>`; };
const dots = (poly, color = GRAVEL_DOT) => { const id = `lp-dots-${++clipN}`; return `<defs><pattern id="${id}" width="8" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${color}"/><circle cx="6" cy="4.6" r="0.9" fill="${color}"/></pattern></defs><polygon points="${pts(poly)}" fill="url(#${id})"/>`; };
const between = (top, bot, a, b, step = 2) => [...line(top, a, b, step), ...line(bot, a, b, step).reverse()];
// 편마암의 줄무늬(옛 땅)
const foliation = (W, H, y0 = 50, gap = 16) => { let s = ''; for (let y = y0, k = 0; y < H + 20; y += gap, k++) s += `<path d="M-20 ${y}Q${W * 0.25} ${y - 9 + (k % 3) * 3} ${W * 0.5} ${y + 2}T${W + 20} ${y - 4}" stroke="${OLD_LINE}" stroke-width="1.2" fill="none"/>`; return s; };
const flame = (x, y, h, w = 6) => `<path d="M${f1(x - w)} ${f1(y)}Q${f1(x - w * 0.6)} ${f1(y - h * 0.55)} ${f1(x)} ${f1(y - h)}Q${f1(x + w * 0.6)} ${f1(y - h * 0.55)} ${f1(x + w)} ${f1(y)}Z" fill="${MAGMA}"/><path d="M${f1(x - w * 0.5)} ${f1(y)}Q${f1(x - w * 0.25)} ${f1(y - h * 0.4)} ${f1(x)} ${f1(y - h * 0.7)}Q${f1(x + w * 0.25)} ${f1(y - h * 0.4)} ${f1(x + w * 0.5)} ${f1(y)}Z" fill="${MAGMA_HOT}"/>`;
const rice = (x0, x1, y) => { let s = `<path d="M${f1(x0)} ${f1(y)}H${f1(x1)}" stroke="${PADDY_C}" stroke-width="3"/>`; for (let x = x0 + 3; x < x1 - 2; x += 6) s += `<path d="M${f1(x)} ${f1(y - 1)}l-2 -5M${f1(x)} ${f1(y - 1)}l0 -6M${f1(x)} ${f1(y - 1)}l2 -5" stroke="${PADDY_DARK}" stroke-width="1"/>`; return s; };

// ---------- 그림 1: 분출 방식 ----------
function eruptPanel(kind) {
  const { W, H, a, b, h } = ERUPT, P = eproj;
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  const top = [P(0, h, 0), P(a, h, 0), P(a, h, b), P(0, h, b)], front = [P(0, 0, 0), P(a, 0, 0), P(a, h, 0), P(0, h, 0)], side = [P(a, 0, 0), P(a, 0, b), P(a, h, b), P(a, h, 0)];
  // 옆면과 앞면: 옛 땅
  s += `<polygon points="${pts(side)}" fill="#7a6d60"/>`;
  s += clipOf(front, `<rect width="${W}" height="${H}" fill="${OLD}"/>${foliation(W, H, 170, 12)}`);
  s += `<polygon points="${pts(top)}" fill="${OLD_TOP}"/>`;
  let n = '';
  if (kind === 'fissure') {
    const X = FISSURE_X;
    // 넓고 얇게 퍼진 용암(윗면)과 앞면의 얇은 용암층
    const sheet = [];
    for (let i = 0; i <= 16; i++) { const z = 8 + (b - 16) * i / 16; sheet.push(P(X - 96 - 10 * hash(i, 3), h, z)); }
    for (let i = 16; i >= 0; i--) { const z = 8 + (b - 16) * i / 16; sheet.push(P(X + 104 + 10 * hash(i, 4), h, z)); }
    s += `<polygon points="${pts(sheet)}" fill="${HOT_LAVA}" stroke="${CRUST}" stroke-width="1.2"/>`;
    for (const dz of [0.25, 0.5, 0.75]) { const z = b * dz; s += `<path d="M${pts([P(X - 80, h, z), P(X - 8, h, z)])}M${pts([P(X + 8, h, z), P(X + 88, h, z)])}" stroke="${MAGMA}" stroke-width="1.2" stroke-dasharray="5 6" opacity="0.8"/>`; }
    // 흐르는 방향
    s += arrow(...P(X - 14, h, 60), ...P(X - 70, h, 60), MAGMA_HOT, 2.2, 5) + arrow(...P(X + 14, h, 90), ...P(X + 78, h, 90), MAGMA_HOT, 2.2, 5);
    // 땅속 틈(암맥)과 앞면의 얇은 용암층
    s += `<polygon points="${pts([P(X - 3, 0, 0), P(X + 3, 0, 0), P(X + 3, h, 0), P(X - 3, h, 0)])}" fill="${MAGMA}"/>`;
    s += `<polygon points="${pts([P(X - 96, h, 0), P(X + 104, h, 0), P(X + 104, h + 5, 0), P(X - 96, h + 5, 0)])}" fill="${BASALT}" stroke="${CRUST}" stroke-width="1"/>`;
    // 틈을 따라 줄지어 솟는 용암 분수(불의 커튼)
    s += `<path d="M${pts([P(X, h, 4), P(X, h, b - 4)])}" stroke="${JOINT}" stroke-width="4"/><path d="M${pts([P(X, h, 4), P(X, h, b - 4)])}" stroke="${MAGMA}" stroke-width="2"/>`;
    for (let i = 0; i < 9; i++) { const [x, y] = P(X, h, 12 + i * 16); s += flame(x, y, 14 + 10 * hash(i, 7), 5.5); }
    n += say('fissure', '열하 분출', 180, 28, NAME, 19);
    n += plain('길게 갈라진 틈을 따라 용암이 나옴', 180, 50);
    n += plain('묽은 용암이 얇고 넓게 퍼짐', 180, 68, MAGMA_HOT, 13);
    n += plain('땅속 틈을 채운 마그마', P(X, 0, 0)[0] + 10, 214, DARK_TEXT, 12, 'start', true);
    n += plain('예: 철원-평강 용암대지의 주된 분출', 180, H - 6, DIM, 13);
  } else {
    const X = a / 2, R = 62, Hc = 58;
    // 화도와 앞면에서 자른 화산체(분석구)
    const cone = [];
    for (let i = 0; i <= 40; i++) { const u = -1 + 2 * i / 40, d = Math.abs(u); cone.push(P(X + u * R, d >= 0.2 ? h + Hc * (1 - d) : h + Hc * (0.55 + 0.25 * (d / 0.2) * (d / 0.2)), 0)); }
    // 뒤쪽으로 흐르는 용암 줄기(윗면)
    const tongue = [P(X + 30, h, 6), P(X + 60, h, 40), P(X + 96, h, 92), P(a - 4, h, 128), P(a - 4, h, 146), P(X + 82, h, 110), P(X + 42, h, 62), P(X + 10, h, 20)];
    s += `<polygon points="${pts(tongue)}" fill="${HOT_LAVA}" stroke="${CRUST}" stroke-width="1.2"/>`;
    s += arrow(...P(X + 58, h, 54), ...P(X + 98, h, 106), MAGMA_HOT, 2.2, 5);
    const coneIn = [...cone, P(X + R, h, 0), P(X - R, h, 0)];
    let layers = '';
    for (let k = 1; k <= 4; k++) { const f = k / 5; layers += `<polyline points="${pts(cone.map(([x, y]) => [x, ERUPT.oy - h - (ERUPT.oy - h - y) * f]))}" fill="none" stroke="${SCORIA2}" stroke-width="1.3"/>`; }
    s += clipOf(coneIn, `<rect width="${W}" height="${H}" fill="${SCORIA}"/>${layers}`);
    s += `<polyline points="${pts(cone)}" fill="none" stroke="#1e1a18" stroke-width="1.8"/>`;
    const [px] = P(X, 0, 0);
    s += `<rect x="${f1(px - 4)}" y="${f1(P(X, h + Hc * 0.55, 0)[1])}" width="8" height="${f1(ERUPT.oy - P(X, h + Hc * 0.55, 0)[1])}" fill="${MAGMA}"/>`;
    // 화구에서 솟는 분수와 날아가는 조각
    const [cx, cy] = P(X, h + Hc * 0.56, 0);
    s += flame(cx, cy, 34, 8);
    for (const [dx, dy] of [[-22, -40], [-34, -26], [20, -44], [32, -30], [-8, -52], [12, -56]]) s += `<circle cx="${f1(cx + dx)}" cy="${f1(cy + dy)}" r="2.2" fill="${SCORIA2}" stroke="${INK}" stroke-width="0.8"/>`;
    n += say('central', '중심 분출', 64, 28, NAME, 19);
    n += plain('한 줄기 통로(화도)로', 64, 50) + plain('올라와 한 곳에서 분출', 64, 67);
    n += say('cinder', '분석구', 296, 60, LIGHT, 15) + lead(282, 68, P(X + 30, h + 26, 0)[0], P(X + 30, h + 26, 0)[1]);
    n += plain('화도', px + 10, 216, DARK_TEXT, 12, 'start', true);
    n += plain('예: 분출 끝 무렵의 오리산(분석구)', 180, H - 6, DIM, 13);
  }
  s += `<polygon points="${pts(top)}" fill="none" stroke="#1e1a18" stroke-width="1.4"/><polygon points="${pts(front)}" fill="none" stroke="#1e1a18" stroke-width="1.4"/><polygon points="${pts(side)}" fill="none" stroke="#1e1a18" stroke-width="1.4"/>`;
  return `<svg class="lp-erupt" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind === 'fissure' ? '길게 갈라진 틈을 따라 용암이 나와 넓게 퍼지는 열하 분출' : '한 화구에서 분출해 화산체가 쌓이는 중심 분출'}을 비스듬히 본 그림">${textStyle('lp-erupt')}${s}${n}</svg>`;
}

// ---------- 그림 2: 용암대지 단면 ----------
function section(stage, phone = false) {
  const { W, H } = SEC;
  const sf = x => surface(x, stage);
  const surf = line(sf, 0, W, 2), og = line(oldGround, 0, W, 2);
  const nL = LAYER_COUNT[stage];
  let s = `<rect width="${W}" height="${H}" fill="${stage === FLOWING ? HOT_SKY : SKY}"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>${foliation(W, H, 70, 17)}`;
  // 옛 하천 자갈층
  const gr = between(oldGround, x => oldGround(x) + gravelT(x), 190, 572);
  inner += `<polygon data-gravel="1" points="${pts(gr)}" fill="${GRAVEL}"/>${dots(gr)}`;
  if (nL) {
    const topY = LAYERS[nL - 1];
    const region = between(x => Math.min(oldGround(x), topY), oldGround, 0, W);
    let lv = '';
    for (let k = nL - 1; k >= 0; k--) {
      const hot = stage === FLOWING && k === nL - 1;
      lv += `<polygon data-layer="${k}" points="${pts(between(x => Math.min(oldGround(x), LAYERS[k]), oldGround, 0, W))}" fill="${hot ? HOT_LAVA : k % 2 ? BASALT2 : BASALT}"/>`;
    }
    // 층 경계(굳은 껍질)
    for (let k = 0; k < nL - 1; k++) lv += `<path d="M0 ${LAYERS[k]}H${W}" stroke="${CRUST}" stroke-width="1.6"/>`;
    // 식은 층의 주상절리
    const cool = stage === FLOWING ? nL - 1 : nL;
    lv += `<path data-columns="1" d="${columnLines(cool).map(c => `M${f1(c.x)} ${f1(c.y0)}V${f1(c.y1)}`).join('')}" stroke="${JOINT}" stroke-width="1.1" opacity="${stage === CANYON_CUT ? 0.85 : 0.6}"/>`;
    // 베개 용암
    lv += `<g data-pillow="1">${pillows().map(p => `<ellipse cx="${f1(p.x)}" cy="${f1(p.y)}" rx="${p.rx}" ry="${p.ry}" fill="#565150" stroke="${JOINT}" stroke-width="1.2"/><path d="M${f1(p.x - p.rx * 0.6)} ${f1(p.y - p.ry * 0.35)}Q${f1(p.x)} ${f1(p.y - p.ry * 0.9)} ${f1(p.x + p.rx * 0.6)} ${f1(p.y - p.ry * 0.35)}" stroke="#8d8784" stroke-width="1" fill="none"/>`).join('')}</g>`;
    if (stage === FLOWING) lv += `<path d="M0 ${topY + 1.5}H${W}" stroke="${MAGMA}" stroke-width="3"/>`;
    inner += clipOf(region, lv);
  }
  if (stage >= FILLED) {
    const sed = between(x => Math.min(oldGround(x), PLATEAU - TOPSED), x => Math.min(oldGround(x), PLATEAU), 0, W);
    inner += `<polygon data-topsed="1" points="${pts(sed)}" fill="${SOIL}"/>`;
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2.2" stroke-linejoin="round"/>`;
  // 용암에 묻힌 옛 땅 표면(점선)
  if (stage >= FILLED) s += `<polyline points="${pts(og.filter(([x, y]) => y > PLATEAU + 2 && Math.abs(x - CANYON.x) > CANYON.top))}" fill="none" stroke="${LIGHT}" stroke-width="1.2" stroke-dasharray="4 5" opacity="0.55"/>`;
  let top = '', n = '';
  // 물
  if (stage === OLD_VALLEY) top += `<polygon points="${pts([...line(oldGround, CH.x - 12, CH.x + 12, 1).map(([x, y]) => [x, Math.max(y, FLOOR + 3)]).reverse(), ...line(() => FLOOR + 3, CH.x - 12, CH.x + 12, 2)])}" fill="${WATER}"/>`;
  if (stage === FILLED) top += `<ellipse cx="${CANYON.x}" cy="${PLATEAU - TOPSED}" rx="34" ry="3" fill="${WATER}"/>`;
  if (stage === CANYON_CUT) top += `<rect x="${CANYON.x - CANYON.bot + 1}" y="${CANYON.floor - 5}" width="${(CANYON.bot - 1) * 2}" height="5" fill="${WATER}"/>`;
  if (stage === CANYON_CUT) {
    const y = PLATEAU - TOPSED;
    for (const [a, b] of [[138, STEP.x - STEP.half + 10], [STEP.x + STEP.half - 10, CANYON.x - CANYON.top - 6], [CANYON.x + CANYON.top + 6, 610]]) top += rice(a, b, y);
  }
  if (phone) {
    // 휴대폰: 그림이 화면 폭의 절반 크기로 줄어들므로 글자를 키우고, 아래 설명과 겹치는 부제와 덧붙임 글은 뺀다.
    const T = 26;
    if (stage === OLD_VALLEY) {
      n += say('valley', '옛 골짜기(추가령 구조곡)', 360, 44, NAME, 34);
      n += say('hills', '화강암, 편마암 산지', 10, 80, LIGHT, T, 'start');
      n += plain('낮은 언덕', STEP.x, STEP.top - 12, LIGHT, T);
      n += plain('옛 하천', CH.x, FLOOR - 16, WATER_LIGHT, T);
      n += say('baegui', '옛 하천 자갈층', 380, 354, DARK_TEXT, T, 'middle', true) + lead(380, 330, 380, oldGround(380) + 7, DARK_TEXT);
    } else if (stage === FLOWING) {
      n += say('lava', '용암이 골짜기를 따라 흘러옴', 360, 44, NAME, 34);
      n += say('hills', '화강암, 편마암 산지', 10, 80, LIGHT, T, 'start');
      n += plain('흐르는 용암', 470, LAYERS[1] - 12, MAGMA_HOT, T);
      n += say('lava', '먼저 식은 용암층', 210, 354, LIGHT, T) + lead(210, 330, 212, LAYERS[0] + 8);
      n += say('pillow', '베개 용암', 596, 354, NAME, 28) + lead(566, 332, CH.x + 4, 296, NAME);
    } else if (stage === FILLED) {
      n += say('plateau', '용암대지', 360, 44, NAME, 34);
      n += say('steptoe', '스텝토', STEP.x, STEP.top - 14, NAME, 30);
      n += say('river', '대지 위의 한탄강', 490, PLATEAU - 22, WATER_LIGHT, T);
      n += say('lava', '용암층 여러 장', 460, 228, LIGHT, 28);
      n += say('baegui', '묻힌 옛 하천 자갈층', 380, 354, DARK_TEXT, T, 'middle', true) + lead(380, 330, 380, oldGround(380) + 7, DARK_TEXT);
    } else {
      n += say('canyon', '한탄강 협곡', 360, 44, NAME, 34);
      n += say('column', '주상절리', 446, 222, LIGHT, 28, 'end') + lead(450, 214, CANYON.x - CANYON.top + 4, 214);
      n += say('baegui', '백의리층', 646, 340, DARK_TEXT, 28, 'middle', true) + lead(612, 322, CANYON.x + CANYON.bot + 2, FLOOR + 5, DARK_TEXT);
      n += say('pillow', '베개 용암', 380, 354, NAME, 28) + lead(416, 332, CANYON.x - CANYON.top - 6, 292, NAME);
      n += say('paddy', '논', 440, PLATEAU - 20, LIGHT, 30);
      n += say('steptoe', '스텝토', STEP.x, STEP.top - 12, NAME, 28);
    }
    return `<svg class="lp-sec" data-stage="${stage}" data-phone="1" viewBox="0 0 ${W} ${H}" role="img" aria-label="골짜기를 가로로 자른 단면. ${STAGE_NAMES[stage]} 단계이다. 높이를 크게 과장한 예시이다.">${textStyle('lp-sec')}${s}${top}${n}</svg>`;
  }
  if (stage === OLD_VALLEY) {
    n += say('valley', '옛 골짜기(추가령 구조곡)', 360, 30, NAME, 19);
    n += plain('화강암과 편마암 산지 사이의 넓은 골짜기', 360, 52);
    n += say('hills', '화강암, 편마암 산지', 74, 66, LIGHT, 14) + say('hills', '화강암, 편마암 산지', 650, 54, LIGHT, 14);
    n += plain('낮은 언덕', STEP.x, STEP.top - 10, LIGHT, 13);
    n += plain('옛 하천', CH.x, FLOOR - 12, WATER_LIGHT, 13);
    n += say('baegui', '옛 하천 자갈층', 380, 346, DARK_TEXT, 14, 'middle', true) + lead(380, 334, 380, oldGround(380) + 7, DARK_TEXT);
  } else if (stage === FLOWING) {
    n += say('lava', '용암이 골짜기를 따라 흘러옴', 360, 30, NAME, 19);
    n += plain('상류의 틈(열하)에서 나온 묽은 현무암질 용암이 낮은 곳부터 채움', 360, 52);
    n += plain('흐르는 용암', 470, LAYERS[1] - 10, MAGMA_HOT, 14);
    n += say('lava', '먼저 식은 용암층', 220, 344, LIGHT, 14) + lead(220, 332, 212, LAYERS[0] + 8);
    n += say('pillow', '베개 용암', 560, 346, NAME, 15) + lead(546, 336, CH.x + 4, 296, NAME);
    n += plain('물속에 들어간 용암이 급히 식음', 560, 366, DIM, 13);
    n += say('hills', '화강암, 편마암 산지', 74, 66, LIGHT, 14);
  } else if (stage === FILLED) {
    n += say('plateau', '용암대지', 360, 30, NAME, 19);
    n += plain('용암이 여러 번 흘러 겹겹이 쌓이고, 골짜기가 평평하게 메워짐', 360, 52);
    n += say('steptoe', '스텝토', STEP.x, STEP.top - 26, NAME, 16) + plain('묻히지 않은 옛 언덕', STEP.x, STEP.top - 8, LIGHT, 13);
    n += say('river', '대지 위의 한탄강', CANYON.x, PLATEAU - 22, WATER_LIGHT, 14);
    n += say('lava', '현무암 용암층 여러 장', 400, 214, LIGHT, 15);
    n += say('topsed', '대지 위 퇴적층', 150, 128, LIGHT, 14) + lead(150, 134, 214, PLATEAU - TOPSED / 2);
    n += say('baegui', '묻힌 옛 하천 자갈층', 380, 348, DARK_TEXT, 14, 'middle', true) + lead(380, 336, 380, oldGround(380) + 7, DARK_TEXT);
    n += plain('점선: 용암이 오기 전 땅 표면', 704, 364, DIM, 13, 'end');
  } else {
    n += say('canyon', '한탄강 협곡', 360, 30, NAME, 19);
    n += plain('강이 용암과 옛 땅의 경계를 따라 아래로 깎음', 360, 52);
    n += say('column', '주상절리', 420, 206, LIGHT, 15) + lead(446, 210, CANYON.x - CANYON.top + 4, 214);
    n += say('baegui', '백의리층(옛 하천 자갈층)', 640, 330, DARK_TEXT, 14, 'middle', true) + lead(600, 320, CANYON.x + CANYON.bot + 2, FLOOR + 5, DARK_TEXT);
    n += say('pillow', '베개 용암', 400, 340, NAME, 15) + lead(424, 330, CANYON.x - CANYON.top - 6, 292, NAME);
    n += say('paddy', '논', 440, PLATEAU - 22, LIGHT, 15);
    n += say('steptoe', '스텝토', STEP.x, STEP.top - 12, NAME, 14);
    n += plain('강바닥이 용암이 오기 전 높이를 거의 되찾음', 704, 370, DIM, 13, 'end');
  }
  return `<svg class="lp-sec" data-stage="${stage}" viewBox="0 0 ${W} ${H}" role="img" aria-label="골짜기를 가로로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">${textStyle('lp-sec')}${s}${top}${n}
    <text x="10" y="${H - 10}" font-size="12" font-weight="700" fill="${DIM}">높이를 크게 과장한 예시입니다.</text></svg>`;
}

// ---------- 그림 3: 지류의 종단면 ----------
function tribPanel(stage) {
  const { W, H, main, end, plat, dam, fall3 } = TRIB;
  const sf = x => tribSurface(x, stage);
  const surf = line(sf, 0, W, 1);
  let s = `<rect width="${W}" height="${H}" fill="${stage === 1 ? HOT_SKY : SKY}"/>`;
  let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>${foliation(W, H, 80, 14)}`;
  const gr = between(tribGround, x => tribGround(x) + 5, 0, W);
  inner += `<polygon points="${pts(gr)}" fill="${GRAVEL}"/>`;
  if (stage >= 1) {
    const lava = between(x => Math.min(tribGround(x), tribLava(x)), tribGround, dam - 18, W, 1);
    let lv = `<polygon data-lava="1" points="${pts(lava)}" fill="${stage === 1 ? HOT_LAVA : BASALT}"/>`;
    if (stage >= 2) { let c = ''; for (let x = dam + 3; x < W; x += 7 + 2 * hash(x, 2)) c += `M${f1(x)} ${plat + 2}V${main + 4}`; lv += `<path d="${c}" stroke="${JOINT}" stroke-width="1"/><path d="M0 ${f1((plat + main) / 2)}H${W}" stroke="${CRUST}" stroke-width="1.4"/>`; }
    inner += clipOf(lava, lv);
  }
  if (stage >= 2) {
    const ls = lakeStart();
    const sed = between(x => Math.min(tribGround(x), plat), x => Math.min(tribGround(x), tribLava(x)), ls, dam, 1);
    let sl = `<polygon data-lakesed="1" points="${pts(sed)}" fill="${SED}"/>`;
    for (let y = plat + 5; y < main; y += 6) sl += `<path d="M${f1(ls)} ${y}H${dam}" stroke="${SED_LINE}" stroke-width="0.9"/>`;
    inner += clipOf(sed, sl);
  }
  s += clipOf([...surf, [W, H], [0, H]], inner);
  s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2" stroke-linejoin="round"/>`;
  let w = '', n = '';
  const river = (x0, x1, f) => `<polyline points="${pts(line(x => f(x) - 1.5, x0, x1, 2))}" fill="none" stroke="${WATER}" stroke-width="3" stroke-linecap="round"/>`;
  if (stage === 0) {
    w += river(0, end, tribGround) + `<rect x="${end + 4}" y="${main - 4}" width="${W - end - 4}" height="4" fill="${WATER}"/>`;
    n += say('valley', '용암이 오기 전', 180, 26, NAME, 16);
    n += plain('지류', 30, 50, WATER_LIGHT, 13, 'start');
    n += say('mainriver', '본류', 340, main - 14, WATER_LIGHT, 13);
    n += plain('지류가 본류로 매끈하게 이어짐', 180, 46, DIM, 12);
  } else if (stage === 1) {
    const ls = lakeStart();
    const lakeTop = plat;
    w += `<polygon data-lake="1" points="${pts(between(() => lakeTop, x => Math.min(tribGround(x), tribLava(x)), ls, dam, 1))}" fill="${WATER}" opacity="0.92"/>`;
    w += river(0, ls, tribGround);
    n += say('lake', '막힌 지류의 호수', 150, 92, NAME, 15);
    n += say('lava', '용암댐', 286, 96, NAME, 15) + lead(286, 102, dam + 8, plat + 6, NAME);
    n += plain('본류 골짜기를 메운 용암', 290, 26, MAGMA_HOT, 12);
    n += plain('지류', 30, 50, WATER_LIGHT, 13, 'start');
  } else {
    const fx = stage === 2 ? end : fall3;
    w += river(0, fx - 1, x => Math.min(tribGround(x), plat));
    // 떨어지는 물
    const dx = stage === 2 ? 11 : 6;
    w += `<path d="M${fx - 1} ${plat - 1.5}C${fx + dx * 0.8} ${plat - 1} ${fx + dx} ${plat + 24} ${fx + dx} ${f1((stage === 2 ? main : gorgeY(fx + dx)) - 2)}" stroke="${WATER_LIGHT}" stroke-width="3.2" fill="none"/>`;
    if (stage === 3) w += river(fx + 4, end, gorgeY) + `<ellipse cx="${fx + 6}" cy="${f1(gorgeY(fx + 6) - 1.5)}" rx="7" ry="2.6" fill="${WATER}"/>`;
    w += `<rect x="${end + 2}" y="${main - 4}" width="${W - end - 2}" height="4" fill="${WATER}"/>`;
    n += say('mainriver', '본류', 342, main - 14, WATER_LIGHT, 13);
    if (stage === 2) {
      n += say('falls', '폭포', end - 14, 96, NAME, 16) + lead(end - 14, 102, end + 2, plat + 18, NAME);
      n += say('canyon', '본류가 먼저 깎아 내려감', 180, 26, NAME, 15);
      n += say('lake', '호수 퇴적층', 150, 140, DARK_TEXT, 13, 'middle', true);
    } else {
      n += say('falls', '폭포가 상류로 물러남', 180, 26, NAME, 15);
      n += `<path d="M${end} ${plat - 2}V${main}" stroke="${LIGHT}" stroke-width="1.4" stroke-dasharray="5 4"/>`;
      n += arrow(end - 4, 64, fall3 + 4, 64, NAME, 2.4, 6);
      n += plain(`약 ${FALLS_M}m(재인폭포)`, (end + fall3) / 2, 56, NAME, 12);
      n += plain('예전 폭포 자리', end + 2, 82, DIM, 12);
      n += say('pool', '폭호', fall3 - 26, 172, LIGHT, 13) + lead(fall3 - 14, 168, fall3 + 5, gorgeY(fall3 + 6), LIGHT);
      n += say('lake', '호수 퇴적층', 150, 140, DARK_TEXT, 13, 'middle', true);
    }
  }
  s += w;
  n += plain('상류', 8, H - 8, DIM, 12, 'start') + plain('본류 쪽', W - 8, H - 8, DIM, 12, 'end');
  return `<svg class="lp-trib" data-stage="${stage}" viewBox="0 0 ${W} ${H}" role="img" aria-label="지류를 따라 세로로 자른 종단면. ${TRIB_NAMES[stage]}.">${textStyle('lp-trib')}${s}${n}</svg>`;
}

// ---------- 그림 4: 주상절리 ----------
function colView() {
  const { W, H, rect } = COL;
  const cells = viewCells();
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  const mid = cells.reduce((m, c) => { const d = (c.site[0] - 186) ** 2 + (c.site[1] - 150) ** 2; return d < m.d ? { d, c } : m; }, { d: Infinity, c: null }).c;
  s += `<g data-cells="${cells.length}">${cells.map(c => `<polygon points="${pts(c.poly)}" fill="${c === mid ? BASALT_TOP : BASALT2}" stroke="${JOINT}" stroke-width="2.6" stroke-linejoin="round"/>`).join('')}</g>`;
  // 수축 중심
  s += cells.filter(c => c.site[0] > rect[0] && c.site[0] < rect[2] && c.site[1] > rect[1] && c.site[1] < rect[3]).map(c => `<circle cx="${f1(c.site[0])}" cy="${f1(c.site[1])}" r="2.6" fill="${MAGMA_HOT}"/>`).join('');
  // 가운데 칸: 둘레에서 중심 쪽으로 줄어드는 힘
  for (const [vx, vy] of mid.poly) { const [cx, cy] = mid.site; s += arrow(vx + (cx - vx) * 0.12, vy + (cy - vy) * 0.12, vx + (cx - vx) * 0.62, vy + (cy - vy) * 0.62, ACCENT, 1.8, 4.2); }
  s += `<rect x="${rect[0]}" y="${rect[1]}" width="${rect[2] - rect[0]}" height="${rect[3] - rect[1]}" fill="none" stroke="#1e1a18" stroke-width="1.6"/>`;
  let n = '';
  n += say('cooling', '식는 면을 위에서 본 모습', 180, 24, NAME, 16);
  n += plain('용암 윗면이 공기에 닿아 식으며 줄어듦', 180, 46);
  n += say('center', '수축 중심', mid.site[0] + 74, mid.site[1] - 30, NAME, 14) + lead(mid.site[0] + 50, mid.site[1] - 26, mid.site[0] + 3, mid.site[1] - 2, NAME);
  // 가운데 칸의 왼쪽 변(이웃 칸과의 경계)
  const [e0, e1] = mid.poly.map((p, i, arr) => [p, arr[(i + 1) % arr.length]]).reduce((m, e) => (e[0][0] + e[1][0] < m[0][0] + m[1][0] ? e : m));
  n += say('column', '갈라진 틈(절리)', 62, 108, LIGHT, 14) + lead(62, 114, (e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2);
  n += plain('틈은 이웃한 두 중심의 한가운데에 생겨 다각형 그물이 됨', 180, H - 4, DIM, 12);
  return `<svg class="lp-col" data-kind="view" viewBox="0 0 ${W} ${H}" role="img" aria-label="용암 윗면을 위에서 본 그림. 수축 중심들 사이가 갈라져 다각형 그물이 생긴다.">${textStyle('lp-col')}${s}${n}</svg>`;
}
function colBlock() {
  const { W, H, a, b, h } = COLB, P = cproj;
  const cells = topCells();
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`;
  const front = [P(0, 0, 0), P(a, 0, 0), P(a, h, 0), P(0, h, 0)], side = [P(a, 0, 0), P(a, 0, b), P(a, h, b), P(a, h, 0)];
  const onEdge = (k, v) => [...new Set(cells.flatMap(c => c.poly.filter(p => Math.abs(p[k] - v) < 1e-6).map(p => +p[1 - k].toFixed(3))))].filter(u => u > 1 && u < (k ? a : b) - 1).sort((p, q) => p - q);
  const fx = onEdge(1, 0), sz = onEdge(0, a);
  // 앞면: 기둥(번갈아 조금씩 다른 색)
  const xs = [0, ...fx, a];
  for (let i = 0; i < xs.length - 1; i++) s += `<polygon points="${pts([P(xs[i], 0, 0), P(xs[i + 1], 0, 0), P(xs[i + 1], h, 0), P(xs[i], h, 0)])}" fill="${i % 2 ? BASALT : '#454140'}"/>`;
  s += `<path d="${fx.map(x => `M${pts([P(x, 0, 0), P(x, h, 0)])}`).join('')}" stroke="${JOINT}" stroke-width="2"/>`;
  // 가로로 끊긴 금(기둥 마디)
  let seg = '';
  for (let i = 0; i < xs.length - 1; i++) for (const yy of [0.3, 0.62].map(t => h * (t + 0.08 * (hash(i, 9) - 0.5)))) seg += `M${pts([P(xs[i] + 1, yy, 0), P(xs[i + 1] - 1, yy, 0)])}`;
  s += `<path d="${seg}" stroke="${JOINT}" stroke-width="1" opacity="0.7"/>`;
  s += `<polygon points="${pts(side)}" fill="#2f2c2b"/><path d="${sz.map(z => `M${pts([P(a, 0, z), P(a, h, z)])}`).join('')}" stroke="${JOINT}" stroke-width="1.8"/>`;
  // 윗면: 다각형 그물
  s += cells.map(c => `<polygon points="${pts(c.poly.map(([u, v]) => P(u, h, v)))}" fill="${BASALT_TOP}" stroke="${JOINT}" stroke-width="2" stroke-linejoin="round"/>`).join('');
  s += `<polygon points="${pts(front)}" fill="none" stroke="#1e1a18" stroke-width="1.6"/><polygon points="${pts(side)}" fill="none" stroke="#1e1a18" stroke-width="1.6"/>`;
  // 아래 땅
  s += `<polygon points="${pts([P(-14, 0, 0), P(a + 14, 0, 0), P(a + 14, -12, 0), P(-14, -12, 0)])}" fill="${OLD}"/>`;
  // 위로 빠져나가는 열, 아래로 자라는 틈
  for (const [u, v] of [[50, 40], [120, 70], [190, 50]]) { const [x, y] = P(u, h, v); s += arrow(x, y - 6, x, y - 34, ACCENT, 2.2, 5); }
  for (const x of [fx[1] ?? 40, fx[3] ?? 120, fx[5] ?? 190]) { const [px, py] = P(x, h, 0); s += arrow(px + 6, py + 8, px + 6, py + 44, MAGMA_HOT, 2, 4.5); }
  let n = '';
  n += say('column', '주상절리 기둥', 180, 24, NAME, 16);
  n += say('cooling', '열이 공기로 빠져나감', 300, 54, ACCENT, 13);
  n += plain('틈이 아래로 자람', P(0, h, 0)[0] + 2, P(0, h, 0)[1] - 16, MAGMA_HOT, 12, 'start');
  n += plain('단면이 다각형인 기둥', 180, H - 4, DIM, 12);
  return `<svg class="lp-col" data-kind="block" viewBox="0 0 ${W} ${H}" role="img" aria-label="주상절리가 생긴 용암층을 비스듬히 본 그림. 윗면은 다각형 그물이고 옆면은 세로 기둥이다.">${textStyle('lp-col')}${s}${n}</svg>`;
}

// ---------- 그림 5: 철원과 제주 ----------
function bar(pct, label) {
  const x = 26, y = 248, w = 308;
  return `<rect x="${x}" y="${y}" width="${w}" height="10" fill="#3a4448"/><rect data-paddy="${pct}" x="${x}" y="${y}" width="${f1(w * pct / 100)}" height="10" fill="${PADDY_C}"/>` + plain(label, x, y - 6, DIM, 13, 'start');
}
function farmPanel(kind) {
  const { W, H, plat, base } = FARM;
  let s = `<rect width="${W}" height="${H}" fill="${SKY}"/>`, n = '';
  if (kind === 'cheorwon') {
    const surf = line(cwFarm, 0, W, 1), og = line(cwOld, 0, W, 2);
    let inner = `<rect width="${W}" height="${H}" fill="${OLD}"/>${foliation(W, H, 70, 14)}`;
    const lava = between(x => Math.min(cwOld(x), plat), cwOld, 0, W);
    let lv = `<polygon points="${pts(lava)}" fill="${BASALT}"/>`;
    for (let x = 4; x < W; x += 8) lv += `<path d="M${x} ${plat + 6}V${base}" stroke="${JOINT}" stroke-width="1"/>`;
    for (const y of [168, 188]) lv += `<path d="M0 ${y}H${W}" stroke="${CRUST}" stroke-width="1.2"/>`;
    inner += clipOf(lava, lv);
    inner += `<polygon points="${pts(between(x => Math.min(cwOld(x), plat), x => Math.min(cwOld(x), plat + 5), 0, W))}" fill="${SOIL}"/>`;
    s += clipOf([...surf, [W, base], [0, base]], inner);
    s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
    s += `<rect x="${CW_CANYON.x - CW_CANYON.half + 1}" y="${CW_CANYON.floor - 4}" width="${(CW_CANYON.half - 1) * 2}" height="4" fill="${WATER}"/>`;
    s += rice(140, CW_CANYON.x - CW_CANYON.half - 5, plat) + rice(CW_CANYON.x + CW_CANYON.half + 5, 262, plat);
    // 대지 가장자리의 저수지(둑으로 막은 못)
    s += `<rect x="108" y="${plat - 5}" width="26" height="5" fill="${WATER}"/><path d="M106 ${plat}V${plat - 6}M136 ${plat}V${plat - 6}" stroke="#d9d3c6" stroke-width="2.4"/>`;
    // 산지에서 흘러오는 하천
    s += arrowOn(cwFarm, 14, 102, -6, WATER_LIGHT) + arrowOn(cwFarm, 348, 268, -6, WATER_LIGHT);
    // 저수지와 양수장
    const px = CW_CANYON.x + CW_CANYON.half + 10;
    s += `<path d="M${CW_CANYON.x + 4} ${CW_CANYON.floor - 3}V${plat + 18}L${px} ${plat - 6}" stroke="#d9d3c6" stroke-width="2" fill="none"/><rect x="${px - 5}" y="${plat - 16}" width="12" height="10" fill="#d9d3c6" stroke="#1e1a18"/>`;
    n += say('paddy', '논', 172, plat - 16, NAME, 16);
    n += say('hills', '화강암, 편마암 산지', 60, 42, LIGHT, 13) + plain('산지', 320, 54, LIGHT, 13);
    n += plain('산지에서 하천이 흘러듦', 180, 30, WATER_LIGHT, 13);
    n += plain('저수지', 121, plat - 14, LIGHT, 12);
    n += plain('양수장', px + 2, plat - 22, LIGHT, 12);
    n += say('topsed', '기름진 퇴적층', 112, 182, LIGHT, 12) + lead(124, 172, 158, plat + 3);
    n += say('canyon', '한탄강', CW_CANYON.x, 214, WATER_LIGHT, 12);
    s += bar(PADDY.cheorwon, `농경지 가운데 논: 약 ${PADDY.cheorwon}%`);
  } else {
    const { sea, floor } = JEJU;
    const surf = line(jejuY, 0, W, 1);
    let inner = `<rect width="${W}" height="${H}" fill="${BASALT}"/>`;
    for (let x = 6; x < W; x += 9) inner += `<path d="M${x} 60V${base}" stroke="${JOINT}" stroke-width="1" stroke-dasharray="7 3"/>`;
    for (const y of [120, 160, 196]) inner += `<path d="M0 ${y}H${W}" stroke="${CRUST}" stroke-width="1.1"/>`;
    // 땅속 지하수(민물)
    inner += `<path d="M0 ${sea + 4}Q${JEJU.cx} ${sea - 24} ${W} ${sea + 4}V${base}H0Z" fill="${WATER}" opacity="0.35"/>`;
    s += `<rect x="0" y="${sea}" width="${W}" height="${base - sea}" fill="${WATER}"/>`;
    s += clipOf([...surf, [W, base], [0, base]], inner);
    s += `<polyline points="${pts(surf)}" fill="none" stroke="#1e1a18" stroke-width="2"/>`;
    s += `<path d="M0 ${sea}H${W}" stroke="${WATER_LIGHT}" stroke-width="1.2"/>`;
    // 비와 스며드는 물
    let rain = ''; for (let x = 70; x < 300; x += 16) rain += `M${x} ${54 + 8 * hash(x, 1)}l-4 9`;
    s += `<path d="${rain}" stroke="${WATER_LIGHT}" stroke-width="1.6" stroke-linecap="round"/>`;
    for (const x of [104, 150, 214, 254]) { const y = jejuY(x); s += `<path d="M${x} ${f1(y + 4)}V${f1(y + 36)}" stroke="${WATER_LIGHT}" stroke-width="2" stroke-dasharray="3 3"/>` + arrow(x, y + 34, x, y + 44, WATER_LIGHT, 2, 4); }
    // 해안으로 흐르는 지하수와 용천
    const [cl, cr] = jejuCoast();
    s += arrow(110, sea - 6, cl + 14, sea - 2, WATER_LIGHT, 2, 4.5) + arrow(250, sea - 6, cr - 14, sea - 2, WATER_LIGHT, 2, 4.5);
    for (const cx of [cl, cr]) s += arrow(cx, sea + 2, cx, sea - 14, WATER_LIGHT, 2.4, 5);
    // 건천: 마른 물길
    s += `<polyline points="${pts(line(x => jejuY(x) - 3, 128, 166, 2))}" fill="none" stroke="${GRAVEL}" stroke-width="2" stroke-dasharray="4 3"/>`;
    // 하논 화구의 작은 논
    s += rice(286, 298, jejuY(292));
    n += say('jejuRock', '섬 전체가 화산암', 180, 30, NAME, 15);
    n += say('dry', '건천', 120, 100, LIGHT, 14) + lead(126, 108, 146, jejuY(146) - 4);
    n += plain('물이 틈으로 스며듦', 196, 150, WATER_LIGHT, 12);
    n += say('spring', '용천', cl + 4, sea - 22, WATER_LIGHT, 13) + say('spring', '용천', cr - 4, sea - 22, WATER_LIGHT, 13);
    n += plain('하논', 322, jejuY(292) - 10, LIGHT, 12);
    n += plain('땅속 지하수', 180, 206, LIGHT, 12);
    s += bar(PADDY.jeju, `농경지 가운데 논: 약 ${PADDY.jeju}%`);
    void floor;
  }
  return `<svg class="lp-farm" data-kind="${kind}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind === 'cheorwon' ? '철원 용암대지를 가로로 자른 단면. 둘레 산지에서 하천이 흘러들고 대지 위가 논이다.' : '제주도를 가로로 자른 단면. 빗물이 땅속으로 스며들어 하천이 마르고 해안에서 용천으로 솟는다.'}">${textStyle('lp-farm')}${s}${n}</svg>`;
}

const sw = inner => `<svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">${inner}</svg>`;
const LEGEND = [
  [`<rect width="22" height="14" fill="${BASALT}"/><path d="M7 0V14M15 0V14" stroke="${JOINT}" stroke-width="1"/><path d="M0 7H22" stroke="${CRUST}" stroke-width="1.2"/>`, '현무암 용암층과 주상절리'],
  [`<rect width="22" height="14" fill="${OLD}"/><path d="M0 9Q11 3 22 8" stroke="${OLD_LINE}" stroke-width="1.2" fill="none"/>`, '화강암, 편마암(옛 땅)'],
  [`<rect width="22" height="14" fill="${GRAVEL}"/><circle cx="5" cy="5" r="1.1" fill="${GRAVEL_DOT}"/><circle cx="14" cy="9" r="1.1" fill="${GRAVEL_DOT}"/>`, '옛 하천 자갈층(백의리층)'],
  [`<rect width="22" height="14" fill="${SOIL}"/>`, '대지 위 퇴적층'],
  [`<rect width="22" height="14" fill="${SED}"/><path d="M0 5H22M0 10H22" stroke="${SED_LINE}" stroke-width="0.9"/>`, '호수 퇴적층'],
  [`<rect width="22" height="14" fill="${MAGMA}"/>`, '마그마, 뜨거운 용암'],
  [`<rect width="22" height="14" fill="${SCORIA}"/>`, '스코리아(분석구)'],
  [`<rect width="22" height="14" fill="${WATER}"/>`, '물'],
  [`<rect width="22" height="14" fill="${PADDY_C}"/>`, '논'],
];

// 화면 전체 HTML(그림과 설명). zone과 zoneAt은 누른 이름과 그 그림.
// phone: 좁은 화면(640px 이하)에서는 넓은 단면의 글자를 키운다.
export function pageHTML({ stage = CANYON_CUT, steps = true, zone = null, zoneAt = 'sec', phone = false } = {}) {
  clipN = 0;
  const buttons = steps ? `<div class="row" aria-label="단면 단계">${STAGE_NAMES.map((t, i) => `<button data-schem-stage="${i}" class="${i === stage ? 'on' : ''}">${i + 1}. ${t}</button>`).join('')}</div>` : '';
  const note = (where, fallback) => `<p class="schem-note">${zone && zoneAt === where ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : fallback}</p>`;
  return `
    <h2>열하 분출과 중심 분출 (모식도)</h2>
    <div class="schem-duo"><figure>${eruptPanel('fissure')}<figcaption>열하 분출: 긴 틈에서 용암이 나옴</figcaption></figure><figure>${eruptPanel('central')}<figcaption>중심 분출: 한 화구에서 분출함</figcaption></figure></div>
    ${note('erupt', ERUPT_NOTE)}
    <h2>용암대지가 생기고 협곡이 깎이는 차례 (모식도)</h2>
    ${buttons}
    <figure>${section(stage, phone)}</figure>
    ${note('sec', NOTES[stage])}
    <h2>막힌 지류의 호수와 물러나는 폭포 (종단면 모식도)</h2>
    <div class="schem-duo">${TRIB_NAMES.map((t, i) => `<figure>${tribPanel(i)}<figcaption>${i + 1}. ${t}</figcaption></figure>`).join('')}</div>
    ${note('trib', TRIB_NOTE)}
    <h2>주상절리가 생기는 원리 (모식도)</h2>
    <div class="schem-duo"><figure>${colView()}<figcaption>윗면: 수축 중심과 다각형 틈</figcaption></figure><figure>${colBlock()}<figcaption>옆에서 보면: 세로로 긴 기둥</figcaption></figure></div>
    ${note('col', COL_NOTE)}
    <h2>철원과 제주: 같은 현무암, 다른 농사 (모식도)</h2>
    <div class="schem-duo"><figure>${farmPanel('cheorwon')}<figcaption>철원 용암대지: 논이 많음</figcaption></figure><figure>${farmPanel('jeju')}<figcaption>제주도: 논이 거의 없음</figcaption></figure></div>
    ${note('farm', FARM_NOTE)}
    <h2>우리나라 사례</h2>
    ${exampleList()}
    <div class="schem-legend">${LEGEND.map(([q, t]) => `<span>${sw(q)}${t}</span>`).join('')}</div>
    <p class="schem-cap">${CAPTION}</p>`;
}

const WHERE = { 'lp-erupt': 'erupt', 'lp-sec': 'sec', 'lp-trib': 'trib', 'lp-col': 'col', 'lp-farm': 'farm' };
// options.steps: 단면 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 이름을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? CANYON_CUT, zone = null, zoneAt = 'sec';
  const onZone = options.onZone ?? (() => {});
  const mq = typeof matchMedia === 'function' ? matchMedia('(max-width:640px)') : null;
  const paint = () => { root.innerHTML = pageHTML({ stage, steps: options.steps !== false, zone, zoneAt, phone: !!mq?.matches }); };
  mq?.addEventListener?.('change', paint);
  root.addEventListener('click', e => {
    const s = e.target.closest('[data-schem-stage]');
    if (s) { stage = +s.dataset.schemStage; zone = null; paint(); return; }
    const z = e.target.closest('[data-zone]');
    if (!z) return;
    const svg = z.closest('svg'), where = WHERE[[...svg.classList].find(c => WHERE[c])] ?? 'sec';
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
