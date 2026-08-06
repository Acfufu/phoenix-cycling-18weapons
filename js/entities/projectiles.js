/* =========================================================
   War.Projectiles · 投射物
   暗器（苦无）/ 火球；玩家剑气波由 world.attacks 的 wave/ring 处理
   team: 'player' | 'enemy'
   ========================================================= */
War.Projectiles = (function () {
  var U = War.utils;

  function make(type, x, y, angle, speed, team) {
    var p = {
      type: type, x: x, y: y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: type === 'fireball' ? 12 : 7,
      damage: type === 'fireball' ? 16 : 9,
      team: team, life: 4, t: 0, spin: U.rand(0, 6),
      dead: false
    };
    return p;
  }

  function update(world, p, dt) {
    p.t += dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.spin += dt * 10;
    if (p.type === 'fireball') p.vx *= Math.max(0, 1 - 0.4 * dt);
    if (p.life > 0 && p.t > p.life) p.dead = true;
    if (p.y > world.groundY + 20 || p.x < world.camera.x - 200 || p.x > world.camera.x + world.W + 400) p.dead = true;
    if (p.type === 'fireball' && p.t % 0.06 < dt) world.emit(p.x, p.y, 'fire', 'dot', { spread: 20, grav: -40, life: 0.4, size: 3 });

    // 碰撞
    if (p.dead) return;
    if (p.team === 'enemy') {
      var pl = world.player;
      if (!pl.dead && U.dist(p.x, p.y, pl.x, pl.y - 8) < p.r + 26) {
        p.dead = true;
        pl.takeHit(world, p.damage, p.x, { kb: 200, shake: 0.4 });
        if (p.type === 'fireball') { world.emitBurst(p.x, p.y, 'fire', 8); War.Audio.sfx('explode'); }
      }
    } else {
      // 玩家弹道（被反弹的暗器）命中敌人
      for (var i = 0; i < world.enemies.length; i++) {
        var e = world.enemies[i];
        if (e.dead) continue;
        if (U.dist(p.x, p.y, e.x, e.y - 20) < p.r + e.r) {
          p.dead = true;
          e.takeHit(world, p.damage * 2, { kb: 200, kbUp: 60, dir: Math.sign(p.vx) || 1 });
          world.emitHitSparks(p.x, p.y, 'weaponGlow');
          return;
        }
      }
    }
  }

  function draw(world, R, p) {
    if (p.type === 'shuriken') {
      R.save(); R.translate(p.x, p.y); R.rotate(p.spin);
      R.line(-7, 0, 7, 0, { c: 'enemyGlow', w: 2.5, glow: 2 });
      R.line(0, -7, 0, 7, { c: 'enemyGlow', w: 2.5, glow: 2 });
      R.circle(0, 0, 2.5, { c: 'enemy', fill: true });
      R.restore();
    } else if (p.type === 'fireball') {
      R.circle(p.x, p.y, 12, { c: 'fire', fill: true, glow: 12 });
      R.circle(p.x, p.y, 7, { c: 'fireGlow', fill: true, glow: 16 });
      R.circle(p.x + 3, p.y - 3, 4, { c: 'paperDark', fill: true, a: 0.4 });
    }
  }

  return {
    make: make,
    update: update,
    draw: draw
  };
})();
