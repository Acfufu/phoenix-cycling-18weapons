const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1, // 游戏共享 localStorage / 单服务，串行更稳
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8177',
    viewport: { width: 1280, height: 720 },
    // 有头调试时可改为 headless: false
  },
  webServer: {
    command: 'python3 -m http.server 8177',
    url: 'http://localhost:8177/index.html',
    reuseExistingServer: true,
    timeout: 10000
  }
});
