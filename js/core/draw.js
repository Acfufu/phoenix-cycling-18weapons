/* =========================================================
   War.Draw · 绘制辅助
   世界空间的战斗道具绘制（障碍/木人/攻击波/轨道球/横幅）
   屏幕空间的 HUD（通用/飘字/覆盖层）
   引擎只做编排，具体画法都收敛在本模块
   ========================================================= */
War.Draw = (function () {
  var U = War.utils;

  // ---- 世界空间 ----
  function obstacle(R, o, w) {
    var flash = o.flash > 0;
    if (o.type === 'smash') {
      // 石灯柱（可砸碎）
      R.rect(o.x - 16, o.y - 30, 32, 30, { c: flash ? 'white' : 'rock', fill: true, rounded: 4 });
      R.rect(o.x - 20, o.y - 6, 40, 10, { c: flash ? 'white' : 'rock', fill: true, rounded: 3 });
      R.circle(o.x, o.y - 32, 12, { c: flash ? 'white' : 'fireGlow', fill: true, glow: 4 });
    } else if (o.type === 'jump') {
      // 火盆
      R.rect(o.x - 20, o.y - 14, 40, 16, { c: flash ? 'white' : 'rock', fill: true, rounded: 4 });
      R.circle(o.x, o.y - 14, 9, { c: 'fire', fill: true, glow: 8 });
      R.circle(o.x, o.y - 16, 5, { c: 'fireGlow', fill: true, glow: 10 });
    } else {
      // 低横木
      R.rect(o.x - 30, o.y - 8, 60, 12, { c: flash ? 'white' : 'inkMid', fill: true, rounded: 4 });
    }
  }

  function dummy(R, w) {
    var d = w.dummy;
    var tilt = d.knock > 0 ? 0.3 : 0;
    R.save();
    R.translate(d.x, d.y);
    R.rotate(tilt * (d.knock > 0 ? 1 : 0));
    R.rect(-14, -50, 28, 52, { c: 'inkMid', fill: true, rounded: 5 });
    R.rect(-6, -8, 12, 10, { c: 'inkLight', fill: true, rounded: 3 });
    R.circle(0, -56, 13, { c: 'inkMid', fill: true });
    R.line(0, -68, -3, -74, { c: 'inkLight', w: 2.5 });
    R.line(0, -68, 3, -74, { c: 'inkLight', w: 2.5 });
    R.circle(3, -58, 2, { c: 'inkLight', fill: true });
    R.circle(16, -34, 4, { c: 'inkLight', fill: true });
    R.circle(-16, -34, 4, { c: 'inkLight', fill: true });
    R.restore();
    if (d.hitFlash > 0) R.circle(d.x, d.y - 30, 30, { c: 'white', fill: true, a: d.hitFlash * 3 });
  }

  function attack(R, a) {
    if (a.type === 'wave') {
      var k = 1 - Math.min(a.t / a.life, 1);
      R.quad(
        a.x - a.dir * 26, a.y,
        a.x - a.dir * 6, a.y - 16 * k,
        a.x + a.dir * 10, a.y - 10 * k,
        a.x + a.dir * 26, a.y,
        { c: a.color === 'fire' ? 'fire' : 'weaponGlow', fill: true, a: 0.85 * k, glow: 6 }
      );
    } else if (a.type === 'ring') {
      var rr = a.r0 + (a.r1 - a.r0) * Math.min(a.t / a.dur, 1);
      R.circle(a.x, a.y, rr, { c: 'weaponGlow', stroke: true, w: 4, glow: 8, a: 1 - Math.min(a.t / a.dur, 1) });
    }
  }

  function orbitBall(R, w) {
    var a = w.player.attack;
    if (!a || !a.orbitBall) return;
    var b = a.orbitBall;
    // 链条
    R.line(w.player.x + 8, w.player.y - 6, b.x, b.y, { c: 'inkMid', w: 1.6 });
    var n = 6, i;
    for (i = 1; i <= n; i++) {
      var k = i / (n + 1);
      R.circle(w.player.x + (b.x - w.player.x) * k, w.player.y - 6 + (b.y - (w.player.y - 6)) * k, 1.4, { c: 'weapon', fill: true, a: 0.8 });
    }
    R.circle(b.x, b.y, b.r, { c: 'weapon', fill: true, glow: 5 });
    R.circle(b.x, b.y, b.r * 0.5, { c: 'weaponGlow', fill: true, glow: 6 });
  }

  function banners(R, w) {
    for (var i = 0; i < w.banners.length; i++) {
      var b = w.banners[i];
      var k = b.t / b.life;
      var alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.7) / 0.3);
      var rise = k * 14;
      R.text(b.text, b.x, b.y - rise, {
        c: 'uiAccent', size: 34, align: 'center', font: 'kai', weight: 'bold',
        a: Math.max(0, alpha), stroke: 'paper', strokeW: 6, glow: 6
      });
    }
  }

  // ---- 屏幕空间 HUD ----
  function commonHud(R, w) {
    var RW = War.Render;
    var W = RW.W;
    if (w.status !== 'play') return;
    // 兵器 chip（左下）
    var weapon = w.player.getWeapon();
    R.rect(14, RW.H - 64, 150, 44, { c: 'paper', fill: true, a: 0.8, rounded: 10 });
    R.rect(14, RW.H - 64, 150, 44, { c: 'uiAccent', stroke: true, w: 1.5, rounded: 10, a: 0.5 });
    R.text(weapon.char, 34, RW.H - 32, { c: 'uiAccent', size: 26, align: 'center', font: 'kai', weight: 'bold' });
    R.text(weapon.name, 66, RW.H - 40, { c: 'uiText', size: 16, font: 'ui', weight: 'bold' });
    R.text(weapon.tip, 66, RW.H - 26, { c: 'uiDim', size: 12, font: 'ui' });

    // 连击（右下）
    if (w.combo >= 2 && w.comboTimer > 0) {
      var pulse = 1 + Math.sin(w.t * 12) * 0.06;
      R.text(w.combo + ' 连击!', RW.W - 20, RW.H - 40, {
        c: 'combo', size: 30 * pulse, align: 'right', font: 'kai', weight: 'bold', glow: 8
      });
    }

    // 血条（左上，闯关/跑酷）
    if (w.mode.id !== 'battle') {
      R.rect(20, 20, 200, 14, { c: 'hpBack', fill: true, rounded: 5 });
      R.rect(20, 20, 200 * Math.max(0, w.player.hp / w.player.maxHp), 14, { c: 'hp', fill: true, rounded: 5 });
      R.text('凤凰', 20, 50, { c: 'uiText', size: 14, font: 'ui', weight: 'bold' });
      // 得分
      R.text(String(Math.floor(w.score)), 20, 70, { c: 'uiText', size: 20, font: 'mono', weight: 'bold' });
      R.text('兵器 ' + (w.player.weaponIdx + 1) + '/18', 20, 92, { c: 'uiDim', size: 12, font: 'ui' });
    }
  }

  function floats(R, w) {
    for (var i = 0; i < w.floats.length; i++) {
      var f = w.floats[i];
      var k = f.t / f.life;
      var sx = f.x - w.camera.x;
      var sy = f.y - w.camera.y;
      R.text(f.text, sx, sy, {
        c: f.color, size: 18 + k * 4, align: 'center', font: 'ui', weight: 'bold',
        a: k < 0.1 ? k / 0.1 : 1 - Math.max(0, (k - 0.6) / 0.4), stroke: 'paper', strokeW: 4, glow: 3
      });
    }
  }

  function overlays(R, w) {
    if (!R) return; // 渲染器未就绪时静默跳过（与原 engine.drawOverlays 行为一致）
    var W = War.Render.W, H = War.Render.H;
    R.save(); R.reset();

    // 闪光
    for (var i = 0; i < w.flashes.length; i++) {
      var fl = w.flashes[i];
      R.rect(0, 0, W, H, { c: fl.color, fill: true, a: 1 - fl.t / fl.dur });
    }

    if (w.status === 'over') {
      R.rect(0, 0, W, H, { c: 'rgba(10,6,12,0.66)', fill: true });
      R.text('败 阵', W / 2, H * 0.42, { c: 'uiAccent', size: 60, align: 'center', font: 'kai', weight: 'bold', glow: 8 });
      R.text('得分 ' + Math.floor(w.score), W / 2, H * 0.42 + 60, { c: 'uiText', size: 22, align: 'center', font: 'ui' });
      R.text('Enter / R 再战 · Esc 返回', W / 2, H * 0.42 + 96, { c: 'uiDim', size: 16, align: 'center', font: 'ui' });
    } else if (w.status === 'win') {
      R.rect(0, 0, W, H, { c: 'rgba(24,6,8,0.6)', fill: true });
      R.text('旗 开 得 胜', W / 2, H * 0.42, { c: 'combo', size: 60, align: 'center', font: 'kai', weight: 'bold', glow: 10 });
      R.text('得分 ' + Math.floor(w.score), W / 2, H * 0.42 + 60, { c: 'uiText', size: 22, align: 'center', font: 'ui' });
      R.text('Enter / R 再来一局 · Esc 返回', W / 2, H * 0.42 + 96, { c: 'uiDim', size: 16, align: 'center', font: 'ui' });
    }

    R.restore();
  }

  return {
    obstacle: obstacle, dummy: dummy, attack: attack, orbitBall: orbitBall, banners: banners,
    commonHud: commonHud, floats: floats, overlays: overlays
  };
})();
