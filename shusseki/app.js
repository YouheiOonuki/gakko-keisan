// ===========================
// 出席日数・欠課時数の計算 — 画面の制御。計算は ../lib/shusseki.js、値は ../lib/shusseki-values.js
// ===========================
(function () {
  'use strict';
  var S = window.Shusseki, V = window.ShussekiValues, C = window.GakkoCommon;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'shusseki';
  var MAX_ROWS = 20;

  // --- 科目の行 ---
  function addRow(r) {
    if ($('rows').children.length >= MAX_ROWS) return;
    var i = $('rows').children.length;
    var div = document.createElement('div');
    div.className = 'r';
    div.innerHTML =
      '<div><label>科目</label><input type="text" class="rn" maxlength="20" placeholder="例：数学Ⅰ"></div>' +
      '<div><label>単位数</label><input type="number" class="ru" inputmode="decimal" min="0" step="1" placeholder="2"></div>' +
      '<div><label>休んだ回数</label><input type="number" class="ra" inputmode="numeric" min="0" step="1" placeholder="0"></div>' +
      '<button type="button" class="rdel" aria-label="この科目を消す">×</button>';
    r = r || {};
    div.querySelector('.rn').value = r.name == null ? '' : String(r.name).slice(0, 20);
    div.querySelector('.ru').value = r.units == null ? '' : String(r.units).slice(0, 6);
    div.querySelector('.ra').value = r.absent == null ? '' : String(r.absent).slice(0, 6);
    div.querySelector('.rdel').addEventListener('click', function () { div.remove(); if (!$('rows').children.length) addRow(); update(); });
    $('rows').appendChild(div);
    return i;
  }
  function readRows() {
    return Array.prototype.map.call($('rows').children, function (div) {
      return { name: div.querySelector('.rn').value, units: div.querySelector('.ru').value, absent: div.querySelector('.ra').value };
    });
  }

  function current() {
    var c = document.querySelector('input[name="ratio"]:checked');
    return {
      ratio: c ? c.value : '', custom: $('custom').value, total: $('total').value, absent: $('absent').value,
      units: $('units').value, excused: $('excused').value, rows: readRows(),
    };
  }
  function apply(d) {
    d = d || {};
    var ids = ['2/3', '3/4', '4/5', 'custom'];
    document.querySelectorAll('input[name="ratio"]').forEach(function (r) { r.checked = ids.indexOf(d.ratio) >= 0 && r.value === d.ratio; });
    ['custom', 'total', 'absent', 'units', 'excused'].forEach(function (id) { $(id).value = d[id] == null ? '' : String(d[id]).slice(0, 8); });
    $('rows').innerHTML = '';
    (Array.isArray(d.rows) ? d.rows.slice(0, MAX_ROWS) : []).forEach(addRow);
    if (!$('rows').children.length) addRow();
  }

  function row(th, td, rule, total) {
    return '<tr' + (total ? ' class="total"' : '') + '><th>' + th + (rule ? '<span class="rule">' + rule + '</span>' : '') + '</th><td>' + td + '</td></tr>';
  }
  var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'result-main', jump: 'result-card', text: 'fixbar-text' });

  function update() {
    var d = current();
    $('custom-row').hidden = d.ratio !== 'custom';
    var ratio = S.ratioOf(d.ratio, d.custom);
    var l = ratio ? S.limit({ total: d.total, absent: d.absent, excused: d.excused, ratio: ratio }) : null;
    var rows = [];
    $('r-big').classList.toggle('is-over', !!(l && l.over));
    if (!l) {
      $('r-big').textContent = '—';
      $('r-sub').textContent = !ratio ? (d.ratio === 'custom' ? '割合（%）を入れると出ます。' : '学校の決まりの割合を選ぶと出ます。') : '授業の回数を入れると出ます。';
      bar.set('');
    } else {
      var keep = ratio.den - ratio.num;
      if (l.over) {
        $('r-big').textContent = '上限を ' + (-l.remain) + ' 回 超えています';
        $('r-sub').textContent = '休める上限は ' + l.allowed + ' 回です。先生に早めに相談を。';
        bar.set(-l.remain + ' 回超え');
      } else {
        $('r-big').textContent = 'あと ' + l.remain + ' 回';
        $('r-sub').textContent = '休める上限 ' + l.allowed + ' 回のうち ' + l.absent + ' 回休みました（' + ratio.label + '）';
        bar.set('あと ' + l.remain + ' 回');
      }
      rows.push(row('1年間の授業の回数', Math.floor(Number(d.total)) + ' 回'));
      if (l.base !== Math.floor(Number(d.total))) rows.push(row('欠席に数えない回数を引く', l.base + ' 回', '出席しなければならない回数'));
      rows.push(row('出席が要る回数', l.need + ' 回', l.base + ' × ' + ratio.label + '（切り上げ）'));
      rows.push(row('休める上限', l.allowed + ' 回', l.base + ' × ' + (ratio.den === 1000 ? (keep / 10) + '%' : keep + '/' + ratio.den) + '（切り捨て）', true));
      rows.push(row('休んだ回数', l.absent + ' 回'));
      rows.push(row(l.over ? '超えた回数' : '残り', (l.over ? -l.remain : l.remain) + ' 回', null, true));
    }
    $('r-table').tBodies[0].innerHTML = rows.join('');

    // 単位数から
    var h = S.hoursFromUnits(d.units);
    $('units-out').textContent = h ? d.units + ' 単位 × ' + V.UNIT_HOURS + ' ＝ ' + h + ' 回（1単位時間は50分が標準）' : '';
    $('units-use').disabled = !h;

    // 科目の一覧
    var t = ratio ? S.table(d.rows, ratio) : [];
    $('list-table').tBodies[0].innerHTML = t.length
      ? '<tr><th>科目</th><td>上限 / 残り</td></tr>' + t.map(function (x) {
        return row(x.name, x.r.allowed + ' / ' + (x.r.over ? (-x.r.remain) + ' 回超え' : 'あと ' + x.r.remain + ' 回'), x.total + ' 回');
      }).join('')
      : '';
    var ex = Math.floor(Number(d.excused)) || 0;
    window.YorozuScreen.detailsSummary({
      'd-units': h ? d.units + ' 単位 → ' + h + ' 回' : '入力なし',
      'd-excused': ex + ' 回',
      'd-list': t.length ? t.length + ' 科目（いちばん少ないのは ' + t[0].name + '）' : (ratio ? '入力なし' : '割合を選ぶと出ます'),
    });
    C.store.set(KEY, d);
  }

  $('units-use').addEventListener('click', function () {
    var h = S.hoursFromUnits($('units').value);
    if (!h) return;
    $('total').value = String(h);
    update();
    $('total').focus();
  });
  $('add-row').addEventListener('click', function () { addRow(); update(); $('rows').lastChild.querySelector('.rn').focus(); });

  apply(C.fromShareHash(location.hash) || C.store.get(KEY, {}));
  $('form').addEventListener('input', update);
  $('form').addEventListener('change', update);
  C.wireFile({ key: KEY, current: current, apply: apply, update: update, msg: $('file-msg') });
  update();
})();
