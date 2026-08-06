/* =========================================================
   War.Modes.story · 闯关模式
   3 关横版清版 + 第 3 关 Boss（骑车邪龙）
   波次刷怪 / 连击评分 / 招式落款
   ========================================================= */
War.Modes.story = {
  id: 'story', name: 'Story', nameZh: '闯关', desc: '横版清版，三关一路杀到邪龙',
  keys: '←→ 移动 · Space 跳跃 · J 轻击 · L 重击 · K 格挡 · 数字/QWERTY 切兵器',

  // 关卡定义
  LEVELS: [
    { name: '山道伏击', waves: [
      { types: ['grunt', 'grunt', 'grunt'], off: 380 },
      { types: ['grunt', 'thrower', 'grunt', 'thrower'], off: 430 },
      { types: ['grunt', 'grunt', 'spear', 'thrower'], off: 460 }
    ] },
    { name: '渡口夜袭', waves: [
      { types: ['grunt', 'shield', 'grunt', 'spear'], off: 420 },
      { types: ['thrower', 'spear', 'shield', 'grunt', 'grunt'], off: 470 },
      { types: ['shield', 'grunt', 'grunt', 'spear', 'thrower', 'grunt'], off: 500 }
    ] },
    { name: '魔焰荒原', waves: [
      { types: ['grunt', 'mage', 'grunt', 'thrower'], off: 430 },
      { types: ['mage', 'grunt', 'spear', 'thrower', 'mage'], off: 480 },
      { types: ['shield', 'spear', 'grunt', 'mage', 'thrower', 'grunt'], off: 520 }
    ] }
  ],

  start: function (world) {
    world.autoScroll = false;
    world.playerSpeed = 310;
    var s = {
      level: 0, waveIdx: 0, spawnQueue: [], spawnTimer: 0,
      introT: 2.2, levelIntro: '', waveBannerT: 0, waveBanner: '',
      bossActive: false, bossClearT: 0
    };
    world.story = s;
    this.loadLevel(world, 0);
  },

  loadLevel: function (world, idx) {
    var s = world.story;
    s.level = idx;
    s.waveIdx = 0;
    s.bossActive = false;
    s.levelIntro = '第 ' + (idx + 1) + ' 关 · ' + this.LEVELS[idx].name;
    s.introT = 2.2;
    s.spawnQueue = [];
    this.startWave(world);
  },

  startWave: function (world) {
    var s = world.story;
    var L = this.LEVELS[s.level];
    var wave = L.waves[s.waveIdx];
    if (!wave) { // 本关清空
      if (s.level === 2) {
        // 第 3 关打完出 Boss
        this.spawnBoss(world);
      } else {
        s.waveBanner = '第 ' + (s.level + 1) + ' 关 通关！';
        s.waveBannerT = 1.6;
        War.Audio.sfx('coin');
        s.levelClear = true;
        s.clearT = 1.4;
      }
      return;
    }
    s.waveBanner = '第 ' + (s.level + 1) + ' 关 · 第 ' + (s.waveIdx + 1) + ' 波';
    s.waveBannerT = 1.2;
    War.Audio.sfx('ui');
    // 组队生成队列
    s.spawnQueue = wave.types.slice();
    s.spawnOff = wave.off || 400;
    s.spawnTimer = 0;
  },

  spawnBoss: function (world) {
    var s = world.story;
    s.bossActive = true;
    s.waveBanner = 'BOSS · 骑车邪龙';
    s.waveBannerT = 2.4;
    var bx = world.player.x + 520;
    var e = world.spawnEnemy('boss', bx, world.groundY - 250);
    e.homeX = bx; e.homeY = world.groundY - 250;
    world.boss = e;
    War.Audio.sfx('boss');
    world.slowMotion(0.4, 0.8);
    world.flash('rgba(40,0,0,0.5)', 0.5);
    s.bossClearT = 0;
  },

  update: function (world, dt) {
    var s = world.story;
    if (s.introT > 0) s.introT -= dt;
    if (s.waveBannerT > 0) s.waveBannerT -= dt;

    // 通关切关
    if (s.levelClear) {
      s.clearT -= dt;
      if (s.clearT <= 0) {
        s.levelClear = false;
        if (s.level < 2) this.loadLevel(world, s.level + 1);
        else world.status = 'win';
      }
      return;
    }

    // Boss 击败
    if (world.boss && world.boss.dead) {
      s.bossClearT += dt;
      if (s.bossClearT > 2) { world.status = 'win'; world.boss = null; }
      return;
    }

    // 生成队列（间隔刷出，避免扎堆）
    if (s.spawnQueue.length) {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.spawnTimer = 0.55;
        var type = s.spawnQueue.shift();
        var gy = world.groundY - (type === 'mage' ? 120 : 30);
        world.spawnEnemy(type, world.player.x + s.spawnOff, gy);
        s.spawnOff += 55;
      }
    }

    // 波次结束判定
    if (s.spawnQueue.length === 0 && world.enemies.length === 0 && !s.bossActive && !s.levelClear) {
      s.waveIdx++;
      this.startWave(world);
    }
  },

  hud: function (world, R) {
    var s = world.story;
    var W = War.Render.W;
    // 关卡名
    if (s.waveBannerT > 0) {
      var a = Math.min(1, s.waveBannerT);
      R.text(s.waveBanner, W / 2, 150, { c: 'uiAccent', size: 40, align: 'center', font: 'kai', a: a, stroke: 'paper', strokeW: 5, weight: 'bold' });
    }
    if (s.introT > 0) {
      R.text(s.levelIntro, W / 2, 210, { c: 'uiText', size: 24, align: 'center', font: 'kai', a: Math.min(1, s.introT), stroke: 'paper', strokeW: 4 });
    }
  }
};
War.Modes.register(War.Modes.story);
