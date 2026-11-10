// © 2026 김용현
// 형성 모형의 진행 막대. 얼마나 진행됐는지 보여 주고, 막대를 누르면 그 시점으로 옮긴다.
// 모형은 같은 조건이면 같은 결과가 나오므로, 처음부터 다시 계산해 그 시점까지 빠르게 돌려서 옮긴다.

// 막대 위 x 위치를 0~1 비율로 바꾼다.
export function fracAt(clientX, left, width) {
  if (!(width > 0)) return 0;
  return Math.max(0, Math.min(1, (clientX - left) / width));
}

// 목표 비율까지 한 번에 돌릴 계산 횟수를 정한다. 한 화면(약 1/60초)에 budgetMs 동안만 계산해 화면이 멈추지 않게 한다.
export function seekPlan(now, target, total) {
  const goal = Math.max(0, Math.min(1, target)) * total;
  return { goal, back: goal < now - 1e-9 };
}

// host: 막대를 넣을 요소. opts:
//   clock(): 지금 시각, total(): 끝나는 시각, reset(): 모형을 처음으로, step(dt): 모형을 dt초 진행,
//   finished(): 끝났는지, pause(): 재생 중이었는지 돌려주고 멈춤, resume(wasPlaying, done): 옮긴 뒤 화면을 맞추고 재생 상태를 되돌림.
export function createProgressBar(host, opts) {
  const DT = opts.dt ?? 1 / 30, BUDGET_MS = opts.budgetMs ?? 24;
  const wrap = document.createElement('div');
  wrap.className = 'prog';
  wrap.setAttribute('role', 'slider');
  wrap.setAttribute('aria-label', '형성 과정 진행. 누르면 그 시점으로 옮깁니다.');
  wrap.setAttribute('aria-valuemin', '0');
  wrap.setAttribute('aria-valuemax', '100');
  wrap.tabIndex = 0;
  wrap.innerHTML = '<div class="prog-track"><div class="prog-fill"></div><div class="prog-ghost"></div><div class="prog-knob"></div><span class="prog-tip"></span></div>';
  host.appendChild(wrap);
  const fill = wrap.querySelector('.prog-fill'), knob = wrap.querySelector('.prog-knob'), ghost = wrap.querySelector('.prog-ghost'), tip = wrap.querySelector('.prog-tip'), track = wrap.querySelector('.prog-track');
  let job = null, dragging = false, shown = -1;

  const frac = () => { const t = opts.total(); return t > 0 ? Math.max(0, Math.min(1, opts.clock() / t)) : 0; };
  const draw = (f, target) => {
    const pct = (f * 100).toFixed(2) + '%';
    fill.style.width = pct;
    knob.style.left = pct;
    if (target == null) { ghost.style.display = 'none'; wrap.classList.remove('seeking'); }
    else { ghost.style.display = 'block'; ghost.style.left = (target * 100).toFixed(2) + '%'; wrap.classList.add('seeking'); }
    wrap.setAttribute('aria-valuenow', String(Math.round(f * 100)));
  };

  function seek(target) {
    const wasPlaying = job ? job.wasPlaying : opts.pause();
    const plan = seekPlan(opts.clock(), target, opts.total());
    if (plan.back || opts.finished()) opts.reset();
    job = { goal: plan.goal, target, wasPlaying };
    const run = () => {
      if (!job || job.run !== run) return;
      // 옮기는 동안 조건을 바꿔 모형이 처음으로 돌아갔으면 옮기기를 그만둔다.
      if (job.last != null && opts.clock() < job.last - 1e-9) { job = null; draw(frac(), null); return; }
      const t0 = performance.now();
      while (opts.clock() < job.goal - 1e-9 && !opts.finished() && performance.now() - t0 < BUDGET_MS) opts.step(Math.min(DT, job.goal - opts.clock()));
      job.last = opts.clock();
      if (opts.clock() < job.goal - 1e-9 && !opts.finished()) { draw(frac(), job.target); requestAnimationFrame(run); return; }
      const w = job.wasPlaying;
      job = null;
      draw(frac(), null);
      opts.resume(w, true);
    };
    job.run = run;
    draw(frac(), target);
    requestAnimationFrame(run);
  }

  const at = e => { const r = track.getBoundingClientRect(); return fracAt(e.clientX, r.left, r.width); };
  const hover = f => { tip.textContent = `${Math.round(f * 100)}%`; tip.style.left = (f * 100).toFixed(2) + '%'; };
  wrap.addEventListener('pointerdown', e => { dragging = true; wrap.setPointerCapture(e.pointerId); const f = at(e); hover(f); draw(frac(), f); wrap.classList.add('drag'); });
  wrap.addEventListener('pointermove', e => { const f = at(e); hover(f); if (dragging) draw(frac(), f); });
  wrap.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; wrap.classList.remove('drag'); seek(at(e)); });
  wrap.addEventListener('pointercancel', () => { dragging = false; wrap.classList.remove('drag'); draw(frac(), job ? job.target : null); });
  wrap.addEventListener('keydown', e => {
    const step = e.key === 'ArrowRight' ? 0.05 : e.key === 'ArrowLeft' ? -0.05 : e.key === 'Home' ? -1 : e.key === 'End' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    seek(Math.max(0, Math.min(1, (job ? job.target : frac()) + step)));
  });

  return {
    // 매 화면 불러 막대를 맞춘다. 옮기는 중에는 옮기는 코드가 그린다.
    update() {
      if (job || dragging) return;
      const f = frac();
      if (Math.abs(f - shown) < 0.0005) return;
      shown = f;
      draw(f, null);
    },
    seek,
    get seeking() { return !!job; },
    cancel() { job = null; draw(frac(), null); },
    el: wrap,
  };
}
