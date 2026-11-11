// © 2026 김용현
// 자세한 출처(#foot)는 평소에 접어 두고, 원 안의 i 버튼을 누르면 펼친다. 한 번 더 누르거나 Esc를 누르면 닫는다.
// 왼쪽 아래 알림 묶음(#corner)이 있으면 그 맨 아래에 버튼을 두어, 펼친 출처가 버튼 바로 위에 뜬다.
export function setupCredits() {
  const foot = document.getElementById('foot');
  if (!foot || document.querySelector('.info-btn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info-btn';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="6.2" r="1.15" fill="currentColor"/><path d="M10 9v5.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  if (!foot.id) foot.id = 'foot';
  btn.setAttribute('aria-controls', 'foot');
  const set = open => {
    document.body.classList.toggle('foot-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '출처 닫기' : '출처 보기');
    btn.title = open ? '출처 닫기' : '출처 보기';
  };
  btn.onclick = () => set(!document.body.classList.contains('foot-open'));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  const corner = document.getElementById('corner');
  if (corner && corner.contains(foot)) corner.appendChild(btn);
  else { btn.classList.add('floating'); document.body.appendChild(btn); }
  set(false);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupCredits);
else setupCredits();
