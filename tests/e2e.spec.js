const { test, expect } = require('@playwright/test');

test('admin can create a job and audit is recorded', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token');
    localStorage.setItem(
      'pvara_user',
      JSON.stringify({ username: 'admin', role: 'admin', name: 'Admin' })
    );
  });

  await page.goto('/');
  await expect(page.getByText('Role: admin')).toBeVisible();

  // go to Admin (nav)
  await page.getByRole('button', { name: 'Admin' }).click();
  await expect(page.getByText('No jobs found')).toBeVisible();

  // open create-job modal
  await page.locator('button').filter({ hasText: 'Create Job' }).first().click();
  await expect(page.getByText('Create New Job Posting')).toBeVisible();

  // fill job form
  await page.fill('input[placeholder="e.g., Senior Software Engineer"]', 'E2E Test Role');
  await page.fill('input[placeholder="e.g., Engineering"]', 'E2E Dept');
  await page.locator('button[type="submit"]').filter({ hasText: 'Create Job' }).click();
  await page.getByRole('button', { name: 'Got it' }).click();

  // verify job appears in existing jobs
  await expect(page.getByRole('heading', { name: 'E2E Test Role' })).toBeVisible();

  // go to Audit view
  await page.getByRole('button', { name: 'Audit Log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit Log' })).toBeVisible();

  // expect create-job to appear in audit list
  await expect(page.getByText('create-job')).toBeVisible();
});
