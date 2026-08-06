/* =========================================================
   e2e 自动化测试 · 凤凰兵器骑行
   运行：npx playwright test   （需先 npm install）
   覆盖：渲染（四风格玩家可见）/ 模式 / 18 兵器战斗 / 输入控制
        / UI（暂停菜单·帮助·返回）/ DPI 适配 / 无控制台错误
   ========================================================= */
const { test, expect } = require('@playwright/test');

const STYLES = ['ink', 'pixel', 'cartoon', 'neon'];
const MODES = ['story', 'endless', 'gallery', 'battle'];

// 每种风格的"凤凰色"判定（含高光混合后的宽容度），以字符串源码传入浏览器
const BODY_PREDICATE = {
  ink:     'r > 150 && g > 40 && g < 130 && b > 30 && b < 95 && r > g + 40 && r > b + 40',
  pixel:   'r > 200 && g > 55 && g < 185 && b > 50 && b < 105 && r > g + 40 && r > b + 80',
  cartoon: 'r > 200 && g > 55 && g < 200 && b > 35 && b < 95 && r > g + 50 && r > b + 100',
  neon:    'r > 180 && b > 120 && g < 210 && r > b * 0.8'
};

async function boot(page) {
  await page.goto('/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.War && window.War.UI && window.War.Engine);
}

async function startGame(page, mode, style) {
  await page.evaluate(({ mode, style }) => {
    window.War.UI.hideHub();
    window.War.Engine.start({ mode, style });
  }, { mode, style });
  await page.waitForTimeout(700);
}

async function press(page, code, hold = 90) {
  await page.evaluate(({ code, hold }) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code })), hold);
  }, { code, hold });
  await page.waitForTimeout(hold + 400); // 等上一个动作彻底结束，避免被 canAct 挡住
}

function captureErrors(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  return errs;
}

// 统计玩家身体区域的凤凰色像素数（世界坐标 → 设备/缓冲坐标）
async function countPlayerBodyPixels(page, style) {
  return page.evaluate(({ style, predSrc }) => {
    const W = window.War;
    const w = W.Engine.world;
    const p = w.player, cam = w.camera;
    const pred = new Function('r', 'g', 'b', 'return (' + predSrc + ');');
    const wx0 = p.x - 34, wx1 = p.x + 34, wy0 = p.y - 66, wy1 = p.y - 4; // 地面之上，避开地面线
    let cv, ctx, sx, sy;
    if (style === 'pixel') {
      const pix = W.Render.styles.pixel;
      cv = pix.buf; ctx = pix.bufCtx;
      sx = sy = pix.buf.width / W.Render.W;
    } else {
      cv = W.Render.canvas; ctx = cv.getContext('2d');
      sx = sy = W.Render.dpr;
    }
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    const x0 = Math.max(0, Math.round((wx0 - cam.x) * sx));
    const x1 = Math.min(cv.width - 1, Math.round((wx1 - cam.x) * sx));
    const y0 = Math.max(0, Math.round((wy0 - cam.y) * sy));
    const y1 = Math.min(cv.height - 1, Math.round((wy1 - cam.y) * sy));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = (y * cv.width + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (pred(r, g, b)) n++;
    }
    return n;
  }, { style: style, predSrc: BODY_PREDICATE[style] });
}

// ---------------- 渲染 ----------------
test.describe('渲染：四种画风下玩家可见且位置正确', () => {
  for (const style of STYLES) {
    test(`${style}：凤凰渲染在预期屏幕位置`, async ({ page }) => {
      const errs = captureErrors(page);
      await boot(page);
      await startGame(page, 'story', style);
      const n = await countPlayerBodyPixels(page, style);
      const threshold = style === 'pixel' ? 2 : 8;
      expect(n, `${style} 玩家身体凤凰色像素数`).toBeGreaterThan(threshold);
      expect(errs, `${style} 无控制台错误`).toEqual([]);
    });
  }

  test('画布覆盖全屏（四角有内容，非空白）', async ({ page }) => {
    await boot(page);
    await startGame(page, 'story', 'ink');
    const r = await page.evaluate(() => {
      const c = document.getElementById('game');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let nonBlank = 0, total = 0;
      for (let i = 0; i < d.length; i += 4) { total++; if (d[i] + d[i + 1] + d[i + 2] > 40) nonBlank++; }
      return nonBlank / total;
    });
    expect(r).toBeGreaterThan(0.95);
  });
});

// ---------------- 模式 ----------------
test.describe('四种模式可启动且状态有效', () => {
  for (const mode of MODES) {
    test(`${mode}：启动无异常`, async ({ page }) => {
      const errs = captureErrors(page);
      await boot(page);
      await startGame(page, mode, 'ink');
      const r = await page.evaluate(() => {
        const w = window.War.Engine.world;
        return {
          running: window.War.Engine.running,
          status: w.status,
          player: { x: w.player.x, y: w.player.y, hp: w.player.hp },
          hasEnemies: w.enemies.length,
          hasDummy: !!w.dummy,
          hasBattle: !!w.battle,
          endless: w.endless ? { dist: Math.round(w.endless.dist) } : null,
          t: w.t
        };
      });
      expect(r.running).toBe(true);
      expect(r.status).toBe('play');
      expect(Number.isFinite(r.player.x)).toBe(true);
      expect(Number.isFinite(r.player.y)).toBe(true);
      expect(r.player.hp).toBeGreaterThan(0);
      if (mode === 'story') expect(r.hasEnemies).toBeGreaterThan(0);
      if (mode === 'gallery') expect(r.hasDummy).toBe(true);
      if (mode === 'battle') expect(r.hasBattle).toBe(true);
      if (mode === 'endless') expect(r.endless.dist).toBeGreaterThan(0);
      expect(errs).toEqual([]);
    });
  }
});

// ---------------- 18 兵器 ----------------
test.describe('十八般兵器：全部能出招且造成伤害', () => {
  test('逐一测试 18 件兵器的轻击/重击', async ({ page }) => {
    const errs = captureErrors(page);
    await boot(page);
    await startGame(page, 'gallery', 'ink');
    const results = await page.evaluate(async () => {
      const W = window.War;
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const w = W.Engine.world;
      // 测试用：禁回血、禁脱臼重置
      w.dummy.regenRate = 0;
      w.dummy.maxHp = 9999;
      w.dummy.hp = 9999;
      const press = async (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        await sleep(90);
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
        await sleep(420);
      };
      const out = [];
      for (let i = 0; i < 18; i++) {
        const weapon = W.Weapons.get(i);
        w.player.weaponIdx = i;
        w.player.state = 'idle'; w.player.attack = null;
        w.dummy.hp = 9999; // 每次重置，独立计量
        // 定位：把 light 最远命中点对准木人，保证整段判定落点
        const maxOff = Math.max.apply(null, weapon.light.strokes.map(s => s.off[0]));
        w.player.x = w.dummy.x - maxOff;
        w.player.facing = 1;
        w.player.y = w.player.groundYOf ? w.player.groundYOf() : (w.groundY - 56);
        const t0 = w.t;
        await press('KeyJ');
        const afterLight = w.dummy.hp;
        await press('KeyL');
        const afterHeavy = w.dummy.hp;
        out.push({
          i: i + 1, name: weapon.name,
          lightDmg: Math.round(9999 - afterLight),
          heavyDmg: Math.round(afterLight - afterHeavy),
          alive: w.t > t0 + 0.5
        });
      }
      return out;
    });
    for (const r of results) {
      expect(r.alive, `兵器#${r.i} ${r.name} 引擎存活`).toBe(true);
      expect(r.lightDmg + r.heavyDmg, `兵器#${r.i} ${r.name} 造成伤害(轻+重)`).toBeGreaterThan(0);
    }
    expect(errs).toEqual([]);
  });
});

// ---------------- 输入控制 ----------------
test.describe('输入控制', () => {
  test('攻击/跳跃/格挡/切兵器均响应', async ({ page }) => {
    const errs = captureErrors(page);
    await boot(page);
    await startGame(page, 'gallery', 'ink');
    const stateNow = () => page.evaluate(() => window.War.Engine.world.player.state);

    // 攻击：按下 J，在攻击帧内检查状态
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' })));
    await page.waitForTimeout(120);
    const duringAttack = await page.evaluate(() => {
      const p = window.War.Engine.world.player;
      return p.state === 'attack' || !!p.attack;
    });
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ' })));
    await page.waitForTimeout(500); // 等攻击结束

    // 切兵器
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3' })));
    await page.waitForTimeout(80);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit3' })));
    await page.waitForTimeout(200);
    const weapon = await page.evaluate(() => window.War.Engine.world.player.getWeapon().name);

    // 格挡：按下 K，在格挡窗口内检查状态
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK' })));
    await page.waitForTimeout(120);
    const duringBlock = await page.evaluate(() => window.War.Engine.world.player.state === 'block');
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyK' })));
    await page.waitForTimeout(400);

    // 跳跃（切换跑酷模式测真实跳跃）
    await startGame(page, 'endless', 'cartoon');
    const y0 = await page.evaluate(() => window.War.Engine.world.player.y);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' })));
    await page.waitForTimeout(250);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })));
    const yAir = await page.evaluate(() => window.War.Engine.world.player.y);

    expect(duringAttack, 'J 轻击触发').toBe(true);
    expect(weapon, 'Digit3 切到剑').toBe('剑');
    expect(duringBlock, 'K 格挡触发').toBe(true);
    expect(yAir, 'Space 跳跃离地').toBeLessThan(y0 - 10);
    expect(errs).toEqual([]);
  });

  test('[ ] 循环切换兵器', async ({ page }) => {
    await boot(page);
    await startGame(page, 'gallery', 'pixel');
    await press(page, 'BracketRight');
    const idx = await page.evaluate(() => window.War.Engine.world.player.weaponIdx);
    expect(idx).toBe(1);
  });
});

// ---------------- UI 交互 ----------------
test.describe('UI：暂停菜单 / 帮助 / 返回', () => {
  test('Hub 帮助面板打开与关闭', async ({ page }) => {
    await boot(page);
    await page.click('#hubHelp');
    await expect(page.locator('#helpPanel')).toBeVisible();
    await page.click('.help-close');
    await expect(page.locator('#helpPanel')).toBeHidden();
  });

  test('点击模式卡启动游戏，右上角工具栏出现', async ({ page }) => {
    await boot(page);
    await page.click('.mode-card[data-mode="story"]');
    await expect(page.locator('#hub')).toBeHidden();
    await expect(page.locator('#gameBar')).toBeVisible();
    const r = await page.evaluate(() => ({ running: window.War.Engine.running, mode: window.War.Engine.world && window.War.Engine.world.mode.id }));
    expect(r.running).toBe(true);
    expect(r.mode).toBe('story');
  });

  test('暂停菜单：继续 / 返回主界面', async ({ page }) => {
    await boot(page);
    await page.click('.mode-card[data-mode="battle"]');
    await page.waitForTimeout(500);
    // 打开菜单
    await page.click('#btnMenu');
    await expect(page.locator('#pauseMenu')).toBeVisible();
    // 返回主界面
    await page.click('#pauseMenu button[data-act="exit"]');
    await expect(page.locator('#hub')).toBeVisible();
    const r = await page.evaluate(() => window.War.Engine.running);
    expect(r).toBe(false);
  });

  test('P / Esc 开关暂停菜单', async ({ page }) => {
    await boot(page);
    await page.click('.mode-card[data-mode="endless"]');
    await page.waitForTimeout(500);
    await press(page, 'KeyP', 30);
    let vis = await page.evaluate(() => document.getElementById('pauseMenu').style.display);
    expect(vis).toBe('flex');
    await press(page, 'Escape', 30);
    vis = await page.evaluate(() => document.getElementById('pauseMenu').style.display);
    expect(vis).toBe('none');
  });

  test('游戏内帮助可打开', async ({ page }) => {
    await boot(page);
    await page.click('.mode-card[data-mode="gallery"]');
    await page.waitForTimeout(400);
    await page.click('#btnHelp');
    await expect(page.locator('#helpPanel')).toBeVisible();
    await page.click('.help-close');
    await expect(page.locator('#helpPanel')).toBeHidden();
  });
});

// ---------------- DPI 适配 ----------------
test.describe('高 DPI 适配', () => {
  test('backing store = CSS 尺寸 × dpr', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(() => {
      Object.defineProperty(window, 'devicePixelRatio', { get: () => 2, configurable: true });
      window.War.Render.resize();
      const c = document.getElementById('game');
      return { cw: c.width, ch: c.height, iw: window.innerWidth, ih: window.innerHeight, dpr: window.devicePixelRatio };
    });
    expect(r.cw).toBe(Math.round(r.iw * 2));
    expect(r.ch).toBe(Math.round(r.ih * 2));
  });

  test('dpr=2 时画布全屏有内容（四角非空）', async ({ page }) => {
    await boot(page);
    await page.evaluate(() => {
      Object.defineProperty(window, 'devicePixelRatio', { get: () => 2, configurable: true });
      window.War.Render.resize();
    });
    await startGame(page, 'story', 'ink');
    const r = await page.evaluate(() => {
      const c = document.getElementById('game');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      function corner(x, y) { const i = (y * c.width + x) * 4; return d[i] + d[i + 1] + d[i + 2]; }
      return {
        tr: corner(c.width - 10, 10), br: corner(c.width - 10, c.height - 10),
        tl: corner(10, 10), bl: corner(10, c.height - 10)
      };
    });
    expect(r.tr).toBeGreaterThan(40);
    expect(r.br).toBeGreaterThan(40);
    expect(r.tl).toBeGreaterThan(40);
    expect(r.bl).toBeGreaterThan(40);
  });
});

// ---------------- 单文件产物 ----------------
test.describe('单文件构建产物（dist/index.html）', () => {
  test('单文件可启动且玩家可见、零报错', async ({ page }) => {
    const errs = captureErrors(page);
    await page.goto('/dist/index.html');
    await page.waitForFunction(() => window.War && window.War.UI && window.War.Engine);
    await startGame(page, 'story', 'ink');
    const n = await countPlayerBodyPixels(page, 'ink');
    expect(n, '单文件下玩家可见（凤凰色像素）').toBeGreaterThan(8);
    expect(errs).toEqual([]);
  });

  test('单文件四种画风均正常渲染', async ({ page }) => {
    await page.goto('/dist/index.html');
    await page.waitForFunction(() => window.War && window.War.UI && window.War.Engine);
    for (const style of STYLES) {
      await startGame(page, 'story', style);
      const n = await countPlayerBodyPixels(page, style);
      const threshold = style === 'pixel' ? 2 : 8;
      expect(n, `${style} 单文件玩家可见`).toBeGreaterThan(threshold);
    }
  });
});

// ---------------- 控制台错误 ----------------
test.describe('无控制台错误（全模式×全风格冒烟）', () => {
  for (const style of STYLES) {
    test(`${style}：四模式各跑数秒无报错`, async ({ page }) => {
      const errs = captureErrors(page);
      await boot(page);
      for (const mode of MODES) {
        await startGame(page, mode, style);
        await page.waitForTimeout(800);
        const alive = await page.evaluate(() => window.War.Engine.running && Number.isFinite(window.War.Engine.world.t));
        expect(alive, `${mode}/${style} 引擎存活`).toBe(true);
      }
      expect(errs).toEqual([]);
    });
  }
});
