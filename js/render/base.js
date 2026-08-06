/* =========================================================
   War.Render.createCanvasStyle · 共享渲染基座
   三个"平面画布"渲染器（水墨/卡通/霓虹）共用同一套图元实现，
   通过 spec 参数化视觉差异，保证与重构前逐像素等价。
   像素渲染器因离屏缓冲+整数取整，独立实现，不继承本基座。
   spec 字段：
     id/name/nameZh/palette
     glowMulLine   线条辉光 blur 倍率（卡通 0 = 关闭）
     glowMulShape  圆/路径/曲线的辉光倍率
     glowMulFlat   椭圆/矩形的辉光倍率（水墨逐方法不同，需分别指定）
     glowShadowLine / glowShadowCircle  线条/圆的辉光阴影色函数（收基色，回阴影色）
     quadSamples   quad 贝塞尔采样数（水墨 12，卡通/霓虹 10）
     lineJoinRound 线条是否圆角接头（卡通 true）
     textGlow      文字是否发光（卡通 false）
     textFont      文字默认字体键（水墨 kai，卡通/霓虹 ui）
     circleFill(ctx, col, x, y, r)  圆填充画法（水墨用墨滴渐变）
     outlineOnFill  填充后加深色描边（卡通）
     resize(W, H, dpr)  可选：窗口变化钩子
     beginFrame(ctx, world) / endFrame(ctx)  背景与后处理
   ========================================================= */
War.Render.createCanvasStyle = function (spec) {
  var R = War.Render;
  var style = {
    id: spec.id, name: spec.name, nameZh: spec.nameZh,
    palette: spec.palette,
    glowMulLine: spec.glowMulLine || 0,
    glowMulShape: spec.glowMulShape || 0,
    glowMulFlat: spec.glowMulFlat != null ? spec.glowMulFlat : (spec.glowMulShape || 0),
    quadSamples: spec.quadSamples || 10,
    lineJoinRound: !!spec.lineJoinRound,
    textGlow: spec.textGlow !== false,
    textFont: spec.textFont || 'ui',
    outlineOnFill: !!spec.outlineOnFill,

    init: function (canvas) { this.ctx = canvas.getContext('2d'); },
    resize: function (W, H, dpr) { if (spec.resize) spec.resize.call(this, W, H, dpr); },
    prepare: function () {},
    beginFrame: spec.beginFrame,
    endFrame: spec.endFrame,

    save: function () { this.ctx.save(); },
    restore: function () { this.ctx.restore(); },
    reset: function () { this.ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0); },
    translate: function (x, y) { this.ctx.translate(x, y); },
    scale: function (sx, sy) { this.ctx.scale(sx, sy); },
    rotate: function (r) { this.ctx.rotate(r); },

    // 计算辉光阴影色：水墨用固定 alpha（对未混入 o.a 的基色），霓虹跟随元素 o.a
    _glowShadow: function (o, fn) {
      if (fn) return fn(R.resolveColor(this, o.c || 'line', {}));
      return R.resolveColor(this, o.c || 'line', o);
    },
    _glow: function (shadowColor, mul) {
      var ctx = this.ctx;
      if (mul) { ctx.shadowColor = shadowColor; ctx.shadowBlur = mul; }
    },
    _clear: function () {
      var ctx = this.ctx;
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.setLineDash && ctx.setLineDash([]);
    },

    line: function (x1, y1, x2, y2, o) {
      o = o || {};
      var ctx = this.ctx;
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulLine) {
        this._glow(this._glowShadow(o, spec.glowShadowLine), o.glow * this.glowMulLine);
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = o.w || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = this.lineJoinRound ? 'round' : 'miter';
      if (o.dash) ctx.setLineDash(o.dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      this._clear();
    },

    circle: function (x, y, r, o) {
      o = o || {};
      var ctx = this.ctx;
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulShape) {
        this._glow(this._glowShadow(o, spec.glowShadowCircle || spec.glowShadowLine), o.glow * this.glowMulShape);
      }
      if (o.fill) {
        if (spec.circleFill) spec.circleFill(ctx, col, x, y, r);
        else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      }
      if (o.stroke) {
        ctx.strokeStyle = col;
        ctx.lineWidth = o.w || 2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
      }
      this._clear();
    },

    ellipse: function (x, y, rx, ry, o) {
      o = o || {};
      var ctx = this.ctx;
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulFlat) this._glow(col, o.glow * this.glowMulFlat);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
      this._clear();
    },

    rect: function (x, y, w, h, o) {
      o = o || {};
      var ctx = this.ctx;
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulFlat) this._glow(col, o.glow * this.glowMulFlat);
      ctx.fillStyle = col;
      if (o.rounded) {
        var r = Math.min(o.rounded, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath(); ctx.fill();
      } else ctx.fillRect(x, y, w, h);
      this._clear();
    },

    path: function (pts, o) {
      o = o || {};
      var ctx = this.ctx;
      if (!pts || pts.length < 2) return;
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulShape) this._glow(col, o.glow * this.glowMulShape);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (o.fill || o.closed) ctx.closePath();
      if (o.fill) {
        ctx.fillStyle = col; ctx.fill();
        if (this.outlineOnFill && o.outline !== false) {
          ctx.strokeStyle = 'rgba(40,30,40,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
        }
      }
      if (o.stroke) { ctx.strokeStyle = col; ctx.lineWidth = o.w || 2; ctx.stroke(); }
      this._clear();
    },

    quad: function (x1, y1, c1x, c1y, c2x, c2y, x2, y2, o) {
      o = o || {};
      var ctx = this.ctx;
      var pts = R.sampleQuad(x1, y1, c1x, c1y, c2x, c2y, x2, y2, this.quadSamples);
      var col = R.resolveColor(this, o.c || 'line', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      if (o.glow && this.glowMulShape) this._glow(col, o.glow * this.glowMulShape);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      if (o.fill) {
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        if (this.outlineOnFill && o.outline !== false) {
          ctx.strokeStyle = 'rgba(40,30,40,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
        }
      }
      if (o.stroke) { ctx.strokeStyle = col; ctx.lineWidth = o.w || 2; ctx.stroke(); }
      this._clear();
    },

    text: function (str, x, y, o) {
      o = o || {};
      var ctx = this.ctx;
      var col = R.resolveColor(this, o.c || 'uiText', o);
      ctx.globalAlpha = o.a != null ? o.a : 1;
      ctx.font = (o.weight || '') + ' ' + (o.size || 18) + 'px ' + (o.font ? R.fonts[o.font] : R.fonts[this.textFont]);
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.baseline || 'alphabetic';
      if (this.textGlow && o.glow) { ctx.shadowColor = col; ctx.shadowBlur = o.glow; }
      if (o.stroke) {
        ctx.lineWidth = o.strokeW || 3;
        ctx.strokeStyle = R.resolveColor(this, o.stroke, {});
        ctx.strokeText(str, x, y);
      }
      ctx.fillStyle = col;
      ctx.fillText(str, x, y);
      this._clear();
    }
  };

  return style;
};
