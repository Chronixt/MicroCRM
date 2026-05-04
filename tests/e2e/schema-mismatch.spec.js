const { test, expect } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');

test.use({ serviceWorkers: 'block' });

test('startup blocks with schema mismatch banner when supabase preflight fails', async ({ page }) => {
  const app = new AppActor(page);
  await app.openWithForcedSchemaMismatch();

  await expect(page.getByRole('heading', { name: 'Schema Mismatch Detected' })).toBeVisible();
  await expect(page.getByText('startup was blocked', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload App' })).toBeVisible();

  // Ensure normal navigation did not render behind the blocker.
  await expect(page.getByTestId('nav-new-customer')).toHaveCount(0);
});
