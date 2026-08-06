/* =========================================================
   War.UI · 统一审查 Hub 入口 + 启动路由
   Hub 画布实时渲染英雄区（当前画风），DOM 呈现模式/兵器/设置
   ========================================================= */
War.UI = (function () {
  var U = War.utils;
  var canvas, hubActive = false, hubT = 0, lastHub = 0, hubRaf = null;
  var curStyle = 'ink', hubPlayer = null, hubWorld = null;
  var hubParticles = null;
  var pauseOpen = false, helpOpen = false;
  var elBar = null, elPause = null, elHelp = null;

  var STYLES = [
    { id: 'ink', zh: '水墨', d: '宣纸飞白' },
    { id: 'pixel', zh: '像素', d: '低清街机' },
    { id: 'cartoon', zh: '卡通', d: '扁平描边' },
    { id: 'neon', zh: '霓虹', d: '赛博发光' }
  ];

  var MODES = [
    { id: 'story', zh: '闯关', glyph: '战', desc: '三关清版，一路杀到骑车邪龙', hint: '←→ 移动 / J 攻击 / K 格挡' },
    { id: 'endless', zh: '跑酷', glyph: '风', desc: '无限里程，空中花式连击', hint: 'Space 跳跃 / 空中 J L 特技' },
    { id: 'gallery', zh: '演示', glyph: '器', desc: '十八般兵刃图鉴，逐件试耍', hint: '数字键 切兵器 / J L K 试招' },
    { id: 'battle', zh: '对战', glyph: '王', desc: '竞技场对决骑车夜叉王', hint: 'J 攻击 / K 格挡 / ←→ 移动' }
  ];

  function boot() {
    canvas = document.getElementById('game');
    War.Engine.init(canvas);
    buildHubDom();
    buildGameChrome();

    // 首次手势解锁音频
    function unlock(e) {
      War.Audio.init();
      if (War.Audio.isEnabled()) { War.Audio.sfx('select'); }
      document.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
    document.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    // 暂停菜单 / 帮助：P 或 Esc 开合，Esc 在结算画面返回主界面
    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyP' && e.code !== 'Escape') return;
      if (helpOpen) { closeHelp(); return; }
      if (!War.Engine.running) return;
      if (pauseOpen) { closePauseMenu(); return; }
      var w = War.Engine.world;
      if (w && w.status === 'play') openPauseMenu();
      else if (w) War.Engine.backToHub(); // 胜利/失败 → 返回主界面
    });

    showHub();
  }

  // ---------------- Hub DOM ----------------
  function buildHubDom() {
    var hub = document.getElementById('hub');
    var html = '';

    // 顶栏：字标 + 画风 + 说明/音效
    html += '<header class="hub-top">';
    html += '<div class="hub-wordmark">';
    html += '<span class="wordmark-seal">武</span>';
    html += '<div><h1 class="hub-title">凤凰兵器骑行</h1>';
    html += '<p class="hub-sub">十八般武艺 · 一页总览</p></div>';
    html += '</div>';
    html += '<div class="hub-top-actions">';
    html += '<div class="style-row">';
    STYLES.forEach(function (s) {
      html += '<button class="seal-btn style-btn' + (s.id === curStyle ? ' active' : '') + '" data-style="' + s.id + '">' + s.zh + '<em>' + s.d + '</em></button>';
    });
    html += '</div>';
    html += '<button class="seal-btn" id="hubHelp">说明</button>';
    html += '<button class="seal-btn" id="hubReset">清战绩</button>';
    html += '<button class="seal-btn" id="soundState">音效</button>';
    html += '</div>';
    html += '</header>';

    // 中部：兵器榜（闯关为主卡）
    html += '<main class="hub-mid"><nav class="mode-list">';
    MODES.forEach(function (m, i) {
      html += '<button class="mode-card' + (i === 0 ? ' featured' : '') + '" data-mode="' + m.id + '">';
      html += '<span class="mc-glyph">' + m.glyph + '</span>';
      html += '<span class="mc-body">';
      html += '<span class="mc-title">' + m.zh + '</span>';
      html += '<span class="mc-desc">' + m.desc + '</span>';
      html += '<span class="mc-hint">' + m.hint + '</span>';
      html += '</span>';
      if (i === 0) html += '<span class="mc-cta">进入 →</span>';
      html += '<span class="best" data-best="' + m.id + '"></span>';
      html += '</button>';
    });
    html += '</nav></main>';

    // 底部：兵器廊 + 键位
    html += '<footer class="hub-bottom">';
    html += '<div class="hub-bottom-row">';
    html += '<span class="lbl">兵器</span>';
    html += '<div class="weapon-rail" id="weaponStrip"></div>';
    html += '</div>';
    html += '<div class="keys-hint">';
    html += '<span><kbd>J</kbd>轻击</span><span><kbd>L</kbd>重击</span><span><kbd>K</kbd>格挡</span><span><kbd>Space</kbd>跳跃</span><span><kbd>[ ]</kbd>切兵器</span><span><kbd>M</kbd>静音</span><span><kbd>P</kbd>暂停</span><span><kbd>Esc</kbd>返回</span>';
    html += '</div>';
    html += '</footer>';

    hub.innerHTML = html;

    // 兵器条
    var strip = document.getElementById('weaponStrip');
    var ws = '';
    War.Weapons.list.forEach(function (w) {
      ws += '<button class="weapon-chip" data-w="' + w.index + '" title="' + w.name + '，' + w.tip + ' 难度' + w.stars + '/5"><span>' + w.char + '</span><em>' + w.name + '</em></button>';
    });
    strip.innerHTML = ws;

    bindHub();
    refreshBests();
  }

  function refreshBests() {
    document.querySelectorAll('[data-best]').forEach(function (el) {
      var id = el.getAttribute('data-best');
      var b = War.Engine.BEST[id];
      if (b) el.textContent = '最佳 ' + b;
      else el.textContent = '';
    });
  }

  function bindHub() {
    document.getElementById('hub').addEventListener('click', function (e) {
      if (!(e.target instanceof Element)) return;
      var st = e.target.closest('.style-btn');
      if (st) { setStyle(st.getAttribute('data-style')); return; }
      var mc = e.target.closest('.mode-card');
      if (mc) { launch(mc.getAttribute('data-mode')); return; }
      var wc = e.target.closest('.weapon-chip');
      if (wc) { launch('gallery', +wc.getAttribute('data-w')); return; }
    });
    // 音效开关
    document.getElementById('soundState').addEventListener('click', function () {
      War.Audio.init();
      var on = !War.Audio.isEnabled();
      War.Audio.setEnabled(on);
      this.textContent = on ? '音效' : '静音';
      if (on) War.Audio.sfx('ui');
    });
    // Hub 游戏说明
    document.getElementById('hubHelp').addEventListener('click', function () {
      War.Audio.init();
      War.Audio.sfx('ui');
      openHelp();
    });
    // 清战绩
    document.getElementById('hubReset').addEventListener('click', function () {
      War.Audio.init();
      War.Engine.clearBest();
      refreshBests();
      War.Audio.sfx('ui');
      var btn = this;
      btn.textContent = '已清空';
      setTimeout(function () { btn.textContent = '清战绩'; }, 1400);
    });
  }

  function setStyle(id) {
    curStyle = id;
    document.querySelectorAll('.style-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-style') === id);
    });
    War.Render.set(id);
    War.Audio.sfx('ui');
  }

  function launch(modeId, weapon) {
    War.Audio.init();
    War.Audio.sfx('start');
    hideHub();
    War.Engine.start({ mode: modeId, style: curStyle, weapon: weapon });
    showGameBar();
  }

  // ---------------- 游戏内 Chrome：工具栏 / 暂停菜单 / 帮助 ----------------
  function buildGameChrome() {
    var app = document.getElementById('app');

    // 右上角工具栏（游戏中显示）
    elBar = document.createElement('div');
    elBar.id = 'gameBar';
    elBar.className = 'game-bar';
    elBar.style.display = 'none';
    elBar.innerHTML = '<button class="seal-btn gb-btn" id="btnHelp" title="游戏说明">说</button>' +
      '<button class="seal-btn gb-btn" id="btnMenu" title="菜单">☰</button>';
    app.appendChild(elBar);

    // 暂停菜单
    elPause = document.createElement('div');
    elPause.id = 'pauseMenu';
    elPause.className = 'overlay-menu';
    elPause.style.display = 'none';
    elPause.innerHTML =
      '<div class="menu-card">' +
      '<span class="menu-seal">☰</span>' +
      '<h2>暂 停</h2>' +
      '<button class="seal-btn" data-act="resume">继 续</button>' +
      '<button class="seal-btn" data-act="restart">再 战</button>' +
      '<button class="seal-btn" data-act="help">说 明</button>' +
      '<button class="seal-btn" data-act="exit">返回主界面</button>' +
      '<p class="menu-hint">Esc / P 关闭菜单</p>' +
      '</div>';
    app.appendChild(elPause);

    // 帮助面板
    elHelp = document.createElement('div');
    elHelp.id = 'helpPanel';
    elHelp.className = 'overlay-menu help-overlay';
    elHelp.style.display = 'none';
    elHelp.innerHTML = buildHelpHtml();
    app.appendChild(elHelp);

    // 事件
    elBar.addEventListener('click', function (e) {
      if (e.target.closest('#btnHelp')) { War.Audio.init(); War.Audio.sfx('ui'); openHelp(); }
      else if (e.target.closest('#btnMenu')) { War.Audio.init(); War.Audio.sfx('ui'); openPauseMenu(); }
    });
    elPause.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var act = b.getAttribute('data-act');
      var w = War.Engine.world;
      if (act === 'resume') {
        if (w && w.status !== 'play') War.Engine.restart();
        else closePauseMenu();
      } else if (act === 'restart') { closePauseMenu(); War.Engine.restart(); }
      else if (act === 'help') { openHelp(); }
      else if (act === 'exit') { closePauseMenu(); War.Engine.backToHub(); }
    });
    elHelp.addEventListener('click', function (e) {
      if (e.target.closest('.help-close')) closeHelp();
    });
  }

  function showGameBar() { if (elBar) elBar.style.display = 'flex'; }
  function hideGameBar() { if (elBar) elBar.style.display = 'none'; }

  function openPauseMenu() {
    if (!elPause) return;
    pauseOpen = true;
    War.Engine.pause();
    elPause.style.display = 'flex';
  }
  function closePauseMenu() {
    if (!elPause) return;
    pauseOpen = false;
    elPause.style.display = 'none';
    War.Engine.resume();
  }

  function openHelp() {
    if (!elHelp) return;
    helpOpen = true;
    if (War.Engine.running && !War.Engine.paused) War.Engine.pause();
    elHelp.style.display = 'flex';
  }
  function closeHelp() {
    if (!elHelp) return;
    helpOpen = false;
    elHelp.style.display = 'none';
    if (War.Engine.running && !pauseOpen) War.Engine.resume();
  }

  function buildHelpHtml() {
    var weapons = '';
    War.Weapons.list.forEach(function (w) {
      weapons += '<div class="w-item"><span class="w-char">' + w.char + '</span><div><b>' + w.name + '</b>，' + w.tip + '<em>难度 ' + w.stars + '/5</em></div></div>';
    });
    return '' +
      '<div class="help-card">' +
      '<button class="help-close">关</button>' +
      '<h2>游戏说明</h2>' +

      '<section><h3>操作</h3>' +
      '<table class="keys">' +
      '<tr><td>← → / A D</td><td>移动</td></tr>' +
      '<tr><td>Space / ↑ / W</td><td>跳跃，空中按键为特技</td></tr>' +
      '<tr><td>J</td><td>轻击</td></tr>' +
      '<tr><td>L</td><td>重击 / 蓄力</td></tr>' +
      '<tr><td>K / Z</td><td>格挡（剑=反弹，棍=气墙，拐子=反击）</td></tr>' +
      '<tr><td>1-9 / Q-W-E-R-T-Y-U-I-O</td><td>切换十八般兵器</td></tr>' +
      '<tr><td>[ ]</td><td>兵器前后循环</td></tr>' +
      '<tr><td>P / Esc</td><td>暂停菜单，结算画面按 Esc 返回主界面</td></tr>' +
      '<tr><td>M</td><td>静音</td></tr>' +
      '<tr><td>Enter / R</td><td>重试</td></tr>' +
      '</table></section>' +

      '<section><h3>四种模式</h3>' +
      '<ul class="modes">' +
      '<li><b>闯关</b>，横版清版，三关一路杀到骑车邪龙，波次刷怪、连击评分。</li>' +
      '<li><b>跑酷</b>，无限里程自动前进；Space 跳障碍，空中 J/L 耍特技、落地加分。</li>' +
      '<li><b>演示</b>，十八般兵刃图鉴：试耍每件兵器，看招式名与手感难度。</li>' +
      '<li><b>对战</b>，竞技场对决骑车夜叉王：攻防克制，K 格挡能挡住正面攻击。</li>' +
      '</ul></section>' +

      '<section><h3>十八般兵器</h3>' +
      '<div class="weapons">' + weapons + '</div>' +
      '<p class="note">每件兵器招式与手感各异：剑可格挡反弹暗器，钩可把敌人拉近，斧与锤重击震地，流星锤环绕甩击，槊超长蓄力穿刺，棍旋转格挡气墙。</p></section>' +

      '<section><h3>技巧</h3>' +
      '<ul class="tips">' +
      '<li>连续命中攒<em>连击</em>，连击越高得分加成越多。</li>' +
      '<li>招式会以书法落款弹出，<em>重击</em>一般带震屏或慢动作。</li>' +
      '<li>大盾兵正面免疫，绕到背后或用重击、震地波、拉取破防。</li>' +
      '<li>空中攻击可继续滞空，为落地特技蓄力。</li>' +
      '</ul></section>' +
      '</div>';
  }

  // ---------------- Hub 画布循环 ----------------
  function showHub() {
    hubActive = true;
    document.getElementById('hub').style.display = 'flex';
    document.getElementById('hub').classList.add('show');
    War.Engine.stop();
    hideGameBar();
    if (pauseOpen) { pauseOpen = false; elPause.style.display = 'none'; }
    if (helpOpen) { helpOpen = false; elHelp.style.display = 'none'; }
    War.Render.set(curStyle);
    hubParticles = War.Particles;
    hubParticles.clear();
    if (!hubWorld) {
      hubWorld = {
        camera: { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0 },
        groundY: 0, t: 0, W: 0, H: 0
      };
    }
    hubWorld.groundY = War.Render.H * 0.78;
    hubWorld.W = War.Render.W; hubWorld.H = War.Render.H;
    hubWorld.t = hubT;
    if (!hubPlayer) {
      hubPlayer = new War.Player(0, hubWorld.groundY - 56);
    }
    hubPlayer.x = War.Render.W * 0.5;
    hubPlayer.y = hubWorld.groundY - 56;
    hubPlayer.onGround = true;
    hubPlayer.facing = 1;
    refreshBests(); // 返回 Hub 时刷新最佳成绩角标
    lastHub = 0;
    if (hubRaf) cancelAnimationFrame(hubRaf);
    hubRaf = requestAnimationFrame(hubLoop);
  }

  function hideHub() {
    hubActive = false;
    document.getElementById('hub').style.display = 'none';
    document.getElementById('hub').classList.remove('show');
    if (hubRaf) cancelAnimationFrame(hubRaf);
    hubRaf = null;
  }

  function hubLoop(ts) {
    if (!hubActive) return;
    var dt = lastHub ? Math.min((ts - lastHub) / 1000, 1 / 30) : 1 / 60;
    lastHub = ts;
    hubT += dt;
    hubWorld.t = hubT;
    hubWorld.W = War.Render.W; hubWorld.H = War.Render.H;

    var R = War.Render.cur;
    R.beginFrame(hubWorld);

    // 玩家：缓慢骑行 + 周期性换兵器
    var p = hubPlayer;
    p.weaponIdx = Math.floor(hubT / 1.7) % War.Weapons.count;
    p.wheelRot += dt * 2.6;
    p.pedalRot += dt * 1.6;
    p.bob = Math.sin(p.wheelRot * 3) * 2;
    p.vx = 90;
    p.state = 'idle';
    p.draw(hubWorld, R);

    // 环绕兵器字符
    var i, ang;
    var cx = War.Render.W * 0.5, cy = War.Render.H * 0.3;
    for (i = 0; i < War.Weapons.count; i++) {
      ang = hubT * 0.5 + i * U.TAU / War.Weapons.count;
      var wx = cx + Math.cos(ang) * 46;
      var wy = cy + Math.sin(ang) * 30;
      var w = War.Weapons.get(i);
      R.text(w.char, wx, wy, {
        c: i === p.weaponIdx ? 'uiAccent' : 'uiDim', size: i === p.weaponIdx ? 24 : 14,
        align: 'center', font: 'kai', a: i === p.weaponIdx ? 1 : 0.55, glow: i === p.weaponIdx ? 6 : 0
      });
    }
    // 飘落羽毛
    if (Math.random() < 0.12) {
      hubParticles.emit({
        x: U.rand(0, War.Render.W), y: -10,
        vx: U.rand(-12, 12), vy: U.rand(40, 70),
        life: 5, size: U.rand(5, 9), color: U.pick(['phoenix', 'feather', 'fire', 'weaponGlow']),
        shape: 'feather', grav: 6, drag: 0.1, wobble: 2, vr: U.rand(-2, 2)
      });
    }
    hubParticles.update(dt);
    hubParticles.draw(R);

    R.endFrame();

    hubRaf = requestAnimationFrame(hubLoop);
  }

  return { boot: boot, showHub: showHub, hideHub: hideHub };
})();

// 启动
window.addEventListener('DOMContentLoaded', function () {
  War.UI.boot();
});
