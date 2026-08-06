/* =========================================================
   War · 凤凰兵器骑行 · 十八般武艺
   工具库 & 全局命名空间
   零依赖 / 经典脚本加载 / 双击即玩
   ========================================================= */
window.War = window.War || {};

War.utils = (function () {
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function sign(v) { return v < 0 ? -1 : v > 0 ? 1 : 0; }
  function dist(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.hypot(dx, dy); }
  function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  return {
    TAU: TAU,
    clamp: clamp, lerp: lerp, rand: rand,
    sign: sign, dist: dist, angleTo: angleTo,
    easeOut: easeOut, damp: damp, pick: pick
  };
})();
