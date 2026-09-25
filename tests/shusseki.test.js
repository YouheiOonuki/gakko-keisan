// 出席日数・単位の計算のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../lib/shusseki.js');
const V = require('../lib/shusseki-values.js');

test('値のファイル: 1 単位＝35 回、確認日と出典', () => {
  assert.equal(V.UNIT_HOURS, 35);
  assert.equal(V.GRAD_UNITS, 74);
  assert.match(V.CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  V.SOURCES.forEach(s => assert.match(s.url, /^https:\/\//));
});

test('2 単位（70 回）・3分の2 → 休める上限 23 回。10 回休んだら あと 13 回', () => {
  const r = S.limit({ total: 70, absent: 10, ratio: S.ratioOf('2/3') });
  assert.equal(r.allowed, 23);
  assert.equal(r.need, 47);
  assert.equal(r.remain, 13);
  assert.equal(r.over, false);
});

test('割合ごと: 70 回で 8割 → 14、105 回で 4分の3 → 26、3分の2 → 35', () => {
  assert.equal(S.limit({ total: 70, ratio: S.ratioOf('4/5') }).allowed, 14);
  assert.equal(S.limit({ total: 105, ratio: S.ratioOf('3/4') }).allowed, 26);
  assert.equal(S.limit({ total: 105, ratio: S.ratioOf('2/3') }).allowed, 35);
});

test('「出席が割合以上」と「欠席が残りの割合を超えない」は同じ回数（1〜300 回の全部）', () => {
  for (const id of ['2/3', '3/4', '4/5']) {
    const r = S.ratioOf(id);
    for (let t = 1; t <= 300; t++) {
      const l = S.limit({ total: t, ratio: r });
      assert.ok(l.need * r.den >= t * r.num, `${id} ${t}: 出席 ${l.need} が足りない`);
      assert.ok((l.need - 1) * r.den < t * r.num, `${id} ${t}: 1 回多く休めるはず`);
    }
  }
});

test('自分で入れる割合（%、小数第1位まで）: 100 回で 66.7% → 33、85% → 15', () => {
  assert.equal(S.limit({ total: 100, ratio: S.ratioOf('custom', 66.7) }).allowed, 33);
  assert.equal(S.limit({ total: 100, ratio: S.ratioOf('custom', '85') }).allowed, 15);
  assert.equal(S.ratioOf('custom', 100), null);
  assert.equal(S.ratioOf('custom', ''), null);
  assert.equal(S.ratioOf('x'), null);
});

test('超えたとき: 70 回・3分の2・25 回休んだ → あと −2（超えている）', () => {
  const r = S.limit({ total: 70, absent: 25, ratio: S.ratioOf('2/3') });
  assert.equal(r.remain, -2);
  assert.equal(r.over, true);
});

test('欠席に数えない回数（出席停止・忌引など）を引く: 200 日・5 日 → 195 日の 3分の2 → 休める 65 日', () => {
  const r = S.limit({ total: 200, excused: 5, ratio: S.ratioOf('2/3') });
  assert.equal(r.base, 195);
  assert.equal(r.allowed, 65);
});

test('単位数から回数、科目の一覧は残りの少ない順', () => {
  assert.equal(S.hoursFromUnits(2), 70);
  assert.equal(S.hoursFromUnits(''), null);
  const t = S.table([
    { name: '数学Ⅰ', units: 3, absent: 10 },   // 105 回 → 35、残り 25
    { name: '体育', units: 2, absent: 20 },     // 70 回 → 23、残り 3
    { name: '', hours: 30, absent: 0 },         // 30 回 → 10、残り 10
    { name: '空', units: '', absent: 3 },       // 数えない
  ], S.ratioOf('2/3'));
  assert.deepEqual(t.map(x => [x.name, x.r.remain]), [['体育', 3], ['科目3', 10], ['数学Ⅰ', 25]]);
});
