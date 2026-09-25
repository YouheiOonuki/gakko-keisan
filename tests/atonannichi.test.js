// ○○まであと何日のテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../lib/atonannichi.js');

const T0 = A.parse('2026-09-25');   // テストの「今日」（金曜）

test('日付の読み取り: 存在しない日と形の違う文字は null', () => {
  assert.equal(A.iso(A.parse('2027-07-21')), '2027-07-21');
  assert.equal(A.parse('2026-02-29'), null);
  assert.equal(A.parse('2028-02-29') !== null, true);
  assert.equal(A.parse('2026-13-01'), null);
  assert.equal(A.parse('2026/09/25'), null);
  assert.equal(A.parse(''), null);
  assert.equal(A.parse(undefined), null);
  assert.equal(A.ymd(T0).w, 5);
  assert.equal(A.label(T0), '2026年9月25日（金）');
});

test('端末の今日: 時刻に関係なくその日の年月日', () => {
  assert.equal(A.today(new Date(2026, 8, 25, 0, 0, 1)), T0);
  assert.equal(A.today(new Date(2026, 8, 25, 23, 59, 59)), T0);
});

test('あと何日: 今日は数えない（あした＝1）。当日は 0、すぎたら負', () => {
  assert.deepEqual(A.compute({ date: '2026-09-26' }, T0), { target: T0 + 1, days: 1, state: 'future' });
  assert.equal(A.compute({ date: '2026-09-25' }, T0).state, 'today');
  const p = A.compute({ date: '2026-09-20' }, T0);
  assert.equal(p.state, 'past');
  assert.equal(p.days, -5);
  assert.equal(A.compute({ date: '' }, T0), null);
});

test('手で数えた例: 2026-09-25 から 2026-12-25 は 91 日、2027-07-21 は 299 日', () => {
  // 9月 残り5（26〜30）＋10月31＋11月30＋12月25 ＝ 91
  assert.equal(A.compute({ date: '2026-12-25' }, T0).days, 91);
  // 2026-09-25 → 2027-07-21: 91（〜12/25）＋6（〜12/31）＋31＋28＋31＋30＋31＋30＋21 ＝ 299
  assert.equal(A.compute({ date: '2027-07-21' }, T0).days, 299);
});

test('うるう年をまたぐ: 2028-01-01 → 2028-03-01 は 60 日', () => {
  assert.equal(A.compute({ date: '2028-03-01' }, A.parse('2028-01-01')).days, 60);
  assert.equal(A.compute({ date: '2027-03-01' }, A.parse('2027-01-01')).days, 59);
});

test('毎年（誕生日）: 今年まだなら今年、すぎていたら来年。何さいの誕生日か', () => {
  const r = A.compute({ date: '2018-11-03', yearly: true }, T0);
  assert.equal(A.iso(r.target), '2026-11-03');
  assert.equal(r.days, 39);
  assert.equal(r.age, 8);
  const r2 = A.compute({ date: '2018-05-03', yearly: true }, T0);
  assert.equal(A.iso(r2.target), '2027-05-03');
  assert.equal(r2.age, 9);
  const r3 = A.compute({ date: '2018-09-25', yearly: true }, T0);
  assert.equal(r3.state, 'today');
  assert.equal(r3.age, 8);
});

test('毎年: 2月29日生まれは、うるう年でない年は 2月28日として数える', () => {
  const r = A.compute({ date: '2020-02-29', yearly: true }, T0);
  assert.equal(A.iso(r.target), '2027-02-28');
  const r2 = A.compute({ date: '2020-02-29', yearly: true }, A.parse('2027-03-01'));
  assert.equal(A.iso(r2.target), '2028-02-29');
  assert.equal(r2.age, 8);
});

test('期間（夏休みの残り）: 始まる前・とちゅう（今日を含めた残り）・すぎた', () => {
  const it = { date: '2027-07-21', end: '2027-08-31' };
  const before = A.compute(it, T0);
  assert.equal(before.state, 'future');
  assert.equal(before.days, 299);
  assert.equal(before.length, 42);   // 7/21〜7/31 の 11 日＋8月 31 日
  const first = A.compute(it, A.parse('2027-07-21'));
  assert.equal(first.state, 'during');
  assert.equal(first.left, 42);
  assert.equal(first.dayNo, 1);
  const mid = A.compute(it, A.parse('2027-08-25'));
  assert.equal(mid.left, 7);
  assert.equal(mid.dayNo, 36);
  const last = A.compute(it, A.parse('2027-08-31'));
  assert.equal(last.left, 1);
  const after = A.compute(it, A.parse('2027-09-01'));
  assert.equal(after.state, 'past');
  assert.equal(after.since, 1);
  // おわりが始まりより前なら期間として扱わない
  assert.equal(A.compute({ date: '2027-07-21', end: '2027-07-01' }, T0).length, undefined);
});

test('行の正規化と並べ替え（近い順、日付なし・すぎたものは後ろ）', () => {
  assert.deepEqual(A.normalizeItem({ name: 'x'.repeat(30), date: '2026-02-30', yearly: 'yes', end: 1 }), { name: 'x'.repeat(20), date: '', yearly: false, end: '' });
  const items = [
    { name: 'a', date: '2027-07-21' },
    { name: 'b', date: '' },
    { name: 'c', date: '2026-10-10' },
    { name: 'd', date: '2026-01-01' },
    { name: 'e', date: '2018-11-03', yearly: true },
  ];
  assert.deepEqual(A.sortItems(items, T0).map(x => x.it.name), ['c', 'e', 'a', 'b', 'd']);
});

test('カウントダウン表: 日曜はじまりの週、当日は left 0、ページは 9 週まで', () => {
  const s = A.sheet(T0, A.parse('2026-10-10'));   // 金曜 → 土曜、16 日
  assert.equal(s.ok, true);
  assert.equal(s.days, 15);
  assert.equal(s.pages.length, 1);
  const weeks = s.pages[0];
  assert.equal(weeks.length, 3);
  assert.equal(weeks[0][4], null);                 // 木曜は空き
  assert.equal(weeks[0][5].left, 15);              // 金曜 9/25 は「あと 15」
  assert.equal(weeks[0][5].first, true);
  assert.equal(weeks[2][6].left, 0);               // 土曜 10/10 が当日
  assert.equal(weeks[2][6].d, 10);
  assert.equal(weeks[1][4].first, true);           // 10/1（木）は月の初め
  const cells = weeks.flat().filter(Boolean);
  assert.equal(cells.length, 16);
  assert.deepEqual(cells.map(c => c.left), Array.from({ length: 16 }, (_, i) => 15 - i));
});

test('カウントダウン表: 長い期間はページを均等に分け、上限を超えたら作らない', () => {
  const s = A.sheet(T0, A.parse('2027-07-21'));     // 300 マス
  assert.equal(s.ok, true);
  const weeks = s.pages.reduce((a, p) => a + p.length, 0);
  assert.equal(weeks, 44);
  assert.equal(s.pages.length, 5);
  s.pages.forEach(p => assert.ok(p.length <= A.WEEKS_PER_PAGE && p.length >= 8));
  assert.equal(s.pages.flat().flat().filter(Boolean).length, 300);
  assert.equal(A.sheet(T0, T0 + A.MAX_SHEET_DAYS).ok, true);
  assert.equal(A.sheet(T0, T0 + A.MAX_SHEET_DAYS + 1).error, 'long');
  assert.equal(A.sheet(T0, T0 - 1).error, 'order');
  assert.equal(A.sheet(null, T0).error, 'date');
  assert.equal(A.sheet(T0, T0).pages[0][0][5].left, 0);
});

test('出典のファイル: 確認日と e-Gov の URL。日付の既定値は持たない', () => {
  const V = require('../lib/atonannichi-values.js');
  assert.match(V.CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(V.STALE_MONTHS >= 12);
  V.SOURCES.forEach(s => assert.match(s.url, /^https:\/\/laws\.e-gov\.go\.jp\//));
  assert.deepEqual(Object.keys(V).sort(), ['CHECKED', 'SOURCES', 'STALE_MONTHS']);
});
