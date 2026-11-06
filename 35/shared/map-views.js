import { contourSegments, contourLevels, niceInterval, profileAlong } from './contour.js';

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
export function drawContourMap(canvas, { h, N, sizeM, water, north, overlay }) {
  const { ctx, W, H } = fitCanvas(canvas);
  ctx.fillStyle = '#f4efe2'; ctx.fillRect(0, 0, W, H);
  const side = Math.min(W, H) - 40, ox = (W - side) / 2, oy = (H - side) / 2, sc = side / (N - 1);
  let min = Infinity, max = -Infinity;
  for (let k = 0; k < h.length; k++) { if (h[k] < min) min = h[k]; if (h[k] > max) max = h[k]; }
  const interval = niceInterval(max - min), thick = interval * 5;
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
    ctx.fillText('설명용 모형이라 축척이 없습니다.', ox + 10, oy + 18);
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
