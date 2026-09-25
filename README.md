# 学校の計算機

公開 URL: **https://yorozu-craft.com/gakko-keisan/**

内申点・偏差値・出席日数（あと何回休めるか）の計算。1 リポジトリに複数のページ（seido-keisan と同じ形）。
yorozu-craft のツールの1つです（共通ルールは [youheioonuki.github.io の README](https://github.com/YouheiOonuki/youheioonuki.github.io) を参照）。企画書は yorozu-plans の `docs/28_学校の計算.md`。

## ページ

| URL | 内容 |
|-----|------|
| `/gakko-keisan/` | 一覧（ハブ） |
| `/gakko-keisan/naishin/` | 内申点: 都立の換算内申（65・75 点）と調査書点、学力検査・ESAT-J を入れると総合得点（1020 点）。神奈川県（中2＋中3×2＝135 点、Ｓ１）、兵庫県（250 点、素点 500 点、第1志望加算点）、埼玉県（共通選抜。学年の比率 1:1:1〜1:1:3 を 200〜400 点に換算）、千葉県（3 学年の合計 135 点×Ｋ）、大阪府（中1×2＋中2×2＋中3×6＝450 点、タイプⅠ〜Ⅴ、900 点）。目標点から要る学力検査の点数 |
| `/gakko-keisan/hensachi/` | 偏差値: 点数・平均・標準偏差 → 偏差値、上位の割合・順位の目安（正規分布の仮定）、全員の点数から平均・標準偏差、順位と人数から偏差値の目安、5 教科の表 |
| `/gakko-keisan/shusseki/` | 出席日数・欠課時数: 学校の決まりの割合（3分の2・4分の3・8割・自分で入れる%）で、休める上限と残り。単位数×35、欠席に数えない回数、科目ごとの一覧 |
| `/gakko-keisan/timer/` | 宿題タイマー（子ども向け）: 残り時間が円か棒で減る、おわったら Web Audio で合成した小さな音（消せる）、べんきょう→やすみのくり返し、Screen Wake Lock で画面を消さない。画面は AdSense の meta だけ（広告は `guide.html`） |
| `/gakko-keisan/atonannichi/` | ○○まであと何日: 夏休み・誕生日（毎年）・期間の残り、ぬりつぶすカウントダウン表（A4 縦、日曜はじまり、366 日まで）。夏休みの日付の既定は持たない（利用者が入れる）。画面は AdSense の meta だけ。紙のクレジットの着地は `/gakko-keisan/print/`（noindex、sitemap に載せない） |

入力内容はこの端末のブラウザ（`gakko-keisan_naishin`・`gakko-keisan_hensachi`・`gakko-keisan_shusseki`・`gakko-keisan_timer`・`gakko-keisan_atonannichi`）にだけ保存し、外部には送信しない。書き出しファイルは `gakko-keisan-backup-YYYYMMDD.json`（`data` のキーはページ名）。

## 計算の仕様・根拠

- 内申点の値（教科・倍率・満点・比率・ESAT-J の点数化・加算点）と出典は `lib/naishin-values.js`（`CHECKED`）。令和9年度（2027 年 4 月入学）の要綱: 東京都（2026-09-17 公表）・神奈川県（2026-07-01 更新）・兵庫県（2026-09-03 掲載）・埼玉県（2026-07-31 掲載）・千葉県（2026-09-11）。大阪府は実施要項が未公表（例年 10 月）のため、令和9年度の選抜方針・選抜の方法・倍率のタイプ（2026-09-16 更新のページ）で作った。実施要項が出たら突き合わせる
- 1 単位＝35 単位時間（学習指導要領）と出典は `lib/shusseki-values.js`（`CHECKED`）。出席の割合は法令の値ではない（学校の教務規程）ので値として持たず、画面で選ぶ
- 偏差値は式だけ（外部の値なし）。順位の目安は正規分布の仮定（`lib/hensachi.js`）

## 保守

| 時期 | 確認すること | 直す場所 |
|------|------------|---------|
| 毎年 9 月ごろ | 東京都・神奈川県・埼玉県・千葉県・大阪府・兵庫県の次の年度の入学者選抜の要綱（比率、7:3 と 10:0 の学校、ESAT-J、加算点、埼玉の学年の比率と換算、千葉のＫ、大阪のタイプ。大阪の実施要項は 10 月ごろ） | `lib/naishin-values.js`（`year`・`CHECKED`・`ratios`・`bestSchools`・`kasan`・出典の URL）、`tests/naishin.test.js`、`naishin/guide.html` |
| 学習指導要領の改訂時 | 1 単位＝35 単位時間 | `lib/shusseki-values.js` |

値や計算を直したら、各ページの `guide.html` の「更新履歴」に日付と内容を 1 行足す。

## ファイル

| ファイル | 役割 |
|---------|------|
| `index.html` | 一覧（ハブ） |
| `naishin/`・`hensachi/`・`shusseki/`・`timer/`・`atonannichi/` | 各ページ（`index.html` 画面、`guide.html` 使い方、`app.js` 画面の制御。timer・atonannichi はページだけの CSS も） |
| `print/` | 印刷した表のクレジットから来た人の着地ページ（noindex） |
| `lib/naishin.js`・`lib/hensachi.js`・`lib/shusseki.js`・`lib/timer.js`・`lib/atonannichi.js` | 計算（画面から切り離した純粋関数） |
| `lib/naishin-values.js`・`lib/shusseki-values.js`・`lib/atonannichi-values.js` | 時点のある値（値・出典・確認日） |
| `lib/common.js` | 保存・共有リンク・バックアップファイル |
| `lib/screen.js` | 画面の部品（上端の固定バー、`details` の `summary` の状態表示） |
| `style.css` | 見た目（和紙風の配色、ダークモード対応） |
| `404.html` | ツール配下の存在しない URL で出るページ（サイト共通のもの） |
| `favicon.svg` / `apple-touch-icon.png` / `og-image.png` | アイコン / ホーム画面用アイコン / SNS 共有用画像（1200×630） |
| `sitemap.xml` | サイトマップ（robots.txt はドメイン直下で管理） |
| `tests/*.test.js` | テスト（`node --test tests/*.test.js`。`.github/workflows/test.yml` で push・PR のたびに自動実行） |

## ライセンス

MIT License（`LICENSE`）。
