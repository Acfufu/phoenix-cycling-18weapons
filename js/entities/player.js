/* =========================================================
   War.Player · 凤凰 + 自行车
   状态机：idle / run / jump / attack / block / hurt / trick / dead
   攻击用当前兵器 light/heavy strokes，由 Engine 结算命中
   ========================================================= */
War.Player = (function () {
  var U = War.utils;
  var GRAV = 1500, JUMP_V = 640, MAX_FALL = 920;
  var RUN_SPEED = 310, ACCEL = 2200, FRICTION = 2000;
  var WHEEL_R = 19;
  var GROUND_OFF = 56; // player.y（躯干中心）到地面的距离

  function Player(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = true;
    this.maxHp = 100; this.hp = 100;
    this.invuln = 0; this.dead = false;
    this.state = 'idle'; this.stateT = 0;
    this.weaponIdx = 0;
    this.attack = null;
    this.blockT = 0; // 格挡剩余
    this.counterReady = false; // 拐子反击
    this.wheelRot = 0; this.pedalRot = 0; this.bob = 0;
    this.trickTime = 0; // 空中滞留累积（跑酷特技）
    this.lockMove = 0; // 硬直
    this.hitFlash = 0;
    this.deflectFlash = 0;
  }

  Player.prototype.getWeapon = function () { return War.Weapons.get(this.weaponIdx); };

  Player.prototype.groundY = function (world) { return world.groundY - GROUND_OFF; };

  Player.prototype.reset = function (world) {
    this.x = 140; this.y = this.groundY(world);
    this.vx = 0; this.vy = 0;
    this.facing = 1; this.hp = this.maxHp;
    this.onGround = true; this.dead = false;
    this.state = 'idle'; this.stateT = 0; this.attack = null;
    this.weaponIdx = 0;
  };

  Player.prototype.switchWeapon = function (idx) {
    if (idx === this.weaponIdx) return;
    this.weaponIdx = idx;
    var w = this.getWeapon();
    War.Audio.sfx('ui', { pitch: 1 + w.index * 0.02 });
  };

  // 检测是否处于可攻击状态
  Player.prototype.canAct = function () {
    return this.state !== 'dead' && this.state !== 'hurt' && !this.attack && this.state !== 'block';
  };

  Player.prototype.update = function (world, dt) {
    var w = this.getWeapon();
    var input = War.Input;
    var ax = input.axisX();
    this.stateT += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.deflectFlash > 0) this.deflectFlash -= dt;

    // 换兵器
    var wi = input.weaponIndex(this.weaponIdx, War.Weapons.count);
    if (wi >= 0 && this.canAct()) this.switchWeapon(wi);

    // ---- 状态处理 ----
    if (this.state === 'dead') {
      this.vy = Math.min(this.vy + GRAV * dt, MAX_FALL);
      this.y += this.vy * dt;
      this.phaseGround(world);
      return;
    }

    if (this.state === 'hurt') {
      this.vy = Math.min(this.vy + GRAV * dt, MAX_FALL);
      this.y += this.vy * dt;
      this.vx *= Math.max(0, 1 - 8 * dt);
      this.x += this.vx * dt;
      this.phaseGround(world);
      if (this.stateT >= 0.34) this.state = 'idle';
      // 受伤期间允许被格挡攻击免疫
      return;
    }

    if (this.state === 'block') {
      this.blockT -= dt;
      this.vx = 0;
      if (this.blockT <= 0) { this.state = 'idle'; this.stateT = 0; }
      return;
    }

    if (this.attack) {
      this.updateAttack(world, dt);
      this.x += this.vx * dt; // 突进位移（枪/槊/戟等）
      // 攻击中仍受重力影响（空中攻击）
      this.vy = Math.min(this.vy + GRAV * dt, MAX_FALL);
      this.y += this.vy * dt;
      this.phaseGround(world);
      return;
    }

    // ---- 空闲 / 移动 ----
    var speed = world.playerSpeed != null ? world.playerSpeed : RUN_SPEED;
    if (input.down('ArrowLeft') || input.down('KeyA')) ax = -1;
    else if (input.down('ArrowRight') || input.down('KeyD')) ax = 1;
    else ax = 0;

    // 跑酷模式：自动前进
    if (world.autoScroll) {
      ax = 1;
      speed = world.playerSpeed;
    }

    if (ax !== 0) {
      this.facing = ax;
      this.vx = U.damp(this.vx, ax * speed, 10, dt);
    } else {
      this.vx = U.damp(this.vx, 0, 12, dt);
    }

    // 跳跃
    if ((input.down('Space') || input.down('ArrowUp') || input.down('KeyW')) && this.onGround) {
      this.vy = -JUMP_V;
      this.onGround = false;
      this.state = 'jump';
      this.stateT = 0;
      this.trickTime = 0;
      War.Audio.sfx('jump');
      world.emitDust(this.x, this.y + GROUND_OFF - 14, 6);
    }

    // 空中特技（跑酷）：轻击/重击/格挡都算
    if (!this.onGround && (input.pressed('KeyJ') || input.pressed('Space') || input.pressed('KeyK') || input.pressed('KeyL') || input.pressed('KeyK'))) {
      // 记录特技时机由 endless 模式处理
      world.notifyTrick && world.notifyTrick(this, dt);
    }

    // 攻击 / 格挡（地面或空中均可，空中=特技）
    if (input.pressed('KeyJ')) this.startAttack(world, 'light');
    else if (input.pressed('KeyL')) this.startAttack(world, 'heavy');
    else if (input.pressed('KeyK') || input.pressed('KeyZ')) this.startBlock(world);

    // 重力
    this.vy = Math.min(this.vy + GRAV * dt, MAX_FALL);
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    this.phaseGround(world);

    // 跑酷：落地结算特技
    if (this.onGround) {
      if (this.trickTime > 0) { world.landTrick && world.landTrick(this, this.trickTime); this.trickTime = 0; }
      if (this.state === 'jump') { this.state = 'idle'; this.stateT = 0; War.Audio.sfx('land'); world.emitDust(this.x, this.y + GROUND_OFF - 12, 4); }
      if (Math.abs(this.vx) > 20 && this.state === 'idle') this.state = 'run';
      else if (Math.abs(this.vx) <= 20 && this.state === 'run') this.state = 'idle';
    } else {
      if (this.state !== 'jump') this.state = 'jump';
      this.trickTime += dt;
    }

    // 自行车动画
    this.wheelRot += (this.vx / WHEEL_R) * dt * (this.facing);
    this.pedalRot += (this.vx / WHEEL_R) * dt * 0.6 * (this.facing);
    this.bob = Math.sin(this.wheelRot * 3) * 2 * Math.min(1, Math.abs(this.vx) / RUN_SPEED);
  };

  Player.prototype.startAttack = function (world, kind) {
    if (!this.canAct()) return;
    var w = this.getWeapon();
    var atk = w[kind];
    if (!atk) return;
    this.state = 'attack';
    this.stateT = 0;
    this.attack = {
      weapon: w, kind: kind, t: 0, dur: atk.dur,
      strokes: atk.strokes, applied: {},
      lunge: atk.lunge || 0, deflect: atk.deflect || false,
      sfx: atk.sfx, fx: atk.fx, shake: atk.shake || 0,
      slowmo: atk.slowmo || 0, facing: this.facing
    };
    if (atk.sfx) War.Audio.sfx(atk.sfx);
    // 招式名落款
    if (w.tip) world.spawnBanner(w.char + '·' + w.tip, this.x + this.facing * 30, this.y - 70, w);
    if (kind === 'heavy') {
      this.vx *= 0.2;
      War.Audio.sfx('charge');
    }
  };

  Player.prototype.startBlock = function (world) {
    if (!this.canAct()) return;
    var w = this.getWeapon();
    var b = w.block;
    this.state = 'block';
    this.stateT = 0;
    this.blockT = b.dur;
    this.blockKind = b.kind;
    if (b.sfx) War.Audio.sfx(b.sfx);
  };

  Player.prototype.updateAttack = function (world, dt) {
    var a = this.attack;
    a.t += dt;
    var k = a.t / a.dur;

    // 突进
    if (a.lunge && this.onGround) {
      this.vx = a.lunge / a.dur * a.facing * (1 - k * 0.6);
    } else if (a.lunge) {
      this.vx *= Math.max(0, 1 - 6 * dt);
    }

    // 结算 strokes
    var strokes = a.strokes || [];
    for (var i = 0; i < strokes.length; i++) {
      if (!a.applied[i] && k >= strokes[i].at) {
        a.applied[i] = true;
        world.applyAttackStroke(this, strokes[i], a);
      }
    }

    // 特技判定
    if (!this.onGround) world.notifyTrick && world.notifyTrick(this, dt);

    // 攻击特效：武器轨迹
    if (a.fx === 'slash' || a.fx === 'slashBig') {
      world.emitSlashTrail(this, a);
    } else if (a.fx === 'spin' || a.fx === 'orbit' || a.fx === 'orbitBig') {
      world.emitSpinTrail(this, a);
    }

    if (k >= 1) {
      this.attack = null;
      this.state = 'idle';
      this.stateT = 0;
      this.vx *= 0.5;
    }
  };

  // 格挡命中处理（返回是否成功格挡）
  Player.prototype.tryBlockHit = function (world, fromX, dmg, src) {
    if (this.state !== 'block' || this.blockT <= 0) return false;
    var front = Math.sign(fromX - this.x) === this.facing || Math.sign(fromX - this.x) === 0;
    if (!front && this.blockKind !== 'wall') return false;
    var b = this.getWeapon().block;
    var result = false;
    if (b.kind === 'parry') {
      // 剑·反弹：反射投射物
      world.parryProjectiles(this, fromX);
      War.Audio.sfx('parry');
      this.deflectFlash = 0.18;
      world.shake(0.25);
      this.blockT = 0; this.state = 'idle';
      result = true;
    } else if (b.kind === 'wall') {
      // 棍·气墙：推开敌人
      world.wallPush(this);
      War.Audio.sfx('block');
      world.shake(0.3);
      this.blockT *= 0.6;
      result = true;
    } else if (b.kind === 'counter') {
      // 拐子·反击：格挡后自动反击
      War.Audio.sfx('parry');
      world.shake(0.3);
      this.blockT = 0; this.state = 'idle';
      this.startAttack(world, 'light');
      result = true;
    } else {
      War.Audio.sfx('block');
      world.shake(0.2);
      this.blockT *= 0.5;
      result = true;
    }
    world.spawnFloat('格挡', this.x + this.facing * 16, this.y - 40, 'block');
    return result;
  };

  Player.prototype.takeHit = function (world, dmg, fromX, opts) {
    opts = opts || {};
    if (this.dead || this.invuln > 0) return false;
    if (this.tryBlockHit(world, fromX, dmg)) return false;
    this.hp -= dmg;
    this.invuln = 0.9;
    this.hitFlash = 0.22;
    this.state = 'hurt'; this.stateT = 0; this.attack = null;
    this.vx = (fromX > this.x ? -1 : 1) * (opts.kb || 260);
    this.vy = opts.kbUp != null ? -opts.kbUp : -140;
    this.onGround = false;
    War.Audio.sfx('hurt');
    world.shake(opts.shake || 0.5);
    world.spawnFloat('-' + Math.round(dmg), this.x, this.y - 50, 'damage');
    world.emitHitSparks(this.x, this.y - 10, 'phoenixLight');
    if (this.hp <= 0) {
      this.hp = 0; this.die(world);
    }
    return true;
  };

  Player.prototype.die = function (world) {
    this.dead = true;
    this.state = 'dead';
    War.Audio.sfx('death');
    world.emitFeathers(this.x, this.y, 14);
    world.shake(1.2);
    world.slowMotion(0.3, 0.7);
  };

  Player.prototype.phaseGround = function (world) {
    var gy = this.groundY(world);
    if (this.y >= gy) {
      if (!this.onGround) { /* 落地音由 update 处理 */ }
      this.y = gy; this.vy = 0; this.onGround = true;
    } else {
      this.onGround = false;
    }
  };

  Player.prototype.draw = function (world, R) {
    var t = world.t;
    var px = this.x, py = this.y + this.bob;

    R.save();
    R.translate(px, py);
    if (this.facing < 0) R.scale(-1, 1);

    var airK = this.onGround ? 0 : Math.sin(Math.min(this.trickTime * 10, Math.PI)) * 0.25;
    R.rotate(airK); // 空中前倾特技
    var w = this.getWeapon();

    // ---- 自行车 ----
    this.drawBike(R, t);

    // ---- 凤凰身体 ----
    this.drawPhoenix(R, t, w);

    // ---- 兵器 ----
    var atkK = this.attack ? Math.min(this.attack.t / this.attack.dur, 1) : 0;
    var atkDir = this.attack ? this.attack.kind : 'idle';
    this.drawWeapon(R, w, atkK, atkDir, t);

    R.restore();

    // 受击闪白 / 格挡闪光
    if (this.hitFlash > 0) R.circle(px, py, 34, { c: 'white', fill: true, a: this.hitFlash * 2.2 });
    if (this.deflectFlash > 0) R.circle(px, py, 40, { c: 'weaponGlow', stroke: true, w: 3, glow: 12, a: this.deflectFlash * 3 });
    // 格挡圈
    if (this.state === 'block') R.circle(px, py, 46, { c: 'weaponGlow', stroke: true, w: 2.5, glow: 10, a: 0.5 + 0.3 * Math.sin(t * 20) });
  };

  Player.prototype.drawBike = function (R, t) {
    var wr = this.wheelRot;
    var pedR = this.pedalRot;
    var rideK = Math.min(1, Math.abs(this.vx) / 240);
    var wob = Math.sin(t * 8 + this.x) * 0.02;

    // 后轮
    this.wheel(R, -25, 30, wr);
    // 前轮
    this.wheel(R, 27, 30, wr + 0.4);

    // 车架（后上叉→座管→上管→头管→前叉→后下叉）
    R.line(-25, 30, -14, -2, { c: 'bike', w: 3.5 });
    R.line(-14, -2, 14, -8, { c: 'bike', w: 3.5 });
    R.line(14, -8, 27, 30, { c: 'bike', w: 3.5, glow: 0.5 });
    R.line(-25, 30, -2, 30, { c: 'bike', w: 3 });
    R.line(27, 30, 20, -2, { c: 'bike', w: 3, glow: 0.5 });

    // 车把
    R.line(20, -2, 22, -16, { c: 'bike', w: 3.5 });
    R.line(15, -16, 27, -16, { c: 'bike', w: 3.5 });
    R.circle(27, -16, 3, { c: 'bikeLight', fill: true });

    // 座垫 + 弹簧
    R.line(-14, -2, -14, -10, { c: 'bike', w: 3 });
    R.rect(-21, -14, 13, 5, { c: 'bike', fill: true, rounded: 3 });
    R.rect(-21.5, -11, 14, 2, { c: 'bikeLight', fill: true, a: 0.5 });

    // 踏板曲柄（旋转）
    var crankX = Math.cos(pedR) * 11, crankY = Math.sin(pedR) * 11;
    R.line(-crankX, 30 + crankY * 0.4, crankX, 30 - crankY * 0.4, { c: 'bike', w: 2.5 });
    R.circle(crankX, 30 - crankY * 0.4, 3.5, { c: 'wheel', fill: true });
    R.circle(-crankX, 30 + crankY * 0.4, 3.5, { c: 'wheel', fill: true });
  };

  Player.prototype.wheel = function (R, x, y, rot) {
    R.circle(x, y, 19, { c: 'wheel', stroke: true, w: 3.5 });
    R.circle(x, y, 4, { c: 'wheel', fill: true });
    var i;
    for (i = 0; i < 3; i++) {
      var a = rot + i * U.TAU / 3;
      R.line(x + Math.cos(a) * 13, y + Math.sin(a) * 13, x + Math.cos(a + Math.PI) * 13, y + Math.sin(a + Math.PI) * 13, { c: 'wheel', w: 1.6, a: 0.8 });
    }
    R.circle(x, y, 19, { c: 'wheel', stroke: true, w: 1.2, a: 0.5, glow: 0.6 });
  };

  Player.prototype.drawPhoenix = function (R, t, w) {
    var flap = this.onGround ? 0 : Math.sin(t * 26) * 0.5;
    var rideK = Math.min(1, Math.abs(this.vx) / 240);
    var lean = rideK * 0.12 + (this.onGround ? 0 : 0.15);

    R.save();
    R.rotate(lean);

    // 尾羽（3-4 根，随风摆动）
    var i, ph = ['phoenix', 'phoenixLight', 'fire', 'phoenixDark'];
    for (i = 0; i < 4; i++) {
      var wob = Math.sin(t * 5 + i * 1.3) * 6 + this.vx * 0.01;
      var bx = -14 - i * 5, by = -6 + i * 3;
      R.quad(
        bx, by + 4,
        bx - 6, by + 18,
        bx + 2 + wob, by + 34,
        bx - 10 + wob * 1.5, by + 44,
        { c: ph[i], fill: true, a: 0.92 - i * 0.08, glow: 1.5 }
      );
    }

    // 身体（椭圆）
    R.circle(0, -10, 15, { c: 'phoenix', fill: true, glow: 2 });
    R.ellipse(2, -12, 14, 17, { c: 'phoenix', fill: true, glow: 2.5 });
    R.ellipse(4, -14, 10, 12, { c: 'phoenixLight', fill: true, a: 0.55, glow: 2 });

    // 翅膀（羽扇状）
    var wingA = -0.9 + flap;
    R.quad(
      6, -16,
      -6, -34,
      -18, -30 + flap * 4,
      -2, -18,
      { c: 'phoenixDark', fill: true }
    );
    R.quad(
      8, -15,
      -2, -30,
      -13, -26 + flap * 4,
      0, -17,
      { c: 'phoenix', fill: true, a: 0.9, glow: 1.5 }
    );
    for (i = 0; i < 3; i++) {
      R.line(-2 + i * 2, -26 + flap * 3, -14 + i * 2, -24 + flap * 4, { c: 'phoenixLight', w: 1.5, a: 0.8 });
    }

    // 颈 + 头
    R.quad(
      8, -14,
      12, -26,
      14, -32,
      18, -40,
      { c: 'phoenix', fill: true }
    );
    R.circle(19, -42, 7, { c: 'phoenix', fill: true, glow: 2 });
    R.circle(20, -43, 5, { c: 'phoenixLight', fill: true, a: 0.5 });

    // 头冠（3 根翎毛）
    for (i = 0; i < 3; i++) {
      var ca = -Math.PI * 0.9 + i * 0.5 + Math.sin(t * 6 + i) * 0.1;
      R.line(18, -48, 18 + Math.cos(ca) * 9, -48 + Math.sin(ca) * 9, { c: 'fire', w: 1.8, glow: 3, a: 0.9 });
      R.circle(18 + Math.cos(ca) * 9, -48 + Math.sin(ca) * 9, 1.6, { c: 'fireGlow', fill: true, glow: 4 });
    }

    // 喙
    R.line(25, -44, 32, -43, { c: 'fire', w: 2.4, glow: 1.5 });
    R.line(25, -42, 31, -41, { c: 'fire', w: 2, glow: 1.5 });
    // 眼
    R.circle(22, -44, 1.8, { c: 'paperDark', fill: true });
    // 火焰氤氲
    if (!this.onGround || this.vx > 100) {
      R.circle(-8, 6, 9, { c: 'fire', fill: true, a: 0.28, glow: 12 });
      R.circle(-2, 8, 6, { c: 'fireGlow', fill: true, a: 0.3, glow: 10 });
    }

    // 腿（踩踏板）
    var pedR = this.pedalRot;
    var fx = Math.cos(pedR) * 11, fy = 30 - Math.sin(pedR) * 11 * 0.4;
    R.line(4, 4, fx - 8, fy - 2, { c: 'phoenixDark', w: 3 });
    R.line(6, 6, fx, fy, { c: 'phoenixDark', w: 3 });

    R.restore();
  };

  Player.prototype.drawWeapon = function (R, w, atkK, atkDir, t) {
    War.WeaponDraw.draw(R, w, { attack: this.attack, atkK: atkK, atkDir: atkDir, t: t });
  };

  return Player;
})();
