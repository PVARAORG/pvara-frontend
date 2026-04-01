const { test, expect } = require('@playwright/test');

test('admin can create a job and audit is recorded', async ({ page }) => {
  await page.goto('/');

  // login
  await page.fill('input[placeholder="username"]', 'admin');
  await page.fill('input[placeholder="password"]', 'x');
  await page.click('button:has-text("Login")');

  // go to Admin (nav)
  await page.click('nav >> text=Admin');

  // fill job form
  await page.fill('input[placeholder="Title"]', 'E2E Test Role');
  await page.fill('input[placeholder="Department"]', 'E2E Dept');
  await page.click('button:has-text("Create Job")');

  // verify job appears in existing jobs
  await expect(page.locator('text=E2E Test Role')).toHaveCount(1);

  // go to Audit view
  await page.click('nav >> text=Audit');

  // expect create-job to appear in audit list
  const auditCount = await page.locator('text=create-job').count();
  expect(auditCount).toBeGreaterThan(0);
});
