
__MODEL__
const D = __DATA__;
const P = D.P;
const KS = P.scale;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
const svg = document.querySelector(".rr-svg");
const stage = document.querySelector(".rr-stage");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector(`[data-live="${name}"]`);
const el = {
  tank: $("tank"), needle: $("needle"), oil: $("oil-pointer"), cut: $("cut-pointer"), sight: $("sight"), xhead: $("xhead"),
  stemSanc: $("stem-sanc"), stemImp: $("stem-import"), stemCap: $("stem-capital"), sub: $("sump-sub"), ripples: $("sump-ripples"),
  streamImp: $("stream-import"), streamCap: $("stream-capital"),
  recGrid: $("rec-grid"), recTrace: $("rec-trace"), recPen: $("rec-pen"),
};
const spin = Object.fromEntries(Object.keys(D.SPIN).map((id) => [id, { els: [...svg.querySelectorAll(`[data-live="${id}"]`)], frames: D.SPIN[id], shown: -1 }]));
el.sub.innerHTML = D.SUMP_SUB;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v, digits = 1) => v.toFixed(digits).replace(".", ",");
const solid = (p, style) => solidSvg(p, style);

// ── рисование ────────────────────────────────────────────────────────────────
const zOf = (h) => D.LEVEL[0] + (D.LEVEL[1] - D.LEVEL[0]) * h;
function ribbon(points, width) {
  // ленточка постоянной экранной ширины вдоль ломаной (экранные точки)
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    left.push([points[i][0] - ty * width / 2, points[i][1] + tx * width / 2]);
    right.push([points[i][0] + ty * width / 2, points[i][1] - tx * width / 2]);
  }
  return pathOf([...left, ...right.reverse()], true);
}
function drawTank(h, inflow, clock) {
  const [cx, cy] = D.C;
  const ri = D.GLASS_R - 1.4;
  const zw = zOf(h);
  const glass = cylinder(cx, cy, D.GLASS_R, D.BASE_TOP, D.GLASS_TOP - D.BASE_TOP, P, 72);
  const water = cylinder(cx, cy, ri, D.WATER_FLOOR, zw - D.WATER_FLOOR, P, 72);
  const fl = cylinder(cx, cy, D.FLOAT.r, zw - D.FLOAT.h / 2, D.FLOAT.h, P, 48, 0.6);
  const rod = cylinder(cx, cy, 1.3, zw + D.FLOAT.h / 2, D.GLASS_TOP - zw - D.FLOAT.h / 2, P, 16);
  const nozzle = cylinder(D.INLET[0], D.RISER_Y, 4.6, D.GLASS_TOP - 9, 9, P, 24);
  let out = `<path class="rr-glass" d="${glass.fill}"/>`;
  out += `<path class="iso-line" data-tone="faint" d="${ring(cx, cy, ri, D.WATER_FLOOR, P, 72)}"/>`;
  out += solid(nozzle, { tone: "mid" }) + `<path class="rr-void" d="${ring(D.INLET[0], D.RISER_Y, 3.2, D.GLASS_TOP - 9, P, 20)}"/>`;
  // струя из сопла: толщина по притоку
  const w = clamp(0.6 + inflow * 3.6, 0.6, 7) * KS;
  const top = iso([D.INLET[0], D.RISER_Y, D.GLASS_TOP - 9], P);
  const hit = iso([D.INLET[0], D.RISER_Y, zw], P);
  if (inflow > 0.01) out += `<path class="rr-stream" d="${ribbon([top, hit], w)}"/>`;
  out += `<path class="rr-water" d="${water.fill}"/>`;
  out += `<path class="rr-water-top" d="${water.top}"/>`;
  if (inflow > 0.01) {
    const spread = 4 + ((clock * 9) % 9);
    out += `<path class="iso-line rr-ring" style="opacity:${fmt(0.8 - spread / 14, 2).replace(",", ".")}" d="${ring(D.INLET[0], D.RISER_Y, spread, zw, P, 28)}"/>`;
  }
  out += solid(rod, { tone: "hi", lit: true, crease: "none" });
  out += solid(fl, { tone: "hi", lit: true });
  out += `<path class="iso-line" data-tone="lo" d="${sideArc(cx, cy, ri, zw, P, 48)}"/>`;
  out += `<path class="iso-line rr-glint" d="${segmentOnGlass(cx, cy, D.GLASS_R - 0.4, 0.62)}"/><path class="iso-line rr-glint" d="${segmentOnGlass(cx, cy, D.GLASS_R - 0.4, 0.74)}"/>`;
  out += `<path class="iso-line" data-tone="faint" d="${glass.outline}"/>`;
  out += `<path class="iso-line" data-tone="faint" d="${sideArc(cx, cy, D.GLASS_R, D.BASE_TOP + 0.2, P, 48)}"/>`;
  el.tank.innerHTML = out;
}
function segmentOnGlass(cx, cy, r, share) {
  // блик: вертикаль на стекле под углом к зрителю
  const [vx, vy] = towardViewer(P);
  const a = Math.atan2(vy, vx) + (share - 0.5) * Math.PI;
  return segment([cx + r * Math.cos(a), cy + r * Math.sin(a), D.BASE_TOP + 3], [cx + r * Math.cos(a), cy + r * Math.sin(a), D.GLASS_TOP - 3], P);
}
function pointer(centre, z, r0, r1, share) {
  const angle = (-135 + 270 * share) * DEG;
  const [x, y] = centre;
  return lineOnTop([x - Math.sin(angle) * r0, y + Math.cos(angle) * r0], [x + Math.sin(angle) * r1, y - Math.cos(angle) * r1], z, P);
}
function stemSvg(x, y, z0, z1, lit) {
  if (z1 - z0 < 0.2) return "";
  return solid(cylinder(x, y, 1.2, z0, z1 - z0, P, 12), { tone: "hi", lit, crease: "none" }) + `<path class="iso-line" data-tone="lo" d="${ring(x, y, 0.6, z1, P, 8)}"/>`;
}
function drainStream(drain, flow) {
  // струя из открытого конца слива: баллистика до воды бассейна
  const r = clamp(0.5 + flow * 3.4, 0.5, drain.r - 0.9);
  const v = 6 + flow * 26;
  const points = [];
  for (let i = 0; i <= 14; i++) {
    const t = (i / 14) * Math.sqrt((D.DRAIN_Z - D.SUMP_WATER) / 9.8 * 2) ;
    const z = D.DRAIN_Z - 0.5 * 9.8 * t * t - (drain.r - r) * 0.6;
    points.push(iso([drain.x, D.DRAIN_END + v * t * 0.35, z], P));
  }
  return { d: flow > 0.01 ? `<path class="rr-stream" d="${ribbon(points, r * 2 * KS)}"/>` : "", land: [drain.x, D.DRAIN_END + v * Math.sqrt((D.DRAIN_Z - D.SUMP_WATER) / 9.8 * 2) * 0.35] };
}
function drawSight(n) {
  const [x, y] = D.SIGHT_AT;
  const z0 = D.SIGHT.z0 - 3;
  const z1 = D.SIGHT.z1 + 3;
  const level = D.SIGHT.z0 + (D.SIGHT.z1 - D.SIGHT.z0) * n;
  const tube = cylinder(x, y, 2.6, z0, z1 - z0, P, 20);
  const col = cylinder(x, y, 2, z0, level - z0, P, 20);
  el.sight.innerHTML = `<path class="rr-glass" d="${tube.fill}"/><path class="rr-water rr-deep" d="${col.fill}"/><path class="rr-water-top" d="${col.top}"/><path class="iso-line" data-tone="lit" style="stroke-width:1" d="${sideArc(x, y, 2.2, level, P, 10)}"/><path class="iso-line" data-tone="faint" d="${tube.outline}"/>`;
}
// самописец: история курса на движущейся ленте
const REC = D.REC;
const PAPER_SPEED = 4.2; // единиц ленты в секунду
const history = [];
let paperShift = 0;
const recY = (rub) => REC.paper.y + 3 + (REC.paper.d - 6) * clamp((rub - 45) / 95, 0, 1);
function drawRecorder(rub) {
  const z = REC.z + 0.02;
  let grid = "";
  for (const level of [60, 80, 100, 120]) grid += lineOnTop([REC.paper.x, recY(level)], [REC.paper.x + REC.paper.w, recY(level)], z, P);
  for (let x = REC.penX - (paperShift % 12); x > REC.paper.x; x -= 12) grid += lineOnTop([x, REC.paper.y], [x, REC.paper.y + REC.paper.d], z, P);
  el.recGrid.innerHTML = `<path class="rr-grid" d="${grid}"/>`;
  const now = phase.clock;
  const points = history.map(([t, value]) => iso([REC.penX - (now - t) * PAPER_SPEED, recY(value), z], P));
  points.push(iso([REC.penX, recY(rub), z], P));
  el.recTrace.setAttribute("d", points.length > 1 ? pathOf(points) : "");
  const y = recY(rub);
  const carriage = slabOf({ x: REC.penX + 2, y: y - 3, w: 8, d: 6, r: 1 }, REC.z + 8.6, 6.4, P, 2, 0.4);
  const arm = slabOf({ x: REC.penX - 0.7, y: y - 0.7, w: 3.4, d: 1.4, r: 0.5 }, REC.z + 0.4, 9, P, 2);
  el.recPen.innerHTML = solidSvg(arm, { tone: "hi", lit: true, crease: "none" }) + solidSvg(carriage, { tone: "hi" }) + `<path class="iso-line" data-tone="mid" d="${lineOnTop([REC.penX + 6, y - 3], [REC.penX + 6, y + 3], REC.z + 15, P)}"/>`;
}
function setSpin(id, phase) {
  const s = spin[id];
  if (!s || !s.els.length) return;
  const n = s.frames.length;
  const index = ((Math.floor(phase * n) % n) + n) % n;
  if (index !== s.shown) {
    for (const node of s.els) node.setAttribute("d", s.frames[index]);
    s.shown = index;
  }
}

// ── состояние, тур, панель ───────────────────────────────────────────────────
const SCENES = [
  { key: "base", name: "База", say: "нефть ~62 $, ставка 16%: приток и отток в равновесии", input: { oil: 62, rate: 16, sanc: 40 } },
  { key: "boom", name: "Нефтяной бум", say: "нефть 100 $: насос экспорта гонит валюту, но Минфин уводит излишек в ФНБ", input: { oil: 100, rate: 16, sanc: 40 } },
  { key: "crash", name: "Обвал нефти", say: "нефть 35 $: Минфин продаёт валюту из ФНБ, пока бак не опустеет", input: { oil: 35, rate: 16, sanc: 40 } },
  { key: "hawk", name: "Жёсткая ставка", say: "ставка 21%: траверса прижимает задвижки импорта и вывода капитала", input: { oil: 62, rate: 21, sanc: 40 } },
  { key: "dove", name: "Смягчение", say: "ставка 9%: сливы открываются шире, уровень и рубль снижаются", input: { oil: 62, rate: 9, sanc: 40 } },
  { key: "sanc", name: "Санкции", say: "санкционная задвижка почти закрыта: приток валюты пересыхает", input: { oil: 62, rate: 16, sanc: 90 } },
];
const TOUR = ["base", "boom", "base", "crash", "base", "hawk", "dove", "sanc"];
const input = { ...START };
const want = { ...START };
const state = { h: LEVEL0, n: FUND0 };
const phase = { cpl: 0, m: { "m-exp": 0, "m-imp": 0, "m-cap": 0, "m-min": 0 }, fan: 0, clock: 0 };
let touring = !still.matches;
let tourAt = 0;
let tourIndex = 0;
let idle = 0;
let scene = SCENES[0];
let flows = flowsOf(input, state.h, state.n);

const ui = {
  oil: document.querySelector('[data-in="oil"]'),
  rate: document.querySelector('[data-in="rate"]'),
  sanc: document.querySelector('[data-in="sanc"]'),
  out: Object.fromEntries([...document.querySelectorAll("[data-out]")].map((node) => [node.dataset.out, node])),
  scenes: [...document.querySelectorAll("[data-scene]")],
  tour: document.querySelector("[data-tour]"),
  say: document.querySelector("[data-say]"),
};
function syncUi() {
  for (const key of ["oil", "rate", "sanc"]) if (ui[key] && document.activeElement !== ui[key]) ui[key].value = String(Math.round(want[key]));
  ui.out.oil.textContent = `${Math.round(input.oil)} $`;
  ui.out.rate.textContent = `${fmt(input.rate)}%`;
  ui.out.sanc.textContent = `${Math.round(input.sanc)}%`;
  ui.scenes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scene === scene?.key)));
  ui.tour.setAttribute("aria-pressed", String(touring));
  ui.tour.textContent = touring ? "Тур идёт" : "Запустить тур";
}
function chooseScene(key, fromTour = false) {
  scene = SCENES.find((s) => s.key === key);
  Object.assign(want, scene.input);
  ui.say.textContent = scene.say;
  if (!fromTour) stopTour();
  syncUi();
  run();
}
function stopTour() {
  touring = false;
  idle = 0;
}
for (const key of ["oil", "rate", "sanc"]) {
  ui[key]?.addEventListener("input", () => {
    want[key] = Number(ui[key].value);
    scene = null;
    ui.say.textContent = "ручной режим";
    stopTour();
    syncUi();
    run();
  });
}
ui.scenes.forEach((b) => b.addEventListener("click", () => chooseScene(b.dataset.scene)));
ui.tour.addEventListener("click", () => {
  touring = !touring;
  if (touring) { tourAt = 0; tourIndex = 0; chooseScene(TOUR[0], true); }
  syncUi();
  run();
});

let lastText = "";
function draw(dt) {
  const inflow = flows.exp;
  drawTank(state.h, inflow, phase.clock);
  const rub = rubOf(state.h);
  const share = (140 - rub) / 95;
  el.needle.setAttribute("d", pointer(D.C, D.GAUGE_TOP + 0.2, 3.4, D.GAUGE.r - 4, 1 - share));
  const oilShare = (input.oil - RANGE.oil[0]) / (RANGE.oil[1] - RANGE.oil[0]);
  el.oil.setAttribute("d", pointer(D.OIL_KNOB, D.OIL_TOP + 4, 0, 6, oilShare));
  el.cut.setAttribute("d", pointer(D.CUT_DIAL, D.CUT_TOP + 0.6, 1.6, 7.4, oilShare));
  // санкционная задвижка: шток поднят пропорционально пропуску
  const pass = throttleOf(input.sanc);
  el.stemSanc.innerHTML = stemSvg(D.SV.x, D.SV.y, D.SV.z, D.SV.z + 2 + (D.SV.max - 2) * clamp((pass - 0.55) / 0.45, 0, 1), false);
  // траверса ставки
  const open = openingOf(input.rate);
  const zx = D.XHEAD_Z[0] + (D.XHEAD_Z[1] - D.XHEAD_Z[0]) * clamp((open - 0.7) / 0.3, 0, 1);
  el.xhead.setAttribute("transform", translateAlong(P, [0, 0, zx]));
  for (const stem of D.STEMS) {
    const target = stem.live === "stem-import" ? el.stemImp : el.stemCap;
    target.innerHTML = stemSvg(stem.x, stem.y, stem.z, zx, false);
  }
  setSpin("hw-sanc", (input.sanc / 100) * 2.5);
  setSpin("hw-rate", (input.rate / 5) * 1.2);
  setSpin("cpl", phase.cpl);
  setSpin("fan", phase.fan);
  for (const id of Object.keys(phase.m)) setSpin(id, phase.m[id]);
  drawSight(state.n);
  drawRecorder(rub);
  setSpin("roller", paperShift / (TAU * 3.4) * 1);
  // струи и круги на воде бассейна
  const a = drainStream(D.DRAINS[0], flows.imp);
  const b = drainStream(D.DRAINS[1], flows.cap);
  el.streamImp.innerHTML = a.d;
  el.streamCap.innerHTML = b.d;
  let rings = "";
  for (const [land, f] of [[a.land, flows.imp], [b.land, flows.cap]]) {
    if (f < 0.01) continue;
    for (let i = 0; i < 2; i++) {
      const s = ((phase.clock * 0.9 + i * 0.5) % 1);
      rings += `<path class="iso-line rr-ring" style="opacity:${(0.75 * (1 - s)).toFixed(2)}" d="${ring(land[0], land[1], 2 + s * 9, D.SUMP_WATER, P, 28)}"/>`;
    }
  }
  const [sx, sy, sr] = D.RIPPLES[0];
  rings += `<path class="iso-line" data-tone="lo" d="${ring(sx, sy, sr, D.SUMP_WATER, P, 24)}"/>`;
  el.ripples.innerHTML = rings;
  // табло
  const text = `1 $ = ${fmt(rub)} ₽ · ФНБ ${Math.round(state.n * 100)}%`;
  if (text !== lastText) { readout.textContent = text; lastText = text; }
  ui.out.exp.textContent = fmt(flows.exp, 2);
  ui.out.minfin.textContent = (flows.minfin >= 0 ? "в ФНБ " : "из ФНБ ") + fmt(Math.abs(flows.minfin), 2);
  ui.out.imp.textContent = fmt(flows.imp, 2);
  ui.out.cap.textContent = fmt(flows.cap, 2);
  ui.out.rub.textContent = `${fmt(rub)} ₽`;
  syncUi();
}

let frame = 0;
let last = 0;
let visible = false;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) {
    tourAt += dt;
    if (tourAt > 9) {
      tourAt = 0;
      tourIndex = (tourIndex + 1) % TOUR.length;
      chooseScene(TOUR[tourIndex], true);
    }
  }
  for (const key of ["oil", "rate", "sanc"]) input[key] = calm ? want[key] : input[key] + (want[key] - input[key]) * (1 - Math.exp(-dt / 0.6));
  // модель шагает чаще кадра для устойчивости
  const sub = 4;
  for (let i = 0; i < sub; i++) flows = step(state, input, calm ? (dt * 6) / sub : dt / sub);
  phase.clock += dt;
  if (!calm) {
    phase.cpl += dt * flows.exp * 1.6;
    phase.m["m-exp"] += dt * flows.exp * 1.4;
    phase.m["m-imp"] += dt * flows.imp * 1.6;
    phase.m["m-cap"] += dt * flows.cap * 2.2;
    phase.m["m-min"] += dt * flows.minfin * 3;
    phase.fan += dt * flows.minfin * 4;
  }
  paperShift += dt * PAPER_SPEED;
  const sample = history[history.length - 1];
  if (!sample || phase.clock - sample[0] > 0.12) history.push([phase.clock, rubOf(state.h)]);
  while (history.length && (phase.clock - history[0][0]) * PAPER_SPEED > REC.penX - REC.paper.x + 4) history.shift();
  draw(dt);
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); }
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); else { cancelAnimationFrame(frame); frame = 0; } }, { rootMargin: "120px 0px" }).observe(stage);
chooseScene("base", true);
draw(0);
