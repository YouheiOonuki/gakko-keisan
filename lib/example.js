// ===========================
// 開いた時に結果の欄へ出す「例の値」（出席日数・偏差値）。純粋関数。DOM に触らない
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

  function shussekiLine() {
    return '例: 授業 ' + SHUSSEKI.total + ' 回・3 分の 2 以上・' + SHUSSEKI.absent + ' 回休んだ場合';
  }
  function hensachiLine() {
    return '例: 点数 ' + HENSACHI.score + ' 点・平均 ' + HENSACHI.mean + ' 点・標準偏差 ' + HENSACHI.sd + ' 点の場合';
  }

  var api = { SHUSSEKI: SHUSSEKI, HENSACHI: HENSACHI, shussekiBlank: shussekiBlank, hensachiBlank: hensachiBlank, shussekiLine: shussekiLine, hensachiLine: hensachiLine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GakkoExample = api;
})(typeof window !== 'undefined' ? window : globalThis);
