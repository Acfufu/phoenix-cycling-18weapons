/* =========================================================
   冒烟测试：用桩 DOM 加载全部脚本，跑通核心逻辑与绘制路径
   运行：node scripts/smoke.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;
function ok(name, cond) {
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.error('  ✗ FAIL: ' + name); }
}

// ---------- 桩：全局 window / document / canvas / localStorage ----------
function makeCtxProxy() {
  const grad = { addColorStop() {} };
  const target = function () {};
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => grad;
      if (prop === 'canvas') return {};
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'getImageData' || prop === 'putImageData') return () => ({ data: [], width: 0, height: 0 });
      // 其余一律返回可调用函数
      return typeof prop === 'symbol' ? undefined : () => {};
    },
    set() { return true; }
  });
}

function makeCanvas() {
  return {
    width: 1280, height: 720,
    style: {},
    getContext: () => makeCtxProxy(),
    createPattern: () => 'pattern',
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    addEventListener: () => {}
  };
}

const elCache = {};
function makeEl(id) {
  return {
    id: id,
    _html: '',
    style: {},
    children: [],
    classList: { add(){}, remove(){}, toggle(){} },
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html; },
    getContext: () => makeCtxProxy(),
    createPattern: () => 'pattern',
    appendChild() {},
    addEventListener() {},
    getAttribute() { return null; },
    setAttribute() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    closest: () => null
  };
}

global.window = globalThis;
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.innerWidth = 1280;
globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => Date.now() };
globalThis.localStorage = {
  _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; }
};
globalThis.document = {
  getElementById(id) { return elCache[id] || (elCache[id] = makeEl(id)); },
  createElement(tag) { return tag === 'canvas' ? makeCanvas() : makeEl(tag + Math.random()); },
  addEventListener() {},
  querySelectorAll: () => [],
  querySelector: () => null,
  hidden: false
};
globalThis.AudioContext = function () { return { state: 'suspended', currentTime: 0, sampleRate: 44100, destination: {}, resume(){}, createBuffer(){ return { getChannelData: () => new Float32Array(44100) }; }, createBufferSource(){ return { buffer: null, loop: false, connect(){}, start(){}, stop(){} }; }, createGain(){ return { gain: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }, createOscillator(){ return { type: '', frequency: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, start(){}, stop(){} }; }, createBiquadFilter(){ return { type: '', frequency: { value: 0, setValueAtTime(){}, exponentialRampToValueAtTime(){} }, Q: { value: 1 }, connect(){} }; } }; };

// ---------- 按序加载脚本 ----------
const ORDER = [
  'js/core/utils.js', 'js/core/input.js', 'js/core/audio.js', 'js/core/particles.js',
  'js/weapons/weapons.js', 'js/entities/player.js', 'js/entities/enemies.js', 'js/entities/projectiles.js',
  'js/render/index.js', 'js/render/base.js', 'js/render/ink.js', 'js/render/pixel.js', 'js/render/cartoon.js', 'js/render/neon.js', 'js/render/weaponDraw.js',
  'js/modes/index.js', 'js/modes/story.js', 'js/modes/endless.js', 'js/modes/gallery.js', 'js/modes/battle.js',
  'js/core/combat.js', 'js/core/world.js', 'js/core/draw.js', 'js/core/engine.js', 'js/main.js'
];
for (const rel of ORDER) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  try { vm.runInThisContext(code, { filename: rel }); }
  catch (e) { failures++; console.error('  加载失败 ' + rel + ': ' + e.message); }
}

const War = global.War;
console.log('== 基础结构 ==');
ok('War 命名空间存在', !!War);
ok('utils 就位', !!War.utils && War.utils.TAU > 0);
ok('Input 就位', !!War.Input && typeof War.Input.update === 'function');
ok('Audio 就位', !!War.Audio && typeof War.Audio.sfx === 'function');
ok('Particles 就位', !!War.Particles && typeof War.Particles.emit === 'function');
ok('18 件兵器', War.Weapons && War.Weapons.list.length === 18);
ok('四套渲染器已注册', ['ink','pixel','cartoon','neon'].every(k => War.Render.styles[k]));
ok('四种模式已注册', ['story','endless','gallery','battle'].every(k => War.Modes.get(k)));
ok('Engine/UI 就位', !!War.Engine && !!War.UI);
ok('Combat 模块就位', !!War.Combat && typeof War.Combat.resolveZone === 'function' && typeof War.Combat.applyStroke === 'function');
ok('World 模块就位', !!War.World && typeof War.World.create === 'function');
ok('Draw 模块就位', !!War.Draw && typeof War.Draw.commonHud === 'function' && typeof War.Draw.overlays === 'function');
ok('WeaponDraw 模块就位', !!War.WeaponDraw && typeof War.WeaponDraw.draw === 'function');

console.log('== 兵器数据 ==');
War.Weapons.list.forEach((w, i) => {
  ok('兵器#' + (i + 1) + ' ' + w.name + ' 招式完整',
    !!w.light && w.light.strokes && w.light.strokes.length > 0 &&
    !!w.heavy && w.heavy.strokes && w.heavy.strokes.length > 0 &&
    !!w.block && !!w.tip && !!w.desc && w.stars >= 1 && w.stars <= 5);
});

console.log('== 逻辑模拟（无渲染） ==');
// 假世界（仅含 player.update 所需接口）
const fakeWorld = {
  mode: { id: 'story' }, W: 1280, H: 720, t: 0, dt: 1 / 60,
  player: null, enemies: [], projectiles: [], attacks: [], floats: [], banners: [],
  particles: War.Particles, dummy: null, boss: null,
  camera: { x: 0, y: 0, shakeX: 0, shakeY: 0, trauma: 0 },
  slowmo: { scale: 1, timer: 0 },
  groundY: 520, score: 0, combo: 0, comboTimer: 0, kills: 0, status: 'play',
  autoScroll: false, playerSpeed: 310,
  spawnFloat() {}, spawnBanner() {}, shake() {}, flash() {}, slowmo() {}, addScore() {},
  comboHit() {}, spawnEnemy: (t, x, y) => { const e = War.Enemies.make(t, x, y); fakeWorld.enemies.push(e); return e; },
  spawnProjectile() {}, applyAttackStroke() {}, updateContinuous() {},
  emitSlashTrail() {}, emitSpinTrail() {}, emit() {}, emitBurst() {}, emitDust() {}, emitFeathers() {}, emitHitSparks() {},
  parryProjectiles() {}, wallPush() {}, notifyTrick() {}, landTrick() {}, bossDefeated() {},
  checkObstaclesByZone() {}, checkDummyByZone() {}
};
const p = new War.Player(140, 464);
p.phaseGround(fakeWorld);
fakeWorld.player = p;

let threw = null;
try {
  for (let f = 0; f < 240; f++) {
    fakeWorld.t += fakeWorld.dt;
    if (!p.dead) p.update(fakeWorld, fakeWorld.dt);
    else { p.stateT += fakeWorld.dt; }
    for (const e of fakeWorld.enemies) e.update(fakeWorld, fakeWorld.dt);
    for (const pr of fakeWorld.projectiles) War.Projectiles.update(fakeWorld, pr, fakeWorld.dt);
    fakeWorld.particles.update(fakeWorld.dt);
  }
} catch (e) { threw = e; }
ok('玩家 240 帧更新无异常', !threw, threw);
ok('玩家落地坐标合理', Math.abs(p.y - (520 - 56)) < 0.001);

// 攻击结算
threw = null;
try { p.startAttack(fakeWorld, 'light'); for (let f = 0; f < 40; f++) p.update(fakeWorld, fakeWorld.dt); } catch (e) { threw = e; }
ok('轻击攻击流程无异常', !threw, threw);
ok('攻击自动结束', p.state === 'idle' && !p.attack);

// 敌人：所有类型生成 + 更新
threw = null;
try {
  ['grunt', 'thrower', 'shield', 'spear', 'mage', 'boss'].forEach(t => {
    const e = War.Enemies.make(t, 300, 300);
    for (let f = 0; f < 60; f++) e.update(fakeWorld, fakeWorld.dt);
  });
} catch (e) { threw = e; }
ok('六类敌人 60 帧更新无异常', !threw, threw);

// 投射物
threw = null;
try {
  const pr = War.Projectiles.make('fireball', 200, 300, 0, 200, 'enemy');
  for (let f = 0; f < 60; f++) War.Projectiles.update(fakeWorld, pr, fakeWorld.dt);
} catch (e) { threw = e; }
ok('投射物更新无异常', !threw, threw);

console.log('== War.Combat 单元测试 ==');
// 用假世界 + 真实敌人，验证结算扣血/连击
{
  fakeWorld.enemies.length = 0;
  fakeWorld.comboHit = function (e, n) { fakeWorld.combo += (n || 1); }; // 测试桩需要真实连击逻辑
  const foe = War.Enemies.make('grunt', 200, fakeWorld.groundY - 30);
  fakeWorld.enemies.push(foe);
  const hp0 = foe.hp;
  const p2 = new War.Player(120, fakeWorld.groundY - 56);
  p2.facing = 1;
  fakeWorld.combo = 0;
  War.Combat.resolveZone(fakeWorld, 200, fakeWorld.groundY - 40, 50, { damage: 10, kb: 100, kbUp: 0, stun: 0.1, kind: 'slash' }, p2);
  ok('resolveZone 命中扣血', foe.hp < hp0, 'hp ' + hp0 + '→' + foe.hp);
  ok('resolveZone 触发连击', fakeWorld.combo > 0);
  // 脱靶不扣血
  const hp2 = foe.hp;
  War.Combat.resolveZone(fakeWorld, 500, 100, 10, { damage: 10, kb: 100, kbUp: 0, stun: 0, kind: 'slash' }, p2);
  ok('resolveZone 脱靶不扣血', foe.hp === hp2);
  fakeWorld.enemies.length = 0;
}

console.log('== 绘制路径（桩 ctx） ==');
threw = null;
try {
  War.Render.init(makeCanvas());
  ['ink', 'pixel', 'cartoon', 'neon'].forEach(style => {
    War.Render.set(style);
    const R = War.Render.cur;
    const w = { camera: { x: 0, y: 0, shakeX: 0, shakeY: 0 }, groundY: 520, t: 0 };
    R.beginFrame(w);
    p.draw(w, R);
    War.Particles.emit({ x: 0, y: 0, color: 'fire', shape: 'feather', vx: 1, vy: 1 });
    War.Particles.draw(R);
    War.Particles.update(0.016);
    R.circle(10, 10, 5, { c: 'fire', fill: true, glow: 2 });
    R.line(0, 0, 5, 5, { c: 'ui', w: 2, glow: 1 });
    R.quad(0, 0, 5, 5, 10, 10, 15, 15, { c: 'phoenix', fill: true });
    R.text('测试', 20, 20, { c: 'uiText', size: 14, font: 'kai', align: 'center' });
    R.rect(0, 0, 10, 10, { c: 'paper', fill: true, rounded: 3 });
    R.ellipse(1, 1, 2, 3, { c: 'phoenix', fill: true });
    R.path([[0, 0], [4, 2], [6, 6]], { c: 'enemy', fill: true, closed: true });
    R.save(); R.translate(1, 1); R.scale(1, 1); R.rotate(0.1); R.restore();
    R.endFrame();
  });
} catch (e) { threw = e; }
ok('四套渲染器图元+绘制无异常', !threw, threw && threw.stack);

// 渲染器 palette 语义色完整性：全部语义键都有映射
const neededKeys = ['bg1','bg2','bg3','ground','groundLine','paper','paperDark','sky','skyLight','cloud','hill1','hill2','moon','sun','vine','plant','rock','line','phoenix','phoenixDark','phoenixLight','feather','fire','fireGlow','bike','bikeLight','wheel','weapon','weaponGlow','enemy','enemyDark','enemyGlow','boss','bossGlow','inkDark','inkMid','inkLight','ui','uiDim','uiAccent','uiText','hp','hpBack','combo','particle','white'];
['ink','pixel','cartoon','neon'].forEach(style => {
  const pal = War.Render.styles[style].palette;
  const missing = neededKeys.filter(k => pal[k] === undefined);
  ok(style + ' palette 语义键完整', missing.length === 0, '缺失: ' + missing.join(','));
});

// 渲染器接口一致性：四风格都暴露全部图元与变换方法
const PRIMS = ['line','circle','ellipse','rect','path','quad','text','save','restore','reset','translate','scale','rotate','beginFrame','endFrame'];
['ink','pixel','cartoon','neon'].forEach(style => {
  const r = War.Render.styles[style];
  const missing = PRIMS.filter(p => typeof r[p] !== 'function');
  ok(style + ' 图元接口完整', missing.length === 0, '缺失: ' + missing.join(','));
});

// 渲染器视觉参数契约：防去重时把 per-style 差异（辉光倍率/采样数/接头/文字发光/字体）拉平
const VISUAL_SPEC = {
  ink:     { glowMulLine: 2, glowMulShape: 2.2, glowMulFlat: 2, quadSamples: 12, lineJoinRound: false, textGlow: true,  textFont: 'kai' },
  cartoon: { glowMulLine: 0, glowMulShape: 0,   glowMulFlat: 0, quadSamples: 10, lineJoinRound: true,  textGlow: false, textFont: 'ui' },
  neon:    { glowMulLine: 3, glowMulShape: 3,   glowMulFlat: 3, quadSamples: 10, lineJoinRound: false, textGlow: true,  textFont: 'ui' }
};
Object.keys(VISUAL_SPEC).forEach(id => {
  const r = War.Render.styles[id];
  const want = VISUAL_SPEC[id];
  const bad = Object.keys(want).filter(k => r[k] !== want[k]);
  ok(id + ' 视觉参数契约一致', bad.length === 0, '偏离: ' + bad.map(k => k + '=' + r[k]).join(', '));
});

console.log('== War.World 工厂 ==');
{
  const w = War.World.create(War.Modes.get('story'), 'ink');
  ok('World.create 生成玩家与地面', !!w.player && w.player.x === 140 && w.groundY > 0);
  ok('World 工具方法齐全', ['spawnFloat','spawnEnemy','spawnProjectile','applyAttackStroke','updateContinuous','emit','parryProjectiles','wallPush','checkDummyByZone'].every(m => typeof w[m] === 'function'));
  // 攻击结算委托给 War.Combat
  let delegated = false;
  const orig = War.Combat.applyStroke;
  War.Combat.applyStroke = function () { delegated = true; };
  w.applyAttackStroke({}, { kind: 'slash' }, {});
  War.Combat.applyStroke = orig;
  ok('applyAttackStroke 委托 War.Combat', delegated);
}

console.log('== Hub DOM 构建 ==');
threw = null;
try {
  War.UI.boot();
} catch (e) { threw = e; console.error('  错误栈:\n' + (e.stack || e)); }
ok('UI boot（Hub 构建）无异常', !threw, threw && threw.stack);

console.log(failures === 0 ? '\n全部通过 ✔' : '\n' + failures + ' 项失败 ✘');
process.exit(failures === 0 ? 0 : 1);
