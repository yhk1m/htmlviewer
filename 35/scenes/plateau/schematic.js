// © 2026 김용현
// 고위 평탄면과 저위 평탄면 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 오랜 침식으로 평탄해진 땅, 1은 경동성 요곡 운동, 2는 하천의 하각과 고위 평탄면, 3은 저위 평탄면이다.
// 단면은 서쪽(왼쪽, A)에서 동쪽(오른쪽, B, 동해)으로 자른다. 높이 z는 해수면 위로 잰 값(단면 픽셀)이다.

export const ZONE_TEXT = {
  high: { name: '고위 평탄면', text: '높은 산지의 꼭대기와 능선에 남은 기복이 작고 완만한 땅입니다. 땅이 솟아오르기 전부터 있던, 오랜 침식으로 평평해졌던 땅이 솟은 뒤 오랫동안 깎이면서도 일부 남은 것으로 봅니다. 고위 침식면 또는 고기 삭박면이라고도 부릅니다. 태백산맥과 소백산맥 둘레의 해발 약 900m가 넘는 꼭대기와 능선(오대산, 가리왕산, 함백산, 태백산 등)에 많고, 대관령(평창) 둘레의 황병산 꼭대기와 이어진 능선이 대표적인 예입니다. 땅이 서쪽으로 기울어 솟았기 때문에 서쪽으로 갈수록 점점 낮은 곳에 나타납니다.' },
  low: { name: '저위 평탄면', text: '고위 평탄면보다 낮은 곳에 남은 완만하고 기복이 작은 침식면입니다. 고위 평탄면이 비탈과 하천에 깎여 허물어진 뒤 낮은 곳에 생긴 것으로, 이 그림에서는 융기가 멈춘 동안 하천이 옆으로 넓게 깎아 만든 땅이 다시 솟아 계단처럼 남은 모습으로 그렸습니다. 저위 침식면 또는 신기 삭박면이라고도 부릅니다. 경기 이천과 여주, 전북 김제와 정읍처럼 꼭대기 높이가 비슷한 낮은 구릉이 넓게 이어진 곳이 예입니다. 하안 단구보다 훨씬 넓게 펼쳐진 침식면이며, 하천이 쌓은 둥근 자갈층이 덮인 하안 단구와는 구별합니다.' },
  scarp: { name: '동쪽 급경사', text: '동쪽이 크게 솟아 동해 쪽으로 급하게 떨어지는 비탈입니다. 동해안에서 산지 꼭대기까지 거리는 짧지만 길이 아주 가파릅니다.' },
  gentle: { name: '서쪽 완만한 비탈', text: '서쪽은 조금 솟아 서쪽으로 길고 완만하게 낮아집니다. 그래서 우리나라의 큰 하천은 대부분 서쪽이나 남쪽으로 흘러 서해와 남해로 들어갑니다.' },
  valley: { name: '깊은 골짜기', text: '땅이 솟아 높아지자 하천이 바닥을 아래로 깊이 깎아 판 골짜기입니다. 하천이 바닥을 아래로 깎는 일을 하각이라고 합니다.' },
  eastRiver: { name: '동해로 흐르는 짧고 급한 하천', text: '분수계에서 동해까지 거리가 짧고 비탈이 급해 하천이 짧고 물살이 빠릅니다. 급경사를 깎아 들어가며 좁은 골짜기를 만듭니다.' },
  westRiver: { name: '서쪽으로 흐르는 길고 완만한 하천', text: '분수계 서쪽의 하천은 완만한 비탈을 따라 멀리 흘러갑니다. 길이가 길고 흐름이 느린 편입니다.' },
  use: { name: '고랭지 밭과 목장', text: '고위 평탄면은 높아서 여름에도 서늘하고 땅이 평평합니다. 그래서 서늘한 여름 날씨를 이용해 배추, 무 같은 고랭지 채소를 기르고, 목장을 만들어 소와 양을 기릅니다. 바람이 세서 풍력 발전기도 많이 세웁니다. 대관령(평창)이 대표적입니다.' },
  flat: { name: '오랜 침식으로 평탄해진 땅', text: '아주 오랜 시간 비와 하천에 깎여 산이 낮아지고 평평해진 땅입니다. 낮은 구릉 사이로 하천이 굽이쳐 흐릅니다.' },
  uplift: { name: '경동성 요곡 융기(경동성 요곡 운동)', text: '땅이 끊어지지 않고 넓게 휘어 솟아오르는데(요곡 융기), 솟는 축이 한쪽에 치우쳐 땅이 기우는 움직임입니다. 우리나라는 중생대 백악기 이후 평탄해졌던 땅이 신생대 제3기 중반이나 후반부터 지금까지 동해 쪽을 축으로 솟아, 동쪽이 크게, 서쪽이 조금 솟아 서쪽으로 기울었습니다(동고서저). 솟은 까닭이 잡아당기는 힘인지 미는 힘인지, 동해 쪽에 단층이 있는지는 아직 논란이 있습니다.' },
  divide: { name: '분수계', text: '빗물이 동쪽과 서쪽으로 갈라져 흐르는 경계입니다. 크게 솟은 동쪽 가까이에 있어, 분수계에서 동해까지는 가깝고 서해까지는 멉니다.' },
  knick: { name: '급경사 지점', text: '하천 바닥을 따라 보았을 때 경사가 갑자기 급해지는 곳으로, 천이점이라고도 합니다. 땅이 솟으면 하천은 하류부터 깎기 시작하고, 이 지점이 점점 상류로 거슬러 오릅니다. 아직 이 지점이 닿지 않은 상류의 높은 곳에는 옛 평탄한 땅이 남습니다.' },
  sea: { name: '동해', text: '크게 솟은 동쪽 가장자리가 동해와 만납니다. 바닷가 가까이까지 산지가 다가와 있어 해안 평야가 좁습니다.' },
};

export const STAGE_NAMES = ['오랜 침식으로 평탄해진 땅', '경동성 요곡 융기', '하천의 하각과 고위 평탄면', '저위 평탄면'];
export const FLAT = 0, TILT = 1, CUT = 2, LOW = 3;
export const NOTES = [
  '오랜 침식으로 평탄해진 땅: 아주 오랜 시간 비와 하천에 깎여 산이 낮아지고, 낮은 구릉 사이로 하천이 굽이쳐 흐르는 평평한 땅이 되었습니다. 땅은 아직 해수면보다 조금 높을 뿐입니다.',
  '경동성 요곡 융기: 땅이 한쪽으로 기울며 휘어 솟아올랐습니다. 동쪽은 크게, 서쪽은 조금 솟아, 동쪽은 동해로 급하게 떨어지는 급경사가 되고 서쪽은 길고 완만한 비탈이 되었습니다. 평평하던 땅도 함께 높이 들렸습니다.',
  '하천의 하각과 고위 평탄면: 땅이 높아지자 하천이 바닥을 깊이 깎아 골짜기를 팠습니다. 깎는 일은 하류에서 시작되고, 하천 바닥을 따라 본 급경사 지점(천이점)이 상류로 거슬러 오르므로, 하천이 아직 파고들지 못한 분수계 가까운 높은 곳에는 옛 평탄한 땅이 남았습니다. 이것이 고위 평탄면이고, 고위 침식면 또는 고기 삭박면이라고도 부릅니다.',
  '저위 평탄면: 융기가 잠시 멈춘 동안 하천은 아래로 파기보다 옆으로 넓게 깎아 골짜기 사이의 낮은 곳까지 넓고 평평한 땅을 만들었습니다. 그 뒤 땅이 다시 솟자 하천이 다시 파고들어, 이 땅은 고위 평탄면보다 낮은 곳에 계단처럼 남았습니다. 이것이 저위 평탄면이고, 신기 삭박면이라고도 부릅니다. 한편, 고위 평탄면인 대관령(평창) 둘레는 고랭지 배추밭과 목장으로, 둘레 능선은 풍력 발전 단지로 쓰입니다.',
];
export const CAPTION = '이름을 누르면 설명이 나옵니다. 높이는 실제보다 크게 과장했고, 땅의 모양과 크기는 설명을 위한 예시입니다. 고위 평탄면과 저위 평탄면의 형성 시기와 원인에는 다른 해석도 있습니다. 산꼭대기의 완만한 땅은 솟기 전의 옛 땅이 아니라 단단한 암석과 무른 암석이 깎이는 차이로 생겼다는 주장이 있고, 오늘날 땅이 깎이는 빠르기로 보면 아주 오래된 땅이 그대로 남아 있기 어렵다는 견해도 있습니다.';

const SEA = '#3f8fc4', LAND = '#5a7346', DARK = '#3f5733', AIR = '#23302a', ROCK = '#57524b', GRASS = '#6d8a4a', ACCENT = '#e4b15a';
const RIVER = '#4aa3dc', SCARP_C = '#6b5a45';
export const HIGH_C = '#e3c766', LOW_C = '#9fd38a';
const f1 = v => v.toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------- 단면 ----------
export const SEC = { W: 720, H: 360, sea: 300 }; // sea: 해수면의 단면 y
export const sy = z => SEC.sea - z; // 높이를 단면 y로
export const DIV = 590, COAST = 680, COAST0 = 676, BASE = 24;
export const KNICK_X = 434; // 급경사 지점(하각이 여기까지 거슬러 올라왔다)
export const LIFT2 = 1.18; // 두 번째 융기까지 합한 융기 배율
// 서쪽 끝 0, 분수계 1. 서쪽은 완만하게, 분수계 가까이는 거의 평평하게 오른다.
const g = t => t * (1.6 - 0.6 * t);
export const uplift = (x, k = 1) => k * (16 + 150 * g(clamp(x / DIV, 0, 1)));
const hill = x => 3 * Math.sin(x / 29) + 2 * Math.sin(x / 11 + 1.2);
// 휘어 솟은 옛 평탄면. k=0은 솟기 전. bumps=false는 낮은 구릉을 뺀 고른 면(점선용).
export function warped(x, k, bumps = true) {
  const top = xx => BASE + (bumps ? hill(xx) : 0) + (k ? uplift(xx, k) : 0);
  if (k === 0) {
    if (x <= 630) return top(x);
    if (x <= COAST0) return top(630) * (1 - (x - 630) / (COAST0 - 630));
    return -(x - COAST0) * 0.9;
  }
  if (x <= DIV) return top(x);
  if (x <= COAST) return top(DIV) * (0.5 + 0.5 * Math.cos(Math.PI * (x - DIV) / (COAST - DIV)));
  return -(x - COAST) * 0.9;
}
// 서쪽 하천이 판 골짜기(단면이 지나는 곳). 동쪽으로 갈수록(더 크게 솟은 곳) 깊다.
export const VALLEYS = [{ x: 118, d: 30, w: 40 }, { x: 255, d: 60, w: 50 }, { x: 378, d: 80, w: 48 }];
const lower = x => 22 * clamp((KNICK_X - x) / 50, 0, 1); // 골짜기 사이 능선도 조금 낮아졌다
const notch = x => VALLEYS.reduce((s, v) => s + v.d * Math.max(0, 1 - Math.abs(x - v.x) / v.w) ** 1.2, 0);
// 저위 평탄면: 융기가 멈춘 동안 두 골짜기와 그 사이 능선까지 옆으로 넓게 깎여 생긴 넓은 침식면(LOW_A부터 LOW_B까지).
// 다시 솟은 뒤 하천이 좁은 골짜기(nh)를 새로 파서, 넓은 면이 골짜기 사이사이에 남는다.
export const LOW_A = 212, LOW_B = 420;
export const BENCHES = [{ x: 255, nh: 12 }, { x: 378, nh: 12 }];
const z2 = x => (x <= DIV ? warped(x, 1) - lower(x) - notch(x) : warped(x, 1));
const z3pre = x => z2(x) + (warped(x, LIFT2, false) - warped(x, 1, false));
function z3(x) {
  let z = z3pre(x);
  // 면의 높이: 두 골짜기 바닥을 잇는 선(서쪽으로 아주 조금 낮다)
  const a = BENCHES[0], b = BENCHES[1], La = z3pre(a.x), Lb = z3pre(b.x);
  const L = La + (Lb - La) * (clamp(x, LOW_A, LOW_B) - a.x) / (b.x - a.x);
  z = Math.min(z, L + Math.max(0, LOW_A - x, x - LOW_B) * 5);
  for (const v of VALLEYS) {
    const b = BENCHES.find(k => k.x === v.x);
    const nh = b ? b.nh : 10, nd = b ? z3pre(v.x) - z2(v.x) + 12 : 10;
    z -= nd * Math.max(0, 1 - Math.abs(x - v.x) / nh) ** 1.1;
  }
  return z;
}
// 단계별 땅 높이(해수면 위, 단면 픽셀)
export function heightAt(x, stage) {
  if (stage === FLAT) return warped(x, 0) - 7 * Math.max(0, 1 - Math.abs(x - 170) / 16) - 7 * Math.max(0, 1 - Math.abs(x - 405) / 16);
  if (stage === TILT) return warped(x, 1);
  if (stage === CUT) return z2(x);
  return z3(x);
}
// 고위 평탄면이 남은 구간(단면 x)과 저위 평탄면 구간
export const HIGH_X = [KNICK_X + 20, DIV - 8];
export const lowRanges = () => { const [a, b] = BENCHES; return [[LOW_A + 3, a.x - a.nh - 3], [a.x + a.nh + 3, b.x - b.nh - 3], [b.x + b.nh + 3, LOW_B - 3]]; };

function section(stage) {
  const { W, H } = SEC;
  const say = (zone, text, x, y, color = '#f3f1ea', size = 18, anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  const plain = (text, x, y, color = '#f3f1ea', size = 15, anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" font-size="${size}" font-weight="700" fill="${color}">${text}</text>`;
  const ground = [];
  for (let x = 0; x <= W; x += 2) ground.push([x, sy(heightAt(x, stage))]);
  const pts = arr => arr.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
  const gy = x => sy(heightAt(x, stage));
  const coast = stage === FLAT ? COAST0 : COAST;
  const seg = (a, b) => ground.filter(([x]) => x >= a && x <= b);
  let extra = '', names = '';
  // 육지의 풀빛 윗면(해수면 위만)
  extra += `<polyline points="${pts(seg(0, coast - 2))}" fill="none" stroke="${GRASS}" stroke-width="6" stroke-linejoin="round"/>`;
  const oldLine = k => { const p = []; for (let x = 0; x <= COAST; x += 4) p.push([x, sy(warped(x, k, false))]); return p; };
  if (stage === FLAT) {
    // 굽이쳐 흐르는 하천이 단면을 지나는 곳(얕은 물길)
    for (const x of [170, 405]) extra += `<rect x="${x - 9}" y="${f1(gy(x) - 2)}" width="18" height="4" fill="${RIVER}"/>`;
    names += say('flat', '오랜 침식으로 평탄해진 땅', 330, sy(BASE) - 64, '#f6ead0', 20);
    extra += `<path d="M330 ${f1(sy(BASE) - 56)}V${f1(sy(BASE) - 14)}" stroke="#f6ead0" stroke-width="1.6"/>`;
    names += plain('낮은 구릉', 250, sy(BASE) - 18, '#dfe7c8', 14);
    names += plain('굽이쳐 흐르는 하천', 170, sy(BASE) + 30, '#d8efff', 15) + plain('하천', 405, sy(BASE) + 30, '#d8efff', 15);
    names += plain('땅이 해수면보다 조금만 높습니다', 330, sy(BASE) - 104, '#c9c6b8', 15);
  }
  if (stage === TILT) {
    // 솟기 전 땅(점선)과 솟은 정도(화살표, 동쪽이 크다)
    const before = []; for (let x = 0; x <= COAST0; x += 4) before.push([x, sy(warped(x, 0, false))]);
    extra += `<polyline points="${pts(before)}" fill="none" stroke="#f3f1ea" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.8"/>`;
    names += plain('솟기 전 땅', 170, sy(BASE) + 22, '#e6e2d4', 14);
    // 화살표는 솟기 전 높이에서 솟은 뒤 높이까지. 동쪽일수록 길다.
    for (const x of [80, 230, 380, 500]) {
      const y0 = sy(BASE) - 3, y1 = sy(BASE + uplift(x)) + 12, w = f1(2.5 + uplift(x) / 40);
      extra += `<path data-arrow="${x}" d="M${x} ${f1(y0)}V${f1(y1 + 8)}" stroke="${ACCENT}" stroke-width="${w}" stroke-linecap="round"/><path d="M${x - 9} ${f1(y1 + 12)}L${x} ${f1(y1)}L${x + 9} ${f1(y1 + 12)}Z" fill="${ACCENT}"/>`;
    }
    names += say('uplift', '조금 솟음', 92, sy(BASE) - 20, ACCENT, 16, 'start');
    names += say('uplift', '크게 솟음', 488, sy(BASE) - 40, ACCENT, 16, 'end');
    names += say('gentle', '서쪽 완만한 비탈', 230, gy(230) - 30, '#f6ead0', 18);
    names += say('scarp', '동쪽 급경사', 612, gy(630) + 6, '#f2c9a8', 18, 'end');
    extra += `<path d="M616 ${f1(gy(630))}L628 ${f1(gy(630))}" stroke="#f2c9a8" stroke-width="1.6"/>`;
    names += say('uplift', '경동성 요곡 융기', 330, 36, ACCENT, 20);
    names += plain('동쪽이 크게, 서쪽이 조금 솟아 땅이 서쪽으로 기울었습니다', 330, 60, '#e6e2d4', 14);
  }
  if (stage >= CUT) {
    const k = stage === LOW ? LIFT2 : 1;
    const old = oldLine(k).filter(([x]) => x <= DIV + 18);
    extra += `<polyline points="${pts(old)}" fill="none" stroke="#f3f1ea" stroke-width="1.6" stroke-dasharray="5 5" opacity="0.75"/>`;
    names += plain('옛 평탄면 자리(점선)', 150, sy(warped(150, k, false)) - 12, '#e6e2d4', 14);
    // 고위 평탄면: 옛 평탄면이 그대로 남은 높은 곳
    const hi = seg(HIGH_X[0], HIGH_X[1]);
    extra += `<polyline data-high="1" points="${pts(hi)}" fill="none" stroke="${HIGH_C}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    const hx = (HIGH_X[0] + HIGH_X[1]) / 2;
    names += stage === LOW ? say('high', '고위 평탄면', 478, gy(478) - 26, HIGH_C, 20) : say('high', '고위 평탄면', hx, gy(hx) - 22, HIGH_C, 20);
    // 골짜기 바닥의 물
    for (const v of VALLEYS) extra += `<circle cx="${v.x}" cy="${f1(gy(v.x) - 2)}" r="3.2" fill="${RIVER}"/>`;
    names += say('valley', '깊은 골짜기', 300, gy(378) + 26, '#f3f1ea', 17);
    extra += `<path d="M340 ${f1(gy(378) + 12)}L370 ${f1(gy(378) - 2)}" stroke="#f3f1ea" stroke-width="1.5"/>`;
    // 분수계
    const dz = gy(DIV + 4);
    extra += `<path d="M${DIV + 4} ${f1(dz - 6)}V${f1(dz - 36)}" stroke="#f3f1ea" stroke-width="1.6" stroke-dasharray="3 3"/>`;
    names += say('divide', '분수계', DIV + 14, dz - 8, '#f3f1ea', 15, 'start');
    // 동쪽: 짧고 급한 하천이 급경사를 깎는다.
    const er = []; for (let x = DIV + 14; x <= COAST; x += 3) er.push([x, gy(x) + 3]);
    extra += `<polyline points="${pts(er)}" fill="none" stroke="${RIVER}" stroke-width="3" stroke-linecap="round"/>`;
    names += say('scarp', '동쪽 급경사', 618, gy(624) + 6 + (stage === LOW ? 18 : 0), '#f2c9a8', 15, 'end');
    names += say('eastRiver', '동해로 짧고 급한 하천', 640, gy(650) + 6, '#d8efff', 15, 'end');
    extra += `<path d="M621 ${f1(gy(624) + 1 + (stage === LOW ? 18 : 0))}H${f1(624 - 3 + (stage === LOW ? 6 : 0))}M643 ${f1(gy(650) + 1)}H${f1(650 - 2)}" stroke="#f3f1ea" stroke-width="1.4"/>`;
    // 서쪽: 길고 완만한 하천이 서쪽으로 흐른다(화살표).
    const wy0 = sy(4), wy1 = sy(8);
    extra += `<path d="M420 ${f1(wy1)}L40 ${f1(wy0)}" stroke="#d8efff" stroke-width="2.2"/><path d="M52 ${f1(wy0 - 7)}L38 ${f1(wy0)}L52 ${f1(wy0 + 7)}" fill="none" stroke="#d8efff" stroke-width="2.2"/>`;
    names += say('westRiver', '서쪽으로 길고 완만하게 흐르는 하천', 60, wy0 + 24, '#d8efff', 15, 'start');
    if (stage === CUT) {
      // 급경사 지점: 하각이 하류(서쪽)에서 상류(동쪽)로 거슬러 오른다.
      const ky = gy(KNICK_X - 8);
      extra += `<circle cx="${KNICK_X - 8}" cy="${f1(ky)}" r="5" fill="none" stroke="#ffffff" stroke-width="2.2"/>`;
      extra += `<path d="M${KNICK_X - 4} ${f1(ky + 26)}H${KNICK_X + 44}M${KNICK_X + 36} ${f1(ky + 20)}L${KNICK_X + 44} ${f1(ky + 26)}L${KNICK_X + 36} ${f1(ky + 32)}" fill="none" stroke="#ffffff" stroke-width="2"/>`;
      names += say('knick', '급경사 지점', KNICK_X - 20, ky + 4, '#ffffff', 15, 'end');
      names += plain('상류로 이동', KNICK_X + 20, ky + 50, '#ffffff', 13);
    }
    if (stage === LOW) {
      for (const [a, b] of lowRanges()) extra += `<polyline data-low="1" points="${pts(seg(a, b))}" fill="none" stroke="${LOW_C}" stroke-width="6" stroke-linecap="round"/>`;
      const lm = (BENCHES[0].x + BENCHES[1].x) / 2;
      names += say('low', '저위 평탄면', lm, gy(lm) - 16, LOW_C, 18);
      // 고위 평탄면의 이용: 고랭지 밭(줄지은 포기)과 풍력 발전기
      let crop = '';
      for (let x = HIGH_X[0] + 6; x < 486; x += 7) crop += `<circle cx="${x}" cy="${f1(gy(x) - 6)}" r="2.6"/>`;
      extra += `<g fill="#9cd36a">${crop}</g>`;
      for (let x = 512; x < 548; x += 9) extra += `<path d="M${x} ${f1(gy(x) - 3)}v-8" stroke="#d8c8a0" stroke-width="1.6"/>`;
      extra += `<path d="M512 ${f1(gy(512) - 8)}L548 ${f1(gy(548) - 8)}" stroke="#d8c8a0" stroke-width="1.2"/>`;
      for (const x of [552, 574]) {
        const by = gy(x) - 2, ty = by - 28;
        extra += `<path d="M${x} ${f1(by)}V${f1(ty)}" stroke="#eeeeee" stroke-width="2"/>`;
        for (const a of [0, 120, 240]) { const r = a * Math.PI / 180; extra += `<path d="M${x} ${f1(ty)}l${f1(Math.sin(r) * 14)} ${f1(-Math.cos(r) * 14)}" stroke="#eeeeee" stroke-width="2.2" stroke-linecap="round"/>`; }
      }
      names += say('use', '고위 평탄면: 고랭지 밭, 목장', 516, gy(516) + 30, '#cfe8a8', 14);
      names += say('use', '둘레 능선: 풍력 발전', 516, gy(516) + 48, '#cfe8a8', 14);
    }
  }
  names += say('sea', '동해', W - 22, sy(0) + 34, '#ffffff', 18);
  return `<svg class="sec" viewBox="0 0 ${W} ${H}" role="img" aria-label="땅을 서쪽(A)에서 동쪽(B, 동해)으로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${W}" height="${H}" fill="${AIR}"/>
    <rect data-sea="1" x="${coast - 30}" y="${SEC.sea}" width="${W - coast + 30}" height="${H - SEC.sea}" fill="${SEA}"/>
    <polygon points="0,${H} ${pts(ground)} ${W},${H}" fill="${ROCK}"/>
    ${extra}
    ${names}
    <text x="10" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text><text x="34" y="25" font-size="15" font-weight="700" fill="#e6e2d4">서쪽</text>
    <text x="${W - 10}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text><text x="${W - 34}" y="25" text-anchor="end" font-size="15" font-weight="700" fill="#e6e2d4">동쪽</text>
    <text x="${W - 90}" y="${H - 12}" text-anchor="end" font-size="15" font-weight="700" fill="#efe9d8">높이를 크게 과장했습니다.</text>
  </svg>`;
}

// ---------- 평면(저위 평탄면까지 생긴 뒤) ----------
export const PLAN = { W: 720, H: 300 };
export const AB_Y = 150; // 단면 A-B선(평면 y)
// 서쪽으로 흐르는 하천: 가지 하천 셋이 A-B선을 단면의 골짜기 자리(118, 255, 378)에서 지나 큰 하천에 모인다.
export const TRIBS = [
  [[446, 34], [420, 80], [392, 118], [378, 150], [352, 200], [318, 240], [290, 262]],
  [[318, 26], [290, 70], [264, 112], [255, 150], [236, 200], [210, 240], [186, 258]],
  [[176, 36], [150, 84], [128, 120], [118, 150], [104, 196], [86, 236], [70, 256]],
];
const MAIN = [[432, 290], [380, 278], [330, 266], [290, 262], [240, 262], [186, 258], [130, 262], [70, 256], [0, 262]];
export const HIGH_PATCH = [[466, 22], [560, 16], [580, 60], [574, 140], [582, 220], [566, 282], [500, 290], [460, 264], [472, 212], [458, 150], [474, 100], [454, 58]];
export const divideX = y => DIV + 4 * Math.sin(y / 25);
const coastX = y => COAST + 5 * Math.sin(y / 19) + 3 * Math.sin(y / 7);
const pathOf = p => `M${p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`;
function smoothPath(p) {
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; d += `Q${f1(p[i][0])} ${f1(p[i][1])} ${f1(mx)} ${f1(my)}`; }
  const l = p.at(-1);
  return `${d}L${f1(l[0])} ${f1(l[1])}`;
}
const closedSmooth = p => { const q = [...p, p[0], p[1]]; let d = `M${f1((p[0][0] + p[1][0]) / 2)} ${f1((p[0][1] + p[1][1]) / 2)}`; for (let i = 1; i < q.length - 1; i++) { const mx = (q[i][0] + q[i + 1][0]) / 2, my = (q[i][1] + q[i + 1][1]) / 2; d += `Q${f1(q[i][0])} ${f1(q[i][1])} ${f1(mx)} ${f1(my)}`; } return `${d}Z`; };

// 저위 평탄면(평면): 가운데 두 가지 하천과 그 사이 능선까지 넓게 펼쳐진 낮은 침식면
export const LOW_PATCH = [[258, 98], [330, 92], [400, 104], [424, 150], [396, 206], [350, 242], [286, 248], [218, 250], [196, 214], [210, 158], [232, 114]];
function plan() {
  const { W, H } = PLAN;
  const L = (zone, text, x, y, color = '#f3f1ea', size = 17, extra = '') => `<text class="zone" data-zone="${zone}" x="${f1(x)}" y="${f1(y)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer"${extra}>${text}</text>`;
  const dv = [], cs = [];
  for (let y = 0; y <= H; y += 5) { dv.push([divideX(y), y]); cs.push([coastX(y), y]); }
  let body = `<rect width="${W}" height="${H}" fill="${LAND}"/>`;
  // 동쪽 급경사: 분수계에서 해안까지. 짧은 털 모양 선은 비탈이 동쪽으로 급하게 떨어짐을 나타낸다.
  body += `<path data-scarp="1" d="${pathOf(dv)}L${pathOf(cs.slice().reverse()).slice(1)}Z" fill="${SCARP_C}"/>`;
  let hach = '';
  for (let y = 6; y < H; y += 9) { const x = divideX(y); hach += `M${f1(x + 4)} ${y}h${16 + (y % 3) * 4}`; }
  body += `<path d="${hach}" stroke="#4a3e30" stroke-width="2"/>`;
  body += `<path d="${pathOf(cs)}L${W} ${H}L${W} 0Z" fill="${SEA}"/>`;
  // 고위 평탄면
  body += `<path data-high="1" d="${closedSmooth(HIGH_PATCH)}" fill="${HIGH_C}" opacity="0.85"/>`;
  // 저위 평탄면: 가운데 두 가지 하천 둘레의 넓은 땅
  body += `<path data-low="1" d="${closedSmooth(LOW_PATCH)}" fill="${LOW_C}" opacity="0.8"/>`;
  // 골짜기(어두운 띠)와 하천
  const rivers = [...TRIBS, MAIN];
  for (const r of rivers) body += `<path d="${smoothPath(r)}" fill="none" stroke="${DARK}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`;
  for (const r of rivers) body += `<path d="${smoothPath(r)}" fill="none" stroke="${RIVER}" stroke-width="${r === MAIN ? 4 : 3}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // 고위 평탄면 위를 얕게 흐르는 물줄기(아직 깊이 파이지 않았다)
  body += `<path d="${smoothPath([[566, 128], [530, 112], [512, 80], [480, 66], [446, 34]])}" fill="none" stroke="${RIVER}" stroke-width="2"/>`;
  // 흐르는 방향(서쪽 가지 하천 쪽으로)
  for (const [x, y, ang] of [[540, 116, -160], [496, 70, -150]]) body += `<path d="M6 -5L0 0L6 5" transform="translate(${x} ${y}) rotate(${ang + 180})" fill="none" stroke="${RIVER}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  // 동해로 흐르는 짧은 하천
  for (const y of [40, 100, 160, 220, 270]) body += `<path d="M${f1(divideX(y) + 6)} ${y}L${f1(coastX(y + 6))} ${y + 6}" stroke="${RIVER}" stroke-width="2.4" stroke-linecap="round"/>`;
  // 분수계
  body += `<path data-divide="1" d="${pathOf(dv)}" fill="none" stroke="#f3f1ea" stroke-width="2.2" stroke-dasharray="7 5"/>`;
  let names = '';
  names += L('high', '고위 평탄면', 520, 200, '#3b3020', 18).replace('stroke="#1c211e"', 'stroke="#f6ead0"');
  names += L('use', '고랭지 밭, 목장', 520, 222, '#3b3020', 13).replace('stroke="#1c211e"', 'stroke="#f6ead0"');
  names += L('low', '저위 평탄면', 296, 206, '#1f3a1a', 16).replace('stroke="#1c211e"', 'stroke="#dff2d2"');
  names += L('valley', '깊은 골짜기', 150, 290, '#f3f1ea', 15);
  names += L('westRiver', '서쪽으로 흐르는 하천', 330, 296, '#d8efff', 14);
  names += L('divide', '분수계', divideX(14) - 30, 18, '#f3f1ea', 15);
  names += L('scarp', '동쪽 급경사', 636, 196, '#f2c9a8', 14);
  names += L('sea', '동해', 702, 70, '#ffffff', 15);
  // 북쪽 표시
  const compass = `<g transform="translate(26 40)"><path d="M0 -14L6 4L0 0L-6 4Z" fill="#f3f1ea"/><text y="22" text-anchor="middle" font-size="13" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3">북</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="위에서 본 모습. 오른쪽이 동쪽(동해), 위쪽이 북쪽이다. 분수계 가까이에 고위 평탄면, 서쪽 하천 둘레에 저위 평탄면, 분수계 동쪽에 급경사가 있다.">
    ${body}
    <line x1="8" y1="${AB_Y}" x2="${W - 8}" y2="${AB_Y}" stroke="${ACCENT}" stroke-width="2.2" stroke-dasharray="4 5"/>
    <text x="8" y="${AB_Y - 8}" font-size="18" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${W - 8}" y="${AB_Y - 8}" text-anchor="end" font-size="18" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}${compass}
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? LOW, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>서쪽에서 동쪽으로 자른 단면 (모식도)</h2>
      ${buttons}
      <figure>${section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <h2>위에서 본 오늘날 모습 (모식도)</h2>
      <figure>${plan()}</figure>
      <p class="schem-cap">${CAPTION} 평면의 A-B선을 자른 것이 위의 단면입니다.</p>`;
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
