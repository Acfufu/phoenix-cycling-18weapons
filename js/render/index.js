/* =========================================================
   War.Render · 渲染注册表 + 门面
   实体通过 War.Render.cur 调用图元；语义色随风格 palette 映射
   图元接口（每个渲染器实现）：
   save/translate/scale/rotate/restore/reset
   line/circle/ellipse/rect/path/quad/text
   beginFrame(world) / endFrame()（后处理，并把 ctx 置回屏幕空间）
   ========================================================= */
War.Render = (function () {
  var styles = {};
  var cur = null;
  var canvas = null, W = 0, H = 0, dpr = 1;

  var fonts = {
    kai: '"Kaiti SC","STKaiti","KaiTi","Noto Serif SC",serif',
    song: '"Songti SC","STSong","SimSun","Noto Serif SC",serif',
    ui: '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif',
    mono: '"Menlo","Consolas","Courier New",monospace'
  };

  function init(cv) {
    canvas = cv;
    Object.keys(styles).forEach(function (k) { styles[k].init && styles[k].init(cv); });
    resize();
  }

  function resize() {
    if (!canvas) return;
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // backing store 必须按设备像素分配；渲染变换用 dpr 缩放，二者匹配世界才完整可见
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    // 每个渲染器按需重建离屏缓冲
    Object.keys(styles).forEach(function (k) { styles[k].resize && styles[k].resize(W, H, dpr); });
  }

  function register(style) { styles[style.id] = style; }
  function set(id) { cur = styles[id] || styles.ink; cur && cur.prepare && cur.prepare(W, H, dpr); }

  // 语义色解析：非 '#'/'rgba' 开头的视为语义键
  function resolveColor(renderer, key, o) {
    o = o || {};
    var str;
    if (typeof key === 'string' && key.charAt(0) === '#') str = key;
    else if (typeof key === 'string' && key.indexOf('rgb') === 0) str = key;
    else str = renderer.palette[key] || '#ffffff';
    var a = o.a != null ? o.a : 1;
    if (a >= 1) return str;
    return strToRgba(str, a);
  }

  function strToRgba(str, a) {
    if (str.indexOf('rgba') === 0) return str;
    var m = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (m) {
      var hex = m[1];
      if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
      var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
    }
    return str;
  }

  // 贝塞尔采样（quad 用）
  function sampleQuad(x1, y1, c1x, c1y, c2x, c2y, x2, y2, n) {
    n = n || 12;
    var pts = [], t, it, jt, kt;
    for (var i = 0; i <= n; i++) {
      t = i / n; it = 1 - t; jt = it * it; kt = t * t;
      pts.push([
        jt * it * x1 + 3 * it * it * t * c1x + 3 * it * t * t * c2x + kt * t * x2,
        jt * it * y1 + 3 * it * it * t * c1y + 3 * it * t * t * c2y + kt * t * y2
      ]);
    }
    return pts;
  }

  return {
    styles: styles,
    fonts: fonts,
    init: init, resize: resize,
    register: register, set: set,
    resolveColor: resolveColor, strToRgba: strToRgba, sampleQuad: sampleQuad,
    get cur() { return cur; },
    get canvas() { return canvas; },
    get W() { return W; }, get H() { return H; }, get dpr() { return dpr; }
  };
})();
