// © 2026 김용현
// 곶과 만, 암석 해안 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 파랑의 굴절, 1은 곶의 침식과 만의 퇴적, 2는 해식애 후퇴와 파식대, 3은 곧아진 해안이다. 단면은 곶의 가운데(A-B선)를 자른다.

export const ZONE_TEXT = {
  wave: { name: '파랑', text: '먼바다에서 나란히 오던 파봉선이 얕은 곶 앞에서 먼저 느려져 해안선을 닮게 휩니다. 이것이 파랑의 굴절입니다.' },
  head: { name: '곶', text: '바다로 튀어나온 땅입니다. 파랑의 진행 방향선이 모여 에너지가 집중되므로 침식이 활발합니다.' },
  bay: { name: '만', text: '육지로 들어간 바다입니다. 진행 방향선이 퍼져 파랑 에너지가 약하므로 퇴적이 활발합니다.' },
  current: { name: '연안류', text: '해안을 따라 흐르는 물입니다. 곶 앞은 파랑이 모여 수면이 조금 높고 만 앞은 낮아, 곶에서 만 쪽으로 흐르며 깎인 모래를 옮깁니다.' },
  beach: { name: '모래 해안', text: '만 안쪽에 모래가 쌓인 곳입니다. 곶 쪽보다 입자가 고운 경우가 많습니다. 사빈이라고도 하며, 모래는 강에서 오는 것도 많습니다.' },
  notch: { name: '노치', text: '해수면 높이에서 파랑이 절벽 아래를 안쪽으로 판 자리입니다. 깊어지면 그 위 절벽이 무너집니다.' },
  cliff: { name: '해식애', text: '파랑의 침식으로 생긴 바닷가 절벽입니다. 아래가 파이고 무너지기를 되풀이하며 육지 쪽으로 물러납니다.' },
  platform: { name: '파식대', text: '해식애가 물러난 자리에 남은 평평한 바위 면입니다. 해식애가 물러날수록 넓어지고, 넓어질수록 파랑의 힘이 줄어듭니다.' },
  stack: { name: '시 스택', text: '잘 깎이지 않는 바위가 주변 암석이 먼저 깎인 뒤 육지와 떨어져 남은 돌기둥입니다. 시 스택은 제자리에 있고 절벽만 물러납니다. 시 스택도 오랜 시간이 지나면 깎여 사라집니다.' },
  arch: { name: '해식 동굴과 시 아치', text: '절리나 단층처럼 약한 곳을 따라 해식애 안쪽으로 깊게 파인 굴이 해식 동굴(해식동)입니다. 굴이 계속 커져 튀어나온 곶의 반대쪽 해식애까지 뚫리면 구름다리 모양의 시 아치가 되고, 천장이 무너지면 바깥쪽 바위가 시 스택으로 남습니다. 3D 모형에서는 곶의 해식애에 해식 동굴이 파이고, 좁은 곶에서 시 아치까지의 순서를 볼 수 있습니다.' },
};

export const STAGE_NAMES = ['파랑의 굴절', '곶의 침식', '해식애와 파식대', '오랜 시간 뒤'];
const NOTES = [
  '파랑의 굴절: 파랑은 얕은 곳에서 느려지므로 곶 앞에서 먼저 느려집니다. 그래서 파봉선이 휘고, 진행 방향선은 곶으로 모이고 만에서는 퍼집니다.',
  '곶의 침식: 곶에는 파랑 에너지가 집중되어 깎이고, 만에는 에너지가 약해 쌓입니다. 연안류가 곶에서 깎인 모래를 만으로 옮깁니다.',
  '해식애와 파식대: 해수면 높이의 노치가 깊어지면 위쪽 절벽이 무너져 해식애가 물러나고, 그 자리에 파식대가 넓어집니다. 잘 깎이지 않는 바위가 있으면 시 스택으로 남습니다.',
  '오랜 시간 뒤: 곶은 물러나고 만은 채워져 해안선이 단순해집니다. 곶과 만의 차이가 줄어들어 파랑의 굴절도 약해집니다.',
];

const SEA = '#3f8fc4', SHALLOW = '#7cc7dc', LAND = '#5a7346', HILL = '#46603a', SAND = '#e6cf90', ROCK = '#6f665a', PLATFORM = '#7d7566', ACCENT = '#e4b15a', CREST = '#ffffff', RAY = '#ffe9a8', AIR = '#23302a';
const f1 = v => v.toFixed(1);
const PLAN = { W: 720, H: 380 };
export const CROSS_X = 200;
const HEADS = [200, 520], BAY = 360;

// 단계별 곶이 튀어나온 정도와 만의 깊이(그림 칸). 단계마다 곶이 물러나고 만이 채워진다.
// 곶이 물러난 거리(평면 칸). 평면과 단면이 같은 값을 쓴다. 단면은 이 값을 CROSS_SCALE배 해서 그린다.
export const RETREAT = [0, 16, 42, 60];
export const CROSS_SCALE = 2.6;
const BAY_FILL = [0, 14, 30, 50];
export const COAST = RETREAT.map((r, s) => ({ head: 120 - r - BAY_FILL[s], bay: BAY_FILL[s] }));
// 시 스택 자리. 처음 해안선에서 30칸 안쪽의 바위라서 곶이 그보다 더 물러난 2단계부터 드러나고, 어느 단계에서나 자리가 같다.
export const STACK_BACK = 30;
export function stackPlan() { return [{ x: CROSS_X, y: coastY(CROSS_X, 0) - STACK_BACK }, { x: 520 + 18, y: coastY(520 + 18, 0) - STACK_BACK }]; }
export function stackSectionX() { return CLIFF_X[0] - STACK_BACK * CROSS_SCALE; }
// 해안선(그림 y). 위쪽이 육지, 아래쪽이 바다다.
export function coastY(x, stage) {
  const c = COAST[stage], g = o => { const a = (x - o) / 78; return 1 / (1 + a * a * a * a); };
  return 96 + c.bay + (c.head - c.bay * 0) * (g(HEADS[0]) + g(HEADS[1]));
}

// 등심선을 닮아 휘는 진행 방향선. 해안에서 멀면 곧고, 가까우면 가까운 곶 쪽으로 모인다.
export function rayPath(x0, stage) {
  const pts = [];
  // 만 가운데 쪽의 선은 만으로 벌어지며 닿고, 나머지는 가까운 곶으로 모인다. 오랜 시간 뒤에는 굴절이 약하다.
  const pull = Math.abs(x0 - HEADS[0]) < Math.abs(x0 - HEADS[1]) ? HEADS[0] : HEADS[1];
  const toBay = Math.abs(x0 - BAY) <= 60;
  const full = toBay ? BAY + (x0 - BAY) * 1.45 : pull + (x0 - pull) * 0.42;
  const end = stage === 3 ? x0 + (full - x0) * 0.25 : full;
  for (let f = 0; f <= 1.0001; f += 0.05) {
    const x = x0 + (end - x0) * f * f, y = PLAN.H + (coastY(x, stage) - PLAN.H) * f;
    pts.push([x, y]);
  }
  return pts;
}

function plan(stage) {
  const coast = [];
  for (let x = -10; x <= 730; x += 10) coast.push(`${x} ${f1(coastY(x, stage))}`);
  const L = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  const path = pts => `M${pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;
  let rays = '';
  for (let x = 40; x <= 680; x += 40) rays += `<path data-ray="1" d="${path(rayPath(x, stage))}" fill="none" stroke="${RAY}" stroke-width="1.8"/>`;
  // 파봉선: 같은 비율의 점을 이은 선
  let crests = '';
  for (const f of [0.25, 0.45, 0.65, 0.82]) {
    const line = [];
    for (let x = 20; x <= 700; x += 20) { const r = rayPath(x, stage); const n = Math.round(f * (r.length - 1)); line.push(r[n]); }
    crests += `<path d="${path(line)}" fill="none" stroke="${CREST}" stroke-width="2.4"/>`;
  }
  let extra = '', names = L('wave', '파랑', 96, PLAN.H - 16, '#ffffff');
  const headY = coastY(HEADS[0], stage), bayY = coastY(BAY, stage);
  if (stage >= 1) {
    // 만의 모래: 해안선 앞의 띠
    const sand = [];
    for (let x = 270; x <= 450; x += 10) sand.push([x, coastY(x, stage)]);
    extra += `<path data-beach="1" d="${path(sand)}" fill="none" stroke="${SAND}" stroke-width="${10 + stage * 6}"/>`;
    names += L('beach', '모래 해안', BAY, bayY - 22 + 44, '#ffd36b');
    names += `<g stroke="#ffd36b" stroke-width="3" fill="#ffd36b"><path d="M262 ${f1(coastY(262, stage) + 16)}l32 2" fill="none"/><path d="M302 ${f1(coastY(262, stage) + 18)}l-11 -6v11z"/><path d="M458 ${f1(coastY(458, stage) + 16)}l-32 2" fill="none"/><path d="M418 ${f1(coastY(458, stage) + 18)}l11 -6v11z"/></g>`;
    names += L('current', '연안류', 262, coastY(262, stage) + 44, '#ffd36b');
  }
  if (stage >= 1) {
    // 파식대: 곶 앞의 띠, 시 스택: 그 위의 작은 바위
    for (const o of HEADS) {
      const band = [];
      const wide = RETREAT[stage];
      for (let x = o - 86; x <= o + 86; x += 8) { const g = Math.max(0, 1 - ((x - o) / 92) * ((x - o) / 92)); band.push([x, coastY(x, stage) + (wide * g) / 2]); }
      extra = `<path data-platform="1" d="${path(band)}" fill="none" stroke="${PLATFORM}" stroke-width="${wide}"/>` + extra;
    }
    for (const q of stackPlan()) extra += `<circle data-stack="1" cx="${q.x}" cy="${f1(q.y)}" r="6" fill="${ROCK}" stroke="#1c211e"/>`;
    names += L('platform', '파식대', HEADS[0] - 86, coastY(HEADS[0] - 86, stage) + 34, '#efe9d8');
    if (stage >= 2) names += L('stack', '시 스택', stackPlan()[1].x + 54, stackPlan()[1].y + 6);
  }
  names += L('head', '곶', HEADS[0], stage >= 3 ? 74 : Math.min(headY - 30, 170)) + L('head', '곶', HEADS[1], stage >= 3 ? 74 : Math.min(headY - 30, 170)) + L('bay', '만', BAY, Math.min(bayY + 72, 230), '#d8efff');
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 해안. ${STAGE_NAMES[stage]} 단계이다. 위쪽이 육지, 아래쪽이 바다다.">
    <rect width="${PLAN.W}" height="${PLAN.H}" fill="${SEA}"/>
    <path d="M-10 -10L${coast.join('L')}L730 -10Z" fill="${LAND}"/>
    <path d="M-10 -10H730V40H-10Z" fill="${HILL}"/>
    ${rays}${crests}${extra}
    <line x1="${CROSS_X}" y1="30" x2="${CROSS_X}" y2="${f1(headY + 66)}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/>
    <text x="${CROSS_X + 10}" y="40" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${CROSS_X + 10}" y="${f1(headY + 66)}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
  </svg>`;
}

// 단면: 왼쪽이 육지(A), 오른쪽이 바다(B). 물러난 거리만큼 해식애가 왼쪽으로 가고 파식대가 넓어진다.
const SEC = { W: 720, H: 300, sea: 170, top: 62 };
export const CLIFF_X = RETREAT.map(r => 420 - r * CROSS_SCALE);
export function platformWidth(stage) { return Math.max(0, CLIFF_X[0] - CLIFF_X[stage]); }

function section(stage) {
  const cx = CLIFF_X[stage], wave = 420 + 30, seabed = x => SEC.sea + 16 + Math.max(0, x - wave) * 0.22;
  const hasNotch = true;
  const notchDepth = stage === 0 ? 8 : stage === 1 ? 20 : 26;
  const ground = `0,${SEC.H} 0,${SEC.top - 4} ${cx - 26},${SEC.top} ${cx},${SEC.top + 8} ${cx + 8},${SEC.sea - 16} ${hasNotch ? `${cx - notchDepth + 8},${SEC.sea - 4} ${cx + 8},${SEC.sea + 8}` : `${cx + 8},${SEC.sea + 6}`} ${wave},${SEC.sea + 16} ${SEC.W},${f1(seabed(SEC.W))} ${SEC.W},${SEC.H}`;
  const say = (zone, text, x, y, color = '#f3f1ea', anchor = 'middle') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="${anchor}" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  // 무너진 옛 절벽: 점선으로 처음 해식애 자리를 남긴다.
  const old = stage > 0 ? `<path d="M${f1(cx)} ${SEC.top + 6}L${CLIFF_X[0] - 26} ${SEC.top + 2}L${CLIFF_X[0]} ${SEC.top + 8}L${CLIFF_X[0] + 8} ${SEC.sea}" fill="none" stroke="#efe9d8" stroke-width="1.6" stroke-dasharray="5 5"/><text x="${CLIFF_X[0] + 16}" y="${SEC.top + 26}" font-size="15" font-weight="700" fill="#efe9d8">처음 절벽 자리</text>` : '';
  return `<svg class="sec" viewBox="0 0 ${SEC.W} ${SEC.H}" role="img" aria-label="곶을 육지에서 바다로 자른 단면. 절벽 아래 해수면 높이에 노치가 파이고 절벽이 물러난 자리에 평평한 파식대가 남는다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${SEC.W}" height="${SEC.H}" fill="${AIR}"/>
    <rect x="0" y="${SEC.sea}" width="${SEC.W}" height="${SEC.H - SEC.sea}" fill="${SEA}"/>
    <polygon data-ground="1" points="${ground}" fill="${ROCK}"/>
    <line x1="${cx}" x2="${SEC.W}" y1="${SEC.sea}" y2="${SEC.sea}" stroke="#d8efff" stroke-width="2"/>
    ${old}
    ${say('cliff', '해식애', cx - 62, SEC.top + 30, '#ffd36b')}
    ${hasNotch ? `<line x1="${cx - 30}" y1="${SEC.sea - 28}" x2="${cx - notchDepth + 12}" y2="${SEC.sea - 6}" stroke="#ffb38a" stroke-width="2"/>${say('notch', '노치', cx - 44, SEC.sea - 32, '#ffb38a')}` : ''}
    ${stage >= 1 ? say('platform', '파식대', (cx + 440) / 2 + 10, SEC.sea + 52, '#efe9d8') : ''}
    ${say('wave', '파랑', 600, SEC.sea - 16, '#ffffff')}
    <g stroke="#fff" stroke-width="3" fill="#fff"><path d="M660 ${SEC.sea - 8}h-44" fill="none"/><path d="M604 ${SEC.sea - 8}l13 -6v12z"/></g>
    ${stage >= 2 ? `<polygon data-stack="1" points="${stackSectionX() - 10},${SEC.sea + 14} ${stackSectionX() - 10},${SEC.top + 56} ${stackSectionX() + 10},${SEC.top + 50} ${stackSectionX() + 10},${SEC.sea + 14}" fill="${ROCK}" stroke="#1c211e"/>${say('stack', '시 스택', stackSectionX(), SEC.top + 38)}` : ''}
    <text x="10" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC.W - 10}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <text x="16" y="${SEC.H - 12}" font-size="15" font-weight="700" fill="#efe9d8">세로와 노치를 크게 과장했습니다.</text>
  </svg>`;
}

// 해식 동굴, 시 아치, 시 스택을 곶의 옆에서 바라본 그림
function archFigure() {
  const L = (x, y, t) => `<text class="zone" data-zone="arch" x="${x}" y="${y}" text-anchor="middle" font-size="18" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${t}</text>`;
  return `<svg viewBox="0 0 720 210" role="img" aria-label="좁은 곶을 옆에서 바라본 그림. 왼쪽은 해식애에 파인 작은 굴인 해식 동굴, 가운데는 반대쪽까지 뚫린 시 아치, 오른쪽은 천장이 무너져 육지 쪽 바위와 떨어져 남은 시 스택이다.">
    <rect width="720" height="210" fill="${AIR}"/>
    <rect y="160" width="720" height="50" fill="${SEA}"/>
    <path d="M0 160V40H250L262 160Z" fill="${ROCK}"/>
    <path d="M152 160Q148 118 126 118Q104 118 100 160Z" fill="#15191a"/>
    <path d="M300 160L304 60H500L506 160H456Q450 104 402 104Q354 104 348 160Z" fill="${ROCK}"/>
    <path d="M532 160L536 60H566L574 160Z" fill="${ROCK}"/>
    <path d="M600 160L606 74H650L658 160Z" fill="${ROCK}"/>
    ${L(126, 100, '해식 동굴')}${L(402, 138, '시 아치')}${L(630, 60, '시 스택')}
    <path d="M268 186h24M284 179l8 7-8 7M508 186h18M518 179l8 7-8 7" fill="none" stroke="#f3f1ea" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
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
      <h2>곶을 A에서 B로 자른 단면 (모식도)</h2>
      <figure>${section(stage)}</figure>
      <h2>해식 동굴에서 시 스택까지 (모식도)</h2>
      <figure>${archFigure()}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 흰 선은 파봉선, 노란 선은 파랑의 진행 방향선입니다. 해안선과 규모는 설명을 위한 예시입니다. <button class="zone-link" data-zone="arch">해식 동굴과 시 아치</button>는 3D 모형의 곶 해식애와 좁은 곶에서 볼 수 있습니다. 평면과 단면의 거리는 비율을 맞춘 예시입니다.</p>`;
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
  return { setStage(n) { if (n !== stage) { stage = n; paint(); } }, get stage() { return stage; } };
}
