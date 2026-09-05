/* ============================================================
   ШКАТУЛКА: СБОРКА
   Состояние, переходы между камерами, счёт, заклинания.
   ============================================================ */
(function () {
  'use strict';
  const Q = window.QUEST, C = window.Chambers, el = C.el;
  const KEY = 'mrx.save.v1';

  const stage   = document.getElementById('stage');
  const rail    = document.getElementById('rail');
  const toastEl = document.getElementById('toast');
  const hudScore= document.getElementById('hudScore');
  const hudTime = document.getElementById('hudTime');
  const hudHouse= document.getElementById('hudHouse');
  const hudSigil= document.getElementById('hudSigil');
  const spellbar= document.getElementById('spellbar');
  const spellIn = document.getElementById('spellInput');

  const blank = () => ({ house: null, chamber: 'gate', score: 0, elapsed: 0, done: {}, log: {} });

  const App = {
    state: blank(),
    currentHint: null,
    currentSolve: null,
    cleanup: null,
    onResize: null
  };
  window.App = App;

  /* ---------- сохранение ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.chamber) App.state = Object.assign(blank(), s);
      }
    } catch (e) { /* приватный режим — играем без сохранения */ }
  }
  App.save = function () {
    App.state.elapsed = elapsed();
    try { localStorage.setItem(KEY, JSON.stringify(App.state)); } catch (e) {}
    paintHud();
  };

  /* ---------- время ---------- */
  let sessionStart = performance.now();
  function elapsed() { return App.state.elapsed + (performance.now() - sessionStart); }
  function commitTime() { App.state.elapsed = elapsed(); sessionStart = performance.now(); }

  /* ---------- вспомогательное ---------- */
  function logOf(id) {
    if (!App.state.log[id]) App.state.log[id] = { points: null, misses: 0, hints: 0, penalty: 0 };
    return App.state.log[id];
  }
  App.toast = function (msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(App.toast._t);
    App.toast._t = setTimeout(() => toastEl.classList.remove('show'), 4200);
  };
  App.miss = function (id, cost) {
    const l = logOf(id); l.misses++; l.penalty += cost; App.save();
  };
  App.spendHint = function (id, cost) {
    const l = logOf(id); l.hints++; l.penalty += cost; App.save();
  };

  App.setHouse = function (key) {
    App.state.house = key;
    const H = Q.HOUSES[key];
    if (!H) return;
    document.documentElement.style.setProperty('--sigil', H.color);
    document.documentElement.style.setProperty('--sigil-soft', H.color + '33');
    hudHouse.textContent = H.name;
    App.save();
  };

  /* ---------- завершение камеры ---------- */
  App.complete = function (id, points) {
    const l = logOf(id);
    const net = Math.max(0, Math.round(points - l.penalty));
    l.points = net;
    App.state.score += net;
    App.state.done[id] = true;
    if (points > 0) App.toast('Печать поставлена: +' + net + ' баллов');
    const i = Q.CHAMBERS.findIndex(c => c.id === id);
    const nxt = Q.CHAMBERS[i + 1];
    App.save();
    go(nxt ? nxt.id : 'mirror');
  };

  /* Кнопка «дальше», когда камера решена, но игрок ещё читает разбор */
  App.finishLater = function (id, fn) {
    const actions = stage.querySelector('.chamber .actions');
    const b = el('button', { class: 'btn', type: 'button', onclick: fn }, ['Следующее испытание →']);
    if (actions) actions.insertBefore(b, actions.firstChild);
    else stage.querySelector('.chamber').appendChild(el('div', { class: 'actions' }, [b]));
    b.focus();
    paintRail();
  };

  /* ---------- панель ---------- */
  function paintHud() {
    hudScore.textContent = String(App.state.score);
    const ms = elapsed(), m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60;
    hudTime.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  setInterval(paintHud, 1000);

  /* ---------- рельс печатей ---------- */
  function paintRail() {
    rail.textContent = '';
    Q.CHAMBERS.filter(c => c.id !== 'gate').forEach((c, i, arr) => {
      const done = !!App.state.done[c.id];
      const now = App.state.chamber === c.id;
      const l = App.state.log[c.id];
      const b = el('button', {
        class: 'seal' + (done ? ' seal--done' : '') + (now ? ' seal--now' : ''),
        type: 'button',
        title: c.num + '. ' + c.name + (done && l ? ' — ' + l.points + ' баллов' : (now ? ' — сейчас здесь' : ' — ещё заперто')),
        disabled: !now && !done,
        onclick: () => { if (now) go(c.id); else if (done) App.toast(c.num + '. ' + c.name + ' — печать поставлена, ' + (l ? l.points : 0) + ' баллов.'); }
      }, [
        (function () { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          const u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
          u.setAttribute('href', '#sig-seal'); s.appendChild(u); return s; })(),
        el('span', { class: 'seal__num', text: c.num })
      ]);
      rail.appendChild(b);
      if (i < arr.length - 1) rail.appendChild(el('span', { class: 'rail__line' }));
    });
  }

  /* ---------- переход ---------- */
  function go(id) {
    if (App.cleanup) { try { App.cleanup(); } catch (e) {} }
    App.cleanup = null; App.currentHint = null; App.currentSolve = null; App.onResize = null;
    commitTime();
    App.state.chamber = id;
    App.save();
    paintRail();

    stage.classList.add('turning');
    window.Sfx.thunk();
    setTimeout(() => {
      stage.textContent = '';
      stage.classList.remove('turning');
      const fn = C[id] || C.gate;
      fn(stage, App);
      stage.scrollIntoView({ block: 'nearest', behavior: window.Fx.reduced ? 'auto' : 'smooth' });
    }, window.Fx.reduced ? 0 : 340);
  }
  App.go = go;

  App.reset = function (confirmed) {
    if (!confirmed && !window.confirm('Обливиэйт сотрёт весь прогресс: баллы, печати и факультет. Продолжить?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    App.state = blank();
    sessionStart = performance.now();
    document.documentElement.style.setProperty('--sigil', '#b8892f');
    hudHouse.textContent = 'Факультет не определён';
    App.save();
    go('gate');
  };

  /* ============================================================
     ЗАКЛИНАНИЯ
     ============================================================ */
  const CASTS = {
    lumos() { window.Fx.lumos(true); App.toast('Люмос. Света стало больше — но не понимания.'); },
    nox()   { window.Fx.nox(true);   App.toast('Нокс. Темнота вам к лицу.'); },
    accio() {
      if (App.currentHint) App.currentHint();
      else App.toast('Здесь нечего призывать.');
    },
    alohomora() {
      if (!App.currentSolve) { App.toast('Этот замок не поддаётся Алохоморе.'); return; }
      const id = App.state.chamber;
      App.miss(id, 60);
      App.toast('Алохомора. Замок открыт нечестно: −60 баллов.');
      App.currentSolve();
    },
    patronus() {
      window.Fx.patronus(5000); window.Sfx.spell();
      App.toast('Экспекто Патронум! Серебряный силуэт делает круг по комнате и тает.');
    },
    sectumsempra() {
      window.Sfx.wrong();
      const r = { x: innerWidth / 2, y: innerHeight / 2 };
      window.Fx.burst(r.x, r.y, '142,43,28', 90);
      App.toast('Для врагов. Снегг был бы недоволен, что вы это знаете.');
    },
    obliviate() { App.reset(); }
  };

  function cast(raw) {
    const key = (raw || '').trim().toLowerCase().replace(/[!.,]+$/, '').replace(/\s+/g, ' ');
    const name = Q.SPELLS[key];
    if (!name) { App.toast('Шкатулка не знает такого слова.'); return; }
    window.Sfx.spell();
    CASTS[name]();
  }

  function toggleSpellbar(force) {
    const show = force !== undefined ? force : spellbar.hidden;
    spellbar.hidden = !show;
    if (show) { spellIn.value = ''; spellIn.focus(); }
  }

  spellIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { cast(spellIn.value); toggleSpellbar(false); }
    if (e.key === 'Escape') toggleSpellbar(false);
  });
  document.getElementById('btnSpell').addEventListener('click', () => toggleSpellbar());
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (!typing && (e.key === '`' || e.key === '~' || e.key === 'ё' || e.key === 'Ё')) {
      e.preventDefault(); toggleSpellbar();
    }
    if (e.key === 'Escape' && !spellbar.hidden) toggleSpellbar(false);
  });

  /* ---------- звук и сброс ---------- */
  const btnSound = document.getElementById('btnSound');
  btnSound.addEventListener('click', () => {
    const on = window.Sfx.set(!window.Sfx.get());
    btnSound.setAttribute('aria-pressed', String(on));
    if (on) window.Sfx.click();
  });
  document.getElementById('btnReset').addEventListener('click', () => App.reset());

  window.addEventListener('resize', () => { if (App.onResize) App.onResize(); });
  window.addEventListener('beforeunload', () => App.save());

  /* ---------- запуск ---------- */
  load();
  window.Fx.init();
  btnSound.setAttribute('aria-pressed', String(window.Sfx.init()));
  if (App.state.house) App.setHouse(App.state.house);
  paintHud();
  paintRail();
  (C[App.state.chamber] || C.gate)(stage, App);
  if (App.state.chamber !== 'gate') App.toast('Шкатулка помнит вас. Продолжаем с того же места.');
})();
