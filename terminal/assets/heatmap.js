/* =========================================================================
   Тепловая карта рынка: квадраты компаний цикла.

   Площадь квадрата — корень из капитализации: при линейном масштабе Nvidia
   и Microsoft заняли бы почти всё поле, а CoreWeave и Supermicro, самые
   уязвимые звенья по исследованию, стали бы невидимы. Об этом сказано в
   легенде.

   Цвет — расходящаяся шкала: синий рост, красный падение, нейтральный серый
   около нуля. Красно-зелёная пара неразличима при самой частой форме
   цветовой слепоты, поэтому здесь синий; знак и величина всегда подписаны
   на квадрате, цвет только подкрепляет число.
   ========================================================================= */
(function (global) {
  'use strict';

  var PERIODS = {
    d1:  { label: '1 день',            steps: [0.5, 1.5, 3, 6, 10] },
    d5:  { label: '5 дней',            steps: [1, 3, 6, 10, 15] },
    m1:  { label: 'Месяц',             steps: [2, 5, 10, 20, 35] },
    cut: { label: 'С даты исследования', steps: [2, 5, 10, 20, 35] }
  };

  function step(p, period) {
    if (p === null || p === undefined || isNaN(p)) return null;
    var st = PERIODS[period].steps, k = 0;
    for (var i = 0; i < st.length; i++) if (Math.abs(p) >= st[i]) k = i + 1;
    return k === 0 ? 'z' : (p > 0 ? 'u' : 'd') + k;
  }

  /* Квадратная укладка (squarified treemap): ряд растёт, пока худшее
     соотношение сторон в нём не начинает ухудшаться */
  function squarify(items, x, y, w, h) {
    var total = items.reduce(function (a, it) { return a + it.v; }, 0) || 1;
    var rest = items.slice().sort(function (a, b) { return b.v - a.v; })
      .map(function (it) { return { it: it, a: it.v / total * w * h }; });
    var out = [], r = { x: x, y: y, w: w, h: h };
    function worst(row, side) {
      var s = 0, mx = 0, mn = Infinity;
      row.forEach(function (o) { s += o.a; mx = Math.max(mx, o.a); mn = Math.min(mn, o.a); });
      return Math.max(side * side * mx / (s * s), (s * s) / (side * side * mn));
    }
    while (rest.length) {
      var side = Math.min(r.w, r.h), row = [rest[0]], i = 1;
      while (i < rest.length && worst(row.concat([rest[i]]), side) <= worst(row, side)) { row.push(rest[i]); i++; }
      var s = row.reduce(function (a, o) { return a + o.a; }, 0);
      if (r.w >= r.h) {
        var cw = s / r.h, yy = r.y;
        row.forEach(function (o) { var hh = o.a / cw; out.push({ it: o.it, x: r.x, y: yy, w: cw, h: hh }); yy += hh; });
        r = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h };
      } else {
        var rh = s / r.w, xx = r.x;
        row.forEach(function (o) { var ww = o.a / rh; out.push({ it: o.it, x: xx, y: r.y, w: ww, h: rh }); xx += ww; });
        r = { x: r.x, y: r.y + rh, w: r.w, h: r.h - rh };
      }
      rest = rest.slice(i);
    }
    return out;
  }

  function pctText(p) {
    if (p === null || p === undefined || isNaN(p)) return '—';
    return (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  }

  /* взвешенное по капитализации изменение группы */
  function weighted(list, period) {
    var num = 0, den = 0;
    list.forEach(function (q) {
      var p = q[period], w = q.mcap || 0;
      if (p === null || p === undefined || !w) return;
      num += p * w; den += w;
    });
    return den ? num / den : null;
  }

  global.VGHeat = { PERIODS: PERIODS, step: step, squarify: squarify, pctText: pctText, weighted: weighted };
})(window);
