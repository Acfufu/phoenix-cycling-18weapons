/* =========================================================
   War.Modes.battle · 街机对战
   凤凰 vs 夜叉王（骑车），攻/防/冲撞 AI，血条对决
   ========================================================= */
War.Modes.battle = {
  id: 'battle', name: 'Battle', nameZh: '对战', desc: '与骑车夜叉王一决高下',
  keys: '←→ 移动 · J 攻击 · L 重击 · K 格挡 · 切兵器',


  start: function (world) {
    world.autoScroll = false;
    world.playerSpeed = 300;
    world.groundY = War.Render.H * 0.74;
    var p = world.player;
    p.x = War.Render.W * 0.28;
    p.y = p.groundY(world);
    var o = {
      x: War.Render.W * 0.74, y: world.groundY - 56,
      vx: 0, vy: 0, facing: -1, hp: 220, maxHp: 220,
      state: 'approach', stateT: 0, hitFlash: 0, invuln: 0, dead: false,
      atkCd: 0.8, blockChance: 0.3, aiT: 0, stun: 0,
      wheelRot: 0
    };
    world.battle = { opp: o, introT: 1.6, endT: 0 };
    War.Audio.sfx('start');
  },

  update: function (world, dt) {
    var b = world.battle;
    var o = b.opp;
    var p = world.player;
    if (b.introT > 0) b.introT -= dt;
    o.stateT += dt; o.aiT -= dt; o.atkCd -= dt;
    if (o.invuln > 0) o.invuln -= dt;
    if (o.hitFlash > 0) o.hitFlash -= dt;
    if (o.stun > 0) o.stun -= dt;

    // ---- 夜叉王 AI ----
    if (!o.dead && p.state !== 'hurt' && o.stun <= 0 && b.introT <= 0) {
      var d = p.x - o.x;
      o.facing = d > 0 ? 1 : -1;

      if (o.state === 'hurt') {
        if (o.stateT > 0.4) { o.state = 'approach'; o.stateT = 0; }
      } else if (o.atkCd <= 0 && Math.abs(d) < 120) {
        // 攻击：近身劈砍 / 重击
        o.state = 'attack'; o.stateT = 0;
        o.atkKind = Math.random() < 0.7 ? 'light' : 'heavy';
        o.atkDir = o.facing;
        War.Audio.sfx('swingHeavy');
        o.atkCd = 1.1 + Math.random() * 0.6;
      } else if (Math.abs(d) < 90 && o.aiT <= 0) {
        // 随机格挡一段时间
        if (Math.random() < o.blockChance) { o.state = 'block'; o.stateT = 0; o.aiT = 0.6 + Math.random() * 0.7; }
        else { o.state = 'approach'; o.aiT = 0.5; }
      } else if (Math.abs(d) < 260) {
        o.state = 'approach';
        o.vx = o.facing * 150;
      } else if (o.state !== 'block') {
        o.state = 'approach';
        o.vx = o.facing * 150;
      }
    }

    // 攻击结算
    if (o.state === 'attack') {
      o.vx = 0;
      if (o.stateT >= 0.28 && !o.hitDone) {
        o.hitDone = true;
        var reach = o.atkKind === 'heavy' ? 90 : 70;
        if (Math.abs(p.x - o.x) < reach && Math.abs(p.y - o.y) < 60 && Math.sign(p.x - o.x) === o.atkDir) {
          p.takeHit(world, o.atkKind === 'heavy' ? 16 : 11, o.x, { kb: 260, shake: 0.45 });
        }
      }
      if (o.stateT >= (o.atkKind === 'heavy' ? 0.6 : 0.45)) { o.state = 'approach'; o.stateT = 0; o.hitDone = false; }
    } else if (o.state === 'block') {
      o.vx = 0;
      if (o.stateT > 0.8 || (p.state === 'attack' && o.stateT > 0.2)) { o.state = 'approach'; o.stateT = 0; }
    } else if (o.state === 'hurt') {
      o.vx *= 0.8;
    } else if (o.state === 'approach') {
      if (Math.abs(p.x - o.x) > 150) o.vx = o.facing * 150;
      else o.vx = 0;
    }

    o.wheelRot += (o.vx / 19) * dt * 0.6;

    // 重力 + 移动
    o.vy = Math.min(o.vy + 1500 * dt, 900);
    o.x += o.vx * dt; o.y += o.vy * dt;
    var gy = world.groundY - 56;
    if (o.y >= gy) { o.y = gy; o.vy = 0; }

    // 玩家被击败 / 对手被击败
    if (p.dead && b.endT === 0) b.endT = 0.01;
    if (o.dead && b.endT === 0) b.endT = 0.01;
    if (b.endT > 0) {
      b.endT += dt;
      if (b.endT > 2.2) world.status = p.dead ? 'over' : 'win';
    }
  },

  hitOpponent: function (world, dmg, opts) {
    var o = world.battle.opp;
    if (o.dead || o.invuln > 0) return false;
    // 格挡：正面概率格挡
    if (o.state === 'block' && (Math.random() < 0.6)) {
      War.Audio.sfx('block');
      o.state = 'block'; o.stateT = 0;
      world.spawnFloat('格挡', o.x, o.y - 50, 'block');
      world.emitHitSparks(o.x - o.facing * 20, o.y - 30, 'weaponGlow');
      o.stun = 0.2;
      return true;
    }
    o.hp -= dmg;
    o.hitFlash = 0.16;
    o.invuln = 0.12;
    o.stun = Math.max(o.stun, opts.stun || 0.15);
    var dir = opts.dir || 1;
    o.vx = dir * (opts.kb || 120);
    o.vy = -(opts.kbUp || 40);
    o.state = 'hurt'; o.stateT = 0;
    world.comboHit(null, 1);
    world.spawnFloat(Math.round(dmg), o.x, o.y - 50, 'damage');
    world.emitHitSparks(o.x, o.y - 10, 'enemyGlow');
    War.Audio.sfx('hit');
    if (o.hp <= 0) {
      o.dead = true;
      o.dieT = world.t;
      world.shake(1.4);
      world.slowMotion(0.3, 0.8);
      world.emitFeathers(o.x, o.y, 14);
      world.emitBurst(o.x, o.y, 'fire', 16);
      War.Audio.sfx('win');
      world.spawnFloat('胜！', world.player.x, world.player.y - 60, 'combo');
    }
    return true;
  },

  drawOpponent: function (world, R) {
    var o = world.battle.opp;
    var t = world.t;
    R.save();
    R.translate(o.x, o.y);
    if (o.dead) R.rotate(Math.PI / 2 * Math.min(1, (world.t - o.dieT || 0) / 0.5));
    R.scale(o.facing, 1);

    // 车
    R.line(-26, 30, 28, 30, { c: 'enemyDark', w: 4 });
    R.circle(-22, 30, 19, { c: 'wheel', stroke: true, w: 3.5 });
    R.circle(26, 30, 19, { c: 'wheel', stroke: true, w: 3.5 });
    R.circle(-22, 30, 4, { c: 'enemy', fill: true });
    R.circle(26, 30, 4, { c: 'enemy', fill: true });
    R.line(-22, 30, -12, -2, { c: 'enemyDark', w: 3.5 });
    R.line(-12, -2, 14, -8, { c: 'enemyDark', w: 3.5 });
    R.line(14, -8, 26, 30, { c: 'enemyDark', w: 3.5 });
    R.line(20, -8, 22, -18, { c: 'enemyDark', w: 3.5 });

    // 夜叉王
    R.rect(-24, -16, 22, 6, { c: 'enemyDark', fill: true, rounded: 3 }); // 座
    R.circle(0, -16, 14, { c: 'enemy', fill: true, glow: 2 });
    R.ellipse(2, -18, 12, 14, { c: 'enemy', fill: true });
    // 头 + 角
    R.quad(6, -24, 8, -34, 12, -38, 16, -40, { c: 'enemy', fill: true });
    R.circle(14, -42, 8, { c: 'enemy', fill: true, glow: 2 });
    R.line(14, -49, 10, -58, { c: 'enemyGlow', w: 2.5, glow: 3 });
    R.line(19, -48, 24, -56, { c: 'enemyGlow', w: 2.5, glow: 3 });
    R.circle(18, -44, 2.2, { c: 'fireGlow', fill: true, glow: 4 });
    // 大刀
    var swing = o.state === 'attack' ? Math.sin(o.stateT * 14) * 0.9 : 0;
    R.save();
    R.translate(22, -16);
    R.rotate(-0.5 + swing);
    R.line(0, 0, 46, 0, { c: 'enemyDark', w: 4.5 });
    R.line(46, 0, 58, -3, { c: 'enemyGlow', w: 3, glow: 2 });
    R.line(-6, -4, -6, 4, { c: 'enemy', w: 3 });
    R.restore();
    // 火气
    if (o.state === 'block') R.circle(8, -30, 30, { c: 'enemyGlow', stroke: true, w: 2.5, glow: 8, a: 0.5 + 0.3 * Math.sin(t * 20) });

    R.restore();
    if (o.hitFlash > 0) R.circle(o.x, o.y - 20, 30, { c: 'white', fill: true, a: o.hitFlash * 3 });
  },

  hud: function (world, R) {
    var W = War.Render.W, H = War.Render.H;
    var o = world.battle.opp;
    var p = world.player;

    // 玩家血条（左）
    R.text('凤凰', 30, 40, { c: 'uiText', size: 16, font: 'ui', weight: 'bold' });
    R.rect(30, 48, 220, 16, { c: 'hpBack', fill: true, rounded: 4 });
    R.rect(30, 48, 220 * Math.max(0, p.hp / p.maxHp), 16, { c: 'hp', fill: true, rounded: 4 });
    R.text(Math.max(0, Math.round(p.hp)), 258, 62, { c: 'uiText', size: 13, font: 'ui', align: 'right' });

    // 对手血条（右）
    R.text('夜叉王', W - 30, 40, { c: 'uiAccent', size: 16, font: 'ui', weight: 'bold', align: 'right' });
    R.rect(W - 250, 48, 220, 16, { c: 'hpBack', fill: true, rounded: 4 });
    R.rect(W - 250, 48, 220 * Math.max(0, o.hp / o.maxHp), 16, { c: 'uiAccent', fill: true, rounded: 4 });
    R.text(Math.max(0, Math.round(o.hp)), W - 30, 62, { c: 'uiText', size: 13, font: 'ui', align: 'right' });

    R.text('兵器：' + p.getWeapon().name + ' · ' + p.getWeapon().tip, W / 2, 40, { c: 'uiDim', size: 15, align: 'center', font: 'kai' });
    if (world.battle.introT > 0) {
      R.text('对 阵 夜 叉 王', W / 2, H * 0.4, { c: 'uiAccent', size: 46, align: 'center', font: 'kai', weight: 'bold', stroke: 'paper', strokeW: 6, glow: 8, a: Math.min(1, world.battle.introT) });
      R.text('←→ 移动 · J 攻击 · L 重击 · K 格挡', W / 2, H * 0.4 + 46, { c: 'uiText', size: 16, align: 'center', font: 'ui', a: Math.min(1, world.battle.introT) });
    }
  }
};
War.Modes.register(War.Modes.battle);
