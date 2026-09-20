/* =========================================================================
   Терминал ИИ-цикла — сборка экранов.
   Данные берутся из data/*.js (глобальные объекты VG_*), поэтому файл
   открывается и по file://, и с сервера, и внутри артефакта.
   ========================================================================= */
(function () {
  'use strict';

  var M = window.VG_META, LAYERS = window.VG_LAYERS, CO = window.VG_COMPANIES,
      IND = window.VG_INDICATORS, GROUPS = window.VG_GROUPS, SCEN = window.VG_SCENARIOS,
      RU = window.VG_RUSSIA, EN = window.VG_ENERGY, ED = window.VG_EDITORIAL,
      LADDER = window.VG_LADDER, CITES = window.VG_CITES || {};

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
  function refs(o) { return o.cite ? citeref(o.cite) : srcref(o.srcs || o.src); }

  /* ------------------------------------------------- статусы сверки */
  var CITE_STATUS = {
    verified:    { glyph: '✓', label: 'сверено дословно', cls: 'ok' },
    partial:     { glyph: '≈', label: 'подтверждено частично', cls: 'partial' },
    mismatch:    { glyph: '✕', label: 'по ссылке утверждения нет', cls: 'bad' },
    unreachable: { glyph: '⊘', label: 'источник недоступен из среды сборки', cls: 'none' },
    pending:     { glyph: '?', label: 'сверка не проводилась', cls: 'none' }
  };
  var CITE_RANK = { mismatch: 0, pending: 1, unreachable: 2, partial: 3, verified: 4 };

  /* чипы сверки, сгруппированные по источнику: пять цитат из одного доклада
     не должны превращаться в пять одинаковых значков */
  function citeref(list) {
    if (!list) return '';
    if (!Array.isArray(list)) list = [list];
    var bySrc = {};
    list.forEach(function (id) {
      var c = CITES[id]; if (!c) return;
      (bySrc[c.src] = bySrc[c.src] || []).push({ id: id, c: c });
    });
    return Object.keys(bySrc).map(function (src) {
      var items = bySrc[src];
      var worst = items.reduce(function (a, x) {
        return CITE_RANK[x.c.status] < CITE_RANK[a] ? x.c.status : a;
      }, 'verified');
      var st = CITE_STATUS[worst];
      var counts = {};
      items.forEach(function (x) { counts[x.c.status] = (counts[x.c.status] || 0) + 1; });
      var tip = items.map(function (x) {
        return CITE_STATUS[x.c.status].label.toUpperCase() +
          (x.c.loc ? ' · ' + x.c.loc : '') +
          (x.c.quote ? '\n«' + x.c.quote + '»' : '') +
          (x.c.note ? '\n' + x.c.note : '');
      }).join('\n\n');
      var extra = items.length > 1 ? ' ' + Object.keys(counts).map(function (k) {
        return counts[k] + CITE_STATUS[k].glyph;
      }).join(' ') : ' ' + st.glyph;
      return '<button class="cite ' + st.cls + '" type="button" data-cite="' + items[0].id + '" title="' + esc(tip) + '">' +
        src + extra + '</button>';
    }).join(' ');
  }

  function citeSummary(list) {
    var out = { verified: 0, partial: 0, mismatch: 0, unreachable: 0, pending: 0, total: 0 };
    (list || Object.keys(CITES)).forEach(function (id) {
      var c = CITES[id]; if (!c) return;
      out[c.status]++; out.total++;
    });
    return out;
  }
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

  /* ------------------------------------------------- расчёты и история */
  var VGM = window.VGM;
  var HIST = window.VG_HISTORY || [];
  var MIN_COVERAGE = VGM.MIN_COVERAGE;

  function coverage(gid) { return VGM.coverage(IND, gid); }
  function groupIndex(gid) { return VGM.groupIndex(IND, gid); }
  function overallIndex() { return VGM.overallIndex(IND, GROUPS); }
  function tension(v) { return VGM.tension(v); }

  function today() { return new Date().toISOString().slice(0, 10); }

  /* словари для расшифровки ключей снимка */
  var DICT = {
    groups: {}, indicators: {}, companies: {}, nodes: {},
    fields: { capex: 'капвложения', capexDelta: 'прирост капвложений', ocf: 'операционный поток',
              fcf: 'свободный поток', rpo: 'портфель обязательств', revenue: 'выручка' }
  };
  GROUPS.forEach(function (g) { DICT.groups[g.id] = g.name; });
  IND.forEach(function (i) { DICT.indicators[i.id] = i.name; });
  CO.forEach(function (c) { DICT.companies[c.id] = c.name; });
  (window.VG_NODES || []).forEach(function (n) { DICT.nodes[n.id] = n.full || n.name; });

  function cycleNames(key) {
    return key.split(' + ').map(function (id) { return DICT.nodes[id] || id; }).join(' и ');
  }

  /* текущее состояние в том же виде, что и снимок истории */
  function currentSnapshot() {
    return VGM.snapshot({
      meta: M, groups: GROUPS, indicators: IND, companies: CO,
      nodes: window.VG_NODES, edges: window.VG_EDGES, scenarios: SCEN
    }, 'текущее состояние');
  }

  var CUR = currentSnapshot();
  var LAST = HIST.length ? HIST[HIST.length - 1] : null;
  var PREV = HIST.length > 1 ? HIST[HIST.length - 2] : null;
  var DIFF = VGM.diff(PREV, LAST, DICT);
  var DIFF_N = LAST ? VGM.count(DIFF) : 0;
  /* сверка: данные могли изменить, не зафиксировав снимок */
  var UNSAVED = LAST ? VGM.count(VGM.diff(LAST, CUR, DICT)) : 0;

  /* ============================================================ ЭКРАНЫ */
  var VIEWS = {};


  /* =====================================================================
     ГЛАВНОЕ — один экран вокруг четырёх рабочих вопросов:
     что изменилось · чем подтверждено · какой вывод допустим ·
     какой вопрос задать эксперту.
     ===================================================================== */

  function changeRows() {
    var out = [];
    DIFF.indicators.forEach(function (c) {
      var toName = c.toName || VGM.STATE_NAMES[c.to] || c.to;
      out.push({ arr: c.added ? '+' : c.to === 'stress' ? '▲' : c.from === 'stress' ? '▼' : '→',
        cls: c.to === 'stress' ? 'up' : c.from === 'stress' ? 'down' : '',
        html: '<b>' + esc(c.name) + '</b><br>' + (c.added ? '<span class="from">показатель добавлен</span>'
          : '<span class="from">' + esc(c.fromName || '—') + '</span>') + ' → <span class="to">' + esc(toName) + '</span>' });
    });
    DIFF.companies.forEach(function (c) {
      var f = DICT.fields[c.field] || c.field;
      out.push({ arr: '→', cls: '',
        html: '<b>' + esc(c.name) + '</b> · ' + esc(f) + '<br><span class="from">' +
          (c.from === undefined || c.from === null ? 'не раскрыто' : num(c.from)) + '</span> → <span class="to">' +
          (c.to === undefined || c.to === null ? 'не раскрыто' : num(c.to)) + '</span>' });
    });
    DIFF.cycles.forEach(function (c) {
      out.push({ arr: c.added ? '▲' : '▼', cls: c.added ? 'up' : 'down',
        html: '<b>Круговой контур ' + (c.added ? 'появился' : 'исчез') + '</b><br>' + esc(cycleNames(c.key)) });
    });
    DIFF.scenarios.forEach(function (c) {
      var sc = SCEN.filter(function (x) { return x.id === c.id; })[0] || { name: c.id };
      out.push({ arr: c.metTo > c.metFrom ? '▲' : '▼', cls: c.metTo > c.metFrom ? 'up' : 'down',
        html: '<b>Сценарий «' + esc(sc.name) + '»</b><br><span class="from">подтверждено ' + c.metFrom + '</span> → <span class="to">' + c.metTo + ' из ' + c.total + '</span>' });
    });
    DIFF.groups.forEach(function (c) {
      var parts = [];
      if (c.from !== c.to) parts.push('субиндекс <span class="from">' + num(c.from, 0) + '</span> → <span class="to">' + num(c.to, 0) + '</span>');
      if (c.seenFrom !== c.seenTo) parts.push('данные <span class="from">' + c.seenFrom + '</span> → <span class="to">' + c.seenTo + ' из ' + c.all + '</span>');
      if (!parts.length) return;
      var down = (c.to !== null && c.from !== null) ? c.to < c.from : false;
      out.push({ arr: c.from === c.to ? '→' : down ? '▼' : '▲', cls: c.from === c.to ? '' : down ? 'down' : 'up',
        html: '<b>' + esc(c.name) + '</b><br>' + parts.join(' · ') });
    });
    if (DIFF.graph) {
      out.push({ arr: '→', cls: '',
        html: '<b>Граф связей</b><br><span class="from">' + DIFF.graph.edgesFrom + ' связей</span> → <span class="to">' + DIFF.graph.edgesTo + ' связей</span>' });
    }
    if (DIFF.cites) {
      out.push({ arr: '▲', cls: 'down',
        html: '<b>Сверка с первоисточниками</b><br><span class="from">' + DIFF.cites.verifiedFrom + ' из ' + DIFF.cites.totalFrom +
          '</span> → <span class="to">' + DIFF.cites.verifiedTo + ' из ' + DIFF.cites.totalTo + ' дословно</span>' });
    }
    return out;
  }

  /* Какие группы сейчас требуют внимания и почему. Отсюда подбираются вопросы
     собеседникам: подбор должен быть объясним, а не случаен. */
  function hotGroups(strict) {
    var hot = {};
    DIFF.indicators.forEach(function (c) {
      var ind = IND.filter(function (i) { return i.id === c.id; })[0];
      if (ind) hot[ind.g] = 'изменился показатель «' + ind.name + '»';
    });
    if (!strict) {
      GROUPS.forEach(function (g) {
        var v = groupIndex(g.id), c = coverage(g.id);
        if (c.share < MIN_COVERAGE) hot[g.id] = hot[g.id] || 'данных недостаточно для вывода: ' + c.seen + ' из ' + c.all;
        else if (v !== null && v >= 50) hot[g.id] = hot[g.id] || 'субиндекс ' + Math.round(v) + ' из 100';
      });
    }
    IND.forEach(function (i) {
      if (i.state === 'stress') hot[i.g] = hot[i.g] || 'сработал стресс-сигнал «' + i.name + '»';
    });
    return hot;
  }

  function pickQuestions(limit) {
    var hot = hotGroups(), keys = Object.keys(hot);
    if (!keys.length) return [];
    var scored = ED.questions.map(function (q) {
      var hits = q.tags.filter(function (t) { return keys.indexOf(t) >= 0; });
      return { q: q, hits: hits, score: hits.length };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    /* по одному вопросу на адресата, чтобы подборка не съезжала в одну тему */
    var seen = {}, out = [];
    scored.forEach(function (x) {
      var key = x.q.to + '|' + x.hits[0];
      if (seen[key] || out.length >= limit) return;
      seen[key] = 1;
      out.push({ q: x.q, why: hot[x.hits[0]], group: DICT.groups[x.hits[0]] || x.hits[0] });
    });
    return out;
  }

  VIEWS.brief = {
    nav: 'Главное', hint: '00',
    title: 'Главное',
    sub: 'Четыре вопроса перед эфиром: что изменилось, чем это подтверждено, какой вывод допустим и какой вопрос стоит задать собеседнику.',
    render: function () {
      /* ---------- 1. Что изменилось ---------- */
      var rows = changeRows();
      var idx = DIFF.index;
      var mx = Math.max.apply(null, HIST.map(function (h) { return h.index.overall; }).concat([1]));
      var spark = HIST.length > 1 ? '<div class="spark">' + HIST.map(function (h, i) {
        return '<div class="col' + (i === HIST.length - 1 ? ' now' : '') + '">' +
          '<b>' + num(h.index.overall, 0) + '</b>' +
          '<i style="height:' + Math.max(4, h.index.overall / mx * 56).toFixed(0) + 'px"></i>' +
          '<span title="' + esc(h.label) + '">' + esc(h.builtAt.slice(5)) + '</span></div>';
      }).join('') + '</div>' : '';

      var v = overallIndex(), t = tension(v), cov = coverage(null);

      var block1 = '<h2 class="section">1 · Что изменилось</h2>' +
        (UNSAVED ? '<div class="warnbar"><b>Снимок не зафиксирован.</b><span>Данные изменены после последнего снимка: расхождений ' + UNSAVED +
          '. Выполните <code>python3 build/snapshot.py «что обновили»</code>, иначе сравнение показывает прошлый круг.</span></div>' : '') +
        '<div class="cols cols-2">' +
          '<div class="panel hero"><h3>Индекс напряжения цикла</h3>' +
            (idx ? '<div class="figure">' + num(idx.to, 0) + '<small style="font-size:22px;font-weight:500;color:var(--ink-2)"> ← ' + num(idx.from, 0) + '</small></div>' +
                   '<div><span class="delta ' + (idx.delta > 0 ? 'up' : 'down') + '">' + (idx.delta > 0 ? '+' : '') + num(idx.delta) + '</span>' +
                   '<span style="color:var(--ink-2)"> к сборке ' + esc(PREV ? PREV.builtAt : '') + '</span></div>'
                 : '<div class="figure">' + num(v, 0) + '</div><div style="color:var(--ink-2)">без изменений к прошлой сборке</div>') +
            '<div class="row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + stateEl(t.state) +
              '<span class="count" style="color:var(--muted);font-size:12px">' + cov.seen + ' из ' + cov.all + ' показателей наблюдаются</span>' + badge('expert') + '</div>' +
            spark +
          '</div>' +
          '<div class="panel"><h3>Изменения по существу</h3>' +
            '<p class="sub">' + (LAST && PREV ? 'Сравниваются сборки ' + esc(PREV.builtAt) + ' и ' + esc(LAST.builtAt) : 'Снимков для сравнения пока нет') + '</p>' +
            (rows.length ? rows.map(function (r) {
              return '<div class="change"><div class="arr ' + r.cls + '">' + r.arr + '</div><div class="body">' + r.html + '</div></div>';
            }).join('') : '<p class="note">Между снимками ничего не изменилось.</p>') +
          '</div>' +
        '</div>';

      /* ---------- 2. Чем подтверждено ---------- */
      var stressed = IND.filter(function (i) { return i.state === 'stress'; });
      var gaps = IND.filter(function (i) { return i.state === 'nodata'; });

      var groupTiles = GROUPS.map(function (g) {
        var gv = groupIndex(g.id), c = coverage(g.id), weak = c.share < MIN_COVERAGE;
        var st = gv === null ? 'nodata' : tension(gv).state;
        return '<div class="tile' + (weak ? ' weak' : '') + '"><div class="label">' + esc(g.name) +
          '<span style="color:var(--muted)"> · вес ' + num(g.weight, 1) + '</span></div>' +
          '<div class="value">' + (gv === null ? '—' : Math.round(gv)) + '<small>/100</small></div>' +
          '<div class="bar"><span style="width:' + (gv === null ? 0 : pct(gv)) + '%;background:var(--' +
            (st === 'stress' ? 'critical' : st === 'watch' ? 'warning' : st === 'ok' ? 'ok' : 'nodata') + ')"></span></div>' +
          '<div class="note">' + stateEl(st) + '</div>' +
          '<div class="note">Данные: ' + c.seen + ' из ' + c.all +
            (weak ? ' · <b style="color:var(--critical)">вывод не обеспечен</b>' : '') + '</div></div>';
      }).join('');

      var anchors = [
        { v: 'Более $1 трлн', l: 'Капвложения пяти крупнейших облаков за 2025-2026, связанные с ИИ', k: 'estimate', s: 'S1', c: ['bis-trillion'], lim: 'Определения компаний различаются, часть расходов относится ко всему облаку' },
        { v: '485 → 950', l: 'ТВт·ч электропотребления мировых ЦОД: 2025 и прогноз на 2030', k: 'forecast', s: 'S4', c: ['iea-energy'], lim: 'Чувствителен к эффективности процессоров, видам запросов и загрузке' },
        { v: '18% / 32%', l: 'Доля компаний США с ИИ: простая и взвешенная по занятости', k: 'fact', s: 'S6', c: ['census-adoption'], lim: 'Использование не равно глубокой перестройке бизнеса' }
      ].map(function (x) {
        return '<div class="tile"><div class="label">' + esc(x.l) + '</div>' +
          '<div class="value">' + esc(x.v) + '</div>' +
          '<div class="row">' + badge(x.k) + srcref(x.s) + citeref(x.c) + '</div>' +
          '<div class="note">' + esc(x.lim) + '</div></div>';
      }).join('');

      var block2 = '<h2 class="section">2 · Чем подтверждено</h2>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Сработавшие стресс-сигналы</h3>' +
            '<p class="sub">Показатели, перешедшие порог, описанный в исследовании</p>' +
            (stressed.length ? stressed.map(function (i) {
              return '<div class="loop" style="border-left-color:var(--critical);margin-bottom:8px">' +
                '<div class="why"><b>' + esc(i.name) + '</b></div>' +
                '<div class="why">' + esc(i.obs) + ' ' + refs(i) + '</div></div>';
            }).join('') : '<p class="note">Сработавших сигналов нет.</p>') +
          '</div>' +
          '<div class="panel"><h3>Чем вывод не обеспечен</h3>' +
            (function () {
              var cs = citeSummary();
              return '<div class="note" style="margin-bottom:12px"><b>Сверка с первоисточниками: ' + cs.verified + ' из ' + cs.total + ' дословно.</b> ' +
                'Частично подтверждено ' + cs.partial + ', расхождений ' + cs.mismatch + ', источник недоступен у ' + cs.unreachable + ', не сверялось ' + cs.pending + '. ' +
                '<button class="linkbtn" type="button" data-goto="sources" style="margin:0">Реестр сверок →</button></div>';
            })() +
            '<p class="sub">' + gaps.length + ' показателей из ' + IND.length + ' не имеют публичного ряда. Это не ноль, а пробел</p>' +
            '<ul class="list">' + gaps.map(function (i) { return '<li><b>' + esc(i.name) + '</b> — ' + esc(i.obs) + '</li>'; }).join('') + '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="cols cols-3">' + groupTiles + '</div>' +
        '<div class="cols cols-3">' + anchors + '</div>';

      /* ---------- 3. Какой вывод допустим ---------- */
      var can = LADDER.filter(function (r) { return r.state === 'ok'; });
      var cant = LADDER.filter(function (r) { return r.state !== 'ok'; });

      var block3 = '<h2 class="section">3 · Какой вывод допустим</h2>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Что можно утверждать</h3>' +
            '<p class="sub">Ступени лестницы доказательств, где наблюдение есть</p>' +
            can.map(function (r) {
              return '<div class="change"><div class="arr" style="color:var(--ok)">✓</div><div class="body"><b>' + esc(r.level) + '</b><br>' + esc(r.seen) + ' ' + refs(r) + '</div></div>';
            }).join('') +
            '<div class="note" style="margin-top:12px">Индекс ' + num(v, 0) + ' означает: среди ' + cov.seen + ' наблюдаемых показателей ' +
              IND.filter(function (i) { return i.state === 'stress'; }).length + ' дают стресс-сигнал и ' +
              IND.filter(function (i) { return i.state === 'watch'; }).length + ' требуют наблюдения. Это состояние панели, а не измеренная вероятность коррекции.</div>' +
          '</div>' +
          '<div class="panel"><h3>Чего утверждать нельзя</h3>' +
            '<p class="sub">Ступени, где наблюдения не хватает или оно противоречиво</p>' +
            cant.map(function (r) {
              return '<div class="change"><div class="arr" style="color:var(--critical)">✕</div><div class="body"><b>' + esc(r.level) + '</b><br>' + esc(r.cannot) + ' ' + refs(r) + '</div></div>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div class="cols cols-2">' +
          '<div class="panel"><h3>Формулировки, которых стоит избегать</h3>' +
            '<ul class="list">' + ED.badPhrases.slice(0, 3).map(function (b) {
              return '<li>«' + esc(b.text) + '» — ' + esc(b.why) + '</li>';
            }).join('') + '</ul>' +
            '<button class="linkbtn" type="button" data-goto="editorial">Все пять и точные формулировки неопределённости →</button></div>' +
          '<div class="panel"><h3>Как говорить о неопределённости</h3>' +
            '<ul class="list">' + ED.precisePhrases.slice(0, 3).map(function (x) { return '<li>«' + esc(x) + '»</li>'; }).join('') + '</ul></div>' +
        '</div>';

      /* ---------- 4. Какой вопрос задать ---------- */
      var qs = pickQuestions(6);
      var block4 = '<h2 class="section">4 · Какой вопрос задать эксперту</h2>' +
        '<div class="panel"><h3>Подобрано под текущую картину</h3>' +
          '<p class="sub">Вопросы из исследования, у которых тема совпадает с тем, что сейчас движется или не обеспечено данными</p>' +
          (qs.length ? '<div class="tablewrap compact"><table><thead><tr><th>Вопрос</th><th>Кому</th><th>Почему сейчас</th></tr></thead><tbody>' +
            qs.map(function (x) {
              return '<tr><td><b>' + esc(x.q.q) + '</b></td><td>' + esc(ED.audiences[x.q.to]) + '</td>' +
                '<td>' + esc(x.group) + '<span class="sub">' + esc(x.why) + '</span></td></tr>';
            }).join('') + '</tbody></table></div>' : '<p class="note">Нечего выделить: ни один показатель не движется и не помечен как необеспеченный.</p>') +
          '<button class="linkbtn" type="button" data-goto="editorial">Все 65 вопросов собеседникам →</button>' +
        '</div>';

      /* ---------- журнал ---------- */
      var log = HIST.length ? '<h2 class="section">Журнал обновлений</h2>' +
        '<div class="tablewrap compact"><table><thead><tr><th>Сборка</th><th>Что обновляли</th>' +
        '<th class="num">Индекс</th><th class="num">Изменение</th><th class="num">Контуров</th><th class="num">Данные</th><th class="num">Сверено</th></tr></thead><tbody>' +
        HIST.slice().reverse().map(function (h, i, arr) {
          var prev = arr[i + 1];
          var d = prev ? Math.round((h.index.overall - prev.index.overall) * 10) / 10 : null;
          var seen = 0, all = 0;
          Object.keys(h.index.groups).forEach(function (g) { seen += h.index.groups[g].seen; all += h.index.groups[g].all; });
          return '<tr><td>' + esc(h.builtAt) + '</td><td>' + esc(h.label) + '</td>' +
            '<td class="num">' + num(h.index.overall) + '</td>' +
            '<td class="num">' + (d === null ? '—' : '<span class="delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + num(d) + '</span>') + '</td>' +
            '<td class="num">' + h.graph.cycles.length + '</td>' +
            '<td class="num">' + seen + ' из ' + all + '</td>' +
            '<td class="num">' + (h.cites && h.cites.total ? h.cites.verified + ' из ' + h.cites.total : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="note">Все снимки пересчитаны действующей методикой (версия ' + VGM.METHOD + '), а не сохранены такими, какими их когда-то показывал экран: изменение методики не должно выглядеть как изменение рынка. ' +
          esc(M.disclaimer) + '</div>' : '';

      return block1 + block2 + block3 + block4 + log;
    }
  };

  /* ---------------------------------------------------------- 2. Граф */
  VIEWS.network = {
    nav: 'Граф связей', hint: '01',
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
          '<th>Откуда идут деньги</th><th>Куда</th><th>Тип</th><th>Что это</th><th>Основание</th><th>Сверка</th>' +
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
            '<td>' + refMark(e) + '</td>' +
            '<td>' + (e.cite ? citeref(e.cite) : '<span class="cite none">—</span>') + '</td></tr>';
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
    nav: 'Стек цикла', hint: '02',
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
    nav: 'Капитал и поток', hint: '03',
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
          '<td>' + srcref(c.src) + '<span class="sub">' + (c.cite ? citeref(c.cite) : '') + '</span></td></tr>' +
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
          '<th>Что опровергнет позитивный сценарий</th><th>Источник и сверка</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
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
    nav: 'Энергия и физика', hint: '04',
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
    nav: 'Панель 28 показателей', hint: '05',
    title: 'Панель из 28 показателей',
    sub: 'Что проверять каждый квартал. Колонка «Проверено» показывает, когда наблюдение последний раз сверялось с источником и сколько осталось до ожидаемого обновления. Серый статус означает не ноль, а отсутствие публичного ряда — это самостоятельный вывод: главные показатели окупаемости сегодня просто не раскрываются.',
    render: function () {
      var byGroup = GROUPS.map(function (g) {
        var items = IND.filter(function (i) { return i.g === g.id; });
        return '<h2 class="section">' + esc(g.name) + '</h2>' +
          '<div class="tablewrap"><table><thead><tr><th>Показатель</th><th>Почему важен</th><th>Стресс-сигнал</th><th>Наблюдение</th><th>Сверка</th><th>Проверено</th><th>Статус</th></tr></thead><tbody>' +
          items.map(function (i) {
            var f = VGM.freshness(i, today());
            var srcDate = (M.sources[(i.srcs || [i.src])[0]] || {}).date;
            var cls = f.overdue ? 'over' : f.ratio > 0.75 ? 'due' : '';
            return '<tr><td><b>' + esc(i.name) + '</b></td><td>' + esc(i.why) + '</td><td>' + esc(i.stress) + '</td>' +
              '<td>' + esc(i.obs) + ' ' + (i.kind ? badge(i.kind) + ' ' : '') + srcref(i.srcs || i.src) + '</td>' +
              '<td style="min-width:96px">' + (i.cite ? citeref(i.cite) : '<span class="cite none">не привязано</span>') + '</td>' +
              '<td class="num" style="min-width:132px">' + esc(i.checked) +
                '<span class="sub">' + f.age + ' дн. назад из ' + f.due +
                (f.overdue ? ' · <b style="color:var(--critical)">требует проверки</b>' : '') + '</span>' +
                '<div class="freshbar ' + cls + '"><span style="width:' + pct(f.ratio * 100).toFixed(0) + '%"></span></div>' +
                (srcDate ? '<span class="sub">источник от ' + esc(srcDate) + '</span>' : '') +
              '</td><td>' + stateEl(i.state) + '</td></tr>';
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
    nav: 'Сценарии', hint: '06',
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
    nav: 'Россия', hint: '07',
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


  /* ----------------------------------------------------- 8. Для эфира */
  VIEWS.editorial = {
    nav: 'Для эфира', hint: '08',
    title: 'Подводки, формулировки, вопросы',
    sub: 'Редакционная часть исследования целиком: три подводки разной длины, два сильных тезиса, формулировки, которых стоит избегать, и 65 вопросов собеседникам.',
    render: function () {
      var leads = ED.leads.map(function (l) {
        return '<div class="panel"><h3>' + esc(l.title) + '</h3>' +
          '<p style="margin:0;color:var(--ink-2);max-width:68ch">' + esc(l.text) + '</p>' +
          '<div class="note" style="margin-top:10px">Знаков: ' + l.text.length + ' · вслух примерно ' + Math.round(l.text.length / 14) + ' секунд</div></div>';
      }).join('');

      var theses = ED.theses.map(function (t) {
        return '<div class="panel"><h3>' + esc(t.side) + '</h3><p style="margin:0;color:var(--ink-2)">' + esc(t.text) + '</p></div>';
      }).join('');

      var bad = '<div class="panel"><h3>Пять формулировок, которых стоит избегать</h3>' +
        '<div class="tablewrap compact"><table><tbody>' + ED.badPhrases.map(function (b) {
          return '<tr><td><span class="st st-stress"><i></i></span></td><td><b>«' + esc(b.text) + '»</b><span class="sub">' + esc(b.why) + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';

      var good = '<div class="panel"><h3>Пять точных формулировок неопределённости</h3>' +
        '<div class="tablewrap compact"><table><tbody>' + ED.precisePhrases.map(function (x) {
          return '<tr><td><span class="st st-ok"><i></i></span></td><td>«' + esc(x) + '»</td></tr>';
        }).join('') + '</tbody></table></div></div>';

      var hot = hotGroups(true);   // фильтр — только то, что сдвинулось или подаёт сигнал
      var filters = '<div class="controls" style="margin-bottom:12px">' +
        Object.keys(ED.audiences).map(function (k) {
          return '<button class="chip" type="button" role="switch" aria-pressed="true" data-aud="' + k + '">' + esc(ED.audiences[k]) + '</button>';
        }).join('') +
        '<button class="chip" type="button" role="switch" aria-pressed="false" id="onlyHot">Только темы, которые сдвинулись</button></div>';

      var qrows = ED.questions.map(function (q, i) {
        var hits = q.tags.filter(function (t) { return hot[t]; });
        return '<tr data-aud="' + q.to + '" data-hot="' + (hits.length ? '1' : '0') + '">' +
          '<td class="num" style="color:var(--muted)">' + (i + 1) + '</td>' +
          '<td><b>' + esc(q.q) + '</b></td>' +
          '<td>' + esc(ED.audiences[q.to]) + '</td>' +
          '<td>' + q.tags.map(function (t) { return '<span class="badge' + (hot[t] ? ' fact' : '') + '">' + esc(DICT.groups[t] || t) + '</span>'; }).join(' ') + '</td></tr>';
      }).join('');

      return '' +
        '<h2 class="section">Подводки</h2>' +
        '<div class="cols cols-2">' + leads + '</div>' +
        '<h2 class="section">Два сильных тезиса</h2>' +
        '<div class="cols cols-2">' + theses + '</div>' +
        '<h2 class="section">Формулировки</h2>' +
        '<div class="cols cols-2">' + bad + good + '</div>' +
        '<h2 class="section">Вопросы собеседникам</h2>' +
        '<div class="panel">' + filters +
          '<p class="sub">Тема помечена зелёным, если в этой группе что-то изменилось с прошлой сборки или сработал стресс-сигнал</p>' +
          '<div class="tablewrap compact"><table id="qtable"><thead><tr><th class="num">№</th><th>Вопрос</th><th>Кому</th><th>Тема</th></tr></thead><tbody>' + qrows + '</tbody></table></div>' +
        '</div>' +
        '<div class="note">Темы вопросов расставлены по ключевым словам самого вопроса — правило видно в файле данных, поэтому подбор проверяем.</div>';
    },
    after: function (root) {
      function apply() {
        var auds = {};
        root.querySelectorAll('[data-aud][role="switch"]').forEach(function (b) {
          auds[b.dataset.aud] = b.getAttribute('aria-pressed') === 'true';
        });
        var onlyHot = root.querySelector('#onlyHot').getAttribute('aria-pressed') === 'true';
        root.querySelectorAll('#qtable tbody tr').forEach(function (tr) {
          var ok = auds[tr.dataset.aud] && (!onlyHot || tr.dataset.hot === '1');
          tr.hidden = !ok;
        });
      }
      root.querySelectorAll('.chip[role="switch"]').forEach(function (b) {
        b.addEventListener('click', function () {
          b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
          apply();
        });
      });
      apply();
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
      var sum = citeSummary();
      var ORDER_ST = ['mismatch', 'pending', 'unreachable', 'partial', 'verified'];
      var citeRows = Object.keys(CITES).sort(function (a, b) {
        var d = CITE_RANK[CITES[a].status] - CITE_RANK[CITES[b].status];
        return d || (CITES[a].src > CITES[b].src ? 1 : -1);
      }).map(function (id) {
        var c = CITES[id], st = CITE_STATUS[c.status], srcObj = M.sources[c.src] || {};
        return '<tr id="cite-' + id + '"><td class="num">' + srcref(c.src) + '</td>' +
          '<td><span class="cite ' + st.cls + '">' + st.glyph + '</span> ' + esc(st.label) + '</td>' +
          '<td>' + esc(srcObj.org || '') + '<span class="sub">' + esc(c.loc || 'место в документе не указано') + '</span></td>' +
          '<td>' + (c.quote ? '<p class="quote"><em>дословно из источника</em>' + esc(c.quote) + '</p>' : '') +
            (c.note ? '<span class="sub">' + esc(c.note) + '</span>' : '') + '</td>' +
          '<td class="num">' + esc(c.checked || '—') + '</td></tr>';
      }).join('');

      var queue = Object.keys(CITES).filter(function (id) {
        return ['mismatch', 'pending', 'unreachable'].indexOf(CITES[id].status) >= 0;
      });

      var tiles = [
        { k: 'verified', l: 'Сверено дословно' },
        { k: 'partial', l: 'Подтверждено частично' },
        { k: 'mismatch', l: 'Расхождение' },
        { k: 'unreachable', l: 'Источник недоступен' },
        { k: 'pending', l: 'Не сверялось' }
      ].map(function (x) {
        var st = CITE_STATUS[x.k];
        return '<div class="tile"><div class="label">' + esc(x.l) + '</div>' +
          '<div class="value">' + sum[x.k] + '<small>/' + sum.total + '</small></div>' +
          '<div class="bar"><span style="width:' + (sum[x.k] / sum.total * 100).toFixed(0) + '%;background:var(--' +
            (x.k === 'verified' ? 'ok' : x.k === 'partial' ? 'warning' : x.k === 'mismatch' ? 'critical' : 'nodata') + ')"></span></div>' +
          '<div class="note"><span class="cite ' + st.cls + '">' + st.glyph + '</span> ' + esc(st.label) + '</div></div>';
      }).join('');

      return '' +
        '<h2 class="section">Сверка с первоисточниками</h2>' +
        '<div class="cols cols-3">' + tiles + '</div>' +
        '<div class="panel"><h3>Что значит сверка</h3>' +
          '<p class="sub" style="margin-bottom:12px">Ссылка на источник — ещё не проверяемость. Сверка означает, что первоисточник открыт, найдено конкретное место в документе и записана дословная формулировка. Чип рядом с цифрой показывает статус, наведение открывает цитату, нажатие ведёт в этот реестр.</p>' +
          '<div class="note"><b>Очередь сверки: ' + queue.length + ' из ' + sum.total + '.</b> Сюда попадают расхождения, недоступные источники и то, что ещё не проверялось. Часть источников отвечает отказом на запрос из среды сборки — это не значит, что они недостоверны, это значит, что сверку по ним нужно проводить вручную.</div>' +
        '</div>' +
        '<div class="tablewrap"><table><thead><tr><th class="num">Источник</th><th>Статус</th><th>Где в документе</th><th>Что там написано</th><th class="num">Сверено</th></tr></thead><tbody>' +
          citeRows + '</tbody></table></div>' +
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
  var ORDER = ['brief', 'network', 'stack', 'capital', 'energy', 'panel', 'scenarios', 'russia', 'editorial', 'sources'];
  var GROUPS_NAV = [
    { label: 'Обзор', items: ['brief', 'network'] },
    { label: 'Слои цикла', items: ['stack', 'capital', 'energy'] },
    { label: 'Проверка', items: ['panel', 'scenarios'] },
    { label: 'Контур', items: ['russia'] },
    { label: 'Работа', items: ['editorial', 'sources'] }
  ];

  var rendered = {};

  function show(id) {
    if (!VIEWS[id]) id = 'brief';
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
      var b = ev.target.closest ? ev.target.closest('.src, .linkbtn, .cite') : null;
      if (!b) return;
      if (b.dataset.goto) { show(b.dataset.goto); return; }
      if (b.dataset.cite) {
        show('sources');
        var crow = document.getElementById('cite-' + b.dataset.cite);
        if (crow) {
          crow.scrollIntoView({ block: 'center' });
          crow.style.background = 'var(--accent-soft)';
          setTimeout(function () { crow.style.background = ''; }, 2600);
        }
        return;
      }
      if (!b.dataset.src) return;
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

    var ages = IND.map(function (i) { return VGM.freshness(i, today()); });
    var overdue = ages.filter(function (f) { return f.overdue; }).length;
    var oldest = Math.max.apply(null, ages.map(function (f) { return f.age; }));
    var fresh = document.getElementById('freshness');
    fresh.innerHTML = overdue
      ? '<i style="background:var(--warning)"></i>требуют проверки: ' + overdue + ' из ' + IND.length
      : '<i></i>данные проверялись ' + oldest + ' дн. назад';
    fresh.title = overdue
      ? 'У ' + overdue + ' показателей истекла ожидаемая периодичность обновления'
      : 'Наибольшая давность проверки среди 28 показателей панели';

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
    show(location.hash.slice(1) || 'brief');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
