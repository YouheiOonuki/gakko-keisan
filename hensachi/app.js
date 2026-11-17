// ===========================
// 偏差値の計算 — 画面の制御。計算は ../lib/hensachi.js
// ===========================
(function () {
  'use strict';
  var H = window.Hensachi, C = window.GakkoCommon;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'hensachi';
  var FIVE = ['国語', '数学', '英語', '理科', '社会'];

  // 5教科の表を作る
  var tb = $('five').tBodies[0];
  FIVE.forEach(function (name, i) {
    var tr = document.createElement('tr');
    tr.innerHTML = '<th>' + name + '</th>' + ['s', 'm', 'd'].map(function (k) {
      return '<td><input type="number" inputmode="decimal" step="any" id="f' + i + k + '" aria-label="' + name + 'の' + { s: '点数', m: '平均点', d: '標準偏差' }[k] + '"></td>';
    }).join('') + '<td id="f' + i + 'r">—</td>';
    tb.appendChild(tr);
  });

  var IDS = ['score', 'mean', 'sd', 'n', 'list', 'rk', 'rn'];
  function current() {
    var d = {};
    IDS.forEach(function (id) { d[id] = $(id).value; });
    d.five = FIVE.map(function (_, i) { return { s: $('f' + i + 's').value, m: $('f' + i + 'm').value, d: $('f' + i + 'd').value }; });
    return d;
  }
  function apply(d) {
    d = d || {};
    IDS.forEach(function (id) { $(id).value = d[id] == null ? '' : String(d[id]).slice(0, id === 'list' ? 20000 : 12); });
    FIVE.forEach(function (_, i) {
      var r = (Array.isArray(d.five) && d.five[i]) || {};
      ['s', 'm', 'd'].forEach(function (k) { $('f' + i + k).value = r[k] == null ? '' : String(r[k]).slice(0, 12); });
    });
  }

  function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }
  function f2(x) { return (Math.round(x * 100) / 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 }); }
  function pct(p) { return p > 0.999 ? '99.9% 超' : p >= 0.1 ? f1(p * 100) + '%' : p >= 0.001 ? (Math.round(p * 1000) / 10) + '%' : '0.1% 未満'; }   // % まで付けて返す（前は「0.1 未満%」「100.0%」と出た。11-18）
  function row(th, td, rule) { return '<tr><th>' + th + (rule ? '<span class="rule">' + rule + '</span>' : '') + '</th><td>' + td + '</td></tr>'; }
  var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'result-main', jump: 'result-card', text: 'fixbar-text' });
  var lastStats = null;

  // --- 結果の下の山の図（正規分布）。位置と面の割合は H.bellMark（上位の割合と同じ関数） ---
  var SVGNS = 'http://www.w3.org/2000/svg';
  var B = H.BELL, W = 600, L = 24, R = 24, TOP = 14, BASE = 158, HGT = 196;
  function sx(t) { return L + (t - B.min) / (B.max - B.min) * (W - L - R); }
  function sy(h) { return BASE - h * (BASE - TOP); }
  function curve(from, to) {
    var pts = [];
    for (var t = from; t < to; t += 0.5) pts.push(sx(t).toFixed(1) + ' ' + sy(H.bellHeight(t)).toFixed(1));
    pts.push(sx(to).toFixed(1) + ' ' + sy(H.bellHeight(to)).toFixed(1));
    return pts;
  }
  function renderBell(t, m) {
    var box = $('bell');
    box.textContent = '';
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + HGT);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', '偏差値の山（正規分布）' + (m ? '。偏差値 ' + f1(t) + '、上位 約 ' + pct(m.share) : ''));
    function el(name, attrs, text) {
      var e = document.createElementNS(SVGNS, name);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (text !== undefined) e.textContent = text;
      svg.appendChild(e); return e;
    }
    if (m) el('path', { class: 'bell-area', d: 'M' + curve(m.x, B.max).join(' L') + ' L' + sx(B.max) + ' ' + BASE + ' L' + sx(m.x).toFixed(1) + ' ' + BASE + ' Z' });
    el('line', { class: 'bell-axis', x1: L, y1: BASE, x2: W - R, y2: BASE });
    B.ticks.forEach(function (k) {
      el('line', { class: 'bell-tick', x1: sx(k), y1: BASE, x2: sx(k), y2: BASE + 8 });
      el('text', { class: 'bell-num', x: sx(k), y: BASE + 32, 'text-anchor': 'middle' }, String(k));
    });
    el('path', { class: 'bell-line', d: 'M' + curve(B.min, B.max).join(' L') });
    if (m) {
      var x = sx(m.x).toFixed(1), y = m.edge ? BASE - 14 : sy(m.h);
      el('line', { class: 'bell-you', x1: x, y1: BASE, x2: x, y2: TOP - 4 });
      if (m.edge) {   // 20 未満・80 超えは端の線の外側に、外を指す三角
        var d = m.edge === 'high' ? 1 : -1, x0 = sx(m.x) + d * 3, tip = sx(m.x) + d * 21;
        el('path', { class: 'bell-dot', d: 'M' + tip + ' ' + y + ' L' + x0 + ' ' + (y - 13) + ' L' + x0 + ' ' + (y + 13) + ' Z', 'data-edge': m.edge });
      } else {
        el('circle', { class: 'bell-dot', cx: x, cy: y.toFixed(1), r: 9 });
      }
    }
    box.appendChild(svg);
  }

  function update() {
    var d = current();
    var t = H.hensachi(d.score, d.mean, d.sd);
    var rows = [];
    var nState = '入力なし';
    var mark = H.bellMark(t);
    renderBell(t, mark);
    if (t === null) {
      $('r-big').textContent = '—';
      $('r-sub').textContent = d.sd !== '' && Number(d.sd) <= 0 ? '標準偏差は 0 より大きい数を入れてください。' : '3つを入れると出ます。';
      bar.set('');
    } else {
      var up = mark.share;
      $('r-big').textContent = f1(t);
      $('r-sub').textContent = '上位 約 ' + pct(up) + '（正規分布の仮定）';
      bar.set('偏差値 ' + f1(t));
      rows.push(row('計算', '50 ＋ 10 × (' + f2(Number(d.score)) + ' − ' + f2(Number(d.mean)) + ') ÷ ' + f2(Number(d.sd))));
      var n = Math.floor(Number(d.n));
      if (d.n !== '' && n >= 1) {
        var rk = H.rankEstimate(t, n);
        rows.push(row('順位の目安', n + ' 人中 約 ' + rk + ' 位', '上位 ' + pct(up) + ' × ' + n + ' 人 ＋ 1'));
        nState = n + ' 人・約 ' + rk + ' 位';
      }
      [60, 65, 70].forEach(function (x) {
        rows.push(row('偏差値 ' + x + ' の点数', f2(H.scoreFor(x, Number(d.mean), Number(d.sd))) + ' 点'));
      });
    }
    $('r-table').tBodies[0].innerHTML = rows.join('');

    // 全員の点数から
    var xs = H.parseScores(d.list), st = H.stats(xs), listState = '入力なし';
    lastStats = st;
    if (st) {
      var self = d.score !== '' ? H.rankInList(d.score, xs) : null;
      $('list-out').textContent = st.n + ' 人・平均 ' + f2(st.mean) + ' 点・標準偏差 ' + f2(st.sd) + ' 点（最高 ' + f2(st.max) + '・最低 ' + f2(st.min) + '）' +
        (self ? '。自分の点数はこの中で ' + self + ' 位（実際の順位）' : '');
      listState = st.n + ' 人';
    } else {
      $('list-out').textContent = xs.length === 1 ? '2 人以上の点数を入れてください。' : '';
    }
    $('list-use').disabled = !st;

    // 順位から
    var fr = H.fromRank(d.rk, d.rn), rankState = '入力なし';
    if (fr !== null) {
      $('rank-out').textContent = d.rn + ' 人中 ' + Math.floor(d.rk) + ' 位は、偏差値 約 ' + f1(fr) + '（上位 ' + pct((Math.floor(d.rk) - 0.5) / Math.floor(d.rn)) + ' の位置。正規分布の仮定）';
      rankState = '約 ' + f1(fr);
    } else {
      $('rank-out').textContent = d.rk !== '' && d.rn !== '' ? '順位は 1 から人数までで入れてください。' : '';
    }

    // 5教科
    var done = 0;
    d.five.forEach(function (r, i) {
      var v = H.hensachi(r.s, r.m, r.d);
      $('f' + i + 'r').textContent = v === null ? '—' : f1(v);
      if (v !== null) done++;
    });

    window.YorozuScreen.detailsSummary({ 'd-n': nState, 'd-list': listState, 'd-rank': rankState, 'd-5': done ? done + '教科' : '入力なし' });
    C.store.set(KEY, d);
    window.yzUsed?.();
  }

  $('list-use').addEventListener('click', function () {
    if (!lastStats) return;
    $('mean').value = String(Math.round(lastStats.mean * 100) / 100);
    $('sd').value = String(Math.round(lastStats.sd * 100) / 100);
    if ($('n').value === '') $('n').value = String(lastStats.n);
    update();
    $('result-card').scrollIntoView({ block: 'start' });
  });

  apply(C.fromShareHash(location.hash) || C.store.get(KEY, {}));
  $('form').addEventListener('input', update);
  C.wireFile({ key: KEY, current: current, apply: apply, update: update, msg: $('file-msg') });
  update();
})();
