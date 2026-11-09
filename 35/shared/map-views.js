import { contourSegments, contourLevels, niceInterval, profileAlong } from './contour.js';

// 정해진 폭에 맞춰 띄어쓰기 자리에서 줄을 나눈다.
export function wrapText(ctx, text, maxW) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const fitCanvas = canvas => {
  const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2);
  canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(d, 0, 0, d, 0, 0);
  return { ctx, W: r.width, H: r.height };
};

// 방위표: 지도 오른쪽 위 안쪽에 위쪽을 가리키는 화살표와 N 글자를 그린다. 크기는 지도 칸에 비례한다.
const northBox = (ox, oy, side) => { const h = Math.max(38, Math.min(66, side * 0.1)), w = h * 0.62; return { x: ox + side - 10 - w, y: oy + 8, w, h }; };
function drawNorth(ctx, ox, oy, side) {
  const { x, y, w, h } = northBox(ox, oy, side), cx = x + w / 2;
  const font = h * 0.36, top = y + font + 5, bottom = y + h - 4, half = w * 0.3;
  ctx.save();
  // 등고선과 숫자가 비치지 않게 바탕을 깐다.
  ctx.fillStyle = 'rgba(244,239,226,.95)'; ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#222'; ctx.font = `700 ${font}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('N', cx, y + font + 1);
  ctx.lineJoin = 'round'; ctx.lineWidth = 1.4; ctx.strokeStyle = '#222';
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx + half, bottom); ctx.lineTo(cx, bottom - (bottom - top) * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx - half, bottom); ctx.lineTo(cx, bottom - (bottom - top) * 0.28); ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// 실제 높이로 그린 등고선 지형도. north가 true면 위쪽이 북쪽임을 방위표로 표시한다.
// sizeM이 null이면 실제 지역이 아니므로 축척 막대를 그리지 않고 높이 단위도 붙이지 않는다.
// interval을 주면 그 간격으로 그린다. 낮은 둑을 보여 줘야 하는 모형에서 쓴다.
export function drawContourMap(canvas, { h, N, sizeM, water, north, overlay, interval: fixed }) {
  const { ctx, W, H } = fitCanvas(canvas);
  ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, W, H);
  const side = Math.min(W, H) - 40, ox = (W - side) / 2, oy = (H - side) / 2, sc = side / (N - 1);
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < h.length; k++) { if (h[k] < min) min = h[k]; if (h[k] > max) max = h[k]; }
  const interval = fixed ?? niceInterval(max - min), thick = interval * 5;
  if (water) {
    ctx.fillStyle = '#3f8fc4';
    const s = Math.max(1, sc * 1.1);
    for (let k = 0; k < water.length; k++) if (water[k] > 0.4) ctx.fillRect(ox + (k % N) * sc, oy + ((k / N) | 0) * sc, s, s);
  }
  for (const level of contourLevels(min, max, interval)) {
    const seg = contourSegments(h, N, level), index = level % thick === 0;
    ctx.beginPath();
    for (let s = 0; s < seg.length; s += 4) { ctx.moveTo(ox + seg[s] * sc, oy + seg[s + 1] * sc); ctx.lineTo(ox + seg[s + 2] * sc, oy + seg[s + 3] * sc); }
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = index ? 1.3 : 0.5; ctx.stroke();
    if (index && seg.length) {
      const m = (seg.length / 8 | 0) * 4, tx = ox + seg[m] * sc + 2, ty = oy + seg[m + 1] * sc - 2, box = northBox(ox, oy, side);
      ctx.fillStyle = '#6b431c'; ctx.font = '11px "Malgun Gothic",sans-serif';
      // 방위표와 겹치는 등고선 숫자는 쓰지 않는다.
      if (!north || tx < box.x - 30 || ty > box.y + box.h + 12) ctx.fillText(`${level}`, tx, ty);
    }
  }
  if (overlay) overlay(ctx, { ox, oy, sc, side });
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, side, side);
  ctx.fillStyle = '#222'; ctx.font = '12px "Malgun Gothic",sans-serif';
  if (sizeM) {
    const barM = sizeM >= 5000 ? 1000 : 100, barPx = (barM / sizeM) * side;
    ctx.fillRect(ox + 10, oy + side - 18, barPx, 3);
    ctx.fillText(barM >= 1000 ? `${barM / 1000}km` : `${barM}m`, ox + 10, oy + side - 24);
    ctx.fillText(`등고선 간격 ${interval}m, 굵은 선 ${thick}m`, ox + 10, oy + 18);
  } else {
    ctx.fillText('설명용 모형이라 축척이 없고, 높이 숫자는 모형 단위입니다.', ox + 10, oy + 18);
  }
  if (north) drawNorth(ctx, ox, oy, side);
}

// 두 점을 잇는 실제 땅의 단면. ve는 세로 과장 배율이다.
export function drawProfile(canvas, { h, N, from, to, lengthM, ve, note }) {
  const { ctx, W, H } = fitCanvas(canvas);
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  const samples = 360, p = profileAlong(h, N, from, to, samples);
  let min = Infinity, max = -Infinity;
  for (const v of p) { if (v < min) min = v; if (v > max) max = v; }
  const pad = 60, usableW = W - pad * 2, xScale = usableW / lengthM;
  const yScale = Math.min(xScale * ve, (H - pad * 2) / Math.max(1, max - min));
  const x = s => pad + (s / (samples - 1)) * usableW, y = v => H - pad - (v - min) * yScale;
  ctx.beginPath(); ctx.moveTo(x(0), H);
  for (let s = 0; s < samples; s++) ctx.lineTo(x(s), y(p[s]));
  ctx.lineTo(x(samples - 1), H); ctx.closePath();
  ctx.fillStyle = '#8c7a5c'; ctx.fill();
  ctx.fillStyle = '#f3f1ea'; ctx.font = '700 16px "Malgun Gothic",sans-serif';
  ctx.fillText(`A  ${Math.round(p[0])}m`, x(0), 30);
  ctx.textAlign = 'right';
  ctx.fillText(`B  ${Math.round(p[samples - 1])}m`, x(samples - 1), 30);
  ctx.textAlign = 'left'; ctx.font = '13px "Malgun Gothic",sans-serif';
  ctx.fillText(`A에서 B까지 ${(lengthM / 1000).toFixed(1)}km. 세로를 약 ${(yScale / xScale).toFixed(1)}배 과장해 그렸습니다.`, pad, H - 16);
  if (note) ctx.fillText(note, pad, H - 36);
}

// 낮은 땅의 높이를 색으로 칠한 지도. 몇 m 차이의 자연 제방과 배후 습지를 보여 줄 때 쓴다. hi보다 높은 땅은 한 색이다.
// 땅은 초록에서 노랑, 주황으로 칠한다. 파랑은 water(값이 0.5보다 큰 칸)에만 쓰여 들판이 물처럼 보이지 않는다.
export function drawHeightTint(canvas, { h, N, sizeM, lo, hi, north, overlay, water }) {
  const { ctx, W, H } = fitCanvas(canvas);
  ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, W, H);
  const side = Math.min(W, H) - 40, ox = (W - side) / 2, oy = (H - side) / 2, sc = side / (N - 1);
  const stops = [[0, [46, 122, 72]], [0.3, [122, 182, 96]], [0.55, [214, 222, 118]], [0.8, [244, 186, 84]], [1, [214, 112, 52]]];
  const tone = t => {
    for (let n = 1; n < stops.length; n++) if (t <= stops[n][0]) {
      const [a, ca] = stops[n - 1], [b, cb] = stops[n], u = (t - a) / (b - a);
      return ca.map((c, q) => c + (cb[q] - c) * u);
    }
    return stops[stops.length - 1][1];
  };
  const off = document.createElement('canvas');
  off.width = off.height = N;
  const octx = off.getContext('2d'), img = octx.createImageData(N, N);
  for (let k = 0; k < N * N; k++) {
    const above = h[k] > hi, c = water && water[k] > 0.5 ? [38, 112, 204] : above ? [108, 88, 66] : tone(Math.max(0, (h[k] - lo) / (hi - lo)));
    img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, ox, oy, side, side);
  if (overlay) overlay(ctx, { ox, oy, sc, side });
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, side, side);
  // 색 막대
  const bw = Math.min(190, side * 0.4), bx = ox + 10, by = oy + side - 40;
  ctx.fillStyle = 'rgba(244,239,226,.92)'; ctx.fillRect(bx - 6, by - 20, Math.max(bw, 138) + 12, 54);
  for (let x = 0; x < bw; x++) { const c = tone(x / bw); ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.fillRect(bx + x, by, 1.5, 12); }
  ctx.fillStyle = '#222'; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`${lo}m`, bx, by + 26); ctx.textAlign = 'right'; ctx.fillText(`${hi}m 넘으면 갈색`, bx + bw, by + 26); ctx.textAlign = 'left';
  ctx.fillText('땅 높이(파랑은 물)', bx, by - 6);
  if (sizeM) {
    const barM = 1000, barPx = (barM / sizeM) * side;
    ctx.fillRect(ox + side - barPx - 14, oy + side - 18, barPx, 3);
    ctx.fillText('1km', ox + side - barPx - 14, oy + side - 24);
  }
  if (north) drawNorth(ctx, ox, oy, side);
}

// 굽은 길을 따라 잰 높이의 단면. points: [{ m, z, water }], marks: [{ at, text, color }]. water인 구간은 파란 띠로 칠한다. 글은 폭에 맞춰 줄을 나눈다.
export function drawPathProfile(canvas, { points, marks, from, to, note }) {
  const { ctx, W, H } = fitCanvas(canvas);
  ctx.fillStyle = '#23302a'; ctx.fillRect(0, 0, W, H);
  const pad = W < 520 ? 34 : 60, side = W < 520 ? 12 : 60, usableW = W - pad - side, lengthM = points[points.length - 1].m;
  const noteSize = W < 520 ? 11 : 13, noteGap = noteSize + 4;
  ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  const lines = [...wrapText(ctx, note ?? '', W - pad - side), '세로를 크게 과장해 그렸습니다.'];
  const foot = lines.length * noteGap + 18;
  let min = Infinity, max = -Infinity;
  for (const p of points) { if (p.z < min) min = p.z; if (p.z > max) max = p.z; }
  min = Math.floor(min / 5) * 5; max = Math.ceil(max / 5) * 5;
  const xScale = usableW / lengthM, yScale = (H - foot - 86) / Math.max(1, max - min);
  const x = m => pad + m * xScale, y = z => H - foot - (z - min) * yScale;
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.fillStyle = '#c9c7bb'; ctx.font = '12px "Malgun Gothic",sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'right';
  for (let z = min; z <= max; z += 5) { ctx.beginPath(); ctx.moveTo(pad, y(z)); ctx.lineTo(W - side, y(z)); ctx.stroke(); ctx.fillText(`${z}m`, pad - 4, y(z) + 4); }
  ctx.beginPath(); ctx.moveTo(x(0), y(min));
  for (const p of points) ctx.lineTo(x(p.m), y(p.z));
  ctx.lineTo(x(lengthM), y(min)); ctx.lineTo(x(0), y(min)); ctx.closePath();
  ctx.fillStyle = '#8c7a5c'; ctx.fill();
  // 물: 그 구간 위를 파란 띠로 덮는다.
  ctx.strokeStyle = '#4aa8ee'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  points.forEach((p, t) => { const q = points[t + 1]; if (q && p.water && q.water) { ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(q.m), y(q.z)); ctx.stroke(); } });
  ctx.lineCap = 'butt';
  ctx.font = `700 ${W < 520 ? 13 : 15}px "Malgun Gothic",sans-serif`; ctx.textAlign = 'center';
  const used = [];
  for (const k of marks) {
    const p = points[k.at], w = ctx.measureText(k.text).width, tx = Math.min(W - 4 - w / 2, Math.max(pad + w / 2, x(p.m)));
    // 글끼리 겹치면 위로 올린다.
    let ty = y(p.z) - 32;
    while (used.some(u => Math.abs(u.x - tx) < (u.w + w) / 2 + 6 && Math.abs(u.y - ty) < 18)) ty -= 18;
    used.push({ x: tx, y: ty, w });
    ctx.strokeStyle = k.color; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x(p.m), y(p.z)); ctx.lineTo(x(p.m), ty + 5); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#1c211e'; ctx.strokeText(k.text, tx, ty);
    ctx.fillStyle = k.color; ctx.fillText(k.text, tx, ty);
  }
  ctx.fillStyle = '#f3f1ea'; ctx.font = '700 16px "Malgun Gothic",sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(from, pad, 26);
  ctx.textAlign = 'right'; ctx.fillText(to, W - side, 26);
  ctx.textAlign = 'left'; ctx.font = `${noteSize}px "Malgun Gothic",sans-serif`;
  lines.forEach((t, n) => ctx.fillText(t, pad > 34 ? pad : 8, H - foot + 18 + n * noteGap));
}
