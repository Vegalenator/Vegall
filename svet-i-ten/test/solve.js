/* Проверка проходимости: бот проходит каждый уровень задуманным решением
   на том же движке, что и игра, и проверяет, что в одиночку ключевые места
   не проходятся.  Запуск: node svet-i-ten/test/solve.js */
const Sim = require('../game.js');
const LEVELS = require('../levels.js');
const { T } = Sim;
const DT = 1 / 120;

function world(i) { return Sim.makeWorld(JSON.parse(JSON.stringify(LEVELS[i]))); }
const blank = () => ({ left: false, right: false, jump: false, jumpHit: false, actHit: false, shadowHit: false });

function tick(W, inp) {
  const i = { luma: { ...blank(), ...(inp.luma || {}) }, nox: { ...blank(), ...(inp.nox || {}) } };
  Sim.step(W, DT, i);
}
function wait(W, sec) { for (let k = 0; k < sec * 120; k++) tick(W, {}); }
const cx = h => h.x + h.w / 2;

function go(W, who, tx, extra = {}, max = 8) {
  const h = W.heroes[who], target = (tx + 0.5) * T;
  for (let k = 0; k < max * 120; k++) {
    const d = target - cx(h);
    if (Math.abs(d) < 3) { wait(W, 0.05); return true; }
    tick(W, { [who]: { right: d > 0, left: d < 0 }, ...extra });
  }
  return false;
}
function jump(W, who, dir, sec = 0.9) {
  const h = W.heroes[who];
  for (let k = 0; k < sec * 120; k++) {
    tick(W, { [who]: { jump: true, jumpHit: k === 0, right: dir > 0, left: dir < 0 } });
    if (k > 10 && h.onGround) break;
  }
  wait(W, 0.1);
}
function press(W, who, key = 'actHit') { tick(W, { [who]: { [key]: true } }); wait(W, 0.05); }
function goPair(W, tx) { go(W, 'luma', tx); go(W, 'nox', tx); }

let fails = 0;
function check(name, ok) {
  console.log((ok ? '  ok   ' : '  FAIL ') + name);
  if (!ok) fails++;
}
const at = (h, col, row) => Math.floor(cx(h) / T) === col && (row === undefined || Math.round((h.y + h.h) / T) === row);

/* ---------- 1. Двор ---------- */
{
  console.log('1 · Двор');
  let W = world(0);
  go(W, 'luma', 8); press(W, 'luma');
  check('фонарь зажёгся', W.lamps[0].on);
  go(W, 'nox', 10);
  check('Нокс не входит в свет', cx(W.heroes.nox) < 10 * T);
  go(W, 'luma', 19);
  check('Люма перешла по световому мосту', at(W.heroes.luma, 19) && !W.heroes.luma.dead);
  go(W, 'nox', 8); press(W, 'nox');
  check('Нокс погасил фонарь', !W.lamps[0].on);
  go(W, 'nox', 19);
  check('Нокс перебежал по остывающему мосту', at(W.heroes.nox, 19, 15) && !W.heroes.nox.dead);

  go(W, 'luma', 21); jump(W, 'luma', 1);
  check('Люма одна не запрыгивает на карниз', (W.heroes.luma.y + W.heroes.luma.h) > 11 * T + 5);
  go(W, 'luma', 20); go(W, 'nox', 21);
  go(W, 'luma', 21); jump(W, 'luma', 0, 1.2);
  check('Люма стоит на плечах Нокса', W.heroes.luma.standOn === W.heroes.nox);
  jump(W, 'luma', 1);
  check('с плеч — на карниз', Math.round((W.heroes.luma.y + W.heroes.luma.h) / T) === 11);
  go(W, 'luma', 23); press(W, 'luma');
  wait(W, 0.6);
  check('рычаг открыл дверь', W.doors[0].open > 0.9);
  go(W, 'luma', 30); go(W, 'nox', 30); wait(W, 0.1);
  check('уровень пройден', W.cleared);
}

/* ---------- 2. Подворотня ---------- */
{
  console.log('2 · Подворотня');
  const W = world(1);
  go(W, 'luma', 5); go(W, 'luma', 2);
  check('Люма не пролезает сквозь решётку', cx(W.heroes.luma) > 5 * T - 2);
  go(W, 'luma', 7);
  go(W, 'nox', 5);
  press(W, 'nox', 'shadowHit');
  go(W, 'nox', 2);
  check('Нокс-тень прошёл сквозь решётку', at(W.heroes.nox, 2));
  press(W, 'nox');
  check('ток выключен', !W.power.P);
  wait(W, 0.5);
  press(W, 'nox', 'shadowHit'); go(W, 'nox', 7);
  go(W, 'luma', 20); go(W, 'nox', 21);
  check('оба перешли по теневому мосту', at(W.heroes.luma, 20, 15) && at(W.heroes.nox, 21, 15));
  wait(W, 0.6);
  check('плита держит дверь', W.doors[0].open > 0.9);
  go(W, 'luma', 30); press(W, 'luma');
  check('Люма погасила фонарь за дверью', !W.lamps[1].on);
  go(W, 'luma', 28); press(W, 'luma');
  check('рычаг защёлкнул дверь', W.doors[0].latched);
  go(W, 'nox', 30); go(W, 'luma', 30); wait(W, 0.1);
  check('уровень пройден', W.cleared);

  const W2 = world(1);
  W2.power.P = false; wait(W2, 0.2);
  go(W2, 'nox', 21); go(W2, 'luma', 22); go(W2, 'luma', 21);
  go(W2, 'luma', 20); go(W2, 'nox', 22); go(W2, 'luma', 21);
  wait(W2, 0.6);
  go(W2, 'nox', 28);
  check('за дверью при свете Нокс не проходит', cx(W2.heroes.nox) < 27 * T);
}

/* ---------- 3. Трамвайные пути ---------- */
{
  console.log('3 · Трамвайные пути');
  const W = world(2);
  go(W, 'nox', 9);
  check('Нокс не входит в свет над мостом', cx(W.heroes.nox) < 8 * T);
  go(W, 'luma', 17); press(W, 'luma');
  check('Люма перешла и погасила фонарь', !W.lamps[0].on && at(W.heroes.luma, 17));
  go(W, 'nox', 18);
  check('Нокс перебежал по остывающему мосту', at(W.heroes.nox, 18, 15));
  go(W, 'nox', 20); jump(W, 'nox', -1);
  check('Нокс один не запрыгивает на настил', Math.round((W.heroes.nox.y + W.heroes.nox.h) / T) === 15);
  go(W, 'nox', 21); go(W, 'luma', 20);
  go(W, 'nox', 20); jump(W, 'nox', 0, 1.2);
  check('Нокс стоит на Люме', W.heroes.nox.standOn === W.heroes.luma);
  jump(W, 'nox', -1);
  check('с Люмы — на настил', Math.round((W.heroes.nox.y + W.heroes.nox.h) / T) === 12);
  press(W, 'nox', 'shadowHit'); go(W, 'nox', 16);
  press(W, 'nox');
  check('ток выключен', !W.power.P);
  wait(W, 1); press(W, 'nox', 'shadowHit'); go(W, 'nox', 19);
  go(W, 'nox', 22); wait(W, 0.3);
  go(W, 'luma', 30); go(W, 'nox', 30); wait(W, 0.1);
  check('уровень пройден', W.cleared);
}

/* ---------- 4. Метро ---------- */
{
  console.log('4 · Метро');
  const W = world(3);
  go(W, 'nox', 10);
  check('неон «М» не пускает Нокса', cx(W.heroes.nox) < 9 * T);
  go(W, 'luma', 20);
  check('Люма прошла турникет при токе', at(W.heroes.luma, 20));
  go(W, 'nox', 6); press(W, 'nox');
  check('ток выключен', !W.power.P);
  go(W, 'nox', 17);
  press(W, 'nox', 'shadowHit'); go(W, 'nox', 20);
  check('Нокс-тень прошёл турникет', at(W.heroes.nox, 20));
  go(W, 'luma', 20); press(W, 'luma');
  check('аварийный свет зажёгся', W.lamps[2].on);
  go(W, 'luma', 30);
  check('Люма перешла провал', at(W.heroes.luma, 30, 15));
  go(W, 'nox', 20); press(W, 'nox');
  go(W, 'nox', 30); wait(W, 0.1);
  check('уровень пройден — оба в поезде', W.cleared);

  const W2 = world(3);
  go(W2, 'nox', 6); press(W2, 'nox'); go(W2, 'luma', 20);
  check('без тока Люму турникет не пускает', cx(W2.heroes.luma) < 18 * T);
}

console.log(fails ? `\n${fails} проверок не прошло` : '\nВсе уровни проходятся');
process.exit(fails ? 1 : 0);
