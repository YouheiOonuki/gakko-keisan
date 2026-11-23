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

// ---- 内申点（Q-1234、ROADMAP 続き 72 の答え D1069・D1060） ----
const NV = require('../lib/naishin-values.js');
const NA = require('../lib/naishin.js');
const SUBJ = NV.SUBJECTS.map((s) => s.id);
const blankNaishin = () => ({
  pref: 'tokyo', sum1: '', sum2: '', g3: {},
  tokyo: { kyoka: '5', ratio: '7:3', gaku: '', esat: '' },
  kanagawa: { f: String(NV.PREFS.kanagawa.fDefault), gaku: '', gakuMax: '500' },
  hyogo: { gaku: '', gakku: '' },
  osaka: { type: NV.PREFS.osaka.typeDefault, gaku: '' },
  saitama: { ratio: NV.PREFS.saitama.ratioDefault, conv: String(NV.PREFS.saitama.convDefault), gaku: '', mensetsu: '', mmul: '1' },
  chiba: { k: String(NV.PREFS.chiba.kDefault), gaku: '' },
  target: { tokyo: '', kanagawa: '', hyogo: '', osaka: '', saitama: '', chiba: '' },
});
const tgt0 = () => ({ tokyo: '', kanagawa: '', hyogo: '', osaka: '', saitama: '', chiba: '' });

test('内申点の例: 東京都・9 教科すべて 3 を lib に渡した結果（素内申 27・換算内申 39）が、例の評定と同じ入力で出る。例の 1 行は例の値から作る', () => {
  const g = E.naishinGrades(SUBJ);
  assert.equal(Object.keys(g).length, 9);
  assert.ok(Object.values(g).every((v) => v === 3));
  const r = NA.calc('tokyo', { g, kyoka: '5', ratio: '7:3', gaku: '', esat: '', target: '' });
  assert.equal(r.sonaishin, 27);
  assert.equal(r.main5, 15);
  assert.equal(r.jitsugi4, 12);
  assert.equal(r.kansan, 39);
  assert.equal(E.naishinLine(), '例: 東京都・9 教科すべて 3 の場合');
});

test('内申点: 何も入っていなければ（既定の東京都のまま）例を出す', () => {
  assert.equal(E.naishinBlank(blankNaishin(), tgt0(), NV), true);
  assert.equal(E.naishinBlank({}, {}, NV), true);
});

test('内申点: 評定を 1 つ選ぶ・都府県を替える・ほかの欄に入れる、のどれかで例を消す', () => {
  const t = (mut) => { const d = blankNaishin(); mut(d); return E.naishinBlank(d, tgt0(), NV); };
  assert.equal(t((d) => { d.g3 = { kokugo: 3 }; }), false, '評定を 1 つ');
  for (const p of ['kanagawa', 'saitama', 'chiba', 'osaka', 'hyogo']) assert.equal(t((d) => { d.pref = p; }), false, p);
  assert.equal(t((d) => { d.sum1 = '30'; }), false, 'sum1');
  assert.equal(t((d) => { d.sum2 = '30'; }), false, 'sum2');
  assert.equal(t((d) => { d.tokyo.gaku = '350'; }), false, '学力検査');
  assert.equal(t((d) => { d.tokyo.kyoka = '3'; }), false, '3 教科');
  assert.equal(t((d) => { d.tokyo.ratio = '6:4'; }), false, '比率');
  assert.equal(t((d) => { d.tokyo.esat = 'A'; }), false, 'ESAT-J');
  assert.equal(t((d) => { d.kanagawa.f = '4'; }), false, '神奈川の比率');
  assert.equal(t((d) => { d.osaka.gaku = '300'; }), false, '大阪の学力検査');
  assert.equal(t((d) => { d.saitama.mensetsu = '10'; }), false, '埼玉の面接');
  assert.equal(t((d) => { d.chiba.gaku = '300'; }), false, '千葉の学力検査');
  assert.equal(t((d) => { d.hyogo.gakku = '3'; }), false, '兵庫の学区');
  assert.equal(E.naishinBlank(blankNaishin(), { ...tgt0(), tokyo: '800' }, NV), false, '目標点');
});

test('内申点: 保存した入力がある人（評定・合計・欄）には出さない', () => {
  const saved = { ...blankNaishin(), g3: Object.fromEntries(SUBJ.map((id) => [id, 4])) };
  assert.equal(E.naishinBlank(saved, tgt0(), NV), false);
  assert.equal(E.naishinBlank({ ...blankNaishin(), pref: 'chiba', sum1: '30', sum2: '31' }, tgt0(), NV), false);
});

test('画面: 内申点は例の 1 行の要素と lib/example.js を持ち、app.js が例の評定で lib を呼び、評定のタイルには値を書き込まない', () => {
  const html = read('naishin/index.html'), app = read('naishin/app.js');
  assert.match(html, /<p class="ex-note" id="r-example" hidden><\/p>/);
  assert.ok(html.indexOf('../lib/example.js') > 0 && html.indexOf('../lib/example.js') < html.indexOf('./app.js'));
  assert.match(app, /E\.naishinBlank\(d, tgt, V\)/);
  assert.match(app, /E\.naishinGrades\(SUBJ\)/);
  assert.match(app, /\$\('r-example'\)\.hidden = !ex/);
  // 例の評定は calcInput に渡すだけで、writeGrades（タイルを選んだ状態にする）は例の経路で呼ばない
  assert.ok(!/ex[^;\n]*writeGrades/.test(app));
});
