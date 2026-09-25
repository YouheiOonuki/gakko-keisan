// ===========================
// 内申点の計算（純粋関数）。値は naishin-values.js。DOM に触らない
// ブラウザでは window.Naishin、Node（テスト）では module.exports
// 評定は { kokugo: 4, ... } の形（1〜5 の整数）。欠けていれば null を返す
// ===========================
(function (root) {
  'use strict';
  var V = (typeof module !== 'undefined' && module.exports) ? require('./naishin-values.js') : root.NaishinValues;

  function grade(g, id) {
    var n = g ? Number(g[id]) : NaN;
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
  }
  /** 9 教科そろっていれば { main5, jitsugi4, sum9 }。欠けていれば null */
  function sums(g) {
    var main5 = 0, jitsugi = 0;
    for (var i = 0; i < V.SUBJECTS.length; i++) {
      var s = V.SUBJECTS[i], n = grade(g, s.id);
      if (n === null) return null;
      if (s.main5) main5 += n; else jitsugi += n;
    }
    return { main5: main5, jitsugi4: jitsugi, sum9: main5 + jitsugi };
  }
  function num(x) { var n = Number(x); return x === '' || x == null || !isFinite(n) ? null : n; }
  /** 小数第3位を四捨五入（小数第2位まで） */
  function round2(x) { return Math.round(x * 100 + 1e-9) / 100; }

  /**
   * 東京都立高校
   * o: { g: 評定, kyoka: 5|3, ratio: 'best' など, gaku: 学力検査の合計（素点）, esat: 'A'〜'F' か '', target: 目標（1000 点満点） }
   */
  function tokyo(o) {
    var P = V.PREFS.tokyo;
    var s = sums(o.g);
    if (!s) return null;
    var kyoka = o.kyoka === 3 || o.kyoka === '3' ? 3 : 5;
    var exam = kyoka === 3 ? P.kyoka3 : V.SUBJECTS.filter(function (x) { return x.main5; }).map(function (x) { return x.id; });
    var kansan = 0;
    V.SUBJECTS.forEach(function (x) { kansan += grade(o.g, x.id) * (exam.indexOf(x.id) >= 0 ? 1 : 2); });
    var kansanMax = kyoka === 3 ? 75 : 65;
    var ratio = P.ratios.filter(function (r) { return r.id === o.ratio; })[0] || P.ratios[0];
    var rawMax = kyoka * 100;

    function part(r) {
      var gakuMax = P.total * r.gaku / 10, choMax = P.total * r.cho / 10;
      return { gaku: r.gaku, cho: r.cho, gakuMax: gakuMax, choMax: choMax, chosa: kansan * choMax / kansanMax };
    }
    var main = part(ratio);
    var alt = ratio.alt ? part(ratio.alt) : null;

    var res = {
      pref: 'tokyo', sonaishin: s.sum9, main5: s.main5, jitsugi4: s.jitsugi4, kyoka: kyoka,
      kansan: kansan, kansanMax: kansanMax, ratio: ratio,
      chosa: main.chosa, chosaMax: main.choMax, gakuMax: main.gakuMax, rawMax: rawMax,
      exam: null,
    };

    var raw = num(o.gaku);
    if (raw !== null && raw >= 0 && raw <= rawMax) {
      var conv = function (p) { return raw * p.gakuMax / rawMax; };
      var t1 = conv(main) + main.chosa;
      var use = main, total = t1;
      if (alt) { var t2 = conv(alt) + alt.chosa; if (t2 > t1) { use = alt; total = t2; } }
      var esat = Object.prototype.hasOwnProperty.call(P.esat, o.esat) ? P.esat[o.esat] : null;
      res.exam = {
        raw: raw, gakuConv: conv(main), total1000: t1,
        alt: alt ? { gakuConv: conv(alt), total1000: conv(alt) + alt.chosa } : null,
        used: use === main ? 'main' : 'alt', best1000: total,
        esat: esat, total1020: total + (esat || 0),
      };
    }
    var target = num(o.target);
    if (target !== null && target > 0) {
      // 目標（学力検査の得点＋調査書点、1000 点満点）に届く学力検査の素点
      var need = function (p) { return p.gakuMax > 0 ? (target - p.chosa) * rawMax / p.gakuMax : Infinity; };
      var n = need(main);
      if (alt) n = Math.min(n, need(alt));
      res.need = { target: target, raw: Math.max(0, n), over: n > rawMax };
    }
    return res;
  }

  /**
   * 神奈川県公立高校（共通選抜の第1次選考）
   * o: { g2: 中2の評定（または sum2: 中2の9教科の合計 9〜45）, g3: 中3の評定, f: 内申の比率（2〜8）, gaku: 学力検査の合計, gakuMax: 500|300, target: 目標のＳ１ }
   */
  function kanagawa(o) {
    var P = V.PREFS.kanagawa;
    var s2 = o.g2 ? sums(o.g2) : null, s3 = sums(o.g3);
    var n2 = num(o.sum2);
    if (!s2 && n2 !== null && Number.isInteger(n2) && n2 >= 9 && n2 <= 45) s2 = { sum9: n2 };
    if (!s2 || !s3) return null;
    var A = s2.sum9 + s3.sum9 * 2;
    var a = round2(A * 100 / P.aMax);
    var f = P.fChoices.indexOf(Number(o.f)) >= 0 ? Number(o.f) : P.fDefault;
    var g = 10 - f;
    var gMax = Number(o.gakuMax) === 300 ? 300 : 500;
    var res = { pref: 'kanagawa', sum2: s2.sum9, sum3: s3.sum9, A: A, aMax: P.aMax, a: a, f: f, g: g, gakuMax: gMax, exam: null };
    var B = num(o.gaku);
    if (B !== null && B >= 0 && B <= gMax) {
      var b = round2(B * 100 / gMax);
      res.exam = { B: B, b: b, S1: round2(a * f + b * g) };
    }
    var target = num(o.target);
    if (target !== null && target > 0) {
      var needB = (target - a * f) / g * gMax / 100;
      res.need = { target: target, raw: Math.max(0, needB), over: needB > gMax };
    }
    return res;
  }

  /**
   * 兵庫県公立高校（学力検査による一般入学者選抜）
   * o: { g: 中3の評定, gaku: 学力検査の合計（500 点満点）, gakku: 第1志望の学区（複数志願選抜。'' ならなし）, target: 目標の合計 }
   */
  function hyogo(o) {
    var P = V.PREFS.hyogo;
    var s = sums(o.g);
    if (!s) return null;
    var A = s.main5 * P.mainMul + s.jitsugi4 * P.jitsugiMul;
    var kasan = Object.prototype.hasOwnProperty.call(P.kasan, String(o.gakku)) ? P.kasan[String(o.gakku)] : 0;
    var res = { pref: 'hyogo', main5: s.main5, jitsugi4: s.jitsugi4, sonaishin: s.sum9, A: A, aMax: P.aMax, kasan: kasan, exam: null };
    var raw = num(o.gaku);
    if (raw !== null && raw >= 0 && raw <= 500) {
      var C = raw * P.cMul;
      res.exam = { raw: raw, C: C, soten: A + C, withKasan: A + C + kasan };
    }
    var target = num(o.target);
    if (target !== null && target > 0) {
      var need = (target - A - kasan) / P.cMul;
      res.need = { target: target, raw: Math.max(0, need), over: need > 500 };
    }
    return res;
  }

  function calc(pref, o) {
    if (pref === 'kanagawa') return kanagawa(o);
    if (pref === 'hyogo') return hyogo(o);
    return tokyo(o);
  }

  var api = { sums: sums, round2: round2, tokyo: tokyo, kanagawa: kanagawa, hyogo: hyogo, calc: calc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Naishin = api;
})(this);
