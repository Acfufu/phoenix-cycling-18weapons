/* =========================================================
   War.Weapons · 十八般兵器
   刀枪剑戟 斧钺钩叉 镋棍槊棒 鞭锏锤挝 拐子流星锤
   每件兵器独立招式/手感，非换皮。attack 由 Engine 结算：
   stroke = { at(0..1), off:[x,y], r, kind, damage, kb, kbUp, stun, pull, multi, deflect }
   kind: slash | thrust | spin | pull | stomp | ring | wave | whip | orbit | throw
   ========================================================= */

/**
 * 招式数据（strokes 数组元素）
 * @typedef {Object} Stroke
 * @property {number} at      命中时间点 0..1
 * @property {number[]} off   相对玩家偏移 [x,y]
 * @property {number} r       判定半径
 * @property {string} kind    招式类型
 * @property {number} damage  伤害
 * @property {number} kb      击退
 * @property {number} kbUp    上挑
 * @property {number} stun    眩晕
 * @property {number} pull    拉取力度
 * @property {boolean} [multi]    是否多段（spin/orbit）
 * @property {number} [speed]     波速（wave）
 * @property {boolean} [both]     震地双向（stomp）
 * @property {boolean} [forward]  震地单向（stomp）
 * @property {number} [turns]     环绕圈数（orbit）
 * @property {number} [phase]     环绕初始相位（orbit）
 * @property {boolean} [bypass]   无视盾格挡
 */

War.Weapons = (function () {
  var U = War.utils;

  function S(at, off, r, extra) {
    return Object.assign({ at: at, off: off, r: r, kind: 'slash', damage: 8, kb: 150, kbUp: 0, stun: 0.16, pull: 0 }, extra || {});
  }
  function T(at, off, r, extra) {
    return Object.assign({ at: at, off: off, r: r, kind: 'thrust', damage: 8, kb: 140, kbUp: 0, stun: 0.14, pull: 0 }, extra || {});
  }
  function SP(at, r, extra) {
    return Object.assign({ at: at, off: [0, 0], r: r, kind: 'spin', damage: 8, kb: 130, kbUp: 0, stun: 0.12, pull: 0, multi: true }, extra || {});
  }
  function PL(at, off, r, extra) {
    return Object.assign({ at: at, off: off, r: r, kind: 'pull', damage: 4, kb: 0, kbUp: 0, stun: 0.3, pull: 1 }, extra || {});
  }
  function ORB(r, damage, kb, extra) {
    return Object.assign({ at: 0, off: [0, 0], r: r, kind: 'orbit', damage: damage, kb: kb, kbUp: 0, stun: 0.1, pull: 0, multi: true, turns: 2.2, phase: 0 }, extra || {});
  }

  var list = [
    // 1 刀
    {
      index: 0, name: '刀', char: '刀', cls: 'blade', tip: '劈山刀', stars: 1,
      desc: '入门最快的兵器，横劈如电。连按攻击可打出二连斩，轻击可劈碎飞来的暗器。',
      light: { dur: 0.34, lunge: 60, strokes: [S(0.06, [48, 0], 50, { damage: 8 }), S(0.2, [50, 2], 48, { damage: 8, kb: 170 })], sfx: 'swing', fx: 'slash', shake: 0.3, deflect: true },
      heavy: { dur: 0.52, lunge: 100, strokes: [S(0.38, [62, 0], 62, { damage: 20, kb: 300, kbUp: 50 })], sfx: 'swingHeavy', fx: 'slashBig', shake: 0.7 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 2 枪
    {
      index: 1, name: '枪', char: '枪', cls: 'pole', tip: '百鸟朝凤', stars: 2,
      desc: '一寸长一寸强。三连突刺带前冲，蓄力一枪可贯敌三尺。',
      light: { dur: 0.46, lunge: 170, strokes: [T(0.05, [58, 0], 36, { damage: 7 }), T(0.22, [62, 0], 38, { damage: 7 }), T(0.38, [66, 0], 40, { damage: 9, kb: 180 })], sfx: 'slash', fx: 'thrust', shake: 0.25 },
      heavy: { dur: 0.62, charge: 0.35, lunge: 300, strokes: [T(0.55, [100, 0], 46, { damage: 26, kb: 380, kbUp: 30 }), { at: 0.55, off: [0, 0], r: 0, kind: 'wave', damage: 10, kb: 200, speed: 520 }], sfx: 'swingHeavy', fx: 'thrustBig', shake: 0.9 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 3 剑
    {
      index: 2, name: '剑', char: '剑', cls: 'blade', tip: '白虹贯日', stars: 3,
      desc: '君子之兵，精准刁钻。格挡可反弹敌方暗器，重击释放一圈剑气。',
      light: { dur: 0.3, lunge: 40, strokes: [T(0.05, [44, 0], 32, { damage: 9, kb: 130 })], sfx: 'slash', fx: 'thrust', shake: 0.2, deflect: true },
      heavy: { dur: 0.46, strokes: [{ at: 0.22, off: [0, 0], r: 95, kind: 'ring', damage: 16, kb: 240, kbUp: 40 }], sfx: 'swingHeavy', fx: 'ring', shake: 0.8 },
      block: { dur: 0.5, kind: 'parry', sfx: 'parry', fx: 'parry' }
    },
    // 4 戟
    {
      index: 3, name: '戟', char: '戟', cls: 'pole', tip: '方天画戟', stars: 3,
      desc: '一横扫一上挑，大开大合。重击回旋斩，方圆皆敌。',
      light: { dur: 0.44, lunge: 70, strokes: [S(0.08, [52, 0], 56, { damage: 9, kb: 170 }), S(0.26, [48, -12], 54, { damage: 10, kb: 160, kbUp: 260 })], sfx: 'swing', fx: 'slash', shake: 0.35 },
      heavy: { dur: 0.58, lunge: 90, strokes: [SP(0.28, 84, { damage: 15, kb: 220 })], sfx: 'swingHeavy', fx: 'spin', shake: 0.8 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 5 斧
    {
      index: 4, name: '斧', char: '斧', cls: 'heavy', tip: '开山斧', stars: 3,
      desc: '势大力沉。重击劈地，震波沿地席卷前后敌人。',
      light: { dur: 0.52, lunge: 40, strokes: [S(0.42, [58, 0], 54, { damage: 14, kb: 260 })], sfx: 'swingHeavy', fx: 'slashBig', shake: 0.6 },
      heavy: { dur: 0.62, strokes: [S(0.46, [62, 0], 62, { damage: 20, kb: 300, kbUp: 140 }), { at: 0.46, off: [0, 0], r: 0, kind: 'stomp', damage: 14, kb: 260, kbUp: 90, both: true }], sfx: 'stomp', fx: 'stomp', shake: 1.2, slowmo: 0.5 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 6 钺
    {
      index: 5, name: '钺', char: '钺', cls: 'heavy', tip: '日月钺', stars: 2,
      desc: '双钺回旋，连绵不绝。攻击范围内敌人会被连续切削。',
      light: { dur: 0.42, strokes: [SP(0.05, 68, { damage: 8, kb: 120 })], sfx: 'swing', fx: 'spin', shake: 0.3 },
      heavy: { dur: 0.78, strokes: [SP(0.05, 92, { damage: 12, kb: 160 })], sfx: 'swingHeavy', fx: 'spin', shake: 0.6, slowmo: 0.35 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 7 钩
    {
      index: 6, name: '钩', char: '钩', cls: 'hook', tip: '银钩铁划', stars: 4,
      desc: '诡兵。出钩将远处敌人拽到身前，重击则抓投抛出。',
      light: { dur: 0.38, lunge: -10, strokes: [PL(0.12, [78, 0], 34, { damage: 5, stun: 0.3 })], sfx: 'hook', fx: 'hook', shake: 0.3 },
      heavy: { dur: 0.58, strokes: [PL(0.2, [96, 0], 38, { damage: 8, stun: 0.5 }), S(0.46, [36, 0], 54, { damage: 16, kb: 340, kbUp: 60 })], sfx: 'hook', fx: 'hookBig', shake: 0.7 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 8 叉
    {
      index: 7, name: '叉', char: '叉', cls: 'pole', tip: '三股托天叉', stars: 2,
      desc: '专挑下盘，一击把敌人挑上高空。三连叉连挑不断。',
      light: { dur: 0.4, lunge: 80, strokes: [T(0.1, [58, 0], 42, { damage: 9, kb: 120, kbUp: 300 })], sfx: 'swing', fx: 'thrust', shake: 0.3 },
      heavy: { dur: 0.52, lunge: 110, strokes: [T(0.05, [60, 0], 44, { damage: 11, kb: 140, kbUp: 200 }), T(0.2, [62, 0], 44, { damage: 11, kb: 140, kbUp: 200 }), T(0.35, [66, 0], 46, { damage: 13, kb: 160, kbUp: 260 })], sfx: 'swingHeavy', fx: 'thrust', shake: 0.5 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 9 镋
    {
      index: 8, name: '镋', char: '镋', cls: 'heavy', tip: '凤翅镏金镋', stars: 3,
      desc: '凤翅镏金，势如蔽日。轻击大回旋，重击三连横扫，范围最大的一档。',
      light: { dur: 0.46, strokes: [SP(0.05, 88, { damage: 9, kb: 140 })], sfx: 'swing', fx: 'spin', shake: 0.35 },
      heavy: { dur: 0.62, strokes: [SP(0.1, 122, { damage: 13, kb: 190 }), { at: 0.3, off: [0, 0], r: 110, kind: 'ring', damage: 10, kb: 200 }], sfx: 'swingHeavy', fx: 'spin', shake: 0.9 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 10 棍
    {
      index: 9, name: '棍', char: '棍', cls: 'staff', tip: '齐眉棍', stars: 2,
      desc: '少林棍法。旋棍可弹开暗器，格挡成墙把敌人推开，重击大风车。',
      light: { dur: 0.42, strokes: [SP(0.05, 82, { damage: 9, kb: 140 })], sfx: 'swing', fx: 'spin', shake: 0.3, deflect: true },
      heavy: { dur: 0.85, strokes: [SP(0.05, 112, { damage: 12, kb: 180 })], sfx: 'swingHeavy', fx: 'spin', shake: 0.5, slowmo: 0.3 },
      block: { dur: 0.55, kind: 'wall', sfx: 'block', fx: 'wall' }
    },
    // 11 槊
    {
      index: 10, name: '槊', char: '槊', cls: 'pole', tip: '马槊', stars: 4,
      desc: '最长之兵。蓄力一记超长贯穿，可同时扎穿整排敌人。',
      light: { dur: 0.4, lunge: 150, strokes: [T(0.15, [100, 0], 36, { damage: 10, kb: 200 })], sfx: 'slash', fx: 'thrust', shake: 0.3 },
      heavy: { dur: 0.72, charge: 0.4, lunge: 340, strokes: [T(0.55, [155, 0], 46, { damage: 28, kb: 460, kbUp: 40 }), { at: 0.55, off: [0, 0], r: 0, kind: 'wave', damage: 12, kb: 240, speed: 600 }], sfx: 'swingHeavy', fx: 'thrustBig', shake: 1.1, slowmo: 0.4 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 12 棒
    {
      index: 11, name: '棒', char: '棒', cls: 'staff', tip: '打狗棒', stars: 1,
      desc: '天下至快。三连快打极短硬直，贴脸连到死。',
      light: { dur: 0.5, lunge: 50, strokes: [S(0.03, [46, 0], 44, { damage: 7 }), S(0.16, [48, 0], 44, { damage: 7 }), S(0.32, [50, 0], 46, { damage: 9, kb: 170 })], sfx: 'swing', fx: 'slash', shake: 0.25 },
      heavy: { dur: 0.52, lunge: 100, strokes: [SP(0.16, 78, { damage: 16, kb: 230 })], sfx: 'swingHeavy', fx: 'spin', shake: 0.7 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 13 鞭
    {
      index: 12, name: '鞭', char: '鞭', cls: 'whip', tip: '九节鞭', stars: 4,
      desc: '九节鞭出，风声呼啸。攻击范围最远，弧线抽击难以近身。',
      light: { dur: 0.44, strokes: [{ at: 0.18, off: [128, 0], r: 72, kind: 'whip', damage: 9, kb: 150, kbUp: 20 }], sfx: 'whoosh', fx: 'whip', shake: 0.3 },
      heavy: { dur: 0.62, strokes: [{ at: 0.14, off: [135, 0], r: 78, kind: 'whip', damage: 12, kb: 200, kbUp: 40, multi: true }, { at: 0.34, off: [142, -10], r: 76, kind: 'whip', damage: 12, kb: 210, kbUp: 60, multi: true }], sfx: 'whoosh', fx: 'whipBig', shake: 0.6 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 14 锏
    {
      index: 13, name: '锏', char: '锏', cls: 'heavy', tip: '四棱金锏', stars: 3,
      desc: '破甲之兵，专克重甲。一击重砸，附带冲击波。',
      light: { dur: 0.46, lunge: 30, strokes: [S(0.3, [52, 0], 50, { damage: 13, kb: 240 })], sfx: 'swingHeavy', fx: 'slashBig', shake: 0.6 },
      heavy: { dur: 0.66, strokes: [S(0.46, [60, 0], 60, { damage: 22, kb: 340, kbUp: 40 }), { at: 0.46, off: [0, 0], r: 0, kind: 'stomp', damage: 12, kb: 240, kbUp: 60, both: false, forward: true }], sfx: 'stomp', fx: 'stomp', shake: 1.0 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 15 锤
    {
      index: 14, name: '锤', char: '锤', cls: 'heavy', tip: '擂鼓瓮金锤', stars: 3,
      desc: '一击惊雷。重击震地，波高敌倒地，伤及周身。',
      light: { dur: 0.56, lunge: 20, strokes: [S(0.46, [58, 0], 58, { damage: 16, kb: 300 })], sfx: 'swingHeavy', fx: 'slashBig', shake: 0.8 },
      heavy: { dur: 0.78, strokes: [S(0.52, [64, 0], 66, { damage: 26, kb: 420, kbUp: 150 }), { at: 0.52, off: [0, 0], r: 0, kind: 'stomp', damage: 16, kb: 300, kbUp: 120, both: true }], sfx: 'stomp', fx: 'stompBig', shake: 1.6, slowmo: 0.5 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 16 挝
    {
      index: 15, name: '挝', char: '挝', cls: 'hook', tip: '挝拐', stars: 4,
      desc: '爪形奇兵。重击擒住敌人，反手向后摔投。',
      light: { dur: 0.36, lunge: 30, strokes: [S(0.1, [48, 0], 42, { damage: 8, kb: 130 })], sfx: 'swing', fx: 'slash', shake: 0.25 },
      heavy: { dur: 0.72, strokes: [PL(0.25, [78, 0], 36, { damage: 6, stun: 0.4 }), { at: 0.6, off: [-26, 0], r: 62, kind: 'throw', damage: 16, kb: 380, kbUp: 220, pull: 0 }], sfx: 'hook', fx: 'hookBig', shake: 0.8 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    },
    // 17 拐子
    {
      index: 16, name: '拐子', char: '拐', cls: 'dual', tip: '鸳鸯拐', stars: 2,
      desc: '双拐攻守兼备。格挡成功自动反击一击。',
      light: { dur: 0.34, lunge: 40, strokes: [S(0.05, [42, 0], 42, { damage: 8 }), S(0.2, [44, 0], 42, { damage: 8, kb: 150 })], sfx: 'swing', fx: 'slash', shake: 0.3 },
      heavy: { dur: 0.52, strokes: [SP(0.16, 74, { damage: 14, kb: 210 })], sfx: 'swingHeavy', fx: 'spin', shake: 0.7 },
      block: { dur: 0.5, kind: 'counter', sfx: 'parry', fx: 'parry' }
    },
    // 18 流星锤
    {
      index: 17, name: '流星锤', char: '锤', cls: 'chain', tip: '流星赶月', stars: 5,
      desc: '最难驯服之兵。轻击甩锤绕身一周，重击则长链飞旋如流星，势不可挡。',
      light: { dur: 0.6, strokes: [ORB(60, 9, 150)], sfx: 'chain', fx: 'orbit', shake: 0.35 },
      heavy: { dur: 1.15, strokes: [ORB(84, 13, 200, { turns: 3, phase: 0.6 }), { at: 0.85, off: [150, 0], r: 60, kind: 'slash', damage: 20, kb: 340, kbUp: 30 }], sfx: 'chain', fx: 'orbitBig', shake: 0.8, slowmo: 0.35 },
      block: { dur: 0.45, kind: 'guard', sfx: 'block', fx: 'guard' }
    }
  ];

  list.forEach(function (w, i) { w.index = i; });

  function get(i) { return list[((i % list.length) + list.length) % list.length]; }

  return {
    list: list,
    get: get,
    count: list.length,
    // 招名字幕用
    attackNames: {
      light: '轻击', heavy: '重击', block: '格挡'
    }
  };
})();
