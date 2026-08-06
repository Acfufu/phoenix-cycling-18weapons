/* =========================================================
   War.Audio · 程序化国风音频（零音频文件）
   五声音阶 宫商角徵羽 氛围乐 + 大鼓 / 锣 + 全合成音效
   首次用户手势时 init() 解锁 AudioContext
   ========================================================= */
War.Audio = (function () {
  var ctx = null, master, musicBus, sfxBus;
  var noiseBuf = null;
  var enabled = true;
  var musicPlaying = false;
  var musicTimer = 0;
  var nextMelodyAt = 0, nextDrumAt = 0;
  var melodyIdx = 0;

  // 宫商角徵羽（以 C 调为基础的雅乐音阶，含变徵/变宫点缀）
  var SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 493.88, 523.25, 587.33, 622.25, 659.25];
  var DRUM_INTERVAL = 0.9;

  function init() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(master);
      var len = Math.floor(ctx.sampleRate * 1.2);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setEnabled(b) { enabled = b; }
  function isEnabled() { return enabled; }

  // ---------- 基础合成器 ----------
  function tone(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0);
    var osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f || 440, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.dur || 0.2));
    var g = ctx.createGain();
    var dur = o.dur || 0.2;
    var vol = o.vol == null ? 0.15 : o.vol;
    var atk = o.attack == null ? 0.008 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    var dest = o.bus || sfxBus;
    g.connect(dest);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
    return osc;
  }

  function noise(o) {
    if (!ctx) return;
    var t0 = ctx.currentTime + (o.t || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var filt = ctx.createBiquadFilter();
    filt.type = o.type || 'bandpass';
    filt.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) filt.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.dur || 0.2));
    filt.Q.value = o.Q == null ? 1 : o.Q;
    var g = ctx.createGain();
    var dur = o.dur || 0.2, vol = o.vol == null ? 0.2 : o.vol;
    var atk = o.attack == null ? 0.01 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g);
    var dest = o.bus || sfxBus;
    g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  function pluck(f, t, vol, bus) { tone({ type: 'triangle', f: f, dur: 0.28, vol: vol == null ? 0.12 : vol, attack: 0.003, t: t, bus: bus }); }

  // ---------- 音效库 ----------
  function sfx(name, o) {
    o = o || {};
    if (!ctx || !enabled) return;
    var v = o.vol == null ? 1 : o.vol;
    var p = o.pitch == null ? 1 : o.pitch;
    var t = o.t || 0;
    switch (name) {
      case 'swing': // 挥砍风声
        noise({ dur: 0.12, vol: 0.18 * v, f: 700 * p, f2: 2400 * p, Q: 0.8, t: t });
        break;
      case 'swingHeavy':
        noise({ dur: 0.22, vol: 0.3 * v, f: 400 * p, f2: 2000 * p, Q: 0.9, t: t });
        tone({ type: 'sine', f: 180 * p, f2: 90, dur: 0.18, vol: 0.1 * v, t: t });
        break;
      case 'slash':
        noise({ dur: 0.09, vol: 0.15 * v, f: 1800 * p, f2: 3600 * p, Q: 2, t: t });
        break;
      case 'hit': // 金属命中
        tone({ type: 'square', f: 320 * p, f2: 140, dur: 0.07, vol: 0.12 * v, t: t });
        noise({ dur: 0.06, vol: 0.2 * v, f: 2600 * p, Q: 1.4, t: t });
        break;
      case 'hitHeavy':
        tone({ type: 'sine', f: 150 * p, f2: 55, dur: 0.22, vol: 0.3 * v, t: t });
        noise({ dur: 0.16, vol: 0.3 * v, f: 500 * p, f2: 1200 * p, Q: 1, t: t });
        break;
      case 'clash': // 兵刃相交
        tone({ type: 'triangle', f: 920 * p, dur: 0.16, vol: 0.16 * v, t: t });
        tone({ type: 'triangle', f: 1380 * p, dur: 0.13, vol: 0.1 * v, t: t + 0.002 });
        noise({ dur: 0.05, vol: 0.14 * v, f: 5200 * p, Q: 3, t: t });
        break;
      case 'block':
        tone({ type: 'sine', f: 210 * p, dur: 0.1, vol: 0.18 * v, t: t });
        noise({ dur: 0.06, vol: 0.1 * v, f: 900, Q: 1, t: t });
        break;
      case 'parry':
        tone({ type: 'triangle', f: 1500 * p, f2: 2400 * p, dur: 0.12, vol: 0.14 * v, t: t });
        tone({ type: 'triangle', f: 2200 * p, dur: 0.1, vol: 0.08 * v, t: t + 0.01 });
        break;
      case 'whoosh':
        noise({ dur: 0.16, vol: 0.12 * v, f: 500 * p, f2: 120 * p, Q: 1, t: t });
        break;
      case 'hook':
        noise({ dur: 0.24, vol: 0.16 * v, f: 300 * p, f2: 1300 * p, Q: 1.6, t: t });
        tone({ type: 'triangle', f: 800 * p, f2: 300, dur: 0.18, vol: 0.08 * v, t: t + 0.02 });
        break;
      case 'chain':
        for (var i = 0; i < 6; i++) noise({ dur: 0.03, vol: 0.08 * v, f: 2500, Q: 2.5, t: t + i * 0.03 });
        break;
      case 'stomp':
        tone({ type: 'sine', f: 120 * p, f2: 40, dur: 0.3, vol: 0.4 * v, t: t });
        noise({ dur: 0.2, vol: 0.3 * v, f: 300, f2: 700, Q: 0.7, t: t });
        break;
      case 'jump':
        tone({ type: 'triangle', f: 260 * p, f2: 520 * p, dur: 0.12, vol: 0.1 * v, t: t });
        break;
      case 'land':
        tone({ type: 'sine', f: 140 * p, f2: 70, dur: 0.09, vol: 0.14 * v, t: t });
        break;
      case 'hurt':
        tone({ type: 'sawtooth', f: 300 * p, f2: 130 * p, dur: 0.22, vol: 0.18 * v, t: t });
        noise({ dur: 0.12, vol: 0.14 * v, f: 800, f2: 300, Q: 1, t: t });
        break;
      case 'death':
        tone({ type: 'sawtooth', f: 420 * p, f2: 60 * p, dur: 0.5, vol: 0.2 * v, t: t });
        noise({ dur: 0.4, vol: 0.16 * v, f: 900, f2: 150, Q: 1, t: t });
        break;
      case 'kill':
        tone({ type: 'triangle', f: 700 * p, dur: 0.08, vol: 0.1 * v, t: t });
        pluck(880 * p, t + 0.03, 0.08);
        noise({ dur: 0.1, vol: 0.16 * v, f: 3000, Q: 2, t: t });
        break;
      case 'coin':
        pluck(988 * p, t, 0.12); pluck(1319 * p, t + 0.06, 0.12);
        break;
      case 'ui':
        pluck(784 * p, t, 0.12);
        break;
      case 'select':
        pluck(587 * p, t, 0.1); pluck(880 * p, t + 0.05, 0.12);
        break;
      case 'start':
        pluck(523 * p, t, 0.12); pluck(659 * p, t + 0.07, 0.12); pluck(784 * p, t + 0.14, 0.14);
        break;
      case 'charge':
        tone({ type: 'sawtooth', f: 90 * p, f2: 260 * p, dur: 0.5, vol: 0.1 * v, t: t });
        noise({ dur: 0.5, vol: 0.1 * v, f: 600, f2: 1800, Q: 1.2, t: t });
        break;
      case 'drum':
        tone({ type: 'sine', f: 110, f2: 45, dur: 0.32, vol: 0.5 * v, t: t });
        noise({ dur: 0.09, vol: 0.2 * v, f: 700, f2: 300, Q: 0.6, t: t });
        break;
      case 'gong':
        tone({ type: 'sine', f: 196 * p, dur: 0.9, vol: 0.22 * v, attack: 0.01, t: t });
        tone({ type: 'sine', f: 294 * p, dur: 0.7, vol: 0.12 * v, attack: 0.015, t: t });
        noise({ dur: 0.4, vol: 0.1 * v, f: 3200, Q: 1.5, t: t });
        break;
      case 'fireball':
        noise({ dur: 0.3, vol: 0.16 * v, f: 400 * p, f2: 2400 * p, Q: 1, t: t });
        tone({ type: 'sawtooth', f: 160 * p, f2: 420 * p, dur: 0.3, vol: 0.1 * v, t: t });
        break;
      case 'shoot':
        noise({ dur: 0.1, vol: 0.2 * v, f: 1400 * p, f2: 4200 * p, Q: 2, t: t });
        break;
      case 'trick':
        tone({ type: 'sine', f: 500 * p, f2: 1600 * p, dur: 0.2, vol: 0.12 * v, t: t });
        break;
      case 'combo':
        pluck(600 * p + o.pitchStep, t, 0.1);
        break;
      case 'wheelie':
        noise({ dur: 0.2, vol: 0.1 * v, f: 300, f2: 900, Q: 1, t: t });
        break;
      case 'pickup':
        pluck(659 * p, t, 0.1); pluck(988 * p, t + 0.05, 0.12); pluck(1319 * p, t + 0.1, 0.1);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach(function (f, i) { pluck(f * p, t + i * 0.12, 0.14); });
        break;
      case 'lose':
        [440, 392, 330, 262].forEach(function (f, i) { pluck(f * p, t + i * 0.16, 0.14); });
        break;
      case 'boss':
        tone({ type: 'sawtooth', f: 80 * p, f2: 130 * p, dur: 0.8, vol: 0.2 * v, t: t });
        tone({ type: 'sawtooth', f: 82 * p, f2: 135 * p, dur: 0.8, vol: 0.16 * v, t: t + 0.03 });
        break;
      case 'explode':
        noise({ dur: 0.5, vol: 0.35 * v, f: 500, f2: 80, Q: 0.5, t: t });
        tone({ type: 'sine', f: 160, f2: 40, dur: 0.4, vol: 0.3 * v, t: t });
        break;
    }
  }

  // ---------- 氛围乐：五声音阶琶音 + 鼓点 ----------
  function musicStart() { musicPlaying = true; nextMelodyAt = 0; nextDrumAt = 0; melodyIdx = 0; }
  function musicStop() { musicPlaying = false; }
  function isMusic() { return musicPlaying; }

  function musicTick(dt) {
    if (!ctx || !musicPlaying || !enabled) return;
    var t = ctx.currentTime;
    // 鼓点：每 0.9s 一记，间隔 4 记一小节
    while (nextDrumAt <= t) {
      sfx('drum', { t: nextDrumAt - t, vol: 0.7, bus: musicBus });
      nextDrumAt += DRUM_INTERVAL;
    }
    // 旋律：每 0.5s 一个音，漫步式五声音阶琶音
    while (nextMelodyAt <= t) {
      var step = (melodyIdx % 16);
      var idx;
      if (step % 2 === 0) {
        idx = [0, 4, 7, 9, 12][Math.floor(Math.random() * 5)]; // 宫商角徵羽主音
        pluck(SCALE[idx % 12] * (Math.floor(idx / 12) ? 2 : 1) / 2, nextMelodyAt - t, 0.1, musicBus);
      } else {
        idx = [2, 5, 9][Math.floor(Math.random() * 3)]; // 色彩音点缀
        pluck(SCALE[idx] * 2, nextMelodyAt - t, 0.05, musicBus);
      }
      if (melodyIdx % 16 === 8) sfx('gong', { t: nextMelodyAt - t, vol: 0.5, bus: musicBus });
      melodyIdx++;
      nextMelodyAt += 0.5;
    }
  }

  return {
    init: init, setEnabled: setEnabled, isEnabled: isEnabled,
    sfx: sfx, musicStart: musicStart, musicStop: musicStop, isMusic: isMusic, musicTick: musicTick
  };
})();
