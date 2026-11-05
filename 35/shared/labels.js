// © 2026 김용현
// 화면 좌표의 이름표 상자를 아래쪽부터 놓고, 겹치면 위로 올린다. 너무 밀리면 숨긴다.
export function resolveOverlaps(items, { gap = 4, maxShift = 60 } = {}) {
  const result = new Map(), placed = [];
  for (const it of [...items].sort((a, b) => b.y - a.y || b.priority - a.priority)) {
    let dy = 0, moved = true;
    while (moved) {
      moved = false;
      const bottom = it.y - dy, top = bottom - it.h, left = it.x - it.w / 2, right = it.x + it.w / 2;
      for (const p of placed) {
        if (right + gap <= p.left || left - gap >= p.right || bottom + gap <= p.top || top - gap >= p.bottom) continue;
        dy = it.y - p.top + gap;
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
