/* =========================================================
   verify-dist.js · 验证单文件构建产物可独立运行（file:// 双击即玩）
   运行：node scripts/build-single.js && node scripts/verify-dist.js
   ========================================================= */
const path = require('path');
const { chromium } = require('@playwright/test');

(async () => {
  const url = 'file://' + path.resolve(__dirname, '../dist/index.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(url);
  await page.waitForFunction(() => window.War && window.War.UI, null, { timeout: 8000 });

  const hubVis = await page.evaluate(() => document.getElementById('hub').style.display);
  await page.evaluate(() => { window.War.UI.hideHub(); window.War.Engine.start({ mode: 'story', style: 'ink' }); });
  await page.waitForTimeout(1200);

  const state = await page.evaluate(() => ({
    running: window.War.Engine.running,
    playerX: Math.round(window.War.Engine.world.player.x),
    t: +window.War.Engine.world.t.toFixed(2),
    enemies: window.War.Engine.world.enemies.length
  }));
  const nonBlank = await page.evaluate(() => {
    const c = document.getElementById('game');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 40) n++;
    return +(n / (d.length / 4)).toFixed(3);
  });

  const ok = state.running && state.t > 0.5 && nonBlank > 0.9 && errs.length === 0;
  console.log(JSON.stringify({ hubVis, state, nonBlank, errs, ok }, null, 2));
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
