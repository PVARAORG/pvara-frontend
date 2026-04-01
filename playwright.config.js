const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    actionTimeout: 5000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    timeout: 120_000,
    reuseExistingServer: true,
  },
});
