// ===========================
// 内申点の計算 — 画面の制御。計算は ../lib/naishin.js、値は ../lib/naishin-values.js
// ===========================
(function () {
  'use strict';
  var V = window.NaishinValues, N = window.Naishin, C = window.GakkoCommon;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'naishin';
  var PREF_IDS = ['tokyo', 'kanagawa', 'hyogo'];
  var SUBJ = V.SUBJECTS.map(function (s) { return s.id; });

  // 選択肢を値のファイルから作る（比率の表を 1 か所に）
  V.PREFS.tokyo.ratios.forEach(function (r) { $('t-ratio').add(new Option(r.label, r.id)); });
  V.PREFS.kanagawa.fChoices.forEach(function (f) { $('k-f').add(new Option(f + ' : ' + (10 - f) + (f === V.PREFS.kanagawa.fDefault ? '（最も多い）' : ''), String(f))); });
  $('others').innerHTML = V.OTHERS.map(function (o) {
    return '<a href="' + o.url + '" target="_blank" rel="noopener noreferrer">' + o.name + '</a>';
  }).join('・');

  // 確認日から 12 か月たったら帯で知らせる（check-site と同じ数え方）
  (function () {
    var p = V.CHECKED.split('-').map(Number), d = new Date();
    var months = (d.getFullYear() - p[0]) * 12 + (d.getMonth() + 1 - p[1]);
    $('asof-date').textContent = p[0] + '年' + p[1] + '月' + p[2] + '日';
    if (months >= 12) {
      $('asof').classList.add('is-stale');
      $('asof').insertAdjacentText('beforeend', '。確認日から1年以上たっています。新しい年度の要綱で確かめてください。');
    }
  })();

  // --- 入力の読み書き ---
  function readGrades(y) {
    var g = {};
    SUBJ.forEach(function (id) {
      var c = document.querySelector('input[name="' + y + '-' + id + '"]:checked');
      if (c) g[id] = Number(c.value);
    });
    return g;
  }
  function writeGrades(y, g) {
    SUBJ.forEach(function (id) {
      var v = g && Number(g[id]);
      document.querySelectorAll('input[name="' + y + '-' + id + '"]').forEach(function (r) { r.checked = Number(r.value) === v; });
    });
  }
  function current() {
    return {
      pref: $('pref').value, sum2: $('sum2').value, g3: readGrades('g3'),
      tokyo: { kyoka: $('t-kyoka').value, ratio: $('t-ratio').value, gaku: $('t-gaku').value, esat: $('t-esat').value },
      kanagawa: { f: $('k-f').value, gaku: $('k-gaku').value, gakuMax: $('k-gakuMax').value },
      hyogo: { gaku: $('h-gaku').value, gakku: $('h-gakku').value },
      target: { tokyo: tgt.tokyo, kanagawa: tgt.kanagawa, hyogo: tgt.hyogo },
    };
  }
  var tgt = { tokyo: '', kanagawa: '', hyogo: '' }, lastPref = null;   // 目標点は都府県ごとに満点が違うので別々に持つ
  function str(x, max) { return x == null ? '' : String(x).slice(0, max || 12); }
  function pick(v, list, def) { return list.indexOf(String(v)) >= 0 ? String(v) : def; }
  function normGrades(g) {
    var o = {};
    SUBJ.forEach(function (id) { var n = g && Number(g[id]); if (Number.isInteger(n) && n >= 1 && n <= 5) o[id] = n; });
    return o;
  }
  function apply(d) {
    d = d || {};
    var t = d.tokyo || {}, k = d.kanagawa || {}, h = d.hyogo || {}, tg = d.target || {};
    $('pref').value = pick(d.pref, PREF_IDS, 'tokyo');
    $('sum2').value = str(d.sum2, 3);
    writeGrades('g3', normGrades(d.g3));
    $('t-kyoka').value = pick(t.kyoka, ['5', '3'], '5');
    $('t-ratio').value = pick(t.ratio, V.PREFS.tokyo.ratios.map(function (r) { return r.id; }), '7:3');
    $('t-gaku').value = str(t.gaku);
    $('t-esat').value = pick(t.esat, ['', 'A', 'B', 'C', 'D', 'E', 'F'], '');
    $('k-f').value = pick(k.f, V.PREFS.kanagawa.fChoices.map(String), String(V.PREFS.kanagawa.fDefault));
    $('k-gaku').value = str(k.gaku);
    $('k-gakuMax').value = pick(k.gakuMax, ['500', '300'], '500');
    $('h-gaku').value = str(h.gaku);
    $('h-gakku').value = pick(h.gakku, ['', '1', '2', '3', '4', '5'], '');
    PREF_IDS.forEach(function (p) { tgt[p] = str(tg[p]); });
    lastPref = null;   // 次の update で欄を tgt から入れ直す
  }

  // --- 表示 ---
  function f2(x) { return (Math.round(x * 100) / 100).toLocaleString('ja-JP', { maximumFractionDigits: 2 }); }
  function row(th, td, rule, total) {
    return '<tr' + (total ? ' class="total"' : '') + '><th>' + th + (rule ? '<span class="rule">' + rule + '</span>' : '') + '</th><td>' + td + '</td></tr>';
  }
  var bar = window.YorozuScreen.fixedBar({ bar: 'fixbar', watch: 'result-main', jump: 'result-card', text: 'fixbar-text' });

  function layout(pref) {
    var kyoka3 = pref === 'tokyo' && $('t-kyoka').value === '3';
    $('g2').hidden = pref !== 'kanagawa';
    $('g3-legend').textContent = pref === 'kanagawa' ? '中3の評定（2学期まで）' : '中3の評定';
    $('pref-hint').textContent = {
      tokyo: '中3の2学期（12月31日まで）の評定を使います。',
      kanagawa: '中2と中3（2学期まで）の評定を使います。',
      hyogo: '中3の評定を使います。',
    }[pref];
    // 教科の横に倍率を出す
    document.querySelectorAll('#g3 .mul').forEach(function (m) {
      var id = m.getAttribute('data-subj'), s = V.SUBJECTS.filter(function (x) { return x.id === id; })[0];
      var t = '';
      if (pref === 'tokyo') t = (kyoka3 ? V.PREFS.tokyo.kyoka3.indexOf(id) >= 0 : s.main5) ? '×1' : '×2';
      else if (pref === 'kanagawa') t = '×2';
      else t = s.main5 ? '×4' : '×7.5';
      m.textContent = t;
    });
    document.querySelectorAll('#d-exam [data-pref]').forEach(function (d) { d.hidden = d.getAttribute('data-pref') !== pref; });
    $('t-gaku-max').textContent = '/ ' + (kyoka3 ? 300 : 500) + ' 点';
    $('target-label').textContent = {
      tokyo: '目標の得点（学力検査＋調査書、1000点満点）',
      kanagawa: '目標のS値（第1次選考のＳ１、1000点満点）',
      hyogo: '目標の素点（内申＋学力検査×0.5、500点満点）',
    }[pref];
  }

  function markMissing(pref) {
    var g = readGrades('g3'), any = false;
    document.querySelectorAll('#g3 .grade-row').forEach(function (r) {
      var empty = !g[r.getAttribute('data-subj')];
      r.classList.toggle('is-empty', empty);
      if (empty) any = true;
    });
    $('g3').classList.toggle('is-missing', any && Object.keys(g).length > 0);
    $('g2').classList.toggle('is-missing', pref === 'kanagawa' && $('sum2').value === '' && Object.keys(g).length === 9);
  }

  function update() {
    var pref = $('pref').value;
    // 都府県を切り替えたら、その都府県の目標点を欄に戻す（満点が違うので持ち越さない）
    if (pref !== lastPref) { $('target').value = tgt[pref] || ''; lastPref = pref; }
    else tgt[pref] = $('target').value;
    var d = current();
    layout(pref);
    markMissing(pref);
    var P = V.PREFS[pref];
    var r = pref === 'tokyo' ? N.tokyo({ g: d.g3, kyoka: d.tokyo.kyoka, ratio: d.tokyo.ratio, gaku: d.tokyo.gaku, esat: d.tokyo.esat, target: tgt.tokyo })
      : pref === 'kanagawa' ? N.kanagawa({ sum2: d.sum2, g3: d.g3, f: d.kanagawa.f, gaku: d.kanagawa.gaku, gakuMax: d.kanagawa.gakuMax, target: tgt.kanagawa })
        : N.hyogo({ g: d.g3, gaku: d.hyogo.gaku, gakku: d.hyogo.gakku, target: tgt.hyogo });
    var rows = [], lead, big, sub, barText, note = '', examState = '入力なし', needText = '';

    if (!r) {
      lead = pref === 'tokyo' ? '換算内申（実技4教科は2倍）' : pref === 'kanagawa' ? '内申点（中2＋中3×2）' : '内申点（判定資料Ａ）';
      big = '—';
      sub = pref === 'kanagawa' ? '中2の合計と中3の9教科の評定を入れると出ます。' : '9教科の評定を選ぶと出ます。';
      barText = '';
    } else if (pref === 'tokyo') {
      lead = '換算内申（' + (r.kyoka === 3 ? '国数英は1倍、ほかの6教科は2倍' : '実技4教科は2倍') + '）';
      big = r.kansan + ' / ' + r.kansanMax;
      sub = '調査書点 ' + f2(r.chosa) + ' / ' + r.chosaMax + '・素内申 ' + r.sonaishin + ' / 45';
      barText = '換算内申 ' + r.kansan + '/' + r.kansanMax;
      rows.push(row('素内申（9教科の合計）', r.sonaishin + ' / 45'));
      if (r.kyoka === 5) {
        rows.push(row('5教科の合計', r.main5 + ' / 25', '国語・社会・数学・理科・英語 ×1'));
        rows.push(row('実技4教科の合計 ×2', r.jitsugi4 + ' × 2 ＝ ' + r.jitsugi4 * 2 + ' / 40', '音楽・美術・保健体育・技術・家庭'));
      }
      rows.push(row('換算内申', r.kansan + ' / ' + r.kansanMax, null, true));
      rows.push(row('調査書点（' + r.ratio.gaku + ':' + r.ratio.cho + '）', f2(r.chosa) + ' / ' + r.chosaMax, '換算内申 × ' + r.chosaMax + ' ÷ ' + r.kansanMax, true));
      if (r.exam) {
        var e = r.exam;
        rows.push(row('学力検査', f2(e.raw) + ' / ' + r.rawMax + ' → ' + f2(e.gakuConv) + ' / ' + r.gakuMax, '× ' + r.gakuMax + ' ÷ ' + r.rawMax));
        rows.push(row('学力検査＋調査書点', f2(e.total1000) + ' / 1000'));
        if (e.alt) rows.push(row('10:0 で計算すると', f2(e.alt.total1000) + ' / 1000', e.used === 'alt' ? '高いのでこちらを使う' : '低いので使わない'));
        rows.push(row('ESAT-J', e.esat === null ? '入れていない' : e.esat + ' / 20'));
        rows.push(row('総合得点', f2(e.total1020) + ' / 1020', e.esat === null ? 'ESAT-J を入れると足します' : null, true));
        examState = '学力 ' + f2(e.raw) + '点・' + r.ratio.id.replace('best64', '6:4/10:0').replace('best', '7:3/10:0');
        sub += '・総合得点 ' + f2(e.total1020) + ' / 1020';
      } else {
        examState = '比率 ' + r.ratio.id.replace('best64', '6:4/10:0').replace('best', '7:3/10:0');
      }
      if (r.ratio.alt && !r.exam) note = '7:3（または6:4）と10:0の高いほうを使う学校です。学力検査の点数を入れると比べます。';
      if (r.need) needText = r.need.over ? '目標 ' + f2(r.need.target) + ' 点には、学力検査が満点（' + r.rawMax + '点）でも届きません。'
        : '目標 ' + f2(r.need.target) + ' 点に要る学力検査は ' + r.rawMax + ' 点中 約 ' + Math.ceil(r.need.raw - 1e-9) + ' 点（1教科あたり約 ' + f2(r.need.raw / r.kyoka) + ' 点）です。';
    } else if (pref === 'kanagawa') {
      lead = '内申点（中2の合計＋中3の合計×2）';
      big = r.A + ' / ' + r.aMax;
      sub = '100点満点に換算 ' + f2(r.a) + '・比率 ' + r.f + ':' + r.g;
      barText = '内申 ' + r.A + '/135';
      rows.push(row('中2の9教科の合計', r.sum2 + ' / 45'));
      rows.push(row('中3の9教科の合計 ×2', r.sum3 + ' × 2 ＝ ' + r.sum3 * 2 + ' / 90'));
      rows.push(row('内申点（Ａ）', r.A + ' / 135', null, true));
      rows.push(row('100点満点に換算（ａ）', f2(r.a), 'Ａ × 100 ÷ 135（小数第3位を四捨五入）', true));
      if (r.exam) {
        rows.push(row('学力検査（ｂ）', f2(r.exam.B) + ' / ' + r.gakuMax + ' → ' + f2(r.exam.b), '100点満点に換算'));
        rows.push(row('Ｓ１（第1次選考）', f2(r.exam.S1) + ' / 1000', 'ａ × ' + r.f + ' ＋ ｂ × ' + r.g, true));
        sub += '・Ｓ１ ' + f2(r.exam.S1);
        examState = '学力 ' + f2(r.exam.B) + '点・' + r.f + ':' + r.g;
      } else examState = '比率 ' + r.f + ':' + r.g;
      note = '特色検査のある学校は、Ｓ１に特色検査の点が加わります（計算しません）。';
      if (r.need) needText = r.need.over ? '目標 ' + f2(r.need.target) + ' には、学力検査が満点でも届きません。'
        : '目標 ' + f2(r.need.target) + ' に要る学力検査は ' + r.gakuMax + ' 点中 約 ' + Math.ceil(r.need.raw - 1e-9) + ' 点です。';
    } else {
      lead = '内申点（判定資料Ａ）';
      big = f2(r.A) + ' / ' + r.aMax;
      sub = '5教科 ' + r.main5 + '×4 ＋ 実技4教科 ' + r.jitsugi4 + '×7.5';
      barText = '内申 ' + f2(r.A) + '/250';
      rows.push(row('5教科の合計 ×4', r.main5 + ' × 4 ＝ ' + r.main5 * 4 + ' / 100'));
      rows.push(row('実技4教科の合計 ×7.5', r.jitsugi4 + ' × 7.5 ＝ ' + f2(r.jitsugi4 * 7.5) + ' / 150'));
      rows.push(row('内申点（Ａ）', f2(r.A) + ' / 250', null, true));
      if (r.exam) {
        rows.push(row('学力検査（Ｃ）', f2(r.exam.raw) + ' / 500 → ' + f2(r.exam.C) + ' / 250', '× 0.5'));
        rows.push(row('素点（Ａ＋Ｃ）', f2(r.exam.soten) + ' / 500', null, true));
        if (r.kasan) rows.push(row('第1志望加算点を足すと', f2(r.exam.withKasan), '+' + r.kasan + '点（複数志願選抜の第1志望校）', true));
        sub += '・素点 ' + f2(r.exam.soten) + ' / 500';
        examState = '学力 ' + f2(r.exam.raw) + '点' + (r.kasan ? '・加算 +' + r.kasan : '');
      } else if (r.kasan) examState = '加算 +' + r.kasan;
      if (r.need) needText = r.need.over ? '目標 ' + f2(r.need.target) + ' 点には、学力検査が満点でも届きません。'
        : '目標 ' + f2(r.need.target) + ' 点に要る学力検査は 500 点中 約 ' + Math.ceil(r.need.raw - 1e-9) + ' 点です。';
    }

    $('r-lead').textContent = lead;
    $('r-big').textContent = big;
    $('r-sub').textContent = sub;
    $('r-table').tBodies[0].innerHTML = rows.join('');
    $('r-note').textContent = r ? note + (note ? ' ' : '') + P.year + 'の入試の要綱で計算しています。' : '';
    $('need').textContent = r ? needText : (tgt[pref] ? '評定を選ぶと出ます。' : '');
    bar.set(barText);
    window.YorozuScreen.detailsSummary({ 'd-exam': examState, 'd-target': tgt[pref] ? '目標 ' + tgt[pref] + ' 点' : '入力なし' });
    C.store.set(KEY, current());
  }

  var shared = C.fromShareHash(location.hash);
  apply(shared || C.store.get(KEY, {}));
  $('form').addEventListener('change', update);
  $('form').addEventListener('input', update);
  C.wireFile({ key: KEY, current: current, apply: apply, update: update, msg: $('file-msg') });
  update();
})();
