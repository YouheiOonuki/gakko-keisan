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
