// © 2026 김용현
export function setupPanel(button, onChange, startClosed) {
  const set = on => {
    document.body.classList.toggle('panel-closed', on);
    button.textContent = on ? '조작 열기' : '접기';
    onChange();
  };
  button.onclick = () => set(!document.body.classList.contains('panel-closed'));
  set(startClosed);
  return set;
}
