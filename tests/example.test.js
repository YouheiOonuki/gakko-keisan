// 開いた時の例（lib/example.js。ROADMAP 続き 71 の答え D1058・D1060、QUEUE Q-1224）: node --test tests/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../lib/example.js');
const S = require('../lib/shusseki.js');
const H = require('../lib/hensachi.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const blankShusseki = { ratio: '', custom: '', total: '', absent: '', units: '', excused: '', rows: [{ name: '', units: '', absent: '' }] };
const blankHensachi = { score: '', mean: '', sd: '', n: '', list: '', rk: '', rn: '', five: [{ s: '', m: '', d: '' }, { s: '', m: '', d: '' }] };

test('出席日数の例: lib に渡した結果が「あと 13 回・上限 23 回」。例の 1 行は例の値から作る', () => {
  const x = E.SHUSSEKI;
  const l = S.limit({ total: x.total, absent: x.absent, ratio: S.ratioOf(x.ratio) });
  assert.equal(l.remain, 13);
  assert.equal(l.allowed, 23);
  assert.equal(E.shussekiLine(), '例: 授業 70 回・3 分の 2 以上・10 回休んだ場合');
});

test('出席日数: 何も入っていなければ例を出し、1 つでも入っていれば（保存した入力も）出さない', () => {
  assert.equal(E.shussekiBlank(blankShusseki), true);
  assert.equal(E.shussekiBlank({}), true);
  for (const k of ['ratio', 'custom', 'total', 'absent', 'units', 'excused']) {
    assert.equal(E.shussekiBlank({ ...blankShusseki, [k]: '1' }), false, k);
  }
  assert.equal(E.shussekiBlank({ ...blankShusseki, rows: [{ name: '数学', units: '', absent: '' }] }), false);
  assert.equal(E.shussekiBlank({ ...blankShusseki, rows: [{ name: '', units: '2', absent: '' }] }), false);
});

test('偏差値の例: lib に渡した結果は 59.3、例の 1 行は例の値から作る', () => {
  const x = E.HENSACHI;
  assert.equal((Math.round(H.hensachi(x.score, x.mean, x.sd) * 10) / 10), 59.3);
  assert.equal(E.hensachiLine(), '例: 点数 72 点・平均 58 点・標準偏差 15 点の場合');
});

test('偏差値: 何も入っていなければ例を出し、1 つでも入っていれば出さない', () => {
  assert.equal(E.hensachiBlank(blankHensachi), true);
  assert.equal(E.hensachiBlank({}), true);
  for (const k of ['score', 'mean', 'sd', 'n', 'list', 'rk', 'rn']) {
    assert.equal(E.hensachiBlank({ ...blankHensachi, [k]: '5' }), false, k);
  }
  assert.equal(E.hensachiBlank({ ...blankHensachi, five: [{ s: '', m: '60', d: '' }] }), false);
});

test('例の値は入力欄の placeholder と同じ（出席日数 70・10、偏差値 72・58・15）', () => {
  const sh = read('shusseki/index.html'), he = read('hensachi/index.html');
  assert.match(sh, /id="total"[^>]*placeholder="例：70"/);
  assert.match(sh, /id="absent"[^>]*placeholder="例：10"/);
  assert.match(he, /id="score"[^>]*placeholder="例：72"/);
  assert.match(he, /id="mean"[^>]*placeholder="例：58"/);
  assert.match(he, /id="sd"[^>]*placeholder="例：15"/);
});

test('画面: 例の 1 行の要素と lib/example.js を持ち、app.js が例を出して、入力の欄は空のまま（値を書き込まない）', () => {
  for (const dir of ['shusseki', 'hensachi']) {
    const html = read(dir + '/index.html'), app = read(dir + '/app.js');
    assert.match(html, /<p class="ex-note" id="r-example" hidden><\/p>/, dir);
    assert.ok(html.indexOf('../lib/example.js') > 0 && html.indexOf('../lib/example.js') < html.indexOf('./app.js'), dir + ' の script の順');
    assert.match(app, /E\.(shusseki|hensachi)Blank\(d\)/, dir);
    assert.match(app, /\$\('r-example'\)\.hidden = !ex/, dir);
  }
  // 出席日数の「1 回休む」だけが、例を欄に入れる（押した時）
  assert.match(read('shusseki/app.js'), /if \(lastEx\)/);
});
