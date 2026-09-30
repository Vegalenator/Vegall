/* «Свет и Тень» — движок, отрисовка, звук.
   Мир считается фиксированным шагом 1/120 с; отрисовка — на каждом кадре.
   Логика мира (Sim) не трогает DOM, поэтому её можно гонять в node для проверок. */
(function () {
'use strict';

const T = 30, COLS = 32, ROWS = 18, VW = COLS * T, VH = ROWS * T;
const GRAV = 1400, AFTER = 4, SGRACE = 0.35, SHADOW_T = 2.6, SHADOW_CD = 0.8;
const STEP = 1 / 120, RUN_TIME = 7 * 60, OUTRO = 3.6;

const HERO = {
  luma: { id: 'luma', name: 'Люма', w: 16, h: 30, speed: 180, jump: 560,
    keys: { left: ['KeyA'], right: ['KeyD'], jump: ['KeyW'], act: ['KeyS'], shadow: [] } },
  nox: { id: 'nox', name: 'Нокс', w: 16, h: 36, speed: 150, jump: 480,
    keys: { left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'], act: ['ArrowDown'],
      shadow: ['ShiftRight', 'Slash', 'Numpad0'] } },
};

const LINES = {
  noxBlocked: ['nox', 'Свет. Туда мне нельзя.'],
  noxBlocked2: ['nox', 'Люма, там слишком светло.'],
  refuse: ['luma', 'Нокс, выйди из-под фонаря!'],
  noxLight: ['nox', 'Зажигать — это к Люме.'],
  lumaBox: ['luma', 'Там искрит. Это по твоей части.'],
  noPower: ['luma', 'Не горит. Тока нет.'],
  lumaGrate: ['luma', 'Не пролезу. Нокс?'],
  bridge: ['luma', 'Смотри! Мост из света!'],
  sbridge: ['nox', 'Темнота тоже умеет строить.'],
  afterglow: ['luma', 'Бегом, пока светится!'],
  powerOff: ['luma', 'Ой. Темно.'],
  powerOn: ['luma', 'Да будет свет!'],
  shadow: ['nox', 'Меня здесь нет.'],
  lever: ['luma', 'А эта штука что делает?'],
  leverOk: ['nox', 'В этот раз — то, что надо.'],
  onNox: ['nox', 'Только не на голову.'],
  onLuma: ['luma', 'Ай! Ты тяжёлый!'],
  onLuma2: ['nox', 'Это пальто.'],
  fallLuma: ['luma', 'Бррр! Мокро!'],
  fallNox: ['nox', 'Прекрасно. Теперь ещё и мокрый.'],
};

/* ---------- утилиты ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const grid = v => Array.from({ length: ROWS }, () => Array(COLS).fill(v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* =====================================================================
   Sim — мир уровня
   ===================================================================== */
function makeWorld(def, hooks) {
  const tiles = grid('.');
  for (const [ch, x1, y1, x2, y2] of def.tiles)
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) tiles[y][x] = ch;
  const special = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if ('LST'.includes(tiles[y][x])) special.push({ x, y, ch: tiles[y][x] });

  const W = {
    def, tiles, special,
    glow: grid(0), sdark: grid(0), lit: grid(false),
    lamps: (def.lamps || []).map(l => ({ ...l, on: l.group ? true : !!l.on })),
    switches: (def.switches || []).map(s => ({ ...s })),
    doors: (def.doors || []).map(d => ({ ...d, open: 0, goal: 0, latched: false })),
    levers: (def.levers || []).map(l => ({ ...l, on: false })),
    plates: (def.plates || []).map(p => ({ ...p, pressed: false })),
    boxes: (def.boxes || []).map(b => ({ ...b })),
    power: { P: true },
    t: 0, once: {}, timeline: [], lineEnd: 0, falls: 0, cleared: false,
    hooks: hooks || {},
    train: def.train ? { dx: 0, v: 0, leaving: false, gone: false } : null,
  };
  W.heroes = {
    luma: makeHero('luma', def.spawn.luma),
    nox: makeHero('nox', def.spawn.nox),
  };
  W.heroes.luma.partner = W.heroes.nox;
  W.heroes.nox.partner = W.heroes.luma;
  computeLight(W, 0, true);
  let at = 0.6;
  for (const [who, text] of def.intro || []) { W.timeline.push({ at, who, text }); at += lineDur(text) + 0.15; }
  W.lineEnd = at;
  return W;
}

function makeHero(id, sp) {
  const d = HERO[id];
  const h = { id, def: d, w: d.w, h: d.h, x: 0, y: 0, vx: 0, vy: 0, face: 1,
    onGround: false, standOn: null, coyote: 0, jumpBuf: 0, lastDx: 0,
    shadow: 0, shadowCd: 0, dead: 0, walkT: 0, say: null, spawn: sp, blink: 0 };
  placeHero(h);
  return h;
}
function placeHero(h) {
  h.x = (h.spawn[0] + 0.5) * T - h.w / 2;
  h.y = h.spawn[1] * T - h.h;
  h.vx = h.vy = 0; h.shadow = 0; h.shadowCd = 0; h.standOn = null; h.onGround = false;
}

const lampOn = (W, l) => l.group ? (W.power[l.group] && l.on) : l.on;
function litAt(W, x, y) {
  for (const l of W.lamps) {
    if (!lampOn(W, l)) continue;
    const dx = x - l.x * T, dy = y - l.y * T;
    if (dx * dx + dy * dy < l.r * l.r) return true;
  }
  return false;
}
function inLamp(l, x, y) {
  const dx = x - l.x * T, dy = y - l.y * T;
  return dx * dx + dy * dy < l.r * l.r;
}
const centerOf = c => [c.x + c.w / 2, c.y + c.h / 2];

function computeLight(W, dt, init) {
  let lSolid = 0, sSolid = 0;
  for (const s of W.special) {
    const lit = litAt(W, (s.x + 0.5) * T, (s.y + 0.5) * T);
    W.lit[s.y][s.x] = lit;
    if (s.ch === 'L') {
      W.glow[s.y][s.x] = lit ? AFTER : Math.max(0, W.glow[s.y][s.x] - dt);
      if (W.glow[s.y][s.x] > 0) lSolid++;
    } else if (s.ch === 'S') {
      W.sdark[s.y][s.x] = lit ? (init ? 0 : Math.max(0, W.sdark[s.y][s.x] - dt)) : SGRACE;
      if (W.sdark[s.y][s.x] > 0) sSolid++;
    }
  }
  if (!init) {
    if (lSolid && !W.lSolid) event(W, 'bridge');
    if (sSolid && !W.sSolid && W.sAll) event(W, 'sbridge');
    if (lSolid && W.special.some(s => s.ch === 'L' && !W.lit[s.y][s.x] && W.glow[s.y][s.x] > 0)) event(W, 'afterglow');
  }
  W.lSolid = lSolid; W.sSolid = sSolid;
  W.sAll = W.special.filter(s => s.ch === 'S').length;
}

function tileSolid(W, c, tx, ty) {
  if (tx < 0 || tx >= COLS) return true;
  if (ty < 0 || ty >= ROWS) return false;
  switch (W.tiles[ty][tx]) {
    case '#': case '=': return true;
    case 'L': return W.glow[ty][tx] > 0;
    case 'S': return W.sdark[ty][tx] > 0;
    case 'G': return !(c.id === 'nox' && c.shadow > 0);
    case 'T': return (c.id === 'nox' && c.shadow > 0) ? false : !W.power.P;
    default: return false;
  }
}

function solids(W, c, r) {
  const out = [];
  const x0 = Math.floor(r.x / T) - 1, x1 = Math.floor((r.x + r.w) / T) + 1;
  const y0 = Math.floor(r.y / T) - 1, y1 = Math.floor((r.y + r.h) / T) + 1;
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++)
    if (tileSolid(W, c, tx, ty))
      out.push({ x: tx * T, y: ty * T, w: T, h: T, k: tx + ty * 64 + 64,
        ch: (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS) ? W.tiles[ty][tx] : '#' });
  W.doors.forEach((d, i) => {
    const h = d.h * T * (1 - d.open);
    if (h > 1) out.push({ x: d.x * T + 4, y: d.y * T, w: T - 8, h, k: 100000 + i, ch: 'D' });
  });
  return out;
}

/* Сдвиг по одной оси. Клетки, в которых герой уже застрял (дверь закрылась
   на нём, мост появился под ним), не мешают — из них можно выйти.
   Для Нокса свет — стена: из темноты в свет шагнуть нельзя. */
function moveAxis(W, c, dx, dy) {
  if (!dx && !dy) return 0;
  const b = { x: c.x, y: c.y, w: c.w, h: c.h };
  const emb = new Set();
  for (const s of solids(W, c, b)) if (ov(s, b)) emb.add(s.k);
  c.x += dx; c.y += dy;
  let res = 0;
  if (dy < 0) cornerNudge(W, c, emb);
  for (const s of solids(W, c, c)) {
    if (emb.has(s.k) || !ov(s, c)) continue;
    if (dx > 0) c.x = s.x - c.w;
    else if (dx < 0) c.x = s.x + s.w;
    else if (dy > 0) { c.y = s.y - c.h; res = 1; }
    else { c.y = s.y + s.h; res = 2; }
    if (dx) { res = 3; if (s.ch === 'G' && c.id === 'luma') event(W, 'lumaGrate'); }
  }
  if (c.id === 'nox') {
    const [bx, by] = centerOf(b), [nx, ny] = centerOf(c);
    if (!litAt(W, bx, by) && litAt(W, nx, ny)) {
      c.x = b.x; c.y = b.y;
      res = dy > 0 ? 1 : dy < 0 ? 2 : 3;
      c.blocked = 0.25;
      event(W, W.once.noxBlocked ? 'noxBlocked2' : 'noxBlocked');
    }
  }
  return res;
}

/* Коррекция угла: если в прыжке герой задевает кромку потолка краем головы,
   его сдвигает вбок на несколько пикселей вместо удара. */
function cornerNudge(W, c, emb) {
  const hits = solids(W, c, c).filter(s => !emb.has(s.k) && ov(s, c));
  if (!hits.length) return;
  const left = Math.min(...hits.map(s => s.x)), right = Math.max(...hits.map(s => s.x + s.w));
  for (const shift of [left - (c.x + c.w), right - c.x]) {
    if (Math.abs(shift) > 9) continue;
    const r = { x: c.x + shift, y: c.y, w: c.w, h: c.h };
    if (!solids(W, c, r).some(s => !emb.has(s.k) && ov(s, r))) { c.x = r.x; return; }
  }
}

function updateHero(W, c, dt, inp) {
  if (c.dead > 0) {
    c.dead -= dt;
    if (c.dead <= 0) { c.dead = 0; placeHero(c); }
    return;
  }
  const d = c.def;
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir) c.face = dir;
  if (c.shadow > 0) { c.shadow -= dt; if (c.shadow <= 0) { c.shadow = 0; c.shadowCd = SHADOW_CD; } }
  else if (c.shadowCd > 0) c.shadowCd -= dt;
  if (c.blocked > 0) c.blocked -= dt;

  const sp = d.speed * (c.shadow > 0 ? 1.15 : 1);
  c.vx += (dir * sp - c.vx) * Math.min(1, dt * (c.onGround ? 22 : 11));
  c.jumpBuf = inp.jumpHit ? 0.12 : Math.max(0, c.jumpBuf - dt);
  c.coyote = c.onGround ? 0.09 : Math.max(0, c.coyote - dt);
  if (c.jumpBuf > 0 && c.coyote > 0) {
    c.vy = -d.jump; c.jumpBuf = 0; c.coyote = 0; c.onGround = false; c.standOn = null;
    fire(W, 'sfx', 'jump');
  }
  if (!inp.jump && c.vy < 0) c.vy += GRAV * dt * 1.3;
  c.vy = Math.min(c.vy + GRAV * dt, 900);

  const carry = c.standOn && !c.standOn.dead ? c.standOn.lastDx : 0;
  const x0 = c.x;
  if (moveAxis(W, c, c.vx * dt + carry, 0) === 3) c.vx = 0;
  const prevBottom = c.y + c.h;
  const ry = moveAxis(W, c, 0, c.vy * dt);
  const wasStanding = c.standOn;
  c.onGround = false; c.standOn = null;
  if (ry === 1) { c.vy = 0; c.onGround = true; }
  else if (ry === 2) c.vy = 0;

  const o = c.partner;
  if (!c.onGround && c.vy >= 0 && !o.dead &&
      c.x < o.x + o.w - 3 && c.x + c.w > o.x + 3 && prevBottom <= o.y + 1 && c.y + c.h >= o.y) {
    c.y = o.y - c.h; c.vy = 0; c.onGround = true; c.standOn = o;
    if (!wasStanding) event(W, c.id === 'luma' ? 'onNox' : 'onLuma');
  }
  c.lastDx = c.x - x0;
  c.walkT += dt * (c.onGround ? Math.abs(c.vx) / 100 : 0);

  if (c.y > VH + 40) {
    c.dead = 0.9; W.falls++;
    fire(W, 'splash', c.x + c.w / 2);
    event(W, c.id === 'luma' ? 'fallLuma' : 'fallNox', true);
  }
}

/* ---------- взаимодействие ---------- */
function nearest(W, c) {
  const cx = c.x + c.w / 2, by = c.y + c.h;
  let best = null, bd = 1e9;
  const test = (o, kind) => {
    const px = (o.x + 0.5) * T, py = (o.y + 1) * T, dx = Math.abs(cx - px);
    if (dx < 24 && Math.abs(by - py) < 22 && dx < bd) { bd = dx; best = { o, kind }; }
  };
  W.switches.forEach(s => test(s, 'switch'));
  W.levers.forEach(l => test(l, 'lever'));
  W.boxes.forEach(b => test(b, 'box'));
  return best;
}

function act(W, c) {
  if (c.dead) return;
  const n = nearest(W, c);
  if (!n) { if (c.id === 'nox') tryShadow(W, c); return; }
  if (n.kind === 'switch') actSwitch(W, c, n.o);
  else if (n.kind === 'lever') actLever(W, c, n.o);
  else actBox(W, c, n.o);
}

function tryShadow(W, c) {
  if (c.id !== 'nox' || c.dead || c.shadow > 0 || c.shadowCd > 0) return;
  c.shadow = SHADOW_T;
  fire(W, 'sfx', 'shadow');
  event(W, 'shadow');
}

function actSwitch(W, c, s) {
  const lamps = s.lamps.map(id => W.lamps.find(l => l.id === id));
  const anyOn = lamps.some(l => l.on);
  if (anyOn) {
    lamps.forEach(l => { l.on = false; });
    fire(W, 'sfx', 'off');
    return;
  }
  if (c.id === 'nox') { event(W, 'noxLight', true); fire(W, 'sfx', 'deny'); return; }
  const nox = W.heroes.nox, [nx, ny] = centerOf(nox);
  if (!nox.dead && lamps.some(l => inLamp(l, nx, ny))) {
    event(W, 'refuse', true); fire(W, 'sfx', 'deny'); return;
  }
  lamps.forEach(l => { l.on = true; });
  fire(W, 'sfx', 'on');
}

function actLever(W, c, l) {
  if (l.on) return;
  l.on = true;
  const d = W.doors.find(d => d.id === l.door);
  if (d) d.latched = true;
  fire(W, 'sfx', 'lever');
  if (c.id === 'luma') { event(W, 'lever'); event(W, 'leverOk'); }
}

function actBox(W, c, b) {
  if (c.id !== 'nox') { event(W, 'lumaBox', true); fire(W, 'sfx', 'deny'); return; }
  W.power[b.group] = !W.power[b.group];
  fire(W, 'sfx', W.power[b.group] ? 'powerOn' : 'powerOff');
  event(W, W.power[b.group] ? 'powerOn' : 'powerOff', true);
}

/* ---------- реплики ---------- */
function lineDur(text) { return 1.5 + text.length * 0.045; }
function sayLine(W, who, text, force) {
  const start = Math.max(W.t + 0.05, W.lineEnd);
  if (!force && start - W.t > 2.5) return;
  const at = force ? W.t + 0.05 : start;
  W.timeline.push({ at, who, text });
  W.lineEnd = at + lineDur(text) + 0.1;
}
function event(W, key, repeatable) {
  const now = W.t;
  if (W.once[key] && (!repeatable || now - W.once[key] < 4)) return;
  W.once[key] = now || 0.001;
  const line = LINES[key];
  if (line) sayLine(W, line[0], line[1], repeatable);
  if (key === 'onLuma') sayLine(W, LINES.onLuma2[0], LINES.onLuma2[1]);
}
function fire(W, kind, arg) { if (W.hooks[kind]) W.hooks[kind](arg); }

/* ---------- шаг мира ---------- */
function step(W, dt, inputs) {
  W.t += dt;
  computeLight(W, dt);

  const hs = [W.heroes.luma, W.heroes.nox].sort((a, b) => b.y - a.y);
  for (const h of hs) updateHero(W, h, dt, inputs[h.id]);
  for (const h of hs) {
    const i = inputs[h.id];
    if (i.actHit) act(W, h);
    if (i.shadowHit) tryShadow(W, h);
  }

  for (const p of W.plates) {
    const px = p.x * T, py = (p.y + 1) * T;
    p.pressed = [W.heroes.luma, W.heroes.nox].some(h => !h.dead && h.onGround &&
      Math.abs(h.y + h.h - py) < 2 && h.x + h.w > px + 3 && h.x < px + T - 3);
  }
  for (const d of W.doors) {
    const goal = d.latched || W.plates.some(p => p.door === d.id && p.pressed) ? 1 : 0;
    if (goal !== d.goal) { d.goal = goal; fire(W, 'sfx', 'door'); }
    d.open = clamp(d.open + clamp(goal - d.open, -dt * 2.5, dt * 2.5), 0, 1);
  }

  for (const h of hs) {
    if (h.say) { h.say.t -= dt; if (h.say.t <= 0) h.say = null; }
  }
  W.timeline = W.timeline.filter(e => {
    if (W.t < e.at) return true;
    W.heroes[e.who].say = { text: e.text, t: lineDur(e.text), max: lineDur(e.text) };
    return false;
  });

  for (const tk of W.def.talk || []) {
    if (tk.done) continue;
    const [x1, y1, x2, y2] = tk.rect;
    const inside = h => {
      const [cx, cy] = centerOf(h);
      return !h.dead && cx >= x1 * T && cx < (x2 + 1) * T && cy >= y1 * T && cy < (y2 + 1) * T;
    };
    const ok = tk.who === 'both' ? inside(W.heroes.luma) && inside(W.heroes.nox) : inside(W.heroes[tk.who]);
    if (ok) {
      tk.done = true;
      for (const [who, text] of tk.lines) sayLine(W, who, text, false);
    }
  }

  if (W.train && W.train.leaving) {
    W.train.lt = (W.train.lt || 0) + dt;
    if (W.train.lt > 0.55) W.train.v = Math.min(W.train.v + dt * 140, 900);
    W.train.dx += W.train.v * dt;
    if (W.train.dx > VW) W.train.gone = true;
  }

  if (!W.cleared) {
    const [x, y, w, h] = W.def.exit;
    const r = { x: x * T, y: y * T, w: w * T, h: h * T };
    const inside = c => { const [cx, cy] = centerOf(c); return !c.dead && cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h; };
    if (inside(W.heroes.luma) && inside(W.heroes.nox)) { W.cleared = true; fire(W, 'clear'); }
  }
}

const Sim = { T, COLS, ROWS, VW, VH, HERO, AFTER, makeWorld, step, litAt, tileSolid, nearest, act, tryShadow, lampOn };
if (typeof module !== 'undefined') { module.exports = Sim; return; }
if (typeof window === 'undefined') return;
window.SvetSim = Sim;

/* =====================================================================
   Звук: ночной бит и фортепиано — всё синтезируется на месте
   ===================================================================== */
const Sound = (() => {
  let ac = null, master, musicG, sfxG, next = 0, bar = 0, timer = null, muted = false;
  const BPM = 72, BEAT = 60 / BPM;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [
    { b: 45, n: [60, 64, 67, 71] },
    { b: 41, n: [57, 60, 64, 67] },
    { b: 48, n: [64, 67, 71, 74] },
    { b: 43, n: [59, 62, 66, 69] },
  ];
  const PENTA = [69, 72, 74, 76, 79, 81, 84];
  let noiseBuf = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(ac.destination);
    musicG = ac.createGain(); musicG.gain.value = 0.55; musicG.connect(master);
    sfxG = ac.createGain(); sfxG.gain.value = 0.7; sfxG.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    next = ac.currentTime + 0.1;
    timer = setInterval(schedule, 90);
  }

  function keys(t, note, vel, len) {
    const f = midi(note);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    [[1, 1], [2, 0.18], [3.01, 0.05]].forEach(([m, a]) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
      o.detune.value = (Math.random() - 0.5) * 6;
      const og = ac.createGain(); og.gain.value = a;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + len + 0.05);
    });
    g.connect(lp); lp.connect(musicG);
  }
  function bass(t, note, len) {
    const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = midi(note);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
    o.connect(g); g.connect(lp); lp.connect(musicG); o.start(t); o.stop(t + len + 0.05);
  }
  function kick(t) {
    const o = ac.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = ac.createGain(); g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(musicG); o.start(t); o.stop(t + 0.32);
  }
  function noiseHit(t, freq, q, vol, len, dest) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    s.connect(f); f.connect(g); g.connect(dest || musicG);
    s.start(t, Math.random() * 1.5); s.stop(t + len + 0.02);
  }

  function schedule() {
    if (!ac) return;
    while (next < ac.currentTime + 0.35) {
      const c = CHORDS[bar % 4], t = next;
      bass(t, c.b, BEAT * 3.6);
      c.n.forEach((n, i) => keys(t + i * 0.018, n, 0.05, BEAT * 3.2));
      c.n.slice(1).forEach((n, i) => keys(t + BEAT * 1.5 + i * 0.02, n, 0.03, BEAT * 2));
      kick(t); kick(t + BEAT * 2.5);
      noiseHit(t + BEAT, 1900, 0.8, 0.05, 0.18); noiseHit(t + BEAT * 3, 1900, 0.8, 0.05, 0.18);
      for (let i = 0; i < 8; i++) noiseHit(t + i * BEAT / 2 + (i % 2 ? 0.06 : 0), 8000, 1.2, i % 2 ? 0.018 : 0.01, 0.05);
      const r = rng(bar * 7 + 3);
      for (let i = 0; i < 4; i++) if (r() < 0.38) keys(t + BEAT * i + (r() < 0.5 ? BEAT / 2 : 0), PENTA[Math.floor(r() * PENTA.length)], 0.045, 1.6);
      next += BEAT * 4; bar++;
    }
  }

  function tone(type, f1, f2, len, vol, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + len);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g); g.connect(sfxG); o.start(t); o.stop(t + len + 0.02);
  }
  const SFX = {
    jump: () => tone('sine', 300, 520, 0.12, 0.05),
    on: () => { tone('sine', 880, 880, 0.5, 0.08); tone('sine', 1320, 1320, 0.7, 0.05, 0.06); tone('square', 1800, 900, 0.03, 0.03); },
    off: () => { tone('sine', 700, 300, 0.25, 0.07); tone('square', 1500, 700, 0.03, 0.03); },
    deny: () => { tone('triangle', 220, 200, 0.12, 0.08); tone('triangle', 180, 170, 0.16, 0.08, 0.12); },
    lever: () => { noiseHit(ac.currentTime, 700, 2, 0.25, 0.08, sfxG); tone('square', 160, 90, 0.08, 0.05); },
    door: () => { noiseHit(ac.currentTime, 300, 0.7, 0.18, 0.6, sfxG); tone('sawtooth', 70, 55, 0.5, 0.03); },
    shadow: () => { if (!ac) return; const t = ac.currentTime; const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.5);
      const g = ac.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + 0.6);
      tone('sine', 220, 110, 0.5, 0.05); },
    splash: () => { noiseHit(ac.currentTime, 900, 0.6, 0.3, 0.5, sfxG); noiseHit(ac.currentTime + 0.05, 2500, 1, 0.12, 0.3, sfxG); },
    powerOff: () => tone('sawtooth', 140, 30, 0.9, 0.06),
    powerOn: () => tone('sawtooth', 40, 150, 0.7, 0.05),
    clear: () => [69, 72, 76, 81].forEach((n, i) => tone('sine', midi(n), midi(n), 0.6, 0.07, i * 0.09)),
  };
  return {
    init,
    sfx(name) { if (ac && SFX[name]) SFX[name](); },
    toggle() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.85; return muted; },
    music(on) {
      if (!ac) return;
      musicG.gain.cancelScheduledValues(ac.currentTime);
      musicG.gain.setTargetAtTime(on ? 0.55 : 0, ac.currentTime, 0.4);
    },
    get muted() { return muted; },
  };
})();

/* =====================================================================
   Отрисовка
   ===================================================================== */
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
let K = 1;
const dark = document.createElement('canvas'); dark.width = VW / 2; dark.height = VH / 2;
const dctx = dark.getContext('2d');
let BG = null, EM = null;
let rain = [], ripples = [], parts = [];

function resize() {
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  K = cv.width / VW;
}

const COL = {
  ink: '#0b0e22', stone: '#171b36', stoneTop: '#8795d6', metal: '#272c4b',
  amber: '#ffc46b', warm: '#ffd998', luma: '#f2c230', plum: '#8a6fd1',
};

function surfaceTops(def, tiles) {
  const out = [];
  for (let y = 1; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if ('#='.includes(tiles[y][x]) && !'#='.includes(tiles[y - 1][x])) {
      if (def.under) { const [ux1, uy1, ux2, uy2] = def.under; if (x >= ux1 && x <= ux2 && y >= uy1 && y <= uy2 + 1) continue; }
      out.push([x, y]);
    }
  return out;
}

function inUnder(def, x, y) {
  if (!def.under) return false;
  const [x1, y1, x2, y2] = def.under;
  return x >= x1 * T && x < (x2 + 1) * T && y >= y1 * T && y < (y2 + 1) * T;
}

/* Фон уровня рисуется один раз: небо, старый город, фасады, деревья, провода,
   брусчатка и стены. Живое поверх него — вывески, лужи, вода, туман, листья,
   искры на проводах — рисует drawWorldFX каждый кадр. */
function renderBG(W) {
  const def = W.def, R = rng(def.seed);
  const mk = () => { const c = document.createElement('canvas'); c.width = VW * 2; c.height = VH * 2; const g = c.getContext('2d'); g.scale(2, 2); return [c, g]; };
  const [bg, g] = mk();
  const [em, e] = mk();
  const base = def.under ? 270 : 450;
  W.base = base; W.signs = []; W.puddles = []; W.wires = [];

  const sky = g.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, '#070a1d'); sky.addColorStop(0.5, '#161842'); sky.addColorStop(1, '#2c2356');
  g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
  const mx = 120 + R() * 700;
  const haze = g.createRadialGradient(mx, 70, 0, mx, 70, 280);
  haze.addColorStop(0, 'rgba(160,165,255,0.18)'); haze.addColorStop(1, 'rgba(150,160,255,0)');
  g.fillStyle = haze; g.fillRect(0, 0, VW, VH);
  for (let i = 0; i < 9; i++) {
    const cx = R() * VW, cy = 20 + R() * 150, rx = 110 + R() * 200, ry = 18 + R() * 30;
    const cg = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
    cg.addColorStop(0, `rgba(${R() < 0.5 ? '70,70,130' : '20,22,50'},0.22)`); cg.addColorStop(1, 'rgba(40,40,90,0)');
    g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy);
    g.fillStyle = cg; g.fillRect(cx - rx, cy - rx, rx * 2, rx * 2); g.restore();
  }

  // дальний старый город: шпили, купола, скаты
  let x = -10;
  while (x < VW + 10) {
    const w = 28 + R() * 60, h = 120 + R() * 150, top = base - 20 - h, type = Math.floor(R() * 5);
    g.fillStyle = '#131736'; g.fillRect(x, top, w, VH - top);
    if (type === 1) { g.beginPath(); g.moveTo(x - 2, top); g.lineTo(x + w / 2, top - 18 - R() * 14); g.lineTo(x + w + 2, top); g.fill(); }
    else if (type === 2) { const sx = x + w * (0.3 + R() * 0.4); g.beginPath(); g.moveTo(sx - 7, top); g.lineTo(sx, top - 50 - R() * 40); g.lineTo(sx + 7, top); g.fill(); g.fillRect(sx - 0.6, top - 95, 1.2, 50); }
    else if (type === 3) { g.beginPath(); g.arc(x + w / 2, top, w * 0.32, Math.PI, 0); g.fill(); g.fillRect(x + w / 2 - 0.8, top - w * 0.32 - 12, 1.6, 12); }
    else if (type === 4) { g.fillRect(x + w * 0.2, top - 14, w * 0.6, 14); g.fillRect(x + w * 0.35, top - 24, w * 0.3, 10); }
    for (let wy = top + 10; wy < base - 30; wy += 11) for (let wx = x + 5; wx < x + w - 5; wx += 8)
      if (R() < 0.035) { e.fillStyle = `rgba(255,${190 + R() * 40 | 0},120,0.55)`; e.fillRect(wx, wy, 2.4, 3.4); }
    x += w + R() * 4;
  }
  const dist = g.createLinearGradient(0, base - 300, 0, base);
  dist.addColorStop(0, 'rgba(45,42,95,0)'); dist.addColorStop(1, 'rgba(45,42,95,0.35)');
  g.fillStyle = dist; g.fillRect(0, base - 300, VW, 300);

  // ближние фасады
  const SIGNS = [['АПТЕКА', '#6fe0a0'], ['КАФЕ', '#ffb65c'], ['24 ЧАСА', '#ff6a6a'], ['ХЛЕБ', '#ffd07a'], ['ЦВЕТЫ', '#ff8fc8'], ['КНИГИ', '#8fb8ff']];
  const lamps = W.lamps.map(l => l.x * T);
  x = -30 - R() * 40;
  while (x < VW + 30) {
    const w = 84 + R() * 70, h = 140 + R() * 120, top = base - h;
    const col = ['#0f1229', '#111431', '#0d1026', '#12132c'][Math.floor(R() * 4)];
    g.fillStyle = col; g.fillRect(x, top, w, h + 200);
    g.fillStyle = 'rgba(120,130,210,0.1)'; g.fillRect(x, top, w, 2); g.fillRect(x - 2, top + 3, w + 4, 2);
    if (R() < 0.6) { g.fillStyle = col; g.fillRect(x + w * (0.15 + R() * 0.6), top - 12, 7, 12); }
    if (R() < 0.4) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); const ax = x + w * R(); g.moveTo(ax, top); g.lineTo(ax, top - 22); g.moveTo(ax - 6, top - 16); g.lineTo(ax + 6, top - 16); g.stroke(); }
    if (R() < 0.3) { g.fillStyle = col; g.fillRect(x + w * 0.6, top - 14, 16, 14); g.fillRect(x + w * 0.6 + 2, top - 4, 2, 4); g.fillRect(x + w * 0.6 + 12, top - 4, 2, 4); }
    const cols = Math.max(2, Math.floor((w - 14) / 22)), gap = (w - cols * 12) / (cols + 1);
    const balcony = R() < 0.35;
    for (let fy = top + 16, floor = 0; fy < base - 62; fy += 28, floor++) {
      for (let i = 0; i < cols; i++) {
        const wx = x + gap + i * (12 + gap);
        g.fillStyle = '#080a1b'; g.fillRect(wx - 1, fy - 1, 14, 18);
        if (R() < 0.13) {
          const warm = R() < 0.82;
          const gl = e.createLinearGradient(0, fy, 0, fy + 16);
          gl.addColorStop(0, warm ? 'rgba(255,205,130,0.85)' : 'rgba(170,190,255,0.7)');
          gl.addColorStop(1, warm ? 'rgba(230,140,70,0.75)' : 'rgba(120,140,220,0.6)');
          e.fillStyle = gl; e.fillRect(wx, fy, 12, 16);
          const v = R();
          e.fillStyle = 'rgba(40,20,25,0.55)';
          if (v < 0.3) e.fillRect(wx, fy, 5, 16);
          else if (v < 0.5) for (let b = 0; b < 16; b += 3) e.fillRect(wx, fy + b, 12, 1);
          else if (v < 0.65) { e.beginPath(); e.arc(wx + 8, fy + 11, 3, 0, 7); e.fill(); e.fillRect(wx + 7, fy + 13, 2, 3); }
          e.fillStyle = 'rgba(30,15,20,0.6)'; e.fillRect(wx + 5.5, fy, 1, 16); e.fillRect(wx, fy + 6, 12, 1);
        } else {
          g.fillStyle = 'rgba(45,60,120,0.3)'; g.fillRect(wx, fy, 12, 16);
          g.fillStyle = 'rgba(160,175,255,0.07)'; g.beginPath(); g.moveTo(wx, fy + 10); g.lineTo(wx + 8, fy); g.lineTo(wx + 12, fy); g.lineTo(wx, fy + 14); g.fill();
          g.fillStyle = 'rgba(10,12,28,0.9)'; g.fillRect(wx + 5.5, fy, 1, 16); g.fillRect(wx, fy + 6, 12, 1);
        }
        g.fillStyle = 'rgba(130,140,210,0.14)'; g.fillRect(wx - 2, fy + 17, 16, 1.5);
        if (R() < 0.05) { g.fillStyle = '#1b1e3a'; g.fillRect(wx + 1, fy + 19, 10, 6); g.fillStyle = 'rgba(0,0,0,0.4)'; for (let k = 0; k < 3; k++) g.fillRect(wx + 2, fy + 20 + k * 2, 8, 0.6); }
      }
      if (balcony && floor % 2 === 1) {
        g.fillStyle = 'rgba(20,23,48,1)'; g.fillRect(x + 6, fy + 18, w - 12, 2);
        g.fillStyle = 'rgba(25,28,58,1)';
        for (let bx = x + 7; bx < x + w - 6; bx += 3) g.fillRect(bx, fy + 11, 0.8, 7);
        g.fillRect(x + 6, fy + 10, w - 12, 1);
      }
    }
    if (R() < 0.35) {
      const px = x + w - 5;
      g.fillStyle = '#0a0c1d'; g.fillRect(px, top + 4, 2.4, h);
      for (let by = top + 20; by < base; by += 34) g.fillRect(px - 1, by, 4.4, 1.6);
    }
    // первый этаж: витрина и вывеска
    g.fillStyle = 'rgba(8,9,22,0.6)'; g.fillRect(x, base - 44, w, 44);
    const shop = R() < 0.55;
    if (shop) {
      const sg2 = e.createLinearGradient(0, base - 34, 0, base - 10);
      sg2.addColorStop(0, 'rgba(255,190,120,0.03)'); sg2.addColorStop(1, 'rgba(255,170,100,0.11)');
      e.fillStyle = sg2; e.fillRect(x + 10, base - 34, w - 34, 24);
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (let k = 0; k < 3; k++) g.fillRect(x + 16 + k * (w - 46) / 3, base - 20, (w - 46) / 4, 10);
      g.fillStyle = 'rgba(0,0,0,0.5)'; for (let sx = x + 10; sx < x + w - 24; sx += 18) g.fillRect(sx, base - 34, 1, 24);
      g.fillStyle = '#080a18'; g.fillRect(x + w - 20, base - 34, 12, 34);
      const nearLamp = lamps.some(lx => Math.abs(lx - (x + w / 2)) < 70);
      if (!nearLamp && W.signs.length < 3 && R() < 0.7) {
        const [text, c] = SIGNS[Math.floor(R() * SIGNS.length)];
        W.signs.push({ x: x + w / 2 - 12, y: base - 40, text, col: c, seed: R() * 100, flick: R() < 0.4 });
      }
    }
    x += w + 2 + R() * 10;
  }

  // деревья
  const tree = (tx, ty, len, ang, wdt, depth) => {
    const ex = tx + Math.sin(ang) * len, ey = ty - Math.cos(ang) * len;
    g.strokeStyle = '#090b1c'; g.lineWidth = wdt; g.lineCap = 'round';
    g.beginPath(); g.moveTo(tx, ty); g.lineTo(ex, ey); g.stroke();
    if (depth <= 0) {
      if (R() < 0.55) { g.fillStyle = ['rgba(190,105,45,0.75)', 'rgba(210,150,60,0.7)', 'rgba(150,70,40,0.7)'][Math.floor(R() * 3)]; g.beginPath(); g.ellipse(ex, ey, 2.6, 1.6, R() * 3, 0, 7); g.fill(); }
      return;
    }
    const n = 2 + (R() < 0.4 ? 1 : 0);
    for (let i = 0; i < n; i++) tree(ex, ey, len * (0.62 + R() * 0.18), ang + (R() - 0.5) * 1.3, wdt * 0.68, depth - 1);
  };
  const nTrees = 2 + Math.floor(R() * 2);
  for (let i = 0; i < nTrees; i++) tree(60 + R() * (VW - 120), base, 34 + R() * 16, (R() - 0.5) * 0.2, 4.5, 5);

  // трамвайные провода и столбы
  const polesX = [];
  for (let px = 40 + R() * 80; px < VW; px += 300 + R() * 80) polesX.push(px);
  for (const px of polesX) {
    g.fillStyle = '#080a18'; g.fillRect(px - 1.8, 52, 3.6, base - 52);
    g.fillRect(px - 16, 58, 32, 2.2);
    g.fillStyle = '#2a2e50'; g.fillRect(px - 14, 60, 2, 3); g.fillRect(px + 12, 60, 2, 3);
  }
  for (let i = 0; i < 2; i++) {
    const y0 = 66 + i * 24 + R() * 8, sag = 20;
    W.wires.push({ y0, sag, span: 240 });
    g.strokeStyle = 'rgba(4,5,14,0.95)'; g.lineWidth = 1.3;
    g.beginPath();
    for (let wx = -40; wx < VW + 40; wx += 240) { g.moveTo(wx, y0); g.quadraticCurveTo(wx + 120, y0 + sag, wx + 240, y0); }
    g.stroke();
  }

  if (def.under) {
    const [x1, y1, x2, y2] = def.under;
    const X = x1 * T, Y = y1 * T, Wd = (x2 - x1 + 1) * T, Hd = (y2 - y1 + 1) * T;
    const wg = g.createLinearGradient(0, Y, 0, Y + Hd);
    wg.addColorStop(0, '#1d2440'); wg.addColorStop(1, '#141a30');
    g.fillStyle = wg; g.fillRect(X, Y, Wd, Hd);
    for (let yy = Y; yy < Y + Hd; yy += 8) for (let xx = X + ((yy / 8) % 2) * 7; xx < X + Wd; xx += 14) {
      g.fillStyle = `rgba(170,190,240,${0.03 + R() * 0.04})`; g.fillRect(xx, yy, 13, 7);
    }
    g.fillStyle = '#8f3a36'; g.fillRect(X, Y + 42, Wd, 6);
    g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(X, Y + 42, Wd, 1);
    g.fillStyle = 'rgba(230,220,200,0.6)'; g.font = '600 10px "Golos Text", sans-serif';
    g.fillText('К ПОЕЗДАМ →', X + 70, Y + 36);
    const posters = [['#3a5a8a', '#e8c35a'], ['#7a3a4a', '#f0e0c0']];
    posters.forEach(([bgc, fg], i) => {
      const px = X + 190 + i * 70, py = Y + 60;
      g.fillStyle = '#0b0e1e'; g.fillRect(px - 2, py - 2, 30, 40);
      g.fillStyle = bgc; g.fillRect(px, py, 26, 36);
      g.fillStyle = fg; g.fillRect(px + 4, py + 5, 18, 3); g.fillRect(px + 4, py + 11, 12, 2);
      g.beginPath(); g.arc(px + 13, py + 24, 6, 0, 7); g.fill();
    });
  }

  const solidAt = (a, b) => a < 0 || a >= COLS || (b >= 0 && b < ROWS && '#='.includes(W.tiles[b][a]));
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const ch = W.tiles[y][x], X = x * T, Y = y * T;
    if (ch === '#') {
      g.fillStyle = '#141830'; g.fillRect(X, Y, T, T);
      for (let r = 0; r < 3; r++) for (let b = -1; b < 3; b++) {
        const bx = X + b * 15 + ((r + y) % 2 ? 7 : 0);
        const v = 22 + Math.floor(R() * 7);
        g.fillStyle = `rgb(${v - 2},${v + 2},${v + 22})`;
        g.fillRect(Math.max(X, bx + 0.6), Y + r * 10 + 0.6, Math.min(bx + 14.4, X + T) - Math.max(X, bx + 0.6), 8.8);
      }
      const shade = g.createLinearGradient(0, Y, 0, Y + T);
      shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,8,0.18)');
      g.fillStyle = shade; g.fillRect(X, Y, T, T);
      if (!solidAt(x, y - 1)) {
        g.fillStyle = '#1b2040'; g.fillRect(X, Y, T, 7);
        for (let sx = 0; sx < T; sx += 7.5) {
          const v = R();
          g.fillStyle = v < 0.5 ? '#2a3058' : '#252a4e';
          roundRectG(g, X + sx + 0.6, Y + 0.8, 6.4, 4.4, 1.6); g.fill();
          g.fillStyle = 'rgba(175,190,255,0.32)'; g.fillRect(X + sx + 1.6, Y + 1, 4.4, 0.8);
        }
        g.fillStyle = '#10132a'; g.fillRect(X, Y + 6, T, 1.4);
        const gr = g.createLinearGradient(0, Y, 0, Y + 12);
        gr.addColorStop(0, 'rgba(120,135,210,0.28)'); gr.addColorStop(1, 'rgba(120,135,210,0)');
        g.fillStyle = gr; g.fillRect(X, Y, T, 12);
        g.fillStyle = 'rgba(190,205,255,0.5)'; g.fillRect(X, Y, T, 0.8);
        const underRow = def.under && x >= def.under[0] && x <= def.under[2] && y >= def.under[1] && y <= def.under[3] + 1;
        if (!underRow && R() < 0.24) W.puddles.push({ x: X + 6 + R() * 14, y: Y + 3.2, w: 7 + R() * 7 });
      }
      if (!solidAt(x - 1, y)) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X, Y, 2, T); g.fillStyle = 'rgba(150,165,230,0.08)'; g.fillRect(X + 2, Y, 1, T); }
      if (!solidAt(x + 1, y)) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + T - 2, Y, 2, T); }
      if (!solidAt(x, y + 1) && y + 1 < ROWS) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X, Y + T - 2, T, 2); }
    } else if (ch === '=') {
      g.fillStyle = '#262b4a'; g.fillRect(X, Y, T, 11);
      g.fillStyle = '#10132a';
      for (let hx = X + 3; hx < X + T - 2; hx += 5) g.fillRect(hx, Y + 3, 3, 5);
      g.fillStyle = 'rgba(160,175,240,0.55)'; g.fillRect(X, Y, T, 1.4);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X, Y + 9.5, T, 1.5);
      g.fillStyle = 'rgba(190,200,245,0.4)'; g.fillRect(X + 1.5, Y + 1.8, 1.6, 1.6); g.fillRect(X + T - 3, Y + 1.8, 1.6, 1.6);
      g.strokeStyle = '#1d2140'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(X + 2, Y + 11); g.lineTo(X + T / 2, Y + 22); g.lineTo(X + T - 2, Y + 11); g.stroke();
    } else if (ch === 'G') {
      g.fillStyle = 'rgba(8,10,24,0.45)'; g.fillRect(X, Y, T, T);
      for (let i = 0; i < 5; i++) {
        const bx = X + 2.5 + i * 6;
        g.fillStyle = '#343a5c'; g.fillRect(bx, Y, 2.4, T);
        g.fillStyle = 'rgba(180,190,245,0.28)'; g.fillRect(bx, Y, 0.8, T);
        g.fillStyle = 'rgba(160,90,50,0.25)'; g.fillRect(bx, Y + 8 + (i * 7) % 14, 2.4, 3);
      }
      g.fillStyle = '#3d4468'; g.fillRect(X, Y + 2, T, 2.6); g.fillRect(X, Y + T - 5, T, 2.6);
      g.fillStyle = 'rgba(190,200,250,0.3)'; g.fillRect(X, Y + 2, T, 0.8); g.fillRect(X, Y + T - 5, T, 0.8);
    }
  }
  for (const p of W.puddles) {
    g.fillStyle = 'rgba(8,11,30,0.92)'; g.beginPath(); g.ellipse(p.x, p.y, p.w, 1.7, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(150,170,240,0.28)'; g.lineWidth = 0.6; g.stroke();
  }

  BG = bg; EM = em;
  W.tops = surfaceTops(def, W.tiles);
  rain = Array.from({ length: 170 }, () => newDrop(true));
  ripples = []; parts = []; leaves = [];
}

function signImage(s) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = '700 18px "Golos Text", sans-serif';
  const tw = g.measureText(s.text).width;
  c.width = Math.ceil(tw + 80); c.height = 80;
  g.scale(2, 2);
  g.font = '700 9px "Golos Text", sans-serif';
  g.fillStyle = 'rgba(8,10,24,0.85)'; g.fillRect(16, 6, tw / 2 + 8, 13);
  g.shadowColor = s.col; g.shadowBlur = 10;
  g.fillStyle = s.col; g.fillText(s.text, 20, 16);
  g.shadowBlur = 0;
  g.fillStyle = hexA(s.col, 0.12); g.fillRect(10, 19, tw / 2 + 20, 8);
  return c;
}

function roundRectG(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

let leaves = [], FOG = null, spark = null;
function fogCanvas() {
  if (FOG) return FOG;
  const c = document.createElement('canvas'); c.width = VW; c.height = 110;
  const g = c.getContext('2d'), R = rng(7);
  for (let i = 0; i < 70; i++) {
    const x = R() * VW, y = 30 + R() * 50, r = 30 + R() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(150,160,220,0.07)'); gr.addColorStop(1, 'rgba(150,160,220,0)');
    for (const dx of [0, -VW, VW]) { g.fillStyle = gr; g.fillRect(x - r + dx, y - r, r * 2, r * 2); }
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createLinearGradient(0, 0, 0, 110);
  m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.4, 'rgba(0,0,0,1)'); m.addColorStop(0.75, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(0, 0, VW, 110);
  return (FOG = c);
}

/* Живые детали мира. back — до героев (туман, листья на земле), front — после. */
function drawWorldFX(W, t, dt, layer) {
  const def = W.def;
  if (layer === 'glow') {
    // отражения фонарей в лужах
    for (const p of W.puddles || []) {
      let a = 0.05 + 0.03 * Math.sin(t * 1.3 + p.x);
      for (const l of W.lamps) {
        if (!lampOn(W, l)) continue;
        const d = Math.hypot(p.x - l.x * T, (p.y - l.y * T) * 0.6);
        if (d < l.r * 1.1) a += (1 - d / (l.r * 1.1)) * 0.5;
      }
      ctx.fillStyle = `rgba(255,200,130,${Math.min(0.55, a)})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.w * 0.8, 1.1, 0, 0, 7); ctx.fill();
    }
    // вывески
    for (const s of W.signs || []) {
      let on = 1;
      if (s.flick) { const n = Math.sin(t * 7.3 + s.seed) + Math.sin(t * 13.1 + s.seed * 2); on = n > 1.55 ? 0.15 : 1; }
      if (!s.img) s.img = signImage(s);
      ctx.globalAlpha = on;
      ctx.drawImage(s.img, s.x - 20, s.y - 26, s.img.width / 2, s.img.height / 2);
      ctx.globalAlpha = 1;
    }
    // искра на проводах
    if (!def.under || true) {
      if (!spark && Math.random() < dt / 7 && W.wires && W.wires.length) {
        const w = W.wires[Math.floor(Math.random() * W.wires.length)], x = Math.random() * VW, u = ((x + 40) % w.span) / w.span;
        spark = { x, y: w.y0 + w.sag * 4 * u * (1 - u) * 0.5, t: 0 };
        for (let i = 0; i < 8; i++) parts.push({ x: spark.x, y: spark.y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 40, life: 0.5, max: 0.5, kind: 'spark' });
      }
      if (spark) {
        spark.t += dt;
        const a = Math.max(0, 1 - spark.t / 0.25);
        const gr = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, 26);
        gr.addColorStop(0, `rgba(200,220,255,${0.8 * a})`); gr.addColorStop(1, 'rgba(160,190,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(spark.x - 26, spark.y - 26, 52, 52);
        if (spark.t > 0.3) spark = null;
      }
    }
    return;
  }
  if (layer === 'back') {
    const f = fogCanvas(), y = (W.base || 450) - 95;
    ctx.globalAlpha = 0.8;
    const o1 = (t * 9) % VW, o2 = (t * -5 % VW + VW) % VW;
    ctx.drawImage(f, o1 - VW, y); ctx.drawImage(f, o1, y);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(f, o2 - VW, y + 40); ctx.drawImage(f, o2, y + 40);
    ctx.globalAlpha = 1;
    return;
  }
  // front: листья
  if (!def.under || true) {
    if (leaves.length < 14 && Math.random() < dt * 0.8)
      leaves.push({ x: Math.random() * VW, y: -10, vx: 10 + Math.random() * 18, vy: 22 + Math.random() * 20, r: Math.random() * 6, vr: (Math.random() - 0.5) * 5, ph: Math.random() * 6,
        col: ['#c8702c', '#d99a3a', '#a4502a', '#e0b050'][Math.floor(Math.random() * 4)], rest: 0 });
    for (let i = leaves.length - 1; i >= 0; i--) {
      const L = leaves[i];
      if (L.rest > 0) { L.rest -= dt; if (L.rest <= 0) { leaves.splice(i, 1); continue; } }
      else {
        L.x += (L.vx + Math.sin(t * 2 + L.ph) * 22) * dt; L.y += L.vy * dt; L.r += L.vr * dt;
        if (inUnder(def, L.x, L.y)) { leaves.splice(i, 1); continue; }
        const gy = groundBelow(W, L.x, L.y - 4);
        if (L.y >= gy - 1 && gy < VH) { L.y = gy - 1; L.rest = 3; }
        else if (L.y > VH || L.x > VW + 20) { leaves.splice(i, 1); continue; }
      }
      ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.rest > 0 ? 0 : L.r);
      ctx.globalAlpha = L.rest > 0 ? Math.min(1, L.rest) : 1;
      ctx.fillStyle = L.col; ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5 * (L.rest > 0 ? 0.7 : Math.abs(Math.cos(t * 3 + L.ph)) + 0.3), 0, 0, 7); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
  }
}

function newDrop(any) {
  return { x: Math.random() * (VW + 120), y: any ? Math.random() * VH : -20 - Math.random() * 60,
    v: 520 + Math.random() * 260, l: 8 + Math.random() * 10, a: 0.12 + Math.random() * 0.2 };
}

function groundBelow(W, x, y) {
  const tx = Math.floor(x / T);
  for (let ty = Math.max(0, Math.floor(y / T)); ty < ROWS; ty++)
    if (tx >= 0 && tx < COLS && '#='.includes(W.tiles[ty][tx])) return ty * T;
  return VH;
}

function drawLamp(W, l, t) {
  const on = lampOn(W, l), x = l.x * T, y = l.y * T;
  const c = ctx;
  if (l.kind === 'hang') {
    c.strokeStyle = '#05060f'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x - 150, 58); c.quadraticCurveTo(x - 60, y - 40, x, y - 13);
    c.quadraticCurveTo(x + 60, y - 40, x + 150, 58); c.stroke();
    c.fillStyle = '#1c1f36';
    c.beginPath(); c.moveTo(x - 8, y - 7); c.lineTo(x + 8, y - 7); c.lineTo(x + 3, y - 13); c.lineTo(x - 3, y - 13); c.closePath(); c.fill();
    c.fillRect(x - 1, y - 15, 2, 3);
    c.fillStyle = on ? '#ffe6a8' : '#262a44';
    c.beginPath(); c.moveTo(x - 6, y - 7); c.lineTo(x + 6, y - 7); c.lineTo(x + 4.5, y + 4); c.lineTo(x - 4.5, y + 4); c.closePath(); c.fill();
    if (on) { c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(x, y - 1, 2.4, 0, 7); c.fill(); }
    c.strokeStyle = '#1c1f36'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x, y + 4); c.moveTo(x - 5.4, y - 1.5); c.lineTo(x + 5.4, y - 1.5); c.stroke();
    c.fillStyle = '#1c1f36'; c.fillRect(x - 5.5, y + 4, 11, 2); c.fillRect(x - 1, y + 6, 2, 2.5);
  } else if (l.kind === 'neon') {
    c.fillStyle = '#10132a'; c.fillRect(x - 3, y + 20, 6, groundBelow(W, x, y + 20) - y - 20);
    c.fillStyle = '#1b1f3a'; c.fillRect(x - 24, y - 20, 48, 40);
    c.strokeStyle = on ? '#ff5a4f' : '#4a2530'; c.lineWidth = 3.2; c.lineJoin = 'round';
    if (on) { c.shadowColor = '#ff4d45'; c.shadowBlur = 16; }
    c.beginPath(); c.moveTo(x - 13, y + 11); c.lineTo(x - 13, y - 11); c.lineTo(x, y + 4); c.lineTo(x + 13, y - 11); c.lineTo(x + 13, y + 11); c.stroke();
    c.shadowBlur = 0;
  } else if (l.kind === 'ceil') {
    c.fillStyle = '#2a2e48'; c.fillRect(x - 16, y - 7, 32, 5);
    c.fillStyle = on ? '#fff2cc' : '#3a3c52'; c.fillRect(x - 13, y - 2, 26, 3);
  } else if (l.kind === 'emergency') {
    const cy = (Math.floor(l.y) - 1) * T;
    c.fillStyle = '#2a2e48'; c.fillRect(x - 10, cy, 20, 5);
    c.fillStyle = '#b8453b'; c.fillRect(x - 10, cy + 1, 3, 3);
    c.fillStyle = on ? '#ffe0a0' : '#43364a'; c.fillRect(x - 6, cy + 5, 14, 2.4);
  }
}

function drawSwitch(W, s) {
  const x = (s.x + 0.5) * T, y = (s.y + 1) * T;
  const on = s.lamps.some(id => W.lamps.find(l => l.id === id).on);
  ctx.fillStyle = '#23263f'; ctx.fillRect(x - 1.5, y - 20, 3, 20);
  ctx.fillStyle = '#343a5e'; ctx.fillRect(x - 6, y - 27, 12, 13);
  ctx.fillStyle = on ? COL.amber : '#5a4a3a'; ctx.fillRect(x - 2, y - 23, 4, 4);
}
function drawLever(l) {
  const x = (l.x + 0.5) * T, y = (l.y + 1) * T;
  ctx.fillStyle = '#343a5e'; ctx.fillRect(x - 8, y - 5, 16, 5);
  ctx.save(); ctx.translate(x, y - 4); ctx.rotate(l.on ? 0.7 : -0.7);
  ctx.fillStyle = '#6b7090'; ctx.fillRect(-1.5, -17, 3, 17);
  ctx.fillStyle = l.on ? '#7fd08a' : '#d06a5a'; ctx.beginPath(); ctx.arc(0, -18, 3.5, 0, 7); ctx.fill();
  ctx.restore();
}
function drawBox(W, b) {
  const x = (b.x + 0.5) * T, y = (b.y + 1) * T, on = W.power[b.group];
  ctx.fillStyle = '#3c4260'; ctx.fillRect(x - 10, y - 28, 20, 26);
  ctx.fillStyle = '#262a42'; ctx.fillRect(x - 8, y - 26, 16, 22);
  ctx.fillStyle = '#e8c34a';
  ctx.beginPath(); ctx.moveTo(x + 1, y - 23); ctx.lineTo(x - 4, y - 14); ctx.lineTo(x, y - 14); ctx.lineTo(x - 2, y - 7); ctx.lineTo(x + 4, y - 17); ctx.lineTo(x, y - 17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = on ? '#6fe08a' : '#e0584f'; ctx.fillRect(x + 5, y - 25, 3, 3);
}
function drawPlate(p) {
  const x = p.x * T, y = (p.y + 1) * T;
  ctx.fillStyle = '#343a5e'; ctx.fillRect(x + 3, y - (p.pressed ? 2 : 4), T - 6, p.pressed ? 2 : 4);
  ctx.fillStyle = p.pressed ? COL.amber : 'rgba(255,196,107,0.35)'; ctx.fillRect(x + 7, y - (p.pressed ? 2 : 4), T - 14, 1);
}
function drawDoor(d) {
  const x = d.x * T, y = d.y * T, h = d.h * T * (1 - d.open);
  ctx.fillStyle = '#10132a'; ctx.fillRect(x + 2, y - 3, T - 4, 3);
  if (h < 1) return;
  ctx.fillStyle = '#3a4064'; ctx.fillRect(x + 4, y, T - 8, h);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  for (let yy = y + h - 6; yy > y; yy -= 6) ctx.fillRect(x + 4, yy, T - 8, 1);
  ctx.fillStyle = '#5a6190'; ctx.fillRect(x + 4, y + h - 4, T - 8, 4);
}
function drawTurnstile(W, x, y) {
  const X = x * T, Y = y * T, on = W.power.P;
  ctx.fillStyle = '#4a5070'; ctx.fillRect(X + 9, Y + 4, 12, T - 4);
  ctx.fillStyle = on ? '#6fe08a' : '#e0584f'; ctx.fillRect(X + 12, Y + 7, 6, 3);
  ctx.strokeStyle = '#9aa0c0'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (on) { ctx.moveTo(X + 15, Y + 16); ctx.lineTo(X + 15, Y + 28); }
  else { ctx.moveTo(X + 1, Y + 16); ctx.lineTo(X + 29, Y + 16); }
  ctx.stroke();
}

function drawExit(W, t) {
  const [x, y, w, h] = W.def.exit;
  if (W.train) return;
  const cx = (x + w / 2) * T, gy = (y + h) * T;
  ctx.fillStyle = '#1a1d36'; ctx.fillRect(cx - 2, gy - 70, 4, 70);
  ctx.fillStyle = '#20243f'; ctx.beginPath(); ctx.arc(cx, gy - 78, 13, 0, 7); ctx.fill();
  ctx.strokeStyle = '#e25248'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 7, gy - 72); ctx.lineTo(cx - 7, gy - 84); ctx.lineTo(cx, gy - 76); ctx.lineTo(cx + 7, gy - 84); ctx.lineTo(cx + 7, gy - 72); ctx.stroke();
  const a = 0.18 + Math.sin(t * 2) * 0.06;
  ctx.fillStyle = `rgba(255,210,150,${a})`;
  ctx.fillRect(x * T, gy - 2, w * T, 2);
}

/* Вагон метро. Кузов рисуется до ночного затемнения, а салон, табло и свет
   из дверей — после, поэтому вагон остаётся самым тёплым пятном на экране. */
function trainGeom(W) {
  const tr = W.train, X = 22.4 * T + tr.dx, Y = 11.25 * T;
  return { tr, X, Y, Wd: 15 * T, H: 3.6 * T, dX: 30 * T + tr.dx + 2, dW: 56,
    wins: [0, 1, 2].map(i => X + 38 + i * 64) };
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawTrain(W, t, dt) {
  const tr = W.train;
  if (!tr || tr.gone) return;
  tr.door = (tr.door || 0) + ((tr.leaving ? 1 : 0) - (tr.door || 0)) * Math.min(1, dt * 7);
  const { X, Y, Wd, H, dX, dW, wins } = trainGeom(W);
  // тележки и колёса
  ctx.fillStyle = '#0c0f1e';
  for (const bx of [X + 60, X + 300]) {
    ctx.fillRect(bx - 34, Y + H - 12, 68, 10);
    for (const wx of [bx - 20, bx + 20]) { dot(wx, Y + H - 4, 7, '#141a30'); dot(wx, Y + H - 4, 2.4, '#3a4260'); }
  }
  // кузов
  rrect(X, Y, Wd, H - 8, 16);
  const body = ctx.createLinearGradient(0, Y, 0, Y + H);
  body.addColorStop(0, '#3a4d7c'); body.addColorStop(0.1, '#44598a');
  body.addColorStop(0.12, '#efe3c6'); body.addColorStop(0.52, '#dccaa2');
  body.addColorStop(0.53, '#2f5aa0'); body.addColorStop(1, '#1d3a72');
  ctx.fillStyle = body; ctx.fill();
  ctx.save(); rrect(X, Y, Wd, H - 8, 16); ctx.clip();
  // крыша: вентиляция и поручень
  ctx.fillStyle = '#2b3a64';
  for (let vx = X + 30; vx < X + Wd; vx += 90) { rrect(vx, Y + 2, 36, 5, 2.5); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X, Y + 11, Wd, 1.2);
  // красная полоса с золотой линией
  const sy = Y + 0.53 * H - 1;
  ctx.fillStyle = '#c9483c'; ctx.fillRect(X, sy, Wd, 6);
  ctx.fillStyle = '#e8b85a'; ctx.fillRect(X, sy + 7, Wd, 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(X, sy, Wd, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let rx = X + 8; rx < X + Wd; rx += 12) ctx.fillRect(rx, sy + 11, 1.4, 1.4);
  // низ кузова и блик лака
  ctx.fillStyle = '#152a55'; ctx.fillRect(X, Y + H - 20, Wd, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(X, Y + H - 34, Wd, 2);
  ctx.restore();
  // торец вагона с тамбуром
  ctx.fillStyle = '#26396a'; rrect(X + 4, Y + 18, 18, H - 36, 5); ctx.fill();
  ctx.fillStyle = '#1a2340'; rrect(X + 7, Y + 22, 12, 22, 3); ctx.fill();
  // рамы окон и двери
  for (const wx of wins) {
    ctx.fillStyle = '#1b2440'; rrect(wx - 3, Y + 14, 46, 34, 7); ctx.fill();
    ctx.fillStyle = '#0d1226'; rrect(wx, Y + 17, 40, 28, 5); ctx.fill();
  }
  ctx.fillStyle = '#1a2a52'; rrect(dX - 4, Y + 8, dW + 8, H - 14, 4); ctx.fill();
  ctx.fillStyle = '#0d1226'; ctx.fillRect(dX, Y + 12, dW, H - 20);
}

function drawTrainGlow(W, t, dt) {
  const tr = W.train;
  if (!tr || tr.gone) return;
  const { X, Y, H, dX, dW, wins } = trainGeom(W);
  const warm = (x, y, w, h) => { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fff0c8'); g.addColorStop(0.5, '#ffd89a'); g.addColorStop(1, '#eeae68'); return g; };
  const interior = (x, y, w, h, i) => {
    ctx.save(); rrect(x, y, w, h, 5); ctx.clip();
    ctx.fillStyle = warm(x, y, w, h); ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, w, 2.2);
    ctx.fillStyle = 'rgba(160,120,70,0.35)'; ctx.fillRect(x, y + 5, w, 1);
    for (let hx = x + 4; hx < x + w; hx += 9) { ctx.strokeStyle = 'rgba(120,85,50,0.6)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx, y + 5); ctx.lineTo(hx, y + 8); ctx.stroke(); ctx.beginPath(); ctx.arc(hx, y + 9.2, 1.3, 0, 7); ctx.stroke(); }
    ctx.fillStyle = '#3a5fa8'; rrect(x - 2, y + h - 9, w + 4, 9, 3); ctx.fill();
    ctx.fillStyle = '#4b73c0'; ctx.fillRect(x - 2, y + h - 9, w + 4, 2);
    ctx.fillStyle = '#c9b27c'; ctx.fillRect(x + w * 0.7, y, 1.6, h);
    ctx.fillStyle = 'rgba(40,25,30,0.55)';
    if (i === 0) {
      ctx.beginPath(); ctx.arc(x + 14, y + h - 16, 3.4, 0, 7); ctx.fill();
      rrect(x + 9, y + h - 13, 11, 8, 3); ctx.fill();
      ctx.fillStyle = 'rgba(250,245,230,0.9)'; ctx.fillRect(x + 7, y + h - 17, 13, 8);
      ctx.fillStyle = 'rgba(80,70,60,0.5)'; for (let k = 0; k < 3; k++) ctx.fillRect(x + 8, y + h - 15.5 + k * 2, 11, 0.6);
    } else if (i === 2) {
      const tail = Math.sin(t * 2) * 1.5;
      ctx.beginPath(); ctx.ellipse(x + 13, y + h - 11, 6, 3.4, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 18, y + h - 13, 2.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 16.4, y + h - 15); ctx.lineTo(x + 17.2, y + h - 17.8); ctx.lineTo(x + 18.4, y + h - 15.4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 18.6, y + h - 15.2); ctx.lineTo(x + 19.8, y + h - 17.6); ctx.lineTo(x + 20.6, y + h - 14.6); ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,30,0.55)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 7, y + h - 10); ctx.quadraticCurveTo(x + 3, y + h - 14 + tail, x + 5, y + h - 18 + tail); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w * 0.38, y); ctx.lineTo(x + w * 0.12, y + h); ctx.lineTo(x - w * 0.1, y + h); ctx.fill();
    ctx.restore();
  };
  wins.forEach((wx, i) => interior(wx, Y + 17, 40, 28, i));

  // дверь: салон, силуэты героев, створки
  const d = tr.door || 0, dy = Y + 12, dh = H - 20;
  interior(dX, dy, dW, dh, 1);
  const half = dW / 2, off = (1 - d) * (half - 2);
  for (const side of [-1, 1]) {
    const px = side < 0 ? dX - off : dX + half + off;
    ctx.save(); ctx.beginPath(); ctx.rect(dX, dy, dW, dh); ctx.clip();
    ctx.fillStyle = '#28427a'; ctx.fillRect(px, dy, half, dh);
    ctx.fillStyle = '#c9483c'; ctx.fillRect(px, dy + dh * 0.57, half, 4);
    ctx.fillStyle = '#e9dcbf'; ctx.fillRect(px, dy, half, dh * 0.5);
    ctx.fillStyle = '#1b2440'; rrect(px + 5, dy + 6, half - 10, dh * 0.38, 4); ctx.fill();
    ctx.fillStyle = warm(px, dy, half, dh); rrect(px + 6.5, dy + 7.5, half - 13, dh * 0.38 - 3, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(side < 0 ? px + half - 1.5 : px, dy, 1.5, dh);
    ctx.restore();
  }
  if (S.mode === 'clear' && !S.late && !LEVELS[S.level + 1]) {
    const a = clamp(S.clearT * 2 - 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath();
    for (const px of [dX, dX + half]) ctx.rect(px + 6.5, dy + 7.5, half - 13, dh * 0.38 - 3);
    ctx.clip();
    ctx.fillStyle = 'rgba(214,160,28,0.95)'; rrect(dX + 7, dy + 26, 14, 20, 5); ctx.fill();
    dot(dX + 14, dy + 21, 5, 'rgba(90,55,30,0.95)');
    dot(dX + 10, dy + 23, 3, 'rgba(90,55,30,0.95)');
    ctx.fillStyle = 'rgba(52,38,82,0.95)'; rrect(dX + half + 5, dy + 22, 15, 24, 5); ctx.fill();
    dot(dX + half + 12.5, dy + 16.5, 5, 'rgba(28,20,42,0.97)');
    ctx.restore();
  }
  // табло маршрута над дверью
  ctx.fillStyle = '#0b0d18'; rrect(dX + 6, Y - 4, dW - 12, 12, 3); ctx.fill();
  ctx.font = '700 8px "Golos Text", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffb04a'; ctx.shadowBlur = 6; ctx.fillStyle = '#ffc766';
  ctx.fillText('ДОМОЙ', dX + dW / 2 + 5, Y + 2.4);
  ctx.shadowBlur = 0;
  dot(dX + 13, Y + 2, 3.6, '#d84a3e'); ctx.fillStyle = '#fff'; ctx.font = '700 5px "Golos Text", sans-serif'; ctx.fillText('1', dX + 13, Y + 2.3);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  // тёплое свечение: окна, свет из дверей на платформу, хвостовой огонь
  ctx.globalCompositeOperation = 'lighter';
  for (const wx of wins) {
    const g = ctx.createRadialGradient(wx + 20, Y + 31, 4, wx + 20, Y + 31, 42);
    g.addColorStop(0, 'rgba(255,200,120,0.18)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(wx - 22, Y - 11, 84, 84);
  }
  const open = 1 - d;
  if (open > 0.02) {
    const fy = 15 * T, cx = dX + dW / 2;
    const g = ctx.createRadialGradient(cx, fy, 2, cx, fy, 70);
    g.addColorStop(0, `rgba(255,205,130,${0.4 * open})`); g.addColorStop(1, 'rgba(255,205,130,0)');
    ctx.save(); ctx.translate(cx, fy); ctx.scale(1, 0.22); ctx.translate(-cx, -fy);
    ctx.fillStyle = g; ctx.fillRect(cx - 70, fy - 70, 140, 140); ctx.restore();
    const g2 = ctx.createLinearGradient(0, dy, 0, dy + dh);
    g2.addColorStop(0, `rgba(255,210,140,${0.06 * open})`); g2.addColorStop(1, `rgba(255,210,140,${0.2 * open})`);
    ctx.fillStyle = g2; ctx.fillRect(dX - 10, dy, dW + 20, dh);
  }
  const tg = ctx.createRadialGradient(X + 13, Y + H - 26, 0, X + 13, Y + H - 26, 14);
  tg.addColorStop(0, 'rgba(255,70,50,0.7)'); tg.addColorStop(1, 'rgba(255,70,50,0)');
  ctx.fillStyle = tg; ctx.fillRect(X - 1, Y + H - 40, 28, 28);
  if (tr.v > 60) {
    ctx.strokeStyle = `rgba(255,220,170,${Math.min(0.35, tr.v / 1500)})`; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) { const ly = Y + 20 + i * 14; ctx.beginPath(); ctx.moveTo(X - 10 - tr.v * 0.08 * (1 + i % 3), ly); ctx.lineTo(X - 2, ly); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over';
  dot(X + 13, Y + H - 26, 2.2, '#ff5a44');
}

function drawLTile(W, s, t, near) {
  const X = s.x * T, Y = s.y * T, gl = W.glow[s.y][s.x];
  if (gl > 0) {
    let a = 1;
    if (!W.lit[s.y][s.x]) a = gl < 1.4 ? (0.45 + 0.55 * Math.abs(Math.sin(t * 16 + s.x))) * (0.4 + gl / 2.3) : 0.9;
    ctx.fillStyle = `rgba(255,205,120,${0.6 * a})`; ctx.fillRect(X + 1, Y, T - 2, 11);
    ctx.fillStyle = `rgba(255,240,200,${0.9 * a})`; ctx.fillRect(X + 1, Y, T - 2, 1.5);
    ctx.fillStyle = `rgba(255,190,90,${0.18 * a})`; ctx.fillRect(X + 1, Y + 11, T - 2, 10);
  } else {
    ctx.strokeStyle = `rgba(255,210,140,${0.1 + near * 0.35})`; ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]); ctx.strokeRect(X + 1.5, Y + 0.5, T - 3, 10); ctx.setLineDash([]);
  }
}
function drawSTile(W, s, t, near) {
  const X = s.x * T, Y = s.y * T;
  if (W.sdark[s.y][s.x] > 0) {
    ctx.fillStyle = 'rgba(22,12,40,0.95)'; ctx.fillRect(X, Y, T, 11);
    ctx.fillStyle = 'rgba(160,120,240,0.55)'; ctx.fillRect(X, Y, T, 1.5);
    const w = Math.sin(t * 2 + s.x * 1.7) * 3;
    ctx.fillStyle = 'rgba(60,35,100,0.55)';
    ctx.beginPath(); ctx.ellipse(X + 15 + w, Y + 14, 9, 4, 0, 0, 7); ctx.fill();
  } else {
    ctx.strokeStyle = `rgba(170,130,255,${0.1 + near * 0.35})`; ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]); ctx.strokeRect(X + 1.5, Y + 0.5, T - 3, 10); ctx.setLineDash([]);
  }
}

function drawWater(W, t) {
  const rails = W.def.pit === 'rails';
  const pits = [];
  for (let x = 0; x < COLS; x++) if (!'#='.includes(W.tiles[ROWS - 1][x])) pits.push(x);
  if (!pits.length) return;
  const Y = 16.3 * T;
  for (const x of pits) {
    const X = x * T;
    if (rails) {
      ctx.fillStyle = '#070916'; ctx.fillRect(X, 15.4 * T, T, VH);
      ctx.fillStyle = '#2a2d44'; ctx.fillRect(X + 6, 17.05 * T, 14, 5);
      ctx.fillStyle = '#5a5f7e'; ctx.fillRect(X, 16.85 * T, T, 2.5);
      ctx.fillStyle = 'rgba(200,210,255,0.25)'; ctx.fillRect(X, 16.85 * T, T, 0.7);
      continue;
    }
    const wg = ctx.createLinearGradient(0, Y, 0, VH);
    wg.addColorStop(0, '#111a42'); wg.addColorStop(1, '#050817');
    ctx.fillStyle = wg; ctx.fillRect(X, Y, T, VH - Y);
    ctx.fillStyle = `rgba(140,165,240,${0.18 + 0.1 * Math.sin(t * 2 + x)})`;
    ctx.fillRect(X + ((t * 12 + x * 7) % T), Y + 3, 8, 0.8);
    ctx.fillRect(X + ((t * 7 + x * 13) % T), Y + 10, 5, 0.8);
    ctx.fillRect(X + ((t * 9 + x * 5) % T), Y + 17, 6, 0.7);
  }
  ctx.fillStyle = 'rgba(170,190,255,0.35)';
  for (const x of pits) ctx.fillRect(x * T, Y, T, 0.8);
  ctx.globalCompositeOperation = 'lighter';
  for (const l of W.lamps) {
    if (!lampOn(W, l)) continue;
    const lx = l.x * T;
    if (!pits.some(x => Math.abs((x + 0.5) * T - lx) < 60)) continue;
    const col = l.color || COL.amber;
    for (let i = 0; i < 9; i++) {
      const yy = Y + 2 + i * 2.6, wdt = (14 - i) * (0.8 + 0.3 * Math.sin(t * 5 + i * 1.7));
      ctx.fillStyle = hexA(col, 0.32 * (1 - i / 9));
      ctx.fillRect(lx - wdt / 2 + Math.sin(t * 3 + i) * 2.5, yy, wdt, 1.4);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

/* ---------- герои ----------
   Герои собраны на «скелете»: бёдра, голени, плечи и предплечья поворачиваются
   в суставах, одежда, волосы, шарф и фонарик — на пружинах, которые отстают
   от движения. Всё это только картинка: хитбоксы и физика прежние. */
let HERO_A = 1;
const HS = 1.24;

function spring(o, key, target, k, damp, dt) {
  const v = key + 'V';
  o[v] = (o[v] || 0) + ((target - (o[key] || 0)) * k - (o[v] || 0) * damp) * dt;
  o[key] = (o[key] || 0) + o[v] * dt;
  return o[key];
}

function animOf(c, dt) {
  const a = c.anim || (c.anim = { ph: 0, land: 0, ground: true, pvx: 0, idle: 0 });
  if (dt > 0) {
    const run = c.onGround && Math.abs(c.vx) > 12;
    if (run) a.ph += dt * Math.abs(c.vx) / (c.id === 'luma' ? 15 : 18);
    else a.ph += (Math.round(a.ph / Math.PI) * Math.PI - a.ph) * Math.min(1, dt * 9);
    if (c.onGround && !a.ground) a.land = 1;
    a.ground = c.onGround;
    a.land = Math.max(0, a.land - dt * 5);
    a.idle = run || !c.onGround ? 0 : a.idle + dt;
    const vRel = c.vx * c.face, sp = vRel / c.def.speed;
    const air = c.onGround ? 0 : 1;
    spring(a, 'cloth', Math.abs(sp) * 1.1 + air * 0.5, 70, 8, dt);
    spring(a, 'lift', air * clamp(c.vy / 450, -1, 1.2), 55, 7, dt);
    spring(a, 'hair', Math.abs(sp) + air * 0.4, 110, 6, dt);
    const acc = (c.vx - a.pvx) * c.face / dt;
    spring(a, 'lamp', clamp(-sp * 0.45 - acc * 0.0006, -1, 1), 38, 2.6, dt);
    spring(a, 'bag', clamp(-sp * 0.6 + air * 0.3, -1, 1), 45, 3.5, dt);
    a.pvx = c.vx;
  }
  return a;
}

const sg = (x, y, a, l) => [x + Math.sin(a) * l, y + Math.cos(a) * l];
function stroke2(pts, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function limb(x, y, a1, l1, a2, l2, w, col) {
  const k = sg(x, y, a1, l1), f = sg(k[0], k[1], a2, l2);
  stroke2([[x, y], k, f], w, col);
  return { k, f };
}
function dot(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function poly(pts, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fill();
}

/* Поза: углы от вертикали (0 — вниз, плюс — вперёд). */
function pose(c, a, t) {
  const ph = a.ph, run = c.onGround && Math.abs(c.vx) > 12;
  const P = { bob: 0, lean: 0 };
  if (!c.onGround) {
    const up = c.vy < 0;
    P.legF = up ? [0.85, 1.25] : [0.4, 0.35];
    P.legB = up ? [-0.25, 0.9] : [-0.3, 0.2];
    P.armF = up ? [1.0, 0.1] : [1.6, -0.1];
    P.armB = up ? [-0.8, 0.5] : [-1.3, 0.3];
    P.lean = up ? 0.08 : -0.04;
  } else if (run) {
    const s = Math.sin(ph), cF = Math.cos(ph), cB = -cF;
    P.legF = [s * 0.62, s * 0.62 - (cF > 0 ? cF * 1.1 : 0) - 0.12];
    P.legB = [-s * 0.62, -s * 0.62 - (cB > 0 ? cB * 1.1 : 0) - 0.12];
    P.armF = [-s * 0.7, -s * 0.7 + 0.75];
    P.armB = [s * 0.7, s * 0.7 + 0.75];
    P.bob = Math.abs(Math.cos(ph)) * 1.3;
    P.lean = 0.1;
  } else {
    const br = Math.sin(t * 2.1 + (c.id === 'nox' ? 1.3 : 0));
    P.legF = [0.1, 0.05]; P.legB = [-0.12, -0.08];
    P.armF = [0.12 + br * 0.03, 0.25]; P.armB = [-0.1 - br * 0.03, 0.2];
    P.bob = br * 0.35;
  }
  return P;
}

function boot(f, dark, sole, cuff) {
  const [x, y] = f;
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.moveTo(x - 2.2, y - 3.8); ctx.lineTo(x + 1.6, y - 3.8); ctx.quadraticCurveTo(x + 4.6, y - 2.6, x + 4.4, y - 0.4);
  ctx.lineTo(x - 2.6, y - 0.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = sole; ctx.fillRect(x - 2.7, y - 0.9, 7.2, 1.1);
  if (cuff) { ctx.fillStyle = cuff; ctx.fillRect(x - 2.4, y - 4.6, 4.4, 1.2); }
}

function drawLuma(c, t, dt) {
  const a = animOf(c, dt), P = pose(c, a, t);
  ctx.save();
  ctx.globalAlpha = HERO_A;
  ctx.translate(c.x + c.w / 2, c.y + c.h);
  ctx.scale(c.face * HS * (1 + a.land * 0.07), HS * (1 - a.land * 0.09));
  ctx.translate(0, -P.bob);
  const hip = [0, -12.6], sh = [0.6 + P.lean * 6, -22.6];
  const cl = a.cloth || 0, lf = a.lift || 0, hr = a.hair || 0;

  // задняя рука
  const armB = limb(sh[0] - 1.6, sh[1] + 1, P.armB[0], 4.6, P.armB[1], 4.4, 3.1, '#d9a21e');
  dot(armB.f[0], armB.f[1], 1.25, '#e8b594');
  // капюшон и задняя масса волос
  dot(-2.6 + P.lean * 4, -23.4, 4.2, '#e0a91f');
  // ноги
  const legB = limb(hip[0] - 1, hip[1], P.legB[0], 6.3, P.legB[1], 6.3, 3.1, '#2a1c1d');
  const legF = limb(hip[0] + 1, hip[1], P.legF[0], 6.3, P.legF[1], 6.3, 3.3, '#3a2624');
  for (const L of [legB, legF]) {
    const s = sg(L.k[0], L.k[1], 0, 0);
    stroke2([sg(L.f[0], L.f[1], Math.PI, 4.6), sg(L.f[0], L.f[1], Math.PI, 3.2)], 3.6, '#e9dfcb');
  }
  boot(legB.f, '#4e3121', '#241510', '#5c3a26');
  boot(legF.f, '#6a4128', '#2d1d14', '#7a4d30');
  dot(legF.k[0] + 0.3, legF.k[1] + 1.8, 0.9, '#c79a6c');
  // шорты
  poly([[-4.6, -15], [4.8, -15], [5.2, -11.2], [0.6, -10.6], [-5, -11.4]], '#3f4250');
  // дождевик
  const wv = Math.sin(t * 4.3) * 0.5 * (0.4 + cl);
  const backHem = [-7.2 - cl * 3.6, -9.4 - lf * 2.4 + wv], frontHem = [7.4 + cl * 0.6, -9.8 - lf * 1.2];
  const coat = [[sh[0] - 4.8, sh[1]], [sh[0] + 4.4, sh[1]], [frontHem[0] - 0.6, -15], frontHem,
    [3.4, -9.2 + wv * 0.4], [-1.5, -8.8 - lf], backHem, [-6.2 - cl * 1.2, -16]];
  poly(coat, '#f2c230');
  poly([[sh[0] - 4.8, sh[1]], [sh[0] - 1.2, sh[1]], [-2, -9], backHem, [-6.2 - cl * 1.2, -16]], '#d99d1a');
  ctx.strokeStyle = 'rgba(255,248,214,0.55)'; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(sh[0] + 2.4, sh[1] + 2); ctx.lineTo(4.4, -12.5); ctx.moveTo(-3.6, -20); ctx.lineTo(-4.8, -14); ctx.stroke();
  poly([[sh[0] + 1.2, sh[1] + 0.4], [sh[0] + 3.4, sh[1] + 0.4], [4.2, -13.4], [2.6, -13.2]], '#8c8c96');
  poly([[sh[0] + 1.8, sh[1] + 0.6], [sh[0] + 3, sh[1] + 0.6], [3.2, -16.5], [2.4, -16.5]], '#efe8da');
  for (let i = 0; i < 3; i++) dot(4.9, -20 + i * 3, 0.45, '#8a6414');
  ctx.strokeStyle = '#c28a14'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-1.5, -13.5); ctx.lineTo(1.8, -13.5); ctx.stroke();
  // ремень сумки и сумка
  ctx.strokeStyle = '#4b2e1c'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(sh[0] + 3.2, sh[1] + 0.5); ctx.lineTo(-3, -13.6); ctx.stroke();
  ctx.save(); ctx.translate(-3.2, -13.6); ctx.rotate((a.bag || 0) * 0.6 + Math.sin(a.ph) * 0.12);
  ctx.fillStyle = '#5a3822'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(2.6, 0); ctx.lineTo(2.2, 4.4); ctx.lineTo(-2.6, 4.4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6e4a2c'; ctx.fillRect(-3, 0, 5.6, 1.4);
  dot(1.6, 3.2, 0.9, '#c9a45a');
  ctx.restore();
  // голова
  const hx = sh[0] + 0.4, hy = -28.4;
  const hs = hr * 2.4, bounce = Math.sin(a.ph * 2) * 0.5;
  ctx.fillStyle = '#4a2b1b';
  for (const [x, y, r] of [[-4.6, -27, 3.4], [-5.4 - hs * 0.5, -24.2 + bounce, 2.8], [-3.8 - hs * 0.8, -22.4 + bounce, 2.2], [-2.4, -31.6, 3], [-6.2 - hs, -26.2, 2.2]])
    { ctx.beginPath(); ctx.arc(hx + x, hy + 28.4 + y, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#e8b594'; ctx.fillRect(hx - 1.4, hy + 4, 2.6, 2);
  dot(hx, hy, 5.3, '#f3c9a8');
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.arc(hx - 1.2, hy + 0.6, 4.6, Math.PI * 0.5, Math.PI * 1.3); ctx.fill();
  dot(hx + 2.4, hy + 2.1, 1.3, 'rgba(240,120,110,0.45)');
  const blink = (t % 4.2) < 0.12;
  if (blink) { ctx.strokeStyle = '#2a1a12'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(hx + 2, hy + 0.2); ctx.lineTo(hx + 4.2, hy + 0.4); ctx.stroke(); }
  else {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(hx + 3.1, hy + 0.1, 1.35, 1.75, 0, 0, 7); ctx.fill();
    dot(hx + 3.4, hy + 0.3, 1.1, '#6b3d1f'); dot(hx + 3.5, hy + 0.4, 0.55, '#1d110a'); dot(hx + 3.8, hy - 0.4, 0.4, '#fff');
    ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.moveTo(hx + 1.6, hy - 1.6); ctx.quadraticCurveTo(hx + 3, hy - 2.3, hx + 4.5, hy - 1.7); ctx.stroke();
  }
  ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.arc(hx + 3.4, hy + 2.6, 0.9, 0.2, 2.2); ctx.stroke();
  // чёлка и кудри сверху
  ctx.fillStyle = '#4a2b1b';
  ctx.beginPath(); ctx.arc(hx - 0.4, hy - 1.8, 5.6, Math.PI * 0.95, Math.PI * 1.9); ctx.fill();
  poly([[hx - 2, hy - 5.8], [hx + 5.4, hy - 3.8], [hx + 5.3, hy - 1.6], [hx + 4, hy - 2.8], [hx + 3, hy - 1.8], [hx + 1.8, hy - 3.2], [hx - 0.4, hy - 2]], '#4a2b1b');
  ctx.strokeStyle = '#6a4028'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(hx - 1, hy - 3.6, 3, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  const fl = Math.sin(t * 3.1) * 0.6 - hs * 0.5;
  ctx.strokeStyle = '#4a2b1b'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(hx - 3, hy - 5); ctx.quadraticCurveTo(hx - 6, hy - 8 + fl, hx - 8 - hs, hy - 6 + fl); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + 1, hy - 5.4); ctx.quadraticCurveTo(hx + 2, hy - 8.4 + fl * 0.5, hx + 0.2, hy - 9 + fl * 0.5); ctx.stroke();
  // передняя рука с фонариком
  const lampArm = c.onGround ? [0.55 + Math.sin(a.ph) * 0.12, -0.35] : P.armF;
  const armF = limb(sh[0] + 1.4, sh[1] + 1, lampArm[0], 4.6, lampArm[1], 4.4, 3.4, '#f2c230');
  stroke2([sg(armF.k[0], armF.k[1], lampArm[1], 3.2), sg(armF.k[0], armF.k[1], lampArm[1], 4)], 3.9, '#f7d35a');
  const hand = armF.f;
  dot(hand[0], hand[1], 1.3, '#f0c09c');
  ctx.save(); ctx.translate(hand[0], hand[1]); ctx.rotate((a.lamp || 0) * 0.9 + Math.sin(t * 2.4) * 0.05);
  ctx.strokeStyle = '#3b2a1a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 1.6); ctx.stroke();
  ctx.fillStyle = '#5a4128'; ctx.fillRect(-2.2, 1.4, 4.4, 1.2); ctx.fillRect(-2.2, 7, 4.4, 1.1);
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(-1.8, 2.6, 3.6, 4.4);
  dot(0, 4.8, 1.3, '#fff6d8');
  ctx.strokeStyle = '#5a4128'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(0, 2.6); ctx.lineTo(0, 7); ctx.stroke();
  ctx.restore();
  const m = ctx.getTransform();
  const lx = hand[0], ly = hand[1] + 5;
  c.lantern = [(m.a * lx + m.c * ly + m.e) / K, (m.b * lx + m.d * ly + m.f) / K];
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawNox(c, t, dt) {
  const a = animOf(c, dt), P = pose(c, a, t);
  const sh0 = c.shadow > 0;
  const C = sh0
    ? { boot: '#3a2860', leg: '#3a2860', coat: '#4a3380', coatD: '#3b2868', lin: '#7a5cc8', skin: '#6a4fb0', hair: '#2d1f4d', hairL: '#4a3478', scarf: '#6a4fb0', glove: '#3a2860', shirt: '#4a3380', metal: '#7a5cc8' }
    : { boot: '#15121c', leg: '#221c2c', coat: '#2c2539', coatD: '#211b2c', lin: '#5b4591', skin: '#e9c6a8', hair: '#1c1626', hairL: '#3d2c5e', scarf: '#4b3a70', glove: '#18141f', shirt: '#2f2a3c', metal: '#8a86a0' };
  ctx.save();
  ctx.globalAlpha = HERO_A * (sh0 ? 0.55 + Math.sin(t * 20) * 0.07 : 1);
  ctx.translate(c.x + c.w / 2, c.y + c.h);
  ctx.scale(c.face * HS * (1 + a.land * 0.06), HS * (1 - a.land * 0.08));
  ctx.translate(0, -P.bob);
  const hip = [0, -15.4], sh = [0.4 + P.lean * 7, -28.2];
  const cl = a.cloth || 0, lf = a.lift || 0, hr = a.hair || 0;
  const wind = Math.sin(t * 3.2) * 0.6 + Math.sin(t * 5.1) * 0.3;

  // хвост шарфа
  const sa = 0.9 + cl * 0.9 + wind * 0.15 - lf * 0.4;
  const s1 = sg(sh[0] - 2.4, sh[1] - 0.6, -sa, 4.2), s2 = sg(s1[0], s1[1], -sa - 0.35 - wind * 0.2, 3.8);
  stroke2([[sh[0] - 2.4, sh[1] - 0.6], s1, s2], 2.6, C.scarf);
  // задняя пола плаща с подкладкой
  const wv = Math.sin(t * 3.7) * 0.7 * (0.3 + cl);
  const tail = [];
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = -2.4 - u * (4.6 + cl * 4.2);
    const y = -6.2 - lf * 3 * u * u + Math.sin(t * 4 + i * 1.3) * 0.7 * (0.3 + cl) + (i % 2 ? 1 : 0) - u * u * cl * 1.5;
    tail.push([x, y]);
  }
  poly([[sh[0] - 3.4, sh[1] + 1], [-5 - cl * 0.8, -18], ...tail.slice().reverse(), [-1, -8]], C.lin);
  poly([[sh[0] - 3.4, sh[1] + 1], [-4.6, -18], [tail[n][0] + 1.6, tail[n][1] - 1.2 + wv], [-2, -9]], C.coatD);
  // задняя рука
  const armB = limb(sh[0] - 1.8, sh[1] + 1.2, P.armB[0], 6, P.armB[1], 5.6, 3.3, C.coatD);
  dot(armB.f[0], armB.f[1], 1.4, C.glove);
  // ноги
  const legB = limb(hip[0] - 1, hip[1], P.legB[0], 7.8, P.legB[1], 7.8, 3.3, '#1a1522');
  const legF = limb(hip[0] + 1, hip[1], P.legF[0], 7.8, P.legF[1], 7.8, 3.5, C.leg);
  for (const L of [legB, legF]) {
    stroke2([sg(L.f[0], L.f[1], Math.PI + (L === legF ? P.legF[1] : P.legB[1]) * 0.2, 5.4), sg(L.f[0], L.f[1], Math.PI, 1)], 3.9, C.boot);
    ctx.strokeStyle = C.metal; ctx.lineWidth = 0.45; ctx.beginPath();
    ctx.moveTo(L.f[0] - 1.8, L.f[1] - 3.2); ctx.lineTo(L.f[0] + 1.8, L.f[1] - 3.4); ctx.stroke();
  }
  boot(legB.f, '#110e17', '#050408', null);
  boot(legF.f, C.boot, '#07060a', null);
  // плащ спереди
  const fr = [7.2 + cl * 0.5, -7.2 - lf * 1.5];
  poly([[sh[0] - 4.6, sh[1] + 0.4], [sh[0] + 4.6, sh[1] + 0.4], [6.2, -17], fr, [3.6, -6.2 + wv * 0.3], [1.2, -7.8], [-1, -6], [-3.2, -8.2]], C.coat);
  poly([[sh[0] + 0.2, sh[1] + 0.8], [sh[0] + 2.8, sh[1] + 0.8], [3.2, -16.2], [0.6, -16.2]], C.shirt);
  ctx.strokeStyle = sh0 ? C.lin : '#3d3352'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(sh[0] + 3, sh[1] + 1); ctx.lineTo(5.6, -8.4); ctx.moveTo(-2.4, -15); ctx.lineTo(-2.8, -8.6); ctx.stroke();
  // ремни
  ctx.fillStyle = '#16121d'; ctx.fillRect(-4.4, -17.2, 10, 1.9);
  ctx.strokeStyle = C.metal; ctx.lineWidth = 0.6; ctx.strokeRect(1.4, -17.4, 2.2, 2.3);
  ctx.strokeStyle = '#16121d'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(sh[0] + 3.4, sh[1] + 0.6); ctx.lineTo(-3.6, -17); ctx.stroke();
  ctx.strokeStyle = C.metal; ctx.lineWidth = 0.5; ctx.strokeRect(0, -24.2, 1.6, 1.6);
  // накидка на плечах
  const cp = cl * 1.6 + wind * 0.3;
  poly([[sh[0] - 5.4, sh[1] - 0.4], [sh[0] + 5, sh[1] - 0.4], [sh[0] + 6.2, sh[1] + 5.4], [sh[0] + 1, sh[1] + 6.6], [sh[0] - 6.4 - cp, sh[1] + 5.8 - lf]], C.coatD);
  ctx.strokeStyle = sh0 ? C.lin : 'rgba(150,130,200,0.35)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(sh[0] - 2.6, sh[1] + 3.2, 1.1, 0, 7); ctx.stroke();
  // передняя рука: в покое — в кармане
  const inPocket = c.onGround && Math.abs(c.vx) < 12 && a.idle > 0.6;
  const armFa = inPocket ? [0.35, -0.55] : P.armF;
  const armF = limb(sh[0] + 1.6, sh[1] + 1.4, armFa[0], 6, armFa[1], 5.6, 3.5, C.coat);
  if (!inPocket) dot(armF.f[0], armF.f[1], 1.5, C.glove);
  stroke2([sg(armF.k[0], armF.k[1], armFa[1], 3.8), sg(armF.k[0], armF.k[1], armFa[1], 4.6)], 3.9, C.coatD);
  // капюшон, шарф, голова
  dot(sh[0] - 2.4, sh[1] - 4.4, 5.2, sh0 ? C.coatD : '#1d1828');
  ctx.fillStyle = C.scarf; ctx.beginPath(); ctx.ellipse(sh[0] + 0.2, sh[1] - 0.8, 4.8, 2.2, 0, 0, 7); ctx.fill();
  const hx = sh[0] + 0.6, hy = -33.6;
  dot(hx, hy, 5, C.skin);
  if (!sh0) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.arc(hx - 1, hy + 0.5, 4.4, Math.PI * 0.5, Math.PI * 1.3); ctx.fill();
    if ((t + 1.7) % 5 < 0.12) { ctx.strokeStyle = '#1d1420'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(hx + 1.8, hy + 0.2); ctx.lineTo(hx + 4, hy + 0.3); ctx.stroke(); }
    else {
      ctx.fillStyle = '#f4eee8'; ctx.beginPath(); ctx.ellipse(hx + 3, hy + 0.3, 1.3, 1, 0, 0, 7); ctx.fill();
      dot(hx + 3.3, hy + 0.4, 0.8, '#2a1c2e'); dot(hx + 3.5, hy + 0.1, 0.3, '#fff');
      ctx.strokeStyle = '#1d1420'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx + 1.6, hy - 0.7); ctx.lineTo(hx + 4.4, hy - 0.5); ctx.stroke();
      ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(hx + 1.4, hy - 2.2); ctx.lineTo(hx + 4.4, hy - 2.1); ctx.stroke();
    }
    ctx.strokeStyle = '#8a4a3a'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(hx + 3, hy + 2.3, 0.9, 0.3, 1.9); ctx.stroke();
  }
  // волосы
  const hs = hr * 2.2, fl = Math.sin(t * 2.7) * 0.5;
  ctx.fillStyle = C.hair;
  ctx.beginPath(); ctx.arc(hx - 0.6, hy - 1.8, 5.4, Math.PI * 0.8, Math.PI * 1.93); ctx.fill();
  poly([[hx - 4.8, hy - 3], [hx - 8 - hs, hy - 1 + fl], [hx - 5, hy - 0.6], [hx - 7.2 - hs * 0.8, hy + 2.6 + fl], [hx - 3.6, hy + 1.4], [hx - 3, hy - 2]], C.hair);
  poly([[hx - 1.2, hy - 6.6], [hx + 5.2, hy - 4], [hx + 4.4, hy - 3], [hx + 5.1, hy - 1.2], [hx + 3.2, hy - 2.8], [hx + 2.2, hy - 2.2], [hx + 1.2, hy - 3.8]], C.hair);
  poly([[hx - 2, hy - 6], [hx - 1 - hs * 0.5, hy - 9.4 + fl], [hx + 1.2, hy - 6.4]], C.hair);
  ctx.strokeStyle = C.hairL; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.arc(hx - 1, hy - 3.4, 3.4, Math.PI * 1.15, Math.PI * 1.75); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (c.blocked > 0) {
    const [cx, cy] = [c.x + c.w / 2 + c.face * 10, c.y + c.h / 2];
    ctx.strokeStyle = `rgba(190,160,255,${c.blocked * 3})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 10 + (0.25 - c.blocked) * 30, -0.8, 0.8); ctx.stroke();
  }
}

function wrap(text, maxW) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function drawBubble(c) {
  if (!c.say || c.dead) return;
  const s = c.say, age = s.max - s.t;
  const a = Math.min(1, age * 6, s.t * 4);
  ctx.font = '15px Pangolin, "Comic Sans MS", cursive';
  const lines = wrap(s.text, 190);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18, h = lines.length * 17 + 10;
  const hx = c.x + c.w / 2;
  let x = clamp(hx - w / 2, 6, VW - w - 6), y = c.y - h - 16;
  if (y < 6) y = 6;
  ctx.globalAlpha = a;
  ctx.fillStyle = c.id === 'luma' ? '#fbf2dc' : '#e7e0f5';
  roundRect(x, y, w, h, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(clamp(hx - 5, x + 6, x + w - 16), y + h - 0.5); ctx.lineTo(clamp(hx + 5, x + 16, x + w - 6), y + h - 0.5); ctx.lineTo(hx, y + h + 8); ctx.fill();
  ctx.fillStyle = c.id === 'luma' ? '#3a2610' : '#241a3a';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 9, y + 6 + i * 17));
  ctx.globalAlpha = 1;
}

function drawPrompt(W, c, t) {
  if (c.dead || c.say) return;
  const n = nearest(W, c);
  let label = null;
  if (n) {
    if (n.kind === 'switch') label = c.id === 'luma' ? 'свет' : 'погасить';
    else if (n.kind === 'lever') label = n.o.on ? null : 'рычаг';
    else label = c.id === 'nox' ? 'ток' : null;
  }
  if (!label) return;
  const key = c.id === 'luma' ? 'S' : '↓';
  ctx.font = '600 11px "Golos Text", sans-serif';
  const tw = ctx.measureText(label).width;
  const w = tw + 28, x = c.x + c.w / 2 - w / 2, y = c.y - 26 + Math.sin(t * 4) * 1.5;
  ctx.fillStyle = 'rgba(12,14,34,0.8)'; roundRect(x, y, w, 17, 5); ctx.fill();
  ctx.fillStyle = c.id === 'luma' ? COL.luma : '#b9a2f0'; roundRect(x + 3, y + 3, 13, 11, 3); ctx.fill();
  ctx.fillStyle = '#10122a'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(key, x + 9.5, y + 9);
  ctx.textAlign = 'left'; ctx.fillStyle = '#e8e4f4'; ctx.fillText(label, x + 20, y + 9);
}

function fmt(s) {
  s = Math.max(0, Math.ceil(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function render(W, t, dt) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  ctx.drawImage(BG, 0, 0, VW, VH);
  const def = W.def;

  for (const v of def.vents || []) {
    if (Math.random() < dt * 5) parts.push({ x: (v[0] + 0.5) * T + (Math.random() - 0.5) * 10, y: v[1] * T - 2, vx: (Math.random() - 0.5) * 8, vy: -18 - Math.random() * 14, life: 3, max: 3, kind: 'steam', r: 5 + Math.random() * 5 });
  }
  if (def.vents) for (const v of def.vents) { ctx.fillStyle = '#2a2f4d'; ctx.fillRect(v[0] * T + 6, v[1] * T - 3, T - 12, 3); }

  drawTrain(W, t, dt);
  drawWater(W, t);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (W.tiles[y][x] === 'T') drawTurnstile(W, x, y);
  W.doors.forEach(drawDoor);
  W.plates.forEach(drawPlate);
  W.levers.forEach(drawLever);
  W.boxes.forEach(b => drawBox(W, b));
  W.switches.forEach(s => drawSwitch(W, s));
  drawExit(W, t);
  W.lamps.forEach(l => drawLamp(W, l, t));

  const L = W.heroes.luma, N = W.heroes.nox;
  dctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, VW, VH);
  dctx.fillStyle = 'rgba(5,6,20,0.6)'; dctx.fillRect(0, 0, VW, VH);
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const g = dctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = g; dctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (const l of W.lamps) if (lampOn(W, l)) hole(l.x * T, l.y * T, l.r * 1.05, 1);
  const lan = L.lantern || [L.x + L.w / 2 + L.face * 9, L.y + 16];
  if (!L.dead) hole(lan[0], lan[1], 75, 0.55);
  ctx.drawImage(dark, 0, 0, VW, VH);

  drawWorldFX(W, t, dt, 'back');
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(EM, 0, 0, VW, VH);
  for (const l of W.lamps) {
    if (!lampOn(W, l)) continue;
    const x = l.x * T, y = l.y * T, col = l.color || COL.amber;
    const g = ctx.createRadialGradient(x, y, 0, x, y, l.r);
    g.addColorStop(0, hexA(col, 0.3)); g.addColorStop(0.5, hexA(col, 0.1)); g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - l.r, y - l.r, l.r * 2, l.r * 2);
    const gy = groundBelow(W, x, y + 4);
    if (gy < VH && gy - y < l.r) {
      const w = Math.sqrt(l.r * l.r - (gy - y) * (gy - y));
      const rg = ctx.createLinearGradient(0, gy, 0, gy + 16);
      rg.addColorStop(0, hexA(col, 0.22)); rg.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(x - w * 0.6, gy, w * 1.2, 16);
    }
  }
  if (!L.dead) {
    const [lx, ly] = lan;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 55);
    g.addColorStop(0, 'rgba(255,200,110,0.35)'); g.addColorStop(1, 'rgba(255,200,110,0)');
    ctx.fillStyle = g; ctx.fillRect(lx - 55, ly - 55, 110, 110);
  }
  ctx.globalCompositeOperation = 'source-over';
  drawWorldFX(W, t, dt, 'glow');
  drawTrainGlow(W, t, dt);

  const lcx = L.x + L.w / 2, lcy = L.y + L.h / 2, ncx = N.x + N.w / 2, ncy = N.y + N.h / 2;
  for (const s of W.special) {
    const cx = (s.x + 0.5) * T, cy = (s.y + 0.5) * T;
    if (s.ch === 'L') drawLTile(W, s, t, L.dead ? 0 : clamp(1 - Math.hypot(cx - lcx, cy - lcy) / 110, 0, 1));
    else if (s.ch === 'S') drawSTile(W, s, t, N.dead ? 0 : clamp(1 - Math.hypot(cx - ncx, cy - ncy) / 110, 0, 1));
  }

  for (const c of [N, L]) {
    if (c.dead) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    const gy = groundBelow(W, c.x + c.w / 2, c.y + c.h - 2);
    if (gy - (c.y + c.h) < 80) { ctx.beginPath(); ctx.ellipse(c.x + c.w / 2, gy, 9 - (gy - c.y - c.h) / 12, 2.2, 0, 0, 7); ctx.fill(); }
  }
  HERO_A = S.mode === 'clear' && !LEVELS[S.level + 1] && W.train && !W.train.gone ? clamp(1 - S.clearT * 2, 0, 1) : 1;
  if (!N.dead && HERO_A > 0) {
    if (N.shadow > 0 && Math.random() < 0.6) parts.push({ x: N.x + Math.random() * N.w, y: N.y + Math.random() * N.h, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0.7, max: 0.7, kind: 'wisp', r: 3 + Math.random() * 3 });
    drawNox(N, t, dt);
  }
  if (!L.dead && HERO_A > 0) drawLuma(L, t, dt);

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const k = p.life / p.max;
    if (p.kind === 'steam') { ctx.fillStyle = `rgba(190,200,240,${0.08 * k})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 - k), 0, 7); ctx.fill(); }
    else if (p.kind === 'wisp') { ctx.fillStyle = `rgba(120,90,200,${0.45 * k})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k, 0, 7); ctx.fill(); }
    else if (p.kind === 'spark') { p.vy += 300 * dt; ctx.fillStyle = `rgba(210,225,255,${k})`; ctx.fillRect(p.x, p.y, 1.6, 1.6); }
    else if (p.kind === 'drop') { p.vy += 900 * dt; ctx.fillStyle = `rgba(160,190,255,${0.8 * k})`; ctx.fillRect(p.x, p.y, 2, 2); }
  }

  ctx.strokeStyle = 'rgba(175,195,255,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of rain) {
    d.y += d.v * dt; d.x -= d.v * 0.16 * dt;
    if (d.y > VH || d.x < -20) Object.assign(d, newDrop(false));
    if (inUnder(def, d.x, d.y)) continue;
    ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.16, d.y - d.l);
  }
  ctx.stroke();
  if (W.tops && W.tops.length && Math.random() < dt * 28) {
    const [x, y] = W.tops[Math.floor(Math.random() * W.tops.length)];
    ripples.push({ x: x * T + Math.random() * T, y: y * T + 1, t: 0 });
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.t += dt;
    if (r.t > 0.5) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(180,200,255,${0.4 * (1 - r.t / 0.5)})`;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, 1 + r.t * 14, 0.6 + r.t * 3, 0, 0, 7); ctx.stroke();
  }

  drawWorldFX(W, t, dt, 'front');
  if (HERO_A > 0.5) { drawBubble(L); drawBubble(N); }
  drawPrompt(W, L, t); drawPrompt(W, N, t);

  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VH * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,10,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

  drawHUD(W, t);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

function drawHUD(W, t) {
  const late = S.late;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(8,10,28,0.62)'; roundRect(VW / 2 - 78, 10, 156, 50, 12); ctx.fill();
  ctx.textAlign = 'center';
  const low = S.time < 60 && !late;
  ctx.fillStyle = late ? (Math.floor(t * 2) % 2 ? '#ff7a6a' : '#b8575a') : low ? '#ffb08a' : '#f5ecd8';
  ctx.font = '600 26px "Golos Text", sans-serif';
  ctx.fillText(late ? '00:00' : fmt(S.time), VW / 2, 40);
  ctx.font = '500 10px "Golos Text", sans-serif'; ctx.fillStyle = 'rgba(220,215,240,0.6)';
  ctx.fillText(late ? 'поезд ушёл' : 'до последнего поезда', VW / 2, 53);
  ctx.textAlign = 'left';
  ctx.font = '15px "Yeseva One", Georgia, serif'; ctx.fillStyle = 'rgba(245,236,216,0.9)';
  ctx.fillText(`${S.level + 1} · ${W.def.name}`, 18, 30);
  ctx.font = '500 11px "Golos Text", sans-serif'; ctx.fillStyle = 'rgba(210,205,235,0.55)';
  ctx.fillText(W.def.sub, 18, 46);
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(210,205,235,0.45)';
  ctx.fillText(Sound.muted ? 'звук выкл · M' : 'Esc — пауза', VW - 18, 30);
  ctx.textAlign = 'left';

  const hintA = S.showHint ? 1 : clamp(1 - (W.t - 16) / 1.5, 0, 1);
  if (hintA > 0 && W.def.hint) {
    ctx.font = '500 13px "Golos Text", sans-serif';
    const tw = ctx.measureText(W.def.hint).width;
    const w = Math.min(tw + 28, VW - 40);
    ctx.globalAlpha = hintA;
    ctx.fillStyle = 'rgba(8,10,28,0.72)'; roundRect(VW / 2 - w / 2, VH - 42, w, 28, 8); ctx.fill();
    ctx.fillStyle = '#ece6f6'; ctx.textAlign = 'center';
    ctx.fillText(W.def.hint, VW / 2, VH - 23);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }

  if (S.mode === 'clear' && !LEVELS[S.level + 1]) {
    const dark = clamp((S.clearT - 1.5) / 1.8, 0, 1);
    const txt = clamp(S.clearT * 1.5, 0, 1) * (1 - clamp((S.clearT - 1.9) / 0.9, 0, 1));
    ctx.fillStyle = `rgba(5,6,15,${dark})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = txt; ctx.textAlign = 'center';
    ctx.font = '34px "Yeseva One", Georgia, serif'; ctx.fillStyle = '#f5ecd8';
    ctx.fillText(S.late ? 'Добрались до платформы' : 'Успели', VW / 2, VH / 2 - 6);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  } else if (S.mode === 'clear') {
    const a = clamp(S.clearT * 2, 0, 1);
    ctx.fillStyle = `rgba(6,8,22,${0.55 * a})`; ctx.fillRect(0, 0, VW, VH);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    const nx = LEVELS[S.level + 1];
    ctx.font = '34px "Yeseva One", Georgia, serif'; ctx.fillStyle = '#f5ecd8';
    ctx.fillText(nx ? 'Дальше' : 'Успели к платформе', VW / 2, VH / 2 - 6);
    if (nx) { ctx.font = '500 14px "Golos Text", sans-serif'; ctx.fillStyle = 'rgba(230,225,245,0.7)'; ctx.fillText(`${S.level + 2} · ${nx.name}`, VW / 2, VH / 2 + 22); }
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
  }
}

/* =====================================================================
   Состояние игры и экраны
   ===================================================================== */
const $ = id => document.getElementById(id);
const S = { mode: 'title', level: 0, time: RUN_TIME, late: false, W: null, clearT: 0, falls: 0, showHint: false };
const down = new Set(), hit = new Set();
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'ShiftRight', 'Slash']);

const hooks = {
  sfx: n => Sound.sfx(n),
  splash: x => {
    Sound.sfx('splash');
    for (let i = 0; i < 16; i++) parts.push({ x, y: 16.3 * T, vx: (Math.random() - 0.5) * 120, vy: -120 - Math.random() * 160, life: 0.7, max: 0.7, kind: 'drop' });
  },
  clear: () => {
    Sound.sfx('clear'); S.mode = 'clear'; S.clearT = 0;
    if (S.level + 1 >= LEVELS.length) Sound.music(false);
  },
};

function loadLevel(i) {
  S.level = i;
  if (S.W) S.falls += S.W.falls;
  const def = JSON.parse(JSON.stringify(LEVELS[i]));
  S.W = makeWorld(def, hooks);
  if (S.W.train && S.late) S.W.train.gone = true;
  renderBG(S.W);
  S.showHint = false;
}

/* Заставка: авторский трек «Luma and Nox». Браузер разрешает звук только
   после первого клика или клавиши, поэтому до этого музыка ждёт. */
const Theme = (() => {
  const el = $('theme'), btn = $('btn-music'), VOL = 0.8;
  let want = true, fade = null;
  el.volume = 0;
  function fadeTo(v, sec, then) {
    clearInterval(fade);
    const from = el.volume, t0 = performance.now();
    fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / (sec * 1000));
      el.volume = clamp(from + (v - from) * k, 0, 1);
      if (k >= 1) { clearInterval(fade); if (then) then(); }
    }, 30);
  }
  function label() {
    const on = !el.paused && want && !Sound.muted;
    btn.textContent = on ? '♪ Музыка играет' : '♪ Включить музыку';
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  el.addEventListener('play', label);
  el.addEventListener('pause', label);
  function play() {
    if (!want || Sound.muted || (S.mode !== 'title' && S.mode !== 'end')) { label(); return; }
    const p = el.play();
    if (p && p.then) p.then(() => fadeTo(VOL, 1.5)).catch(label); else fadeTo(VOL, 1.5);
  }
  function stop(sec) { fadeTo(0, sec === undefined ? 0.9 : sec, () => { el.pause(); label(); }); }
  btn.addEventListener('click', () => {
    if (!el.paused && want) { want = false; stop(0.5); }
    else { want = true; if (Sound.muted) { Sound.toggle(); updateSoundBtn(); } play(); }
  });
  const unlock = e => {
    if (e.target === btn || e.target === $('btn-start') || e.code === 'Enter') return;
    if ((S.mode === 'title' || S.mode === 'end') && el.paused) play();
  };
  addEventListener('pointerdown', unlock);
  addEventListener('keydown', unlock);
  return { play, stop, el, sync() { if (Sound.muted) stop(0.2); else play(); } };
})();

/* Живая заставка: арт двигается под трек. Темп 75 BPM (первая доля на 0,79 с)
   берётся из позиции самого трека, громкость — из карты, снятой по 0,5 с.
   Координаты ниже — пиксели исходного арта 1122×1402. */
const TitleArt = (() => {
  const cvs = $('title-art'), g = cvs.getContext('2d'), img = $('key-art');
  const IW = 1122, IH = 1402, BEAT = 60 / 75, PHASE = 0.79;
  const ENV = '011644361542363474436161117265437237333727544533657668987784765697796556375378668685757545746354535454323777785586667576678596678558556857556855756685866786865685576687786686577567756213333102200766785875786676769697668686668678667879759845858788765786867897787799877697756233222000006469846768888611001120100086748484778567111111100011989696989998434444332210002310000000000000';
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, last = 0, W = 0, H = 0, dpr = 1;
  const drops = Array.from({ length: 140 }, () => drop(true));
  let sparks = [], wisps = [], rings = [];

  function drop(any) {
    return { x: Math.random() * (IW + 200) - 60, y: any ? Math.random() * IH : -40 - Math.random() * 200,
      v: 1300 + Math.random() * 700, l: 26 + Math.random() * 30, a: 0.1 + Math.random() * 0.2 };
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.max(1, Math.round(W * dpr)); cvs.height = Math.max(1, Math.round(H * dpr));
    if (!raf) frame(performance.now(), true);
  }

  function music() {
    const a = Theme.el;
    if (a.paused) return { pulse: 0, level: 0.3 };
    const t = a.currentTime, n = (t - PHASE) / BEAT;
    const k = (n - Math.floor(n)) * BEAT;
    const level = +(ENV[Math.min(ENV.length - 1, Math.floor(t * 2))] || 4) / 9;
    const accent = ((Math.floor(n) % 4) + 4) % 4 === 0 ? 1 : 0.62;
    const fade = Math.min(1, a.volume / 0.8);
    return { pulse: Math.exp(-k * 5.5) * accent * (0.35 + 0.65 * level) * fade, level: level * fade };
  }

  function rows(t, x, y, w, h, amp, freq, speed, grow) {
    for (let yy = y; yy < y + h; yy += 3) {
      const u = (yy - y) / h, f = grow ? Math.pow(u, 1.4) : Math.sin(Math.PI * u);
      const off = amp * f * Math.sin(t * speed + yy * freq);
      g.drawImage(img, x, yy, w, 3, x + off, yy, w, 3);
    }
  }
  function cols(t, x, y, w, h, amp, freq, speed) {
    for (let xx = x; xx < x + w; xx += 3) {
      const f = Math.sin(Math.PI * (xx - x) / w);
      g.drawImage(img, xx, y, 3, h, xx, y + amp * f * Math.sin(t * speed + xx * freq), 3, h);
    }
  }
  function glow(x, y, r, a, col) {
    if (a <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(0.45, `rgba(${col},${a * 0.35})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function frame(now, once) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    const t = now / 1000;
    if (!W || !img.complete || !img.naturalWidth) { if (!once) raf = requestAnimationFrame(frame); return; }
    const m = still ? { pulse: 0, level: 0.3 } : music(), P = m.pulse, Lv = m.level;

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0e22'; g.fillRect(0, 0, W, H);
    const iw = W * 0.62, k = iw / IW, ih = IH * k;
    const x0 = W - iw, y0 = (H - ih) * 0.22;
    const zoom = still ? 1.03 : 1.035 + Math.sin(t * 0.19) * 0.008;
    const dx = still ? 0 : Math.sin(t * 0.11) * 6;
    g.translate(x0 + iw / 2 + dx, y0 + ih / 2);
    g.scale(k * zoom, k * zoom);
    g.translate(-IW / 2, -IH / 2);

    g.drawImage(img, 0, 0);
    if (!still) {
      rows(t, 800, 150, 322, 490, 6, 0.035, 1.6, false);
      cols(t * 0.8, 800, 150, 322, 490, 5, 0.03, 1.3);
      rows(t, 760, 690, 215, 220, 4, 0.045, 2.1, true);
      rows(t + 1.3, 470, 860, 170, 225, 4, 0.05, 1.9, true);
      rows(t + 0.6, 130, 740, 390, 145, 2.2, 0.06, 2.6, true);
      rows(t + 2.1, 170, 350, 115, 220, 2.2, 0.05, 2.3, false);
      rows(t + 0.9, 240, 325, 220, 60, 1.5, 0.08, 2.5, false);
      rows(t + 1.7, 595, 45, 205, 75, 1.4, 0.07, 2.0, false);
    }

    g.globalCompositeOperation = 'lighter';
    const fl = f => 0.85 + 0.15 * Math.sin(t * f) * Math.sin(t * f * 2.3 + 1);
    glow(122, 662, 95 * (1 + P * 0.18), (0.26 + P * 0.4) * fl(9), '255,190,90');
    glow(88, 222, 80, (0.1 + Lv * 0.1) * fl(3), '255,200,120');
    glow(155, 425, 45, (0.1 + Lv * 0.08) * fl(4.2), '255,200,120');
    glow(18, 528, 40, (0.1 + Lv * 0.08) * fl(5), '255,200,120');
    glow(360, 690, 300, 0.05 + P * 0.16, '255,185,95');
    glow(935, 470, 150, 0.05 + P * 0.2 + Lv * 0.04, '150,105,240');
    glow(997, 727, 70, 0.14 + P * 0.5, '255,190,110');
    glow(985, 855, 70, 0.08 + Lv * 0.1, '255,210,140');
    [[855, 165, 1.3], [885, 200, 2.1], [1015, 80, 0.7], [1020, 122, 1.7], [262, 160, 2.6], [300, 172, 1.1]]
      .forEach(([x, y, f]) => glow(x, y, 16, 0.12 + 0.1 * Math.sin(t * f), '255,200,120'));

    if (!still) {
      if (Math.random() < dt * (7 + P * 45)) {
        const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 45;
        sparks.push({ x: 122 + Math.cos(a) * r, y: 662 + Math.sin(a) * r, vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 50, life: 1.6, max: 1.6, s: 1.2 + Math.random() * 2 });
      }
      sparks = sparks.filter(p => (p.life -= dt) > 0);
      for (const p of sparks) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = Math.min(1, p.life / p.max * 1.5) * (0.6 + 0.4 * Math.sin(t * 12 + p.x));
        g.fillStyle = `rgba(255,214,130,${a})`; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill();
      }
    }
    g.globalCompositeOperation = 'source-over';

    if (!still) {
      if (Math.random() < dt * (1.5 + P * 4)) wisps.push({ x: 940 + Math.random() * 30, y: 470 + Math.random() * 30, vx: 18 + Math.random() * 30, vy: -20 - Math.random() * 25, r: 14 + Math.random() * 14, life: 4, max: 4, ph: Math.random() * 6 });
      wisps = wisps.filter(w => (w.life -= dt) > 0);
      for (const w of wisps) {
        w.x += (w.vx + Math.sin(t * 1.5 + w.ph) * 14) * dt; w.y += w.vy * dt;
        const u = w.life / w.max, r = w.r * (2 - u);
        const gr = g.createRadialGradient(w.x, w.y, 0, w.x, w.y, r);
        gr.addColorStop(0, `rgba(60,35,95,${0.28 * Math.sin(Math.PI * u)})`); gr.addColorStop(1, 'rgba(60,35,95,0)');
        g.fillStyle = gr; g.fillRect(w.x - r, w.y - r, r * 2, r * 2);
      }

      g.strokeStyle = 'rgba(200,210,255,0.22)'; g.lineWidth = 1.6;
      g.beginPath();
      for (const d of drops) {
        d.y += d.v * dt; d.x -= d.v * 0.06 * dt;
        if (d.y > IH + 40) Object.assign(d, drop(false));
        g.moveTo(d.x, d.y); g.lineTo(d.x + d.l * 0.06, d.y - d.l);
      }
      g.stroke();

      if (Math.random() < dt * (18 + P * 30)) rings.push({ x: Math.random() * IW, y: 1120 + Math.random() * 270, t: 0 });
      rings = rings.filter(r => (r.t += dt) < 0.7);
      for (const r of rings) {
        g.strokeStyle = `rgba(210,220,255,${0.45 * (1 - r.t / 0.7)})`; g.lineWidth = 1.4;
        g.beginPath(); g.ellipse(r.x, r.y, 3 + r.t * 34, 1 + r.t * 8, 0, 0, 7); g.stroke();
      }
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const fade = g.createLinearGradient(x0 - 30, 0, x0 + iw * 0.22, 0);
    fade.addColorStop(0, 'rgba(11,14,34,1)'); fade.addColorStop(1, 'rgba(11,14,34,0)');
    g.fillStyle = fade; g.fillRect(0, 0, x0 + iw * 0.22, H);
    if (!once) raf = requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(cvs);
  img.addEventListener('load', () => { if (!raf) frame(performance.now(), true); });
  return {
    start() {
      if (raf) return;
      last = performance.now();
      if (still) { frame(last, true); return; }
      raf = requestAnimationFrame(frame);
    },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
})();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) TitleArt.stop(); else if (S.mode === 'title') TitleArt.start();
});

function show(id) {
  ['title', 'intro', 'pause', 'end'].forEach(s => { $(s).hidden = s !== id; });
  if (id === 'title') { Sound.music(false); Theme.play(); TitleArt.start(); }
  else if (id === 'end') { Sound.music(false); Theme.play(); TitleArt.stop(); }
  else { Theme.stop(); TitleArt.stop(); if (id !== 'pause') Sound.music(true); }
}

function startRun() {
  Sound.init();
  S.time = RUN_TIME; S.late = false; S.falls = 0; S.W = null;
  const m = /^#l([1-9])$/.exec(location.hash);
  loadLevel(m ? clamp(+m[1] - 1, 0, LEVELS.length - 1) : 0);
  S.mode = 'intro'; S.introT = 0;
  show('intro');
}

function inputsFor() {
  const mk = d => ({
    left: d.keys.left.some(k => down.has(k)), right: d.keys.right.some(k => down.has(k)),
    jump: d.keys.jump.some(k => down.has(k)), jumpHit: d.keys.jump.some(k => hit.has(k)),
    actHit: d.keys.act.some(k => hit.has(k)), shadowHit: d.keys.shadow.some(k => hit.has(k)),
  });
  return { luma: mk(HERO.luma), nox: mk(HERO.nox) };
}

function finish() {
  S.falls += S.W.falls;
  S.mode = 'end';
  const late = S.late;
  $('end').classList.toggle('late', late);
  $('end-title').textContent = late ? 'Поезд ушёл' : 'Двери закрылись';
  $('end-text').textContent = late
    ? 'Они постояли на пустой платформе, послушали, как где-то в туннеле затихает гул, и вышли обратно под дождь. До дома сорок минут пешком. Никто не был против.'
    : 'Поезд тронулся. Люма прижалась лбом к стеклу, Нокс сделал вид, что совсем не запыхался. За окном поплыл тёмный туннель, а в нём их отражения — жёлтое и фиолетовое.';
  const left = Math.ceil(S.time);
  $('end-stats').innerHTML = late
    ? `<div><b>00:00</b><span>опоздали</span></div><div><b>${S.falls}</b><span>раз промокли</span></div>`
    : `<div><b>${fmt(left)}</b><span>в запасе</span></div><div><b>${S.falls}</b><span>раз промокли</span></div>`;
  let best = null;
  try { best = JSON.parse(localStorage.getItem('svet-i-ten-best') || 'null'); } catch (e) { best = null; }
  if (!late && (best === null || left > best)) { best = left; try { localStorage.setItem('svet-i-ten-best', JSON.stringify(best)); } catch (e) { /* без хранилища */ } }
  $('end-best').textContent = best !== null ? `Лучший запас времени: ${fmt(best)}` : '';
  const end = $('end');
  end.classList.remove('enter'); void end.offsetWidth; end.classList.add('enter');
  show('end');
  $('btn-again').focus({ preventScroll: true });
}

function onKey(e) {
  if (e.code === 'KeyM') { Sound.toggle(); updateSoundBtn(); Theme.sync(); return; }
  if (S.mode === 'title') {
    if (e.code === 'Enter' && document.activeElement === document.body) startRun();
    return;
  }
  if (S.mode === 'intro') { if (e.code === 'Enter' || e.code === 'Space') { S.introT = 99; } return; }
  if (S.mode === 'play') {
    if (e.code === 'Escape') { S.mode = 'pause'; show('pause'); $('btn-resume').focus(); }
    else if (e.code === 'KeyR') restartLevel();
    else if (e.code === 'KeyH') S.showHint = !S.showHint;
    return;
  }
  if (S.mode === 'pause' && e.code === 'Escape') resume();
}
function resume() { S.mode = 'play'; show(null); cv.focus(); }
function restartLevel() {
  const f = S.W ? S.W.falls : 0;
  S.W = null; S.falls += f;
  const def = JSON.parse(JSON.stringify(LEVELS[S.level]));
  S.W = makeWorld(def, hooks);
  if (S.W.train && S.late) S.W.train.gone = true;
  renderBG(S.W);
  S.mode = 'play'; show(null);
}
function updateSoundBtn() { $('btn-sound').textContent = Sound.muted ? 'Включить звук' : 'Выключить звук'; }

addEventListener('keydown', e => {
  if (S.mode === 'play' && GAME_KEYS.has(e.code)) e.preventDefault();
  if (!e.repeat) hit.add(e.code);
  down.add(e.code);
  onKey(e);
});
addEventListener('keyup', e => down.delete(e.code));
addEventListener('blur', () => { down.clear(); if (S.mode === 'play') { S.mode = 'pause'; show('pause'); } });

$('btn-start').addEventListener('click', startRun);
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', restartLevel);
$('btn-sound').addEventListener('click', () => { Sound.toggle(); updateSoundBtn(); Theme.sync(); });
$('btn-menu').addEventListener('click', () => { S.mode = 'title'; show('title'); });
$('btn-again').addEventListener('click', startRun);
$('btn-title').addEventListener('click', () => { S.mode = 'title'; show('title'); });

/* ---------- цикл ---------- */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const W = S.W;
  if (S.mode === 'intro') {
    S.introT += dt;
    if (S.introT > 3.2) { S.mode = 'play'; show(null); cv.focus(); }
  }
  if (S.mode === 'play' || S.mode === 'clear') {
    acc += dt;
    while (acc >= STEP) {
      const inp = S.mode === 'play' ? inputsFor() : { luma: {}, nox: {} };
      step(W, STEP, inp);
      hit.clear();
      acc -= STEP;
    }
    if (S.mode === 'play') {
      S.time -= dt;
      if (S.time <= 0 && !S.late) {
        S.late = true; S.time = 0;
        sayLine(W, 'nox', 'Кажется, мы опоздали.', true);
        W.lineEnd = W.t + 2.4;
        sayLine(W, 'luma', 'Опоздали вместе. Это считается.');
        if (W.train) W.train.leaving = true;
      }
    } else {
      S.clearT += dt;
      const lastLevel = S.level + 1 >= LEVELS.length;
      if (lastLevel && W.train && !W.train.leaving && S.clearT > 0.9) W.train.leaving = true;
      if (S.clearT > (lastLevel ? OUTRO : 2.2)) {
        if (S.level + 1 < LEVELS.length) { loadLevel(S.level + 1); S.mode = 'play'; }
        else finish();
      }
    }
  } else { acc = 0; hit.clear(); }
  if (W && S.mode !== 'title' && S.mode !== 'end') render(W, now / 1000, S.mode === 'pause' ? 0 : dt);
  else if (S.mode === 'title' || S.mode === 'end') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = COL.ink; ctx.fillRect(0, 0, cv.width, cv.height); }
  requestAnimationFrame(frame);
}

window.SvetGame = { get state() { return S; } };  // для отладки из консоли

new ResizeObserver(resize).observe(cv);
resize();
show('title');
requestAnimationFrame(frame);
})();
