// 宿題タイマーのテスト: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../lib/timer.js');

test('時間の表示: 分:秒、1 時間以上は 時:分:秒、端数の秒は切り上げ', () => {
  assert.equal(T.format(15 * 60), '15:00');
  assert.equal(T.format(65), '1:05');
  assert.equal(T.format(0.2), '0:01');
  assert.equal(T.format(0), '0:00');
  assert.equal(T.format(-3), '0:00');
  assert.equal(T.format(3600), '1:00:00');
  assert.equal(T.format(2 * 3600 - 1), '1:59:59');
});

test('残りの割合: 0〜1 に収める', () => {
  assert.equal(T.fraction(30000, 60000), 0.5);
  assert.equal(T.fraction(90000, 60000), 1);
  assert.equal(T.fraction(-1, 60000), 0);
  assert.equal(T.fraction(10, 0), 0);
});

test('正規化: 既定は 15 分・円・音ちいさめ・くり返しなし・画面を消さない', () => {
  assert.deepEqual(T.normalize({}), { minutes: 15, label: '', shape: 'circle', volume: 'low', repeat: false, restMin: 5, rounds: 4, wake: true });
  const s = T.normalize({ minutes: 999, label: 'x'.repeat(50), shape: 'bar', volume: 'loud', repeat: true, restMin: 0, rounds: 99, wake: false });
  assert.equal(s.minutes, T.MAX_MIN);
  assert.equal(s.label.length, 20);
  assert.equal(s.shape, 'bar');
  assert.equal(s.volume, 'low');
  assert.equal(s.restMin, 1);
  assert.equal(s.rounds, T.MAX_ROUNDS);
  assert.equal(s.wake, false);
  assert.equal(T.normalize(null).minutes, 15);
  assert.equal(T.normalize({ minutes: 'abc' }).minutes, 15);
});

test('音量: 消す（0）と、ちいさめが既定で大きくない', () => {
  assert.equal(T.VOLUMES.off, 0);
  assert.ok(T.VOLUMES.low < T.VOLUMES.mid && T.VOLUMES.mid < T.VOLUMES.high && T.VOLUMES.high <= 0.5);
});

test('段取り: くり返しなしは 1 回、25 分＋5 分 ×4 は やすみ 3 回で 115 分', () => {
  assert.deepEqual(T.plan({ minutes: 20 }), [{ kind: 'work', sec: 1200, round: 1 }]);
  const p = T.plan({ minutes: 25, repeat: true, restMin: 5, rounds: 4 });
  assert.equal(p.length, 7);
  assert.deepEqual(p.map(x => x.kind), ['work', 'rest', 'work', 'rest', 'work', 'rest', 'work']);
  assert.equal(T.totalSec(p), (25 * 4 + 5 * 3) * 60);
});

test('いまどこか: 段の切りかわりと、おわり', () => {
  const p = T.plan({ minutes: 1, repeat: true, restMin: 1, rounds: 2 });   // work 60 → rest 60 → work 60
  assert.deepEqual(T.at(p, 0), { index: 0, kind: 'work', round: 1, remainMs: 60000, stepMs: 60000, done: false });
  assert.equal(T.at(p, 59999).index, 0);
  const r = T.at(p, 60000);
  assert.equal(r.kind, 'rest');
  assert.equal(r.remainMs, 60000);
  const w2 = T.at(p, 150000);
  assert.equal(w2.kind, 'work');
  assert.equal(w2.round, 2);
  assert.equal(w2.remainMs, 30000);
  const d = T.at(p, 180000);
  assert.equal(d.done, true);
  assert.equal(d.index, 3);
  assert.equal(T.at(p, 1e9).done, true);
});

test('音の設計図: おわり・やすみ・べんきょうで違う音、音符は正の長さ', () => {
  ['end', 'rest', 'work'].forEach(k => {
    const m = T.melody(k);
    assert.ok(m.length >= 2);
    m.forEach(n => { assert.ok(n.f > 200 && n.f < 2000); assert.ok(n.d > 0); assert.ok(n.t >= 0); });
  });
  assert.notDeepEqual(T.melody('rest'), T.melody('work'));
  assert.notDeepEqual(T.melody('end'), T.melody('rest'));
});

test('プリセット: 5〜60 分で上限以内', () => {
  T.PRESETS.forEach(m => assert.ok(m >= 1 && m <= T.MAX_MIN));
});
