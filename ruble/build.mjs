// «Резервуар рубля» — изометрическая фигура по методу Anatomy (kit/ — копия кита, лицензия MIT).
// node ruble/build.mjs [--dark] [--audit]  →  ruble/index.html (или index-dark.html)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";
import * as A from "./kit/audit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--dark") ? "dark" : "light";
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const W = 900;
const H = 720;
const AZIMUTH = 40;
const ELEVATION = 30;

// ── мир: x — вправо-вниз, y — влево-вниз, z — вверх; 1 единица ≈ 1 px ──────────
const PLATE = { x: -215, y: -128, w: 440, d: 244, r: 10 };
const PLATE_H = 14;
const FOOT_H = 6;

const SUMP = { x: -204, y: 62, w: 262, d: 46, r: 4 };
const SUMP_H = 14;
const SUMP_FLOOR = 2;
const SUMP_WATER = 9.5;

const C = [-10, -48]; // ось главного резервуара
const PLINTH = { x: C[0] - 62, y: C[1] - 62, w: 124, d: 124, r: 6 };
const PLINTH_H = 8;
const BASE = { x: C[0] - 56, y: C[1] - 56, w: 112, d: 112, r: 5 };
const BASE_TOP = 30;
const GLASS_R = 44;
const GLASS_TOP = 206;
const LID_TOP = 216;
const RODS = k.corners(BASE, 10);
const WATER_FLOOR = BASE_TOP + 2;
const LEVEL = [44, 194]; // z уровня при h = 0 и h = 1
const FLOAT = { r: 14, h: 8 };
const GAUGE = { r: 24, neck: 10, z: LID_TOP + 4, h: 12 };
const GAUGE_TOP = GAUGE.z + GAUGE.h;
const INLET = [-38, -31]; // ввод экспортной трубы в крышку

const PX = -165; // ось насоса «Экспорт» (вдоль y)
const PZ = 26;
const RISER_Y = -31;
const TOP_Z = 252;

const DRAIN_Z = 19;
const IMP_X = -36;
const CAP_X = 16;
const DRAIN_END = 80;
const VALVE_Y = 34;
const METER_Y = 17;
const BALL_Y = 53;
const BRIDGE_Z = 88;

const FY = -24; // линия Минфина (вдоль x)
const PUMP2 = { x: 80, y: FY - 14, w: 28, d: 28, r: 3 };
const FUND = { c: [172, FY], r: 32, z0: 8, z1: 116 };
const SIGHT = { d: [Math.cos(AZIMUTH * DEG), Math.sin(AZIMUTH * DEG)], out: 41, z0: 24, z1: 102 };
const SIGHT_AT = [FUND.c[0] + SIGHT.d[0] * SIGHT.out, FUND.c[1] + SIGHT.d[1] * SIGHT.out];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [-120, RISER_Y, 300], [PX, RISER_Y, TOP_Z + 8], [C[0], C[1], GAUGE_TOP]],
  W,
  H,
  { pad: 30, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);
const Faded = (list, style) => k.fadedSvg(list, style);
const UP = (o) => G.frameOf(o, [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const ALONG_X = (o) => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
const ALONG_Y = (o) => G.frameOf(o, [0, 1, 0], [0, 0, 1], [1, 0, 0]);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const FADE = [0.04, 0.42];

// ── сортируемые элементы; формы записываются, порядок отрисовки считает settle ──
const R = A.recorder(P);
const { items, nameFor } = R;
const record = R.solid;
function put(ref, svg, { bias = 0, shapes = [], name, route, chunk } = {}) {
  R.put({ piece: "rig", at: ref, bias, svg, move: [0, 0, 0], shapes, name: name ?? nameFor("item"), route, chunk });
}
function tubeItems(route, r, { name, tone = "hi", bias = 0, maxLength = 24, spacing, gaps = [], breaks = [], caps = true, owner, rims, free = [false, false], limp = false, keep = () => true } = {}) {
  const id = nameFor(name ?? "tube");
  R.route(id, route, r, { owner: owner ?? id, gaps, rims, free, piece: "rig", move: [0, 0, 0], limp });
  const rest = [];
  tubePieces(route, r, P, { maxLength, spacing: spacing ?? Math.max(0.8, Math.min(2.4, r * 0.2)), gaps, breaks, caps }).forEach((part, index) => {
    if (!keep(part)) return rest.push(tubeSvg(part, { tone }));
    put(part.mid, tubeSvg(part, { tone }), { bias, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)] });
  });
  return { id, rest };
}
function boxAt(plan, z, h, style = {}, { extra = "", bias = 0, bevel = 0.5, steps = 3, name, inner } = {}) {
  const id = nameFor(name ?? "box");
  put([plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, {
    bias,
    name: id,
    shapes: [record(A.box([plan.x, plan.y, z], [plan.x + plan.w, plan.y + plan.d, z + h], { name: id }))],
  });
  return id;
}
function postAt(x, y, r, z, h, style = {}, { extra = "", bias = 0, name, steps = 20, bevel = 0, inner } = {}) {
  const id = nameFor(name ?? "post");
  put([x, y, z + h / 2], S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, { bias, name: id, shapes: [record(A.cylinder(x, y, r, z, h, { name: id }))] });
  return id;
}
function discAt(F, s0, s1, r, style = {}, { extra = "", bias = 0, name, owner, bevel = 0, inner } = {}) {
  const id = nameFor(name ?? "disc");
  put(G.add3(F.o, G.mul3(F.a, (s0 + s1) / 2)), S(G.disc(s0, s1, r, F, P, { bevel }), { tone: "mid", ...style, inner }) + extra, {
    bias,
    name: id,
    shapes: [record(A.disc(F, s0, s1, r, { name: id, owner }))],
  });
  return id;
}
function turned(F, profile, style = {}, { extra = "", inner = "", bias = 0, name, owner, bevel = 0, steps } = {}) {
  const smooth = profile.some((point) => point[2]);
  const paths = G.solidOf(profile, F, P, { bevel, smooth: smooth ? { rows: 4 } : false, ...(steps ? { steps } : {}) });
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  const id = nameFor(name ?? "turned");
  put(G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: "mid", ...style, inner }) + extra, { bias, name: id, shapes: [record(A.solid(F, profile, { name: id, owner, curve: smooth ? profile : undefined }))] });
  return id;
}
function flangeAt(centre, axis, r, thick, { bolts = 6, tone = "mid", name, owner } = {}) {
  const F = G.frameAlong(centre, axis);
  const towards = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
  const face = Math.abs(G.dot3(F.a, V)) > 0.12 && bolts ? Dots(G.dotsOf(F, towards, r * 0.72, bolts, P, { all: true }), { size: 0.42, tone: "mid" }) : "";
  discAt(F, -thick / 2, thick / 2, r, { tone }, { extra: face, name: name ?? "flange", owner });
}
function pipe(control, r, { bend = 2.8, tone = "hi", flanges = [true, true], flangeR = 1.6, bands = [], gaps: extra = [], name, maxLength = 22, free, breaks = [], keep, lip = false, bias = 0 } = {}) {
  const line = G.fillet(control, Math.max(r * bend, 3), 12, { P, tube: r });
  const total = G.pathLength(line);
  const collars = [];
  [[0, -1], [total, 1]].forEach(([along, sign], index) => {
    if (!flanges[index]) return;
    const thick = Math.max(1.4, r * 0.5);
    const tangent = G.tangentAlong(line, along);
    collars.push({ kind: "flange", centre: G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2)), tangent, radius: r * flangeR, thick, gap: sign < 0 ? [0, thick] : [total - thick, total] });
  });
  for (const share of bands) {
    const along = share > 1 ? share : total * share;
    const thick = Math.max(1, r * 0.6);
    collars.push({ kind: "band", centre: G.pointAlong(line, along), tangent: G.tangentAlong(line, along), radius: r * 1.2, thick, gap: [along - thick / 2, along + thick / 2] });
  }
  const gaps = [...collars.map(({ gap }) => gap), ...extra, ...(lip ? [[total - 2.2, total]] : [])];
  const made = tubeItems(line, r, { name: name ?? "pipe", tone, maxLength, gaps, breaks, free, keep, bias, rims: flanges.map((on) => (on ? r * flangeR : r)) });
  for (const { kind, centre, tangent, radius, thick } of collars) flangeAt(centre, tangent, radius, thick, { bolts: kind === "flange" ? 6 : 0, tone: kind === "flange" ? "mid" : "lo", name: `${made.id}.${kind}`, owner: made.id });
  if (lip) {
    const end = line[line.length - 1];
    const tangent = G.tangentAlong(line, total);
    const F = G.frameAlong(end, tangent);
    const id = nameFor(`${made.id}.lip`);
    put(end, S(G.ringBand(-2.2, 0, r - 0.8, r + 0.9, F, P), { tone: "mid" }) + `<path class="rr-void" d="${G.circleOf(F, 0, r - 0.8, P, 32)}"/>`, { name: id, bias: 0.05, shapes: [record(A.ring(F, -2.2, 0, r - 0.8, r + 0.9, { name: id, owner: made.id }))] });
  }
  return { line, total, id: made.id, rest: made.rest };
}

// анимации: заранее посчитанные кадры вращения и живые точки
const SPIN = {};
function spinner(id, count, frameOf, tone = "lo") {
  const frames = Array.from({ length: count }, (_, index) => frameOf(index / count));
  SPIN[id] = frames;
  return `<path data-live="${id}" class="iso-line" data-tone="${tone}" d="${frames[0]}"/>`;
}

// задвижка с выдвижным штоком на горизонтальной трубе
function gateValve(pipeMade, along, r, { name, bonnetTop }) {
  const centre = G.pointAlong(pipeMade.line, along);
  const tangent = G.tangentAlong(pipeMade.line, along);
  const F = G.frameAlong(centre, tangent);
  const crown = r * 2.05;
  const half = r * 1.75;
  const bulge = (x) => r * 1.45 + (crown - r * 1.45) * Math.sqrt(Math.max(0, 1 - (x / half) ** 2));
  const slope = (x) => {
    if (Math.abs(x) >= half - 1e-9) return 0;
    const t = Math.max(-0.995, Math.min(0.995, x / half));
    return (-(crown - r * 1.45) * t) / (half * Math.sqrt(1 - t * t));
  };
  const meridian = [[-r * 2.4, 0], [-r * 2.4, r * 1.5], ...Array.from({ length: 17 }, (_, index) => { const x = half * Math.sin(((index - 8) / 8) * (Math.PI / 2)); return [x, bulge(x), index && index < 16 ? 1 : 0]; }), [r * 2.4, r * 1.5], [r * 2.4, 0]];
  const id = nameFor(name);
  put(
    centre,
    S(G.lathe(meridian, F, P, { steps: 40, smooth: { slope, rows: 3 } }), { tone: "hi" }) +
      Dots([...G.dotsOf(F, -r * 2.4, r * 1.22, 8, P, { all: true }), ...G.dotsOf(F, r * 2.4, r * 1.22, 8, P, { all: true })].filter((_, index) => index % 2 === 0), { size: 0.4, tone: "mid" }),
    { name: id, shapes: [record(A.body(F, meridian, { name: id, owner: pipeMade.id }))] },
  );
  const [x, y, z] = centre;
  const neck = z + crown - 0.6;
  postAt(x, y, r * 0.95, neck, bonnetTop - 2 - neck, { tone: "hi" }, { name: `${id}.bonnet`, steps: 28, inner: Ln(k.sideArc(x, y, r * 0.95, neck + (bonnetTop - 2 - neck) * 0.55, P, 20), { tone: "faint" }) });
  const plan = { x: x - r * 1.4, y: y - r * 1.4, w: r * 2.8, d: r * 2.8, r: 1 };
  boxAt(plan, bonnetTop - 2, 2, { tone: "mid" }, { name: `${id}.cap`, extra: Dots(k.corners(plan, 1.1).map(([px, py]) => at([px, py, bonnetTop])), { size: 0.4 }) });
  postAt(x, y, 1.9, bonnetTop, 1.6, { tone: "mid" }, { name: `${id}.gland` });
  return { centre, gap: [along - r * 2.4, along + r * 2.4], top: bonnetTop + 1.6 };
}

// смотровой расходомер: корпус-коробка с круглым окном и крыльчаткой
function meterAt(centre, axis, face, live, { r = 6, name } = {}) {
  const half = r + 1.6;
  const [x, y, z] = centre;
  const ext = (a) => (Math.abs(axis[a]) > 0.5 ? 4.2 : half);
  const plan = { x: x - ext(0), y: y - ext(1), w: ext(0) * 2, d: ext(1) * 2, r: 1.2 };
  const zh = Math.abs(axis[2]) > 0.5 ? 4.2 : half;
  const faceCentre = G.add3(centre, G.mul3(face, Math.abs(face[0]) > 0.5 ? ext(0) : ext(1)));
  const F = G.frameAlong(faceCentre, face);
  const bolts = G.dotsOf(F, 0, r + 0.9, 6, P, { all: true, phase: Math.PI / 6 });
  const rotor = spinner(live, 12, (t) => G.spokesOf(F, -0.6, 1.2, r - 1.1, 3, P, { phase: (t * TAU) / 3 }) + G.circleOf(F, -0.6, 1.1, P, 12), "mid");
  const id = nameFor(name);
  put(
    centre,
    S(k.slabOf(plan, z - zh, zh * 2, P, 3, 0.5), { tone: "mid" }) +
      `<path class="rr-window" d="${G.circleOf(F, 0, r, P, 40)}"/>` +
      rotor +
      Ln(G.circleOf(F, 0, r, P, 40), { tone: "mid" }) +
      Ln(G.circleOf(F, 0, r + 0.9 + 0.9, P, 40), { tone: "faint" }) +
      Dots(bolts, { size: 0.42 }),
    { name: id, bias: 0.1, shapes: [record(A.box([plan.x, plan.y, z - zh], [plan.x + plan.w, plan.y + plan.d, z + zh], { name: id }))] },
  );
  return Math.abs(axis[2]) > 0.5 ? 4.2 : axis[0] ? ext(0) : ext(1);
}

// шаровой кран с рычагом: рычаг рисуется вживую
function ballValve(pipeMade, along, r, live, { name }) {
  const centre = G.pointAlong(pipeMade.line, along);
  const tangent = G.tangentAlong(pipeMade.line, along);
  const F = G.frameAlong(centre, tangent);
  const R = r * 1.35;
  const id = nameFor(name);
  put(centre, S(G.sphereOf(centre, R, P), { tone: "hi" }), { name: id, shapes: [record(A.ball(centre, R, { name: id, owner: pipeMade.id }))] });
  for (const sign of [-1, 1]) {
    const s0 = sign * Math.sqrt(R * R - (r * 1.3) ** 2) - (sign < 0 ? 0 : 0);
    const a = sign < 0 ? -R * 1.25 : s0;
    const b = sign < 0 ? s0 : R * 1.25;
    discAt(F, a, b, r * 1.3, { tone: "mid" }, { name: `${id}.end`, owner: pipeMade.id, extra: "" });
  }
  const [x, y, z] = centre;
  postAt(x, y, 1.6, z + R - 0.6, 4.2, { tone: "mid" }, { name: `${id}.stem`, steps: 12 });
  put([x, y, z + R + 4], `<g data-live="${live}"></g>`, { name: `${id}.lever`, bias: 0.3 });
  return { gap: [along - R * 1.25, along + R * 1.25], pivot: [x, y, z + R + 3.6] };
}

// маховик: обод-трубка, ступица, спицы (спицы вращаются)
function handwheel(x, y, z, r, live, { name, spokes = 5 } = {}) {
  const F = UP([x, y, z]);
  postAt(x, y, 2.4, z - 3, 3, { tone: "mid" }, { name: `${name}.hub-neck`, steps: 16 });
  const rimR = 1.25;
  const pieces = tubePieces(G.arcPoints(F, 0, r, 0, TAU, 64), rimR, P, { closed: true, maxLength: 14, spacing: 0.8 });
  const centreDepth = G.dot3([x, y, z], V);
  const backRim = pieces.filter((part) => G.dot3(part.mid, V) < centreDepth).map((part) => tubeSvg(part, { tone: "hi" })).join("");
  const frontRim = pieces.filter((part) => G.dot3(part.mid, V) >= centreDepth).map((part) => tubeSvg(part, { tone: "hi" })).join("");
  const frames = Array.from({ length: 36 }, (_, index) => G.spokesOf(F, 0, 2.2, r - 0.6, spokes, P, { phase: ((index / 36) * TAU) / spokes }));
  SPIN[live] = frames;
  const id = nameFor(`${name}.rim`);
  put(
    [x, y, z],
    backRim +
      `<path data-live="${live}" class="rr-spoke" d="${frames[0]}"/><path data-live="${live}" class="rr-spoke-hi" d="${frames[0]}"/>` +
      S(k.cylinder(x, y, 3.2, z - 1.2, 2.4, P, 18, 0.3), { tone: "hi" }) +
      Ln(k.ring(x, y, 1.2, z + 1.2, P, 12), { tone: "mid" }) +
      frontRim,
    { name: id, bias: 0.2, shapes: [record(A.ring(F, -rimR, rimR, r - rimR, r + rimR, { name: id }))] },
  );
}

// ── задник: стол, ножки, линейка, шильдик ────────────────────────────────────
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of byDepth([...k.corners(PLATE, 26), [0, PLATE.y + 26], [0, PLATE.y + PLATE.d - 26]])) {
  back.push(S(k.cylinder(x, y, 9, -PLATE_H - FOOT_H, 1.8, P, 28), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H + 1.8, FOOT_H - 1.8, P, 28), { tone: "mid" }));
}
back.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: Ln(k.sideSeam(PLATE, -PLATE_H + 4, P, 8), { tone: "faint" }) }));
record(A.box([PLATE.x, PLATE.y, -PLATE_H], [PLATE.x + PLATE.w, PLATE.y + PLATE.d, 0], { name: "stand.plate" }));
back.push(Ln(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "lo" }));
const PLATE_SCREWS = k.corners(PLATE, 13);
back.push(Ln(PLATE_SCREWS.map(([x, y]) => k.ring(x, y, 2.8, 0, P, 18)).join(""), { tone: "lo" }));
back.push(Dots(PLATE_SCREWS.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
const SIDE = k.sideTicks(PLATE.y + 24, PLATE.y + PLATE.d - 24, 8, 5, PLATE.x + PLATE.w, 0, [2.2, 4.2], P, "y");
back.push(Ln(SIDE.minor, { tone: "lo" }), Ln(SIDE.major, { tone: "mid" }));
// шильдик на дальнем углу стола
const LABEL = { x: -212, y: -122, w: 62, d: 14, r: 1.5 };
back.push(S(k.slabOf(LABEL, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
back.push(Ln(k.planOutline(k.insetPlan(LABEL, 1.6), 0.8, P, 3), { tone: "faint" }));
back.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + 5], [LABEL.x + 48, LABEL.y + 5], 0.8, P), { tone: "lo", free: true }));
back.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + 7.5], [LABEL.x + 38, LABEL.y + 7.5], 0.8, P), { tone: "lo", free: true }));
back.push(Ln(k.lineOnTop([LABEL.x + 5, LABEL.y + 10], [LABEL.x + 56, LABEL.y + 10], 0.8, P), { tone: "lo", free: true }));
back.push(Dots([at([LABEL.x + 2.4, LABEL.y + 7, 0.8]), at([LABEL.x + LABEL.w - 2.4, LABEL.y + 7, 0.8])], { size: 0.45 }));

// ── бассейн «Остальной мир» ──────────────────────────────────────────────────
const SUMP_IN = k.insetPlan(SUMP, 3);
const sumpSlab = k.slabOf(SUMP, 0, SUMP_H, P, 4, 0.8);
const openTop = k.planOutline(SUMP_IN, SUMP_H, P, 3);
const waterTop = k.planOutline(SUMP_IN, SUMP_WATER, P, 3);
const SUMP_SUB = []; // части труб под водой
const sumpRipples = [];
put(
  [0, (SUMP.y + SUMP.d / 2) | 0, SUMP_H / 2],
  `<g class="iso-solid">${S(sumpSlab, { tone: "mid", inner: Ln(k.sideSeam(SUMP, 5, P, 4), { tone: "faint" }) })}</g>` +
    `<clipPath id="rr-sump"><path d="${openTop}"/></clipPath><g clip-path="url(#rr-sump)"><path class="rr-cavity" d="${openTop}"/><g data-live="sump-sub"></g><path class="rr-water rr-sea" d="${waterTop}"/><g data-live="sump-ripples"></g>` +
    Ln(k.segment([SUMP_IN.x, SUMP_IN.y, SUMP_H], [SUMP_IN.x, SUMP_IN.y, SUMP_WATER], P) + k.segment([SUMP_IN.x + SUMP_IN.w, SUMP_IN.y, SUMP_H], [SUMP_IN.x + SUMP_IN.w, SUMP_IN.y, SUMP_WATER], P), { tone: "faint" }) +
    `</g>` +
    Ln(openTop, { tone: "lo" }),
  { name: "sump", shapes: [record(A.box([SUMP.x, SUMP.y, 0], [SUMP.x + SUMP.w, SUMP.y + SUMP.d, SUMP_H], { name: "sump" }))] },
);

// ── главный резервуар ────────────────────────────────────────────────────────
boxAt(PLINTH, 0, PLINTH_H, { tone: "lo" }, { bevel: 0.8, steps: 4, name: "stand.plinth", extra: Dots(k.corners(PLINTH, 4).map(([x, y]) => at([x, y, PLINTH_H])), { size: 0.45 }) });
boxAt(BASE, PLINTH_H, BASE_TOP - PLINTH_H, { tone: "mid" }, { bevel: 1, steps: 4, name: "tank.base", inner: Ln(k.sideSeam(BASE, PLINTH_H + 5, P, 4), { tone: "faint" }), extra: Ln(k.ring(C[0], C[1], GLASS_R + 3, BASE_TOP, P, 72), { tone: "lo" }) });
boxAt(BASE, GLASS_TOP, LID_TOP - GLASS_TOP, { tone: "mid" }, { bevel: 1, steps: 4, name: "tank.lid", inner: Ln(k.sideSeam(BASE, GLASS_TOP + 3, P, 4), { tone: "faint" }) });
const glassF = UP([C[0], C[1], 0]);
put([C[0], C[1], (BASE_TOP + GLASS_TOP) / 2], `<g data-live="tank"></g>`, { name: "tank.glass", shapes: [record(A.disc(glassF, BASE_TOP, GLASS_TOP, GLASS_R, { name: "tank.glass" }))] });
for (const [x, y] of RODS) {
  postAt(x, y, 2, BASE_TOP + 3, GLASS_TOP - BASE_TOP - 3, { tone: "mid", crease: "none" }, { name: "tank.rod", steps: 16 });
  postAt(x, y, 3.6, LID_TOP, 3, { tone: "mid" }, { name: "tank.nut", steps: 6, bevel: 0.3 });
  postAt(x, y, 3.6, BASE_TOP, 3, { tone: "mid" }, { name: "tank.foot-nut", steps: 6, bevel: 0.3 });
}

// циферблат курса на крышке
postAt(C[0], C[1], GAUGE.neck, LID_TOP, GAUGE.z - LID_TOP, { tone: "mid" }, { name: "gauge.neck", steps: 32 });
const RUB_SPAN = [M.rubOf(1), M.rubOf(0)];
const dialTicks = k.radialTicks(C[0], C[1], GAUGE.r - 3, (RUB_SPAN[1] - RUB_SPAN[0]) / 2.5, 4, GAUGE_TOP, [1.3, 2.8], P, -135 * DEG, 270 * DEG);
put(
  [C[0], C[1], GAUGE.z + GAUGE.h / 2],
  S(k.cylinder(C[0], C[1], GAUGE.r, GAUGE.z, GAUGE.h, P, 64, 0.8), { tone: "hi", crease: "lo" }) +
    Ln(k.knurl(C[0], C[1], GAUGE.r, GAUGE_TOP - 3.4, GAUGE_TOP, 84, P, 0.3), { tone: "lo" }) +
    Ln(k.sideArc(C[0], C[1], GAUGE.r, GAUGE_TOP - 3.4, P, 40), { tone: "faint" }) +
    Ln(k.ring(C[0], C[1], GAUGE.r - 2.2, GAUGE_TOP, P, 64), { tone: "lo" }) +
    Ln(dialTicks.minor, { tone: "lo" }) +
    Ln(dialTicks.major, { tone: "mid" }) +
    `<path data-live="needle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.2" d=""/>` +
    Ln(k.ring(C[0], C[1], 1.6, GAUGE_TOP, P, 16), { tone: "mid" }),
  { name: "gauge.head", shapes: [record(A.cylinder(C[0], C[1], GAUGE.r, GAUGE.z, GAUGE.h, { name: "gauge.head" }))] },
);

// ── насос «Экспорт» ──────────────────────────────────────────────────────────
boxAt({ x: PX - 27, y: -96, w: 54, d: 82, r: 3 }, 0, 6, { tone: "lo" }, { name: "export.skid", bevel: 0.6, extra: Dots(k.corners({ x: PX - 27, y: -96, w: 54, d: 82 }, 4).map(([x, y]) => at([x, y, 6])), { size: 0.45 }) });
for (const y of [-84, -62]) boxAt({ x: PX - 11, y: y - 4, w: 22, d: 8, r: 1 }, 6, PZ - 14 - 6 + 0.6, { tone: "mid" }, { name: "export.motor-foot" });
const MOTOR = ALONG_Y([PX, -90, PZ]);
const motorRibs = G.ribsOf(MOTOR, 4, 32, 14.3, 28, P, { fade: [0.1, 0.55], seams: true });
turned(MOTOR, [[0, 0], [0, 12], [1.5, 13.4, 1], [3, 14], [33, 14], [34.5, 13.4, 1], [36, 12], [36, 0]], { tone: "hi" }, { name: "export.motor", extra: Faded(motorRibs, { tone: "lo" }) });
boxAt({ x: PX - 6, y: -79, w: 12, d: 14, r: 1 }, PZ + 13.4, 8, { tone: "mid" }, { name: "export.terminal", extra: Ln(k.planOutline(k.insetPlan({ x: PX - 6, y: -79, w: 12, d: 14, r: 1 }, 1.2), PZ + 21.4, P, 2), { tone: "faint" }) });
const COUPLING = ALONG_Y([PX, -54, PZ]);
turned(ALONG_Y([PX, -54, PZ]), [[0, 0], [0, 3], [2, 3], [2, 0]], { tone: "mid" }, { name: "export.shaft" });
turned(COUPLING, [[2, 0], [2, 7], [10, 7], [10, 0]], { tone: "hi" }, {
  name: "export.coupling",
  extra: spinner("cpl", 10, (t) => G.ribsOf(COUPLING, 2.4, 9.6, 7, 10, P, { phase: (t * TAU) / 10, least: 0.25 }), "lo"),
});
boxAt({ x: PX - 9, y: -42, w: 18, d: 14, r: 1.5 }, 6, PZ - 17 - 6 + 0.4, { tone: "mid" }, { name: "export.pedestal" });
const CASING = ALONG_Y([PX, -44, PZ]);
turned(CASING, [[0, 0], [0, 8], [1, 9], [2, 15, 1], [4, 17, 1], [18, 17, 1], [20, 15, 1], [21, 10], [22, 7], [22, 0]], { tone: "hi" }, {
  name: "export.casing",
  extra: Dots(G.dotsOf(CASING, 22, 9.6, 8, P, { all: true }), { size: 0.42 }),
  inner: Ln(G.arcOf(CASING, 11, 17, P), { tone: "faint" }),
});
turned(ALONG_Y([PX, -22, PZ]), [[0, 0], [0, 6], [6, 6], [6, 0]], { tone: "mid" }, { name: "export.suction-neck" });
// всасывающая труба из бассейна
const SUCTION = [[PX, -16, PZ], [PX, 90, PZ], [PX, 90, SUMP_FLOOR + 3]];
const suctionLength = G.pathLength(G.fillet(SUCTION, Math.max(4.4 * 2.8, 3), 12, { P, tube: 4.4 }));
const suction = pipe(SUCTION, 4.4, {
  name: "export.suction",
  flanges: [true, false],
  breaks: [suctionLength - (SUMP_H - SUMP_FLOOR - 3)],
  keep: (part) => part.mid[2] > SUMP_H,
  bias: 30,
});
SUMP_SUB.push(...suction.rest);
sumpRipples.push([PX, 90, 4.4 + 1.5]);
// напорный стояк и горизонталь к крышке
turned(UP([PX, -33, PZ + 16]), [[0, 0], [0, 6], [4, 6], [4, 0]], { tone: "mid" }, { name: "export.discharge-neck", bias: 40 });
const riserMeterZ = 132;
const riserGaps = [];
const TOPLINE = [[PX, -33, PZ + 20], [PX, -33, TOP_Z], [INLET[0], -33, TOP_Z], [INLET[0], -33, LID_TOP]];
const riserLine = G.fillet(TOPLINE, 4.6 * 2.8, 12, { P, tube: 4.6 });
const riserTotal = G.pathLength(riserLine);
const meterAlong = riserMeterZ - (PZ + 20);
const valveAlong = (TOP_Z - (PZ + 20)) + (-110 - PX) - 4.6 * 2.8 * 0.43; // приблизительно x ≈ −110
const exportPipe = { line: riserLine, total: riserTotal, id: "export.riser" };
const sv = gateValve(exportPipe, valveAlong, 4.6, { name: "sanctions.valve", bonnetTop: TOP_Z + 24 });
riserGaps.push(sv.gap, [meterAlong - 4.2, meterAlong + 4.2]);
pipe(TOPLINE, 4.6, { name: "export.riser", gaps: riserGaps, bands: [0.03] });
meterAt([PX, -33, riserMeterZ], [0, 0, 1], [1, 0, 0], "m-exp", { name: "export.meter" });
// хомут-кронштейн стояка к стойке на столе
postAt(PX - 20, -33, 3, 6, TOP_Z - 40, { tone: "mid" }, { name: "export.mast", inner: Ln(k.sideArc(PX - 20, -33, 3, 80, P, 12), { tone: "faint" }) });
boxAt({ x: PX - 17, y: -36, w: 12.4, d: 6, r: 1 }, TOP_Z - 52, 5, { tone: "mid" }, { name: "export.clamp-arm" });
// санкционная задвижка: стойки, траверса, маховик
function yokeWheel(gv, stemLive, wheelLive, name, { across = "y", wheel = 11, height = 22 } = {}) {
  const [x, y] = gv.centre;
  for (const d of [-6.5, 6.5]) postAt(across === "y" ? x : x + d, across === "y" ? y + d : y, 1.4, gv.top - 1.6, height, { tone: "mid" }, { name: `${name}.yoke-post`, steps: 12 });
  boxAt(across === "y" ? { x: x - 4, y: y - 9, w: 8, d: 18, r: 1.2 } : { x: x - 9, y: y - 4, w: 18, d: 8, r: 1.2 }, gv.top + height - 1.6, 3.4, { tone: "mid" }, { name: `${name}.yoke-top` });
  put([x, y, gv.top + 10], `<g data-live="${stemLive}"></g>`, { name: `${name}.stem`, bias: 0.1, shapes: [record(A.cylinder(x, y, 1.2, gv.top, height - 4, { name: `${name}.stem` }))] });
  handwheel(x, y, gv.top + height + 6.2, wheel, wheelLive, { name: `${name}.wheel` });
}
const [svx, svy] = [sv.centre[0], sv.centre[1]];
yokeWheel(sv, "stem-sanc", "hw-sanc", "sanctions");
// пульт «Нефть»: коробка с ручкой и шкалой
const OIL = { x: -142, y: -6, w: 44, d: 26, r: 2 };
const OIL_TOP = 30;
const OIL_KNOB = [OIL.x + 12, OIL.y + 13];
const VOL_KNOB = [OIL.x + 32, OIL.y + 13];
const oilTicks = k.radialTicks(OIL_KNOB[0], OIL_KNOB[1], 10, 18, 3, OIL_TOP, [1.1, 2.2], P, -135 * DEG, 270 * DEG);
const volTicks = k.radialTicks(VOL_KNOB[0], VOL_KNOB[1], 9, 10, 5, OIL_TOP, [1.1, 2.2], P, -135 * DEG, 270 * DEG);
boxAt(OIL, 0, OIL_TOP, { tone: "mid" }, {
  name: "oil.box",
  bevel: 0.6,
  inner: Ln(k.sideSeam(OIL, 24, P, 3), { tone: "faint" }),
  extra: Ln(oilTicks.minor + volTicks.minor, { tone: "lo" }) + Ln(oilTicks.major + volTicks.major, { tone: "mid" }) + Ln(k.lineOnTop([OIL.x + 22, OIL.y + 3], [OIL.x + 22, OIL.y + OIL.d - 3], OIL_TOP, P), { tone: "faint" }) + Dots(k.corners(OIL, 2.4).map(([x, y]) => at([x, y, OIL_TOP])), { size: 0.4 }),
});
postAt(OIL_KNOB[0], OIL_KNOB[1], 6, OIL_TOP, 4, { tone: "hi" }, { name: "oil.knob", steps: 32, extra: Ln(k.knurl(OIL_KNOB[0], OIL_KNOB[1], 6, OIL_TOP, OIL_TOP + 4, 36, P), { tone: "lo" }) + `<path data-live="oil-pointer" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1" d=""/>` });
postAt(VOL_KNOB[0], VOL_KNOB[1], 5, OIL_TOP, 4, { tone: "hi" }, { name: "vol.knob", steps: 28, extra: Ln(k.knurl(VOL_KNOB[0], VOL_KNOB[1], 5, OIL_TOP, OIL_TOP + 4, 30, P), { tone: "lo" }) + `<path data-live="vol-pointer" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1" d=""/>` });
// кабель от пульта к клеммной коробке мотора
const CABLE_R = 0.7;
function cable(points, { name, bend = 5 }) {
  const route = G.fillet(points, bend, 10, { P, tube: CABLE_R });
  const made = tubeItems(route, CABLE_R, { name, tone: "mid", maxLength: 16, spacing: 1, limp: true });
  for (const end of [route[0], route[route.length - 1]]) put(end, Dots([at(end)], { size: 0.6, tone: "hi" }), { bias: 0.2, name: nameFor(`${made.id}.end`), shapes: [A.ball(end, 0.5)] });
  return route;
}
cable([[OIL.x, OIL.y + 10, 20], [-143, OIL.y + 10, 20], [-143, -72, 20], [-143, -72, PZ + 17.4], [PX + 6, -72, PZ + 17.4]], { name: "oil.cable" });

// ── сливы «Импорт» и «Вывод капитала» с общей траверсой ставки ──────────────────
const DRAINS = [
  { x: IMP_X, r: 4.6, name: "import", live: "m-imp" },
  { x: CAP_X, r: 3.4, name: "capital", live: "m-cap" },
];
const STEMS = [];
let BALL = null;
for (const drain of DRAINS) {
  const control = [[drain.x, BASE.y + BASE.d, DRAIN_Z], [drain.x, DRAIN_END, DRAIN_Z]];
  const line = G.fillet(control, 3, 4);
  const made = { line, total: G.pathLength(line), id: `${drain.name}.pipe` };
  const gv = gateValve(made, VALVE_Y - (BASE.y + BASE.d), drain.r, { name: `${drain.name}.valve`, bonnetTop: DRAIN_Z + 22 });
  const extraGaps = [];
  if (drain.name === "import") {
    const bv = ballValve(made, BALL_Y - (BASE.y + BASE.d), drain.r, "lever-imp", { name: "import.ball" });
    extraGaps.push(bv.gap);
    BALL = bv.pivot;
  }
  const ext = meterAt([drain.x, METER_Y, DRAIN_Z], [0, 1, 0], [1, 0, 0], drain.live, { name: `${drain.name}.meter`, r: drain.r + 1.4 });
  const mAlong = METER_Y - (BASE.y + BASE.d);
  pipe(control, drain.r, { name: `${drain.name}.pipe`, flanges: [true, false], gaps: [gv.gap, [mAlong - ext, mAlong + ext], ...extraGaps], lip: true });
  STEMS.push({ x: drain.x, y: VALVE_Y, z: gv.top, live: `stem-${drain.name}` });
  sumpRipples.push([drain.x, DRAIN_END + 9, 3]);
}
for (const stem of STEMS) put([stem.x, stem.y, stem.z + 8], `<g data-live="${stem.live}"></g>`, { name: `${stem.live}`, bias: 0.1, shapes: [record(A.cylinder(stem.x, stem.y, 1.2, stem.z, 16, { name: stem.live }))] });
// мост: две стойки на столе и верхняя балка; траверса едет по винту
const BRIDGE_X = [IMP_X - 16, CAP_X + 16];
for (const x of BRIDGE_X) {
  postAt(x, VALVE_Y, 5, 0, 4, { tone: "lo" }, { name: "rate.post-foot", steps: 24 });
  postAt(x, VALVE_Y, 3, 4, BRIDGE_Z - 4, { tone: "mid" }, { name: "rate.post", inner: Ln(k.sideArc(x, VALVE_Y, 3, 40, P, 12), { tone: "faint" }) });
}
const BEAM = { x: BRIDGE_X[0] - 4, y: VALVE_Y - 4, w: BRIDGE_X[1] - BRIDGE_X[0] + 8, d: 8, r: 1.5 };
boxAt(BEAM, BRIDGE_Z, 5, { tone: "mid" }, { name: "rate.beam", extra: Dots(BRIDGE_X.map((x) => at([x, VALVE_Y, BRIDGE_Z + 5])), { size: 0.45 }) });
const SPINDLE_X = (IMP_X + CAP_X) / 2;
postAt(SPINDLE_X, VALVE_Y, 1.5, DRAIN_Z + 26, BRIDGE_Z - DRAIN_Z - 26, { tone: "mid", crease: "none" }, { name: "rate.spindle", steps: 12 });
const XHEAD = { x: IMP_X - 5, y: VALVE_Y - 3.5, w: CAP_X - IMP_X + 10, d: 7, r: 1.2 };
put([SPINDLE_X, VALVE_Y, 60], `<g data-live="xhead" transform="${k.translateAlong(P, [0, 0, 56])}">${S(k.slabOf(XHEAD, 0, 4, P, 3, 0.5), { tone: "hi" })}${Dots([IMP_X, CAP_X, SPINDLE_X].map((x) => at([x, VALVE_Y, 4])), { size: 0.45 })}</g>`, {
  name: "rate.crosshead",
  bias: 0.3,
  shapes: [record(A.box([XHEAD.x, XHEAD.y, 56], [XHEAD.x + XHEAD.w, XHEAD.y + XHEAD.d, 60], { name: "rate.crosshead" }))],
});
handwheel(SPINDLE_X, VALVE_Y, BRIDGE_Z + 5 + 4.4, 12, "hw-rate", { name: "rate.wheel" });

// ── линия Минфина: реверсивный насос и бак ФНБ ───────────────────────────────
const fundPipe1 = [[BASE.x + BASE.w, FY, DRAIN_Z], [PUMP2.x, FY, DRAIN_Z]];
const m2x = 64;
const mExt = meterAt([m2x, FY, DRAIN_Z], [1, 0, 0], [0, 1, 0], "m-min", { name: "minfin.meter", r: 5.4 });
pipe(fundPipe1, 3.6, { name: "minfin.pipe-a", gaps: [[m2x - (BASE.x + BASE.w) - mExt, m2x - (BASE.x + BASE.w) + mExt]] });
boxAt(PUMP2, 4, 30, { tone: "hi" }, { name: "minfin.pump", bevel: 0.6, inner: Ln(k.sideSeam(PUMP2, 16, P, 3), { tone: "faint" }), extra: Dots(k.corners(PUMP2, 2.6).map(([x, y]) => at([x, y, 34])), { size: 0.45 }) });
boxAt({ x: PUMP2.x - 2, y: PUMP2.y - 2, w: PUMP2.w + 4, d: PUMP2.d + 4, r: 3 }, 0, 4, { tone: "lo" }, { name: "minfin.pump-base" });
const MCX = PUMP2.x + PUMP2.w / 2;
postAt(MCX, FY, 10, 34, 22, { tone: "mid" }, { name: "minfin.motor", steps: 40, extra: Ln(k.knurl(MCX, FY, 10, 37, 53, 40, P, 0), { tone: "lo" }) + Ln(k.sideArc(MCX, FY, 10, 37, P, 24) + k.sideArc(MCX, FY, 10, 53, P, 24), { tone: "faint" }) });
postAt(MCX, FY, 10.6, 56, 4, { tone: "hi" }, {
  name: "minfin.fan",
  steps: 40,
  bevel: 0.5,
  extra: Ln(k.ring(MCX, FY, 7.5, 60, P, 40), { tone: "faint" }) + spinner("fan", 12, (t) => G.spokesOf(UP([MCX, FY, 60]), 0, 2, 7.2, 6, P, { phase: (t * TAU) / 6, sweep: 0.5 }), "lo") + Ln(k.ring(MCX, FY, 2, 60, P, 14), { tone: "mid" }),
});
const fundWall = FUND.c[0] - FUND.r;
const bossF = G.frameAlong([fundWall + 1.2, FY, DRAIN_Z], [-1, 0, 0]);
discAt(bossF, 0, 5, 7, { tone: "mid" }, { name: "fund.boss" });
pipe([[PUMP2.x + PUMP2.w, FY, DRAIN_Z], [fundWall - 3.8, FY, DRAIN_Z]], 3.6, { name: "minfin.pipe-b" });
// пульт отсечения: стрелка нефти против метки 59 $
const CUT = { x: 84, y: 16, w: 34, d: 20, r: 2 };
const CUT_TOP = 18;
const CUT_DIAL = [CUT.x + 11, CUT.y + 10];
const cutTicks = k.radialTicks(CUT_DIAL[0], CUT_DIAL[1], 7.6, 18, 3, CUT_TOP + 0.6, [1, 2], P, -135 * DEG, 270 * DEG);
const GAIN_KNOB = [CUT.x + 27, CUT.y + 10];
const gainTicks = k.radialTicks(GAIN_KNOB[0], GAIN_KNOB[1], 6.4, 8, 4, CUT_TOP, [0.9, 1.8], P, -135 * DEG, 270 * DEG);
boxAt(CUT, 0, CUT_TOP, { tone: "mid" }, { name: "cut.box", bevel: 0.6, inner: Ln(k.sideSeam(CUT, 13, P, 3), { tone: "faint" }), extra: Ln(gainTicks.minor, { tone: "lo" }) + Ln(gainTicks.major, { tone: "mid" }) + Dots(k.corners(CUT, 2.2).map(([x, y]) => at([x, y, CUT_TOP])), { size: 0.4 }) });
postAt(GAIN_KNOB[0], GAIN_KNOB[1], 3.8, CUT_TOP, 3.4, { tone: "hi" }, { name: "cut.gain", steps: 24, extra: Ln(k.knurl(GAIN_KNOB[0], GAIN_KNOB[1], 3.8, CUT_TOP, CUT_TOP + 3.4, 24, P), { tone: "lo" }) + `<path data-live="gain-pointer" class="iso-line" data-tone="hi" data-free="end" style="stroke-width:1" d=""/>` });
postAt(CUT_DIAL[0], CUT_DIAL[1], 8.6, CUT_TOP, 0.6, { tone: "hi" }, {
  name: "cut.face",
  steps: 40,
  extra: Ln(cutTicks.minor, { tone: "lo" }) + Ln(cutTicks.major, { tone: "mid" }) + `<path data-live="cut-mark" class="iso-line" data-tone="red" data-free="start" style="stroke-width:1.1" d=""/>` + `<path data-live="cut-pointer" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1" d=""/>` + Ln(k.ring(CUT_DIAL[0], CUT_DIAL[1], 1, CUT_TOP + 0.6, P, 12), { tone: "mid" }),
});
// сигнальный кабель «цена нефти» по столу от пульта нефти к пульту отсечения
cable([[OIL.x + 8, OIL.y, 6], [OIL.x + 8, -116, 6], [OIL.x + 8, -116, 1.2], [66, -116, 1.2], [66, CUT.y + 10, 1.2], [66, CUT.y + 10, 6], [CUT.x, CUT.y + 10, 6]], { name: "cut.cable", bend: 4 });
cable([[104, CUT.y, 12], [104, PUMP2.y + PUMP2.d + 7, 12], [104, PUMP2.y + PUMP2.d + 7, 27], [104, PUMP2.y + PUMP2.d, 27]], { name: "cut.cable-pump", bend: 4 });

// бак ФНБ: юбка, обечайка с поясами, купол, люк, смотровое стекло
const FC = FUND.c;
postAt(FC[0], FC[1], FUND.r - 2, 0, FUND.z0, { tone: "lo" }, { name: "fund.skirt", steps: 56 });
const fundF = UP([FC[0], FC[1], 0]);
put(
  [FC[0], FC[1], (FUND.z0 + FUND.z1) / 2],
  S(k.cylinder(FC[0], FC[1], FUND.r, FUND.z0, FUND.z1 - FUND.z0, P, 72), { tone: "hi", crease: "none", inner: Ln([40, 76].map((z) => k.sideArc(FC[0], FC[1], FUND.r, z, P, 40)).join(""), { tone: "faint" }) }),
  { name: "fund.shell", shapes: [record(A.cylinder(FC[0], FC[1], FUND.r, FUND.z0, FUND.z1 - FUND.z0, { name: "fund.shell" }))] },
);
const dome = (s) => FUND.r * Math.sqrt(Math.max(0, 1 - (s / 16) ** 2));
{
  const F = UP([FC[0], FC[1], FUND.z1]);
  const knots = Array.from({ length: 25 }, (_, index) => { const s = 15.999 * Math.sin((index / 24) * (Math.PI / 2)); return [s, dome(s), index && index < 24 ? 1 : 0]; });
  const domeSlope = (s) => (-FUND.r * (s / 256)) / Math.sqrt(Math.max(1e-6, 1 - (s / 16) ** 2));
  const profile = [[0, 0], ...knots, [16, 0]];
  const id = nameFor("fund.dome");
  put([FC[0], FC[1], FUND.z1 + 8], S(G.lathe(profile, F, P, { smooth: { slope: domeSlope, rows: 6 } }), { tone: "hi" }), { name: id, shapes: [record(A.solid(F, profile, { name: id }))] });
}
postAt(FC[0] - 8, FC[1] - 6, 6, FUND.z1 + 14.6, 4, { tone: "mid" }, { name: "fund.hatch", bias: 40, steps: 28, bevel: 0.4, extra: Dots(G.dotsOf(UP([FC[0] - 8, FC[1] - 6, 0]), FUND.z1 + 18.6, 4.6, 8, P, { all: true }), { size: 0.4 }) });
// смотровое стекло уровня ФНБ
const [gx, gy] = SIGHT_AT;
for (const z of [SIGHT.z0 - 6, SIGHT.z1 + 6]) {
  const o = [FC[0] + SIGHT.d[0] * (FUND.r - 1), FC[1] + SIGHT.d[1] * (FUND.r - 1), z];
  const F = G.frameAlong(o, [SIGHT.d[0], SIGHT.d[1], 0]);
  discAt(F, 0, SIGHT.out - FUND.r - 2.6, 2.2, { tone: "mid" }, { name: "fund.sight-stub" });
}
postAt(gx, gy, 4, SIGHT.z0 - 9, 6, { tone: "mid" }, { name: "fund.sight-low", steps: 6 });
postAt(gx, gy, 4, SIGHT.z1 + 3, 6, { tone: "mid" }, { name: "fund.sight-high", steps: 6 });
put([gx, gy, (SIGHT.z0 + SIGHT.z1) / 2], `<g data-live="sight"></g>`, { name: "fund.sight", bias: 0.1, shapes: [record(A.cylinder(gx, gy, 2.6, SIGHT.z0 - 3, SIGHT.z1 - SIGHT.z0 + 6, { name: "fund.sight" }))] });

// ── резервы ЦБ: бак, задвижка продаж, расходомер, смотровое стекло ─────────────
const CB = { c: [203, -96], r: 18, z0: 6, z1: 74, y: -96, z: 14 };
postAt(CB.c[0], CB.c[1], CB.r - 2, 0, CB.z0, { tone: "lo" }, { name: "cb.skirt", steps: 48 });
put(
  [CB.c[0], CB.c[1], (CB.z0 + CB.z1) / 2],
  S(k.cylinder(CB.c[0], CB.c[1], CB.r, CB.z0, CB.z1 - CB.z0, P, 64), { tone: "hi", crease: "none", inner: Ln([28, 52].map((z) => k.sideArc(CB.c[0], CB.c[1], CB.r, z, P, 32)).join(""), { tone: "faint" }) }),
  { name: "cb.shell", shapes: [record(A.cylinder(CB.c[0], CB.c[1], CB.r, CB.z0, CB.z1 - CB.z0, { name: "cb.shell" }))] },
);
{
  const H2 = 10;
  const F = UP([CB.c[0], CB.c[1], CB.z1]);
  const r = (s) => CB.r * Math.sqrt(Math.max(0, 1 - (s / H2) ** 2));
  const knots = Array.from({ length: 21 }, (_, index) => { const s = (H2 - 0.001) * Math.sin((index / 20) * (Math.PI / 2)); return [s, r(s), index && index < 20 ? 1 : 0]; });
  const slope = (s) => (-CB.r * (s / (H2 * H2))) / Math.sqrt(Math.max(1e-6, 1 - (s / H2) ** 2));
  const profile = [[0, 0], ...knots, [H2, 0]];
  const id = nameFor("cb.dome");
  put([CB.c[0], CB.c[1], CB.z1 + 5], S(G.lathe(profile, F, P, { smooth: { slope, rows: 6 } }), { tone: "hi" }), { name: id, shapes: [record(A.solid(F, profile, { name: id }))] });
  postAt(CB.c[0], CB.c[1], 3, CB.z1 + H2 - 0.4, 3, { tone: "mid" }, { name: "cb.vent", steps: 16, bias: 30 });
}
const CB_TAG = { x: CB.c[0] - 14, y: CB.c[1] + CB.r - 1.7, w: 28, d: 2.2, r: 0.6 };
boxAt(CB_TAG, 50, 8, { tone: "mid" }, { name: "cb.tag", bias: 40, bevel: 0.3 });
const CB_SIGHT = { out: CB.r + 8, z0: 16, z1: 60 };
const CB_SIGHT_AT = [CB.c[0] + SIGHT.d[0] * CB_SIGHT.out, CB.c[1] + SIGHT.d[1] * CB_SIGHT.out];
for (const z of [CB_SIGHT.z0 - 6, CB_SIGHT.z1 + 6]) {
  const o = [CB.c[0] + SIGHT.d[0] * (CB.r - 1), CB.c[1] + SIGHT.d[1] * (CB.r - 1), z];
  discAt(G.frameAlong(o, [SIGHT.d[0], SIGHT.d[1], 0]), 0, CB_SIGHT.out - CB.r - 2.6, 2, { tone: "mid" }, { name: "cb.sight-stub" });
}
postAt(CB_SIGHT_AT[0], CB_SIGHT_AT[1], 3.6, CB_SIGHT.z0 - 9, 6, { tone: "mid" }, { name: "cb.sight-low", steps: 6 });
postAt(CB_SIGHT_AT[0], CB_SIGHT_AT[1], 3.6, CB_SIGHT.z1 + 3, 6, { tone: "mid" }, { name: "cb.sight-high", steps: 6 });
put([CB_SIGHT_AT[0], CB_SIGHT_AT[1], (CB_SIGHT.z0 + CB_SIGHT.z1) / 2], `<g data-live="cb-sight"></g>`, { name: "cb.sight", bias: 0.1, shapes: [record(A.cylinder(CB_SIGHT_AT[0], CB_SIGHT_AT[1], 2.6, CB_SIGHT.z0 - 3, CB_SIGHT.z1 - CB_SIGHT.z0 + 6, { name: "cb.sight" }))] });
// линия продаж: от стенки бака к основанию резервуара
const cbWall = CB.c[0] - CB.r;
discAt(G.frameAlong([cbWall + 1.2, CB.y, CB.z], [-1, 0, 0]), 0, 5, 6, { tone: "mid" }, { name: "cb.boss" });
const CB_LINE = [[BASE.x + BASE.w, CB.y, CB.z], [cbWall - 3.8, CB.y, CB.z]];
const cbMade = { line: G.fillet(CB_LINE, 3, 4), id: "cb.pipe" };
const cbValve = gateValve(cbMade, 162 - (BASE.x + BASE.w), 3, { name: "cb.valve", bonnetTop: CB.z + 18 });
const cbExt = meterAt([143, CB.y, CB.z], [1, 0, 0], [0, 1, 0], "m-cb", { name: "cb.meter", r: 4.6 });
pipe(CB_LINE, 3, { name: "cb.pipe", gaps: [cbValve.gap, [143 - (BASE.x + BASE.w) - cbExt, 143 - (BASE.x + BASE.w) + cbExt]] });
yokeWheel(cbValve, "stem-cb", "hw-cb", "cb", { wheel: 9, height: 20 });

// ── самописец курса: лента на столе, перо на каретке ──────────────────────────
const REC = { x: 72, y: 50, w: 136, d: 54, r: 4 };
const REC_H = 12;
const PAPER = { x: REC.x + 14, y: REC.y + 9, w: REC.w - 28, d: REC.d - 18, r: 0.6 };
const PEN_X = PAPER.x + PAPER.w - 22;
boxAt(REC, 0, REC_H, { tone: "mid" }, {
  name: "rec.body",
  bevel: 0.8,
  steps: 4,
  inner: Ln(k.sideSeam(REC, 4, P, 4), { tone: "faint" }),
  extra:
    `<path class="rr-paper" d="${k.slabOf(PAPER, REC_H, 0.01, P, 2).fill}"/>` +
    `<clipPath id="rr-paper"><path d="${k.slabOf(PAPER, REC_H, 0.01, P, 2).fill}"/></clipPath><g clip-path="url(#rr-paper)"><g data-live="rec-grid"></g><path data-live="rec-trace" class="rr-trace" d=""/><path data-live="rec-cut" class="rr-trace-ref" d=""/></g>` +
    Ln(k.planOutline(PAPER, REC_H, P, 2), { tone: "lo" }) +
    Dots(k.corners(REC, 4).map(([x, y]) => at([x, y, REC_H])), { size: 0.45 }),
});
for (const x of [PAPER.x - 4.5, PAPER.x + PAPER.w + 4.5]) {
  const F = ALONG_Y([x, PAPER.y - 3, REC_H + 3.4]);
  turned(F, [[0, 0], [0, 3.4], [PAPER.d + 6, 3.4], [PAPER.d + 6, 0]], { tone: "hi" }, { name: "rec.roller", extra: x < PAPER.x ? "" : spinner("roller", 8, (t) => G.ribsOf(F, 0.3, PAPER.d + 5.7, 3.4, 8, P, { phase: (t * TAU) / 8, least: 0.3 }), "faint") });
  for (const y of [PAPER.y - 6, PAPER.y + PAPER.d + 6]) boxAt({ x: x - 3, y: y - 1.5, w: 6, d: 3, r: 0.6 }, REC_H, 6.6, { tone: "mid" }, { name: "rec.cheek" });
}
// направляющая пера поперёк ленты и каретка
for (const y of [PAPER.y - 6, PAPER.y + PAPER.d + 6]) postAt(PEN_X + 6, y, 2, REC_H, 10, { tone: "mid" }, { name: "rec.rail-post", steps: 14 });
discAt(ALONG_Y([PEN_X + 6, PAPER.y - 6, REC_H + 12]), 0, PAPER.d + 12, 1.3, { tone: "mid" }, { name: "rec.rail" });
put([PEN_X + 3, PAPER.y + PAPER.d / 2, REC_H + 8], `<g data-live="rec-pen"></g>`, { name: "rec.pen", bias: 12, shapes: [record(A.box([PEN_X - 1, PAPER.y + PAPER.d / 2 - 3, REC_H + 1], [PEN_X + 9, PAPER.y + PAPER.d / 2 + 3, REC_H + 15], { name: "rec.pen" }))] });
// кабель от датчика уровня (основание резервуара) к самописцу
cable([[BASE.x + BASE.w, 0, 14], [60, 0, 14], [60, 0, 1.2], [60, REC.y + 20, 1.2], [60, REC.y + 20, 7], [REC.x, REC.y + 20, 7]], { name: "rec.cable", bend: 4 });

// ── гравировка названий на гранях ─────────────────────────────────────────────
const ENGRAVE = [];
const engrave = (host, face, at, z, text, size = 4, tone = "mid") => ENGRAVE.push({ host, face, at, z, text, size, tone });
engrave("sump", "left", [SUMP.x + SUMP.w / 2, SUMP.y + SUMP.d], 4, "ОСТАЛЬНОЙ МИР", 6);
engrave("tank.base", "right", [BASE.x + BASE.w, -66], PLINTH_H + 6, "ВАЛЮТНЫЙ РЫНОК", 4.2);
engrave("export.skid", "left", [PX, -14], 1.4, "ЭКСПОРТ", 4.4);
engrave("oil.box", "left", [OIL_KNOB[0], OIL.y + OIL.d], 15, "НЕФТЬ", 4.4);
engrave("oil.box", "left", [VOL_KNOB[0], OIL.y + OIL.d], 15, "ОБЪЁМ", 4.4);
engrave("rate.beam", "left", [BEAM.x + BEAM.w - 19, BEAM.y + BEAM.d], BRIDGE_Z + 1.1, "СТАВКА ЦБ", 3.4);
engrave("minfin.pump", "left", [MCX, PUMP2.y + PUMP2.d], 11, "МИНФИН", 4.6);
engrave("cut.box", "left", [CUT.x + CUT.w / 2, CUT.y + CUT.d], 5.5, "ПРАВИЛО", 4.6);
engrave("cb.tag", "left", [CB.c[0], CB_TAG.y + CB_TAG.d], 52.4, "РЕЗЕРВЫ ЦБ", 3.8, "hi");
engrave("rec.body", "left", [REC.x + 40, REC.y + REC.d], 3.6, "САМОПИСЕЦ КУРСА", 4.4);
// табличка «ФНБ» на обечайке и табличка «САНКЦИИ» на стойке задвижки
const FUND_TAG = { x: FC[0] - 10, y: FC[1] + FUND.r - 1.7, w: 20, d: 2.2, r: 0.6 };
boxAt(FUND_TAG, 58, 9, { tone: "mid" }, { name: "fund.tag", bias: 40, bevel: 0.3, extra: Dots([at([FUND_TAG.x + 1.6, FUND_TAG.y + 2, 65.4]), at([FUND_TAG.x + 16.4, FUND_TAG.y + 2, 65.4])], { size: 0.4 }) });
engrave("fund.tag", "left", [FC[0], FUND_TAG.y + FUND_TAG.d], 60.4, "ФНБ", 5.2, "hi");
const SANC_TAG = { x: svx - 14, y: svy + 7.9, w: 28, d: 1.4, r: 0.5 };
boxAt(SANC_TAG, sv.top + 6, 7, { tone: "mid" }, { name: "sanctions.tag", bevel: 0.3 });
engrave("sanctions.tag", "left", [svx, SANC_TAG.y + SANC_TAG.d], sv.top + 8.4, "САНКЦИИ", 3.8, "hi");

// ── сборка страницы ──────────────────────────────────────────────────────────
A.settle(R, P);
items.sort((a, b) => a.key - b.key);
for (const e of ENGRAVE) {
  const host = items.find((item) => item.name === e.host);
  if (!host) throw new Error(`нет детали ${e.host}`);
  host.svg += k.faceTextSvg(k.sideMatrix(e.at, e.z, P, e.face), e.text, { size: e.size, tone: e.tone, anchor: "middle" });
}
// подписи сливов — гравировка на столе под трубами
for (const drain of DRAINS) {
  const text = drain.name === "import" ? "ИМПОРТ" : "КАПИТАЛ";
  back.push(k.faceTextSvg(k.topMatrix([drain.x + 9, 46], 0, P, "y"), text, { size: 4.2, tone: "mid", anchor: "middle" }));
}
const front = items.map((item) => `<g class="it">${item.svg}</g>`).join("") + DRAINS.map((drain) => `<g data-live="stream-${drain.name}"></g>`).join("");
const LABEL_TEXT =
  "Механическая модель валютного рынка. Главный стеклянный резервуар — предложение валюты; поплавок через шток поворачивает стрелку циферблата «рублей за доллар». Насос «Экспорт» качает валюту из бассейна «Остальной мир», его скорость задаёт ручка цены нефти; на напорной трубе стоит санкционная задвижка. Два слива, «Импорт» и «Вывод капитала», возвращают валюту в мир; их задвижки подняты одной траверсой, которую опускает маховик ключевой ставки. Реверсивный насос Минфина по бюджетному правилу перекачивает валюту в бак ФНБ, когда нефть дороже цены отсечения, и обратно, когда дешевле.";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg rr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${LABEL_TEXT}">${back.join("")}${front}</svg>`;

const DATA = {
  P, C, GLASS_R, BASE_TOP, GLASS_TOP, LEVEL, WATER_FLOOR, FLOAT, GAUGE, GAUGE_TOP, INLET, RISER_Y,
  SUMP_WATER, SUMP_SUB: SUMP_SUB.join(""), RIPPLES: sumpRipples, DRAINS: DRAINS.map((d) => ({ x: d.x, r: d.r })), DRAIN_Z, DRAIN_END,
  OIL_KNOB, VOL_KNOB, GAIN_KNOB, BALL, OIL_TOP, CUT_DIAL, CUT_TOP, SPIN, STEMS, RANGE: M.RANGE,
  CBV: { x: cbValve.centre[0], y: cbValve.centre[1], z: cbValve.top, max: 15 },
  SIGHTS: [
    { live: "sight", at: SIGHT_AT, z0: SIGHT.z0, z1: SIGHT.z1, key: "n" },
    { live: "cb-sight", at: CB_SIGHT_AT, z0: CB_SIGHT.z0, z1: CB_SIGHT.z1, key: "c" },
  ], XHEAD_Z: [DRAIN_Z + 26 + 2, BRIDGE_Z - 10],
  SV: { x: svx, y: svy, z: sv.top, max: 18 }, SIGHT_AT, SIGHT, FUND, REC: { paper: PAPER, z: REC_H, penX: PEN_X },
};
const kitSource = readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", () => JSON.stringify(DATA)).replace("__MODEL__", () => modelSource);
const slider = (key, label, stepBy, hint, where) =>
  `<div class="rr-knob"><label class="rr-knob-label" for="rr-${key}">${label}</label><input id="rr-${key}" type="range" data-in="${key}" min="${M.RANGE[key][0]}" max="${M.RANGE[key][1]}" step="${stepBy}" value="${M.START[key]}" aria-describedby="rr-${key}-hint"><output data-out="${key}" for="rr-${key}"></output><p class="rr-knob-hint" id="rr-${key}-hint">${hint} <span class="rr-where">На машине: ${where}.</span></p></div>`;
const GROUPS = [
  {
    title: "Приток валюты",
    knobs: [
      slider("oil", "Нефть Urals, $/барр", 1, "Цена, по которой экспортёры продают сырьё.", "левая ручка пульта у насоса"),
      slider("vol", "Объём экспорта, %", 1, "Физические поставки нефти, газа, металлов, угля, зерна. 100% — текущий уровень.", "правая ручка того же пульта"),
      slider("sanc", "Санкционное трение, %", 1, "Доля экспортной выручки, которая теряется или застревает по дороге домой: платёжные ограничения, банки-посредники, скидки за риск, задержки расчётов. 0% — деньги возвращаются без потерь.", "задвижка «Санкции» на напорной трубе"),
    ],
  },
  {
    title: "Отток валюты",
    knobs: [
      slider("dem", "Спрос на импорт, %", 1, "Сколько валюты нужно импортёрам при текущем курсе: потребительский спрос, инвестиции, госзаказ. 100% — текущий уровень.", "шаровой кран с рычагом на трубе «Импорт»"),
      slider("rate", "Ключевая ставка, %", 0.5, "Дорогой кредит сжимает импорт, а рублёвые вклады удерживают капитал внутри страны.", "маховик траверсы над двумя сливами"),
    ],
  },
  {
    title: "Государство",
    knobs: [
      slider("cutoff", "Цена отсечения, $/барр", 1, "Порог бюджетного правила: выше него Минфин покупает валюту в ФНБ, ниже — продаёт из ФНБ.", "красная метка на циферблате пульта «Правило»"),
      slider("mscale", "Операции Минфина, % от правила", 5, "Масштаб покупок и продаж по правилу. 0% — правило на паузе, как в 2022 году; 200% — вдвое больше.", "малая ручка пульта «Правило», скорость насоса Минфина"),
      slider("cb", "Продажи валюты ЦБ, %", 1, "Прямые продажи из резервов Банка России сверх бюджетного правила. Резервы конечны: бак пустеет.", "задвижка на линии из бака «Резервы ЦБ»"),
    ],
  },
];
const flowsRow = [
  ["exp", "Экспорт →"],
  ["cbflow", "ЦБ →"],
  ["minfin", "Минфин"],
  ["imp", "Импорт ←"],
  ["cap", "Капитал ←"],
  ["rub", "Курс"],
].map(([key, label]) => `<span class="rr-flow"><span>${label}</span><b data-out="${key}"></b></span>`).join("");
const SCENE_LIST = [
  ["base", "База"],
  ["boom", "Нефтяной бум"],
  ["pause", "Правило на паузе"],
  ["crash", "Обвал нефти"],
  ["cbsell", "Продажи ЦБ"],
  ["imports", "Импортный бум"],
  ["hawk", "Жёсткая ставка"],
  ["dove", "Смягчение"],
  ["sanc", "Санкции"],
];
const sceneButtons = SCENE_LIST.map(([key, label]) => `<button type="button" class="rr-scene" data-scene="${key}" aria-pressed="false">${label}</button>`).join("");
const panel = `<div class="rr-panel">
  <div class="rr-groups">${GROUPS.map((group) => `<fieldset class="rr-group"><legend>${group.title}</legend>${group.knobs.join("")}</fieldset>`).join("")}</div>
  <div class="rr-scenes">${sceneButtons}<button type="button" class="rr-scene rr-tour" data-tour aria-pressed="true">Тур идёт</button><button type="button" class="rr-scene" data-reset>Сброс</button></div>
  <p class="rr-say" aria-live="polite" data-say></p>
  <div class="rr-flows" aria-label="Потоки валюты, условные единицы">${flowsRow}</div>
</div>`;
const KEYS = [
  { mark: "lit", label: "Поплавок, шток и стрелка: курс рубля" },
  { mark: "raised", label: "Насос «Экспорт», пульт цены и объёма, задвижка «Санкции»: приток" },
  { mark: "edge", label: "Кран спроса на импорт и траверса ставки: отток" },
  { mark: "flat", label: "Насос Минфина, пульт правила и бак ФНБ; бак «Резервы ЦБ»" },
  { mark: "dotted", label: "Самописец: курс за последние 20 секунд" },
];
const CAPTION =
  "Валютный рынок как гидравлическая машина. Уровень в стеклянном резервуаре — предложение валюты внутри страны; поплавок через шток поворачивает стрелку: чем выше уровень, тем дешевле доллар. " +
  "Насос «Экспорт» качает валюту из «Остального мира»; его обороты — это цена нефти, умноженная на физический объём поставок, а санкционная задвижка срезает часть потока. " +
  "Импорт и вывод капитала сливают валюту обратно. Шаровой кран задаёт спрос на импорт, а обе задвижки сливов висят на одной траверсе: чем выше ключевая ставка, тем ниже траверса и уже щель. " +
  "Слив растёт с напором: крепкий рубль сам разгоняет импорт, поэтому у машины есть равновесие. " +
  "Минфин по бюджетному правилу откачивает выручку сверх цены отсечения в бак ФНБ и возвращает её, когда нефть дешевле, пока бак не опустеет. Банк России может доливать валюту из своих резервов. " +
  "Модель качественная: она показывает направления и порядок связей, а не прогноз курса.";
const figure = k.plateHtml({
  fig: "Рис. 1",
  title: "Резервуар рубля",
  hint: "Модель условная · единицы относительные",
  readout: "",
  keys: KEYS,
  caption: CAPTION,
  body: `<div class="iso-stage rr-stage">${svg}</div>`,
});
const header = `<header class="rr-head"><p class="rr-kicker">Как устроен курс</p><h1>Резервуар рубля</h1><p class="rr-lede">Экспорт, импорт, ставка, санкции, бюджетное правило и резервы ЦБ — восемь рычагов одной машины. Крутите ручки или смотрите тур: стрелка на крышке показывает, сколько рублей стоит доллар.</p></header>`;
const body = header + figure.replace('<figcaption class="iso-legend">', `${panel}<figcaption class="iso-legend">`);
const page = `<style>${readFileSync(join(HERE, "ruble.css"), "utf8")}</style><div class="rr">${body}</div>`;
const name = THEME === "light" ? "index.html" : "index-dark.html";
const themeScript = `<script>(function(){try{var m=matchMedia("(prefers-color-scheme: dark)");var set=function(){document.body.dataset.theme=m.matches?"dark":"light"};set();m.addEventListener("change",set)}catch(e){}})();</script>`;
const html = k
  .pageHtml({ title: "Резервуар рубля", theme: THEME, body: page + themeScript, script: kitSource + live, width: 960 })
  .replace('<html lang="en">', '<html lang="ru">')
  .replace("<head>", '<head><meta name="description" content="Механическая модель курса рубля: нефть, ставка, санкции и бюджетное правило как насосы и задвижки одной машины.">');
writeFileSync(join(HERE, name), html);

// версия для публикации как Artifact: без каркаса документа, тема — по настройке зрителя
const ARTIFACT_CSS = `
:root { --rr-page: #f2f2ef; --rr-ink: #57575a; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --rr-page: #0b0b0b; --rr-ink: #a3a3a3; color-scheme: dark; } }
:root[data-theme="dark"] { --rr-page: #0b0b0b; --rr-ink: #a3a3a3; color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; }
body { background: var(--rr-page); color: var(--rr-ink); font: 14px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
#rr-root { background: var(--rr-page); padding-inline: 16px; }
#rr-root .iso-page { width: min(960px, 100%); margin: 0 auto; padding-block: 40px 72px; }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
`;
const themeSync = `<script>(function(){var root=document.documentElement,box=document.getElementById("rr-root");var m=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):null;function set(){var t=root.getAttribute("data-theme");box.setAttribute("data-theme",t==="dark"||t==="light"?t:(m&&m.matches?"dark":"light"))}set();if(m&&m.addEventListener)m.addEventListener("change",set);new MutationObserver(set).observe(root,{attributes:true,attributeFilter:["data-theme"]})})();</script>`;
const artifact =
  `<title>Резервуар рубля</title><style>${ARTIFACT_CSS}${k.ISO_CSS}${readFileSync(join(HERE, "ruble.css"), "utf8")}</style>` +
  `<div class="iso" id="rr-root" data-theme="light"><main class="iso-page">${page}</main></div>${themeSync}` +
  `<script type="module">${(kitSource + live).replace(/<\/(script)/gi, "<\\/$1")}</script>`;
if (THEME === "light") writeFileSync(join(HERE, "artifact.html"), artifact);
console.log("wrote", name, `${items.length} items`);
A.auditOrExit(R, P);
