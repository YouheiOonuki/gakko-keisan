// ===========================
// 開いた時に結果の欄へ出す「例の値」（出席日数・偏差値・内申点）。純粋関数。DOM に触らない
// ブラウザでは window.GakkoExample、Node（テスト）では module.exports
//   例の値は入力欄の placeholder と同じ。結果は計算の lib に渡して出す（字で焼かない）
//   入力が 1 つでも入っていたら（保存した入力を含む）、例は出さない
// ===========================
(function (root) {
  'use strict';

  // 出席日数: 授業 70 回・3 分の 2 以上・10 回休んだ（→ あと 13 回、上限 23 回）
  var SHUSSEKI = { ratio: '2/3', total: 70, absent: 10 };
  // 偏差値: 点数 72・平均 58・標準偏差 15
  var HENSACHI = { score: 72, mean: 58, sd: 15 };

  function empty(v) { return v == null || String(v) === ''; }

  /** 出席日数の画面の入力が、何も入っていないか（割合・回数・単位数・欠席に数えない回数・科目の行） */
  function shussekiBlank(d) {
    d = d || {};
    return ['ratio', 'custom', 'total', 'absent', 'units', 'excused'].every(function (k) { return empty(d[k]); }) &&
      (Array.isArray(d.rows) ? d.rows : []).every(function (r) { r = r || {}; return empty(r.name) && empty(r.units) && empty(r.absent); });
  }

  /** 偏差値の画面の入力が、何も入っていないか（3 つの欄・受けた人数・全員の点数・順位と人数・5 教科の表） */
  function hensachiBlank(d) {
    d = d || {};
    return ['score', 'mean', 'sd', 'n', 'list', 'rk', 'rn'].every(function (k) { return empty(d[k]); }) &&
      (Array.isArray(d.five) ? d.five : []).every(function (r) { r = r || {}; return empty(r.s) && empty(r.m) && empty(r.d); });
  }

  // 内申点: 都府県は既定の東京都のまま、9 教科の評定はすべて 3（Q-1234、D1069）。評定のタイルは選ばないまま、結果だけを lib から出す
  var NAISHIN = { pref: 'tokyo', grade: 3 };

  function same(v, w) { return String(v == null ? '' : v) === String(w); }

  /**
   * 内申点の画面の入力が、何も入っていないか。都府県は既定（東京都）、中 1・中 2 の合計と中 3 の評定は空、
   * 各都府県の欄・目標点はすべて既定のまま。保存した入力が 1 つでもあれば false（V は lib/naishin-values.js の値）
   */
  function naishinBlank(d, tgt, V) {
    d = d || {}; tgt = tgt || {};
    var t = d.tokyo || {}, k = d.kanagawa || {}, h = d.hyogo || {}, o = d.osaka || {}, s = d.saitama || {}, c = d.chiba || {};
    var P = V.PREFS;
    return same(d.pref || NAISHIN.pref, NAISHIN.pref) && empty(d.sum1) && empty(d.sum2) && Object.keys(d.g3 || {}).length === 0 &&
      same(t.kyoka == null ? '5' : t.kyoka, '5') && same(t.ratio == null ? '7:3' : t.ratio, '7:3') && empty(t.gaku) && empty(t.esat) &&
      same(k.f == null ? P.kanagawa.fDefault : k.f, P.kanagawa.fDefault) && empty(k.gaku) && same(k.gakuMax == null ? '500' : k.gakuMax, '500') &&
      empty(h.gaku) && empty(h.gakku) &&
      same(o.type == null ? P.osaka.typeDefault : o.type, P.osaka.typeDefault) && empty(o.gaku) &&
      same(s.ratio == null ? P.saitama.ratioDefault : s.ratio, P.saitama.ratioDefault) && same(s.conv == null ? P.saitama.convDefault : s.conv, P.saitama.convDefault) &&
      empty(s.gaku) && empty(s.mensetsu) && same(s.mmul == null ? '1' : s.mmul, '1') &&
      same(c.k == null ? P.chiba.kDefault : c.k, P.chiba.kDefault) && empty(c.gaku) &&
      Object.keys(tgt).every(function (p) { return empty(tgt[p]); });
  }

  /** 例の評定（教科の id の一覧から、すべて NAISHIN.grade の { id: 3 } を作る） */
  function naishinGrades(ids) {
    var g = {};
    ids.forEach(function (id) { g[id] = NAISHIN.grade; });
    return g;
  }

  function naishinLine() {
    return '例: 東京都・9 教科すべて ' + NAISHIN.grade + ' の場合';
  }

  function shussekiLine() {
    return '例: 授業 ' + SHUSSEKI.total + ' 回・3 分の 2 以上・' + SHUSSEKI.absent + ' 回休んだ場合';
  }
  function hensachiLine() {
    return '例: 点数 ' + HENSACHI.score + ' 点・平均 ' + HENSACHI.mean + ' 点・標準偏差 ' + HENSACHI.sd + ' 点の場合';
  }

  var api = { SHUSSEKI: SHUSSEKI, HENSACHI: HENSACHI, NAISHIN: NAISHIN, naishinBlank: naishinBlank, naishinGrades: naishinGrades, naishinLine: naishinLine, shussekiBlank: shussekiBlank, hensachiBlank: hensachiBlank, shussekiLine: shussekiLine, hensachiLine: hensachiLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GakkoExample = api;
})(typeof window !== 'undefined' ? window : globalThis);
