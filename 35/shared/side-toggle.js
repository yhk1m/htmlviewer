// © 2026 김용현
// 오른쪽 창(형성 모형의 진행상황, 실제 지형의 모식도)을 접고 여는 탭. 페이지에 넣기만 하면 #side 또는 #schem을 찾아 붙는다.
// 실제 지형 화면은 왼쪽 조작 창의 '모식도' 버튼(#schemBtn)과 상태를 함께 쓰도록 그 버튼을 눌러 바꾼다.
import { isPhone } from './viewport.js';

export function setupSideToggle(aside, name, button) {
  const tab = document.createElement('button');
  tab.className = 'side-tab';
  tab.type = 'button';
  document.body.appendChild(tab);

  const place = () => {
    const open = !aside.hidden;
    const phone = isPhone();
    // 넓은 화면: 창 왼쪽 가장자리에 붙은 세로 손잡이(화살표와 세로 글씨). 휴대폰: 아래 창 위 작은 버튼.
    tab.classList.toggle('edge', !phone);
    if (phone) tab.textContent = open ? `${name} 접기` : `${name} 열기`;
    else tab.innerHTML = `<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><polyline points="${open ? '3,1 7,5 3,9' : '7,1 3,5 7,9'}" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>${open ? '접기' : name}</span>`;
    tab.setAttribute('aria-label', open ? `${name} 창 접기` : `${name} 창 열기`);
    tab.setAttribute('aria-expanded', String(open));
    tab.classList.toggle('closed', !open);
    if (phone) {
      // 휴대폰에서는 아래 창 위쪽 오른쪽 모서리 안에 둔다(창 위 범례를 가리지 않게).
      tab.style.right = '12px';
      tab.style.top = 'auto';
      tab.style.bottom = (open ? aside.offsetHeight - 44 : 12) + 'px';
    } else {
      tab.style.bottom = 'auto';
      tab.style.top = '50%';
      const box = document.body.classList.contains('merged') ? document.getElementById('col') : aside;
      tab.style.right = (open ? box.offsetWidth : 0) + 'px';
    }
  };

  tab.onclick = () => {
    if (button) button.click();
    else {
      aside.hidden = !aside.hidden;
      dispatchEvent(new Event('resize'));
    }
    place();
  };
  new MutationObserver(place).observe(aside, { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', place);
  place();
  return { tab, place };
}

// 넓은 화면에서는 왼쪽 조작 창과 오른쪽 창을 오른쪽의 한 칸(#col)에 위아래로 담는다. 오른쪽 창을 접거나 휴대폰 화면이면 둘 다 원래 자리로 돌아간다.
// 오른쪽 창 속은 장면이 innerHTML로 다시 쓰기도 하므로, 조작 창은 오른쪽 창 안이 아니라 그 위에 둔다.
// 합쳐지면 body에 merged가 붙고, 각 장면은 이때 왼쪽 창 너비를 0으로 보고 3D 화면 중심을 잡는다.
export function setupMerge(aside, panel) {
  const col = document.createElement('div');
  col.id = 'col';
  document.body.appendChild(col);
  const panelHome = document.createComment('panel-home'), asideHome = document.createComment('aside-home');
  panel.before(panelHome);
  aside.before(asideHome);
  // 조작 창의 작은 글씨 안내문(.cap)은 길어서, 합친 칸에서는 맨 아래로 내려 진행상황과 모식도가 먼저 보이게 한다.
  const notes = document.createElement('div');
  notes.id = 'colNotes';
  const caps = [...panel.querySelectorAll(':scope > p.cap')].filter(el => el.id !== 'heightNote').map(el => {
    const home = document.createComment('cap-home');
    el.before(home);
    return { el, home };
  });
  const apply = () => {
    const merge = !isPhone() && !aside.hidden;
    const was = document.body.classList.contains('merged');
    if (merge && panel.parentNode !== col) {
      col.append(panel, aside);
      if (caps.length) { for (const c of caps) notes.append(c.el); col.append(notes); }
    }
    if (!merge && panel.parentNode === col) {
      for (const c of caps) c.home.after(c.el);
      notes.remove();
      panelHome.after(panel); asideHome.after(aside);
    }
    document.body.classList.toggle('merged', merge);
    // 장면이 3D 화면 중심을 다시 잡도록 알린다(상태가 바뀐 때만).
    if (was !== merge) dispatchEvent(new Event('resize'));
  };
  new MutationObserver(apply).observe(aside, { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', apply);
  apply();
  return apply;
}

const side = document.getElementById('side');
const schem = document.getElementById('schem');
if (side) setupSideToggle(side, '진행상황', null);
else if (schem) setupSideToggle(schem, '모식도', document.getElementById('schemBtn'));
const panel = document.getElementById('panel');
if (panel && (side || schem)) setupMerge(side || schem, panel);
