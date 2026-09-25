// 内申点の計算のテスト: node --test tests/*.test.js
// 手で確かめた例（yorozu-plans の docs/28_学校の計算.md 6 章）と、要綱の満点・比率
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../lib/naishin.js');
const V = require('../lib/naishin-values.js');

// 5 教科・実技 4 教科をそれぞれ同じ評定にする
const G = (m, j) => ({ kokugo: m, shakai: m, sugaku: m, rika: m, eigo: m, ongaku: j, bijutsu: j, hotai: j, gika: j });
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('値のファイル: 確認日と出典がある', () => {
  assert.match(V.CHECKED, /^\d{4}-\d{2}-\d{2}$/);
  for (const k of ['tokyo', 'kanagawa', 'hyogo', 'osaka', 'saitama', 'chiba']) {
    assert.ok(V.PREFS[k].sources.length > 0);
    V.PREFS[k].sources.forEach(s => assert.match(s.url, /^https:\/\//));
    assert.equal(V.PREFS[k].checked, V.CHECKED);
  }
  assert.equal(V.SUBJECTS.length, 9);
});

test('東京: 5 教科 4・実技 4 → 換算内申 52/65、調査書点 240/300、素内申 36', () => {
  const r = N.tokyo({ g: G(4, 4) });
  assert.equal(r.sonaishin, 36);
  assert.equal(r.kansan, 52);
  assert.equal(r.kansanMax, 65);
  close(r.chosa, 240);
  assert.equal(r.chosaMax, 300);
});

test('東京: オール 3 は 39/65 → 180 点、オール 5 は 65 → 300 点、オール 1 は 13 → 60 点', () => {
  close(N.tokyo({ g: G(3, 3) }).chosa, 180);
  close(N.tokyo({ g: G(5, 5) }).chosa, 300);
  close(N.tokyo({ g: G(1, 1) }).chosa, 60);
  assert.equal(N.tokyo({ g: G(3, 3) }).kansan, 39);
});

test('東京: 実技が高いほど換算内申が上がる（5 教科 5・実技 3 は 49、5 教科 3・実技 5 は 55）', () => {
  assert.equal(N.tokyo({ g: G(5, 3) }).kansan, 49);
  assert.equal(N.tokyo({ g: G(3, 5) }).kansan, 55);
});

test('東京: 学力検査 350 点・ESAT-J B → 490＋240＝730、総合得点 746/1020', () => {
  const r = N.tokyo({ g: G(4, 4), gaku: 350, esat: 'B' });
  close(r.exam.gakuConv, 490);
  close(r.exam.total1000, 730);
  assert.equal(r.exam.esat, 16);
  close(r.exam.total1020, 746);
});

test('東京: ESAT-J の点数化は A20・B16・C12・D8・E4・F0、未入力は加えない', () => {
  assert.deepEqual(V.PREFS.tokyo.esat, { A: 20, B: 16, C: 12, D: 8, E: 4, F: 0 });
  const r = N.tokyo({ g: G(4, 4), gaku: 350, esat: '' });
  assert.equal(r.exam.esat, null);
  close(r.exam.total1020, 730);
});

test('東京: 3 教科（国数英）は 75 点満点。オール 3 は 45、6:4 で調査書点 240/400、学力 180/300 → 360', () => {
  const r = N.tokyo({ g: G(3, 3), kyoka: 3, ratio: '6:4', gaku: 180 });
  assert.equal(r.kansan, 45);
  assert.equal(r.kansanMax, 75);
  close(r.chosa, 240);
  assert.equal(r.chosaMax, 400);
  close(r.exam.gakuConv, 360);
  close(r.exam.total1000, 600);
});

test('東京: 7:3 と 10:0 の高いほう（北園など）。オール 3・学力 450 → 10:0 の 900 を使う', () => {
  const r = N.tokyo({ g: G(3, 3), ratio: 'best', gaku: 450 });
  close(r.exam.total1000, 810);
  close(r.exam.alt.total1000, 900);
  assert.equal(r.exam.used, 'alt');
  close(r.exam.best1000, 900);
  // 内申が高く学力が低いと 7:3 のほう
  const r2 = N.tokyo({ g: G(5, 5), ratio: 'best', gaku: 300 });
  close(r2.exam.total1000, 720);
  assert.equal(r2.exam.used, 'main');
});

test('東京: 目標 800 点（1000 点満点）に要る学力検査は (800−240)÷1.4＝400 点', () => {
  const r = N.tokyo({ g: G(4, 4), target: 800 });
  close(r.need.raw, 400);
  assert.equal(r.need.over, false);
  assert.equal(N.tokyo({ g: G(1, 1), target: 900 }).need.over, true);   // (900−60)÷1.4＝600 ＞ 500
});

test('評定が 1 つでも欠けていれば null', () => {
  const g = G(4, 4); delete g.gika;
  assert.equal(N.tokyo({ g }), null);
  assert.equal(N.tokyo({ g: { ...G(4, 4), eigo: 6 } }), null);
});

test('神奈川: 中2 オール 3・中3 オール 4 → Ａ 99/135、ａ 73.33（小数第3位を四捨五入）', () => {
  const r = N.kanagawa({ g2: G(3, 3), g3: G(4, 4) });
  assert.equal(r.A, 99);
  assert.equal(r.a, 73.33);
});

test('神奈川: 5:5・学力 350/500 → ｂ 70、Ｓ１＝73.33×5＋70×5＝716.65', () => {
  const r = N.kanagawa({ g2: G(3, 3), g3: G(4, 4), f: 5, gaku: 350 });
  assert.equal(r.exam.b, 70);
  assert.equal(r.exam.S1, 716.65);
  const r2 = N.kanagawa({ g2: G(5, 5), g3: G(5, 5), f: 3, gaku: 500 });
  assert.equal(r2.A, 135); assert.equal(r2.a, 100); assert.equal(r2.exam.S1, 1000);
});

test('神奈川: 比率の既定は 5:5、範囲外は 5:5 に戻す。3 教科（300 点満点）の換算', () => {
  assert.equal(N.kanagawa({ g2: G(3, 3), g3: G(3, 3) }).f, 5);
  assert.equal(N.kanagawa({ g2: G(3, 3), g3: G(3, 3), f: 9 }).f, 5);
  assert.equal(N.kanagawa({ g2: G(3, 3), g3: G(3, 3), gaku: 200, gakuMax: 300 }).exam.b, 66.67);
});

test('兵庫: 5 教科 4・実技 4 → 4×20＋7.5×16＝200/250。学力 350 → 175、素点 375、第4学区の第1志望 +30', () => {
  const r = N.hyogo({ g: G(4, 4), gaku: 350, gakku: '4' });
  assert.equal(r.A, 200);
  assert.equal(r.exam.C, 175);
  assert.equal(r.exam.soten, 375);
  assert.equal(r.kasan, 30);
  assert.equal(r.exam.withKasan, 405);
  assert.equal(N.hyogo({ g: G(5, 5) }).A, 250);
  assert.equal(N.hyogo({ g: G(3, 2) }).A, 3 * 5 * 4 + 2 * 4 * 7.5);   // 60＋60＝120
});

test('兵庫: 第1志望加算点は 1区25・2区20・3区25・4区30・5区30、単独選抜（空）は 0', () => {
  assert.deepEqual(V.PREFS.hyogo.kasan, { 1: 25, 2: 20, 3: 25, 4: 30, 5: 30 });
  assert.equal(N.hyogo({ g: G(4, 4), gakku: '' }).kasan, 0);
});

test('神奈川: 中2は9教科の合計（9〜45）でも入れられる。範囲外は null', () => {
  const r = N.kanagawa({ sum2: '27', g3: G(4, 4), f: 5, gaku: 350 });
  assert.equal(r.A, 99);
  assert.equal(r.exam.S1, 716.65);
  assert.equal(N.kanagawa({ sum2: 46, g3: G(4, 4) }), null);
  assert.equal(N.kanagawa({ sum2: '', g3: G(4, 4) }), null);
});

// ---- 大阪府・埼玉県・千葉県（D126、2026-09-25 追加）。要綱に計算例が無いので、手で計算した例 ----
// 中1の合計 30・中2の合計 32・中3 オール 4（36）を共通の例にする
const Y = { sum1: 30, sum2: 32, g3: G(4, 4) };

test('大阪: 各教科 中3×6＋中2×2＋中1×2（450点満点）→ 30×2＋32×2＋36×6＝340', () => {
  const r = N.osaka({ ...Y, type: '3' });
  assert.equal(r.cho, 340);
  assert.equal(r.choMax, 450);
  assert.equal(N.osaka({ sum1: 45, sum2: 45, g3: G(5, 5) }).cho, 450);   // 1 教科 50 点×9
  assert.equal(N.osaka({ sum1: 9, sum2: 9, g3: G(1, 1) }).cho, 90);
});

test('大阪: タイプⅢ（1.0・1.0）学力 300/450 → 300＋340＝640/900', () => {
  const r = N.osaka({ ...Y, type: '3', gaku: 300 });
  close(r.choConv, 340);
  close(r.exam.gakuConv, 300);
  close(r.exam.total, 640);
});

test('大阪: タイプⅠ は 300×1.4＋340×0.6＝420＋204＝624、タイプⅤ は 180＋476＝656', () => {
  close(N.osaka({ ...Y, type: '1', gaku: 300 }).exam.total, 624);
  close(N.osaka({ ...Y, type: '5', gaku: 300 }).exam.total, 656);
});

test('大阪: タイプごとの満点は表２のとおり（Ⅰ 630/270 … Ⅴ 270/630、どれも 900）', () => {
  const want = { 1: [630, 270], 2: [540, 360], 3: [450, 450], 4: [360, 540], 5: [270, 630] };
  for (const t of V.PREFS.osaka.types) {
    const r = N.osaka({ sum1: 45, sum2: 45, g3: G(5, 5), type: t.id, gaku: 450 });
    close(r.gakuConvMax, want[t.id][0]);
    close(r.choConvMax, want[t.id][1]);
    close(r.exam.total, 900);
  }
});

test('大阪: 目標 700（タイプⅢ）に要る学力検査は 700−340＝360。既定のタイプはⅢ、範囲外の学年合計は null', () => {
  const r = N.osaka({ ...Y, target: 700 });
  assert.equal(r.type.id, '3');
  close(r.need.raw, 360);
  assert.equal(r.need.over, false);
  assert.equal(N.osaka({ ...Y, target: 900 }).need.over, true);   // 560 ＞ 450
  assert.equal(N.osaka({ ...Y, sum1: 8 }), null);
  assert.equal(N.osaka({ ...Y, sum2: '' }), null);
});

test('埼玉: 1:1:2 → 30＋32＋36×2＝134/180、300点に換算 223.33 → 223（小数第1位を四捨五入）', () => {
  const r = N.saitama({ ...Y, ratio: '112', conv: 300 });
  assert.equal(r.base, 134);
  assert.equal(r.baseMax, 180);
  close(r.choExact, 223.3333333333);
  assert.equal(r.cho, 223);
});

test('埼玉: 1:1:3・400点 → 170/225 → 302.22 → 302。1:1:1・200点 → 98/135 → 145.19 → 145', () => {
  assert.equal(N.saitama({ ...Y, ratio: '113', conv: 400 }).cho, 302);
  assert.equal(N.saitama({ ...Y, ratio: '111', conv: 200 }).cho, 145);
  assert.equal(N.saitama({ sum1: 45, sum2: 45, g3: G(5, 5), ratio: '113', conv: 400 }).cho, 400);
});

test('埼玉: 学力 350＋調査書 223＋面接 24（1倍）＝597。満点は 500＋300＋30＝830（朝霞の第1次と同じ）', () => {
  const r = N.saitama({ ...Y, ratio: '112', conv: 300, mmul: 1, mensetsu: 24, gaku: 350 });
  assert.equal(r.exam.total, 597);
  assert.equal(r.totalMax, 830);
  // 面接を入れなければ足さない。2倍なら満点 60 で、上尾鷹の台の第1次（200・60）は 760
  assert.equal(N.saitama({ ...Y, gaku: 350 }).exam.total, 573);
  assert.equal(N.saitama({ ...Y, conv: 200, mmul: 2 }).totalMax, 760);
  assert.equal(N.saitama({ ...Y, mmul: 1, mensetsu: 31 }).mensetsu, null);   // 30 点を超える
});

test('埼玉: 既定は 1:1:2・300点・面接1倍。目標 600 に要る学力検査は 600−223＝377', () => {
  const r = N.saitama({ ...Y, target: 600 });
  assert.equal(r.ratio.id, '112');
  assert.equal(r.conv, 300);
  assert.equal(r.mmul, 1);
  assert.equal(r.need.raw, 377);
});

test('千葉: 9教科×3学年の合計 98/135 × Ｋ。Ｋ＝1 → 98、0.5 → 49、2 → 196。学力 350 で 448', () => {
  const r = N.chiba({ ...Y, gaku: 350 });
  assert.equal(r.sum, 98);
  assert.equal(r.k, 1);
  assert.equal(r.cho, 98);
  assert.equal(r.exam.total, 448);
  assert.equal(N.chiba({ ...Y, k: 0.5 }).cho, 49);
  assert.equal(N.chiba({ ...Y, k: 2 }).cho, 196);
  assert.equal(N.chiba({ ...Y, k: 2 }).choMax, 270);
  assert.equal(N.chiba({ ...Y, k: 3 }).k, 1);   // 0.5〜2 の外は原則の 1
});

test('千葉: 目標 450 に要る学力検査は 450−98＝352、700 は 500 点を超える', () => {
  assert.equal(N.chiba({ ...Y, target: 450 }).need.raw, 352);
  assert.equal(N.chiba({ ...Y, target: 700 }).need.over, true);
});

test('calc: 府県の id で振り分ける', () => {
  assert.equal(N.calc('osaka', Y).pref, 'osaka');
  assert.equal(N.calc('saitama', Y).pref, 'saitama');
  assert.equal(N.calc('chiba', Y).pref, 'chiba');
  assert.equal(N.calc('tokyo', { g: G(4, 4) }).pref, 'tokyo');
});
