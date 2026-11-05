// © 2026 김용현
export const QUALITY = {
  high: { pixelRatio: 2, shadow: 4096, trees: 1 },
  low: { pixelRatio: 1.25, shadow: 2048, trees: 0.35 },
};
const KEY = 'landform-quality';

export function resolveQuality(search, stored, phone) {
  const q = new URLSearchParams(search).get('q');
  if (QUALITY[q]) return q;
  if (QUALITY[stored]) return stored;
  return phone ? 'low' : 'high';
}

const readStored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function currentQuality(phone) {
  return resolveQuality(location.search, readStored(), phone);
}

export function setupQualityButton(button, current) {
  button.textContent = current === 'high' ? '화질 낮추기' : '화질 높이기';
  button.onclick = () => {
    try { localStorage.setItem(KEY, current === 'high' ? 'low' : 'high'); } catch { /* 저장을 못 하면 주소의 q 값으로 고른다 */ }
    // 주소에 q가 있으면 그 값이 저장값보다 앞서므로 지우고 다시 연다.
    const params = new URLSearchParams(location.search);
    if (params.has('q')) {
      params.delete('q');
      const rest = params.toString();
      location.href = location.pathname + (rest ? `?${rest}` : '') + location.hash;
    } else location.reload();
  };
}
