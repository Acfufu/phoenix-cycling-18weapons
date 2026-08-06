/* =========================================================
   War.Enemies · 敌人工厂
   喽啰 / 暗器手 / 大盾 / 枪兵 / 火球妖 / Boss 邪龙（骑车）
   ========================================================= */
War.Enemies = (function () {
  var U = War.utils;

  function make(type, x, y) {
    switch (type) {
      case 'grunt': return grunt(x, y);
      case 'thrower': return thrower(x, y);
      case 'shield': return shield(x, y);
      case 'spear': return spear(x, y);
      case 'mage': return mage(x, y);
      case 'boss': return boss(x, y);
    }
  }

  // ---------- 通用伤害 ----------
  function damageSelf(world, e, dmg, opts) {
    opts = opts || {};
    if (e.dead || e.hp <= 0) return;
    // 大盾正面格挡
    if (e.type === 'shield' && e.state !== 'knocked' && e.state !== 'hurt') {
      var front = opts.fromX == null || Math.sign(opts.fromX - e.x) === -e.facing;
      if (front && !opts.bypass) {
        War.Audio.sfx('block');
        e.state = 'blocking'; e.stateT = 0;
        world.spawnFloat('格挡', e.x, e.y - 44, 'block');
        world.emitHitSparks(e.x + e.facing * 18, e.y - 30, 'weaponGlow');
        e.vx = e.facing * 60;
        return;
      }
    }
    e.hp -= dmg;
    e.hitFlash = 0.16;
    world.spawnFloat(Math.round(dmg), e.x + U.rand(-6, 6), e.y - 40, 'damage');
    world.emitHitSparks(e.x, e.y - 20, 'enemyGlow');
    world.comboHit(e);
    if (opts.stun) { e.state = 'hurt'; e.stateT = 0; e.stunLeft = opts.stun; }
    var kb = opts.kb != null ? opts.kb : 140;
    var kbUp = opts.kbUp != null ? opts.kbUp : 0;
    var dir = opts.dir != null ? opts.dir : 1;
    e.vx = dir * kb;
    if (kbUp > 0) { e.vy = -kbUp; e.onGround = false; }
    if (opts.pull) {
      e.pullT = 0.35;
      e.pullToX = opts.toX != null ? opts.toX : e.x;
      e.pullToY = opts.toY != null ? opts.toY : e.y;
    }
    if (e.hp <= 0) {
      e.hp = 0; e.die(world);
    }
  }

  function commonUpdate(world, e, dt) {
    if (e.dead) {
      // 死亡飞出屏幕后清理
      e.vy += 900 * dt;
      e.x += e.vx * dt; e.y += e.vy * dt;
      return;
    }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.stunLeft > 0) e.stunLeft -= dt;
    if (e.pullT > 0) {
      e.pullT -= dt;
      e.x = U.damp(e.x, e.pullToX, 14, dt);
      e.y = U.damp(e.y, e.pullToY, 14, dt);
      if (e.pullT <= 0) { e.vx = U.sign(e.pullToX - e.x) * 40; }
      return;
    }
    // 接触伤害
    if (e.touchCd > 0) e.touchCd -= dt;
    var d = U.dist(e.x, e.y, world.player.x, world.player.y);
    if (d < e.r + 30 && e.touchCd <= 0 && !world.player.dead && e.type !== 'boss') {
      world.player.takeHit(world, e.touchDmg, e.x, { kb: e.kb || 220, shake: 0.4 });
      e.touchCd = 1.0;
    }
  }

  function commonDrawFlash(R, e) {
    if (e.hitFlash > 0) R.circle(e.x, e.y - 20, e.r * 0.8, { c: 'white', fill: true, a: e.hitFlash * 3 });
  }

  // ---------- 喽啰（近战山贼） ----------
  function grunt(x, y) {
    var e = {
      type: 'grunt', name: '喽啰', x: x, y: y, vx: 0, vy: 0,
      hp: 34, maxHp: 34, facing: -1, state: 'walk', stateT: 0,
      r: 16, touchDmg: 12, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 100, speed: 95, atkCd: 0
    };
    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      commonUpdate(world, e, dt);
      e.stateT += dt;
      var p = world.player;
      var d = p.x - e.x;
      e.facing = d > 0 ? 1 : -1;
      e.atkCd -= dt;
      if (e.state === 'hurt' && e.stateT > 0.28) { e.state = 'walk'; e.stateT = 0; }
      if (Math.abs(d) < 52 && e.atkCd <= 0 && e.state !== 'hurt') {
        e.state = 'attack'; e.stateT = 0; e.atkCd = 1.1;
        e.atkDir = e.facing;
        War.Audio.sfx('swing');
      }
      if (e.state === 'attack') {
        e.vx *= 0.6;
        if (e.stateT >= 0.3 && !e.hitDone) {
          e.hitDone = true;
          if (Math.abs(p.x - e.x) < 62 && Math.abs(p.y + 10 - e.y) < 40 && Math.sign(p.x - e.x) === e.atkDir) {
            world.player.takeHit(world, 12, e.x, { kb: 240, shake: 0.35 });
          }
        }
        if (e.stateT >= 0.5) { e.state = 'walk'; e.stateT = 0; e.hitDone = false; }
      } else if (e.state !== 'hurt') {
        e.vx = e.facing * e.speed;
      }
      e.vy = Math.min(e.vy + 1500 * dt, 900);
      e.x += e.vx * dt; e.y += e.vy * dt;
      var gy = world.groundY - 30;
      if (e.y >= gy) { e.y = gy; e.vy = 0; e.onGround = true; }
    };
    e.takeHit = function (world, dmg, opts) { damageSelf(world, e, dmg, opts); };
    e.die = function (world) {
      e.dead = true; e.vx = U.rand(-80, 80); e.vy = -360;
      world.addScore(e.score); world.emitFeathers(e.x, e.y, 5);
      world.emitHitSparks(e.x, e.y, 'enemy');
      War.Audio.sfx('kill'); world.slowMotion(0.35, 0.25);
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      if (e.dead) { R.rotate && R.save(); }
      var facing = e.facing;
      R.save(); R.translate(px, py); R.scale(facing, 1);
      // 头巾山贼
      R.circle(0, -18, 12, { c: 'enemy', fill: true });
      R.rect(-10, -30, 20, 7, { c: 'enemyDark', fill: true, rounded: 3 });
      R.circle(4, -19, 2.2, { c: 'paperDark', fill: true });
      R.line(-14, 0, 14, 0, { c: 'enemy', fill: true, w: 6 });
      R.line(-16, 0, 16, 0, { c: 'enemyDark', w: 3 });
      R.line(10, 0, 24, -14, { c: 'inkMid', w: 3 });
      R.circle(24, -14, 3, { c: 'enemy', fill: true });
      if (e.state === 'attack') {
        R.line(10, 0, 30, -6 + Math.sin(e.stateT * 20) * 4, { c: 'enemyDark', w: 2.5 });
      }
      R.restore();
      commonDrawFlash(R, e);
    };
    return e;
  }

  // ---------- 暗器手（远程投掷） ----------
  function thrower(x, y) {
    var e = {
      type: 'thrower', name: '暗器手', x: x, y: y, vx: 0, vy: 0,
      hp: 22, maxHp: 22, facing: -1, state: 'walk', stateT: 0,
      r: 14, touchDmg: 10, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 150, speed: 70, shootCd: 1.4
    };
    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      commonUpdate(world, e, dt);
      e.stateT += dt; e.shootCd -= dt;
      var p = world.player;
      var d = p.x - e.x;
      e.facing = d > 0 ? 1 : -1;
      // 保持距离
      if (Math.abs(d) < 170) e.vx = -e.facing * e.speed;
      else if (Math.abs(d) > 280) e.vx = e.facing * e.speed;
      else e.vx = 0;
      if (e.shootCd <= 0 && e.state !== 'hurt' && Math.abs(d) < 360) {
        e.state = 'shoot'; e.stateT = 0; e.shootCd = 1.6;
      }
      if (e.state === 'shoot') {
        e.vx = 0;
        if (e.stateT >= 0.25 && !e.shot) {
          e.shot = true;
          var ang = U.angleTo(e.x, e.y - 16, p.x, p.y - 20);
          world.spawnProjectile('shuriken', e.x + e.facing * 16, e.y - 16, ang, 340, 1);
          War.Audio.sfx('shoot');
        }
        if (e.stateT >= 0.55) { e.state = 'walk'; e.stateT = 0; e.shot = false; }
      }
      if (e.state === 'hurt' && e.stateT > 0.28) { e.state = 'walk'; }
      e.vy = Math.min(e.vy + 1500 * dt, 900);
      e.x += e.vx * dt; e.y += e.vy * dt;
      var gy = world.groundY - 28;
      if (e.y >= gy) { e.y = gy; e.vy = 0; }
    };
    e.takeHit = function (world, dmg, opts) { damageSelf(world, e, dmg, opts); };
    e.die = function (world) {
      e.dead = true; e.vx = U.rand(-100, 100); e.vy = -380;
      world.addScore(e.score); world.emitFeathers(e.x, e.y, 5); War.Audio.sfx('kill');
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      R.save(); R.translate(px, py); R.scale(e.facing, 1);
      R.circle(0, -16, 11, { c: 'enemy', fill: true });
      R.rect(-8, -27, 16, 5, { c: 'enemyDark', fill: true });
      R.circle(3, -17, 2, { c: 'paperDark', fill: true });
      R.line(-12, 0, 12, 0, { c: 'enemy', w: 5 });
      R.line(8, -6, 24, -18, { c: 'inkMid', w: 3 });
      if (e.state === 'shoot') {
        R.circle(26, -20, 4, { c: 'enemyGlow', fill: true, glow: 4 });
        R.line(22, -18, 28, -22, { c: 'enemyDark', w: 2 });
      }
      R.restore();
      commonDrawFlash(R, e);
    };
    return e;
  }

  // ---------- 大盾（正面格挡） ----------
  function shield(x, y) {
    var e = {
      type: 'shield', name: '大盾', x: x, y: y, vx: 0, vy: 0,
      hp: 80, maxHp: 80, facing: -1, state: 'walk', stateT: 0,
      r: 20, touchDmg: 16, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 250, speed: 55, bashCd: 0
    };
    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      commonUpdate(world, e, dt);
      e.stateT += dt; e.bashCd -= dt;
      var p = world.player;
      var d = p.x - e.x;
      e.facing = d > 0 ? 1 : -1;
      if (e.state === 'hurt' && e.stateT > 0.3) { e.state = 'walk'; }
      if (Math.abs(d) < 46 && e.bashCd <= 0 && e.state !== 'hurt') {
        e.state = 'bash'; e.stateT = 0; e.bashCd = 1.4; e.atkDir = e.facing;
      }
      if (e.state === 'bash') {
        e.vx = e.atkDir * 300;
        if (e.stateT >= 0.2 && !e.hitDone) {
          e.hitDone = true;
          if (Math.abs(p.x - e.x) < 70) world.player.takeHit(world, 16, e.x, { kb: 340, shake: 0.5 });
        }
        if (e.stateT >= 0.4) { e.state = 'walk'; e.hitDone = false; }
      } else if (e.state === 'walk') {
        e.vx = e.facing * e.speed;
      } else { e.vx = 0; }
      e.vy = Math.min(e.vy + 1500 * dt, 900);
      e.x += e.vx * dt; e.y += e.vy * dt;
      var gy = world.groundY - 34;
      if (e.y >= gy) { e.y = gy; e.vy = 0; }
    };
    e.takeHit = function (world, dmg, opts) { damageSelf(world, e, dmg, opts); };
    e.die = function (world) {
      e.dead = true; e.vx = U.rand(-120, 120); e.vy = -300;
      world.addScore(e.score); world.emitFeathers(e.x, e.y, 6); world.shake(0.4); War.Audio.sfx('hitHeavy');
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      R.save(); R.translate(px, py); R.scale(e.facing, 1);
      // 大盾在前
      R.rect(-8, -44, 22, 40, { c: 'enemyDark', fill: true, rounded: 4, glow: 1 });
      R.rect(-4, -40, 14, 32, { c: 'enemy', fill: true, rounded: 3 });
      R.circle(4, -24, 5, { c: 'enemyGlow', stroke: true, w: 2, a: 0.8 });
      R.circle(-14, -14, 12, { c: 'enemy', fill: true });
      R.rect(-20, -26, 14, 6, { c: 'enemyDark', fill: true });
      R.circle(-10, -15, 2, { c: 'paperDark', fill: true });
      R.line(-26, 0, -8, 0, { c: 'enemy', w: 6 });
      R.restore();
      commonDrawFlash(R, e);
    };
    return e;
  }

  // ---------- 枪兵（突刺） ----------
  function spear(x, y) {
    var e = {
      type: 'spear', name: '枪兵', x: x, y: y, vx: 0, vy: 0,
      hp: 36, maxHp: 36, facing: -1, state: 'walk', stateT: 0,
      r: 15, touchDmg: 13, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 150, speed: 90, lungeCd: 0
    };
    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      commonUpdate(world, e, dt);
      e.stateT += dt; e.lungeCd -= dt;
      var p = world.player;
      var d = p.x - e.x;
      e.facing = d > 0 ? 1 : -1;
      if (e.state === 'hurt' && e.stateT > 0.28) { e.state = 'walk'; }
      if (Math.abs(d) > 120 && Math.abs(d) < 240 && e.lungeCd <= 0 && e.state !== 'hurt' && p.onGround) {
        e.state = 'lunge'; e.stateT = 0; e.lungeCd = 2.0; e.atkDir = e.facing;
      }
      if (e.state === 'lunge') {
        if (e.stateT < 0.35) e.vx = 0;
        else if (!e.hitDone) { e.vx = e.atkDir * 420; e.hitDone = true; War.Audio.sfx('whoosh'); }
        else e.vx = Math.max(0, e.vx - 500 * dt);
        if (e.stateT >= 0.2 && e.stateT <= 0.5 && Math.abs(p.x - e.x) < 60 && Math.sign(p.x - e.x) === e.atkDir && !e.hurtDone) {
          e.hurtDone = true;
          world.player.takeHit(world, 13, e.x, { kb: 300, shake: 0.4 });
        }
        if (e.stateT >= 0.6) { e.state = 'walk'; e.stateT = 0; e.hitDone = false; e.hurtDone = false; }
      } else if (e.state === 'walk') {
        e.vx = e.facing * e.speed;
      } else e.vx = 0;
      e.vy = Math.min(e.vy + 1500 * dt, 900);
      e.x += e.vx * dt; e.y += e.vy * dt;
      var gy = world.groundY - 30;
      if (e.y >= gy) { e.y = gy; e.vy = 0; }
    };
    e.takeHit = function (world, dmg, opts) { damageSelf(world, e, dmg, opts); };
    e.die = function (world) {
      e.dead = true; e.vx = U.rand(-80, 80); e.vy = -360;
      world.addScore(e.score); world.emitFeathers(e.x, e.y, 5); War.Audio.sfx('kill');
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      R.save(); R.translate(px, py); R.scale(e.facing, 1);
      R.circle(0, -17, 12, { c: 'enemy', fill: true });
      R.rect(-9, -28, 18, 5, { c: 'enemyDark', fill: true });
      R.circle(4, -18, 2.1, { c: 'paperDark', fill: true });
      R.line(-14, 0, 14, 0, { c: 'enemy', w: 5.5 });
      R.line(14, 0, 46, -4, { c: 'inkMid', w: 3 });
      R.line(46, -4, 58, -8, { c: 'enemy', w: 2.5 });
      R.line(46, -4, 58, 0, { c: 'enemy', w: 2.5 });
      if (e.state === 'lunge' && e.stateT > 0.35) R.line(14, 0, 52 + e.stateT * 40, -4, { c: 'enemyDark', w: 2.5 });
      R.restore();
      commonDrawFlash(R, e);
    };
    return e;
  }

  // ---------- 火球妖（远程） ----------
  function mage(x, y) {
    var e = {
      type: 'mage', name: '火球妖', x: x, y: y, vx: 0, vy: 0,
      hp: 30, maxHp: 30, facing: -1, state: 'float', stateT: 0,
      r: 15, touchDmg: 12, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 180, baseY: y, shootCd: 2.2, floatT: 0
    };
    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      commonUpdate(world, e, dt);
      e.stateT += dt; e.floatT += dt; e.shootCd -= dt;
      var p = world.player;
      var d = p.x - e.x;
      e.facing = d > 0 ? 1 : -1;
      // 漂浮
      e.y = e.baseY + Math.sin(e.floatT * 2.2) * 18;
      e.x = U.damp(e.x, p.x - e.facing * 200, 1.2, dt);
      e.vx = 0;
      if (e.shootCd <= 0 && e.state !== 'hurt') {
        e.state = 'cast'; e.stateT = 0; e.shootCd = 2.4;
      }
      if (e.state === 'cast') {
        if (e.stateT >= 0.4 && !e.shot) {
          e.shot = true;
          var ang = U.angleTo(e.x, e.y, p.x, p.y - 10);
          world.spawnProjectile('fireball', e.x + e.facing * 18, e.y - 6, ang, 210, 1);
          War.Audio.sfx('fireball');
        }
        if (e.stateT >= 0.7) { e.state = 'float'; e.shot = false; }
      }
      if (e.state === 'hurt' && e.stateT > 0.3) { e.state = 'float'; }
      e.vy = 0;
    };
    e.takeHit = function (world, dmg, opts) { damageSelf(world, e, dmg, opts); };
    e.die = function (world) {
      e.dead = true; e.vx = U.rand(-100, 100); e.vy = -300;
      world.addScore(e.score); world.emitFeathers(e.x, e.y, 6); War.Audio.sfx('kill');
      world.emitBurst(e.x, e.y, 'fire', 12);
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      R.save(); R.translate(px, py); R.scale(e.facing, 1);
      R.circle(0, 0, 14, { c: 'enemy', fill: true, glow: 2 });
      R.circle(0, 0, 9, { c: 'fire', fill: true, a: 0.4, glow: 6 });
      R.circle(3, -3, 2.2, { c: 'paperDark', fill: true });
      // 漂浮的火焰
      R.circle(-6, 12 + Math.sin(world.t * 8) * 2, 4, { c: 'fire', fill: true, glow: 5, a: 0.7 });
      R.circle(6, 14 + Math.sin(world.t * 7 + 2) * 2, 3, { c: 'fireGlow', fill: true, glow: 4, a: 0.7 });
      R.restore();
      commonDrawFlash(R, e);
    };
    return e;
  }

  // ---------- Boss 邪龙（骑车） ----------
  function boss(x, y) {
    var e = {
      type: 'boss', name: '邪龙', x: x, y: y, vx: 0, vy: 0,
      hp: 520, maxHp: 520, facing: -1, state: 'hover', stateT: 0,
      r: 40, touchDmg: 20, touchCd: 0, hitFlash: 0, stunLeft: 0, pullT: 0,
      dead: false, score: 3000, phase: 1, phaseChanged: false, summonCd: 0
    };
    var homeX = x, homeY = y;

    e.update = function (world, dt) {
      if (e.dead) { commonUpdate(world, e, dt); return; }
      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.stateT += dt; e.summonCd -= dt;
      var p = world.player;

      // 二阶段
      if (e.hp < e.maxHp * 0.5 && e.phase === 1) {
        e.phase = 2; e.phaseChanged = true;
        world.shake(1.4); world.slowMotion(0.3, 0.8);
        world.spawnFloat('怒火！', e.x, e.y - 70, 'boss');
        world.emitBurst(e.x, e.y - 20, 'fire', 24);
        War.Audio.sfx('boss');
      }

      if (e.state === 'hover') {
        // 环绕飞行
        e.stateT += dt;
        e.x = homeX + Math.sin(e.stateT * 0.8) * 150;
        e.y = homeY + Math.sin(e.stateT * 0.55) * 40;
        e.facing = p.x > e.x ? 1 : -1;
        if (e.stateT > 4.5) {
          if (e.summonCd <= 0 && e.phase === 2 && world.enemies.length < 8) {
            e.state = 'summon'; e.stateT = 0; e.summonCd = 9;
          } else if (p.onGround) {
            e.state = 'swoop'; e.stateT = 0;
            e.diveX = p.x; e.diveDir = Math.sign(p.x - e.x) || 1;
          } else {
            e.state = 'fire'; e.stateT = 0;
          }
        }
      } else if (e.state === 'swoop') {
        e.vx = e.diveDir * (e.phase === 2 ? 620 : 480);
        e.vy = e.phase === 2 ? 300 : 200;
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.y > world.groundY - 40 && e.stateT > 0.5) {
          world.shake(0.9); world.emitDust(e.x, world.groundY, 10);
          War.Audio.sfx('stomp');
          // 俯冲擦地波
          if (Math.abs(p.x - e.x) < 90) world.player.takeHit(world, 18, e.x, { kb: 360, shake: 0.6 });
          e.state = 'hover'; e.stateT = 0;
          e.vy = 0; e.vx = 0;
          homeX = e.x; homeY = world.groundY - 260;
        }
      } else if (e.state === 'fire') {
        if (e.stateT === 0 || (e.stateT < 1.0 && Math.floor(e.stateT / 0.3) !== Math.floor((e.stateT - dt) / 0.3))) {
          var n = e.phase === 2 ? 3 : 2;
          for (var i = 0; i < n; i++) {
            var ang = U.angleTo(e.x, e.y, p.x, p.y) + (i - (n - 1) / 2) * 0.25;
            world.spawnProjectile('fireball', e.x + Math.cos(ang) * 20, e.y + Math.sin(ang) * 20, ang, 230 + i * 30, 1);
          }
          War.Audio.sfx('fireball');
        }
        if (e.stateT > 1.2) { e.state = 'hover'; e.stateT = 0; }
      } else if (e.state === 'summon') {
        if (e.stateT >= 0.5 && !e.shot) {
          e.shot = true;
          world.spawnEnemy('grunt', e.x - 40, world.groundY - 30);
          world.spawnEnemy('grunt', e.x + 40, world.groundY - 30);
          world.spawnEnemy('thrower', e.x - 120, world.groundY - 28);
          world.spawnFloat('召集喽啰！', e.x, e.y - 60, 'boss');
        }
        if (e.stateT > 0.9) { e.state = 'hover'; e.stateT = 0; e.shot = false; }
      }
    };

    e.takeHit = function (world, dmg, opts) {
      damageSelf(world, e, dmg, opts);
      // Boss 不被击退太远
      if (opts && opts.kb) e.vx = Math.sign(opts.dir || 1) * Math.min(opts.kb, 60);
    };
    e.die = function (world) {
      e.dead = true;
      world.addScore(e.score);
      world.emitFeathers(e.x, e.y, 20);
      world.emitBurst(e.x, e.y, 'fire', 30);
      world.shake(2);
      world.slowMotion(0.25, 1.2);
      War.Audio.sfx('win');
      world.bossDefeated();
    };
    e.draw = function (world, R) {
      var px = e.x, py = e.y;
      var t = world.t;
      R.save(); R.translate(px, py);
      var f = e.facing;
      R.scale(f, 1);

      // 大铁车（Boss 的座驾）
      R.line(-30, 26, 34, 26, { c: 'enemyDark', w: 5 });
      R.circle(-26, 26, 22, { c: 'wheel', stroke: true, w: 4 });
      R.circle(32, 26, 22, { c: 'wheel', stroke: true, w: 4 });
      R.circle(-26, 26, 6, { c: 'enemy', fill: true });
      R.circle(32, 26, 6, { c: 'enemy', fill: true });
      R.line(-10, 26, 0, 0, { c: 'enemyDark', w: 5 });
      R.line(0, 0, 32, 26, { c: 'enemyDark', w: 5 });
      R.line(0, -6, 20, -14, { c: 'enemyDark', w: 4.5 });
      R.circle(20, -14, 3, { c: 'fireGlow', fill: true, glow: 3 });

      // 龙身（盘在车上）
      var flap = Math.sin(t * 4);
      R.quad(-6, -6, -18, -22, -28, -30, -34, -24, { c: 'boss', fill: true, glow: 2 });
      R.ellipse(0, -8, 22, 16, { c: 'boss', fill: true, glow: 3 });
      R.ellipse(4, -10, 15, 10, { c: 'bossGlow', fill: true, a: 0.5, glow: 2 });
      // 翅膀
      R.quad(8, -16, 26, -50, 34, -54, 40, -46, { c: 'boss', fill: true, glow: 1 });
      R.quad(10, -14, 30, -46, 40, -48, 44, -40, { c: 'bossGlow', fill: true, a: 0.4 });
      R.line(14, -20, 36, -48, { c: 'boss', w: 2.5 });
      R.line(20, -20, 40, -46, { c: 'boss', w: 2 });
      // 头 + 角
      R.quad(16, -14, 30, -22, 34, -24, 40, -22, { c: 'boss', fill: true });
      R.circle(42, -22, 9, { c: 'boss', fill: true, glow: 3 });
      R.line(44, -30, 40, -40, { c: 'fire', w: 2.5, glow: 3 });
      R.line(48, -29, 48, -39, { c: 'fire', w: 2.5, glow: 3 });
      R.circle(46, -24, 2.4, { c: 'fireGlow', fill: true, glow: 4 });
      // 龙尾
      R.quad(-20, -2, -38, 2, -46, -6, -52, 0, { c: 'boss', fill: true });
      R.line(-52, 0, -62, -4, { c: 'boss', w: 3, glow: 1 });
      R.line(-62, -4, -68, -10, { c: 'fire', w: 2, glow: 3 });

      // 血条框
      if (e.state === 'hurt' || e.hitFlash > 0) R.circle(px, py - 20, 40, { c: 'white', fill: true, a: e.hitFlash * 3 });

      R.restore();
    };
    return e;
  }

  return { make: make, hit: damageSelf };
})();
