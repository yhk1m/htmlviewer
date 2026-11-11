// © 2026 김용현
// 삼각주 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 하구의 모래톱, 1은 물길이 갈라짐, 2는 오늘날의 삼각주, 3은 조류가 강한 하구다. 평면의 A-B선과 단면은 같은 구역 경계(ZONES)를 쓴다.

export const ZONE_TEXT = {
  river: { name: '강', text: '산지에서 깎은 흙을 싣고 내려오는 강입니다. 바다에 닿으면 갑자기 느려져 흙을 더 옮기지 못합니다.' },
  bar: { name: '모래톱', text: '하구 바로 앞에 무거운 모래가 먼저 쌓인 곳입니다. 수면에 닿으면 물길을 막아 물이 양쪽으로 갈라집니다.' },
  branch: { name: '분류', text: '본류에서 여러 갈래로 갈라져 바다로 가는 물길입니다.' },
  island: { name: '하중도', text: '갈라진 물길 사이의 땅입니다. 가장자리는 물길에서 흙을 많이 받아 조금 높고, 가운데는 낮습니다.' },
  plain: { name: '삼각주 평원', text: '물 위로 드러난 낮고 평평한 땅입니다. 수면 가까이에서 자라므로 경사가 선상지보다 훨씬 완만합니다. 밀물 때도 잠기지 않는 안쪽은 상부 삼각주 평원, 밀물 때 잠기는 바다 쪽은 하부 삼각주 평원이라고 합니다. 땅이 기름져 논농사에 유리합니다.' },
  slope: { name: '삼각주 사면', text: '평원 앞의 물속 비탈입니다. 강이 가져온 흙이 비탈 앞쪽에 쌓이면서 삼각주가 바다 쪽으로 나아갑니다. 단면에서는 전면층이라고 합니다.' },
  prodelta: { name: '전삼각주', text: '비탈 앞 바다 바닥입니다. 물에 떠 멀리까지 온 고운 진흙이 얇게 쌓입니다. 단면에서는 기저층이라고 합니다.' },
  tide: { name: '조류', text: '밀물과 썰물 때 드나드는 바닷물의 흐름입니다. 조차가 크면 낮은 바닥의 흙을 가져가고, 남은 모래는 조류 방향으로 길쭉한 모래톱으로 쌓입니다. 이런 모래톱이 여럿 모인 것을 하구역 삼각주라고 합니다.' },
  mouth: { name: '하구역', text: '조류가 드나들며 바다 쪽으로 나팔처럼 넓게 열린 하구입니다. 조차가 큰 황해로 흐르는 한강, 금강, 영산강의 하구가 이렇습니다. 압록강 하구에는 이런 하구역 안에 삼각주가 자랐고, 금강 하구에는 물속에 잠긴 삼각주 모양의 넓은 조간대가 있습니다.' },
};

export const STAGE_NAMES = ['모래톱', '물길이 갈라짐', '오늘날 삼각주', '조류가 강한 곳'];
const NOTES = [
  '모래톱: 강물이 바다에 닿아 느려지면 무거운 모래는 하구 바로 앞에, 고운 진흙은 멀리 내려앉습니다.',
  '물길이 갈라짐: 모래톱이 수면에 닿으면 물이 양쪽으로 갈라집니다. 갈라진 물길 앞에 다시 모래톱이 쌓여 또 갈라집니다.',
  '오늘날 삼각주: 강이 쌓는 퇴적 속도가 파랑과 조류의 침식 속도보다 빠르면 평원이 바다 쪽으로 넓어집니다. 강, 파랑, 조류 가운데 어느 힘이 센지에 따라 새 발 모양, 둥근 부채꼴, 뾰족한 모양, 하구역 삼각주 등으로 모양이 달라집니다. 낙동강 하구의 김해 평야가 대표적입니다.',
  '조류가 강한 곳: 조류가 강하면 평원이 바다 쪽으로 튀어나오지 못하고 하구가 나팔처럼 넓게 열립니다(하구역). 그 안에 남은 모래는 조류 방향으로 길쭉한 모래톱이 되어 하구역 삼각주를 이루기도 합니다. 조차가 큰 황해로 흐르는 강에서 볼 수 있습니다.',
];

const SAND = '#e6cf90', MUD = '#6d5a48', WATER = '#59b7f0', SEA = '#3f8fc4', ACCENT = '#e4b15a', GRASS = '#8ea765', HILL = '#46603a', FIELD = '#b7bd6f', BASE = '#55524c', BROWN = '#9c7e52';
const f1 = v => v.toFixed(1);
const PLAN = { W: 720, H: 380, coast: 120, apex: { x: 360, y: 96 } };
export const CROSS_X = 360;

// 단계별 앞쪽 바닷가의 줄(평면의 y)과 평원, 사면, 전삼각주 경계. 평면과 단면이 같은 값을 쓴다.
export const ZONES = [
  { plainEnd: 118, slopeEnd: 170, prodeltaEnd: 250 },
  { plainEnd: 170, slopeEnd: 216, prodeltaEnd: 290 },
  { plainEnd: 250, slopeEnd: 294, prodeltaEnd: 360 },
  { plainEnd: 120, slopeEnd: 140, prodeltaEnd: 170 },
];

// 물길: 꼭짓점에서 갈라지는 나무 모양. [시작점, 끝점] 목록이다.
function branches(stage) {
  const a = PLAN.apex, end = ZONES[stage].plainEnd;
  if (stage === 0) return [[[a.x, 0], [a.x, 118]]];
  if (stage === 1) return [[[a.x, 0], [a.x, 126]], [[a.x, 126], [318, 172]], [[a.x, 126], [402, 172]]];
  if (stage === 2) {
    return [[[a.x, 0], [a.x, 128]], [[a.x, 128], [280, 188]], [[a.x, 128], [440, 188]], [[280, 188], [190, 232]], [[280, 188], [306, end]], [[440, 188], [414, end]], [[440, 188], [530, 232]]];
  }
  return [[[a.x, 0], [a.x, 136]]];
}
export const planBranches = branches;

// 평원의 앞쪽 바닷가 윤곽(x에 따른 y). 가운데가 바다 쪽으로 나온 부채꼴이다.
function frontAt(x, stage) {
  const end = ZONES[stage].plainEnd, half = [50, 110, 230, 60][stage], t = Math.min(1, Math.abs(x - PLAN.apex.x) / half);
  return PLAN.coast + (end - PLAN.coast) * (1 - t * t);
}
export const planFront = frontAt;

function plan(stage) {
  const z = ZONES[stage];
  const coast = [];
  for (let x = -10; x <= 730; x += 10) { const u = Math.abs(x - 360) / 360; coast.push(`${x} ${f1(PLAN.coast + 40 * u * u)}`); }
  const delta = [];
  for (let x = -10; x <= 730; x += 10) { const u = Math.abs(x - 360) / 360; delta.push(`${x} ${f1(Math.max(PLAN.coast + 40 * u * u, frontAt(x, stage)))}`); }
  // 사면과 전삼각주: 평원 앞을 띠로 칠한다.
  const band = d => { const p = []; for (let x = -10; x <= 730; x += 10) { const u = Math.abs(x - 360) / 360; p.push(`${x} ${f1(Math.max(PLAN.coast + 40 * u * u, frontAt(x, stage) + d * (1 - Math.min(1, ((x - 360) / 300) * ((x - 360) / 300)))))}`); } return p; };
  const L = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  const seaPoly = `M-10 ${PLAN.H}L${coast.join('L')}L730 ${PLAN.H}Z`;
  const mudBand = `M${band(z.prodeltaEnd - z.plainEnd).join('L')}L730 ${f1(PLAN.coast)}L-10 ${f1(PLAN.coast)}Z`;
  const slopeBand = `M${band(z.slopeEnd - z.plainEnd).join('L')}L730 ${f1(PLAN.coast)}L-10 ${f1(PLAN.coast)}Z`;
  const riv = branches(stage).map(([a, b], n) => `<line data-branch="${n}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${WATER}" stroke-width="${n === 0 ? 16 : stage === 2 && n > 2 ? 7 : 10}" stroke-linecap="round"/>`).join('');
  let names = L('river', '강', 400, 58, '#8fd6ff');
  let extra = '';
  if (stage === 0) { names += L('bar', '모래톱', 470, 148, '#ffd36b'); extra += `<ellipse data-bar="1" cx="360" cy="146" rx="46" ry="26" fill="${SAND}"/>`; names += L('prodelta', '진흙이 퍼짐', 200, 240, '#ffdca6'); }
  if (stage === 1) { extra += `<ellipse data-island="1" cx="360" cy="162" rx="26" ry="26" fill="${FIELD}"/>`; names += L('island', '하중도', 360, 168) + L('branch', '분류', 276, 150, '#8fd6ff') + L('bar', '모래톱', 490, 208, '#ffd36b'); extra += `<ellipse cx="318" cy="196" rx="24" ry="14" fill="${SAND}"/><ellipse cx="402" cy="196" rx="24" ry="14" fill="${SAND}"/>`; }
  if (stage === 2) { names += L('plain', '삼각주 평원', 360, 214, '#f3f1ea') + L('branch', '분류', 212, 186, '#8fd6ff') + L('slope', '삼각주 사면', 560, 276, '#ffd36b') + L('prodelta', '전삼각주', 150, 330, '#ffdca6'); }
  if (stage === 3) {
    extra += [[300, 200, 16, 58], [360, 230, 18, 76], [420, 206, 15, 62], [250, 250, 12, 44], [474, 256, 12, 42]].map(([x, y, a, b]) => `<ellipse data-shoal="1" cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${SAND}" fill-opacity="0.72"/>`).join('');
    names += L('mouth', '하구역', 200, 176, '#f3f1ea') + L('tide', '조류', 560, 250, '#ffdca6');
    extra += `<g stroke="#ffdca6" stroke-width="3" fill="#ffdca6"><path d="M610 214v64" fill="none"/><path d="M610 206l-7 12h14z"/><path d="M610 286l-7 -12h14z"/></g>`;
  }
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 하구. ${STAGE_NAMES[stage]} 단계의 모습이다. 위쪽이 육지, 아래쪽이 바다다.">
    <rect width="${PLAN.W}" height="${PLAN.H}" fill="${GRASS}"/>
    <path d="M-10 0H270L300 ${PLAN.coast - 40}L-10 ${PLAN.coast - 10}Z" fill="${HILL}"/><path d="M730 0H450L420 ${PLAN.coast - 40}L730 ${PLAN.coast - 10}Z" fill="${HILL}"/>
    <path data-sea="1" d="${seaPoly}" fill="${SEA}"/>
    ${stage < 3 ? `<path d="${mudBand}" fill="${BROWN}" fill-opacity="0.32"/><path d="${slopeBand}" fill="${SAND}" fill-opacity="0.42"/>` : ''}
    <path data-plain="1" d="M-10 0L${delta.join('L')}L730 0Z" fill="none"/>
    <path d="M${delta.join('L')}L${[...coast].reverse().join('L')}Z" fill="${FIELD}"/>
    ${stage === 3 ? `<path data-mouth="1" d="M360 70L236 ${PLAN.coast + 12}L484 ${PLAN.coast + 12}Z" fill="${SEA}"/>` : ''}
    ${extra}${riv}
    <line x1="${CROSS_X}" y1="60" x2="${CROSS_X}" y2="${Math.min(PLAN.H - 8, z.prodeltaEnd + 14)}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/>
    <text x="${CROSS_X + 10}" y="72" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${CROSS_X + 10}" y="${Math.min(PLAN.H - 8, z.prodeltaEnd + 14)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
    <text x="14" y="24" font-size="16" font-weight="700" fill="#efe9d8" paint-order="stroke" stroke="#1c211e" stroke-width="3">산지</text>
    <text x="14" y="${PLAN.H - 12}" font-size="16" font-weight="700" fill="#efe9d8" paint-order="stroke" stroke="#1c211e" stroke-width="3">바다</text>
  </svg>`;
}

// 단면: 왼쪽이 강(A), 오른쪽이 먼바다(B). 가로 값은 평면의 y를 그대로 옮긴다(SC 배).
const SEC = { W: 720, H: 300, sea: 92, SC: 1.9, ox: -110 };
const xOf = py => SEC.ox + py * SEC.SC;
const oldBed = x => { const py = (x - SEC.ox) / SEC.SC; return SEC.sea + 22 + Math.max(0, py - PLAN.coast) * 0.5; };
// 단계별 땅 윗면(그림 y). 평원은 수면 바로 위에 평평하고, 사면으로 내려가 전삼각주로 이어진다.
export function topAt(x, stage) {
  const z = ZONES[stage], py = (x - SEC.ox) / SEC.SC, bed = oldBed(x);
  if (py < PLAN.coast && stage !== 3) return Math.min(bed, SEC.sea - 8 - Math.max(0, PLAN.coast - py) * 0.1);
  if (stage === 0) { const u = (py - 146) / 30; return bed - (Math.abs(u) < 1 ? 19 * (1 - u * u) : 0); }
  if (py <= z.plainEnd) return SEC.sea - 8;
  if (py <= z.slopeEnd) { const t = (py - z.plainEnd) / (z.slopeEnd - z.plainEnd), bedAt = oldBed(xOf(z.slopeEnd)) - 12; return SEC.sea - 8 + (bedAt - SEC.sea + 8) * t; }
  if (py <= z.prodeltaEnd) { const t = (py - z.slopeEnd) / (z.prodeltaEnd - z.slopeEnd); return bed - 12 * (1 - t); }
  return bed;
}

function section(stage) {
  const z = ZONES[stage], xs = [];
  for (let x = 0; x <= SEC.W; x += 3) xs.push(x);
  const pts = fn => xs.map(x => `${x},${f1(fn(x))}`).join(' ');
  const bedLine = x => { const py = (x - SEC.ox) / SEC.SC; return py < PLAN.coast ? SEC.sea - 6 : oldBed(x); };
  const say = (zone, text, py, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${f1(xOf(py))}" y="${y}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  // 층: 사면 부분은 모래, 앞쪽 바닥은 진흙, 평원 윗부분은 얇은 표면층이다.
  const sandTop = x => { const py = (x - SEC.ox) / SEC.SC; return py > z.slopeEnd ? bedLine(x) : Math.min(bedLine(x), topAt(x, stage)); };
  // 기저층은 먼저 쌓인 진흙이라 전면층 아래까지 이어진다.
  const mudTop = x => { const py = (x - SEC.ox) / SEC.SC; if (py < PLAN.coast || py > z.prodeltaEnd || stage === 3) return bedLine(x); return py > z.slopeEnd ? topAt(x, stage) : Math.max(bedLine(x) - 10, topAt(x, stage)); };
  const topset = x => { const py = (x - SEC.ox) / SEC.SC; return py >= PLAN.coast && py <= z.plainEnd ? topAt(x, stage) + 7 : topAt(x, stage); };
  const seaFrom = xs.filter(x => topAt(x, stage) > SEC.sea);
  return `<svg class="sec" viewBox="0 0 ${SEC.W} ${SEC.H}" role="img" aria-label="강에서 먼바다로 자른 단면. 수면 가까이 평평한 평원, 물속 비탈인 사면, 먼바다 바닥의 고운 진흙이 차례로 나타난다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <polygon data-water="1" points="${seaFrom[0]},${SEC.sea} ${SEC.W},${SEC.sea} ${SEC.W},${SEC.H} ${seaFrom[0]},${SEC.H}" fill="${SEA}"/>
    <polygon points="0,${SEC.H} ${pts(bedLine)} ${SEC.W},${SEC.H}" fill="${BASE}"/>
    <polygon data-sand="1" points="${pts(sandTop)} ${[...xs].reverse().map(x => `${x},${f1(bedLine(x))}`).join(' ')}" fill="${SAND}"/>
    <polygon data-mud="1" points="${pts(mudTop)} ${[...xs].reverse().map(x => `${x},${f1(bedLine(x))}`).join(' ')}" fill="${MUD}"/>
    ${stage < 3 ? `<polygon points="${pts(x => topAt(x, stage))} ${[...xs].reverse().map(x => `${x},${f1(topset(x))}`).join(' ')}" fill="${FIELD}"/>` : ''}
    <line x1="${seaFrom[0]}" x2="${SEC.W}" y1="${SEC.sea}" y2="${SEC.sea}" stroke="#d8efff" stroke-width="2"/>
    ${say('river', '강과 땅', 86, 60, '#8fd6ff')}
    ${stage >= 1 && stage < 3 ? say('plain', '삼각주 평원', (PLAN.coast + z.plainEnd) / 2, 60, '#e8f2c4') : ''}
    ${stage === 0 ? say('bar', '모래톱', 146, 70, '#ffd36b') + say('prodelta', '진흙이 퍼짐', 214, 170, '#ffdca6') : ''}
    ${stage === 1 || stage === 2 ? say('slope', '삼각주 사면', (z.plainEnd + z.slopeEnd) / 2 + 8, 128, '#ffd36b') + say('prodelta', '전삼각주', (z.slopeEnd + z.prodeltaEnd) / 2 + 14, 196, '#ffdca6') : ''}
    ${stage === 3 ? say('tide', '조류가 흙을 옮겨 감', 216, 60, '#ffdca6') : ''}
    <text x="10" y="24" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC.W - 10}" y="24" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    ${stage === 1 || stage === 2 ? `<g font-size="15" font-weight="700" fill="#efe9d8">
      <rect x="16" y="${SEC.H - 26}" width="16" height="12" fill="${FIELD}"/><text x="38" y="${SEC.H - 15}">표면층</text>
      <rect x="110" y="${SEC.H - 26}" width="16" height="12" fill="${SAND}"/><text x="132" y="${SEC.H - 15}">전면층(모래가 많은 예)</text>
      <rect x="320" y="${SEC.H - 26}" width="16" height="12" fill="${MUD}"/><text x="342" y="${SEC.H - 15}">기저층(진흙)</text>
    </g>` : ''}
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
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 이 그림은 높이를 크게 과장했고, 물길의 모양과 크기는 설명을 위한 예시입니다. 큰 삼각주의 전면층은 이 그림보다 더 고운 흙으로 된 경우가 많습니다.</p>`;
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
