// 公開データ（data/naishin.json。CC0）のテスト: node --test tests/*.test.js
// lib/naishin-values.js（式と値）と lib/naishin.js（計算例）から機械で書き出すもの。
// ファイルが書き出しの結果と同じか、出典の URL と確認日が残っているか、式の文の数字が値と食い違っていないかを確かめる
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const V = require('../lib/naishin-values.js');
const N = require('../lib/naishin.js');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('data/naishin.json が lib/naishin-values.js から書き出した結果と同じ（node tools/build-data.mjs）', async () => {
  const B = await import(path.join(root, 'tools', 'build-data.mjs'));
  assert.equal(read('data/naishin.json'), B.buildJson());
});

test('naishin.json: CC0・確認日・各府県の出典の URL・計算例', () => {
  const d = JSON.parse(read('data/naishin.json'));
  assert.equal(d.license, 'CC0-1.0');
  assert.equal(d.checked, V.CHECKED);
  assert.deepEqual(d.prefs.map(p => p.key), Object.keys(V.PREFS));
  for (const p of d.prefs) {
    assert.equal(p.checked, V.PREFS[p.key].checked, p.key);
    assert.ok(p.sources.length > 0, p.key);
    for (const s of p.sources) {
      assert.match(s.url, /^https:\/\//, p.key);
      assert.equal(s.checked, V.CHECKED, p.key);
    }
    assert.ok(p.formula && !/。$/.test(p.formula), p.key + ' の式は 1 行（「。」で終えない）');
    assert.ok(!('sources' in p.params) && !('formula' in p.params), p.key);
    assert.deepEqual(p.example.result, JSON.parse(JSON.stringify(N.calc(p.key, d.example_input))), p.key);
  }
});

test('式の文の数字が値と同じ（formula と params の食い違い）', () => {
  const P = V.PREFS;
  const has = (key, ...nums) => { for (const n of nums) assert.ok(P[key].formula.includes(String(n)), key + ' の式に ' + n); };
  has('tokyo', P.tokyo.total, P.tokyo.total + P.tokyo.esatMax, P.tokyo.total * 7 / 10, P.tokyo.total * 3 / 10, P.tokyo.esat.A, 65, 75);
  has('kanagawa', P.kanagawa.aMax, '×2');
  has('hyogo', '×' + P.hyogo.mainMul, '×' + P.hyogo.jitsugiMul, P.hyogo.aMax, '×' + P.hyogo.cMul);
  has('osaka', '中1×' + P.osaka.yearMul[1], '中2×' + P.osaka.yearMul[2], '中3×' + P.osaka.yearMul[3], P.osaka.choMax, P.osaka.total);
  has('saitama', ...P.saitama.convChoices, P.saitama.gakuMax, P.saitama.mensetsuBase, ...P.saitama.yearRatios.map(r => r.r.join(':')));
  has('chiba', P.chiba.sumMax, P.chiba.gakuMax, P.chiba.kasanMax, ...P.chiba.kChoices);
});

test('ライセンスと説明: data/LICENSE は CC0 1.0 の全文、README に CC0 とコードの MIT の区別、使い方ページからリンク', () => {
  const lic = read('data/LICENSE');
  assert.match(lic, /CC0 1\.0 Universal/);
  assert.match(lic, /Statement of Purpose/);
  const readme = read('data/README.md');
  assert.match(readme, /CC0 1\.0/);
  assert.match(readme, /MIT License/);
  assert.match(readme, /node tools\/build-data\.mjs/);
  assert.match(read('naishin/guide.html'), /href="\.\.\/data\/naishin\.json"/);
});
