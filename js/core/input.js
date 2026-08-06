/* =========================================================
   War.Input · 键盘 / 鼠标输入
   down()   —— 持续按住
   pressed() —— 本帧刚按下（单帧）
   released() —— 本帧刚抬起（单帧）
   键名统一用 e.code（ArrowLeft / KeyW / Digit1 / Space ...）
   ========================================================= */
War.Input = (function () {
  var downSet = {};
  var pressedSet = {};
  var releasedSet = {};
  var mouse = { x: 0, y: 0, down: false };
  var anyPressedThisFrame = false;

  // 需要阻止浏览器默认行为的键（滚动/翻页）
  var PREVENT = { Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };

  function init(canvas) {
    window.addEventListener('keydown', function (e) {
      var code = e.code;
      if (!downSet[code]) pressedSet[code] = true;
      downSet[code] = true;
      anyPressedThisFrame = true;
      if (PREVENT[code]) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) {
      downSet[e.code] = false;
      releasedSet[e.code] = true;
    });
    if (canvas) {
      canvas.addEventListener('mousemove', function (e) {
        var r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', function (e) {
        mouse.down = true; anyPressedThisFrame = true;
        var code = e.button === 0 ? 'MouseLeft' : e.button === 2 ? 'MouseRight' : 'MouseMid';
        if (!downSet[code]) pressedSet[code] = true;
        downSet[code] = true;
      });
      window.addEventListener('mouseup', function (e) {
        var code = e.button === 0 ? 'MouseLeft' : e.button === 2 ? 'MouseRight' : 'MouseMid';
        downSet[code] = false;
        releasedSet[code] = true;
        mouse.down = false;
      });
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
  }

  // 每帧开头调用：清空"刚按下/刚抬起"标记
  function update() {
    pressedSet = {}; releasedSet = {};
    anyPressedThisFrame = false;
  }

  function down(code) { return !!downSet[code]; }
  function pressed(code) { return !!pressedSet[code]; }
  function released(code) { return !!releasedSet[code]; }

  function axisX() {
    var r = (down('ArrowRight') || down('KeyD')) ? 1 : 0;
    var l = (down('ArrowLeft') || down('KeyA')) ? 1 : 0;
    return r - l;
  }
  function axisY() {
    var d = (down('ArrowDown') || down('KeyS')) ? 1 : 0;
    var u = (down('ArrowUp') || down('KeyW')) ? 1 : 0;
    return d - u;
  }

  // 当前选中的兵器索引：数字键 1-9 → 0-8，QWERTYUIOP → 9-17，[] 循环
  function weaponIndex(cur, count) {
    var i;
    for (i = 0; i < Math.min(9, count); i++) {
      if (down('Digit' + (i + 1))) return i;
    }
    var letters = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO'];
    for (i = 0; i < letters.length; i++) {
      if (i + 9 < count && down(letters[i])) return i + 9;
    }
    if (pressed('BracketLeft')) return ((cur - 1) % count + count) % count;
    if (pressed('BracketRight')) return (cur + 1) % count;
    return -1;
  }

  return {
    init: init, update: update,
    down: down, pressed: pressed, released: released,
    axisX: axisX, axisY: axisY,
    weaponIndex: weaponIndex,
    mouse: mouse,
    anyPressed: function () { return anyPressedThisFrame; }
  };
})();
