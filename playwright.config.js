const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    baseURL: 'http://127.0.0.1:3101',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'HOST=127.0.0.1 PORT=3101 BROWSER=none npm start',
    url: 'http://127.0.0.1:3101',
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
