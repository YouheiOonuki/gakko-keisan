// ===========================
// 宿題タイマー（timer）の計算: 時間の表示・くり返し（べんきょう → やすみ）の段取り・音の設計図
// 外部の値（制度・法令）は使わないので values ファイルは無い。DOM・時計に触らない（時刻は引数でもらう）
// ブラウザでは window.GakkoTimer、Node（テスト）では module.exports
// ===========================
(function (root) {
  'use strict';

  var MAX_MIN = 120;            // 1 回の長さの上限（分）
  var MAX_ROUNDS = 8;           // くり返しの回数の上限
  var PRESETS = [5, 10, 15, 20, 30, 45, 60];   // 画面のボタン（分）
  // 音量（0〜1 の GainNode の値）。「ちいさめ」を既定にする（控えめ・消せる）
  var VOLUMES = { off: 0, low: 0.08, mid: 0.2, high: 0.4 };

  function clampInt(v, lo, hi, fallback) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }

  /** 秒 → "MM:SS"（1 時間以上は "H:MM:SS"）。端数の秒は切り上げ（残り 0.2 秒は 0:01 と出し、0 になった瞬間に終わる） */
  function format(sec) {
    var s = Math.max(0, Math.ceil(Number(sec) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    var mm = (h ? String(m).padStart(2, '0') : String(m)), ss = String(r).padStart(2, '0');
    return (h ? h + ':' : '') + mm + ':' + ss;
  }

  /** 残りの割合（1 → 0）。円・棒の塗りに使う */
  function fraction(remainMs, totalMs) {
    if (!(totalMs > 0)) return 0;
    return Math.min(1, Math.max(0, remainMs / totalMs));
  }

  /** 入力を正規化する（保存・ファイル読み込みのときも通す） */
  function normalize(s) {
    s = s && typeof s === 'object' ? s : {};
    var vol = Object.prototype.hasOwnProperty.call(VOLUMES, s.volume) ? s.volume : 'low';
    return {
      minutes: clampInt(s.minutes, 1, MAX_MIN, 15),
      label: typeof s.label === 'string' ? s.label.slice(0, 20) : '',
      shape: s.shape === 'bar' ? 'bar' : 'circle',
      volume: vol,
      repeat: s.repeat === true,
      restMin: clampInt(s.restMin, 1, 60, 5),
      rounds: clampInt(s.rounds, 2, MAX_ROUNDS, 4),
      wake: s.wake !== false,
    };
  }

  /**
   * 段取り: [{ kind: 'work'|'rest', sec, round }]
   * くり返しなし → べんきょう 1 回。あり → べんきょう・やすみ を rounds 回（最後のやすみは入れない）
   */
  function plan(s) {
    s = normalize(s);
    var out = [];
    var n = s.repeat ? s.rounds : 1;
    for (var i = 1; i <= n; i++) {
      out.push({ kind: 'work', sec: s.minutes * 60, round: i });
      if (i < n) out.push({ kind: 'rest', sec: s.restMin * 60, round: i });
    }
    return out;
  }

  /** 段取りの合計の秒数 */
  function totalSec(p) { return p.reduce(function (a, x) { return a + x.sec; }, 0); }

  /**
   * いまどこにいるか。elapsedMs は段取りの最初からの経過（一時停止の分は含めない）
   * @returns {{ index, kind, round, remainMs, stepMs, done }}  done のとき index は段取りの長さ
   */
  function at(p, elapsedMs) {
    var t = Math.max(0, Number(elapsedMs) || 0);
    for (var i = 0; i < p.length; i++) {
      var ms = p[i].sec * 1000;
      if (t < ms) return { index: i, kind: p[i].kind, round: p[i].round, remainMs: ms - t, stepMs: ms, done: false };
      t -= ms;
    }
    var last = p[p.length - 1] || { kind: 'work', round: 1 };
    return { index: p.length, kind: last.kind, round: last.round, remainMs: 0, stepMs: 0, done: true };
  }

  /**
   * 音の設計図（Web Audio で鳴らす音符の並び）。f: 周波数 Hz、t: 開始（秒）、d: 長さ（秒）
   * end: 全部おわり（ド・ミ・ソ・ド の上り）、rest: やすみに入る（ソ・ミ 下り）、work: べんきょうにもどる（ミ・ソ 上り）
   */
  function melody(kind) {
    var C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;
    if (kind === 'rest') return [{ f: G5, t: 0, d: 0.35 }, { f: E5, t: 0.3, d: 0.6 }];
    if (kind === 'work') return [{ f: E5, t: 0, d: 0.35 }, { f: G5, t: 0.3, d: 0.6 }];
    return [{ f: C5, t: 0, d: 0.3 }, { f: E5, t: 0.25, d: 0.3 }, { f: G5, t: 0.5, d: 0.3 }, { f: C6, t: 0.75, d: 0.9 }];
  }

  var api = {
    MAX_MIN: MAX_MIN, MAX_ROUNDS: MAX_ROUNDS, PRESETS: PRESETS, VOLUMES: VOLUMES,
    format: format, fraction: fraction, normalize: normalize, plan: plan, totalSec: totalSec, at: at, melody: melody,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GakkoTimer = api;
})(this);
