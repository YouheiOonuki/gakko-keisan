// 公開データ（CC0）の書き出し: lib/naishin-values.js から data/naishin.json を作る（yorozu-plans ROADMAP 7.10.3 e）
//   node tools/build-data.mjs          書き出す
//   node tools/build-data.mjs --check  書き出した結果とファイルが違えば終了コード 1（テストと同じ確認）
// data/ のファイルは手で直さない。値と式は lib/naishin-values.js にだけ書き、これを走らせる。
// 計算例（example）は lib/naishin.js で計算したもの（手で書かない）
// generated（生成日。ACCEPTANCE 7.10.3 e）: 中身（generated を除く）が今のファイルと同じなら、今のファイルの generated をそのまま使う。
//   中身が変わったときだけ、その日（日本時間。環境変数 GENERATED=YYYY-MM-DD で指定もできる）になる（seido-keisan の tools/build-data.mjs と同じ決まり）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = require(join(root, 'lib/naishin-values.js'));
const N = require(join(root, 'lib/naishin.js'));

const DATA_URL = 'https://yorozu-craft.com/gakko-keisan/data/';

// 計算例の入力: 9 教科すべて 4、中1・中2 の 9 教科の合計 36、学力検査の合計 300 点。選択肢は画面の既定
export function exampleInput() {
  const g = Object.fromEntries(V.SUBJECTS.map(s => [s.id, 4]));
  return { g, g2: g, g3: g, sum1: 36, sum2: 36, gaku: 300 };
}

// 浮動小数の誤差（0.30000000000000004 など）を出さない
const tidy = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e6) / 1e6 : v);

// 値の項目（名前・年度・式・出典・確認日を除いた残り）
const META = new Set(['name', 'year', 'basis', 'formula', 'sources', 'checked']);

// 日本時間の今日（YYYY-MM-DD）。GENERATED があればそれ
export function today() {
  const g = process.env.GENERATED;
  if (g && /^\d{4}-\d{2}-\d{2}$/.test(g)) return g;
  return new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
}

// 使った出典の URL（重複なし、府県の順）。ACCEPTANCE 7.10.3 e の source
export function sourceUrls() {
  return [...new Set(Object.values(V.PREFS).flatMap(p => p.sources.map(s => s.url)))];
}

export function buildJson(generated = today()) {
  const input = exampleInput();
  const prefs = Object.entries(V.PREFS).map(([key, p]) => {
    const params = Object.fromEntries(Object.entries(p).filter(([k]) => !META.has(k)));
    const result = N.calc(key, input);
    return {
      key,
      name: p.name,
      year: p.year,
      ...(p.basis ? { basis: p.basis } : {}),
      formula: p.formula,
      params,
      example: { result },
      sources: p.sources.map(s => ({ name: s.name, url: s.url, note: s.note, checked: p.checked })),
      checked: p.checked,
    };
  });
  const data = {
    title: '都道府県別の内申点（調査書点）の計算式（公立高校の入学者選抜）',
    license: 'CC0-1.0',
    license_url: 'https://creativecommons.org/publicdomain/zero/1.0/deed.ja',
    publisher: 'yorozu-craft（Youhei Oonuki）',
    homepage: 'https://yorozu-craft.com/gakko-keisan/naishin/',
    data_url: DATA_URL + 'naishin.json',
    repository: 'https://github.com/YouheiOonuki/gakko-keisan',
    generated_from: 'lib/naishin-values.js（式と値）・lib/naishin.js（計算例）を tools/build-data.mjs で書き出し',
    checked: V.CHECKED,
    generated,
    source: sourceUrls(),
    note: '値は各府県の要綱の原文（sources）で checked の日に確かめたもの。学校ごとの比率・倍率・加点は要綱と各校の資料で確かめること。example は 9 教科すべて評定 4、中1・中2 の合計 36、学力検査 300 点、選択肢は既定で計算した例。',
    subjects: V.SUBJECTS,
    example_input: input,
    prefs,
    others: V.OTHERS,
  };
  return JSON.stringify(data, tidy, 2) + '\n';
}

// 今のファイルの generated（無ければ null）
export function generatedOf(text) {
  const m = text && text.match(/"generated": "(\d{4}-\d{2}-\d{2})"/);
  return m ? m[1] : null;
}

// 中身が同じなら今の generated を残し、変わったときだけ今日にする
export function stamp(build, now) {
  const prev = generatedOf(now);
  if (prev && build(prev) === now) return now;
  return build(today());
}

const read = rel => { const f = join(root, rel); return existsSync(f) ? readFileSync(f, 'utf8') : null; };
export function outputs() {
  return { 'data/naishin.json': stamp(buildJson, read('data/naishin.json')) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const [rel, body] of Object.entries(outputs())) {
    const file = join(root, rel);
    const now = existsSync(file) ? readFileSync(file, 'utf8') : null;
    if (now === body) { console.log(rel + ': 変更なし'); continue; }
    if (check) { console.error(rel + ' が lib/naishin-values.js と合っていない。node tools/build-data.mjs を実行する'); bad++; }
    else { writeFileSync(file, body); console.log(rel + ' を書き出した'); }
  }
  if (bad) process.exit(1);
}
