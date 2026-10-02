# 都道府県別の内申点の計算式のデータ（CC0）

[内申点の計算](https://yorozu-craft.com/gakko-keisan/naishin/)が使っている式と値（公立高校の入学者選抜の要綱から）を、ほかの道具で使える形で置いています。

| ファイル | URL | 中身 |
|---------|-----|------|
| `naishin.json` | https://yorozu-craft.com/gakko-keisan/data/naishin.json | 東京都・神奈川県・兵庫県・大阪府・埼玉県・千葉県の式（`formula`）、値（`params`）、出典（`sources`）、計算例（`example`） |

## ライセンス

このフォルダのデータ（`naishin.json`）は **CC0 1.0**（パブリック・ドメイン提供）です。全文は `LICENSE`。表示の義務はありませんが、使うときに次のように書いてもらえると、どこで使われているかが分かって助かります。

```
出典: 内申点の計算（yorozu-craft） https://yorozu-craft.com/gakko-keisan/naishin/
```

このリポジトリのコード（`lib/`・`tools/` など）は MIT License（リポジトリ直下の `LICENSE`）のままです。

## 項目（naishin.json）

| 項目 | 意味 |
|------|------|
| `license` | `CC0-1.0` |
| `checked` | 要綱の原文を最後に確かめた日（YYYY-MM-DD） |
| `generated` | このファイルの中身が変わった日（YYYY-MM-DD）。中身が同じなら書き出し直しても変わらない |
| `source` | 使った出典の URL の一覧（府県ごとの出典は `prefs[].sources`） |
| `prefs[].year` | どの年度の入学者選抜か |
| `prefs[].formula` | 式を 1 行で |
| `prefs[].params` | 式の値（倍率・満点・比率の選択肢・既定値・加算点など）。名前は `lib/naishin-values.js` と同じ |
| `prefs[].sources` | 出典（`name`・`url`・`note` は該当箇所・`checked`） |
| `prefs[].example.result` | `example_input`（9 教科すべて評定 4、中1・中2 の 9 教科の合計 36、学力検査 300 点、選択肢は既定）を `lib/naishin.js` で計算した結果。自分の実装の確かめに使える |
| `subjects` | 教科の並び（`main5` は学力検査のある 5 教科） |
| `others` | 対応していない府県の要綱のページ |

## 注意

- 値は `checked` の日に各府県の要綱の原文で確かめたものです。要綱は毎年 9 月ごろ次の年度の分が出ます。
- 学校ごとに違う比率・倍率・加点（神奈川の ｆ:ｇ、埼玉の学年の比率と換算、千葉のＫ、大阪のタイプ、東京の 10:0 と比べる学校）は、要綱と各校の資料で確かめてください。
- 大阪府は令和9年度の実施要項が 2026-09-25 時点で未公表のため、府の選抜方針と「選抜の方法」で作っています（`prefs[].basis`）。

## 作り方（保守）

`data/` のファイルは手で直しません。式と値は `lib/naishin-values.js` にだけ書き、次で書き出します。テスト（`tests/data.test.js`）が、書き出した結果とファイルが同じか、`formula` の数字が `params` と食い違っていないかを確かめます。

```
node tools/build-data.mjs
```
