/* =========================================================
   War.WeaponDraw · 兵器造型绘制
   每种 cls（刀剑/长兵/重兵/钩/棍棒/鞭/双持/链锤）的轮廓画法
   由 Player 在握住兵器的本地坐标系中调用
   o: { attack(攻击对象或null), atkK(0..1), atkDir('light'|'heavy'), t(世界时间) }
   ========================================================= */
War.WeaponDraw = (function () {
  function draw(R, w, o) {
    var c = 'weapon', g = 'weaponGlow';
    var ang, holdX = 22, holdY = -16;
    var atkK = o.atkK, atkDir = o.atkDir, t = o.t;
    // 挥动角度：idle 手持向后，攻击时随 atkK 前挥
    if (o.attack) {
      ang = -Math.PI * 0.6 + atkK * Math.PI * 1.15;
      if (atkDir === 'heavy') ang = -Math.PI * 0.9 + atkK * Math.PI * 1.4;
    } else {
      ang = -Math.PI * 0.62 + Math.sin(t * 3) * 0.06;
    }

    R.save();
    R.translate(holdX, holdY);
    R.rotate(ang);
    R.scale(1.15, 1.15);

    var cls = w.cls;
    if (cls === 'blade') {
      R.line(0, 0, 42, 0, { c: c, w: 4, glow: 1.5 });
      R.line(42, 0, 52, -2, { c: c, w: 2, glow: 2 });
      R.line(-6, -3, -6, 3, { c: g, w: 3 });
      R.line(-10, 0, 0, 0, { c: g, w: 2.5 });
      R.line(4, 0, 40, 0, { c: g, w: 1, a: 0.5 });
    } else if (cls === 'pole') {
      R.line(0, 0, 62, 0, { c: 'inkMid', w: 4 });
      R.line(0, 0, 62, 0, { c: c, w: 2, a: 0.7 });
      // 枪头
      R.line(62, 0, 74, -4, { c: c, w: 3 });
      R.line(62, 0, 74, 4, { c: c, w: 3 });
      R.line(62, 0, 78, 0, { c: g, w: 2.5, glow: 3 });
      if (w.name === '戟') {
        R.line(56, 0, 48, -8, { c: c, w: 2.5 });
        R.line(56, 0, 48, 8, { c: c, w: 2.5 });
      } else if (w.name === '叉') {
        R.line(62, 0, 76, -5, { c: c, w: 2 });
        R.line(62, 0, 76, 5, { c: c, w: 2 });
      }
      R.line(-8, 0, 6, 0, { c: g, w: 3 });
    } else if (cls === 'heavy') {
      R.line(-6, 0, 26, 0, { c: 'inkMid', w: 4 });
      R.circle(30, 0, 7, { c: c, fill: true, glow: 2 });
      R.rect(22, -6, 20, 12, { c: c, fill: true, glow: 2, rounded: 3 });
      R.line(26, -6, 26, 6, { c: g, w: 1.2, a: 0.7 });
      if (w.name === '锤') {
        R.rect(24, -9, 24, 18, { c: c, fill: true, glow: 2.5, rounded: 3 });
        R.line(28, -9, 28, 9, { c: g, w: 1.4, a: 0.8 });
      }
      R.line(-10, 0, -2, 0, { c: g, w: 2.5 });
    } else if (cls === 'hook') {
      R.line(-6, 0, 40, 0, { c: c, w: 3, glow: 1 });
      R.quad(40, 0, 52, -4, 56, -12, 58, -20, { c: c, stroke: true, w: 3, glow: 1.5 });
      R.line(58, -20, 62, -26, { c: g, w: 2.5, glow: 3 });
    } else if (cls === 'staff') {
      R.line(-4, 0, 48, 0, { c: 'inkMid', w: 4.5 });
      R.line(-4, 0, 48, 0, { c: c, w: 2, a: 0.6 });
      R.circle(-4, 0, 2.5, { c: g, fill: true });
      R.circle(48, 0, 2.5, { c: g, fill: true });
      if (w.name === '棍') {
        R.circle(10, 0, 3, { c: c, stroke: true, w: 2 });
        R.circle(34, 0, 3, { c: c, stroke: true, w: 2 });
      }
    } else if (cls === 'whip') {
      // 九节鞭：分段链 + 尾锤
      for (var i = 0; i < 7; i++) {
        var wx = i * 7, wy = Math.sin(i * 0.9 + t * 14) * 3;
        R.circle(wx, wy, 3.2, { c: c, fill: true });
        R.circle(wx, wy, 1.4, { c: g, fill: true, a: 0.8 });
        R.line(wx, wy, wx + 7, wy + Math.sin((i + 1) * 0.9 + t * 14) * 3, { c: c, w: 1.4, a: 0.7 });
      }
      R.circle(49, Math.sin(6.3 + t * 14) * 3, 4.5, { c: c, fill: true, glow: 2 });
    } else if (cls === 'dual') {
      R.line(0, 0, 30, 0, { c: c, w: 4 });
      R.line(30, 0, 38, -4, { c: c, w: 2.5 });
      R.line(-14, 0, -6, 0, { c: c, w: 3 });
      R.line(-6, -6, -6, 8, { c: c, w: 3.5 });
    } else if (cls === 'chain') {
      // 流星锤：链 + 旋转锤头（attack 时由 orbit 特效补充轨迹）
      var ballAng = t * 18;
      var bx = Math.cos(ballAng) * 34, by = Math.sin(ballAng) * 10;
      R.line(0, 0, bx, by, { c: 'inkMid', w: 1.6 });
      for (var j = 1; j <= 5; j++) {
        var k = j / 6;
        R.circle(bx * k, by * k, 1.2, { c: c, fill: true, a: 0.7 });
      }
      R.circle(bx, by, 6, { c: c, fill: true, glow: 3 });
      R.circle(bx, by, 2.5, { c: g, fill: true, glow: 5 });
    }

    R.restore();
  }

  return { draw: draw };
})();
