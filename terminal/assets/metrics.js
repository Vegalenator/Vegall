/* =========================================================================
   Расчёты терминала. Один и тот же код считает то, что видно на экране,
   и то, что записывается в снимок истории: иначе история и интерфейс
   разошлись бы уже на втором обновлении.
   Работает и в браузере (window.VGM), и в node (module.exports).
   ========================================================================= */
(function (root) {
  'use strict';

  /* 0 — все наблюдаемые показатели в норме, 100 — все дают стресс-сигнал */
  var SCORE = { stress: 100, watch: 50, ok: 0 };
  var MIN_COVERAGE = 0.6;

  /* Версия методики расчёта. Меняется при изменении шкалы, весов или порогов.
     Все снимки истории пересчитываются действующей методикой, поэтому
     изменение методики никогда не выглядит как изменение рынка. */
  var METHOD = 2;

  function coverage(indicators, gid) {
    var all = indicators.filter(function (i) { return !gid || i.g === gid; });
    var seen = all.filter(function (i) { return i.state !== 'nodata'; });
    return { seen: seen.length, all: all.length, share: all.length ? seen.length / all.length : 0 };
  }

  function groupIndex(indicators, gid) {
    var items = indicators.filter(function (i) { return i.g === gid && i.state !== 'nodata'; });
    if (!items.length) return null;
    return items.reduce(function (a, i) { return a + SCORE[i.state]; }, 0) / items.length;
  }

  function overallIndex(indicators, groups) {
    var num = 0, den = 0;
    groups.forEach(function (g) {
      var v = groupIndex(indicators, g.id);
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

  /* ---- давность проверки ---------------------------------------------- */
  function days(from, to) {
    return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  }
  function freshness(ind, today) {
    var age = days(ind.checked, today);
    var due = ind.cadence || 180;
    return { age: age, due: due, overdue: age > due, ratio: due ? age / due : 0 };
  }

  /* ---- поиск круговых контуров ----------------------------------------
     Контур засчитывается только при наличии обратного пути. Длина от двух
     узлов: пара встречных связей — такой же контур, как и тройка. */
  function findCycles(edges, maxLen) {
    var LIMIT = maxLen || 4, adj = {}, found = {}, out = [];
    edges.forEach(function (e) { (adj[e.from] = adj[e.from] || []).push(e); });

    function walk(start, cur, path, used) {
      var next = adj[cur] || [];
      for (var i = 0; i < next.length; i++) {
        var e = next[i];
        if (e.to === start && path.length >= 1) {
          var ring = path.concat([e]);
          var key = ring.map(function (x) { return x.from; }).slice().sort().join('>');
          if (!found[key]) { found[key] = 1; out.push(ring); }
        } else if (path.length < LIMIT - 1 && !used[e.to] && e.to > start) {
          used[e.to] = 1;
          walk(start, e.to, path.concat([e]), used);
          delete used[e.to];
        }
      }
    }
    Object.keys(adj).sort().forEach(function (id) {
      var used = {}; used[id] = 1;
      walk(id, id, [], used);
    });
    return out;
  }

  function cycleKey(ring) {
    return ring.map(function (e) { return e.from; }).slice().sort().join(' + ');
  }

  /* ---- сбор исходных данных --------------------------------------------
     Одна функция и для страницы, и для скрипта снимков. Раньше состав полей
     повторялся в двух местах, и при добавлении реестра сверок страница
     осталась со старым составом: она считала, что данные изменились, хотя
     менялся только способ их собрать. */
  function collect(root) {
    root = root || (typeof window !== 'undefined' ? window : globalThis);
    return {
      meta: root.VG_META, groups: root.VG_GROUPS, indicators: root.VG_INDICATORS,
      companies: root.VG_COMPANIES, nodes: root.VG_NODES, edges: root.VG_EDGES,
      scenarios: root.VG_SCENARIOS, cites: root.VG_CITES || {}
    };
  }

  /* ---- снимок состояния ------------------------------------------------ */
  function snapshot(d, label) {
    var snap = {
      asOf: d.meta.asOf,
      builtAt: d.meta.builtAt,
      label: label || '',
      method: METHOD,
      index: { overall: Math.round(overallIndex(d.indicators, d.groups) * 10) / 10, groups: {} },
      indicators: {},
      companies: {},
      graph: {},
      scenarios: {},
      cites: { verified: 0, partial: 0, mismatch: 0, unreachable: 0, pending: 0, total: 0 }
    };
    Object.keys(d.cites || {}).forEach(function (id) {
      var st = d.cites[id].status;
      if (snap.cites[st] === undefined) snap.cites[st] = 0;
      snap.cites[st]++; snap.cites.total++;
    });
    d.groups.forEach(function (g) {
      var c = coverage(d.indicators, g.id), v = groupIndex(d.indicators, g.id);
      snap.index.groups[g.id] = { value: v === null ? null : Math.round(v * 10) / 10, seen: c.seen, all: c.all };
    });
    d.indicators.forEach(function (i) { snap.indicators[i.id] = { state: i.state, checked: i.checked }; });
    d.companies.forEach(function (c) {
      var row = {};
      ['capex', 'capexDelta', 'ocf', 'fcf', 'rpo', 'revenue'].forEach(function (k) {
        if (typeof c[k] === 'number') row[k] = c[k];
      });
      snap.companies[c.id] = row;
    });
    var rings = findCycles(d.edges);
    snap.graph = {
      nodes: d.nodes.length,
      edges: d.edges.length,
      cycles: rings.map(cycleKey).sort()
    };
    (d.scenarios || []).forEach(function (s) {
      snap.scenarios[s.id] = {
        prob: s.prob,
        met: s.signals.filter(function (x) { return x.met === true; }).length,
        known: s.signals.filter(function (x) { return x.met !== null; }).length,
        total: s.signals.length
      };
    });
    return snap;
  }

  /* ---- сравнение двух снимков ----------------------------------------- */
  var STATE_NAMES = { ok: 'норма', watch: 'наблюдение', stress: 'стресс-сигнал', nodata: 'нет публичного ряда' };

  function diff(prev, cur, dict) {
    dict = dict || {};
    var out = { index: null, groups: [], indicators: [], companies: [], cycles: [], graph: null, scenarios: [], cites: null };
    if (!prev) return out;

    if (prev.index.overall !== cur.index.overall) {
      out.index = { from: prev.index.overall, to: cur.index.overall, delta: Math.round((cur.index.overall - prev.index.overall) * 10) / 10 };
    }
    Object.keys(cur.index.groups).forEach(function (gid) {
      var a = prev.index.groups[gid], b = cur.index.groups[gid];
      if (!a) return;
      if (a.value !== b.value || a.seen !== b.seen) {
        out.groups.push({ id: gid, name: (dict.groups || {})[gid] || gid, from: a.value, to: b.value,
                          seenFrom: a.seen, seenTo: b.seen, all: b.all });
      }
    });
    Object.keys(cur.indicators).forEach(function (id) {
      var a = prev.indicators[id], b = cur.indicators[id];
      if (!a) { out.indicators.push({ id: id, name: (dict.indicators || {})[id] || id, added: true, to: b.state }); return; }
      if (a.state !== b.state) {
        out.indicators.push({ id: id, name: (dict.indicators || {})[id] || id,
                              from: a.state, to: b.state,
                              fromName: STATE_NAMES[a.state], toName: STATE_NAMES[b.state] });
      }
    });
    Object.keys(cur.companies).forEach(function (id) {
      var a = prev.companies[id] || {}, b = cur.companies[id];
      Object.keys(b).forEach(function (k) {
        if (a[k] !== b[k]) out.companies.push({ id: id, name: (dict.companies || {})[id] || id, field: k, from: a[k], to: b[k] });
      });
      Object.keys(a).forEach(function (k) {
        if (!(k in b)) out.companies.push({ id: id, name: (dict.companies || {})[id] || id, field: k, from: a[k], to: null });
      });
    });
    var was = prev.graph.cycles || [], now = cur.graph.cycles || [];
    now.forEach(function (c) { if (was.indexOf(c) < 0) out.cycles.push({ key: c, added: true }); });
    was.forEach(function (c) { if (now.indexOf(c) < 0) out.cycles.push({ key: c, added: false }); });
    if (prev.graph.nodes !== cur.graph.nodes || prev.graph.edges !== cur.graph.edges) {
      out.graph = { nodesFrom: prev.graph.nodes, nodesTo: cur.graph.nodes, edgesFrom: prev.graph.edges, edgesTo: cur.graph.edges };
    }
    var pc = prev.cites, cc = cur.cites;
    if (pc && cc && (pc.verified !== cc.verified || pc.total !== cc.total)) {
      out.cites = { verifiedFrom: pc.verified, verifiedTo: cc.verified, totalFrom: pc.total, totalTo: cc.total };
    } else if (!pc && cc && cc.total) {
      out.cites = { verifiedFrom: 0, verifiedTo: cc.verified, totalFrom: 0, totalTo: cc.total };
    }
    Object.keys(cur.scenarios).forEach(function (id) {
      var a = prev.scenarios[id], b = cur.scenarios[id];
      if (a && (a.met !== b.met || a.known !== b.known)) {
        out.scenarios.push({ id: id, metFrom: a.met, metTo: b.met, knownFrom: a.known, knownTo: b.known, total: b.total });
      }
    });
    return out;
  }

  function count(d) {
    return d.indicators.length + d.companies.length + d.cycles.length + d.groups.length +
           d.scenarios.length + (d.graph ? 1 : 0) + (d.index ? 1 : 0) + (d.cites ? 1 : 0);
  }

  var api = { SCORE: SCORE, MIN_COVERAGE: MIN_COVERAGE, METHOD: METHOD, STATE_NAMES: STATE_NAMES,
              coverage: coverage, groupIndex: groupIndex, overallIndex: overallIndex, tension: tension,
              collect: collect, days: days, freshness: freshness, findCycles: findCycles, cycleKey: cycleKey,
              snapshot: snapshot, diff: diff, count: count };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.VGM = api;
})(typeof window !== 'undefined' ? window : globalThis);
