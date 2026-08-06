/* =========================================================
   War.Render.neon · 霓虹赛博（基于共享基座 createCanvasStyle）
   暗底 + 发光描边 + 扫描线 + 暗角
   ========================================================= */
War.Render.neon = War.Render.createCanvasStyle({
  id: 'neon', name: 'Neon', nameZh: '霓虹',

  palette: {
    bg1: '#05020a', bg2: '#0a0512', bg3: '#140a20',
    paper: '#0a0512', paperDark: '#05020a',
    sky: '#0a0512', skyLight: '#140a20', cloud: 'rgba(124,58,255,0.25)',
    hill1: '#120a1e', hill2: '#0a0512',
    moon: '#00f0ff', sun: '#ff2fd6',
    vine: '#00ff9d', plant: '#39ff14', rock: '#3a3a5a',
    ground: '#0a0612', groundLine: '#ff2fd6', line: '#00f0ff',
    phoenix: '#ff2fd6', phoenixDark: '#7a0f6a', phoenixLight: '#00f0ff',
    feather: '#ff2fd6', fire: '#ff7a2f', fireGlow: '#ffd24a',
    bike: '#120a1e', bikeLight: '#00f0ff', wheel: '#7a3aff',
    weapon: '#00ff9d', weaponGlow: '#c8ff3a',
    enemy: '#ff3355', enemyDark: '#7a1230', enemyGlow: '#ff3355',
    boss: '#ff3355', bossGlow: '#ff2fd6',
    inkDark: '#05020a', inkMid: '#7a3aff', inkLight: '#c8a0ff',
    ui: '#fff', uiDim: 'rgba(255,255,255,0.45)', uiAccent: '#00f0ff', uiText: '#fff',
    hp: '#ff3355', hpBack: 'rgba(255,51,85,0.2)',
    combo: '#ffd24a', particle: '#00f0ff', white: '#ffffff'
  },

  glowMulLine: 3, glowMulShape: 3, glowMulFlat: 3,

  beginFrame: function (world) {
    var R = War.Render, ctx = this.ctx, W = R.W, H = R.H, dpr = R.dpr;
    var cam = world.camera;
    var cx = cam.x + cam.shakeX, cy = cam.y + cam.shakeY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 深空渐变
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05020a');
    g.addColorStop(0.6, '#0a0512');
    g.addColorStop(1, '#140a20');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // 星空
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (var i = 0; i < 40; i++) {
      var sx = (i * 97) % W, sy = (i * 53) % Math.floor(H * 0.5);
      ctx.fillRect(sx, sy, 2, 2);
    }
    // 霓虹日轮
    ctx.shadowColor = '#ff2fd6';
    ctx.shadowBlur = 40;
    ctx.fillStyle = '#ff2fd6';
    ctx.beginPath(); ctx.arc(W - 160, 110, 34, 0, 7); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(W - 146, 100, 26, 0, 7); ctx.fill();

    // 网格地平线（透视感）
    var gy = world.groundY - cy;
    ctx.strokeStyle = 'rgba(122,58,255,0.35)';
    ctx.lineWidth = 1.5;
    for (var k = 0; k < 7; k++) {
      var yOff = 20 + k * 26;
      ctx.beginPath();
      ctx.moveTo(0, gy + yOff);
      ctx.lineTo(W, gy + yOff);
      ctx.stroke();
    }
    // 汇聚网格
    ctx.strokeStyle = 'rgba(0,240,255,0.16)';
    for (var j = 0; j < 9; j++) {
      var gx = W / 2 + (j - 4) * 60;
      ctx.beginPath();
      ctx.moveTo(gx, gy - 40);
      ctx.lineTo(gx * 0.5 + W * 0.25, gy + 220);
      ctx.stroke();
    }

    // 地面
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(-40, gy, W + 80, H - gy + 4);
    ctx.shadowColor = '#ff2fd6';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff2fd6';
    ctx.fillRect(-40, gy, W + 80, 3);
    ctx.shadowBlur = 0;
    // 地面点阵
    ctx.fillStyle = '#7a3aff';
    for (var m = 0; m < 26; m++) {
      ctx.fillRect(((m * 71 + cx) % (W + 40)) - 20, gy + 8 + ((m * 37) % 16), 3, 3);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(-cx, -cy);
  },

  endFrame: function () {
    var R = War.Render, ctx = this.ctx, W = R.W, H = R.H, dpr = R.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 扫描线
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (var y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    // 暗角
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
});

War.Render.register(War.Render.neon);
