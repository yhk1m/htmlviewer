// © 2026 김용현
// 주소에 ?fps=1 을 붙이면 왼쪽 아래에 초당 화면 수를 보여 준다. 교실 PC 성능을 잴 때 쓴다.
export function createFpsMeter() {
  if (new URLSearchParams(location.search).get('fps') !== '1') return () => {};
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9;padding:4px 8px;background:#000;color:#fff;font:14px monospace';
  document.body.appendChild(el);
  let frames = 0, t0 = performance.now();
  return () => {
    frames++;
    const now = performance.now();
    if (now - t0 >= 1000) { el.textContent = `${Math.round((frames * 1000) / (now - t0))} fps`; frames = 0; t0 = now; }
  };
}
