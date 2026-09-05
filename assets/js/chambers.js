/* ============================================================
   ИСПЫТАНИЯ
   Каждая камера — функция, которая рисует себя внутри сцены
   и сообщает приложению о своём исходе.
   ============================================================ */
window.Chambers = (function () {
  'use strict';
  const Q = window.QUEST;

  /* --- крошечный конструктор разметки --- */
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === false || v === undefined) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'dataset') for (const d in v) n.dataset[d] = v[d];
      else n.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(k => { if (k) n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); });
    return n;
  }
  function head(num, name, title, lede) {
    const out = [
      el('p', { class: 'eyebrow', html: 'Испытание <b>' + num + '</b> · ' + name }),
      el('h1', { class: 'title', html: title })
    ];
    if (lede) out.push(el('p', { class: 'lede', html: lede }));
    return out;
  }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }

  /* ============================================================
     ПОРОГ — распределение
     ============================================================ */
  function gate(host, App) {
    const votes = { g: 0, s: 0, r: 0, h: 0 };
    let step = 0;

    const wrap = el('div', { class: 'chamber' });
    const intro = el('div', { class: 'sorting' });
    wrap.append(
      el('p', { class: 'eyebrow', text: 'Механическая шкатулка · семь испытаний' }),
      el('h1', { class: 'title', html: 'Шкатулка <em>Мракса</em>' }),
      el('p', { class: 'lede', html: 'Латунный ящик, найденный под половицей в лачуге у Литтл-Хэнглтона. Семь замков, ни одной подписи. ' +
        'Открывается он только тому, кто знает эту вселенную не по фильмам. <strong>Прежде чем коснуться крышки — представьтесь.</strong>' }),
      el('hr', { class: 'rule' }),
      intro
    );

    function draw() {
      intro.textContent = '';
      if (step < Q.SORTING.length) {
        const item = Q.SORTING[step];
        intro.append(
          el('div', { class: 'meter' }, [
            el('span', { text: 'Шляпа думает' }),
            el('span', { class: 'meter__track' }, [ el('b', { class: 'meter__fill', style: 'width:' + (step / Q.SORTING.length * 100) + '%' }) ]),
            el('b', { text: (step + 1) + '/' + Q.SORTING.length })
          ]),
          el('p', { class: 'quiz__q', text: item.q }),
          el('div', { class: 'options' }, item.a.map((o, i) =>
            el('button', { class: 'option', type: 'button', onclick: () => { votes[o.h]++; step++; window.Sfx.tap(); draw(); } }, [
              el('span', { class: 'option__key', text: 'АБВГ'[i] }), document.createTextNode(o.t)
            ])
          ))
        );
        if (step === 0) intro.append(el('p', { class: 'hint', text: 'Четыре вопроса. Шляпа не ошибается — она просто иногда прислушивается.' }));
      } else {
        const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a] || Math.random() - .5)[0];
        const H = Q.HOUSES[best];
        App.setHouse(best);
        window.Sfx.seal();
        intro.append(
          el('div', { class: 'plaque' }, [
            el('p', { html: '«Так-так… <em>' + H.name.toUpperCase() + '</em>!»' }),
            el('p', { class: 'lede', text: H.motto })
          ]),
          el('div', { class: 'actions' }, [
            el('button', { class: 'btn', type: 'button', onclick: () => { window.Sfx.open(); App.complete('gate', 0); } }, ['Коснуться крышки']),
            el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => { step = 0; votes.g = votes.s = votes.r = votes.h = 0; draw(); } }, ['Переспросить шляпу'])
          ])
        );
      }
    }
    draw();
    host.appendChild(wrap);
  }

  /* ============================================================
     I. ЗАМОК ГРИНГОТТСА
     ============================================================ */
  function lock(host, App) {
    const D = Q.LOCK;
    const cur = [0, 0, 0];
    const strips = [];
    let opened = false;

    const lockEl = el('div', { class: 'lock' });
    const dials = el('div', { class: 'dials' });

    for (let i = 0; i < 3; i++) {
      const strip = el('div', { class: 'dial__strip' },
        [0,1,2,3,4,5,6,7,8,9].map(d => el('span', { class: 'dial__digit', text: String(d) })));
      strips.push(strip);
      const win = el('div', {
        class: 'dial__window', tabindex: '0', role: 'spinbutton',
        'aria-label': 'Разряд ' + (i + 1), 'aria-valuemin': '0', 'aria-valuemax': '9', 'aria-valuenow': '0',
        onwheel: (e) => { e.preventDefault(); turn(i, e.deltaY > 0 ? 1 : -1); },
        onkeydown: (e) => {
          if (e.key === 'ArrowUp')   { e.preventDefault(); turn(i, -1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); turn(i, 1); }
          if (/^[0-9]$/.test(e.key)) { set(i, +e.key); }
        }
      }, [strip]);
      dials.appendChild(el('div', { class: 'dial' }, [
        el('button', { class: 'dial__btn', type: 'button', 'aria-label': 'Больше', onclick: () => turn(i, -1) }, ['▲']),
        win,
        el('button', { class: 'dial__btn', type: 'button', 'aria-label': 'Меньше', onclick: () => turn(i, 1) }, ['▼'])
      ]));
    }

    function place(i) {
      const h = strips[i].firstChild.getBoundingClientRect().height || 72;
      strips[i].style.transform = 'translateY(' + (-cur[i] * h) + 'px)';
      strips[i].parentNode.setAttribute('aria-valuenow', String(cur[i]));
    }
    function set(i, v) { if (opened) return; cur[i] = (v + 10) % 10; place(i); window.Sfx.click(); }
    function turn(i, d) { set(i, cur[i] + d); }

    const verdict = el('div');
    const btn = el('button', { class: 'btn', type: 'button', onclick: check }, ['Повернуть засов']);

    function check() {
      if (opened) return;
      if (cur.join('') === D.code.join('')) {
        opened = true;
        lockEl.classList.add('opened');
        window.Sfx.unlock();
        window.Fx.burstOn(dials, '240,214,138', 60);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--ok', html: '<span><b>713.</b> ' + D.solved + '</span>' }));
        btn.remove();
        App.finishLater('lock', () => App.complete('lock', D.award));
      } else {
        window.Sfx.wrong();
        window.Fx.shake(lockEl);
        App.miss('lock', D.missCost);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html: '<span>Засов не поддался. Гоблин за спиной делает пометку в книге. <b>−' + D.missCost + '</b></span>' }));
      }
    }

    lockEl.append(dials, el('div', { class: 'lock__aside' }, [
      el('div', { class: 'plaque plaque--riddle' }, [
        el('span', { class: 'plaque__mark', text: '❦' }),
        el('p', { text: D.riddle })
      ]),
      el('p', { class: 'hint', text: D.ask })
    ]));

    const wrap = el('div', { class: 'chamber' });
    wrap.append(...head('I', 'Замок Гринготтса', 'Три цифры, <em>одно</em> хранилище'), el('hr', { class: 'rule' }), lockEl, verdict,
      el('div', { class: 'actions' }, [btn, el('div', { class: 'actions__spacer' })]));
    host.appendChild(wrap);
    strips.forEach((_, i) => place(i));
    App.onResize = () => strips.forEach((_, i) => place(i));
    App.currentHint = () => { App.spendHint('lock', D.hintCost); verdict.textContent = ''; verdict.appendChild(el('div', { class: 'verdict', text: D.hint })); };
    App.currentSolve = () => { cur[0] = 7; cur[1] = 1; cur[2] = 3; strips.forEach((_, i) => place(i)); check(); };
  }

  /* ============================================================
     II. ЭКЗАМЕН ЖАБА
     ============================================================ */
  function quiz(host, App) {
    const D = Q.QUIZ;
    let idx = 0, points = 0, answered = false, left = D.seconds, timer = null;

    const tally = el('div', { class: 'tally' }, D.items.map(() => el('i')));
    const bar = el('b', { class: 'timer__fill', style: 'width:100%' });
    const clock = el('span', { text: D.seconds + ' с' });
    const timerEl = el('div', { class: 'timer' }, [
      el('span', { text: 'Перо пишет' }),
      el('span', { class: 'timer__track' }, [bar]), clock
    ]);
    const qEl = el('p', { class: 'quiz__q' });
    const opts = el('div', { class: 'options' });
    const why = el('div');
    const next = el('button', { class: 'btn', type: 'button', onclick: advance }, ['Следующий вопрос']);
    next.style.visibility = 'hidden';

    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    App.cleanup = stop;

    function run() {
      stop(); left = D.seconds; bar.style.width = '100%'; timerEl.classList.remove('timer--urgent');
      let lastWhole = D.seconds;
      timer = setInterval(() => {
        left = Math.max(0, left - 0.1);
        bar.style.width = (left / D.seconds * 100) + '%';
        const whole = Math.ceil(left);
        if (whole !== lastWhole) {
          lastWhole = whole;
          clock.textContent = whole + ' с';
          if (whole <= 5 && whole > 0) window.Sfx.tick();
        }
        if (left <= 5) timerEl.classList.add('timer--urgent');
        if (left <= 0) { stop(); pick(-1); }
      }, 100);
    }

    function draw() {
      answered = false;
      const it = D.items[idx];
      qEl.textContent = it.q;
      why.textContent = '';
      next.style.visibility = 'hidden';
      opts.textContent = '';
      it.a.forEach((t, i) => opts.appendChild(
        el('button', { class: 'option', type: 'button', onclick: () => pick(i) }, [
          el('span', { class: 'option__key', text: 'АБВГ'[i] }), document.createTextNode(t)
        ])
      ));
      run();
    }

    function pick(i) {
      if (answered) return;
      answered = true; stop();
      const it = D.items[idx];
      const right = i === it.c;
      const bonus = right ? Math.round(D.speedBonus * (left / D.seconds)) : 0;
      if (right) { points += D.perQuestion + bonus; window.Sfx.right(); }
      else { window.Sfx.wrong(); }
      tally.children[idx].className = right ? 'ok' : 'no';

      Array.prototype.forEach.call(opts.children, (b, j) => {
        b.disabled = true;
        if (j === it.c) b.classList.add('option--right');
        else if (j === i) b.classList.add('option--wrong');
        else b.classList.add('option--faded');
      });
      why.textContent = '';
      why.appendChild(el('div', { class: 'verdict ' + (right ? 'verdict--ok' : 'verdict--no'), html:
        '<span>' + (right
          ? '<b>Верно.</b> ' + (bonus ? '+' + (D.perQuestion + bonus) + ' баллов, из них ' + bonus + ' за скорость. ' : '+' + D.perQuestion + ' баллов. ')
          : (i === -1 ? '<b>Перо остановилось.</b> ' : '<b>Мимо.</b> ')) + it.why + '</span>' }));
      next.style.visibility = 'visible';
      next.textContent = idx === D.items.length - 1 ? 'Закрыть пергамент' : 'Следующий вопрос';
      App.save();
    }

    function advance() {
      idx++;
      if (idx >= D.items.length) {
        stop();
        window.Sfx.seal();
        App.complete('quiz', points);
      } else draw();
    }

    App.currentHint = () => {
      if (answered) return;
      App.spendHint('quiz', 10);
      const it = D.items[idx];
      const wrongs = it.a.map((_, i) => i).filter(i => i !== it.c);
      const drop = shuffle(wrongs).slice(0, 2);
      drop.forEach(i => { opts.children[i].disabled = true; opts.children[i].classList.add('option--faded'); });
      App.toast('Акцио убрало два неверных варианта. −10');
    };
    App.currentSolve = () => { if (!answered) pick(D.items[idx].c); };

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('II', 'Экзамен ЖАБА', 'Десять вопросов <em>без</em> права на паузу',
        'На каждый вопрос — 25 секунд. Кто отвечает быстрее, получает больше: перо ценит уверенность.'),
      el('hr', { class: 'rule' }), timerEl, qEl, opts, why,
      el('div', { class: 'actions' }, [next, el('div', { class: 'actions__spacer' }), tally])
    );
    host.appendChild(wrap);
    draw();
  }

  /* ============================================================
     III. СЕМЬ СКЛЯНОК
     ============================================================ */
  const MARKS = ['—', 'ЯД', 'ВИНО', 'ВПЕРЁД', 'НАЗАД'];

  function vialSvg(shape, size) {
    const w = Math.round(62 * size), h = Math.round(130 * size);
    const body = {
      flask:  'M16 6h14v22l12 46a10 10 0 0 1-9 14H13a10 10 0 0 1-9-14l12-46z',
      carboy: 'M17 6h12v16c14 6 18 18 18 32 0 20-10 30-24 30S-1 74-1 54c0-14 4-26 18-32z',
      vial:   'M17 6h12v20l7 30c2 9-4 16-13 16s-15-7-13-16l7-30z',
      phial:  'M15 6h16v18l9 34c2 10-5 18-17 18S4 68 6 58l9-34z',
      round:  'M18 6h10v14c15 5 21 17 21 30 0 18-12 30-26 30S-3 68-3 50c0-13 6-25 21-30z'
    }[shape] || 'M16 6h14v22l12 46a10 10 0 0 1-9 14H13a10 10 0 0 1-9-14l12-46z';
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '-6 0 58 108');
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(ns, 'g');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', body);
    p.setAttribute('class', 'vial__body');
    p.setAttribute('fill', 'rgba(30,60,52,.55)');
    p.setAttribute('stroke', '#b8892f88');
    p.setAttribute('stroke-width', '1.6');
    const cork = document.createElementNS(ns, 'rect');
    cork.setAttribute('x', '13'); cork.setAttribute('y', '0');
    cork.setAttribute('width', '20'); cork.setAttribute('height', '9');
    cork.setAttribute('rx', '2'); cork.setAttribute('fill', '#6b4a24');
    const shine = document.createElementNS(ns, 'path');
    shine.setAttribute('d', 'M12 34c-3 10-4 22-2 32');
    shine.setAttribute('stroke', '#f0d68a55'); shine.setAttribute('stroke-width', '3');
    shine.setAttribute('fill', 'none'); shine.setAttribute('stroke-linecap', 'round');
    g.append(p, cork, shine);
    svg.appendChild(g);
    return svg;
  }

  function bottles(host, App) {
    const D = Q.BOTTLES;
    let chosen = -1;
    const marks = D.shelf.map(() => 0);
    const dead = D.shelf.map(() => false);

    const shelf = el('div', { class: 'shelf' });
    const glasses = [];
    D.shelf.forEach((b, i) => {
      const glass = el('button', {
        class: 'vial', type: 'button', 'aria-pressed': 'false',
        'aria-label': 'Склянка ' + b.label,
        onclick: () => {
          if (dead[i]) return;
          chosen = chosen === i ? -1 : i;
          glasses.forEach((g, j) => g.setAttribute('aria-pressed', String(j === chosen)));
          sip.disabled = chosen < 0;
          window.Sfx.tap();
        }
      }, [vialSvg(b.shape, b.size)]);
      glasses.push(glass);
      const tag = el('button', {
        class: 'vial__tag', type: 'button', 'aria-label': 'Пометить склянку ' + b.label,
        text: MARKS[0],
        onclick: () => { marks[i] = (marks[i] + 1) % MARKS.length; tag.textContent = MARKS[marks[i]]; tag.classList.toggle('on', marks[i] > 0); window.Sfx.click(); }
      });
      shelf.appendChild(el('div', { class: 'vial-wrap' }, [glass, tag]));
    });

    const clues = el('ol', { class: 'clues' }, D.clues.map(c => el('li', { text: c })));
    const verdict = el('div');
    const sip = el('button', { class: 'btn', type: 'button', disabled: true, onclick: drink }, ['Испить из выбранной']);

    function drink() {
      if (chosen < 0) return;
      const b = D.shelf[chosen];
      verdict.textContent = '';
      if (b.kind === 'forward') {
        window.Sfx.unlock();
        window.Fx.burstOn(glasses[chosen], '143,224,192', 50);
        verdict.appendChild(el('div', { class: 'verdict verdict--ok', html:
          '<span><b>Пламя расступается.</b> Самая маленькая склянка — единственная, где не могло быть ни яда, ни вина: подсказка о размерах отсекает яд, а первая подсказка не оставляет ей места среди вина. Проход открыт.</span>' }));
        sip.remove();
        App.finishLater('bottles', () => App.complete('bottles', D.award));
      } else if (b.kind === 'back') {
        window.Sfx.wrong();
        App.miss('bottles', Math.round(D.missCost / 2));
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span><b>Вас выбрасывает назад.</b> Эта склянка ведёт в обратную сторону — сквозь чёрное пламя, туда, откуда вы пришли. Возвращайтесь. <b>−' + Math.round(D.missCost / 2) + '</b></span>' }));
      } else if (b.kind === 'wine') {
        window.Sfx.wrong();
        App.miss('bottles', Math.round(D.missCost / 2));
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span><b>Крапивное вино.</b> Безвредно и совершенно бесполезно — кроме одного: теперь вы знаете, что слева от него стоит яд. <b>−' + Math.round(D.missCost / 2) + '</b></span>' }));
      } else {
        window.Sfx.wrong();
        window.Fx.shake(shelf);
        dead[chosen] = true;
        glasses[chosen].parentNode.classList.add('vial--dead');
        App.miss('bottles', D.missCost);
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span><b>Яд.</b> В настоящем испытании Снегга второго глотка не бывает. Здесь склянка просто исчезает с полки. <b>−' + D.missCost + '</b></span>' }));
      }
      chosen = -1;
      glasses.forEach(g => g.setAttribute('aria-pressed', 'false'));
      sip.disabled = true;
      App.save();
    }

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('III', 'Семь склянок', 'Логика <em>сильнее</em> магии',
        'На столе семь склянок и свиток. Магии в этой комнате нет вовсе — только пять утверждений, из которых следует ровно один ответ.'),
      el('hr', { class: 'rule' }),
      el('div', { class: 'plaque plaque--riddle' }, [
        el('span', { class: 'plaque__mark', text: '☙' }),
        ...D.verse.map(v => el('p', { text: v }))
      ]),
      shelf,
      el('p', { class: 'hint', text: 'Щёлкните по стеклу, чтобы выбрать склянку. Щёлкните по подписи под ней, чтобы оставить пометку мелом.' }),
      clues, verdict,
      el('div', { class: 'actions' }, [sip, el('div', { class: 'actions__spacer' })])
    );
    host.appendChild(wrap);

    App.currentHint = () => {
      App.spendHint('bottles', D.hintCost);
      clues.children[3].classList.add('struck');
      verdict.textContent = '';
      verdict.appendChild(el('div', { class: 'verdict', text: D.hint }));
    };
    App.currentSolve = () => { chosen = 2; drink(); };
  }

  /* ============================================================
     IV. КАРТА МАРОДЁРОВ
     ============================================================ */
  function mapInk() {
    return '<svg viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">' +
      '<g fill="none" stroke="currentColor" stroke-width="1.4" opacity=".55">' +
      '<path d="M30 200V70l40-28 40 28v130"/><path d="M110 130h70V60h60v70h70V200"/>' +
      '<path d="M310 130l30-22 30 22v70"/><path d="M70 42V16M340 108V70M240 60V22"/>' +
      '<path d="M30 200h340" stroke-width="2.2"/>' +
      '<path d="M150 200v-40h30v40M250 200v-30h34v30"/>' +
      '<path d="M96 96h-52M96 130h-52M96 164h-52" stroke-dasharray="4 6"/>' +
      '<path d="M304 96h52M304 164h52" stroke-dasharray="4 6"/>' +
      '<circle cx="70" cy="16" r="7"/><circle cx="240" cy="22" r="7"/><circle cx="340" cy="70" r="7"/>' +
      '<path d="M180 96l30 34-30 34" stroke-dasharray="3 5"/>' +
      '</g>' +
      '<g fill="currentColor" opacity=".45" font-size="9" font-family="Caveat, cursive" letter-spacing="1">' +
      '<text x="36" y="64">Западная башня</text><text x="150" y="52">Северная башня</text>' +
      '<text x="300" y="62">Совятня</text><text x="120" y="152">Большой зал</text>' +
      '<text x="238" y="122">Библиотека</text><text x="40" y="192">Подземелья</text>' +
      '<text x="250" y="192">Двор</text><text x="300" y="150">Гриффиндорская башня</text>' +
      '</g></svg>';
  }

  function map(host, App) {
    const D = Q.MAP;
    let solved = false;

    const board = el('div', { class: 'map' });
    const veil = el('div', { class: 'map__veil' });
    const names = el('div', { class: 'map__names' });
    const verdict = el('div');

    D.marks.forEach(m => {
      const b = el('button', {
        class: 'mark', type: 'button', style: 'left:' + m.x + '%;top:' + m.y + '%',
        onclick: () => choose(m, b)
      }, [
        el('span', { class: 'mark__feet', text: '· ·' }),
        document.createTextNode(m.name)
      ]);
      names.appendChild(b);
    });

    function lightAt(x, y) {
      veil.style.background =
        'radial-gradient(circle 128px at ' + x + 'px ' + y + 'px, rgba(10,8,6,0) 0%, rgba(10,8,6,0) 42%, rgba(10,8,6,.86) 76%, #0a0806 100%)';
    }

    board.addEventListener('pointermove', (e) => {
      const r = board.getBoundingClientRect();
      lightAt(e.clientX - r.left, e.clientY - r.top);
    });
    board.addEventListener('pointerleave', () => {
      const r = board.getBoundingClientRect();
      lightAt(r.width / 2, r.height / 2);
    });

    function choose(m, btn) {
      if (solved) return;
      if (m.id === D.answer) {
        solved = true;
        btn.classList.add('mark--found');
        veil.style.opacity = '0';
        window.Sfx.unlock();
        window.Fx.burstOn(btn, '212,98,42', 50);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--ok', html: '<span>' + D.solved + '</span>' }));
        App.finishLater('map', () => App.complete('map', D.award));
      } else {
        btn.classList.add('mark--wrong');
        window.Sfx.wrong();
        App.miss('map', D.missCost);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span>' + (D.misses[m.id] || D.misses.other) + ' <b>−' + D.missCost + '</b></span>' }));
      }
    }

    board.append(el('div', { class: 'map__paper' }), el('div', { class: 'map__ink', html: mapInk() }), names, veil);

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('IV', 'Карта Мародёров', 'Торжественно клянусь, что <em>замышляю</em> шалость', D.task),
      el('hr', { class: 'rule' }), board,
      el('div', { class: 'map__legend' }, [
        el('span', { text: 'Ведите палочкой по пергаменту — свет проявляет имена. На касании работает так же.' }),
        el('span', { class: 'map__oath', text: 'Шалость удалась.' })
      ]),
      verdict, el('div', { class: 'actions' })
    );
    host.appendChild(wrap);
    requestAnimationFrame(() => { const r = board.getBoundingClientRect(); lightAt(r.width / 2, r.height / 2); });

    App.currentHint = () => {
      App.spendHint('map', D.hintCost);
      verdict.textContent = '';
      verdict.appendChild(el('div', { class: 'verdict', text: D.hint }));
    };
    App.currentSolve = () => {
      const t = D.marks.find(m => m.id === D.answer);
      choose(t, names.children[D.marks.indexOf(t)]);
    };
  }

  /* ============================================================
     V. ИМЯ НА КРЫШКЕ
     ============================================================ */
  function anagram(host, App) {
    const D = Q.ANAGRAM;
    const letters = shuffle(D.source.split(''));
    const placed = [];          /* индексы исходных плиток по слотам */
    let solved = false;

    const src = el('div', { class: 'source' });
    const slots = el('div', { class: 'slots' });
    const board = el('div', { class: 'anagram' });
    const verdict = el('div');

    const tiles = letters.map((ch, i) => el('button', {
      class: 'tile', type: 'button', text: ch, dataset: { i: i },
      onclick: () => put(i)
    }));
    tiles.forEach(t => src.appendChild(t));

    const slotEls = [];
    D.layout.forEach((ch) => {
      if (ch === ' ') { slots.appendChild(el('span', { class: 'slots__gap' })); return; }
      if (ch === '-') { slots.appendChild(el('span', { class: 'tile tile--fixed', text: '–' })); return; }
      const s = el('button', { class: 'tile tile--slot', type: 'button', text: '', onclick: () => pull(slotEls.indexOf(s)) });
      slotEls.push(s); slots.appendChild(s);
      placed.push(-1);
    });

    function put(i) {
      if (solved || tiles[i].classList.contains('tile--used')) return;
      const free = placed.indexOf(-1);
      if (free < 0) return;
      placed[free] = i;
      slotEls[free].textContent = letters[i];
      slotEls[free].classList.add('filled');
      tiles[i].classList.add('tile--used');
      window.Sfx.click();
      if (placed.indexOf(-1) < 0) check();
    }
    function pull(s) {
      if (solved || s < 0 || placed[s] < 0) return;
      tiles[placed[s]].classList.remove('tile--used');
      placed[s] = -1;
      slotEls[s].textContent = '';
      slotEls[s].classList.remove('filled');
      window.Sfx.tap();
    }
    function clear() { for (let s = placed.length - 1; s >= 0; s--) pull(s); verdict.textContent = ''; }

    function check() {
      const word = placed.map(i => letters[i]).join('');
      if (word === D.target) {
        solved = true;
        board.classList.add('solved');
        window.Sfx.seal();
        window.Fx.burstOn(slots, '212,98,42', 70);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--ok', html: '<span>' + D.solved + '</span>' }));
        App.finishLater('anagram', () => App.complete('anagram', D.award));
      } else {
        window.Sfx.wrong();
        window.Fx.shake(slots);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span>Буквы те же, порядок не тот. Штрафа нет — но и крышка не двинулась.</span>' }));
      }
    }

    board.append(
      el('p', { class: 'eyebrow', text: D.sourceView }),
      src,
      el('p', { class: 'hint', text: 'Щёлкните по букве, чтобы поставить её в следующую свободную ячейку. Щёлкните по ячейке, чтобы вернуть букву.' }),
      slots
    );

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('V', 'Имя на крышке', 'Пятнадцать букв, <em>два</em> имени', D.intro + ' ' + D.ask),
      el('hr', { class: 'rule' }), board, verdict,
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn--ghost', type: 'button', onclick: clear }, ['Стереть'])
      ])
    );
    host.appendChild(wrap);

    App.currentHint = () => {
      App.spendHint('anagram', D.hintCost);
      verdict.textContent = '';
      verdict.appendChild(el('div', { class: 'verdict', text: D.hint }));
    };
    App.currentSolve = () => {
      clear();
      D.target.split('').forEach(ch => {
        const i = tiles.findIndex(t => t.textContent === ch && !t.classList.contains('tile--used'));
        if (i >= 0) put(i);
      });
    };
  }

  /* ============================================================
     VI. СЕМЬ ОСКОЛКОВ
     ============================================================ */
  function horcruxes(host, App) {
    const D = Q.HORCRUXES;
    let pickLeft = null, pickLeftBtn = null, linked = 0, points = 0;

    const left = el('div', { class: 'pairs__col' });
    const right = el('div', { class: 'pairs__col' });
    const ledger = el('ul', { class: 'ledger' });
    const verdict = el('div');

    const rights = {};
    shuffle(D.items).forEach(it => {
      const b = el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => {
        if (b.classList.contains('chip--linked')) return;
        if (pickLeftBtn) pickLeftBtn.setAttribute('aria-pressed', 'false');
        if (pickLeft === it.id) { pickLeft = null; pickLeftBtn = null; return; }
        pickLeft = it.id; pickLeftBtn = b; b.setAttribute('aria-pressed', 'true'); window.Sfx.tap();
      } }, [document.createTextNode(it.t), el('small', { text: it.s })]);
      left.appendChild(b);
    });
    shuffle(D.hands).forEach(hn => {
      const b = el('button', { class: 'chip', type: 'button', onclick: () => tryLink(hn, b) }, [
        document.createTextNode(hn.t), el('small', { text: hn.s })
      ]);
      rights[hn.id] = b;
      right.appendChild(b);
    });

    function tryLink(hn, btn) {
      if (!pickLeft) { App.toast('Сначала выберите крестраж в левом столбце.'); return; }
      if (hn.id === pickLeft) {
        btn.classList.add('chip--linked');
        pickLeftBtn.classList.add('chip--linked');
        pickLeftBtn.setAttribute('aria-pressed', 'false');
        linked++; points += D.perPair;
        window.Sfx.right();
        window.Fx.burstOn(btn, '95,174,149', 26);
        ledger.appendChild(el('li', { html: '<span>' + D.notes[hn.id] + '</span>' }));
        pickLeft = null; pickLeftBtn = null;
        prog.style.width = (linked / D.items.length * 100) + '%';
        count.textContent = linked + '/' + D.items.length;
        if (linked === D.items.length) {
          window.Sfx.seal();
          verdict.textContent = '';
          verdict.appendChild(el('div', { class: 'verdict verdict--ok', html:
            '<span><b>Семь из семи.</b> Осталась только змея в клетке из воздуха — и мальчик, который сам об этом не знал.</span>' }));
          App.finishLater('horcruxes', () => App.complete('horcruxes', points));
        }
      } else {
        window.Sfx.wrong();
        btn.classList.add('wrong');
        setTimeout(() => btn.classList.remove('wrong'), 420);
        App.miss('horcruxes', D.missCost);
        verdict.textContent = '';
        verdict.appendChild(el('div', { class: 'verdict verdict--no', html:
          '<span>Не та рука. <b>−' + D.missCost + '</b></span>' }));
      }
      App.save();
    }

    const prog = el('b', { class: 'meter__fill', style: 'width:0%' });
    const count = el('b', { text: '0/' + D.items.length });

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('VI', 'Семь осколков', 'Кто, чем и <em>в каком</em> порядке', D.task),
      el('hr', { class: 'rule' }),
      el('div', { class: 'meter' }, [el('span', { text: 'Уничтожено' }), el('span', { class: 'meter__track' }, [prog]), count]),
      el('div', { class: 'pairs' }, [
        el('div', {}, [el('p', { class: 'pairs__head', text: 'Крестраж' }), left]),
        el('div', {}, [el('p', { class: 'pairs__head', text: 'Рука и оружие' }), right])
      ]),
      verdict, ledger, el('div', { class: 'actions' })
    );
    host.appendChild(wrap);

    App.currentHint = () => {
      App.spendHint('horcruxes', 20);
      verdict.textContent = '';
      verdict.appendChild(el('div', { class: 'verdict', text: D.hint }));
    };
    App.currentSolve = () => {
      D.items.forEach(it => {
        if (rights[it.id].classList.contains('chip--linked')) return;
        pickLeft = it.id;
        pickLeftBtn = Array.prototype.find.call(left.children, b => b.firstChild.textContent === it.t);
        tryLink(D.hands.find(h => h.id === it.id), rights[it.id]);
      });
    };
  }

  /* ============================================================
     VII. ЗЕРКАЛО ЕИНАЛЕЖ — финал
     ============================================================ */
  function mirror(host, App) {
    const s = App.state;
    const total = s.score;
    const rank = Q.RANKS.find(r => total >= r.min) || Q.RANKS[Q.RANKS.length - 1];
    const H = Q.HOUSES[s.house] || { name: 'без факультета' };
    const mins = Math.floor(s.elapsed / 60000), secs = Math.floor(s.elapsed / 1000) % 60;
    const timeStr = mins + ' мин ' + String(secs).padStart(2, '0') + ' с';
    const misses = Object.keys(s.log).reduce((n, k) => n + (s.log[k].misses || 0), 0);
    const hints = Object.keys(s.log).reduce((n, k) => n + (s.log[k].hints || 0), 0);

    const rows = Q.CHAMBERS.filter(c => c.id !== 'gate' && c.id !== 'mirror').map(c => {
      const l = s.log[c.id] || {};
      return el('li', {}, [
        document.createTextNode(c.num + '. ' + c.name),
        el('span'),
        el('b', { text: (l.points != null ? l.points : 0) + ' б.' })
      ]);
    });

    function summary() {
      return 'Шкатулка Мракса — ' + rank.t + '\n' +
        H.name + ' · ' + total + ' баллов · ' + timeStr + '\n' +
        'Ошибок: ' + misses + ', подсказок: ' + hints;
    }

    const wrap = el('div', { class: 'chamber' });
    wrap.append(
      ...head('VII', 'Зеркало Еиналеж', 'Оно показывает не будущее, а <em>вас</em>',
        'Счастливейший человек на свете увидел бы в нём себя таким, какой он есть. Вам оно показывает итог семи испытаний — это, конечно, не одно и то же.'),
      el('div', { class: 'mirror' }, [
        el('p', { class: 'mirror__inscription', text: 'ЕИНАЛЕЖ ЕОНТЕЗДЕС ЕИНЕЛВОРТСОП ЕН АЦИЛ ОГЕШАВ ОН ЕЦДРЕС' }),
        el('h2', { class: 'rank', text: rank.t }),
        el('p', { class: 'lede', text: rank.d }),
        el('div', { class: 'scores' }, [
          el('div', {}, [el('b', { text: String(total) }), el('span', { text: 'баллов' })]),
          el('div', {}, [el('b', { text: timeStr }), el('span', { text: 'в шкатулке' })]),
          el('div', {}, [el('b', { text: String(misses) }), el('span', { text: 'ошибок' })]),
          el('div', {}, [el('b', { text: String(hints) }), el('span', { text: 'подсказок' })])
        ])
      ]),
      el('p', { class: 'lede', html: 'Факультет: <strong>' + H.name + '</strong>. ' +
        'Крышка закрывается сама — и щёлкает всеми семью замками разом. Внутри снова пусто.' }),
      el('hr', { class: 'rule' }),
      el('ul', { class: 'ledger' }, rows),
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn', type: 'button', onclick: () => {
          navigator.clipboard && navigator.clipboard.writeText(summary())
            .then(() => App.toast('Результат скопирован в буфер обмена.'))
            .catch(() => App.toast(summary()));
        } }, ['Скопировать результат']),
        el('button', { class: 'btn btn--ghost', type: 'button', onclick: () => App.reset(true) }, ['Пройти заново'])
      ])
    );
    host.appendChild(wrap);
    window.Fx.patronus(5000);
    App.currentHint = () => App.toast('Здесь подсказки уже не нужны.');
    App.currentSolve = null;
  }

  return { gate, lock, quiz, bottles, map, anagram, horcruxes, mirror, el };
})();
