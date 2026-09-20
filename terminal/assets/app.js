/* =========================================================================
   Терминал ИИ-цикла — сборка экранов.
   Данные берутся из data/*.js (глобальные объекты VG_*), поэтому файл
   открывается и по file://, и с сервера, и внутри артефакта.
   ========================================================================= */
(function () {
  'use strict';

  var M = window.VG_META, LAYERS = window.VG_LAYERS, CO = window.VG_COMPANIES,
      IND = window.VG_INDICATORS, GROUPS = window.VG_GROUPS, SCEN = window.VG_SCENARIOS,
      RU = window.VG_RUSSIA, EN = window.VG_ENERGY;

  /* ------------------------------------------------------------ утилиты */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function num(v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('ru-RU', { minimumFractionDigits: d == null ? 1 : d, maximumFractionDigits: d == null ? 1 : d });
  }
  function badge(kind) {
    var k = M.kinds[kind]; if (!k) return '';
    return '<span class="badge ' + kind + '" title="' + esc(k.hint) + '">' + esc(k.label) + '</span>';
  }
  function srcref(code) {
    if (!code) return '';
    if (Array.isArray(code)) return code.map(srcref).join(' ');
    var s = M.sources[code]; if (!s) return '';
    var t = s.org + ' — ' + s.title + ', ' + s.date + (s.generic ? '. Ссылка ведёт на общую страницу организации, прямого документа нет' : '');
    return '<button class="src' + (s.generic ? ' generic' : '') + '" type="button" data-src="' + code + '" title="' + esc(t) + '">' + code + (s.generic ? '*' : '') + '</button>';
  }
  function refs(o) { return srcref(o.srcs || o.src); }
  var STATE_LABELS = { ok: 'Норма', watch: 'Наблюдение', stress: 'Стресс-сигнал', nodata: 'Нет публичного ряда' };
  function stateEl(state) {
    return '<span class="st st-' + state + '"><i></i>' + STATE_LABELS[state] + '</span>';
  }
  function pct(v) { return Math.max(0, Math.min(100, v)); }

  /* горизонтальные столбики: значения подписаны прямо у столбика */
  function bars(rows, max, cls) {
    return '<div class="chart">' + rows.map(function (r) {
      var w = pct(r.v / max * 100);
      return '<div class="chartrow"><div class="nm">' + esc(r.name) + '</div>' +
        '<div class="track"><div class="mark ' + (cls || 'a') + '" style="width:' + w.toFixed(1) + '%">' +
        '<span>' + esc(r.label) + '</span></div></div></div>';
    }).join('') + '</div>';
  }

  /* столбики с нулевой осью посередине */
  function divBars(rows, min, max) {
    var span = max - min, zero = (0 - min) / span * 100;
    return '<div class="chart">' + rows.map(function (r) {
      var v = r.v, isNeg = v < 0;
      var w = Math.abs(v) / span * 100;
      var style = isNeg ? 'right:' + (100 - zero).toFixed(2) + '%;width:' + w.toFixed(2) + '%'
                        : 'left:' + zero.toFixed(2) + '%;width:' + w.toFixed(2) + '%';
      return '<div class="chartrow"><div class="nm">' + esc(r.name) +
        (r.period ? '<span class="sub">' + esc(r.period) + '</span>' : '') + '</div>' +
        '<div class="track div"><div class="zero" style="left:' + zero.toFixed(2) + '%"></div>' +
        '<div class="mark ' + (isNeg ? 'neg' : 'a') + '" style="' + style + '"><span>' + esc(r.label) + '</span></div>' +
        '</div></div>';
    }).join('') + '</div>';
  }

  /* --------------------------------------------------- расчёт индексов */
  /* 0 — все наблюдаемые показатели в норме, 100 — все дают стресс-сигнал */
  var SCORE = { stress: 100, watch: 50, ok: 0 };
  var MIN_COVERAGE = 0.6;

  function coverage(gid) {
    var all = IND.filter(function (i) { return !gid || i.g === gid; });
    var seen = all.filter(function (i) { return i.state !== 'nodata'; });
    return { seen: seen.length, all: all.length, share: all.length ? seen.length / all.length : 0 };
  }
  function groupIndex(gid) {
    var items = IND.filter(function (i) { return i.g === gid && i.state !== 'nodata'; });
    if (!items.length) return null;
    var sum = items.reduce(function (a, i) { return a + SCORE[i.state]; }, 0);
    return sum / items.length;
  }
  function overallIndex() {
    var num = 0, den = 0;
    GROUPS.forEach(function (g) {
      var v = groupIndex(g.id);
      if (v !== null) { num += v * g.weight; den += g.weight; }
    });
    return den ? num / den : 0;
  }
  function tension(v) {
    if (v < 25) return { label: 'Спокойно', state: 'ok' };
    if (v < 50) return { label: 'Наблюдение', state: 'watch' };
    if (v < 75) return { label: 'Напряжение', state: 'watch' };
    return { label: 'Стресс', state: 'stress' };
  }

  /* ============================================================ ЭКРАНЫ */
  var VIEWS = {};

  /* ---------------------------------------------------------- 1. Пульс */
  VIEWS.pulse = {
    nav: 'Пульс цикла', hint: '01',
    title: 'Пульс цикла',
    sub: 'Один вопрос вместо десяти: какая доля вложенного капитала уже обслуживается внешним денежным потоком. Индекс собран из панели 28 показателей и их стресс-сигналов.',
    render: function () {
      var v = overallIndex(), t = tension(v);
      var cov = coverage(null);
      var stressed = IND.filter(function (i) { return i.state === 'stress'; });
      var weakGroups = GROUPS.filter(function (g) { return coverage(g.id).share < MIN_COVERAGE; });

      var groupRows = GROUPS.map(function (g) {
        var gv = groupIndex(g.id);
        var c = coverage(g.id);
        var weak = c.share < MIN_COVERAGE;
        var st = gv === null ? 'nodata' : tension(gv).state;
        return '<div class="tile' + (weak ? ' weak' : '') + '"><div class="label">' + esc(g.name) + '<span style="color:var(--muted)"> · вес ' + num(g.weight, 1) + '</span></div>' +
          '<div class="value">' + (gv === null ? '—' : Math.round(gv)) + '<small>/100</small></div>' +
          '<div class="bar"><span style="width:' + (gv === null ? 0 : pct(gv)) + '%;background:var(--' + (st === 'stress' ? 'critical' : st === 'watch' ? 'warning' : st === 'ok' ? 'ok' : 'nodata') + ')"></span></div>' +
          '<div class="note">' + stateEl(st) + '</div>' +
          '<div class="note">Данные: ' + c.seen + ' из ' + c.all +
            (weak ? ' · <b style="color:var(--critical)">вывод не обеспечен данными</b>' : '') + '</div></div>';
      }).join('');

      var three = [
        { v: 'Более $1 трлн', l: 'Совокупные капвложения пяти крупнейших гипермасштабных облаков за 2025-2026, связанные с ИИ', k: 'estimate', s: 'S1', lim: 'Определения компаний различаются, часть расходов относится ко всему облаку' },
        { v: '485 → 950', l: 'ТВт·ч электропотребления мировых ЦОД: 2025 год и прогноз на 2030', k: 'forecast', s: 'S4', lim: 'Чувствителен к эффективности процессоров, видам запросов и загрузке' },
        { v: '18% / 32%', l: 'Доля компаний США, использовавших ИИ: простая и взвешенная по занятости', k: 'fact', s: 'S6', lim: 'Использование не равно глубокой перестройке бизнеса' }
      ].map(function (x) {
        return '<div class="tile"><div class="row"><span class="label">' + esc(x.l) + '</span></div>' +
          '<div class="value">' + esc(x.v) + '</div>' +
          '<div class="row">' + badge(x.k) + srcref(x.s) + '</div>' +
          '<div class="note">' + esc(x.lim) + '</div></div>';
      }).join('');

      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel hero">' +
            '<h3>Индекс напряжения цикла</h3>' +
            '<div class="figure">' + Math.round(v) + '</div>' +
            '<div class="row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + stateEl(t.state) +
              '<span class="count" style="color:var(--muted);font-size:12px">' + cov.seen + ' из ' + cov.all + ' показателей имеют наблюдение</span>' + badge('expert') + '</div>' +
            '<p class="cap">0 — все наблюдаемые показатели в норме. 100 — все дают стресс-сигнал. Норма 0, наблюдение 50, стресс 100; среднее по группе, затем среднее по группам с весами ' +
              GROUPS.map(function (g) { return esc(g.name.toLowerCase()) + ' ' + num(g.weight, 1); }).join(', ') + '.</p>' +
            '<div class="note"><b>Чем это не является.</b> Это среднее авторских оценок, а не измеренная степень перегрева рынка. Веса и пороги выбраны экспертно и не проверены на исторических данных: терминал не показывает, предупреждал ли такой индекс о прошлых коррекциях. Показатели без публичного ряда в расчёт не входят, поэтому низкое значение группы может означать не спокойствие, а отсутствие данных — рядом с каждой группой указана достаточность.' +
              (weakGroups.length ? ' Сейчас данных недостаточно для вывода по группам: ' + weakGroups.map(function (g) { return esc(g.name.toLowerCase()); }).join(', ') + '.' : '') + '</div>' +
          '</div>' +
          '<div class="panel">' +
            '<h3>Сработавшие стресс-сигналы</h3>' +
            '<p class="sub">Показатели, которые уже перешли порог, описанный в исследовании</p>' +
            (stressed.length ? stressed.map(function (i) {
              return '<div class="loop" style="border-left-color:var(--critical);margin-bottom:8px">' +
                '<div class="why"><b>' + esc(i.name) + '</b></div>' +
                '<div class="why">' + esc(i.obs) + ' ' + refs(i) + '</div></div>';
            }).join('') : '<p class="note">Сработавших сигналов нет.</p>') +
          '</div>' +
        '</div>' +
        '<h2 class="section">Субиндексы по группам</h2>' +
        '<div class="cols cols-3">' + groupRows + '</div>' +
        '<h2 class="section">Три числа, вокруг которых строится разговор</h2>' +
        '<div class="cols cols-3">' + three + '</div>' +
        '<div class="note">' + esc(M.disclaimer) + '</div>';
    }
  };

  /* ---------------------------------------------------------- 2. Граф */
  VIEWS.network = {
    nav: 'Граф связей', hint: '02',
    title: 'Граф связей: капитал, поставки, контракты',
    sub: 'Стрелка показывает направление денег. Слои расположены по течению: наверху — источники денег, внизу — фабрики и память. Любая стрелка, идущая вверх, — это деньги, вернувшиеся к тому, кто их дал. Это и есть круговая связь.',
    render: function () {
      var types = window.VG_EDGE_TYPES;
      var chips = Object.keys(types).map(function (k) {
        var cls = k === 'debt' ? 'dash' : '';
        return '<button class="chip" type="button" role="switch" aria-pressed="true" data-etype="' + k + '" title="' + esc(types[k].hint) + '">' +
          '<i style="background:var(--' + (k === 'external' ? 's1' : k === 'contract' ? 's3' : k === 'supply' ? 'muted' : 's2') + ')' + (cls ? ';opacity:.65' : '') + '"></i>' +
          esc(types[k].label) + (k === 'debt' ? ' (пунктир)' : '') + '</button>';
      }).join('');

      return '' +
        '<div class="panel" style="display:grid;gap:12px">' +
          '<div class="controls">' + chips +
            '<button class="chip" type="button" role="switch" aria-pressed="false" id="onlyReport">Только связи из исследования</button>' +
            '<button class="iconbtn" type="button" id="relax">Перестроить</button>' +
            '<span class="count" style="color:var(--muted);font-size:12px" id="graphStat"></span>' +
          '</div>' +
          '<div class="graphwrap" id="graphHost"></div>' +
          '<p class="sub" style="margin:0">Наведите курсор на связь или узел, потяните узел мышью, нажмите на узел — он оставит только своё окружение.</p>' +
        '</div>' +
        '<div class="note"><b>Как читать контур и как его не читать.</b> Стрелка вверх — признак встречного движения, но сама по себе она замкнутого круга не доказывает: контур засчитывается только при наличии обратного пути, и именно его ищет алгоритм. При этом доля в капитале, облачный кредит, подписанный договор и уже совершённый платёж — разные экономические события. Замкнутый контур связей означает взаимную зависимость сторон, а не доказанный возврат одних и тех же денег. Чтобы утверждать второе, нужны суммы, даты, сроки обязательств и доля в выручке получателя; в этой сборке суммы есть не у всех связей.</div>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Найденные круговые контуры</h3>' +
            '<p class="sub">Контур считается автоматически по видимым связям: деньги возвращаются в ту же точку, из которой вышли</p>' +
            '<div id="cycles"></div></div>' +
          '<div class="panel"><h3 id="selTitle">Выбранный узел</h3>' +
            '<p class="sub" id="selSub">Нажмите на узел графа, чтобы увидеть все его денежные связи</p>' +
            '<div id="selBody"></div></div>' +
        '</div>' +
        '<h2 class="section">Таблица связей</h2>' +
        '<div class="tablewrap compact"><table><thead><tr>' +
          '<th>Откуда идут деньги</th><th>Куда</th><th>Тип</th><th>Что это</th><th>Основание</th>' +
        '</tr></thead><tbody id="edgeTable"></tbody></table></div>';
    },
    after: function (root) {
      var host = root.querySelector('#graphHost');
      var g = new window.VGGraph({
        host: host, nodes: window.VG_NODES, edges: window.VG_EDGES, edgeTypes: window.VG_EDGE_TYPES,
        onSelect: function (node, edges) { showSel(node, edges); }
      });
      window.__vgGraph = g;

      function nodeName(id) { return (g.index[id] || {}).name || id; }
      function refMark(e) {
        return e.inReport === 'yes' ? '<span class="st st-ok"><i></i>исследование ' + (e.src || '') + '</span>'
          : e.inReport === 'mechanism' ? '<span class="st st-watch"><i></i>механизм описан, компании не названы</span>'
          : '<span class="st st-nodata"><i></i>вне исследования</span>';
      }
      function refresh() {
        var edges = g.visibleEdges();
        root.querySelector('#graphStat').textContent = 'узлов ' + window.VG_NODES.length + ' · связей ' + edges.length;
        var cy = g.cycles();
        root.querySelector('#cycles').innerHTML = cy.length ? cy.map(function (c) {
          var path = c.names.concat([c.names[0]]).map(function (n) { return '<span>' + esc(n) + '</span>'; }).join(' → ');
          var why = c.edges.map(function (e) {
            return window.VG_EDGE_TYPES[e.type].label.toLowerCase() + ': ' + (e.label || '') + (e.amount ? ' (' + e.amount + ')' : '');
          }).join(' · ');
          var amounts = c.edges.filter(function (e) { return e.amount; }).length;
          var basis = c.edges.every(function (e) { return e.inReport === 'yes'; }) ? 'все связи контура описаны в исследовании'
            : 'часть связей контура — вне исследования, см. таблицу';
          return '<div class="loop" style="margin-bottom:8px"><div class="path">' + path + '</div>' +
            '<div class="why">' + esc(why) + '</div>' +
            '<div class="why" style="color:var(--muted);font-size:11.5px">Сумма указана у ' + amounts + ' из ' + c.edges.length + ' связей · ' + basis + '</div></div>';
        }).join('') : '<p class="note">При текущих фильтрах замкнутых контуров нет.</p>';

        root.querySelector('#edgeTable').innerHTML = edges.map(function (e) {
          return '<tr><td>' + esc(nodeName(e.from)) + '</td><td>' + esc(nodeName(e.to)) + '</td>' +
            '<td>' + esc(window.VG_EDGE_TYPES[e.type].label) + (e.amount ? ' <b>' + esc(e.amount) + '</b>' : '') + '</td>' +
            '<td>' + esc(e.label || '') + (e.back ? '<span class="sub">встречный поток: ' + esc(e.back) + '</span>' : '') + '</td>' +
            '<td>' + refMark(e) + '</td></tr>';
        }).join('');
      }
      function showSel(node, edges) {
        var t = root.querySelector('#selTitle'), s = root.querySelector('#selSub'), b = root.querySelector('#selBody');
        if (!node) {
          t.textContent = 'Выбранный узел';
          s.textContent = 'Нажмите на узел графа, чтобы увидеть все его денежные связи';
          b.innerHTML = ''; return;
        }
        t.textContent = node.name;
        s.textContent = (window.VG_LAYER_LABELS[node.layer] || node.layer) + ' · ' + node.country + ' · ' + node.note;
        var inc = edges.filter(function (e) { return e.to === node.id; });
        var out = edges.filter(function (e) { return e.from === node.id; });
        function block(title, list, dir) {
          return '<h2 class="section">' + title + '</h2>' + (list.length ? '<ul class="list">' + list.map(function (e) {
            return '<li>' + esc(dir === 'in' ? nodeName(e.from) : nodeName(e.to)) + ' — ' + esc(e.label || window.VG_EDGE_TYPES[e.type].label) +
              (e.amount ? ' (' + esc(e.amount) + ')' : '') + ' ' + srcref(e.src) + '</li>';
          }).join('') + '</ul>' : '<p class="note">нет</p>');
        }
        b.innerHTML = block('Деньги приходят от', inc, 'in') + block('Деньги уходят к', out, 'out');
      }

      /* после смены фильтров карточка узла пересобирается по видимым связям */
      function afterFilter() {
        refresh();
        var id = g.filters.focus;
        showSel(id ? g.index[id] : null, g.neighbours(id));
      }
      root.querySelectorAll('[data-etype]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var on = btn.getAttribute('aria-pressed') !== 'true';
          btn.setAttribute('aria-pressed', String(on));
          g.setFilter(btn.dataset.etype, on);
          afterFilter();
        });
      });
      root.querySelector('#onlyReport').addEventListener('click', function () {
        var on = this.getAttribute('aria-pressed') !== 'true';
        this.setAttribute('aria-pressed', String(on));
        g.setOnlyReport(on);
        afterFilter();
      });
      root.querySelector('#relax').addEventListener('click', function () { g.relax(); });
      refresh();
    }
  };

  /* ---------------------------------------------------------- 3. Стек */
  VIEWS.stack = {
    nav: 'Стек цикла', hint: '03',
    title: 'Стек цикла: 13 звеньев',
    sub: 'Чем дальше звено от конечного результата, тем легче измерить поставку; чем ближе к результату, тем труднее отделить вклад ИИ от изменений процесса.',
    render: function () {
      var rows = LAYERS.map(function (l, i) {
        return '<tr data-layer="' + l.id + '">' +
          '<td><b>' + esc(l.name) + '</b><span class="sub">' + esc(l.players) + '</span></td>' +
          '<td style="min-width:220px"><div class="tornado">' +
            '<div class="left"><span style="width:' + pct(l.margin) + '%"></span></div><div></div>' +
            '<div class="right"><span style="width:' + pct(l.financing) + '%"></span></div>' +
          '</div><span class="sub">маржа ' + l.margin + ' · риск финансирования ' + l.financing + ' · риск отдачи ' + l.payoff + '</span></td>' +
          '<td>' + esc(window.VG_RISK_TYPES[l.riskType].label) + '<span class="sub">' + esc(l.overheat) + '</span></td>' +
          '<td>' + esc(l.demand) + '</td>' +
          '<td>' + esc(l.capexBy) + '</td>' +
          '<td>' + esc(l.breaks) + '</td>' +
        '</tr>';
      }).join('');

      return '' +
        '<div class="panel">' +
          '<h3>Где накапливается прибыль, а где риск</h3>' +
          '<p class="sub">Встречные полосы: слева — маржа звена, справа — риск финансирования. Шкала 0-100 — экспертная оцифровка качественной таблицы исследования ' + badge('expert') + '</p>' +
          '<div class="legend" style="margin-bottom:12px">' +
            '<b><i style="background:var(--s1)"></i>Маржа звена (влево)</b>' +
            '<b><i style="background:var(--s2)"></i>Риск финансирования (вправо)</b>' +
          '</div>' +
          '<div class="tablewrap"><table><thead><tr>' +
            '<th>Звено и типичные игроки</th><th>Маржа ↔ риск</th><th>Тип риска</th>' +
            '<th>Реальная метрика спроса</th><th>Кто несёт капвложения</th><th>Что ломает прогноз</th>' +
          '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '</div>' +
        '<div class="cols cols-3">' + Object.keys(window.VG_RISK_TYPES).map(function (k) {
          var r = window.VG_RISK_TYPES[k];
          var list = LAYERS.filter(function (l) { return l.riskType === k; }).map(function (l) { return l.name; });
          return '<div class="panel"><h3>' + esc(r.label) + '</h3><p class="sub">' + esc(r.hint) + '</p>' +
            '<ul class="list">' + list.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>';
        }).join('') + '</div>' +
        '<div class="note">Самая высокая текущая маржа — там, где есть технологическая редкость и ограниченное число поставщиков. Самый высокий риск финансирования — у специализированных облаков, операторов ЦОД и проектных структур, соединяющих короткий технологический цикл с долгим долгом. Самый высокий риск недоказанной отдачи — у программных агентов и конечных внедрений.</div>';
    }
  };

  /* -------------------------------------------------------- 4. Капитал */
  VIEWS.capital = {
    nav: 'Капитал и поток', hint: '04',
    title: 'Капитал против денежного потока',
    sub: 'Корректный вопрос — не «кто потратил больше», а какая доля прироста капитала уже обслуживается внешней выручкой и денежным потоком. Периоды компаний различаются и указаны в каждой строке.',
    render: function () {
      var capexCo = CO.filter(function (c) { return typeof c.capex === 'number' && typeof c.ocf === 'number'; });
      var excluded = CO.filter(function (c) {
        return (c.capexDelta && !c.capex) || (typeof c.capex === 'number' && typeof c.ocf !== 'number');
      });

      /* Столбики сравнимы только внутри одинаковой длины периода, поэтому
         чарт разбит по периодам, а общая шкала считается внутри каждого. */
      var PERIODS = [
        { id: 'quarter', label: 'Квартал' },
        { id: 'half', label: 'Полугодие' },
        { id: 'year', label: 'Год и 12 месяцев', match: ['year', 'ttm'] }
      ];
      var capexChart = PERIODS.map(function (pr) {
        var list = capexCo.filter(function (c) { return (pr.match || [pr.id]).indexOf(c.periodType) >= 0; });
        if (!list.length) return '';
        var mx = Math.max.apply(null, list.map(function (c) { return Math.max(c.capex, c.ocf); }));
        return '<h2 class="section">' + esc(pr.label) + '</h2><div class="chart">' + list.map(function (c) {
          return '<div class="chartrow"><div class="nm">' + esc(c.name) + '<span class="sub">' + esc(c.period) + '</span></div>' +
            '<div class="track pair">' +
              '<div class="mark a" style="width:' + pct(c.capex / mx * 100).toFixed(1) + '%"><span>' + num(c.capex) + '</span></div>' +
              '<div class="mark b" style="width:' + pct(c.ocf / mx * 100).toFixed(1) + '%"><span>' + num(c.ocf) + '</span></div>' +
            '</div></div>';
        }).join('') + '</div>';
      }).join('') +
        (excluded.length ? '<div class="note" style="margin-top:12px"><b>Исключены из сравнения.</b> ' +
          excluded.map(function (c) {
            return esc(c.name) + ': ' + esc(c.capexNote || 'операционный денежный поток в исследовании не приведён, сопоставить капвложения с потоком нельзя');
          }).join('. ') + '</div>' : '');

      var ratio = capexCo.map(function (c) {
        return { name: c.name, v: c.capex / c.ocf * 100, label: Math.round(c.capex / c.ocf * 100) + '%' };
      }).sort(function (a, b) { return b.v - a.v; });
      var maxR = Math.max.apply(null, ratio.map(function (r) { return r.v; }));
      var ratioChart = '<div class="chart" style="position:relative">' + ratio.map(function (r) {
        return '<div class="chartrow"><div class="nm">' + esc(r.name) + '</div>' +
          '<div class="track"><div class="axisline" style="left:' + pct(100 / maxR * 100).toFixed(2) + '%"></div>' +
          '<div class="mark ' + (r.v > 100 ? 'b' : 'a') + '" style="width:' + pct(r.v / maxR * 100).toFixed(1) + '%"><span>' + esc(r.label) + '</span></div>' +
          '</div></div>';
      }).join('') + '</div>';

      var fcfCo = CO.filter(function (c) { return typeof c.fcf === 'number'; });
      var fmin = Math.min.apply(null, fcfCo.map(function (c) { return c.fcf; }));
      var fmax = Math.max.apply(null, fcfCo.map(function (c) { return c.fcf; }));
      var fcfChart = divBars(fcfCo.map(function (c) {
        return { name: c.name, period: c.period, v: c.fcf, label: (c.fcf > 0 ? '+' : '') + num(c.fcf) };
      }), Math.min(fmin * 1.25, -5), Math.max(fmax * 1.25, 5));

      var rows = CO.map(function (c) {
        return '<tr><td><b>' + esc(c.name) + '</b><span class="sub">' + esc(c.role) + ' · ' + esc(c.country) + '</span></td>' +
          '<td>' + esc(c.period) + ' ' + badge(c.kind) + '</td>' +
          '<td class="num">' + (typeof c.capex === 'number' ? '$' + num(c.capex) : c.capexDelta ? '+$' + num(c.capexDelta) + '<span class="sub">прирост, не уровень</span>' : '—') +
            (c.capexKind ? ' ' + badge(c.capexKind) : '') + '</td>' +
          '<td class="num">' + (typeof c.ocf === 'number' ? '$' + num(c.ocf) : '—') + (c.ocfKind ? ' ' + badge(c.ocfKind) : '') + '</td>' +
          '<td class="num">' + (typeof c.fcf === 'number' ? (c.fcf > 0 ? '+' : '') + '$' + num(c.fcf) : '—') + '</td>' +
          '<td>' + esc(c.proof) + (c.guide ? '<span class="sub">' + esc(c.guide) + '</span>' : '') + '</td>' +
          '<td>' + esc(c.breaks) + '<span class="sub">ограничение: ' + esc(c.limit) + ' ' + '</span></td>' +
          '<td>' + srcref(c.src) + '</td></tr>' +
          (c.capexNote || c.crossCheck ? '<tr class="rownote"><td colspan="8">' +
            (c.capexNote ? '<b>Примечание к капвложениям.</b> ' + esc(c.capexNote) + '. ' : '') +
            (c.crossCheck ? '<br>' + esc(c.crossCheck.label) + ': <b>' + esc(c.crossCheck.value) + '</b>, ' + esc(c.crossCheck.ratio) + ' ' + badge('unverified') +
              '. ' + esc(c.crossCheck.note) + '.' : '') +
            '</td></tr>' : '');
      }).join('');

      var T5 = window.VG_TEST5;
      var t5rows = CO.map(function (c) {
        var a = T5.answers[c.id]; if (!a) return '';
        var no = a.filter(function (x) { return x === 'no'; }).length;
        var unk = a.filter(function (x) { return x === 'unknown'; }).length;
        var verdict, vstate;
        if (no >= 2) { verdict = T5.verdict.bet; vstate = 'stress'; }
        else if (no === 1) { verdict = T5.verdict.mixed; vstate = 'watch'; }
        else if (unk === 0) { verdict = T5.verdict.prod; vstate = 'ok'; }
        else { verdict = T5.verdict.opaque; vstate = 'nodata'; }
        var VLAB = { ok: 'Производительность', watch: 'Смешанный случай', stress: 'Ставка на капитализацию', nodata: 'Нельзя проверить' };
        return '<tr><td><b>' + esc(c.name) + '</b></td>' +
          a.map(function (x, qi) {
            return '<td class="num" title="' + esc(T5.questions[qi] || '') + '">' +
              (x === 'yes' ? '<span class="st st-ok"><i></i></span>' : x === 'no' ? '<span class="st st-stress"><i></i></span>' : '<span class="st st-nodata"><i></i></span>') +
              '</td>';
          }).join('') +
          '<td><span class="st st-' + vstate + '"><i></i>' + VLAB[vstate] + '</span>' +
          '<span class="sub">' + esc(verdict) + (unk ? ' · не раскрыто условий: ' + unk : '') + '</span></td></tr>';
      }).join('');

      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Капвложения и операционный поток</h3>' +
            '<p class="sub">Млрд долларов. Столбики сопоставимы только внутри одной длины периода, поэтому разнесены по блокам. Между блоками сравнивать нельзя</p>' +
            '<div class="legend" style="margin-bottom:10px"><b><i style="background:var(--s1)"></i>Капвложения</b><b><i style="background:var(--s2)"></i>Операционный денежный поток</b></div>' +
            capexChart + '</div>' +
          '<div class="panel"><h3>Капвложения к операционному потоку</h3>' +
            '<p class="sub">Стресс-сигнал исследования: выше 100% два квартала подряд без ускорения выручки. Вертикальная линия — отметка 100%</p>' +
            ratioChart +
            '<p class="note" style="margin-top:12px">У CoreWeave операционный поток выведен из соотношения «капвложения почти вчетверо выше потока» и помечен как оценка ' + badge('estimate') +
              '. Amazon в расчёт не взят: в исследовании приведён прирост капвложений, а не уровень.</p>' +
            '<p class="note" style="margin-top:8px"><b>Что этот коэффициент не измеряет.</b> Операционный поток компании создаётся всем её бизнесом, а не только ИИ. Поэтому отношение показывает способность компании финансировать стройку собственными силами — и не показывает окупаемость вложений именно в ИИ. Такого публичного показателя сегодня не существует ни у одной из компаний панели.</p></div>' +
        '</div>' +
        '<div class="panel"><h3>Свободный денежный поток после капвложений</h3>' +
          '<p class="sub">Млрд долларов. Отрицательное значение само по себе не приговор — приговором его делает повторение при замедлении облачной выручки</p>' +
          fcfChart +
          '<div class="note" style="margin-top:12px">Периоды разной длины, поэтому здесь читается знак и повторяемость, а не величина одной компании против другой. Квартал Oracle с годовым значением не сравнивается.</div></div>' +
        '<h2 class="section">Раскрытия компаний</h2>' +
        '<div class="tablewrap"><table><thead><tr><th>Компания</th><th>Период</th><th class="num">Капвложения</th>' +
          '<th class="num">Операционный поток</th><th class="num">Свободный поток</th><th>Доказанная монетизация</th>' +
          '<th>Что опровергнет позитивный сценарий</th><th>Источник</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<h2 class="section">Тест пяти условий: производительность или ставка на капитализацию</h2>' +
        '<div class="panel"><p class="sub">Условия из исследования (стр. 10-11). Если два и более условия нарушены, проект ближе к ставке на будущую капитализацию. Это не приговор — это другой класс риска.</p>' +
          '<div class="note" style="margin-bottom:14px">' + esc(T5.rule) + '</div>' +
          '<ol class="list" style="margin-bottom:14px">' + T5.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' +
          '<div class="legend" style="margin-bottom:10px"><b><i class="sq" style="background:var(--ok)"></i>выполняется</b><b><i class="sq" style="background:var(--critical)"></i>не выполняется</b><b><i class="sq" style="background:var(--nodata)"></i>не наблюдаемо публично</b></div>' +
          '<div class="tablewrap compact"><table><thead><tr><th>Компания</th><th class="num">1</th><th class="num">2</th><th class="num">3</th><th class="num">4</th><th class="num">5</th><th>Вывод</th></tr></thead><tbody>' + t5rows + '</tbody></table></div>' +
        '</div>';
    }
  };

  /* -------------------------------------------------------- 5. Энергия */
  VIEWS.energy = {
    nav: 'Энергия и физика', hint: '05',
    title: 'Энергетика и физическая экономика ЦОД',
    sub: EN.keyMetric,
    render: function () {
      var f = EN.headline;
      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel hero"><h3>Потребление электроэнергии мировыми ЦОД</h3>' +
            '<div class="figure">' + f.from + ' → ' + f.to + '<small style="font-size:20px;font-weight:500;color:var(--ink-2)"> ТВт·ч</small></div>' +
            '<div class="row" style="display:flex;gap:8px;align-items:center">' + badge(f.kind) + srcref(f.src) +
              '<span style="font-size:12px;color:var(--muted)">' + f.fromYear + ' → ' + f.toYear + '</span></div>' +
            '<p class="cap">' + esc(f.note) + '</p></div>' +
          '<div class="panel"><h3>Физические факты и диапазоны</h3><p class="sub">Диапазон — это неопределённость, а не план</p>' +
            '<div class="tablewrap compact"><table><tbody>' + EN.facts.map(function (x) {
              return '<tr><td>' + esc(x.label) + (x.note ? '<span class="sub">' + esc(x.note) + '</span>' : '') + '</td>' +
                '<td class="num"><b>' + esc(x.value) + '</b></td><td class="num">' + badge(x.kind) + ' ' + srcref(x.src) + '</td></tr>';
            }).join('') + '</tbody></table></div></div>' +
        '</div>' +
        '<h2 class="section">Узкие места, которые определяют ввод мощности</h2>' +
        '<div class="cols cols-2">' + EN.bottlenecks.map(function (b) {
          return '<div class="panel"><h3>' + esc(b.name) + '</h3><p class="sub" style="margin:0">' + esc(b.text) + '</p></div>';
        }).join('') + '</div>' +
        '<div class="panel"><h3>Дефицит: доказательство спроса или будущая застрявшая мощность</h3>' +
          '<p class="sub" style="margin:0 0 10px">Оба вывода верны одновременно</p>' +
          '<p style="margin:0 0 10px;color:var(--ink-2)">Очередь на подключение и высокая цена подтверждают, что текущие заказчики готовы платить. Но дефицит заставляет фиксировать долгие обязательства по пиковой цене. Если вычислительная эффективность, распределённые нагрузки или география изменятся быстрее, чем строится сеть, актив окажется технически полезным, но финансово недозагруженным.</p>' +
          '<div class="note">' + esc(EN.keyMetric) + '</div></div>' +
        '<div class="panel"><h3>Корпоративный случай: Constellation и Microsoft</h3>' +
          '<p class="sub">Двадцатилетний договор купли электроэнергии должен поддержать перезапуск энергоблока Crane Clean Energy Center мощностью 835 МВт ' + srcref('S27') + '</p>' +
          '<p style="margin:0;color:var(--ink-2)">Технологическая компания готова гарантировать долгий спрос, чтобы разблокировать реальный энергетический актив. Но договор не равен уже поставленной энергии: лицензирование, инвестиции и срок перезапуска остаются проектными рисками.</p></div>';
    }
  };

  /* --------------------------------------------------------- 6. Панель */
  VIEWS.panel = {
    nav: 'Панель 28 показателей', hint: '06',
    title: 'Панель из 28 показателей',
    sub: 'Что проверять каждый квартал. Серый статус означает не ноль, а отсутствие публичного ряда — это самостоятельный вывод: главные показатели окупаемости сегодня просто не раскрываются.',
    render: function () {
      var byGroup = GROUPS.map(function (g) {
        var items = IND.filter(function (i) { return i.g === g.id; });
        return '<h2 class="section">' + esc(g.name) + '</h2>' +
          '<div class="tablewrap"><table><thead><tr><th>Показатель</th><th>Почему важен</th><th>Стресс-сигнал</th><th>Наблюдение на дату среза</th><th>Статус</th></tr></thead><tbody>' +
          items.map(function (i) {
            return '<tr><td><b>' + esc(i.name) + '</b></td><td>' + esc(i.why) + '</td><td>' + esc(i.stress) + '</td>' +
              '<td>' + esc(i.obs) + ' ' + (i.kind ? badge(i.kind) + ' ' : '') + refs(i) + '</td><td>' + stateEl(i.state) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }).join('');

      var ladder = window.VG_LADDER.map(function (r) {
        return '<div class="rung"><div class="lv"><b>' + esc(r.level) + '</b>' + stateEl(r.state) +
          '<span class="sub" style="color:var(--muted);font-size:11.5px">' + esc(r.measure) + '</span></div>' +
          '<div><div style="margin-bottom:5px">' + esc(r.seen) + ' ' + srcref(r.src) + '</div>' +
          '<div style="color:var(--muted);font-size:12.5px">Нельзя утверждать: ' + esc(r.cannot) + '</div></div></div>';
      }).join('');

      var gaps = IND.filter(function (i) { return i.state === 'nodata'; });

      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Пробелы панели</h3>' +
            '<p class="sub">' + gaps.length + ' из ' + IND.length + ' показателей не имеют публичного ряда. Это самая важная строка терминала: без них окупаемость нельзя ни подтвердить, ни опровергнуть</p>' +
            '<ul class="list">' + gaps.map(function (i) { return '<li><b>' + esc(i.name) + '</b> — ' + esc(i.obs) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="panel"><h3>Как читать статусы</h3>' +
            '<div class="kv"><dt>' + stateEl('ok') + '</dt><dd>Показатель наблюдается и не подаёт сигнала</dd>' +
            '<dt>' + stateEl('watch') + '</dt><dd>Движется в сторону порога или измеряется неоднозначно</dd>' +
            '<dt>' + stateEl('stress') + '</dt><dd>Порог, описанный в исследовании, уже пройден</dd>' +
            '<dt>' + stateEl('nodata') + '</dt><dd>Показатель нужен, но публичного ряда нет</dd></div>' +
            '<div class="note" style="margin-top:14px">Статусы расставлены по наблюдениям на дату среза. При обновлении данных статус меняется, и вместе с ним пересчитывается индекс напряжения на экране «Пульс».</div></div>' +
        '</div>' +
        byGroup +
        '<h2 class="section">Лестница доказательств производительности</h2>' +
        '<div class="ladder">' + ladder + '</div>';
    }
  };

  /* ------------------------------------------------------- 7. Сценарии */
  VIEWS.scenarios = {
    nav: 'Сценарии', hint: '07',
    title: 'Сценарии на 12-36 месяцев',
    sub: 'Вероятности — аналитическая оценка авторов исследования, а не расчёт терминала. Ценность в другом: у каждого сценария есть набор ранних индикаторов, который можно проверять.',
    render: function () {
      var cards = SCEN.map(function (s) {
        var met = s.signals.filter(function (x) { return x.met === true; }).length;
        var known = s.signals.filter(function (x) { return x.met !== null; }).length;
        return '<div class="panel scen">' +
          '<div class="head"><b>' + esc(s.name) + '</b><span class="p count">' + s.prob + '%</span></div>' +
          '<p class="sub" style="margin:0">' + esc(s.assumption) + '</p>' +
          '<div class="bar"><span style="width:' + s.prob + '%;background:var(--' + (s.id === 'stress' ? 'critical' : s.id === 'opt' ? 'ok' : 's1') + ')"></span></div>' +
          '<div style="font-size:12.5px;color:var(--ink-2)">Ранние индикаторы: подтверждено <b class="count">' + met + '</b> из ' + s.signals.length +
            ' · наблюдаемо ' + known + '</div>' +
          s.signals.map(function (x) {
            var mark = x.met === true ? '<span class="st st-stress"><i></i></span>' : x.met === false ? '<span class="st st-ok"><i></i></span>' : '<span class="st st-nodata"><i></i></span>';
            return '<div class="sig"><div class="mark">' + mark + '</div><div><div class="t">' + esc(x.text) + '</div>' +
              '<div class="n">' + esc(x.note) + ' ' + refs(x) + '</div></div></div>';
          }).join('') +
        '</div>';
      }).join('');

      var keys = Object.keys(SCEN[0].rows);
      var table = '<div class="tablewrap"><table><thead><tr><th>Параметр</th>' +
        SCEN.map(function (s) { return '<th>' + esc(s.name) + ' · ' + s.prob + '%</th>'; }).join('') +
        '</tr></thead><tbody>' + keys.map(function (k) {
          return '<tr><td><b>' + esc(k) + '</b></td>' + SCEN.map(function (s) { return '<td>' + esc(s.rows[k]) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';

      var vuln = '<div class="tablewrap compact"><table><thead><tr><th>Группа</th><th>Уязвимость</th><th>Почему</th></tr></thead><tbody>' +
        window.VG_VULNERABLE.map(function (v) {
          return '<tr><td><b>' + esc(v.group) + '</b></td><td>' + esc(v.level) + '</td><td>' + esc(v.why) + '</td></tr>';
        }).join('') + '</tbody></table></div>';

      return '' +
        '<div class="note">Отметка у индикатора читается так: красный квадрат — индикатор сценария уже подтверждён наблюдением, зелёный — наблюдение противоречит сценарию, серый — наблюдать нечем.</div>' +
        '<div class="cols cols-3">' + cards + '</div>' +
        '<h2 class="section">Что происходит с каждым параметром</h2>' + table +
        '<h2 class="section">Кто наиболее уязвим при стрессовом сценарии</h2>' + vuln;
    }
  };

  /* --------------------------------------------------------- 8. Россия */
  VIEWS.russia = {
    nav: 'Россия', hint: '08',
    title: 'Россия: другое место на кривой',
    sub: RU.position.verdict,
    render: function () {
      var ad = RU.adoption;
      var maxA = 100;
      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Где Россия сильна</h3><ul class="list">' +
            RU.position.strong.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="panel"><h3>Где слаба</h3><ul class="list">' +
            RU.position.weak.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
            '<div class="note" style="margin-top:12px">Экспортные ограничения США и ЕС делают поставку передовых процессоров и серверов юридически и логистически сложнее; это повышает цену и удлиняет цикл обновления ' + srcref('S25') + ' ' + srcref('S29') + '</div></div>' +
        '</div>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Реальное внедрение</h3><p class="sub">' + esc(ad.title) + ' ' + badge(ad.kind) + ' ' + srcref(ad.src) + '</p>' +
            bars(ad.items.map(function (i) { return { name: i.label, v: i.value, label: i.value + '%' }; }), maxA) +
            '<h2 class="section">Почему не планируют</h2>' +
            bars(ad.barriers.map(function (i) { return { name: i.label, v: i.value, label: i.value + '%' }; }), maxA, 'b') +
            '<div class="note" style="margin-top:12px">' + esc(ad.note) + '</div></div>' +
          '<div class="panel"><h3>Вычисления, ЦОД и энергетика</h3>' +
            '<div class="tablewrap compact"><table><tbody>' + RU.infra.map(function (i) {
              return '<tr><td>' + esc(i.label) + '<span class="sub">' + esc(i.note) + '</span></td>' +
                '<td class="num"><b>' + esc(i.value) + '</b></td><td class="num">' + badge(i.kind) + ' ' + srcref(i.src) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<h2 class="section">Вопросы российским собеседникам</h2>' +
            '<ol class="list">' + RU.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>' +
        '</div>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Где эффект появится быстрее</h3>' +
            '<div class="tablewrap compact"><table><tbody>' + RU.fastEffect.map(function (r) {
              return '<tr><td class="num" style="color:var(--muted)">' + r.n + '</td><td><b>' + esc(r.area) + '</b><span class="sub">' + esc(r.why) + '</span></td></tr>';
            }).join('') + '</tbody></table></div></div>' +
          '<div class="panel"><h3>Где особенно велик риск неэффективных капвложений</h3>' +
            '<ul class="list">' + RU.badCapex.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
        '</div>' +
        '<h2 class="section">География цикла</h2>' +
        '<div class="tablewrap"><table><thead><tr><th>Регион</th><th>Роль в цепочке</th><th>Сильная сторона</th><th>Главная зависимость</th><th>Ключевой риск</th></tr></thead><tbody>' +
          window.VG_GEO.map(function (g) {
            return '<tr' + (g.region === 'Россия' ? ' style="background:var(--accent-soft)"' : '') + '><td><b>' + esc(g.region) + '</b></td><td>' + esc(g.role) + '</td><td>' + esc(g.strong) + '</td><td>' + esc(g.dep) + '</td><td>' + esc(g.risk) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
    }
  };

  /* ------------------------------------------------------ 9. Источники */
  VIEWS.sources = {
    nav: 'Источники и методика', hint: '09',
    title: 'Источники и методика',
    sub: 'Каждая цифра терминала прослеживается до первичного источника. Ссылка открывается в новой вкладке.',
    render: function () {
      var rows = Object.keys(M.sources).map(function (code) {
        var s = M.sources[code];
        return '<tr id="src-' + code + '"><td class="num"><b>' + code + '</b></td><td><b>' + esc(s.org) + '</b><span class="sub">' + esc(s.title) +
          (s.generic ? '<br><span style="color:var(--critical)">* ссылка ведёт на общую страницу организации, а не на конкретный документ</span>' : '') + '</span></td>' +
          '<td class="num">' + esc(s.date) + '</td>' +
          '<td><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">Открыть</a></td></tr>';
      }).join('');
      return '' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Методические ограничения</h3><ul class="list">' +
            M.limits.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>' +
          '<div class="panel"><h3>Режим обновления</h3>' +
            '<p class="sub">Сейчас: <b>' + esc(M.mode.current) + '</b>. Срез данных — ' + esc(M.asOf) + ', сборка — ' + esc(M.builtAt) + '</p>' +
            '<div class="note" style="margin-bottom:14px">' + esc(M.mode.note) + '</div>' +
            '<h2 class="section">Планируется</h2>' +
            '<ul class="list">' + M.mode.planned.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
            '<div class="note" style="margin-top:14px">Сила терминала не в скорости обновления, а в том, что каждая цифра прослеживается до первоисточника и несёт статус: факт, оценка, прогноз, заявление руководства или расчёт терминала.</div></div>' +
        '</div>' +
        '<h2 class="section">Первичные источники</h2>' +
        '<div class="tablewrap"><table><thead><tr><th class="num">Код</th><th>Источник</th><th class="num">Дата</th><th>Ссылка</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="note">Основание терминала: ' + esc(M.basis) + '. Дата среза данных — ' + esc(M.asOf) + '.</div>';
    }
  };

  /* ============================================================ каркас */
  var ORDER = ['pulse', 'network', 'stack', 'capital', 'energy', 'panel', 'scenarios', 'russia', 'sources'];
  var GROUPS_NAV = [
    { label: 'Обзор', items: ['pulse', 'network'] },
    { label: 'Слои цикла', items: ['stack', 'capital', 'energy'] },
    { label: 'Проверка', items: ['panel', 'scenarios'] },
    { label: 'Контур', items: ['russia', 'sources'] }
  ];

  var rendered = {};

  function show(id) {
    if (!VIEWS[id]) id = 'pulse';
    ORDER.forEach(function (k) {
      var sec = document.getElementById('view-' + k);
      if (sec) sec.hidden = (k !== id);
    });
    document.querySelectorAll('.navitem').forEach(function (b) {
      b.setAttribute('aria-current', String(b.dataset.view === id));
    });
    if (!rendered[id]) {
      var host = document.getElementById('view-' + id);
      var v = VIEWS[id];
      host.innerHTML = '<div class="viewhead"><h1>' + esc(v.title) + '</h1><p>' + esc(v.sub) + '</p></div>' + v.render();
      rendered[id] = true;
      if (v.after) v.after(host);
    }
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* один обработчик на документ: ссылки на источники появляются и в блоках,
     которые собираются после первой отрисовки экрана */
  function bindSrcRefs() {
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.src') : null;
      if (!b || !b.dataset.src) return;
      show('sources');
      var row = document.getElementById('src-' + b.dataset.src);
      if (row) {
        row.scrollIntoView({ block: 'center' });
        row.style.background = 'var(--accent-soft)';
        setTimeout(function () { row.style.background = ''; }, 2200);
      }
    });
  }

  function theme(set) {
    var root = document.documentElement;
    var cur = root.getAttribute('data-theme');
    if (!cur) {
      try { cur = localStorage.getItem('vg-theme'); } catch (e) { cur = null; }
    }
    if (set) {
      var next = (cur === 'dark') ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('vg-theme', next); } catch (e) {}
      cur = next;
      if (window.__vgGraph) window.__vgGraph.position();
    } else if (cur) {
      root.setAttribute('data-theme', cur);
    }
    var btn = document.getElementById('themeBtn');
    if (btn) btn.textContent = (root.getAttribute('data-theme') === 'dark') ? 'Светлая тема' : 'Тёмная тема';
  }

  function init() {
    document.getElementById('asOf').textContent = 'срез ' + M.asOf + ' · сборка ' + M.builtAt;

    var nav = document.getElementById('rail');
    nav.innerHTML = GROUPS_NAV.map(function (g) {
      return '<div class="grouplabel">' + esc(g.label) + '</div>' + g.items.map(function (id) {
        return '<button class="navitem" type="button" data-view="' + id + '" aria-current="false">' +
          esc(VIEWS[id].nav) + '<em>' + VIEWS[id].hint + '</em></button>';
      }).join('');
    }).join('');

    var main = document.getElementById('main');
    main.innerHTML = ORDER.map(function (id) { return '<section class="view" id="view-' + id + '" hidden></section>'; }).join('');

    nav.addEventListener('click', function (e) {
      var b = e.target.closest('.navitem');
      if (b) show(b.dataset.view);
    });
    document.getElementById('themeBtn').addEventListener('click', function () { theme(true); });
    window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });

    bindSrcRefs();
    theme(false);
    show(location.hash.slice(1) || 'pulse');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
