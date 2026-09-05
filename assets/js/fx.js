/* ============================================================
   АТМОСФЕРА
   Пепел в воздухе, свет палочки за курсором, вспышки заклинаний.
   ============================================================ */
window.Fx = (function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- фоновая взвесь: пепел и пылинки ---------- */
  const amb = document.getElementById('ambient');
  const actx = amb ? amb.getContext('2d') : null;
  let motes = [], W = 0, H = 0, dpr = 1;

  function sizeCanvas(cv, cx) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    const count = Math.round(Math.min(90, (W * H) / 16000));
    motes = [];
    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        vy: -(Math.random() * 0.22 + 0.05),
        vx: (Math.random() - 0.5) * 0.16,
        a: Math.random() * 0.5 + 0.12,
        ph: Math.random() * Math.PI * 2,
        ember: Math.random() < 0.16
      });
    }
  }

  function drawAmbient(t) {
    if (!actx) return;
    actx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.x += m.vx + Math.sin(t / 2600 + m.ph) * 0.14;
      m.y += m.vy;
      if (m.y < -8) { m.y = H + 8; m.x = Math.random() * W; }
      if (m.x < -8) m.x = W + 8; else if (m.x > W + 8) m.x = -8;
      const glow = m.a * (0.6 + 0.4 * Math.sin(t / 900 + m.ph));
      actx.beginPath();
      actx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      actx.fillStyle = m.ember
        ? 'rgba(212,98,42,' + (glow * 0.9).toFixed(3) + ')'
        : 'rgba(240,214,138,' + (glow * 0.55).toFixed(3) + ')';
      actx.fill();
    }
  }

  /* ---------- слой заклинаний ---------- */
  const fxc = document.getElementById('fx');
  const fctx = fxc ? fxc.getContext('2d') : null;
  let sparks = [], patronusUntil = 0, pStage = null;

  function drawSparks(t, dt) {
    if (!fctx) return;
    fctx.clearRect(0, 0, W, H);

    if (t < patronusUntil && pStage) {
      pStage.a += dt * 0.0012;
      for (let i = 0; i < 3; i++) {
        const ang = pStage.a * 2 + i * 2.1;
        sparks.push({
          x: W / 2 + Math.cos(ang) * (120 + Math.sin(pStage.a * 3) * 70),
          y: H / 2 + Math.sin(ang * 1.3) * 90 - pStage.a * 24,
          vx: (Math.random() - 0.5) * 0.6, vy: -(Math.random() * 0.5 + 0.1),
          life: 1, r: Math.random() * 2.4 + 0.8, c: '190,225,255'
        });
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * dt * 0.06; s.y += s.vy * dt * 0.06;
      s.life -= dt * 0.0009;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      fctx.beginPath();
      fctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
      fctx.fillStyle = 'rgba(' + s.c + ',' + (s.life * 0.8).toFixed(3) + ')';
      fctx.fill();
    }
  }

  let last = 0;
  function loop(t) {
    const dt = Math.min(50, t - last); last = t;
    drawAmbient(t);
    drawSparks(t, dt);
    requestAnimationFrame(loop);
  }

  /* ---------- свет палочки ---------- */
  const glow = document.getElementById('lumos');
  function bindPointer() {
    if (!glow || !window.matchMedia('(pointer:fine)').matches) return;
    document.body.classList.add('has-pointer');
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(function follow() {
        cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
        glow.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
        raf = (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(follow) : 0;
      });
    }, { passive: true });
  }

  /* ---------- публичные эффекты ---------- */
  const api = {
    burst(x, y, color, n) {
      if (reduced) return;
      const c = color || '240,214,138';
      for (let i = 0; i < (n || 40); i++) {
        const a = Math.random() * Math.PI * 2, sp = Math.random() * 2.4 + 0.4;
        sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.4,
                      life: 1, r: Math.random() * 2.6 + 0.8, c: c });
      }
    },
    burstOn(el, color, n) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      api.burst(r.left + r.width / 2, r.top + r.height / 2, color, n);
    },
    patronus(ms) {
      if (reduced) return;
      pStage = { a: 0 };
      patronusUntil = performance.now() + (ms || 4200);
    },
    lumos(on) { document.body.classList.toggle('lumos-max', !!on); document.body.classList.remove('nox'); },
    nox(on)   { document.body.classList.toggle('nox', !!on); document.body.classList.remove('lumos-max'); },
    shake(el) {
      if (!el || reduced) return;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 460);
    },
    reduced: reduced,

    init() {
      if (!actx || !fctx) return;
      const resize = () => { sizeCanvas(amb, actx); sizeCanvas(fxc, fctx); seed(); };
      resize();
      let rt;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
      bindPointer();
      if (!reduced) requestAnimationFrame(loop);
      else drawAmbient(0);
    }
  };
  return api;
})();
