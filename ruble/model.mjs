// Модель «Резервуара рубля». Условная, не прогноз: показывает знаки и порядок связей.
// h — уровень в главном резервуаре (0…1), n — бак ФНБ (0…1), c — резервы ЦБ (0…1).
export const RANGE = {
  oil: [30, 120], // цена Urals, $/барр
  vol: [50, 150], // физический объём экспорта, % от текущего
  sanc: [0, 100], // санкционное трение, %
  dem: [50, 150], // спрос на импорт, % от текущего
  rate: [5, 25], // ключевая ставка, %
  cutoff: [40, 80], // цена отсечения бюджетного правила, $/барр
  mscale: [0, 200], // операции Минфина, % от объёма по правилу
  cb: [0, 100], // продажи валюты из резервов ЦБ, % от максимума
};
export const START = { oil: 62, vol: 100, sanc: 40, dem: 100, rate: 16, cutoff: 59, mscale: 100, cb: 0 };
export const LEVEL0 = 0.6;
export const FUND0 = 0.55;
export const RESERVE0 = 0.8;

const K_EXPORT = 1;
const K_IMPORT = 1.124;
const K_CAPITAL = 0.495;
const K_MINFIN = 0.012;
const K_CB = 0.2;
const AREA = 3;
const AREA_FUND = 10;
const AREA_RESERVE = 12;

export const openingOf = (rate) => Math.max(0.3, 1 - 0.015 * (rate - 5)); // задвижки слива: выше ставка — уже щель
export const throttleOf = (sanc) => 1 - 0.0045 * sanc; // санкционная задвижка на притоке
export const rubOf = (h) => 140 - 95 * h; // ₽ за $ по уровню

export function flowsOf(x, h, n, c = 1) {
  const exp = K_EXPORT * (x.oil / 60) * (x.vol / 100) * throttleOf(x.sanc);
  let minfin = K_MINFIN * (x.mscale / 100) * (x.oil - x.cutoff); // > 0 — Минфин покупает валюту в ФНБ
  if (minfin < 0 && n <= 0.001) minfin = 0;
  if (minfin > 0 && n >= 0.999) minfin = 0;
  const cb = c > 0.001 ? K_CB * (x.cb / 100) : 0; // продажи из резервов ЦБ
  const open = openingOf(x.rate);
  const head = Math.max(0, h); // слив растёт с напором
  return { exp, minfin, cb, imp: K_IMPORT * open * (x.dem / 100) * head, cap: K_CAPITAL * open * head, open };
}

export function step(state, input, dt) {
  const f = flowsOf(input, state.h, state.n, state.c);
  state.h = Math.min(1, Math.max(0, state.h + ((f.exp + f.cb - f.minfin - f.imp - f.cap) / AREA) * dt));
  state.n = Math.min(1, Math.max(0, state.n + (f.minfin / AREA_FUND) * dt));
  state.c = Math.min(1, Math.max(0, state.c - (f.cb / AREA_RESERVE) * dt));
  return f;
}

// равновесный уровень при непустых баках (для проверки калибровки)
export function balanceOf(input) {
  const f = flowsOf(input, 1, 0.5, 1);
  return Math.min(1, Math.max(0, (f.exp + f.cb - f.minfin) / (f.imp + f.cap)));
}
