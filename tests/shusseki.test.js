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

// 結果の下の升目（Q-408）。升の数と柄ごとの数は limit の返り値から
const sum = (g) => g.absent + g.remain + g.rest + g.over;
test('升目: 升の数 = 授業の回数、柄ごとの数 = limit の数（3分の2・4分の3・8割）', () => {
  for (const [id, allowed] of [['2/3', 23], ['3/4', 17], ['4/5', 14]]) {
    const l = S.limit({ total: 70, absent: 10, ratio: S.ratioOf(id) });
    const g = S.grid(l);
    assert.equal(l.allowed, allowed);
    assert.equal(g.size, 70);
    assert.equal(sum(g), 70);
    assert.deepEqual([g.absent, g.remain, g.rest, g.over], [l.absent, l.remain, l.need, 0]);
  }
});

test('升目: 回数 1・休める上限ちょうど・上限を超える・休んだ回数が授業の回数より多い', () => {
  const one = S.grid(S.limit({ total: 1, ratio: S.ratioOf('2/3') }));
  assert.deepEqual(one, { size: 1, absent: 0, remain: 0, rest: 1, over: 0 });
  const just = S.grid(S.limit({ total: 70, absent: 23, ratio: S.ratioOf('2/3') }));
  assert.deepEqual(just, { size: 70, absent: 23, remain: 0, rest: 47, over: 0 });
  const over = S.limit({ total: 70, absent: 30, ratio: S.ratioOf('2/3') });
  assert.deepEqual(S.grid(over), { size: 70, absent: 23, remain: 0, rest: 40, over: -over.remain });
  const all = S.grid(S.limit({ total: 70, absent: 99, ratio: S.ratioOf('2/3') }));
  assert.deepEqual(all, { size: 70, absent: 23, remain: 0, rest: 0, over: 47 });
});

test('升目: 欠席に数えない回数は今の計算のとおり升から引く。空・0・400 超えは出さない', () => {
  const l = S.limit({ total: 70, absent: 5, excused: 4, ratio: S.ratioOf('2/3') });
  const g = S.grid(l);
  assert.equal(g.size, l.base);
  assert.equal(g.size, 66);
  assert.equal(sum(g), 66);
  assert.equal(g.remain, l.remain);
  assert.equal(S.grid(null), null);
  assert.equal(S.grid(S.limit({ total: '', ratio: S.ratioOf('2/3') })), null);
  assert.equal(S.grid(S.limit({ total: 5, excused: 5, ratio: S.ratioOf('2/3') })), null);
  assert.equal(S.grid(S.limit({ total: 400, ratio: S.ratioOf('2/3') })).size, 400);
  assert.equal(S.grid(S.limit({ total: 401, ratio: S.ratioOf('2/3') })), null);
  assert.equal(S.GRID_MAX, 400);
});

test('升目: 1〜120 回・休んだ 0〜回数＋2 の全部で、升の合計 = 回数、あと休める升 = 残り', () => {
  for (const id of ['2/3', '3/4', '4/5']) for (let n = 1; n <= 120; n++) for (let a = 0; a <= n + 2; a++) {
    const l = S.limit({ total: n, absent: a, ratio: S.ratioOf(id) });
    const g = S.grid(l);
    assert.equal(sum(g), n);
    assert.equal(g.remain, Math.max(0, l.remain));
    assert.equal(g.absent + g.over, Math.min(a, n));
  }
});

test('画面の本文の最初の文は「何がわかるか」、断りはその後ろに字を変えずに（Q-977、ROADMAP 7.260 の 3 の 2）', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../shusseki/index.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'));
  const firstP = main.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)[1];
  assert.match(firstP, /^選んだ割合で、あと何回休めるかを出します。/);
  assert.ok(firstP.includes('。法令の決まりではなく学校ごとの決まりです。生徒手帳などで確かめてください。'));
  assert.equal(html.split('法令の決まりではなく学校ごとの決まりです。').length - 1, 1);
});

test('使い方の最初の段落は休める回数の式と例、リンクの段落はその次。例の数は lib と同じ（Q-1231、D1065）', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '../shusseki/guide.html'), 'utf8');
  const main = html.slice(html.indexOf('<main'));
  const ps = [...main.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
  assert.equal(ps[0], '高校で休める回数の上限は「授業の回数×（1−出席の割合）」で、小数点以下は切り捨てます。2単位（年70回）で3分の2の出席が要る学校なら、23回までです。');
  assert.equal(ps[1], '<a href="./">▶ あと何回休めるか計算する</a>');
  const S = require('../lib/shusseki.js');
  assert.equal(S.limit({ total: 2 * 35, absent: 0, ratio: S.ratioOf('2/3') }).allowed, 23);
});
