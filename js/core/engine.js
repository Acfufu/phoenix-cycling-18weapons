/* =========================================================
   War.Engine · 游戏引擎（编排层）
   游戏循环 / 状态管理 / 更新与渲染编排 / 战绩存档
   世界工厂 → War.World；战斗结算 → War.Combat；绘制 → War.Draw
   ========================================================= */
War.Engine = (function () {
  var U = War.utils;
  var canvas, running = false, paused = false;
  var world = null, mode = null;
  var rafId = null, last = 0;
  var overTimer = 0, winTimer = 0;

  // ---------------- 战绩存档（localStorage，按版本命名空间隔离） ----------------
  // 发布新版本时，BUILD_VER 与 index.html 的 ?v= 同步 +1，旧版本数据自动作废不串。
  var BUILD_VER = 8;
  var STORAGE_KEY = 'war18_best_v' + BUILD_VER;

  // 干净分发参数：?fresh=1 本会话不读不写（纯内存）；?reset=1 先清空存档再正常读写
  var _qs = (typeof location !== 'undefined' && location.search) || '';
  var _params = new URLSearchParams(_qs);
  var FRESH_MODE = _params.has('fresh');
  if (_params.has('reset') && !FRESH_MODE) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  var BEST = {};
  if (!FRESH_MODE) {
    try { BEST = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) {}
  }

  function saveBest() {
    if (FRESH_MODE) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(BEST)); } catch (e) {}
  }

  function clearBest() {
    BEST = {};
    if (!FRESH_MODE) { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} }
  }

  // ---------------- 生命周期 ----------------
  function init(cv) {
    canvas = cv;
    War.Render.init(cv);
    War.Input.init(cv);
    window.addEventListener('resize', function () {
      War.Render.resize();
      if (world) { world.W = War.Render.W; world.H = War.Render.H; }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) last = 0; // 防止回来时 dt 巨大
    });
  }

  function start(opts) {
    opts = opts || {};
    War.Render.set(opts.style || 'ink');
    var m = War.Modes.get(opts.mode || 'story');
    world = War.World.create(m, opts.style || 'ink');
    world.best = BEST[m.id] || 0;
    mode = m;
    overTimer = 0; winTimer = 0;
    mode.start(world);
    if (opts.weapon != null) world.player.weaponIdx = opts.weapon % War.Weapons.count;
    paused = false;
    running = true;
    last = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
    War.Audio.musicStart();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function restart() {
    if (mode && world) {
      var m = world.mode, s = world.style;
      start({ mode: m.id, style: s });
    }
  }

  function pause() { paused = true; }
  function resume() { paused = false; last = 0; }
  function togglePause() { paused ? resume() : pause(); }

  function backToHub() {
    stop();
    if (world) { BEST[world.mode.id] = Math.max(BEST[world.mode.id] || 0, Math.floor(world.score || 0)); saveBest(); }
    War.UI && War.UI.showHub && War.UI.showHub();
  }

  // ---------------- 主循环 ----------------
  function loop(ts) {
    if (!running) return;
    if (!last) last = ts;
    var dt = Math.min((ts - last) / 1000, 1 / 30);
    last = ts;
    if (paused) {
      War.Input.update(); // 暂停期间清空"刚按下"，避免恢复时误触发
      rafId = requestAnimationFrame(loop);
      return;
    }

    // 慢动作
    var scale = world.slowmo.scale;
    if (world.slowmo.timer > 0) {
      world.slowmo.timer -= dt;
      if (world.slowmo.timer <= 0) { world.slowmo.scale = 1; scale = 1; }
    }
    var sdt = dt * scale;
    world.dt = sdt;
    world.t += sdt;

    update(world, sdt);

    // 音乐
    War.Audio.musicTick(dt);

    // 渲染
    render(world);

    // 状态覆盖层
    War.Draw.overlays(War.Render.cur, world);

    // 帧末清空"刚按下/刚抬起"（事件在帧间隙到达，下一帧读取后清空）
    War.Input.update();

    rafId = requestAnimationFrame(loop);
  }

  // ---------------- 更新编排 ----------------
  function update(w, dt) {
    // 模式逻辑
    if (mode && mode.update) mode.update(w, dt);

    // 玩家
    if (!w.player.dead) w.player.update(w, dt);
    else {
      w.player.stateT += dt;
      w.player.vy = Math.min(w.player.vy + 1500 * dt, 900);
      w.player.y += w.player.vy * dt;
      w.player.phaseGround(w);
    }

    // 连续型攻击（spin/orbit）
    if (w.player.attack) w.updateContinuous(w.player, dt);

    // 敌人
    for (var i = w.enemies.length - 1; i >= 0; i--) {
      var e = w.enemies[i];
      e.update(w, dt);
      // 越界清理
      if (e.x < w.camera.x - 260 && e.dead) w.enemies.splice(i, 1);
      else if (e.y > w.groundY + 400) w.enemies.splice(i, 1);
    }

    // 投射物
    for (var j = w.projectiles.length - 1; j >= 0; j--) {
      War.Projectiles.update(w, w.projectiles[j], dt);
      if (w.projectiles[j].dead) w.projectiles.splice(j, 1);
    }

    // 攻击波（wave/ring）
    for (var k = w.attacks.length - 1; k >= 0; k--) {
      War.Combat.updateAttack(w, w.attacks[k], dt);
      if (w.attacks[k].dead) w.attacks.splice(k, 1);
    }

    // 防御投射物：攻击期间可劈碎
    if (w.player.attack && w.player.attack.deflect) {
      for (var m2 = w.projectiles.length - 1; m2 >= 0; m2--) {
        var pp = w.projectiles[m2];
        if (pp.team !== 'enemy') continue;
        if (U.dist(pp.x, pp.y, w.player.x, w.player.y) < 90) {
          pp.dead = true;
          w.emitHitSparks(pp.x, pp.y, 'weaponGlow');
          w.spawnFloat('劈碎!', pp.x, pp.y - 10, 'combo');
          w.addScore(20);
          War.Audio.sfx('clash');
        }
      }
    }

    // 粒子
    w.particles.update(dt);

    // 飘字 / 横幅
    for (var f = w.floats.length - 1; f >= 0; f--) {
      var fl = w.floats[f];
      fl.t += dt; fl.y += fl.vy * dt; fl.vy *= Math.max(0, 1 - 2 * dt);
      if (fl.t >= fl.life) w.floats.splice(f, 1);
    }
    for (var b = w.banners.length - 1; b >= 0; b--) {
      w.banners[b].t += dt;
      if (w.banners[b].t >= w.banners[b].life) w.banners.splice(b, 1);
    }

    // 连击计时
    if (w.comboTimer > 0) {
      w.comboTimer -= dt;
      if (w.comboTimer <= 0) w.combo = 0;
    }

    // 相机
    var R = War.Render;
    var targetX = w.player.x - w.W * 0.34 + w.player.facing * 40;
    var targetY = w.player.y - w.H * 0.5;
    targetY = Math.min(targetY, 0); // 不随高度过分上移
    w.camera.x = U.damp(w.camera.x, Math.max(targetX, -80), 5, dt);
    w.camera.y = U.damp(w.camera.y, targetY, 5, dt);
    w.camera.trauma = Math.max(0, w.camera.trauma - 1.6 * dt);
    var sh = w.camera.trauma * w.camera.trauma * 22;
    w.camera.shakeX = U.rand(-sh, sh);
    w.camera.shakeY = U.rand(-sh, sh);

    // 闪光
    for (var fl2 = w.flashes.length - 1; fl2 >= 0; fl2--) {
      w.flashes[fl2].t += dt;
      if (w.flashes[fl2].t >= w.flashes[fl2].dur) w.flashes.splice(fl2, 1);
    }

    // 结束判定
    if (w.status === 'play') {
      if (w.player.dead && w.player.stateT > 1.5) w.status = 'over';
    }
    if (w.status === 'over') {
      overTimer += dt;
      BEST[w.mode.id] = Math.max(BEST[w.mode.id] || 0, Math.floor(w.score || 0));
      saveBest();
      if (War.Input.pressed('Enter') || War.Input.pressed('KeyR')) restart();
    }
    if (w.status === 'win') {
      winTimer += dt;
      BEST[w.mode.id] = Math.max(BEST[w.mode.id] || 0, Math.floor(w.score || 0));
      saveBest();
      if (War.Input.pressed('Enter') || War.Input.pressed('KeyR')) restart();
    }

    // 全局键：M 静音（Esc / P 的菜单控制由 main.js 统一处理）
    if (War.Input.pressed('KeyM')) {
      War.Audio.setEnabled(!War.Audio.isEnabled());
      w.spawnFloat(War.Audio.isEnabled() ? '音效开' : '静音', w.player.x, w.player.y - 40, 'uiDim');
    }
  }

  // ---------------- 渲染编排 ----------------
  function render(w) {
    var R = War.Render.cur;
    if (!R) return;
    R.beginFrame(w);

    // 障碍
    if (w.endless) {
      for (var i = 0; i < w.endless.obstacles.length; i++) War.Draw.obstacle(R, w.endless.obstacles[i], w);
    }
    // 木人
    if (w.dummy) War.Draw.dummy(R, w);
    // 玩家
    w.player.draw(w, R);
    War.Draw.orbitBall(R, w);
    // 敌人
    for (var e = 0; e < w.enemies.length; e++) w.enemies[e].draw(w, R);
    // 对战对手
    if (w.battle) War.Modes.battle.drawOpponent(w, R);
    // 投射物
    for (var p = 0; p < w.projectiles.length; p++) War.Projectiles.draw(w, R, w.projectiles[p]);
    // 攻击波
    for (var a = 0; a < w.attacks.length; a++) War.Draw.attack(R, w.attacks[a]);
    // 粒子
    w.particles.draw(R);
    // 横幅（招式落款）
    War.Draw.banners(R, w);

    R.endFrame();

    // HUD（屏幕空间）
    R.save(); R.reset();
    if (mode && mode.hud) mode.hud(w, R);
    War.Draw.commonHud(R, w);
    War.Draw.floats(R, w);
    R.restore();
  }

  return {
    init: init, start: start, stop: stop, restart: restart,
    pause: pause, resume: resume, togglePause: togglePause,
    backToHub: backToHub,
    get world() { return world; },
    get running() { return running; },
    get paused() { return paused; },
    get BEST() { return BEST; },
    clearBest: clearBest
  };
})();
