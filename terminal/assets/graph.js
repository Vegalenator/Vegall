/* =========================================================================
   Граф связей капитала, поставок и контрактов.
   Собственная силовая раскладка — без внешних библиотек.

   Ключевая идея раскладки: деньги текут сверху вниз.
   Наверху — источники денег (капитал и конечные клиенты), внизу — фабрики
   и память. Любая стрелка, идущая ВВЕРХ против потока, и есть круговая связь.
   ========================================================================= */
(function (global) {
  'use strict';

  var RANK = { capital: 0, demand: 0, model: 1, cloud: 2, speccloud: 2, dc: 3, energy: 4, chip: 4, fab: 5, memory: 5 };
  var RANKS = 6;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Контрольная точка дуги. Встречные связи между двумя узлами изгибаются
     в разные стороны, поэтому пара противоположных стрелок сама образует
     замкнутое кольцо — его и обводит режим контуров. */
  function ctrl(a, b, circular) {
    var up = b.y < a.y - 2;
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var bend = (up ? 34 : 14) * (circular ? 1.6 : 1);
    return { x: mx + (dy / len) * bend, y: my - (dx / len) * bend };
  }

  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    return n;
  }

  function Graph(opts) {
    this.host = opts.host;
    this.nodes = opts.nodes.map(function (n) {
      return { id: n.id, name: n.name, full: n.full || n.name, layer: n.layer, country: n.country,
               note: n.note, x: 0, y: 0, deg: 0, r: 7, row: 0 };
    });
    this.index = {};
    var self = this;
    this.nodes.forEach(function (n) { self.index[n.id] = n; });
    this.edges = opts.edges.filter(function (e) { return self.index[e.from] && self.index[e.to]; })
      .map(function (e) { return Object.assign({}, e); });
    this.edges.forEach(function (e) {
      self.index[e.from].deg++; self.index[e.to].deg++;
      e.s = self.index[e.from]; e.t = self.index[e.to];
    });
    this.nodes.forEach(function (n) { n.r = 6 + Math.min(9, Math.sqrt(n.deg) * 2.6); });
    this.filters = { types: {}, onlyReport: false, focus: null };
    Object.keys(opts.edgeTypes).forEach(function (k) { self.filters.types[k] = true; });
    this.onSelect = opts.onSelect || function () {};
    this.loopInfo = opts.loopInfo || null;      // function(loop) -> html карточки
    /* порядок контуров: сначала самые доказанные — номер на карте и в списке совпадает */
    this.loopRank = opts.loopRank || function (c) {
      return c.edges.every(function (e) { return e.inReport === 'yes'; }) ? 0 : 1;
    };
    this.loopMode = false;
    this.pinned = null;                         // номер закреплённого контура
    this.loops = [];
    this.build();
  }

  Graph.prototype.visibleEdges = function () {
    var f = this.filters;
    return this.edges.filter(function (e) {
      if (!f.types[e.type]) return false;
      if (f.onlyReport && e.inReport !== 'yes') return false;
      return true;
    });
  };

  /* Контуры ищет общий модуль расчётов: тот же код пишет снимки истории */
  Graph.prototype.cycles = function () {
    var self = this;
    return global.VGM.findCycles(this.visibleEdges()).map(function (ring) {
      return { edges: ring, names: ring.map(function (e) { return self.index[e.from].name; }) };
    });
  };

  Graph.prototype.build = function () {
    var self = this;
    var wrap = this.host;
    wrap.innerHTML = '';
    var svg = el('svg', { viewBox: '0 0 1000 620', preserveAspectRatio: 'xMidYMid meet', role: 'img',
                          'aria-label': 'Граф связей капитала, поставок и контрактов' });
    this.svg = svg;

    var defs = el('defs');
    ['supply', 'equity', 'debt', 'contract', 'external'].forEach(function (t) {
      var m = el('marker', { id: 'arw-' + t, viewBox: '0 0 10 10', refX: 9, refY: 5,
                             markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
      m.appendChild(el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'mk mk-' + t }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);

    this.root = el('g');
    this.gBands = el('g'); this.gLoops = el('g'); this.gEdges = el('g'); this.gNodes = el('g');
    this.root.appendChild(this.gBands);
    this.root.appendChild(this.gLoops);
    this.root.appendChild(this.gEdges);
    this.root.appendChild(this.gNodes);
    svg.appendChild(this.root);
    wrap.appendChild(svg);

    this.tip = document.createElement('div');
    this.tip.className = 'tip';
    this.tip.hidden = true;
    wrap.appendChild(this.tip);

    this.card = document.createElement('div');
    this.card.className = 'tip loopcard';
    this.card.hidden = true;
    this.card.setAttribute('role', 'dialog');
    this.card.setAttribute('aria-live', 'polite');
    wrap.appendChild(this.card);

    this.W = 1280; this.H = 660;
    this.svg.setAttribute('viewBox', '0 0 ' + this.W + ' ' + this.H);
    this.bandH = (this.H - 34) / RANKS;

    this.ranks = [];
    for (var r = 0; r < RANKS; r++) this.ranks.push([]);
    this.nodes.forEach(function (n) {
      var r = RANK[n.layer] || 0;
      n.rank = r;
      self.ranks[r].push(n);
      n.ty = 30 + r * self.bandH + self.bandH / 2;
      n.y = n.ty;
    });

    this.drawBands();
    this.render();
    this.layout();
    this.bindPointer();
  };

  /* --- ширина подписи: подписи чередуются над и под узлом, поэтому в один
         ряд попадают только узлы через один --- */
  function labelWidth(n) { return n.name.length * 6.1 + 14; }

  /* Слоистая раскладка: порядок внутри слоя определяет медиана соседей
     (классическая эвристика уменьшения пересечений), затем узлы
     раскладываются по ширине с шагом, который гарантирует читаемость подписей. */
  Graph.prototype.layout = function () {
    var self = this, edges = this.visibleEdges(), r, i;
    var nbr = {};
    this.nodes.forEach(function (n) { nbr[n.id] = []; });
    edges.forEach(function (e) { nbr[e.from].push(e.to); nbr[e.to].push(e.from); });

    this.ranks.forEach(function (list) {
      list.forEach(function (n, i) { n.ord = i; });
    });

    function spread(list) {
      list.sort(function (a, b) { return a.ord - b.ord; });
      var slots = list.map(function (n) { return Math.max(2 * n.r + 16, labelWidth(n) / 2 + 14); });
      var total = slots.reduce(function (a, b) { return a + b; }, 0);
      var pad = 54;
      var free = Math.max(0, (self.W - pad * 2) - total);
      var gap = list.length > 1 ? free / (list.length - 1) : 0;
      var x = pad;
      list.forEach(function (n, i) {
        var lw = labelWidth(n) / 2 + 6;
        n.x = Math.max(lw, Math.min(self.W - lw, x + slots[i] / 2));
        x += slots[i] + gap;
        n.row = i % 2;
      });
    }

    for (var pass = 0; pass < 8; pass++) {
      var down = pass % 2 === 0;
      for (var k = 0; k < RANKS; k++) {
        r = down ? k : RANKS - 1 - k;
        var list = this.ranks[r];
        if (!list.length) continue;
        list.forEach(function (n) {
          var xs = nbr[n.id].map(function (id) { return self.index[id]; })
            .filter(function (m) { return m && m.rank !== n.rank; })
            .map(function (m) { return m.x; });
          n.ord = xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : n.x;
        });
        spread(list);
      }
    }
    for (r = 0; r < RANKS; r++) spread(this.ranks[r]);
    this.position();
  };

  Graph.prototype.drawBands = function () {
    var self = this;
    var labels = ['Источники денег', 'Модели', 'Облака', 'ЦОД', 'Энергия и кремний', 'Фабрики и память'];
    this.gBands.innerHTML = '';
    for (var r = 0; r < RANKS; r++) {
      var y = 30 + r * this.bandH;
      if (r > 0) this.gBands.appendChild(el('line', { x1: 0, x2: this.W, y1: y, y2: y, class: 'bandline' }));
      var t = el('text', { x: 8, y: y + 13, class: 'bandlabel' });
      t.textContent = labels[r];
      this.gBands.appendChild(t);
    }
  };

  Graph.prototype.render = function () {
    var self = this;
    this.gEdges.innerHTML = '';
    this.gNodes.innerHTML = '';
    this.edgeEls = [];
    this.loops = this.cycles().map(function (c) {
      c.key = global.VGM.cycleKey(c.edges);
      c.rank = self.loopRank(c);
      return c;
    }).sort(function (a, b) {
      return a.rank - b.rank || (a.key < b.key ? -1 : 1);
    });
    this.loops.forEach(function (c, i) { c.n = i + 1; });
    var loopOf = new Map(), nodeInLoop = {};
    this.loops.forEach(function (c) {
      c.edges.forEach(function (e) {
        if (!loopOf.has(e)) loopOf.set(e, []);
        loopOf.get(e).push(c.n);
        nodeInLoop[e.from] = 1; nodeInLoop[e.to] = 1;
      });
    });

    this.visibleEdges().forEach(function (e) {
      var ln = loopOf.get(e) || [];
      var p = el('path', { class: 'gedge ge-' + e.type + (e.circular ? ' circ' : '') + (ln.length ? ' inloop' : ''),
                           'data-loops': ln.join(' ') || null,
                           'marker-end': 'url(#arw-' + e.type + ')',
                           'stroke-width': e.weight ? 1 + e.weight * 0.6 : 1.4,
                           'stroke-dasharray': e.type === 'debt' ? '5 4' : null });
      /* в режиме контуров связь контура открывает карточку контура, а не связи */
      p.addEventListener('mouseenter', function (ev) {
        if (self.loopMode && ln.length) self.showLoop(ln[0], ev);
        else self.showTip(ev, self.edgeTip(e));
      });
      p.addEventListener('mouseleave', function () { self.hideTip(); self.leaveLoop(); });
      p.addEventListener('click', function (ev) {
        if (self.loopMode && ln.length) { ev.stopPropagation(); self.pinLoop(ln[0]); }
      });
      self.gEdges.appendChild(p);
      self.edgeEls.push({ e: e, el: p });
    });
    this.nodeEls = [];
    this.nodes.forEach(function (n) {
      var g = el('g', { class: 'gnode' + (nodeInLoop[n.id] ? ' inloop' : ''), tabindex: 0, role: 'button', 'aria-label': n.name });
      var c = el('circle', { r: n.r, class: 'nd nd-' + n.layer });
      var t1 = el('text', { class: 'graph-node-label', 'text-anchor': 'middle' });
      t1.textContent = n.name;
      g.appendChild(c); g.appendChild(t1);
      g.addEventListener('mouseenter', function (ev) { self.showTip(ev, self.nodeTip(n)); });
      g.addEventListener('mouseleave', function () { self.hideTip(); });
      g.addEventListener('click', function () { self.focus(n.id === self.filters.focus ? null : n.id); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); self.focus(n.id === self.filters.focus ? null : n.id); }
      });
      self.gNodes.appendChild(g);
      self.nodeEls.push({ n: n, g: g, c: c, t: t1 });
    });
    this.renderLoops();
    this.position();
    this.applyFocus();
  };

  /* ---------------------------------------------- круговые контуры --- */
  Graph.prototype.renderLoops = function () {
    var self = this;
    this.gLoops.innerHTML = '';
    this.loopEls = this.loops.map(function (c) {
      var g = el('g', { class: 'gloop', tabindex: -1, role: 'button', 'data-n': c.n,
                        'aria-label': 'Круговой контур ' + c.n + ': ' + c.names.concat([c.names[0]]).join(' → ') });
      var halo = el('path', { class: 'loop-halo' });
      var badge = el('g', { class: 'loop-badge' });
      badge.appendChild(el('circle', { r: 11 }));
      var t = el('text', { 'text-anchor': 'middle', dy: '0.35em' });
      t.textContent = c.n;
      badge.appendChild(t);
      g.appendChild(halo); g.appendChild(badge);
      g.addEventListener('mouseenter', function (ev) { self.showLoop(c.n, ev); });
      g.addEventListener('mouseleave', function () { self.leaveLoop(); });
      g.addEventListener('click', function (ev) { ev.stopPropagation(); self.pinLoop(c.n); });
      g.addEventListener('focus', function () { self.showLoop(c.n); });
      g.addEventListener('blur', function () { self.leaveLoop(); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); self.pinLoop(c.n); }
        if (ev.key === 'Escape') { self.unpin(); }
      });
      self.gLoops.appendChild(g);
      return { c: c, g: g, halo: halo, badge: badge };
    });
    this.gLoops.querySelectorAll('.gloop').forEach(function (g) {
      g.setAttribute('tabindex', self.loopMode ? 0 : -1);
    });
  };

  /* обводка проходит через центры узлов по тем же дугам, что и стрелки */
  Graph.prototype.positionLoops = function () {
    if (!this.loopEls) return;
    this.loopEls.forEach(function (o) {
      var ring = o.c.edges, first = ring[0].s;
      var d = 'M' + first.x.toFixed(1) + ',' + first.y.toFixed(1);
      var sx = 0, sy = 0, k = 0;
      ring.forEach(function (e) {
        var q = ctrl(e.s, e.t, e.circular);
        d += ' Q' + q.x.toFixed(1) + ',' + q.y.toFixed(1) + ' ' + e.t.x.toFixed(1) + ',' + e.t.y.toFixed(1);
        sx += e.s.x + q.x; sy += e.s.y + q.y; k += 2;
      });
      o.halo.setAttribute('d', d + ' Z');
      o.cx = sx / k; o.cy = sy / k;
      o.badge.setAttribute('transform', 'translate(' + o.cx.toFixed(1) + ',' + o.cy.toFixed(1) + ')');
    });
  };

  Graph.prototype.setLoopMode = function (on) {
    this.loopMode = !!on;
    this.svg.classList.toggle('loops-on', this.loopMode);
    this.gLoops.querySelectorAll('.gloop').forEach(function (g) {
      g.setAttribute('tabindex', on ? 0 : -1);
    });
    if (!on) { this.pinned = null; this.clearLoop(); }
  };

  Graph.prototype.loopByN = function (n) {
    return (this.loopEls || []).filter(function (o) { return o.c.n === n; })[0] || null;
  };

  Graph.prototype.markLoop = function (n) {
    this.svg.classList.toggle('loop-focus', !!n);
    (this.loopEls || []).forEach(function (o) { o.g.classList.toggle('active', o.c.n === n); });
    this.edgeEls.forEach(function (o) {
      var ls = (o.el.getAttribute('data-loops') || '').split(' ');
      o.el.classList.toggle('hot', !!n && ls.indexOf(String(n)) >= 0);
    });
  };

  /* карточка: у курсора при наведении, у значка контура при фокусе и закреплении */
  Graph.prototype.showLoop = function (n, ev) {
    if (!this.loopMode && !this.forceShow) return;
    if (this.pinned && this.pinned !== n) return;
    var o = this.loopByN(n); if (!o || !this.loopInfo) return;
    this.hideTip();
    this.markLoop(n);
    this.card.innerHTML = this.loopInfo(o.c, this.pinned === n);
    this.card.hidden = false;
    this.card.classList.toggle('pinned', this.pinned === n);
    var host = this.host.getBoundingClientRect();
    var x, y;
    if (ev && ev.clientX !== undefined && this.pinned !== n) {
      x = ev.clientX - host.left + 16; y = ev.clientY - host.top + 12;
    } else {
      var r = this.svg.getBoundingClientRect();
      x = (o.cx / this.W) * r.width + (r.left - host.left) + 18;
      y = (o.cy / this.H) * r.height + (r.top - host.top) - 20;
    }
    var w = this.card.offsetWidth, h = this.card.offsetHeight;
    if (x + w + 8 > host.width) x = Math.max(8, x - w - 36);
    if (y + h + 8 > host.height) y = Math.max(8, host.height - h - 8);
    this.card.style.left = x + 'px';
    this.card.style.top = Math.max(8, y) + 'px';
  };

  Graph.prototype.leaveLoop = function () {
    if (this.pinned) return;
    this.clearLoop();
  };

  Graph.prototype.clearLoop = function () {
    this.card.hidden = true;
    this.card.classList.remove('pinned');
    this.markLoop(null);
  };

  Graph.prototype.pinLoop = function (n) {
    if (this.pinned === n) { this.unpin(); return; }
    this.pinned = n;
    this.showLoop(n);
  };

  Graph.prototype.unpin = function () {
    this.pinned = null;
    this.clearLoop();
  };

  /* подсветка контура извне: из списка контуров рядом с графом */
  Graph.prototype.highlightLoop = function (n) {
    if (this.pinned) return;
    if (n) { this.forceShow = true; this.showLoop(n); this.forceShow = false; }
    else this.clearLoop();
  };

  Graph.prototype.position = function () {
    if (!this.edgeEls) return;
    this.edgeEls.forEach(function (o) {
      var a = o.e.s, b = o.e.t;
      var q = ctrl(a, b, o.e.circular);
      var cx = q.x, cy = q.y;
      // укоротить концы до края круга, оставив место под стрелку
      var d1 = Math.sqrt((cx - a.x) * (cx - a.x) + (cy - a.y) * (cy - a.y)) || 1;
      var d2 = Math.sqrt((b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy)) || 1;
      var ax = a.x + (cx - a.x) / d1 * a.r;
      var ay = a.y + (cy - a.y) / d1 * a.r;
      var bx = b.x - (b.x - cx) / d2 * (b.r + 7);
      var by = b.y - (b.y - cy) / d2 * (b.r + 7);
      o.el.setAttribute('d', 'M' + ax.toFixed(1) + ',' + ay.toFixed(1) + ' Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + bx.toFixed(1) + ',' + by.toFixed(1));
    });
    this.nodeEls.forEach(function (o) {
      o.g.setAttribute('transform', 'translate(' + o.n.x.toFixed(1) + ',' + o.n.y.toFixed(1) + ')');
      o.t.setAttribute('y', o.n.row ? o.n.r + 14 : -o.n.r - 7);
    });
    this.positionLoops();
  };

  Graph.prototype.nodeTip = function (n) {
    var self = this, inc = [], out = [];
    this.visibleEdges().forEach(function (e) {
      if (e.to === n.id) inc.push('← ' + self.index[e.from].name + ': ' + (e.label || ''));
      if (e.from === n.id) out.push('→ ' + self.index[e.to].name + ': ' + (e.label || ''));
    });
    return '<b>' + n.full + '</b><span class="k">' + (global.VG_LAYER_LABELS[n.layer] || n.layer) + ' · ' + n.country + '</span>' +
      '<p style="margin:6px 0 0">' + n.note + '</p>' +
      '<p class="k" style="margin:6px 0 0">Деньги приходят: ' + (inc.length || 0) + ' · уходят: ' + (out.length || 0) + '</p>';
  };

  Graph.prototype.edgeTip = function (e) {
    var t = global.VG_EDGE_TYPES[e.type];
    var mark = e.inReport === 'yes' ? 'связь описана в исследовании'
      : e.inReport === 'mechanism' ? 'механизм описан в исследовании, компании не названы'
      : 'общеизвестное корпоративное раскрытие вне исследования';
    return '<b>' + e.s.name + ' → ' + e.t.name + '</b>' +
      '<span class="k">' + t.label + (e.amount ? ' · ' + e.amount : '') + '</span>' +
      '<p style="margin:6px 0 0">' + (e.label || '') + '</p>' +
      (e.back ? '<p class="k" style="margin:4px 0 0">Встречный поток: ' + e.back + '</p>' : '') +
      '<p class="k" style="margin:6px 0 0">' + mark + (e.src ? ' · ' + e.src : '') + '</p>';
  };

  Graph.prototype.showTip = function (ev, html) {
    var r = this.host.getBoundingClientRect();
    this.tip.innerHTML = html;
    this.tip.hidden = false;
    var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
    if (x + 310 > r.width) x = r.width - 316;
    if (y + this.tip.offsetHeight + 12 > r.height) y = Math.max(6, r.height - this.tip.offsetHeight - 12);
    this.tip.style.left = x + 'px';
    this.tip.style.top = y + 'px';
  };
  Graph.prototype.hideTip = function () { this.tip.hidden = true; };

  Graph.prototype.focus = function (id) {
    this.filters.focus = id;
    this.applyFocus();
    this.onSelect(id ? this.index[id] : null, this.neighbours(id));
  };

  Graph.prototype.neighbours = function (id) {
    if (!id) return [];
    return this.visibleEdges().filter(function (e) { return e.from === id || e.to === id; });
  };

  Graph.prototype.applyFocus = function () {
    var id = this.filters.focus, keep = {};
    if (id) {
      keep[id] = 1;
      this.visibleEdges().forEach(function (e) {
        if (e.from === id) keep[e.to] = 1;
        if (e.to === id) keep[e.from] = 1;
      });
    }
    this.nodeEls.forEach(function (o) { o.g.classList.toggle('dim', !!id && !keep[o.n.id]); });
    this.edgeEls.forEach(function (o) {
      o.el.classList.toggle('dim', !!id && o.e.from !== id && o.e.to !== id);
    });
  };

  Graph.prototype.setFilter = function (type, on) {
    this.filters.types[type] = on;
    this.pinned = null; this.clearLoop();
    this.render();
    this.layout();
    this.setLoopMode(this.loopMode);
  };
  Graph.prototype.setOnlyReport = function (on) {
    this.filters.onlyReport = on;
    this.pinned = null; this.clearLoop();
    this.render();
    this.layout();
    this.setLoopMode(this.loopMode);
  };
  Graph.prototype.relax = function () { this.layout(); };

  /* перетаскивание узлов */
  Graph.prototype.bindPointer = function () {
    var self = this, drag = null;
    function toSvg(ev) {
      var r = self.svg.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / r.width * self.W, y: (ev.clientY - r.top) / r.height * self.H };
    }
    this.svg.addEventListener('pointerdown', function (ev) {
      var g = ev.target.closest ? ev.target.closest('.gnode') : null;
      if (!g) return;
      var i = Array.prototype.indexOf.call(self.gNodes.children, g);
      if (i < 0) return;
      drag = self.nodeEls[i].n;
      self.svg.setPointerCapture(ev.pointerId);
      self.svg.classList.add('dragging');
    });
    this.svg.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var p = toSvg(ev);
      drag.x = p.x; drag.y = p.y; drag.ty = p.y;
      self.position();
    });
    this.svg.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.closest && (t.closest('.gloop') || t.closest('.gnode') || t.closest('.gedge'))) return;
      if (self.pinned) self.unpin();
    });
    this.host.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && self.pinned) self.unpin();
    });
    this.card.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('[data-close]')) self.unpin();
    });
    this.svg.addEventListener('pointerup', function () { drag = null; self.svg.classList.remove('dragging'); });
    this.svg.addEventListener('pointercancel', function () { drag = null; self.svg.classList.remove('dragging'); });
  };

  global.VGGraph = Graph;
})(window);
