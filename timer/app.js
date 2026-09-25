// ===========================
// 宿題タイマー — 画面の制御。計算（表示・段取り・音の設計図）は ../lib/timer.js
// 時間は壁時計（Date.now）で数える: タブを切り替えたり画面が消えたりしても、戻ったときに正しい残りを出す
// ===========================
(function () {
  'use strict';
  var T = window.GakkoTimer, C = window.GakkoCommon;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'timer';
  var TITLE = document.title;

  var s = T.normalize(C.store.get(KEY, {}));
  var steps = T.plan(s);
  // 動いているかどうか: idle（まだ）・running・paused・done
  var mode = 'idle', acc = 0, t0 = 0, lastIndex = 0, tickId = null;

  // --- 分のボタン ---
  T.PRESETS.forEach(function (m) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = String(m); b.dataset.min = m; b.setAttribute('aria-label', m + '分');
    b.addEventListener('click', function () { setMinutes(m); });
    $('chips').appendChild(b);
  });
  function setMinutes(m) {
    if (mode === 'running') return;
    s.minutes = T.normalize({ minutes: m }).minutes;
    resetRun();
    save(); render();
  }
  $('minus').addEventListener('click', function () { setMinutes(s.minutes - 1); });
  $('plus').addEventListener('click', function () { setMinutes(s.minutes + 1); });

  // --- 音（Web Audio で合成。音のファイルは読まない） ---
  var ctx = null;
  function audio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }
  function play(kind) {
    var vol = T.VOLUMES[s.volume];
    if (!vol) return;
    var a = audio();
    if (!a) return;
    var now = a.currentTime + 0.05;
    T.melody(kind).forEach(function (n) {
      var o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(n.f, now + n.t);
      g.gain.setValueAtTime(0.0001, now + n.t);
      g.gain.linearRampToValueAtTime(vol, now + n.t + 0.02);            // ぷつっと鳴らないように少しずつ上げて
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);    // 鐘のように消える
      o.connect(g); g.connect(a.destination);
      o.start(now + n.t); o.stop(now + n.t + n.d + 0.05);
    });
  }
  $('try-sound').addEventListener('click', function () {
    if (!T.VOLUMES[s.volume]) { $('t-status').textContent = '「鳴らさない」になっています。'; return; }
    play('end');
  });

  // --- 画面を消さない（Screen Wake Lock。対応していないブラウザでは何もしない） ---
  var lock = null;
  var canWake = 'wakeLock' in navigator;
  function wakeOn() {
    if (!canWake || !s.wake || mode !== 'running' || lock) return;
    navigator.wakeLock.request('screen').then(function (l) {
      if (mode !== 'running' || !s.wake) { l.release().catch(function () {}); return; }
      lock = l;
      l.addEventListener('release', function () { if (lock === l) lock = null; });
    }, function () { /* 電池の節約モードなどで断られても続ける */ });
  }
  function wakeOff() { if (lock) { lock.release().catch(function () {}); lock = null; } }
  document.addEventListener('visibilitychange', function () {
    // 画面を離れるとロックは外れるので、戻ったらかけ直す。時間も戻った時点で数え直す
    if (document.visibilityState === 'visible') { wakeOn(); tick(); }
  });

  // --- 動かす ---
  function elapsed() { return acc + (mode === 'running' ? Date.now() - t0 : 0); }
  function resetRun() {
    mode = 'idle'; acc = 0; lastIndex = 0;
    steps = T.plan(s);
    stopTick(); wakeOff();
    $('t-status').textContent = '';
  }
  function startTick() { if (!tickId) tickId = setInterval(tick, 250); }
  function stopTick() { if (tickId) { clearInterval(tickId); tickId = null; } }

  $('start').addEventListener('click', function () {
    audio();   // ボタンを押した時点で音の準備をする（iPhone などは操作のあとでないと鳴らせない）
    if (mode === 'running') {
      acc = elapsed(); mode = 'paused'; stopTick(); wakeOff();
      $('t-status').textContent = 'とまっています';
    } else {
      if (mode === 'done') resetRun();
      if (mode === 'idle') steps = T.plan(s);
      t0 = Date.now(); mode = 'running'; startTick(); wakeOn();
      $('t-status').textContent = '';
    }
    render();
  });
  $('reset').addEventListener('click', function () { resetRun(); render(); });

  function tick() {
    if (mode !== 'running') return;
    var p = T.at(steps, elapsed());
    if (p.index !== lastIndex) {
      lastIndex = p.index;
      if (p.done) {
        mode = 'done'; acc = T.totalSec(steps) * 1000; stopTick(); wakeOff();
        play('end');
        $('t-status').textContent = 'おわり！ よくがんばりました';
      } else {
        play(p.kind);   // やすみに入る・べんきょうにもどる
        $('t-status').textContent = p.kind === 'rest' ? 'やすみです' : 'べんきょうにもどります';
      }
    }
    render();
  }

  // --- 描く ---
  function piePath(f) {
    // 12 時から時計まわりに、残りの割合だけ扇形を描く（残りが減ると扇が小さくなる）
    if (f <= 0) return '';
    if (f >= 0.9999) return 'M100,4 A96,96 0 1,1 99.99,4 Z';
    var a = 2 * Math.PI * f;
    var x = 100 + 96 * Math.sin(a), y = 100 - 96 * Math.cos(a);
    return 'M100,100 L100,4 A96,96 0 ' + (f > 0.5 ? 1 : 0) + ',1 ' + x.toFixed(2) + ',' + y.toFixed(2) + ' Z';
  }
  function render() {
    var p = T.at(steps, elapsed());
    var remain = mode === 'idle' ? steps[0].sec * 1000 : p.remainMs;
    var f = mode === 'idle' ? 1 : p.done ? 0 : T.fraction(p.remainMs, p.stepMs);
    var main = $('t-main');
    main.classList.toggle('is-running', mode === 'running');
    main.classList.toggle('is-done', mode === 'done');
    main.classList.toggle('is-rest', !p.done && mode !== 'idle' && p.kind === 'rest');
    var txt = mode === 'done' ? 'おわり' : T.format(remain / 1000);
    $('t-time').textContent = txt;
    $('t-time').classList.toggle('is-long', txt.length > 5);
    $('pie').setAttribute('d', piePath(f));
    $('bar-fill').style.transform = 'scaleX(' + f.toFixed(4) + ')';
    $('dial').classList.toggle('is-bar', s.shape === 'bar');
    $('dial-svg').style.display = s.shape === 'bar' ? 'none' : '';
    $('bar').hidden = s.shape !== 'bar';
    $('t-what').textContent = !p.done && mode !== 'idle' && p.kind === 'rest' ? 'やすみ' : (s.label || '');
    $('t-phase').textContent = s.repeat
      ? (mode === 'idle' ? s.minutes + '分＋やすみ' + s.restMin + '分 × ' + s.rounds + '回' : (p.done ? s.rounds : p.round) + '回目 / ' + s.rounds + '回')
      : '';
    $('start').textContent = mode === 'running' ? 'とめる' : mode === 'paused' ? 'つづける' : mode === 'done' ? 'もういちど' : 'スタート';
    $('t-min').textContent = s.minutes + '分';
    Array.prototype.forEach.call($('chips').children, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.min) === s.minutes));
      b.disabled = mode === 'running';
    });
    $('minus').disabled = $('plus').disabled = mode === 'running';
    document.title = mode === 'running' || mode === 'paused' ? txt + ' ' + TITLE : TITLE;
  }

  // --- せってい ---
  function current() { return JSON.parse(JSON.stringify(s)); }
  function apply(d) {
    s = T.normalize(d);
    $('label').value = s.label;
    document.querySelectorAll('input[name="shape"]').forEach(function (r) { r.checked = r.value === s.shape; });
    document.querySelectorAll('input[name="volume"]').forEach(function (r) { r.checked = r.value === s.volume; });
    $('repeat').checked = s.repeat;
    $('restMin').value = String(s.restMin);
    $('rounds').value = String(s.rounds);
    $('wake').checked = s.wake;
    resetRun();
  }
  function readSettings() {
    var sh = document.querySelector('input[name="shape"]:checked'), vo = document.querySelector('input[name="volume"]:checked');
    var before = JSON.stringify(T.plan(s));
    s = T.normalize({
      minutes: s.minutes, label: $('label').value, shape: sh ? sh.value : s.shape, volume: vo ? vo.value : s.volume,
      repeat: $('repeat').checked, restMin: $('restMin').value, rounds: $('rounds').value, wake: $('wake').checked,
    });
    // 段取りが変わったら（くり返し・やすみ・回数）最初から。見た目・音・名前だけならそのまま続ける
    if (JSON.stringify(T.plan(s)) !== before) resetRun();
    if (!s.wake) wakeOff(); else wakeOn();
  }
  function save() { C.store.set(KEY, s); }
  function update() {
    $('repeat-box').hidden = !s.repeat;
    var vl = { off: '鳴らさない', low: 'ちいさめ', mid: 'ふつう', high: 'おおきめ' }[s.volume];
    window.YorozuScreen.detailsSummary({
      'd-set': '音 ' + vl + (s.repeat ? '・くり返し ' + s.rounds + '回' : '') + (s.shape === 'bar' ? '・棒' : ''),
    });
    save(); render();
  }
  $('d-set').addEventListener('input', function (e) { if (e.target.type !== 'file') { readSettings(); update(); } });
  $('d-set').addEventListener('change', function (e) {
    if (e.target.type === 'file') return;
    readSettings();
    // 数の欄は入れ終わったら正規化した値を見せる（空や範囲外のまま残さない）
    if (e.target.id === 'restMin' || e.target.id === 'rounds') { $('restMin').value = String(s.restMin); $('rounds').value = String(s.rounds); }
    update();
  });

  if (canWake) $('wake-note').textContent = '';
  else { $('wake').disabled = true; $('wake-note').textContent = 'このブラウザは対応していません。端末の自動ロックの時間を長くしてください。'; }

  apply(s);
  C.wireFile({ key: KEY, current: current, apply: apply, update: update, msg: $('file-msg') });
  update();
})();
