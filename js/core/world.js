/* =========================================================
   War.World · 世界工厂
   构建一局游戏的世界对象：实体列表 / 工具方法 / 特效发射 / 交互
   战斗结算委托给 War.Combat（纯逻辑），本模块只管数据与方法
   ========================================================= */
War.World = (function () {
  var U = War.utils;

  function create(m, styleId) {
    var R = War.Render;
    var w = {
      mode: m, style: styleId,
      W: R.W, H: R.H, t: 0, dt: 0,
      player: null,
      enemies: [], projectiles: [], attacks: [], floats: [], banners: [],
      obstacles: [], // endless
      particles: War.Particles,
      dummy: null, boss: null,
      camera: { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0 },
      slowmo: { scale: 1, timer: 0 },
      groundY: R.H * 0.72,
      score: 0, best: 0, combo: 0, comboTimer: 0, kills: 0,
      status: 'play',
      autoScroll: false, playerSpeed: 310,
      flashes: []
    };

    w.player = new War.Player(140, w.groundY - 56);

    // ---- 工具方法 ----
    w.spawnFloat = function (text, x, y, color) {
      w.floats.push({ text: text, x: x, y: y, color: color || 'combo', t: 0, life: 0.95, vy: -46 });
      if (w.floats.length > 60) w.floats.shift();
    };

    w.spawnBanner = function (text, x, y) {
      w.banners.push({ text: text, x: x, y: y, t: 0, life: 1.5 });
      if (w.banners.length > 8) w.banners.shift();
    };

    w.shake = function (amount) { w.camera.trauma = Math.min(1, w.camera.trauma + amount); };

    w.flash = function (color, dur) { w.flashes.push({ color: color, t: 0, dur: dur || 0.4 }); };

    w.slowMotion = function (scale, dur) { w.slowmo.scale = scale; w.slowmo.timer = dur || 0.4; };

    w.addScore = function (n) { w.score += n * (1 + Math.min(w.combo, 20) * 0.08); };

    w.comboHit = function (e, n) {
      n = n || 1;
      w.combo += n;
      w.comboTimer = 2.2;
      if (w.combo > 3 && w.combo % 3 === 0) {
        War.Audio.sfx('combo', { pitch: 1 + Math.min(w.combo * 0.02, 0.4) });
        if (e) w.spawnFloat(w.combo + ' 连击!', e.x, e.y - 56, 'combo');
      }
    };

    // ---- 生成 ----
    w.spawnEnemy = function (type, x, y) {
      var e = War.Enemies.make(type, x, y);
      w.enemies.push(e);
      return e;
    };

    w.spawnProjectile = function (type, x, y, angle, speed, team) {
      w.projectiles.push(War.Projectiles.make(type, x, y, angle, speed, team || 'enemy'));
    };

    // ---- 攻击结算（委托 War.Combat） ----
    w.applyAttackStroke = function (player, stroke, attack) {
      War.Combat.applyStroke(w, player, stroke, attack);
    };

    // 连续型招式（spin / orbit）每帧结算
    w.updateContinuous = function (player, dt) {
      War.Combat.updateContinuous(w, player, dt);
    };

    // ---- 招式特效发射 ----
    w.emitSlashTrail = function (player, a) {
      var k = a.t / a.dur;
      var cx = player.x + player.facing * (30 + k * 40);
      var cy = player.y - 8 + Math.sin(k * 4) * 8;
      w.emit(cx, cy, player.getWeapon().cls === 'heavy' ? 'fire' : 'weaponGlow', 'streak', { spread: 20, life: 0.18, size: 4, glow: 4 });
    };

    w.emitSpinTrail = function (player, a) {
      var k = a.t / a.dur;
      var ang = k * U.TAU * 2;
      var rx = Math.cos(ang) * (a.orbit ? a.orbit.r : 70) * 0.55;
      var ry = Math.sin(ang) * (a.orbit ? a.orbit.r : 70) * 0.35;
      w.emit(player.x + rx, player.y + ry, 'weaponGlow', 'spark', { spread: 14, life: 0.22, size: 3.5, glow: 5 });
    };

    w.emit = function (x, y, color, shape, o) {
      o = o || {};
      w.particles.emit({
        x: x, y: y,
        vx: o.vx != null ? o.vx : U.rand(-(o.spread || 40), o.spread || 40),
        vy: o.vy != null ? o.vy : U.rand(-(o.spread || 40), o.spread || 40),
        life: o.life != null ? o.life : 0.5,
        size: o.size != null ? o.size : 3,
        color: color, shape: shape || 'dot',
        grav: o.grav != null ? o.grav : 200,
        drag: o.drag != null ? o.drag : 1.5,
        glow: o.glow || 0, jitter: o.jitter || 0, alphaMul: o.alphaMul
      });
    };

    w.emitBurst = function (x, y, color, n) {
      w.particles.burst({ x: x, y: y, spread: 140, life: 0.6, size: 4, color: color, shape: 'dot', grav: 300, glow: 3 }, n);
    };
    w.emitDust = function (x, y, n) {
      w.particles.burst({ x: x, y: y, spread: 60, life: 0.5, size: 5, color: 'inkLight', shape: 'smoke', grav: -60, glow: 0 }, n);
    };
    w.emitFeathers = function (x, y, n) {
      w.particles.burst({ x: x, y: y, spread: 120, life: 0.9, size: 6, color: 'phoenix', shape: 'feather', grav: 320, drag: 0.6, vr: 3 }, n);
    };
    w.emitHitSparks = function (x, y, color) {
      w.particles.burst({ x: x, y: y, spread: 180, life: 0.4, size: 5, color: color, shape: 'spark', grav: 500, glow: 4 }, 8);
    };

    // ---- 格挡交互 ----
    w.parryProjectiles = function (player, fromX) {
      for (var i = w.projectiles.length - 1; i >= 0; i--) {
        var p = w.projectiles[i];
        if (p.team === 'enemy' && U.dist(p.x, p.y, player.x, player.y) < 130) {
          p.team = 'player';
          var sp = U.dist(0, 0, p.vx, p.vy);
          var ang = U.angleTo(player.x, player.y, fromX, player.y);
          p.vx = Math.cos(ang) * sp * 1.2;
          p.vy = Math.sin(ang) * sp * 1.2;
          p.damage = 12;
          p.spin = 0;
          w.spawnFloat('反弹!', p.x, p.y - 10, 'combo');
        }
      }
    };

    w.wallPush = function (player) {
      for (var i = w.enemies.length - 1; i >= 0; i--) {
        var e = w.enemies[i];
        if (e.dead) continue;
        var dx = e.x - player.x;
        if (Math.abs(dx) < 130) {
          e.vx = Math.sign(dx || 1) * 420;
          e.vy = -160;
          e.onGround = false;
          e.stunLeft = Math.max(e.stunLeft || 0, 0.35);
        }
      }
    };

    // ---- 特技（跑酷） ----
    w.notifyTrick = function (player, dt) {
      if (w.mode.id === 'endless' && !player.onGround) {
        War.Modes.endless.onTrick(w, player);
      }
    };
    w.landTrick = function (player, airTime) {
      if (w.mode.id === 'endless') {
        War.Modes.endless.onLandTrick(w, player, airTime);
      }
    };

    // Boss 击败
    w.bossDefeated = function () { w.status = 'win'; };

    // 障碍（endless）被玩家招式命中
    w.checkObstaclesByZone = function (zx, zy, r) {
      var e = w.endless;
      if (!e) return;
      for (var i = e.obstacles.length - 1; i >= 0; i--) {
        var o = e.obstacles[i];
        if (o.hit) continue;
        if (U.dist(zx, zy, o.x, o.y) < r + o.r) {
          if (o.type === 'smash') War.Modes.endless.smashObstacle(w, o);
          else { o.hit = true; War.Modes.endless.jumpOver(w, o); }
        }
      }
    };

    // 木人（gallery）
    w.checkDummyByZone = function (zx, zy, r) {
      if (!w.dummy) return;
      if (U.dist(zx, zy, w.dummy.x, w.dummy.y - 10) < r + w.dummy.r) {
        War.Modes.gallery.hitDummy(w, 12);
      }
    };

    return w;
  }

  return { create: create };
})();
