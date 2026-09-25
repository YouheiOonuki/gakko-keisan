// ===========================
// 内申点の計算（naishin）で使う、入試の要綱の値。値・出典・確認日をここにだけ書く
// 令和9年度（2027年4月入学）の入学者選抜。毎年 9 月ごろ次の年度の要綱が出たら見直す（README の「保守」）
// ブラウザでは window.NaishinValues、Node（テスト）では module.exports
// ===========================
(function (root) {
  'use strict';

  // この日に下の出典（要綱の原文 PDF）を開いて値を確かめた。画面はここから 12 か月たつと注意を出す
  var CHECKED = '2026-09-25';

  // 教科の並び（画面の行の順）。main5 は学力検査のある 5 教科、jitsugi は実技 4 教科
  var SUBJECTS = [
    { id: 'kokugo', name: '国語', main5: true },
    { id: 'shakai', name: '社会', main5: true },
    { id: 'sugaku', name: '数学', main5: true },
    { id: 'rika', name: '理科', main5: true },
    { id: 'eigo', name: '英語', main5: true },
    { id: 'ongaku', name: '音楽', main5: false },
    { id: 'bijutsu', name: '美術', main5: false },
    { id: 'hotai', name: '保健体育', main5: false },
    { id: 'gika', name: '技術・家庭', main5: false },
  ];

  var PREFS = {
    // 東京都立高校（学力検査に基づく選抜。第一次募集・分割前期募集が中心）
    tokyo: {
      name: '東京都（都立高校）',
      year: '令和9年度（2027年4月入学）',
      // 学力検査をする教科は評定×1、しない教科は評定×2（要綱 第2-10-1(6)）。5 教科なら 65 点、3 教科（国数英）なら 75 点（別表4）
      kyoka3: ['kokugo', 'sugaku', 'eigo'],
      total: 1000,        // 学力検査の得点と調査書点の合計の満点（第2-10-1(2)）
      esatMax: 20,        // スピーキングテスト（ESAT-J YEAR 3）を点数化した満点。総合得点は 1020 点
      esat: { A: 20, B: 16, C: 12, D: 8, E: 4, F: 0 },   // 第2-10-1(3)ア
      // 学力検査：調査書の比率。全日制は原則 7:3、芸術・体育の学科は 6:4（第2-10-1(2)ア）。
      // 受検者ごとに 7:3 と 10:0 で計算して高いほうを使う学校（別表4 の注）: 北園・武蔵野北・深沢（令和9年度）
      ratios: [
        { id: '7:3', gaku: 7, cho: 3, label: '7:3（全日制の原則）' },
        { id: '6:4', gaku: 6, cho: 4, label: '6:4（芸術・体育の学科、第二次募集など）' },
        { id: 'best', gaku: 7, cho: 3, alt: { gaku: 10, cho: 0 }, label: '7:3 と 10:0 の高いほう（北園・武蔵野北・深沢の第一次募集）' },
        { id: 'best64', gaku: 6, cho: 4, alt: { gaku: 10, cho: 0 }, label: '6:4 と 10:0 の高いほう（同じ 3 校の第二次募集）' },
      ],
      bestSchools: ['北園', '武蔵野北', '深沢'],
      sources: [
        { name: '令和９年度東京都立高等学校入学者選抜実施要綱・同細目について（東京都教育委員会、2026年9月17日）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/information/press/2026/09/2026091703', note: '実施要綱 第2-10-1 選考（1000 点・1020 点、7:3、ESAT-J の点数化、評定の1倍・2倍）、第4-3-1(5) 第3学年の評定' },
        { name: '別表4 令和９年度入学者選抜実施方法一覧（PDF）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/documents/d/kyoiku/20260916_r9_09', note: '評定の満点は 5 教科 65 点・3 教科 75 点、調査書点＝評定の得点×調査書点の満点÷評定の満点' },
        { name: '別表4（1）普通教育を主とする学科（PDF）', url: 'https://www.kyoiku.metro.tokyo.lg.jp/documents/d/kyoiku/20260916_r9_10', note: '北園・武蔵野北の 7:3（第二次募集は 6:4）と 10:0 の高いほう。深沢は別表4（2）の注' },
      ],
      checked: CHECKED,
    },
    // 神奈川県公立高校（共通選抜の第1次選考）
    kanagawa: {
      name: '神奈川県（公立高校）',
      year: '令和9年度（2027年4月入学）',
      // Ａ＝中2の9教科の評定の合計＋中3の9教科の評定の合計×2（135 点満点）。100 点満点に換算して小数第3位を四捨五入
      // Ｓ１＝ａ×ｆ＋ｂ×ｇ（ｆ＋ｇ＝10、ｆ・ｇは2以上の整数）。特色検査をする学校は＋ｄ×ｉ
      aMax: 135,
      fChoices: [2, 3, 4, 5, 6, 7, 8],
      fDefault: 5,   // 全日制の共通選抜で最も多い 5:5（選考基準の表を数えた。2026-09-25）
      sources: [
        { name: '令和9年度神奈川県公立高等学校の入学者の募集及び選抜実施要領（神奈川県教育委員会、2026年7月1日更新）', url: 'https://www.pref.kanagawa.jp/docs/dc4/nyusen/nyusen/jishiyoryo.html', note: '「1 一般募集」6(2)ア(ｱ)〜(ｴ): Ａ・Ｂ・Ｃ・Ｄ、100 点満点への換算（小数第3位を四捨五入）、Ｓ１・Ｓ２' },
        { name: '（注釈）令和9年度調査書作成上の注意（PDF）', url: 'https://www.pref.kanagawa.jp/documents/63604/14_chuui1.pdf', note: '第3学年の評定は第2学期までのもの' },
        { name: '令和9年度神奈川県公立高等学校入学者選抜選考基準及び特色検査の概要', url: 'https://www.pref.kanagawa.jp/docs/dc4/nyusen/nyusen/senko_kijun.html', note: '学校ごとの比率（ｆ:ｇ）と重点化' },
      ],
      checked: CHECKED,
    },
    // 兵庫県公立高校（学力検査による一般入学者選抜。単独選抜・複数志願選抜）
    hyogo: {
      name: '兵庫県（公立高校）',
      year: '令和9年度（2027年4月入学）',
      // 判定資料（Ａ）＝中3の5教科の評定の和×4＋実技4教科の評定の和×7.5（250 点満点）
      // 判定資料（Ｃ）＝学力検査（500 点満点）×0.5。ＡとＣを同等に扱う（素点 500 点）
      mainMul: 4,
      jitsugiMul: 7.5,
      aMax: 250,
      cMul: 0.5,
      // 複数志願選抜の第1志望加算点（学区ごと。第12318項(3)）
      kasan: { '1': 25, '2': 20, '3': 25, '4': 30, '5': 30 },
      sources: [
        { name: '令和９年度兵庫県公立高等学校入学者選抜要綱（兵庫県教育委員会、2026年9月3日掲載）', url: 'https://www2.hyogo-c.ed.jp/hpe/koko/nyuushi/senbatsuyoukou_r9/', note: '第12210項（単独選抜の判定資料Ａ・Ｃ）、第12318項（複数志願選抜の素点と第1志望加算点）' },
      ],
      checked: CHECKED,
    },
  };

  // 対応していない府県（公式の要綱のページ。2026-09-25 に開けることを確かめた）
  var OTHERS = [
    { name: '大阪府', url: 'https://www.pref.osaka.lg.jp/o180040/kotogakko/gakuji-g3/r09_senbatsu.html' },
    { name: '埼玉県', url: 'https://www.pref.saitama.lg.jp/f2208/nyushi/r9nyushijyoho.html' },
    { name: '千葉県', url: 'https://www.pref.chiba.lg.jp/kyouiku/shidou/nyuushi/koukou/index.html' },
    { name: '愛知県', url: 'https://www.pref.aichi.jp/soshiki/kotogakko/0000027366.html' },
  ];

  var V = { CHECKED: CHECKED, SUBJECTS: SUBJECTS, PREFS: PREFS, OTHERS: OTHERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = V;
  else root.NaishinValues = V;
})(this);
