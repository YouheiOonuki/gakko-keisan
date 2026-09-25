// ===========================
// ○○まであと何日 — 画面の制御。計算は ../lib/atonannichi.js
// 夏休みなどの日付の既定は置かない（学校・教育委員会ごとに違う）。名前の例のボタンは名前だけを入れる
// ===========================
(function () {
  'use strict';
  var A = window.Atonannichi, C = window.GakkoCommon;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'atonannichi';
  var MAX_ROWS = 10;
  var ROW_MM_MAX = 32;          // 表の 1 週の高さの上限（週が少ないときにマスが縦に伸びすぎないように）
  var GRID_MM = 226;            // 表（曜日の行を除く）に使える高さ

  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // --- ほかの日（行） ---
  function addRow(r) {
    if ($('rows').children.length >= MAX_ROWS) return;
    r = A.normalizeItem(r);
    var div = document.createElement('div');
    div.className = 'r';
    div.innerHTML =
      '<div><label>名前</label><input type="text" class="rn" maxlength="20" placeholder="例：誕生日"></div>' +
      '<div><label>日付</label><input type="date" class="rd" min="1900-01-01" max="2200-12-31"></div>' +
      '<label class="ry">毎年<input type="checkbox" class="rchk"></label>' +
      '<button type="button" class="rdel" aria-label="この日を消す">×</button>';
    div.querySelector('.rn').value = r.name;
    div.querySelector('.rd').value = r.date;
    div.querySelector('.rchk').checked = r.yearly;
    div.querySelector('.rdel').addEventListener('click', function () { div.remove(); update(); });
    $('rows').appendChild(div);
  }
  function readRows() {
    return Array.prototype.map.call($('rows').children, function (div) {
      return A.normalizeItem({ name: div.querySelector('.rn').value, date: div.querySelector('.rd').value, yearly: div.querySelector('.rchk').checked });
    });
  }

  function current() {
    var g = document.querySelector('input[name="goal"]:checked');
    return {
      main: A.normalizeItem({ name: $('name').value, date: $('date').value, yearly: $('yearly').checked, end: $('end').value }),
      rows: readRows(),
      sheet: { from: A.parse($('from').value) === null ? '' : $('from').value, goal: g ? g.value : 'start', nameLine: $('nameLine').checked, credit: $('credit').checked },
    };
  }
  function apply(d) {
    d = d && typeof d === 'object' ? d : {};
    var m = A.normalizeItem(d.main);
    $('name').value = m.name; $('date').value = m.date; $('yearly').checked = m.yearly; $('end').value = m.end;
    var sh = d.sheet && typeof d.sheet === 'object' ? d.sheet : {};
    $('from').value = A.parse(sh.from) === null ? '' : sh.from;
    document.querySelectorAll('input[name="goal"]').forEach(function (r) { r.checked = r.value === (sh.goal === 'end' ? 'end' : 'start'); });
    $('nameLine').checked = sh.nameLine !== false;
    $('credit').checked = sh.credit !== false;   // README「ツールを追加するとき」22: クレジットは既定で出し、外せる
    $('rows').innerHTML = '';
    (Array.isArray(d.rows) ? d.rows.slice(0, MAX_ROWS) : []).forEach(addRow);
  }

  // --- 文 ---
  function headline(it, r) {
    var nm = it.name || 'その日';
    if (r.age && it.yearly) nm = r.age + 'さいの' + (it.name || '誕生日');
    if (r.state === 'during') return { big: nm + 'の残り ' + r.left + ' 日', sub: '今日は' + r.dayNo + '日目（全部で' + r.length + '日）。' + A.label(r.end) + 'まで、今日をふくめて数えています。' };
    if (r.state === 'today') return { big: 'きょうが' + nm + '！', sub: A.label(r.target) };
    if (r.state === 'past') return { big: nm + 'から ' + (r.since || -r.days) + ' 日すぎました', sub: r.since ? A.label(r.end) + 'におわりました。' : A.label(r.target) + 'でした。', past: true };
    return {
      big: nm + 'まで あと ' + r.days + ' 日',
      sub: A.label(r.target) + '。あと ' + r.days + ' 回ねると当日です。' + (r.length ? '全部で ' + r.length + ' 日。' : ''),
    };
  }

  // --- カウントダウン表 ---
  function sheetPlan(d, r, todayN) {
    if (!r) return null;
    var goalEnd = r.end != null && d.sheet.goal === 'end';
    var target = goalEnd ? r.end : r.target;
    var from = A.parse(d.sheet.from);
    if (from === null) from = todayN;
    return { s: A.sheet(from, target), target: target, goalEnd: goalEnd };
  }
  function buildSheet(d, sp) {
    var it = d.main, s = sp.s;
    var nm = it.name || 'その日';
    var title = esc(nm) + (sp.goalEnd ? 'のおわりまで' : 'まで') + ' <span class="big">カウントダウン</span>';
    var goalWord = sp.goalEnd ? 'おわり' : '当日';
    return s.pages.map(function (weeks, pi) {
      var rowMm = Math.min(ROW_MM_MAX, GRID_MM / weeks.length).toFixed(1);
      var body = weeks.map(function (wk) {
        return '<tr style="height:' + rowMm + 'mm">' + wk.map(function (c) {
          if (!c) return '<td class="empty"></td>';
          var md = c.first ? c.m + '/' + c.d : String(c.d);
          var inner = c.left === 0 ? '<small>★</small><b>' + goalWord + '</b>' : '<small>あと</small><b>' + c.left + '</b>';
          return '<td class="' + (c.left === 0 ? 'goal' : '') + '"><span class="md' + (c.first ? ' first' : '') + '">' + md + '</span><span class="left">' + inner + '</span></td>';
        }).join('') + '</tr>';
      }).join('');
      var head = A.WD.map(function (w, i) { return '<th class="' + (i === 0 ? 'sun' : i === 6 ? 'sat' : '') + '">' + w + '</th>'; }).join('');
      return '<section class="page">' +
        '<div class="pg-head"><div><p class="pg-title">' + title + '</p>' +
        '<p class="pg-date">' + A.label(sp.target) + (sp.goalEnd ? 'まで' : '') + '</p>' +
        '<p class="pg-how">1日おわったら、1マス ぬりつぶそう。</p></div>' +
        (d.sheet.nameLine ? '<p class="pg-name">なまえ</p>' : '') + '</div>' +
        '<table class="pg-grid"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
        '<div class="pg-foot"><span>' + (d.sheet.credit ? 'yorozu-craft.com/gakko-keisan/print/ で作成' : '') + '</span><span>' + (s.pages.length > 1 ? (pi + 1) + ' / ' + s.pages.length : '') + '</span></div>' +
        '</section>';
    }).join('');
  }
  function fitPreview() {
    var w = $('preview-wrap').clientWidth;
    if (!w) return;
    var px = 210 * 96 / 25.4;   // 210mm を CSS の px に
    var sc = w / px;
    $('preview').style.setProperty('--s', sc.toFixed(4));
    $('preview-wrap').style.height = Math.round(297 * 96 / 25.4 * sc) + 'px';
  }

  var lastSheet = '';

  function update() {
    var d = current();
    var todayN = A.today();
    var r = A.compute(d.main, todayN);
    // 名前の例のボタン: 今の名前と同じものを押された状態に
    Array.prototype.forEach.call($('quick').children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.name === d.main.name)); });
    if (!r) {
      $('r-big').textContent = '—';
      $('r-big').classList.remove('is-past');
      $('r-sub').textContent = d.main.date ? '日付を読み取れませんでした。' : 'その日を入れると出ます。';
    } else {
      var h = headline(d.main, r);
      $('r-big').textContent = h.big;
      $('r-big').classList.toggle('is-past', !!h.past);
      $('r-big').classList.toggle('is-long', h.big.length > 14);
      $('r-sub').textContent = h.sub;
    }

    // 表
    $('goal-box').hidden = !(r && r.end != null);
    var sp = sheetPlan(d, r, todayN);
    var msg = '';
    if (!sp) msg = 'その日を入れると見本が出ます。';
    else if (!sp.s.ok) msg = sp.s.error === 'long' ? '表は366日先までです。「表のはじまり」を後ろの日にしてください。' : sp.s.error === 'order' ? (A.parse(d.sheet.from) !== null ? '表のはじまりが、数える日より後になっています。' : 'その日がすぎているので、表は作れません。') : '';
    else msg = sp.s.days + 1 + ' マス・A4 縦 ' + sp.s.pages.length + ' 枚。印刷の画面で「PDF に保存」を選ぶとファイルになります。';
    $('sheet-info').textContent = msg;
    var ok = !!(sp && sp.s.ok);
    $('print').disabled = !ok;
    $('print-note').textContent = ok || !r ? '今日は数えません（あしたなら「あと1日」）。' : msg;
    var html = ok ? buildSheet(d, sp) : '';
    if (html !== lastSheet) {
      lastSheet = html;
      $('sheet').innerHTML = html;
      var first = $('sheet').querySelector('.page');
      $('preview').innerHTML = first ? first.outerHTML : '';
      fitPreview();
    }

    // ほかの日の一覧
    var items = d.rows.filter(function (x) { return x.date; });
    var sorted = A.sortItems(items, todayN);
    $('list-out').innerHTML = sorted.map(function (x, i) {
      var rr = x.r, t;
      if (!rr) return '';
      var nm = esc(x.it.name || 'その日');
      if (rr.state === 'today') t = 'きょう！';
      else if (rr.state === 'past') t = (-rr.days) + ' 日すぎた';
      else t = 'あと ' + rr.days + ' 日';
      return '<li><span>' + nm + (rr.age ? '（' + rr.age + 'さい）' : '') + '<span class="when">' + A.label(rr.target) + '</span></span>' +
        '<span class="days">' + t + '</span><button type="button" class="btn btn-sub" data-i="' + items.indexOf(x.it) + '">上に出す</button></li>';
    }).join('');
    Array.prototype.forEach.call($('list-out').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        var it = items[Number(b.dataset.i)];
        $('name').value = it.name; $('date').value = it.date; $('yearly').checked = it.yearly; $('end').value = '';
        update();
        $('result-card').scrollIntoView({ block: 'start' });
        $('result-card').focus({ preventScroll: true });
      });
    });

    var first = sorted[0];
    var endN = A.parse(d.main.end);
    window.YorozuScreen.detailsSummary({
      'd-end': endN !== null ? A.label(endN, false) : 'なし',
      'd-sheet': ok ? 'A4 縦 ' + sp.s.pages.length + ' 枚' : 'A4 縦',
      'd-list': items.length ? items.length + ' 件' + (first && first.r && first.r.state !== 'past' ? '（いちばん近いのは ' + (first.it.name || 'その日') + '）' : '') : 'なし',
    });
    C.store.set(KEY, d);
  }

  Array.prototype.forEach.call($('quick').children, function (b) {
    b.addEventListener('click', function () {
      $('name').value = b.dataset.name;
      $('yearly').checked = !!b.dataset.yearly;
      update();
      if (!$('date').value) $('date').focus();
    });
  });
  $('add-row').addEventListener('click', function () { addRow(); update(); var l = $('rows').lastChild; if (l) l.querySelector('.rn').focus(); });
  $('print').addEventListener('click', function () { update(); window.print(); });
  $('d-sheet').addEventListener('toggle', fitPreview);
  window.addEventListener('resize', fitPreview);

  apply(C.store.get(KEY, {}));
  $('form').addEventListener('input', update);
  $('form').addEventListener('change', update);
  C.wireFile({ key: KEY, current: current, apply: apply, update: update, msg: $('file-msg') });
  update();
  // 日付が変わったら（夜 0 時をまたいで開いたまま）数え直す
  var day = A.today();
  setInterval(function () { if (A.today() !== day) { day = A.today(); lastSheet = ''; update(); } }, 60000);
})();
