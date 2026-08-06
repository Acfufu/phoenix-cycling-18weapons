/* =========================================================
   War.Modes.endless · 跑酷特技
   无限里程 / 跳障碍 / 空中攻击=特技 / 连击倍率
   ========================================================= */
War.Modes.endless = {
  id: 'endless', name: 'Endless', nameZh: '跑酷', desc: '无限骑行，空中花式连击刷分',
  keys: '自动前进 · Space 跳跃 · J/L 空中特技 · K 格挡 · 切兵器砸障碍',

  start: function (world) {
    world.autoScroll = true;
    world.playerSpeed = 400;
    var e = {
      dist: 0, speed: 400, spawnX: 0, obstacles: [], trickCombo: 0, trickT: 0,
      comboShowT: 0
    };
    world.endless = e;
    e.spawnX = world.player.x + War.Render.W * 0.8;
    War.Audio.sfx('start');
  },

  update: function (world, dt) {
    var e = world.endless;
    var p = world.player;
    e.dist += world.playerSpeed * dt;
    e.speed = Math.min(760, 400 + e.dist * 0.0011);
    world.playerSpeed = e.speed;

    // 空中特技：连击计时
    if (!p.onGround && p.state === 'attack') {
      e.trickT += dt;
    }
    if (p.onGround) e.trickT = 0;

    // 生成障碍
    if (world.player.x + War.Render.W * 0.7 > e.spawnX) {
      var gap = War.utils.rand(260, 460 + e.speed * 0.4);
      e.spawnX += gap;
      var roll = Math.random();
      var type = roll < 0.34 ? 'jump' : roll < 0.68 ? 'smash' : 'low';
      var ox = e.spawnX;
      var oy = world.groundY - (type === 'jump' ? 16 : type === 'smash' ? 20 : 8);
      e.obstacles.push({ type: type, x: ox, y: oy, r: type === 'smash' ? 26 : type === 'jump' ? 22 : 16, hit: false, flash: 0 });
    }

    // 障碍更新（碰撞）
    for (var i = e.obstacles.length - 1; i >= 0; i--) {
      var o = e.obstacles[i];
      if (o.flash > 0) o.flash -= dt;
      // 玩家碰撞
      var d = War.utils.dist(o.x, o.y, p.x, p.y - 4);
      if (!o.hit && !p.dead && d < o.r + 18) {
        // 判定：跳跃可越过 jump/low；攻击可砸碎 smash
        if (o.type === 'smash' && p.state === 'attack') {
          this.smashObstacle(world, o);
        } else if (p.y < world.groundY - 60) {
          // 玩家跳起，越过障碍（低障碍需要起跳）
          if (o.type === 'low') { this.smashObstacle(world, o); }
          else { o.hit = true; this.jumpOver(world, o); }
        } else {
          o.hit = true;
          p.takeHit(world, 14, o.x, { kb: 260, shake: 0.5 });
          world.emitBurst(o.x, o.y, 'fire', 10);
        }
      }
      // 移出屏幕回收
      if (o.x < world.camera.x - 100) e.obstacles.splice(i, 1);
    }

    // 里程分
    world.score = Math.floor(e.dist);
    if (e.dist > (world.best || 0)) world.best = Math.floor(e.dist);
  },

  jumpOver: function (world, o) {
    world.score += 30;
    world.spawnFloat('+30', o.x, o.y - 30, 'combo');
    War.Audio.sfx('trick', { pitch: 1.1 });
  },

  smashObstacle: function (world, o) {
    o.hit = true;
    world.score += 80;
    world.spawnFloat('破！+80', o.x, o.y - 30, 'damage');
    world.emitBurst(o.x, o.y, 'fire', 12);
    world.emitHitSparks(o.x, o.y, 'weaponGlow');
    world.shake(0.3);
    War.Audio.sfx('hitHeavy');
    world.comboHit(null, 1);
  },

  // 特技（由 player.notifyTrick 触发）
  onTrick: function (world, p) {
    var e = world.endless;
    if (p.onGround) return;
    if (!p.attack || p.attack.t > 0.16 || p.attack.trickDone) return; // 每个攻击只计一次
    p.attack.trickDone = true;
    e.trickCombo++;
    e.comboShowT = 1.2;
    War.Audio.sfx('trick', { pitch: 1 + Math.min(e.trickCombo * 0.05, 0.6) });
    world.spawnFloat(e.trickCombo + ' 连特技!', p.x + p.facing * 10, p.y - 56, 'combo');
    world.emitFeathers(p.x, p.y - 20, 3);
  },

  // 落地（由 player.landTrick 触发）
  onLandTrick: function (world, p, airTime) {
    var e = world.endless;
    var bonus = Math.round(airTime * 200) + e.trickCombo * 80;
    world.score += bonus;
    world.spawnFloat('特技落地 +' + bonus, p.x, p.y - 50, 'combo');
    world.emitDust(p.x, world.groundY, 8);
    world.shake(0.25);
    War.Audio.sfx('land');
    e.trickCombo = 0;
  },

  hud: function (world, R) {
    var W = War.Render.W;
    var e = world.endless;
    R.text('里程 ' + Math.floor(e.dist) + ' m', 20, 40, { c: 'uiText', size: 22, font: 'ui', weight: 'bold', stroke: 'paper', strokeW: 4 });
    R.text('速度 ' + Math.round(e.speed) + ' km/h', 20, 66, { c: 'uiDim', size: 15, font: 'ui' });
    if (e.trickCombo > 0) {
      R.text(e.trickCombo + ' 连特技 ×' + (e.trickCombo + 1), W / 2, 90, { c: 'combo', size: 30, align: 'center', font: 'kai', weight: 'bold', stroke: 'paper', strokeW: 4, glow: 6 });
    }
    R.text('Space 跳跃 · 空中 J/L 耍特技', W / 2, 130, { c: 'uiDim', size: 14, align: 'center', font: 'ui', a: 0.75 });
  }
};
War.Modes.register(War.Modes.endless);
