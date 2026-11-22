// 偏差値・順位の計算のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../lib/hensachi.js');
const close = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('偏差値 ＝ 50 ＋ 10 ×（点数 − 平均）÷ 標準偏差', () => {
  assert.equal(H.hensachi(70, 60, 10), 60);
  assert.equal(H.hensachi(60, 60, 12), 50);
  assert.equal(H.hensachi(45, 60, 12), 37.5);
  assert.equal(H.hensachi(70, 60, 0), null);    // 標準偏差 0 は計算しない
  assert.equal(H.hensachi('', 60, 10), null);
});

test('偏差値から点数（逆算）', () => {
  assert.equal(H.scoreFor(60, 58, 15), 73);
  assert.equal(H.scoreFor(50, 58, 15), 58);
});

test('正規分布: Φ(0)=0.5、Φ(1)≈0.8413、Φ(2)≈0.9772、逆関数が戻る', () => {
  close(H.normCdf(0), 0.5, 1e-7);
  close(H.normCdf(1), 0.841345, 1e-6);
  close(H.normCdf(2), 0.977250, 1e-6);
  close(H.normCdf(-1), 0.158655, 1e-6);
  for (const p of [0.01, 0.1, 0.3, 0.5, 0.8, 0.99]) close(H.normCdf(H.normInv(p)), p, 1e-6);
});

test('上位の割合: 偏差値 60 は約 15.9%、70 は約 2.3%', () => {
  close(H.upperShare(60), 0.1587, 1e-4);
  close(H.upperShare(70), 0.0228, 1e-4);
});

test('順位の目安: 偏差値 60・200 人 → 上に約 31 人 → 32 位。範囲は 1〜人数', () => {
  assert.equal(H.rankEstimate(60, 200), 32);
  assert.equal(H.rankEstimate(50, 40), 21);
  assert.equal(H.rankEstimate(90, 40), 1);
  assert.equal(H.rankEstimate(10, 40), 40);
  assert.equal(H.rankEstimate(60, ''), null);
});

test('順位から偏差値の目安: 40 人中 1 位 ≈ 72.4、20 位 ≈ 50.3、40 位 ≈ 27.6', () => {
  close(H.fromRank(1, 40), 72.41, 0.01);
  close(H.fromRank(20, 40), 50.31, 0.01);
  close(H.fromRank(40, 40), 27.59, 0.01);
  assert.equal(H.fromRank(41, 40), null);
  assert.equal(H.fromRank(0, 40), null);
});

test('点数の貼り付け: 全角数字・読点・改行・タブを区切りに', () => {
  assert.deepEqual(H.parseScores('７０、80\n90\t55.5 ，61'), [70, 80, 90, 55.5, 61]);
  assert.deepEqual(H.parseScores(''), []);
});

test('平均と標準偏差（n で割る・n−1 で割る）、一覧の中の順位', () => {
  const s = H.stats([50, 60, 70]);
  assert.equal(s.mean, 60);
  close(s.sd, Math.sqrt(200 / 3), 1e-12);
  close(s.sdSample, 10, 1e-12);
  assert.equal(H.stats([50]), null);
  assert.equal(H.rankInList(70, [50, 60, 70, 80, 70]), 2);
  assert.equal(H.rankInList(90, [50, 60]), 1);
});

// 結果の下の山の図（Q-359）。面の割合は画面の「上位の割合」と同じ upperShare から
const pct1 = (p) => (Math.round(p * 1000) / 10).toFixed(1);
test('山の図: 印より上の側の面 = 上位の割合（50 → 50.0%、60 → 15.9%、70 → 2.3%、40 → 84.1%）', () => {
  assert.equal(pct1(H.bellMark(50).share), '50.0');
  assert.equal(pct1(H.bellMark(60).share), '15.9');
  assert.equal(pct1(H.bellMark(70).share), '2.3');
  assert.equal(pct1(H.bellMark(40).share), '84.1');
  for (const t of [23.4, 50, 59.3, 77]) assert.equal(H.bellMark(t).share, H.upperShare(t));
});

test('山の図: 印の位置は山の上（頂点 50 が 1）、20 未満・80 超えは端に', () => {
  const m = H.bellMark(60);
  assert.equal(m.x, 60);
  close(m.h, Math.exp(-0.5), 1e-12);
  assert.equal(m.edge, null);
  assert.equal(H.bellMark(50).h, 1);
  close(H.bellHeight(40), H.bellHeight(60), 1e-12);
  const hi = H.bellMark(85.2);
  assert.deepEqual([hi.x, hi.edge], [80, 'high']);
  assert.equal(hi.share, H.upperShare(85.2));   // 数は端に寄せない（画面の上位の割合のまま）
  const lo = H.bellMark(12);
  assert.deepEqual([lo.x, lo.edge], [20, 'low']);
  assert.equal(H.bellMark(80).edge, null);
  assert.equal(H.bellMark(20).edge, null);
  assert.equal(H.bellMark(null), null);
  assert.deepEqual(H.BELL.ticks, [30, 40, 50, 60, 70]);
});

// 山の図の上で自分の位置を動かす（Q-428）。印の位置 → 点数は bellScoreAt（scoreFor）、点数 → 印の位置は hensachi と bellFrac
const back = (s, m, sd) => H.bellScoreAt(H.bellFrac(H.hensachi(s, m, sd)), m, sd);   // 点数の印の位置から、点数へ戻す
test('山の印: 印の位置 = 点数の欄の値（範囲の中の整数はどれも戻る。平均 58・標準偏差 15）', () => {
  const r = H.bellScoreRange(58, 15);
  assert.deepEqual(r, { min: 13, max: 103 });   // 偏差値 20 = 13 点、80 = 103 点
  for (let s = r.min; s <= r.max; s++) assert.equal(back(s, 58, 15), s);
  assert.equal(H.bellFrac(H.hensachi(13, 58, 15)), 0);
  assert.equal(H.bellFrac(H.hensachi(103, 58, 15)), 1);
  assert.equal(H.bellFrac(H.hensachi(58, 58, 15)), 0.5);
});

test('山の印: 端（図の外へは出ない）と 0 点（0 未満にならない）', () => {
  assert.equal(H.bellScoreAt(-0.3, 58, 15), 13);
  assert.equal(H.bellScoreAt(1.4, 58, 15), 103);
  // 平均 30・標準偏差 20 では偏差値 20 が −30 点。左端は 0 点まで
  assert.deepEqual(H.bellScoreRange(30, 20), { min: 0, max: 90 });
  assert.equal(H.bellScoreAt(0, 30, 20), 0);
  assert.equal(H.bellStep(0, -1, 30, 20), 0);
  assert.equal(H.bellStep(2, -5, 30, 20), 0);
  assert.equal(back(0, 30, 20), 0);
  // 範囲の外の点数（図の端の三角）から動かすと、範囲の端へ
  assert.equal(H.bellStep(120, -1, 58, 15), 103);
  assert.equal(H.bellStep(5, 1, 58, 15), 13);
  assert.equal(H.bellStep(103, 5, 58, 15), 103);
  // 0 点以上に整数が無い（右端も 0 未満）なら動かさない
  assert.equal(H.bellScoreRange(-50, 1), null);
  assert.equal(H.bellScoreAt(0.5, -50, 1), null);
});

test('山の印: 標準偏差が小さい（0.5）・平均が小数でも、印の位置 = 点数', () => {
  assert.deepEqual(H.bellScoreRange(50, 0.5), { min: 49, max: 51 });   // 偏差値 20〜80 は 48.5〜51.5 点
  for (const s of [49, 50, 51]) assert.equal(back(s, 50, 0.5), s);
  assert.equal(H.bellStep(50, 1, 50, 0.5), 51);
  assert.equal(H.bellStep(51, 1, 50, 0.5), 51);
  assert.deepEqual(H.bellScoreRange(50.5, 0.1), null);   // 50.2〜50.8 点に整数が無い
  const r = H.bellScoreRange(61.7, 9.3);
  for (let s = r.min; s <= r.max; s++) assert.equal(back(s, 61.7, 9.3), s);
  assert.equal(H.bellScoreRange(58, 0), null);
  assert.equal(H.bellScoreRange('', 15), null);
});

test('山の印: 小数の点数は、動かした後は整数（← → で 1 点、Shift で 5 点）', () => {
  assert.equal(H.bellStep(72.4, 1, 58, 15), 73);
  assert.equal(H.bellStep(72.4, -1, 58, 15), 72);
  assert.equal(H.bellStep(72.4, 5, 58, 15), 77);
  assert.equal(H.bellStep(72.4, -5, 58, 15), 68);
  assert.equal(H.bellStep(72, 1, 58, 15), 73);
  assert.equal(H.bellStep(72, -5, 58, 15), 67);
  assert.ok(Number.isInteger(H.bellScoreAt(0.613, 58, 15)));
  assert.equal(H.bellStep('', 1, 58, 15), null);
});

test('使い方の最初の段落は求め方に答える文、リンクの段落はその次（Q-981、ROADMAP 7.260 の追補の 2、D744）', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../hensachi/guide.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'));
  const ps = [...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  assert.equal(ps[0], '偏差値は「50＋10×（点数−平均点）÷標準偏差」で求めます。点数 70 点・平均点 60 点・標準偏差 10 なら、偏差値は 60 です。');
  assert.equal(ps[1], '<a href="./">▶ 偏差値を計算する</a>');
  // 例の値は計算と合う。式の書き方は本文（#formula）と同じ
  assert.equal(H.hensachi(70, 60, 10), 60);
  assert.ok(html.includes('<p>偏差値＝50＋10×（点数−平均点）÷標準偏差。'));
});
