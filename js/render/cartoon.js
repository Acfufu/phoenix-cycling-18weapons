/* =========================================================
   War.Render.cartoon · 扁平卡通（基于共享基座 createCanvasStyle）
   亮色平涂 + 深色描边 + 圆润造型
   ========================================================= */
War.Render.cartoon = War.Render.createCanvasStyle({
  id: 'cartoon', name: 'Cartoon', nameZh: '卡通',

  palette: {
    bg1: '#aee3ff', bg2: '#d9f2ff', bg3: '#7ecdf5',
    paper: '#fff6e0', paperDark: '#ffe9b8',
    sky: '#aee3ff', skyLight: '#dff2ff', cloud: '#ffffff',
    hill1: '#8ad17a', hill2: '#6ab55e',
    moon: '#fff3b0', sun: '#ffd24a',
    vine: '#5aa24a', plant: '#79c95b', rock: '#9a8a9a',
    ground: '#8fbf6a', groundLine: '#5a8a44', line: '#4a3a4a',
    phoenix: '#ff5a3c', phoenixDark: '#d23a2a', phoenixLight: '#ffb03a',
    feather: '#ff8a3a', fire: '#ff8a3a', fireGlow: '#ffd24a',
    bike: '#5a4a6a', bikeLight: '#8a7a9a', wheel: '#3a2f4a',
    weapon: '#8a6a4a', weaponGlow: '#ffd24a',
    enemy: '#7a6a8a', enemyDark: '#5a4a6a', enemyGlow: '#ff8a5a',
    boss: '#7a3a5a', bossGlow: '#ff5a8a',
    inkDark: '#4a3a4a', inkMid: '#6a5a6a', inkLight: '#a090a0',
    ui: '#fff', uiDim: '#8a7a8a', uiAccent: '#ff5a3c', uiText: '#4a3a4a',
    hp: '#ff4a4a', hpBack: 'rgba(74,58,74,0.25)',
    combo: '#ff8a3a', particle: '#ffd24a', white: '#ffffff'
  },

  glowMulLine: 0, glowMulShape: 0,
  lineJoinRound: true,  // 卡通线条圆角接头
  textGlow: false,      // 卡通文字纯平涂，不发光
  outlineOnFill: true,  // 平涂后加深色描边，卡通标志特征

  beginFrame: function (world) {
    var R = War.Render, ctx = this.ctx, W = R.W, H = R.H, dpr = R.dpr;
    var cam = world.camera;
    var cx = cam.x + cam.shakeX, cy = cam.y + cam.shakeY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 天空渐变
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6fc2f0');
    g.addColorStop(0.65, '#aee3ff');
    g.addColorStop(1, '#dff2ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 太阳
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath(); ctx.arc(W - 140, 100, 40, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 4;
    for (var s = 0; s < 8; s++) {
      var a = s * Math.PI / 4 + world.t * 0.3;
      ctx.beginPath();
      ctx.moveTo(W - 140 + Math.cos(a) * 48, 100 + Math.sin(a) * 48);
      ctx.lineTo(W - 140 + Math.cos(a) * 58, 100 + Math.sin(a) * 58);
      ctx.stroke();
    }

    // 云
    this._cloud(ctx, W * 0.2 - (cx - cam.x) * 0.05, 90, 1);
    this._cloud(ctx, W * 0.55 - (cx - cam.x) * 0.07, 60, 0.8);
    this._cloud(ctx, W * 0.85 - (cx - cam.x) * 0.03, 150, 1.1);

    // 远山
    this._hill(ctx, W, 300 - cy * 0.3, (cx - cam.x) * 0.12, '#8ad17a', 120);
    this._hill(ctx, W, 330 - cy * 0.4, (cx - cam.x) * 0.2, '#6ab55e', 90);

    var gy = world.groundY - cy;
    // 地面（草地）
    ctx.fillStyle = '#79c95b';
    ctx.fillRect(-40, gy, W + 80, H - gy + 4);
    ctx.fillStyle = '#8fbf6a';
    ctx.fillRect(-40, gy, W + 80, 10);
    // 小草
    ctx.strokeStyle = '#5a8a44';
    ctx.lineWidth = 3;
    for (var i = 0; i < 26; i++) {
      var gx = (i * 137 + ((cx - cam.x) * 0.6)) % (W + 60) - 30;
      var gy2 = gy + 4;
      ctx.beginPath();
      ctx.moveTo(gx, gy2);
      ctx.quadraticCurveTo(gx + 2, gy2 - 8, gx + (i % 2 ? 5 : -3), gy2 - 12);
      ctx.stroke();
    }
    // 路沿
    ctx.fillStyle = '#5a8a44';
    ctx.fillRect(-40, gy - 6, W + 80, 6);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(-cx, -cy);
  },

  endFrame: function () {
    var R = War.Render, ctx = this.ctx;
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
  }
});

War.Render.cartoon._cloud = function (ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, 7);
  ctx.arc(x + 22 * s, y - 8 * s, 18 * s, 0, 7);
  ctx.arc(x + 44 * s, y, 20 * s, 0, 7);
  ctx.fill();
};

War.Render.cartoon._hill = function (ctx, W, baseY, phase, color, amp) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, baseY + 200);
  for (var x = -20; x <= W + 20; x += 30) {
    ctx.lineTo(x, baseY - Math.sin((x + phase) * 0.012) * amp * 0.5 - Math.sin((x + phase) * 0.03) * amp * 0.35);
  }
  ctx.lineTo(W + 20, baseY + 200);
  ctx.closePath(); ctx.fill();
};

War.Render.register(War.Render.cartoon);
