/* =========================================================
   War.Particles · 粒子系统
   形状：dot / spark / streak / feather / ink / pixel / ring / smoke / star / shard / leaf
   语义色随渲染器 palette 走，实现"同一粒子、四套观感"
   ========================================================= */
War.Particles = (function () {
  var list = [];

  function emit(o) {
    var p = {
      x: o.x, y: o.y,
      vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.6, t: 0,
      size: o.size || 4,
      color: o.color || 'particle',
      shape: o.shape || 'dot',
      grav: o.grav || 0,
      drag: o.drag != null ? o.drag : 0,
      fade: o.fade != null ? o.fade : true,
      glow: o.glow || 0,
      rot: o.rot || 0, vr: o.vr || 0,
      jitter: o.jitter || 0,
      alphaMul: o.alphaMul != null ? o.alphaMul : 1,
      wobble: o.wobble || 0
    };
    list.push(p);
    return p;
  }

  // 便捷：一次喷发 N 个
  function burst(o, n) {
    var i;
    for (i = 0; i < n; i++) {
      emit({
        x: o.x, y: o.y,
        vx: o.vx != null ? o.vx : War.utils.rand(-o.spread || 80, o.spread || 80),
        vy: o.vy != null ? o.vy : War.utils.rand(-o.spread || 80, o.spread || 80),
        life: o.life != null ? o.life : War.utils.rand(0.3, 0.7),
        size: o.size != null ? o.size : War.utils.rand(2, 5),
        color: o.color || 'particle', shape: o.shape || 'dot',
        grav: o.grav || 0, drag: o.drag || 0, glow: o.glow || 0,
        jitter: o.jitter || 0, alphaMul: o.alphaMul, wobble: o.wobble
      });
    }
  }

  function update(dt) {
    var i, p, dr;
    for (i = list.length - 1; i >= 0; i--) {
      p = list[i];
      p.t += dt;
      if (p.t >= p.life) { list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.wobble) { p.x += Math.sin(p.t * p.wobble) * 14 * dt; p.y += Math.cos(p.t * p.wobble) * 14 * dt; }
      if (p.jitter) { p.x += (Math.random() - 0.5) * p.jitter; p.y += (Math.random() - 0.5) * p.jitter; }
    }
  }

  function draw(R) {
    var p, k, alpha, size, a, r, i;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      k = p.t / p.life;
      alpha = p.fade ? (1 - k) : 1;
      alpha *= p.alphaMul;
      size = p.size * (1 - k * 0.55);
      if (alpha <= 0.01) continue;
      switch (p.shape) {
        case 'dot':
          R.circle(p.x, p.y, Math.max(0.5, size * 0.5), { c: p.color, fill: true, glow: p.glow, a: alpha });
          break;
        case 'spark':
          R.line(p.x, p.y, p.x - p.vx * 0.028, p.y - p.vy * 0.028, { c: p.color, w: Math.max(1, size * 0.14), glow: p.glow, a: alpha });
          break;
        case 'streak':
          R.line(p.x, p.y, p.x - p.vx * 0.055, p.y - p.vy * 0.055, { c: p.color, w: Math.max(1, size * 0.1), glow: p.glow, a: alpha });
          break;
        case 'feather':
          r = Math.atan2(p.vy, p.vx);
          R.quad(
            p.x, p.y,
            p.x + Math.cos(r + 0.7) * size, p.y + Math.sin(r + 0.7) * size,
            p.x + Math.cos(r) * size * 1.4, p.y + Math.sin(r) * size * 1.4,
            p.x + Math.cos(r - 0.7) * size, p.y + Math.sin(r - 0.7) * size,
            { c: p.color, fill: true, a: alpha, glow: p.glow }
          );
          break;
        case 'ink':
          R.circle(p.x + Math.sin(p.t * 6) * size * 0.12, p.y, Math.max(0.8, size * (0.4 + 0.3 * Math.sin(p.rot))), { c: p.color, fill: true, a: alpha * 0.8, glow: p.glow });
          break;
        case 'pixel':
          a = Math.max(2, Math.round(size));
          R.rect(Math.round(p.x), Math.round(p.y), a, a, { c: p.color, fill: true, a: alpha });
          break;
        case 'ring':
          R.circle(p.x, p.y, size * (0.35 + k * 0.65), { c: p.color, stroke: true, w: Math.max(1, size * 0.08), a: alpha, glow: p.glow });
          break;
        case 'smoke':
          R.circle(p.x, p.y, Math.max(0.8, size * (0.4 + k * 0.7)), { c: p.color, fill: true, a: alpha * 0.45 });
          break;
        case 'star': {
          var pts = [];
          for (var s = 0; s < 10; s++) {
            var ang = (Math.PI / 5) * s + p.rot;
            var rr = s % 2 === 0 ? size : size * 0.45;
            pts.push([p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr]);
          }
          R.path(pts, { c: p.color, fill: true, a: alpha, glow: p.glow });
          break;
        }
        case 'shard':
          r = p.rot;
          R.line(p.x, p.y, p.x + Math.cos(r) * size, p.y + Math.sin(r) * size, { c: p.color, w: Math.max(1, size * 0.16), a: alpha, glow: p.glow });
          break;
        case 'leaf':
          r = Math.atan2(p.vy, p.vx);
          R.quad(
            p.x, p.y,
            p.x + Math.cos(r + 0.9) * size * 0.5, p.y + Math.sin(r + 0.9) * size * 0.5,
            p.x + Math.cos(r) * size, p.y + Math.sin(r) * size,
            p.x + Math.cos(r - 0.9) * size * 0.5, p.y + Math.sin(r - 0.9) * size * 0.5,
            { c: p.color, fill: true, a: alpha * 0.9 }
          );
          break;
      }
    }
  }

  function clear() { list.length = 0; }
  function count() { return list.length; }

  return { emit: emit, burst: burst, update: update, draw: draw, clear: clear, count: count };
})();
