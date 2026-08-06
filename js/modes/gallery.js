/* =========================================================
   War.Modes.gallery · 兵器演示
   十八般兵器图鉴：逐件试招 / 招式名 / 手感 / 难度
   练习用木人可被打击反馈
   ========================================================= */
War.Modes.gallery = {
  id: 'gallery', name: 'Gallery', nameZh: '演示', desc: '十八般兵刃图鉴 · 逐件试耍',
  keys: '1-9 / QWERTY / [ ] 切兵器 · J 轻击 · L 重击 · K 格挡',

  start: function (world) {
    world.autoScroll = false;
    world.playerSpeed = 0;
    world.groundY = War.Render.H * 0.74;
    var p = world.player;
    p.x = War.Render.W * 0.26;
    p.y = p.groundY(world);
    // 木人
    world.dummy = { x: War.Render.W * 0.72, y: world.groundY - 26, r: 20, hp: 50, maxHp: 50, hitFlash: 0, regenCd: 0, knock: 0 };
    War.Audio.sfx('select');
  },

  update: function (world, dt) {
    var d = world.dummy;
    if (d.hitFlash > 0) d.hitFlash -= dt;
    // 缓缓回血，永续试招（regenRate 可配置，自动化测试置 0）
    var rate = d.regenRate != null ? d.regenRate : 14;
    d.hp = Math.min(d.maxHp, d.hp + rate * dt);
    if (d.knock > 0) d.knock -= dt;
    d.x = War.Render.W * 0.72;
  },

  // 木人受击（由 engine.resolveZone 调用）
  hitDummy: function (world, dmg) {
    var d = world.dummy;
    d.hp = Math.max(0, d.hp - dmg);
    d.hitFlash = 0.18;
    d.knock = 0.3;
    world.comboHit(null, 1);
    world.emitHitSparks(d.x, d.y - 10, 'weaponGlow');
    War.Audio.sfx('clash');
    if (d.hp <= 0) {
      world.spawnFloat('木人脱臼！', d.x, d.y - 40, 'combo');
      d.hp = d.maxHp;
      War.Audio.sfx('pickup');
    }
  },

  hud: function (world, R) {
    var W = War.Render.W;
    var w = world.player.getWeapon();
    var d = world.dummy;

    // 木人血条
    R.text('木人', d.x, d.y - 46, { c: 'uiDim', size: 14, align: 'center', font: 'ui' });
    R.rect(d.x - 34, d.y - 42, 68, 6, { c: 'hpBack', fill: true });
    R.rect(d.x - 34, d.y - 42, 68 * (d.hp / d.maxHp), 6, { c: 'hp', fill: true });

    // 兵器大卡
    var cx = W * 0.5, cardW = 360, cardY = 30;
    R.rect(cx - cardW / 2, cardY, cardW, 150, { c: 'paper', fill: true, a: 0.92, rounded: 14 });
    R.rect(cx - cardW / 2, cardY, cardW, 150, { c: 'uiAccent', stroke: true, w: 2, rounded: 14, a: 0.4 });
    R.text('第 ' + (w.index + 1) + ' 般 · ' + w.name, cx, cardY + 38, { c: 'uiAccent', size: 26, align: 'center', font: 'kai', weight: 'bold' });
    R.text(w.tip + ' · ' + w.desc, cx, cardY + 68, { c: 'uiText', size: 14, align: 'center', font: 'ui' });
    // 难度星
    var stars = '★★★★★'.slice(0, w.stars) + '☆☆☆☆☆'.slice(w.stars, 5);
    R.text('难度 ' + stars, cx, cardY + 96, { c: 'combo', size: 16, align: 'center', font: 'ui' });
    R.text('J 轻击 · L 重击 · K 格挡', cx, cardY + 124, { c: 'uiDim', size: 14, align: 'center', font: 'ui' });

    // 兵器清单（底部滚动条）
    R.text('1-9 / Q-W-E-R-T-Y-U-I-O / [ ] 切换 · 当前：' + w.name, W / 2, War.Render.H - 30, { c: 'uiDim', size: 14, align: 'center', font: 'ui', a: 0.8 });
  }
};
War.Modes.register(War.Modes.gallery);
