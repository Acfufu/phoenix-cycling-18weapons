/* =========================================================
   War.Render.pixel · 复古像素
   低分辨率离屏缓冲 + 整数倍放大（imageSmoothing=false）
   HUD 文字在主画布全分辨率绘制，保持清晰
   ========================================================= */
War.Render.pixel = {
  id: 'pixel', name: 'Pixel', nameZh: '像素',

  palette: {
    bg1: '#1a1033', bg2: '#2a1a4a', bg3: '#3a2a5a',
    paper: '#241e3a', paperDark: '#1a1430',
    sky: '#2a1a4a', skyLight: '#3a2a5a', cloud: '#4a3a6a',
    hill1: '#3a2a5a', hill2: '#2a1a4a',
    moon: '#ffd24a', sun: '#ff6b3d',
    vine: '#3a5a3a', plant: '#4a7a4a', rock: '#4a3a6a',
    ground: '#120a24', groundLine: '#ff6b3d', line: '#4a3a6a',
    phoenix: '#f0544f', phoenixDark: '#a51515', phoenixLight: '#ffa24b',
    feather: '#ff6b3d', fire: '#ff6b3d', fireGlow: '#ffd24a',
    bike: '#3a2a5a', bikeLight: '#6a5a8a', wheel: '#e6e1ec',
    weapon: '#ffe08a', weaponGlow: '#ffd24a',
    enemy: '#6a5a7a', enemyDark: '#3f3450', enemyGlow: '#8a7ab0',
    boss: '#4a2a3a', bossGlow: '#ff3355',
    inkDark: '#1a1430', inkMid: '#4a3a6a', inkLight: '#6a5a8a',
    ui: '#ffe08a', uiDim: '#8a7ab0', uiAccent: '#ff6b3d', uiText: '#fff',
    hp: '#ff3b3b', hpBack: 'rgba(26,20,48,0.7)',
    combo: '#ffd24a', particle: '#ffd24a', white: '#ffffff'
  },

  init: function (canvas) {
    this.mainCtx = canvas.getContext('2d');
    this.buf = document.createElement('canvas');
    this.bufCtx = this.buf.getContext('2d');
    this.ctx = this.bufCtx;
    this.s = 4;
  },

  resize: function (W, H, dpr) {
    this.W = W; this.H = H;
    this.bw = Math.max(160, Math.floor(W * 0.28));
    this.bh = Math.max(90, Math.floor(H * 0.28));
    this.buf.width = this.bw; this.buf.height = this.bh;
    this.sx = W / this.bw; this.sy = H / this.bh;
  },

  prepare: function (W, H, dpr) { this.resize(W, H, dpr); },

  beginFrame: function (world) {
    // 关键：本帧世界绘制必须画到离屏缓冲（endFrame 会切回主画布，这里重置）
    this.ctx = this.bufCtx;
    var ctx = this.bufCtx;
    var bw = this.bw, bh = this.bh;
    var cam = world.camera;
    var cx = cam.x + cam.shakeX, cy = cam.y + cam.shakeY;
    var s = bw / War.Render.W;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    // 底色
    ctx.fillStyle = '#1a1033';
    ctx.fillRect(0, 0, bw, bh);
    // 夜空渐变带
    ctx.fillStyle = '#2a1a4a';
    ctx.fillRect(0, 0, bw, bh * 0.7);
    ctx.fillStyle = '#3a2a5a';
    ctx.fillRect(0, bh * 0.5, bw, bh * 0.2);
    // 星星
    ctx.fillStyle = '#ffe08a';
    for (var i = 0; i < 26; i++) {
      var starX = (i * 61) % bw, starY = ((i * 37) % Math.floor(bh * 0.5));
      ctx.fillRect(starX, starY, 1, 1);
    }
    // 像素月亮
    var moonX = bw * 0.8, moonY = bh * 0.2;
    ctx.fillStyle = '#ffd24a';
    for (var my = 0; my < 8; my++) {
      var rowW = Math.round(Math.sin(Math.PI * my / 8) * 4);
      ctx.fillRect(moonX - rowW, moonY + my, rowW * 2, 1);
    }
    ctx.fillRect(moonX - 1, moonY - 2, 2, 1);
    ctx.fillRect(moonX - 2, moonY - 1, 4, 1);

    // 山脊（像素台阶）
    var gy = world.groundY * s - cy * s;
    this._ridge(ctx, bw, gy, '#3a2a5a', 30, 90, 3);
    this._ridge(ctx, bw, gy, '#2a1a4a', 55, 60, 5);
    this._ridge(ctx, bw, gy, '#1a1430', 80, 38, 7);

    // 地面
    ctx.fillStyle = '#120a24';
    ctx.fillRect(0, gy, bw, bh - gy);
    // 霓虹路沿
    ctx.fillStyle = '#ff6b3d';
    ctx.fillRect(0, gy, bw, 2);
    // 地面像素纹理
    ctx.fillStyle = '#2a1a4a';
    for (var g = 0; g < 24; g++) {
      ctx.fillRect(((g * 53 + (cx - cam.x) * s) % (bw + 8)) - 4, gy + 5 + ((g * 29) % 12), 2, 2);
    }

    // 世界坐标变换（buffer 空间）
    ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
  },

  _ridge: function (ctx, bw, gy, color, baseAmp, step, seed) {
    ctx.fillStyle = color;
    var x = 0;
    while (x < bw + 20) {
      var w = 8 + Math.abs(Math.sin(x * 0.05 + seed)) * 14;
      var h = baseAmp + Math.abs(Math.sin(x * 0.02 + seed * 2)) * 20;
      ctx.fillRect(x, gy - h, w, h + 20);
      x += w;
    }
  },

  endFrame: function () {
    var mc = this.mainCtx;
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.imageSmoothingEnabled = false;
    // 铺满整个 backing store（含 dpr 缩放），避免高 DPI 只显示左上角
    mc.drawImage(this.buf, 0, 0, mc.canvas.width, mc.canvas.height);
    mc.setTransform(War.Render.dpr, 0, 0, War.Render.dpr, 0, 0);
    this.ctx = this.mainCtx; // HUD 进入主画布
  },

  save: function () { this.ctx.save(); },
  restore: function () { this.ctx.restore(); },
  reset: function () { this.ctx.setTransform(War.Render.dpr, 0, 0, War.Render.dpr, 0, 0); },
  translate: function (x, y) { this.ctx.translate(x, y); },
  scale: function (sx, sy) { this.ctx.scale(sx, sy); },
  rotate: function (r) { this.ctx.rotate(r); },

  _snap: function (v) { return Math.round(v); },

  line: function (x1, y1, x2, y2, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    var col = R.resolveColor(this, o.c || 'line', o);
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, Math.round(o.w || 2));
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(this._snap(x1), this._snap(y1));
    ctx.lineTo(this._snap(x2), this._snap(y2));
    ctx.stroke();
    ctx.globalAlpha = 1;
  },

  circle: function (x, y, r, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    var col = R.resolveColor(this, o.c || 'line', o);
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, Math.round(o.w || 2));
    var cx = this._snap(x), cy = this._snap(y), cr = this._snap(r);
    if (o.fill) {
      // 用矩形近似圆（像素感）
      var d = cr * 2;
      ctx.fillRect(cx - cr, cy - cr, d, d);
      var core = Math.max(0, cr - 2);
      ctx.fillRect(cx - core, cy - core, core * 2, core * 2);
    }
    if (o.stroke) {
      ctx.strokeRect(cx - cr, cy - cr, d, d);
    }
    ctx.globalAlpha = 1;
  },

  ellipse: function (x, y, rx, ry, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.fillStyle = R.resolveColor(this, o.c || 'line', o);
    var cx = this._snap(x), cy = this._snap(y), w = Math.round(rx * 2), h = Math.round(ry * 2);
    ctx.fillRect(cx - Math.round(rx), cy - Math.round(ry), w, h);
    ctx.globalAlpha = 1;
  },

  rect: function (x, y, w, h, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.fillStyle = R.resolveColor(this, o.c || 'line', o);
    ctx.fillRect(this._snap(x), this._snap(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    ctx.globalAlpha = 1;
  },

  path: function (pts, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    if (!pts || pts.length < 2) return;
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.fillStyle = R.resolveColor(this, o.c || 'line', o);
    ctx.beginPath();
    ctx.moveTo(this._snap(pts[0][0]), this._snap(pts[0][1]));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(this._snap(pts[i][0]), this._snap(pts[i][1]));
    if (o.fill || o.closed) ctx.closePath();
    if (o.fill) ctx.fill();
    if (o.stroke) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, o.w || 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },

  quad: function (x1, y1, c1x, c1y, c2x, c2y, x2, y2, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    var pts = R.sampleQuad(x1, y1, c1x, c1y, c2x, c2y, x2, y2, 8);
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.fillStyle = R.resolveColor(this, o.c || 'line', o);
    ctx.beginPath();
    ctx.moveTo(this._snap(pts[0][0]), this._snap(pts[0][1]));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(this._snap(pts[i][0]), this._snap(pts[i][1]));
    if (o.fill) { ctx.closePath(); ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(1, o.w || 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },

  text: function (str, x, y, o) {
    o = o || {};
    var ctx = this.ctx, R = War.Render;
    ctx.globalAlpha = o.a != null ? o.a : 1;
    ctx.font = (o.weight || '') + ' ' + (o.size || 18) + 'px ' + (o.font ? R.fonts[o.font] : R.fonts.ui);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.stroke) {
      ctx.lineWidth = o.strokeW || 3;
      ctx.strokeStyle = R.resolveColor(this, o.stroke, {});
      ctx.strokeText(str, this._snap(x), this._snap(y));
    }
    ctx.fillStyle = R.resolveColor(this, o.c || 'uiText', o);
    ctx.fillText(str, this._snap(x), this._snap(y));
    ctx.globalAlpha = 1;
  }
};
War.Render.register(War.Render.pixel);
