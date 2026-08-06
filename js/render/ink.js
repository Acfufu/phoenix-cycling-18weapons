/* =========================================================
   War.Render.ink · 水墨国风（基于共享基座 createCanvasStyle）
   宣纸纹理 / 墨滴晕染 / 飞白笔触 / 朱红点缀
   ========================================================= */
War.Render.ink = War.Render.createCanvasStyle({
  id: 'ink', name: 'Ink', nameZh: '水墨',

  palette: {
    bg1: '#f4ecd9', bg2: '#eee3c9', bg3: '#e3d4b3',
    paper: '#f4ecd9', paperDark: '#e3d4b3',
    sky: '#f2ead6', skyLight: '#faf5e8', cloud: 'rgba(244,236,217,0.8)',
    hill1: '#a08c6c', hill2: '#7a684e',
    moon: '#e8d9a8', sun: '#c23a2b',
    vine: '#4a5a3a', plant: '#6a7a4a', rock: '#4a3a2e',
    ground: '#2b211a', groundLine: '#1d1613', line: '#3a2e25',
    phoenix: '#c23a2b', phoenixDark: '#8f1f1a', phoenixLight: '#e86a3f',
    feather: '#c23a2b', fire: '#d84a2a', fireGlow: '#f0a030',
    bike: '#2b211a', bikeLight: '#5b4a3a', wheel: '#3a2e25',
    weapon: '#c9b06a', weaponGlow: '#e8c95a',
    enemy: '#3a3229', enemyDark: '#241d17', enemyGlow: '#6b5a3a',
    boss: '#23202b', bossGlow: '#6a3a3a',
    inkDark: '#1d1613', inkMid: '#4a3c2e', inkLight: '#8c7a5f',
    ui: '#2b211a', uiDim: '#7a6a52', uiAccent: '#c23a2b', uiText: '#2b211a',
    hp: '#c23a2b', hpBack: 'rgba(29,22,19,0.18)',
    combo: '#d84a2a', particle: '#c23a2b', white: '#ffffff'
  },

  glowMulLine: 2, glowMulShape: 2.2, glowMulFlat: 2, // 水墨逐方法不同：线2 圆/路径/曲线2.2 椭圆/矩形2
  quadSamples: 12, textFont: 'kai',
  glowShadowLine: function (c) { return War.Render.strToRgba(c, 0.9); },
  glowShadowCircle: function (c) { return War.Render.strToRgba(c, 0.85); },

  resize: function () { this.paperPattern = null; }, // 窗口变化后重建宣纸纹理

  // 墨滴晕染：外深内浅的径向渐变
  circleFill: function (ctx, col, x, y, r) {
    var R = War.Render;
    var g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, R.strToRgba(col, 0.55));
    g.addColorStop(0.7, col);
    g.addColorStop(1, R.strToRgba(col, 0.88));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  },

  beginFrame: function (world) {
    var R = War.Render;
    var ctx = this.ctx;
    var W = R.W, H = R.H, dpr = R.dpr;
    if (!this.paperPattern) this._makePaper();
    var cam = world.camera;
    var cx = cam.x + cam.shakeX, cy = cam.y + cam.shakeY;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 宣纸底
    ctx.fillStyle = this.paperPattern;
    ctx.fillRect(0, 0, W, H);

    // 大背景：朱红圆日
    var sunX = W - 170 - (cx - cam.x) * 0.02, sunY = 110 - (cy - cam.y) * 0.02;
    ctx.globalAlpha = 0.9;
    var sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 56);
    sg.addColorStop(0, 'rgba(240,160,48,0.9)');
    sg.addColorStop(0.55, 'rgba(194,58,43,0.75)');
    sg.addColorStop(1, 'rgba(194,58,43,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(sunX, sunY, 56, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

    // 远山（两层）
    var gy = world.groundY - cy;
    this._mountains(ctx, W, gy, (cx - cam.x) * 0.04, 'rgba(122,104,78,0.5)', 110, 1);
    this._mountains(ctx, W, gy, (cx - cam.x) * 0.09, 'rgba(74,60,46,0.62)', 70, 2);

    // 飞鸟（几笔 "人" 字）
    this._birds(ctx, W, (cx - cam.x) * 0.12, cy);

    // 墨色远坡
    this._mountains(ctx, W, gy, (cx - cam.x) * 0.16, 'rgba(43,33,26,0.7)', 46, 3);

    // 地面
    ctx.fillStyle = '#2b211a';
    ctx.fillRect(-40, gy - 2, W + 80, H - gy + 4);
    // 干笔飞白（地面顶缘）
    ctx.strokeStyle = 'rgba(232,226,206,0.5)';
    ctx.lineWidth = 1.4;
    var seed = Math.floor((cx - cam.x) * 0.5);
    for (var i = 0; i < 42; i++) {
      var sx = ((i * 89 + seed * 13) % (W + 60)) - 30;
      var sy = gy + ((i * 37) % 14);
      var sl = 10 + ((i * 53) % 26);
      ctx.globalAlpha = 0.08 + ((i * 7) % 10) * 0.02;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + sl, sy + (((i * 11) % 5) - 2));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 地面细线
    ctx.strokeStyle = 'rgba(29,22,19,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-40, gy); ctx.lineTo(W + 40, gy); ctx.stroke();

    // 世界坐标变换
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(-cx, -cy);
  },

  endFrame: function () {
    var ctx = this.ctx, R = War.Render;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    // 轻微暗角
    var vg = ctx.createRadialGradient(R.W / 2, R.H / 2, R.H * 0.45, R.W / 2, R.H / 2, R.H * 0.95);
    vg.addColorStop(0, 'rgba(30,22,16,0)');
    vg.addColorStop(1, 'rgba(30,22,16,0.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, R.W, R.H);
  }
});

War.Render.ink._makePaper = function () {
  var R = War.Render;
  var c = document.createElement('canvas');
  c.width = c.height = 224;
  var x = c.getContext('2d');
  x.fillStyle = '#f4ecd9';
  x.fillRect(0, 0, 224, 224);
  // 细噪点
  for (var i = 0; i < 1400; i++) {
    var a = Math.random() * 0.05;
    x.fillStyle = 'rgba(80,60,30,' + a.toFixed(3) + ')';
    x.fillRect(Math.random() * 224, Math.random() * 224, 1.4, 1.4);
  }
  // 墨渍
  for (var j = 0; j < 10; j++) {
    var bx = Math.random() * 224, by = Math.random() * 224, br = Math.random() * 8 + 3;
    var g = x.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, 'rgba(60,45,28,0.10)');
    g.addColorStop(1, 'rgba(60,45,28,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
  }
  this.paperPattern = this.ctx.createPattern(c, 'repeat');
};

War.Render.ink._mountains = function (ctx, W, gy, phase, color, amp, seed) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, gy + 4);
  for (var x = -20; x <= W + 20; x += 24) {
    var y = gy - (Math.sin((x + phase) * 0.011 + seed) * 0.5 + Math.sin((x + phase) * 0.027 + seed * 2.3) * 0.5) * amp - 4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 20, gy + 4);
  ctx.closePath();
  ctx.fill();
};

War.Render.ink._birds = function (ctx, W, phase, cy) {
  ctx.strokeStyle = 'rgba(29,22,19,0.55)';
  ctx.lineWidth = 1.6;
  for (var i = 0; i < 5; i++) {
    var bx = ((i * 431 + phase * 1.4) % (W + 240)) - 120;
    var by = 90 + ((i * 97) % 60) + Math.sin(phase * 0.02 + i) * 8 - cy * 0.1;
    var wing = 5 + (i % 3) * 2;
    ctx.beginPath();
    ctx.moveTo(bx - wing, by);
    ctx.quadraticCurveTo(bx, by - 4, bx + wing, by);
    ctx.stroke();
  }
};

War.Render.register(War.Render.ink);
