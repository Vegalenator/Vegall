// Модель «Резервуара рубля». Условная, не прогноз: показывает знаки и порядок связей.
// h — уровень в главном резервуаре (0…1), n — уровень в баке ФНБ (0…1).
export const CUTOFF = 59; // цена отсечения по бюджетному правилу, $/барр
export const RANGE = { oil: [30, 120], rate: [5, 25], sanc: [0, 100] };
export const START = { oil: 62, rate: 16, sanc: 40 };
export const LEVEL0 = 0.6;
export const FUND0 = 0.55;

const K_EXPORT = 1;
const K_IMPORT = 0.87;
const K_CAPITAL = 0.383;
const K_MINFIN = 0.012;
const AREA = 1.7;
const AREA_FUND = 10;

export const openingOf = (rate) => Math.max(0.3, 1 - 0.015 * (rate - 5)); // задвижки слива: выше ставка — уже щель
export const throttleOf = (sanc) => 1 - 0.0045 * sanc; // санкционная задвижка на притоке
export const rubOf = (h) => 140 - 95 * h; // ₽ за $ по уровню

export function flowsOf({ oil, rate, sanc }, h, n) {
  const exp = K_EXPORT * (oil / 60) * throttleOf(sanc);
  let minfin = K_MINFIN * (oil - CUTOFF); // > 0 — Минфин покупает валюту в ФНБ
  if (minfin < 0 && n <= 0.001) minfin = 0;
  if (minfin > 0 && n >= 0.999) minfin = 0;
  const open = openingOf(rate);
  const root = Math.sqrt(Math.max(0, h));
  return { exp, minfin, imp: K_IMPORT * open * root, cap: K_CAPITAL * open * root, open };
}

export function step(state, input, dt) {
  const f = flowsOf(input, state.h, state.n);
  state.h = Math.min(1, Math.max(0, state.h + ((f.exp - f.minfin - f.imp - f.cap) / AREA) * dt));
  state.n = Math.min(1, Math.max(0, state.n + (f.minfin / AREA_FUND) * dt));
  return f;
}

// равновесный уровень при полном ФНБ (для подписи и проверки)
export function balanceOf(input) {
  const f = flowsOf(input, 1, 0.5);
  const net = f.exp - f.minfin;
  const out = f.imp + f.cap;
  return Math.min(1, Math.max(0, (net / out) ** 2));
}
