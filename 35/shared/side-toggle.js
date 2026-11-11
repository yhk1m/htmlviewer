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
      tab.style.right = (open ? aside.offsetWidth : 0) + 'px';
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

const side = document.getElementById('side');
const schem = document.getElementById('schem');
if (side) setupSideToggle(side, '진행상황', null);
else if (schem) setupSideToggle(schem, '모식도', document.getElementById('schemBtn'));
