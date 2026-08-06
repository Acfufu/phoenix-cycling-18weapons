/* =========================================================
   War.Combat · 攻击结算
   招式 strokes 的命中判定 / 震地波 / 剑气波 / 环绕与旋转连击
   纯逻辑模块：只操作 world 对象（敌人/木人/对手/障碍/特效/音频），不碰引擎循环
   ========================================================= */
War.Combat = (function () {
  var U = War.utils;

  // ---- 招式落点单次范围结算 ----
  function resolveZone(w, zx, zy, r, stroke, player) {
    var i, e, dx, dy;
    // 敌人
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (e.dead) continue;
      dx = e.x - zx; dy = (e.y - 20) - zy;
      if (dx * dx + dy * dy <= (r + e.r) * (r + e.r)) {
        var dir = e.x > player.x ? 1 : -1;
        e.takeHit(w, stroke.damage, {
          kb: stroke.kb, kbUp: stroke.kbUp, dir: dir, stun: stroke.stun,
          pull: stroke.pull, toX: player.x, toY: player.y, fromX: player.x,
          bypass: stroke.bypass
        });
        War.Audio.sfx(stroke.damage >= 16 ? 'hitHeavy' : 'hit', { pitch: 0.9 + Math.random() * 0.3 });
        w.emitHitSparks(zx, zy, 'weaponGlow');
        if (stroke.kind === 'pull') w.emitFeathers(zx, zy, 4);
      }
    }
    // 对战对手
    var bt = w.battle;
    if (bt && bt.opp && !bt.opp.dead) {
      dx = bt.opp.x - zx; dy = (bt.opp.y - 16) - zy;
      if (dx * dx + dy * dy <= (r + 26) * (r + 26)) {
        var d2 = bt.opp.x > player.x ? 1 : -1;
        War.Modes.battle.hitOpponent(w, stroke.damage, { kb: stroke.kb, kbUp: stroke.kbUp, dir: d2, stun: stroke.stun });
        w.emitHitSparks(zx, zy, 'weaponGlow');
      }
    }
    // 障碍 / 木人
    w.checkObstaclesByZone(zx, zy, r);
    w.checkDummyByZone(zx, zy, r);
  }

  // ---- 旋转连击（棍/钺/镋等，多段持续） ----
  function resolveSpin(w, player, st, a) {
    var i, e;
    if (w.dummy && U.dist(player.x, player.y, w.dummy.x, w.dummy.y - 10) < st.r + w.dummy.r) {
      War.Modes.gallery.hitDummy(w, 12);
    }
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (e.dead) continue;
      if (e._spinCd && e._spinCd === a && e._spinT > 0) { e._spinT -= w.dt; continue; }
      var dx = e.x - player.x, dy = (e.y - 20) - player.y;
      if (dx * dx + dy * dy <= (st.r + e.r) * (st.r + e.r)) {
        var dir = e.x > player.x ? 1 : -1;
        e.takeHit(w, st.damage, { kb: st.kb, kbUp: st.kbUp, dir: dir, stun: st.stun, fromX: player.x });
        e._spinCd = a; e._spinT = 0.4;
        w.emitHitSparks(e.x, e.y - 20, 'weaponGlow');
        War.Audio.sfx('hit', { pitch: 1 + Math.random() * 0.2 });
      }
    }
    var bt = w.battle;
    if (bt && bt.opp && !bt.opp.dead) {
      var ox = bt.opp.x - player.x, oy = (bt.opp.y - 16) - player.y;
      if (ox * ox + oy * oy <= (st.r + 26) * (st.r + 26)) {
        War.Modes.battle.hitOpponent(w, st.damage, { kb: st.kb, kbUp: st.kbUp, dir: bt.opp.x > player.x ? 1 : -1, stun: st.stun });
      }
    }
  }

  // ---- 环绕连击（流星锤，轨道球持续判定） ----
  function resolveOrbit(w, player, st, a, dt) {
    var ang = a.orbitAngle + (a.t / a.dur) * U.TAU * (st.turns || 2.2);
    var dist = st.r * 0.55;
    var bx = player.x + Math.cos(ang) * dist;
    var by = player.y + Math.sin(ang) * dist * 0.7;
    a.orbitBall = { x: bx, y: by, r: st.r * 0.5, st: st, hits: a._orbitHits || (a._orbitHits = {}) };
    var i, e;
    if (w.dummy && U.dist(bx, by, w.dummy.x, w.dummy.y - 10) < st.r * 0.5 + w.dummy.r) {
      War.Modes.gallery.hitDummy(w, 10);
    }
    for (i = 0; i < w.enemies.length; i++) {
      e = w.enemies[i];
      if (e.dead) continue;
      if (e._orbitT && e._orbitT > 0) { e._orbitT -= dt; continue; }
      var dx = e.x - bx, dy = (e.y - 20) - by;
      var rr = st.r * 0.5 + e.r;
      if (dx * dx + dy * dy <= rr * rr) {
        var dir = e.x > player.x ? 1 : -1;
        e.takeHit(w, st.damage, { kb: st.kb, kbUp: st.kbUp, dir: dir, stun: st.stun, fromX: player.x });
        e._orbitT = 0.35;
        w.emitHitSparks(bx, by, 'weaponGlow');
        War.Audio.sfx('chain', { pitch: 1.2 });
      }
    }
    var bt = w.battle;
    if (bt && bt.opp && !bt.opp.dead) {
      var ox = bt.opp.x - bx, oy = (bt.opp.y - 16) - by;
      var orr = st.r * 0.5 + 26;
      if (ox * ox + oy * oy <= orr * orr) {
        War.Modes.battle.hitOpponent(w, st.damage, { kb: st.kb, kbUp: st.kbUp, dir: bt.opp.x > player.x ? 1 : -1, stun: st.stun });
      }
    }
  }

  // ---- 玩家一击：结算一个 stroke ----
  function applyStroke(w, player, stroke, attack) {
    if (stroke.kind === 'orbit') { attack.orbit = stroke; return; }
    var facing = attack.facing;
    var zx = player.x + stroke.off[0] * facing;
    var zy = player.y + stroke.off[1];
    switch (stroke.kind) {
      case 'wave':
        w.attacks.push({ type: 'wave', x: player.x + facing * 20, y: player.y, dir: facing, speed: stroke.speed || 500, dmg: stroke.damage, r: 26, kb: stroke.kb, kbUp: stroke.kbUp, t: 0, life: 1.2, color: player.getWeapon().cls });
        War.Audio.sfx('swingHeavy');
        break;
      case 'ring':
        w.attacks.push({ type: 'ring', x: zx, y: player.y, r0: 12, r1: stroke.r, t: 0, dur: 0.3, dmg: stroke.damage, kb: stroke.kb, kbUp: stroke.kbUp });
        War.Audio.sfx('swingHeavy');
        break;
      case 'stomp': {
        w.shake(0.6);
        War.Audio.sfx('stomp');
        w.emitDust(player.x, w.groundY, 14);
        var dirs = stroke.both ? [1, -1] : stroke.forward ? [1] : [1];
        for (var i = 0; i < dirs.length; i++) {
          w.attacks.push({ type: 'wave', x: player.x + dirs[i] * 26, y: w.groundY - 10, dir: dirs[i], speed: 560, dmg: stroke.damage, r: 24, kb: stroke.kb, kbUp: stroke.kbUp, t: 0, life: 1.1, ground: true, color: 'fire' });
        }
        w.emitHitSparks(player.x, w.groundY - 6, 'fire');
        break;
      }
      default:
        resolveZone(w, zx, zy, stroke.r, stroke, player);
    }
    // 招式特效
    if (stroke.kind === 'pull') {
      War.Audio.sfx('hook');
      w.emitFeathers(zx, zy, 3);
    }
  }

  // ---- 连续型招式（spin / orbit）每帧结算 ----
  function updateContinuous(w, player, dt) {
    var a = player.attack;
    if (!a) return;
    var strokes = a.strokes || [];
    for (var i = 0; i < strokes.length; i++) {
      var st = strokes[i];
      if ((st.kind === 'spin' || st.kind === 'orbit') && a.t / a.dur >= st.at) {
        if (st.kind === 'spin') {
          if (!a._spin) { a._spin = {}; w.emitSpinTrail(player, a); }
          resolveSpin(w, player, st, a);
        } else {
          if (!a._orbit) {
            a._orbit = true;
            a.orbitAngle = st.phase || 0;
            w.emitSpinTrail(player, a);
          }
          resolveOrbit(w, player, st, a, dt);
        }
      }
    }
  }

  // ---- 攻击波（wave / ring）每帧推进与命中 ----
  function updateAttack(w, a, dt) {
    a.t += dt;
    var i, e;
    if (a.type === 'wave') {
      a.x += a.dir * a.speed * dt;
      if (a.ground) a.y = w.groundY - 10;
      // 命中敌人
      for (i = w.enemies.length - 1; i >= 0; i--) {
        e = w.enemies[i];
        if (e.dead) continue;
        if (U.dist(a.x, a.y, e.x, e.y - 20) < a.r + e.r) {
          e.takeHit(w, a.dmg, { kb: a.kb, kbUp: a.kbUp, dir: a.dir, fromX: a.x });
          w.emitHitSparks(a.x, a.y, 'fire');
        }
      }
      var bt = w.battle;
      if (bt && bt.opp && !bt.opp.dead && U.dist(a.x, a.y, bt.opp.x, bt.opp.y - 16) < a.r + 26) {
        War.Modes.battle.hitOpponent(w, a.dmg, { kb: a.kb, kbUp: a.kbUp, dir: a.dir });
      }
      // 特效
      if (a.t % 0.03 < dt) w.emit(a.x, a.y, a.color === 'fire' ? 'fire' : 'weaponGlow', 'streak', { spread: 8, life: 0.3, size: 5, glow: 5, drag: 0 });
      if (a.t > a.life) a.dead = true;
    } else if (a.type === 'ring') {
      var k = a.t / a.dur;
      var rr = a.r0 + (a.r1 - a.r0) * Math.min(1, k);
      // 命中
      for (i = w.enemies.length - 1; i >= 0; i--) {
        e = w.enemies[i];
        if (e.dead) continue;
        var d = U.dist(e.x, e.y - 20, a.x, a.y);
        if (Math.abs(d - rr) < a.r1 * 0.35 + e.r) {
          e.takeHit(w, a.dmg, { kb: a.kb, kbUp: a.kbUp, dir: Math.sign(e.x - a.x) || 1, fromX: a.x });
          w.emitHitSparks(e.x, e.y - 20, 'weaponGlow');
        }
      }
      if (k % 0.1 < 0.01 || a.t === 0) {
        w.emit(a.x + rr, a.y, 'weaponGlow', 'ring', { life: 0.35, size: 8, glow: 5 });
      }
      if (k >= 1) a.dead = true;
    }
  }

  return {
    applyStroke: applyStroke,
    updateContinuous: updateContinuous,
    updateAttack: updateAttack,
    resolveZone: resolveZone
  };
})();
