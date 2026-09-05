/* ============================================================
   ЗВУК МЕХАНИЗМОВ
   Ни одного внешнего файла: все щелчки, удары и переливы
   синтезируются на месте через WebAudio.
   ============================================================ */
window.Sfx = (function () {
  'use strict';

  let ctx = null, master = null, noiseBuf = null;
  let enabled = true;

  function boot() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);

    const len = ctx.sampleRate * 1.2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function ready() {
    if (!enabled) return null;
    const c = boot();
    if (!c) return null;
    if (c.state === 'suspended') c.resume();
    return c;
  }

  /* Одиночный тон с огибающей */
  function tone(freq, dur, opts) {
    const c = ready(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = (opts && opts.type) || 'triangle';
    const t = c.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (opts && opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const peak = (opts && opts.gain) || 0.18;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /* Шумовой импульс — дерево, металл, засовы */
  function burst(dur, freq, q, gain, type) {
    const c = ready(); if (!c) return;
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  const api = {
    /* латунный щелчок диска */
    click()  { burst(0.05, 2400, 6, 0.16); tone(1180, 0.05, { gain: 0.05, type: 'square' }); },
    /* мягкое нажатие */
    tap()    { burst(0.035, 1500, 4, 0.09); },
    /* глухой удар дерева */
    thunk()  { burst(0.16, 190, 1.2, 0.32, 'lowpass'); tone(84, 0.22, { gain: 0.12, to: 52 }); },
    /* засов уходит в паз */
    unlock() { burst(0.09, 900, 3, 0.22); setTimeout(() => burst(0.22, 260, 1.5, 0.3, 'lowpass'), 90); },
    /* верный ответ */
    right()  { tone(659.25, 0.5, { gain: 0.12, type: 'sine' }); setTimeout(() => tone(987.77, 0.7, { gain: 0.1, type: 'sine' }), 90); },
    /* ошибка */
    wrong()  { tone(146.83, 0.42, { gain: 0.14, to: 92, type: 'sawtooth' }); burst(0.2, 320, 1, 0.14, 'lowpass'); },
    /* испытание пройдено */
    seal()   { [523.25, 783.99, 1046.5].forEach((f, i) => setTimeout(() => tone(f, 0.9, { gain: 0.1, type: 'sine' }), i * 130)); },
    /* заклинание */
    spell()  { tone(300, 0.7, { gain: 0.1, to: 1900, type: 'sine' }); burst(0.6, 3000, 0.7, 0.07, 'highpass'); },
    /* тиканье времени на исходе */
    tick()   { tone(2000, 0.03, { gain: 0.045, type: 'square' }); },
    /* открытие шкатулки */
    open()   { tone(110, 1.4, { gain: 0.16, to: 330, type: 'sawtooth' }); setTimeout(api.unlock, 700); },

    set(on) {
      enabled = !!on;
      if (enabled) ready();
      try { localStorage.setItem('mrx.sound', enabled ? '1' : '0'); } catch (e) {}
      return enabled;
    },
    get() { return enabled; },
    init() {
      try { const s = localStorage.getItem('mrx.sound'); if (s !== null) enabled = s === '1'; } catch (e) {}
      return enabled;
    }
  };
  return api;
})();
