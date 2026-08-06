/* =========================================================
   War.Modes · 模式注册表
   闯关 story / 跑酷 endless / 演示 gallery / 对战 battle
   每个模式：{ id, name, nameZh, desc, keys, start, update, hud }
   ========================================================= */
War.Modes = (function () {
  var registry = {};
  function register(m) { registry[m.id] = m; War.Modes.order = War.Modes.order || []; War.Modes.order.push(m.id); }
  function get(id) { return registry[id]; }
  return { register: register, get: get, registry: registry };
})();
