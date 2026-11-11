// © 2026 김용현
// 화면 좌표의 이름표 상자를 아래쪽부터 놓고, 겹치면 위로 올린다. 너무 밀리면 숨긴다.
export function resolveOverlaps(items, { gap = 4, maxShift = 60 } = {}) {
  // EPS: 소수 계산 오차로 맞닿은 상자가 '겹침'으로 판정되어 같은 값을 끝없이 되풀이하는 것을 막는 여유.
  const EPS = 0.01, result = new Map(), placed = [];
  for (const it of [...items].sort((a, b) => b.y - a.y || b.priority - a.priority)) {
    // 위치나 크기가 숫자가 아니면(카메라 계산이 잠깐 어긋날 때) 그 이름표만 숨긴다.
    if (![it.x, it.y, it.w, it.h].every(Number.isFinite)) { result.set(it.id, { dy: 0, hidden: true }); continue; }
    let dy = 0, moved = true, rounds = 0;
    // 한 번 옮길 때마다 dy는 늘기만 하므로, 놓인 상자 수보다 많이 돌 일은 없다. 그래도 상한을 둔다.
    while (moved && rounds++ <= placed.length + 1) {
      moved = false;
      const bottom = it.y - dy, top = bottom - it.h, left = it.x - it.w / 2, right = it.x + it.w / 2;
      for (const p of placed) {
        if (right + gap <= p.left + EPS || left - gap >= p.right - EPS || bottom + gap <= p.top + EPS || top - gap >= p.bottom - EPS) continue;
        const next = it.y - p.top + gap;
        if (next <= dy + EPS) continue;
        dy = next;
        moved = true;
        break;
      }
    }
    const hidden = dy > maxShift && !it.keep;
    result.set(it.id, { dy, hidden });
    if (!hidden) placed.push({ left: it.x - it.w / 2, right: it.x + it.w / 2, top: it.y - dy - it.h, bottom: it.y - dy });
  }
  return result;
}

export function createLabelLayer(root) {
  const entries = new Map();
  const add = (key, name, tip = '', cls = '') => {
    const el = document.createElement('div');
    el.className = `label ${cls}`;
    el.innerHTML = `<b>${name}</b>${tip ? `<span>${tip}</span>` : ''}`;
    root.appendChild(el);
    entries.set(key, { el, w: 0, h: 0 });
    return el;
  };
  // list: [{ key, x, y, priority }]. 목록에 없는 이름표는 숨긴다.
  const place = list => {
    const shown = new Set(list.map(l => l.key));
    for (const [key, e] of entries) if (!shown.has(key)) e.el.style.display = 'none';
    const items = list.map(l => {
      const e = entries.get(l.key);
      e.el.style.display = 'block';
      if (!e.w) { e.w = e.el.offsetWidth; e.h = e.el.offsetHeight; }
      return { id: l.key, x: l.x, y: l.y, w: e.w, h: e.h, priority: l.priority ?? 0, keep: !!l.keep };
    });
    const moved = resolveOverlaps(items);
    for (const it of items) {
      const { el } = entries.get(it.id), { dy, hidden } = moved.get(it.id);
      el.style.display = hidden ? 'none' : 'block';
      el.style.setProperty('--lead', `${(innerWidth <= 820 ? 12 : 22) + dy}px`);
      el.style.transform = `translate(-50%,-100%) translate(${it.x}px,${it.y}px)`;
    }
  };
  return { add, place, element: key => entries.get(key).el };
}
