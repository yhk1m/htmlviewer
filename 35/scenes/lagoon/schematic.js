// © 2026 김용현
// 사빈, 사주, 석호 모식도. 책 그림을 옮기지 않고 새로 그린 그림이다.
// 단계 0은 빙기의 하천 골짜기, 1은 해수면 상승으로 생긴 만, 2는 사취의 성장, 3은 사주와 석호, 4는 메워지는 석호다. 단면은 골짜기 가운데(A-B선)를 자른다.

export const ZONE_TEXT = {
  valley: { name: '하천 골짜기', text: '빙기에는 해수면이 지금보다 100m 넘게 낮아(마지막 빙기의 가장 추운 때는 약 130m), 하천이 낮은 바닷가까지 흘러가며 골짜기를 깊게 팠습니다.' },
  bay: { name: '만', text: '후빙기에 해수면이 오르자 바닷물이 하천 골짜기 안으로 들어와 생긴 바다입니다. 골짜기가 바다에 잠긴 만(익곡)이라 육지 안쪽으로 깊이 들어와 있습니다.' },
  current: { name: '연안류', text: '파랑이 해안에 비스듬히 닿으면 해안을 따라 흐르는 물의 흐름이 생깁니다. 이 연안류가 모래를 해안을 따라 옮깁니다.' },
  spit: { name: '사취', text: '연안류가 옮긴 모래가 해안선이 꺾이는 만 입구에서, 연안류가 오는 쪽 끝부터 연안류 방향으로 입구를 가로질러 이어 쌓여 생긴 좁고 긴 모래 띠입니다. 한쪽 끝은 육지에 붙어 있습니다.' },
  bar: { name: '사주', text: '파랑과 연안류가 옮긴 모래가 해안을 따라 좁고 길게 쌓인 지형입니다. 사취와 달리 양쪽이 바다와 닿거나 육지와 닿습니다. 만 입구에서 자란 사취가 건너편까지 이어져 만을 가로막으면 만구 사주라고 합니다. 위에는 사빈과 해안사구가 있습니다.' },
  lagoon: { name: '석호', text: '사주가 만의 입구를 거의 막아 바다와 떨어진 호수입니다. 평소에는 막혀 있어도 폭풍 때 큰 파도가 사주를 넘거나 큰비 때 사주가 터지면(갯터짐) 바닷물이 드나드는 물길(입수구)이 생기므로, 물은 바닷물과 민물이 섞인 기수입니다. 동해안에 많고, 하천이 실어 오는 토사와 사람의 매립으로 점점 작아집니다.' },
  beach: { name: '사빈', text: '파랑과 연안류가 옮긴 모래가 해안에 쌓인 모래 해안입니다. 해빈 가운데 모래로 된 것을 사빈이라고 합니다. 동해안 사빈의 모래는 주로 하천이 실어 와 연안류가 해안을 따라 옮긴 것입니다. 해수욕장으로 많이 쓰입니다.' },
  dune: { name: '해안사구', text: '사빈의 마른 모래가 바닷바람에 날려 사빈 뒤에 쌓인 모래 언덕입니다. 파랑이 아니라 바람이 만든 지형이고, 풀이 자라 모래를 붙잡으면 커집니다. 동해안에서는 주로 바닷바람이 쌓습니다. 지하수를 저장하고, 바닷물과 바람의 피해를 막는 자연 방파제 구실을 합니다.' },
  river: { name: '하천과 메워진 땅', text: '석호로 흘러드는 하천은 흐름이 느려지는 석호에 토사를 쌓습니다. 쌓인 땅이 넓어질수록 석호는 얕아지고 좁아집니다.' },
  wave: { name: '파랑', text: '먼바다에서 해안에 비스듬히 들어오는 파랑입니다. 비스듬히 닿기 때문에 해안을 따라 흐르는 연안류가 생깁니다.' },
};

export const STAGE_NAMES = ['빙기', '해수면 상승', '사취가 자람', '사주와 석호', '석호가 메워짐'];
const NOTES = [
  '빙기: 해수면이 지금보다 훨씬 낮아 바닷가가 멀리 있었습니다. 하천은 낮은 바닷가까지 흘러가며 골짜기를 깊게 팠습니다.',
  '해수면 상승: 빙기가 끝나고 해수면이 오르자 바닷물이 하천 골짜기 안으로 들어와 만이 되었습니다.',
  '사취가 자람: 해수면이 거의 멈추자 비스듬히 들어오는 파랑이 연안류를 만들고, 연안류가 옮긴 모래가 만 입구에서 사취로 자랍니다.',
  '사주와 석호: 사취가 만 입구를 가로막아 사주가 되고, 안쪽은 석호가 됩니다. 사주 바깥에는 사빈, 그 뒤에는 바람이 쌓은 해안사구가 생깁니다.',
  '석호가 메워짐: 석호로 흘러드는 하천이 토사를 쌓아 석호는 점점 얕아지고 좁아집니다. 사람이 매립해 줄어든 석호도 많습니다.',
  '해수면 상승이 없으면: 골짜기가 바다에 잠기지 않아 만이 없습니다. 연안류가 옮긴 모래는 곧은 해안을 따라 사빈과 해안사구를 만들 뿐, 막을 만이 없어 석호는 생기지 않습니다.',
];
// 형성 모형의 "해수면 상승 없음" 조건에서 보여 주는 그림. 단계 버튼에는 넣지 않는다.
export const NO_RISE = 5;

const SEA = '#3f8fc4', LAGOON = '#4fa59a', LAND = '#5a7346', HILL = '#46603a', FLOOR = '#9a8f72', SAND = '#e6cf90', DUNE = '#c8c68a', MARSH = '#8f9a5c', RIVER = '#3d8fc9', ACCENT = '#e4b15a', AIR = '#23302a', CREST = '#ffffff';
const f1 = v => v.toFixed(1);
// 해안사구(평면): 사빈 바로 뒤에 낮은 모래 언덕이 줄지어 있다. 언덕 위에는 갯그령 같은 풀이 듬성듬성 자란다.
function duneBand(x0, x1, base) {
  let d = `M${x0} ${base}`, grass = '';
  for (let x = x0, n = 0; x < x1; n++) {
    const w = 14 + ((n * 7) % 3) * 4, h = 6 + ((n * 5) % 4) * 1.6, e = Math.min(x1, x + w);
    d += `Q${f1((x + e) / 2)} ${f1(base - h * 2)} ${f1(e)} ${base}`;
    if (n % 2 === 0) grass += `<circle cx="${f1((x + e) / 2 + 2)}" cy="${f1(base - h + 1)}" r="1.6"/>`;
    x = e;
  }
  return `<path data-dune="1" d="${d}Z" fill="${DUNE}" stroke="#a9a46a" stroke-width="1"/><g fill="#7d8f4e">${grass}</g>`;
}
// 사주(단면): 낮고 넓은 모래 둔덕. 석호 쪽 둔덕 위에 해안사구가 솟고, 바다 쪽은 사빈이 완만하게 물로 내려간다.
function barProfile(b, seaY, floor, opts = {}) {
  const top = seaY - 9, inner = opts.land ? `L${f1(b - 120)} ${top + 2}` : `L${f1(b - 54)} ${seaY}L${f1(b - 42)} ${top}`;
  const start = opts.land ? `M${f1(b - 120)} ${f1(floor(b - 120))}` : `M${f1(b - 92)} ${f1(floor(b - 92))}`;
  const sand = `${start}${inner}L${f1(b - 36)} ${top}Q${f1(b - 16)} ${top - 66} ${f1(b + 4)} ${top}L${f1(b + 18)} ${top + 1}L${f1(b + 46)} ${seaY}L${f1(b + 92)} ${f1(floor(b + 92))}Z`;
  const dune = `M${f1(b - 36)} ${top}Q${f1(b - 16)} ${top - 66} ${f1(b + 4)} ${top}Z`;
  const grass = [-26, -16, -6].map(dx => `<path d="M${f1(b + dx)} ${f1(top - (dx === -16 ? 32 : 24))}l-3 -7M${f1(b + dx)} ${f1(top - (dx === -16 ? 32 : 24))}l3 -7" stroke="#7d8f4e" stroke-width="1.6"/>`).join('');
  return `<path data-bar="1" d="${sand}" fill="${SAND}"/><path data-dune="1" d="${dune}" fill="${DUNE}"/>${grass}`;
}

// 평면: 위쪽이 육지, 아래쪽이 바다다. 골짜기는 가운데 세로로 놓인다.
export const PLAN = { W: 720, H: 380 };
export const COAST_Y = 236; // 오늘날 해안선
export const MOUTH = { x0: 300, x1: 420 }; // 만 입구
export const VALLEY_TOP = 64; // 만이 들어온 가장 안쪽
const CX = 360;
// 골짜기(만)의 반폭: 안쪽은 좁고 입구로 갈수록 넓다.
export function bayHalf(y) { const f = Math.max(0, Math.min(1, (y - VALLEY_TOP) / (COAST_Y - VALLEY_TOP))); return 18 + 42 * Math.sqrt(f); }
// 단계별 사취 끝의 x(오른쪽에서 왼쪽으로 자란다). 3단계부터는 왼쪽 끝에 닿았다.
export const SPIT_TIP = [null, null, 372, 300, 300];
// 단계별 메워진 땅의 아래 끝(y). 하천이 들어오는 안쪽에서부터 메워진다.
export const FILL_TO = [0, 0, 0, 0, 150];
// 빙기의 바닷가(y): 그림 아래 바깥
export const GLACIAL_COAST = 352;

function planNoRise() {
  const L = (zone, text, x, y, color = '#f3f1ea', size = 19) => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  let crests = '';
  for (const o of [0, 1, 2, 3]) crests += `<path d="M${130 + o * 40} ${PLAN.H}L${PLAN.W} ${COAST_Y + 40 + o * 34}" fill="none" stroke="${CREST}" stroke-width="2.2" opacity="0.8"/>`;
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 해안. 해수면 상승이 없어 만이 없고, 곧은 해안을 따라 사빈과 해안사구만 있다.">
    <rect width="${PLAN.W}" height="${PLAN.H}" fill="${LAND}"/><path d="M0 0H${PLAN.W}V40H0Z" fill="${HILL}"/>
    <rect y="${COAST_Y}" width="${PLAN.W}" height="${PLAN.H - COAST_Y}" fill="${SEA}"/>
    <path d="M${CX} 0C${CX - 14} 22 ${CX + 12} 42 ${CX} ${VALLEY_TOP}L${CX} ${COAST_Y}" fill="none" stroke="${RIVER}" stroke-width="5"/>
    <path data-beach="1" d="M0 ${COAST_Y + 4}H${PLAN.W}" stroke="${SAND}" stroke-width="10"/>
    ${duneBand(10, PLAN.W - 10, COAST_Y - 1)}
    ${crests}
    <g stroke="#ffd36b" stroke-width="3" fill="#ffd36b"><path d="M640 ${COAST_Y + 24}h-120" fill="none"/><path d="M508 ${COAST_Y + 24}l13 -7v14z"/></g>
    ${L('current', '연안류', 584, COAST_Y + 52, '#ffd36b')}${L('beach', '사빈', 640, COAST_Y - 12, '#ffd36b')}${L('dune', '해안사구', 470, COAST_Y - 22, '#e8e3b0', 16)}${L('river', '하천', CX + 50, 30, '#d8efff', 17)}${L('wave', '파랑', 640, PLAN.H - 14, '#ffffff')}
    <text x="${CX}" y="150" text-anchor="middle" font-size="18" font-weight="700" fill="#f3f1ea" paint-order="stroke" stroke="#1c211e" stroke-width="3.5">만이 없음</text>
  </svg>`;
}
function sectionNoRise() {
  const say = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  const sea = SEC.sea, b = BAR_X;
  return `<svg class="sec" viewBox="0 0 ${SEC.W} ${SEC.H}" role="img" aria-label="골짜기 가운데를 육지에서 바다로 자른 단면. 골짜기 바닥이 해수면 위에 있어 물이 들지 않고, 바닷가에 사빈과 해안사구만 있다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${SEC.W}" height="${SEC.H}" fill="${AIR}"/>
    <rect x="${f1(b)}" y="${sea}" width="${f1(SEC.W - b)}" height="${SEC.H - sea}" fill="${SEA}"/>
    <polygon points="0,${SEC.H} 0,${sea - 34} ${f1(b - 120)},${sea - 7} ${f1(b + 30)},${sea + 6} ${SEC.W},${sea + 90} ${SEC.W},${SEC.H}" fill="#6f665a"/>
    ${barProfile(b, sea, x => (x < b ? sea - 6 : sea + 6 + ((x - b - 30) / (SEC.W - b - 30)) * 84), { land: true })}
    <line x1="${f1(b)}" x2="${SEC.W}" y1="${sea}" y2="${sea}" stroke="#d8efff" stroke-width="2"/>
    ${say('dune', '해안사구', b - 16, sea - 53, '#e8e3b0')}${say('beach', '사빈', b + 50, sea - 14, '#ffd36b')}${say('river', '물이 들지 않은 골짜기 바닥', 230, sea - 46, '#f3f1ea')}${say('wave', '바다', SEC.W - 50, sea + 44, '#ffffff')}
    <text x="10" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC.W - 10}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <text x="16" y="${SEC.H - 12}" font-size="15" font-weight="700" fill="#efe9d8">세로를 크게 과장했습니다.</text>
  </svg>`;
}

function plan(stage) {
  const L = (zone, text, x, y, color = '#f3f1ea', size = 19) => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${color}" paint-order="stroke" stroke="#1c211e" stroke-width="3.5" style="cursor:pointer">${text}</text>`;
  const bayPts = [];
  for (let y = VALLEY_TOP; y <= COAST_Y; y += 8) bayPts.push(`${f1(CX - bayHalf(y))} ${y}`);
  for (let y = COAST_Y; y >= VALLEY_TOP; y -= 8) bayPts.push(`${f1(CX + bayHalf(y))} ${y}`);
  const bayPath = `M${bayPts.join('L')}Z`;
  const seaTop = stage === 0 ? GLACIAL_COAST : COAST_Y;
  let body = `<rect width="${PLAN.W}" height="${PLAN.H}" fill="${LAND}"/><path d="M0 0H${PLAN.W}V40H0Z" fill="${HILL}"/>`;
  // 빙기에는 오늘날 바다였던 곳도 땅이고, 골짜기는 그 위를 지나 멀리 바닷가로 이어진다.
  if (stage === 0) body += `<rect y="${COAST_Y}" width="${PLAN.W}" height="${GLACIAL_COAST - COAST_Y}" fill="${FLOOR}"/><path d="${bayPath}" fill="${FLOOR}" stroke="#7a705a"/><path d="M${CX - 16} ${COAST_Y}L${CX + 16} ${COAST_Y}L${CX + 10} ${GLACIAL_COAST}L${CX - 10} ${GLACIAL_COAST}Z" fill="${FLOOR}" stroke="#7a705a"/>`;
  body += `<rect y="${seaTop}" width="${PLAN.W}" height="${PLAN.H - seaTop}" fill="${SEA}"/>`;
  if (stage === 0) body += `<line x1="0" x2="${PLAN.W}" y1="${COAST_Y}" y2="${COAST_Y}" stroke="#d8efff" stroke-width="2" stroke-dasharray="7 6"/><text x="14" y="${COAST_Y - 8}" font-size="15" font-weight="700" fill="#d8efff" paint-order="stroke" stroke="#1c211e" stroke-width="3">오늘날 해안선</text>`;
  if (stage >= 1) body += `<path data-bay="1" d="${bayPath}" fill="${stage >= 3 ? LAGOON : SEA}"/>`;
  // 메워진 땅: 안쪽 끝에서부터
  // 하천이 실어 온 토사는 물길 끝에 쌓여, 메워진 땅이 하천을 따라 혀처럼 석호 쪽으로 뻗는다. 물가 양옆은 덜 나아간다.
  if (FILL_TO[stage]) {
    const F = FILL_TO[stage], side = F - 40, tip = F + 28, w = bayHalf(side);
    const left = [], right = [];
    for (let y = VALLEY_TOP; y <= side; y += 6) left.push(`${f1(CX - bayHalf(y) + 1)} ${y}`);
    for (let y = side; y >= VALLEY_TOP; y -= 6) right.push(`${f1(CX + bayHalf(y) - 1)} ${y}`);
    const front = `C${f1(CX - w * 0.6)} ${F - 6} ${CX - 14} ${tip} ${CX} ${tip}C${CX + 14} ${tip} ${f1(CX + w * 0.6)} ${F - 6} ${f1(CX + w - 1)} ${side}`;
    body += `<path data-fill="1" d="M${left.join('L')}${front}L${right.join('L')}Z" fill="${MARSH}"/>`;
  }
  // 하천
  const riverEnd = stage === 0 ? GLACIAL_COAST : FILL_TO[stage] ? FILL_TO[stage] + 22 : VALLEY_TOP + 4;
  body += `<path d="M${CX} 0C${CX - 14} 22 ${CX + 12} 42 ${CX} ${VALLEY_TOP}L${CX} ${riverEnd}" fill="none" stroke="${RIVER}" stroke-width="5"/>`;
  // 사빈: 만 밖 해안선을 따라 쌓인 모래 띠, 사취와 사주
  if (stage >= 2) {
    body += `<path data-beach="1" d="M${MOUTH.x1} ${COAST_Y + 4}H${PLAN.W}" stroke="${SAND}" stroke-width="10"/>`;
    if (stage >= 3) body += `<path d="M0 ${COAST_Y + 4}H${MOUTH.x0}" stroke="${SAND}" stroke-width="8"/>`;
    const tip = SPIT_TIP[stage];
    body += `<path data-spit="1" d="M${MOUTH.x1 + 4} ${COAST_Y + 4}L${tip} ${COAST_Y + 4}" stroke="${SAND}" stroke-width="12" stroke-linecap="round"/>`;
    if (stage >= 3) body += duneBand(MOUTH.x0 + 4, PLAN.W - 10, COAST_Y - 1);
  }
  // 파봉선과 연안류
  let crests = '';
  for (const o of [0, 1, 2, 3]) { const y0 = COAST_Y + 40 + o * 34; crests += `<path d="M${130 + o * 40} ${PLAN.H}L${PLAN.W} ${f1(y0 - 0)}" fill="none" stroke="${CREST}" stroke-width="2.2" opacity="0.8"/>`; }
  let names = L('wave', '파랑', 640, PLAN.H - 14, '#ffffff');
  if (stage >= 2) {
    names += `<g stroke="#ffd36b" stroke-width="3" fill="#ffd36b"><path d="M640 ${COAST_Y + 24}h-120" fill="none"/><path d="M508 ${COAST_Y + 24}l13 -7v14z"/></g>`;
    names += L('current', '연안류', 584, COAST_Y + 52, '#ffd36b');
    names += L('beach', '사빈', 640, COAST_Y - 12, '#ffd36b');
  }
  if (stage === 0) names += L('valley', '하천 골짜기', CX + 96, 160, '#ffe9b0') + `<text x="${CX}" y="${GLACIAL_COAST + 22}" text-anchor="middle" font-size="16" font-weight="700" fill="#d8efff" paint-order="stroke" stroke="#1c211e" stroke-width="3">빙기의 바닷가</text>`;
  if (stage === 1 || stage === 2) names += L('bay', '만', CX, 180, '#d8efff');
  if (stage === 2) names += L('spit', '사취', (SPIT_TIP[2] + MOUTH.x1) / 2 + 6, COAST_Y + 34, '#ffb38a');
  if (stage >= 3) names += L('bar', '사주', MOUTH.x0 + 46, COAST_Y + 34, '#ffb38a') + L('lagoon', '석호', CX, stage === 4 ? 206 : 170, '#bff0e6') + L('dune', '해안사구', MOUTH.x1 + 70, COAST_Y - 22, '#e8e3b0', 16);
  if (stage >= 1) names += L('river', stage === 4 ? '메워진 땅' : '하천', CX + 70, stage === 4 ? 104 : 30, '#d8efff', 17);
  return `<svg viewBox="0 0 ${PLAN.W} ${PLAN.H}" role="img" aria-label="위에서 본 해안. ${STAGE_NAMES[stage]} 단계이다. 위쪽이 육지, 아래쪽이 바다다.">
    ${body}${crests}
    <line x1="${CX + 22}" y1="${VALLEY_TOP - 26}" x2="${CX + 22}" y2="${COAST_Y + 60}" stroke="${ACCENT}" stroke-width="2.4" stroke-dasharray="4 5"/>
    <text x="${CX + 30}" y="${VALLEY_TOP - 18}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">A</text>
    <text x="${CX + 30}" y="${COAST_Y + 66}" font-size="19" font-weight="800" fill="${ACCENT}" paint-order="stroke" stroke="#1c211e" stroke-width="3">B</text>
    ${names}
  </svg>`;
}

// 단면: 왼쪽이 육지(A), 오른쪽이 바다(B). 평면의 A-B선을 그대로 자른다.
export const SEC = { W: 720, H: 300, sea: 120, low: 250 };
// 평면 y를 단면 x로 옮긴다(같은 비율).
export const secX = y => ((y - (VALLEY_TOP - 26)) / (COAST_Y + 60 - (VALLEY_TOP - 26))) * SEC.W;
export const BAR_X = secX(COAST_Y + 4);
// 골짜기 바닥: 육지에서 바다로 내려간다.
const floorY = x => SEC.sea - 30 + (x / SEC.W) * 190;

function section(stage) {
  const seaY = stage === 0 ? SEC.low : SEC.sea;
  const ground = [];
  for (let x = 0; x <= SEC.W; x += 20) ground.push(`${x},${f1(floorY(x))}`);
  const say = (zone, text, x, y, color = '#f3f1ea') => `<text class="zone" data-zone="${zone}" x="${x}" y="${y}" text-anchor="middle" font-size="20" font-weight="700" fill="${color}" style="cursor:pointer">${text}</text>`;
  let water = '', extra = '', names = '';
  // 물: 해수면 아래 바닥 위. 3단계부터 사주 안쪽은 석호다.
  const wx0 = Math.max(0, ((seaY - (SEC.sea - 30)) / 190) * SEC.W);
  if (stage >= 3) water += `<path d="M${f1(wx0)} ${seaY}H${f1(BAR_X)}V${SEC.H}H${f1(wx0)}Z" fill="${LAGOON}"/><path d="M${f1(BAR_X)} ${seaY}H${SEC.W}V${SEC.H}H${f1(BAR_X)}Z" fill="${SEA}"/>`;
  else water += `<path d="M${f1(wx0)} ${seaY}H${SEC.W}V${SEC.H}H${f1(wx0)}Z" fill="${SEA}"/>`;
  if (stage >= 3) {
    // 사주: 수면 위로 솟은 모래 둔덕. 바다 쪽은 사빈, 위에는 해안사구
    const b = BAR_X, top = seaY - 9;
    extra += barProfile(b, seaY, floorY);
    names += say('bar', '사주', b + 4, seaY + 56, '#ffb38a') + say('dune', '해안사구', b - 16, top - 44, '#e8e3b0') + say('beach', '사빈', b + 70, seaY - 14, '#ffd36b');
    names += say('lagoon', '석호', (wx0 + b) / 2 + (stage === 4 ? 60 : 0), seaY + 30, '#bff0e6');
  }
  if (stage === 4) {
    // 메워진 땅: 안쪽에서부터 쌓인 하천 토사
    const end = secX(FILL_TO[4] + 16);
    extra += `<path data-fill="1" d="M0 ${f1(floorY(0) - 6)}L0 ${seaY - 4}L${f1(end - 30)} ${seaY - 2}L${f1(end)} ${f1(floorY(end))}Z" fill="${MARSH}"/>`;
    names += say('river', '메워진 땅', end / 2, seaY - 14, '#e8e3c8');
  }
  if (stage === 1 || stage === 2) names += say('bay', '만', (wx0 + SEC.W) / 2 - 60, seaY + 34, '#d8efff');
  if (stage === 0) names += say('valley', '하천 골짜기의 바닥', 230, floorY(230) - 18, '#ffe9b0');
  const today = stage === 0 ? `<line x1="0" x2="${SEC.W}" y1="${SEC.sea}" y2="${SEC.sea}" stroke="#d8efff" stroke-width="2" stroke-dasharray="7 6"/><text x="14" y="${SEC.sea - 8}" font-size="16" font-weight="700" fill="#d8efff">오늘날 해수면</text>` : '';
  return `<svg class="sec" viewBox="0 0 ${SEC.W} ${SEC.H}" role="img" aria-label="골짜기 가운데를 육지에서 바다로 자른 단면. ${STAGE_NAMES[stage]} 단계이다.">
    <style>svg.sec text{paint-order:stroke;stroke:#1c211e;stroke-width:3.5px;stroke-linejoin:round}</style>
    <rect width="${SEC.W}" height="${SEC.H}" fill="${AIR}"/>
    ${water}
    <polygon points="0,${SEC.H} ${ground.join(' ')} ${SEC.W},${SEC.H}" fill="#6f665a"/>
    ${extra}
    <line x1="${f1(wx0)}" x2="${SEC.W}" y1="${seaY}" y2="${seaY}" stroke="#d8efff" stroke-width="2"/>
    ${today}
    ${names}
    ${say('wave', '바다', SEC.W - 50, seaY + 44, '#ffffff')}
    <text x="10" y="26" font-size="21" font-weight="800" fill="${ACCENT}">A</text>
    <text x="${SEC.W - 10}" y="26" text-anchor="end" font-size="21" font-weight="800" fill="${ACCENT}">B</text>
    <text x="16" y="${SEC.H - 12}" font-size="15" font-weight="700" fill="#efe9d8">세로를 크게 과장했습니다.</text>
  </svg>`;
}

// options.steps: 단계 버튼을 그릴지. options.stage: 처음 단계. options.onZone: 구역을 눌렀을 때.
export function createSchematic(root, options = {}) {
  let stage = options.stage ?? 3, zone = null;
  const onZone = options.onZone ?? (() => {});
  const paint = () => {
    const buttons = options.steps ? `<div class="row" aria-label="모식도 단계">${STAGE_NAMES.map((t, n) => `<button data-schem-stage="${n}" class="${n === stage ? 'on' : ''}">${t}</button>`).join('')}</div>` : '';
    root.innerHTML = `
      <h2>위에서 본 모습 (모식도)</h2>
      ${buttons}
      <figure>${stage === NO_RISE ? planNoRise() : plan(stage)}</figure>
      <h2>골짜기를 A에서 B로 자른 단면 (모식도)</h2>
      <figure>${stage === NO_RISE ? sectionNoRise() : section(stage)}</figure>
      <p class="schem-note">${zone ? `<b>${ZONE_TEXT[zone].name}</b> ${ZONE_TEXT[zone].text}` : NOTES[stage]}</p>
      <p class="schem-cap">이름을 누르면 설명이 나옵니다. 흰 선은 파봉선, 노란 화살표는 연안류입니다. 해안선과 규모는 설명을 위한 예시이고, 평면과 단면의 거리는 비율을 맞췄습니다.</p>`;
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
