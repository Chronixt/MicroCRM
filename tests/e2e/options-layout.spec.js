const { test, expect } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');

test('options page uses modern import/export layout and keeps sign out out of the page', async ({ page }) => {
  const app = new AppActor(page);
  await app.openClean();

  await page.goto('/#/backup');
  await app.waitForReady();

  await expect(page.locator('.options-modern-page')).toBeVisible();
  await expect(page.locator('.import-panel')).toContainText('Restore from backup');
  await expect(page.locator('.export-panel')).toContainText('Create backup');
  await expect(page.locator('.options-danger-panel')).toContainText(/Wipe All Data|Delete My Data/);

  await expect(page.locator('#import-file')).toBeVisible();
  await expect(page.getByTestId('backup-export-full')).toBeVisible();
  await expect(page.getByTestId('backup-export-data-only')).toBeVisible();
  await expect(page.getByTestId('backup-download')).toBeVisible();
  await expect(page.locator('#wipe-btn')).toBeVisible();

  await expect(page.locator('#signout-btn')).toHaveCount(0);
  await expect(page.locator('.advanced-options-panel')).toBeVisible();
  await expect(page.locator('#scan-notes-btn')).not.toBeVisible();

  await page.locator('.advanced-options-panel summary').click();
  await expect(page.locator('#scan-notes-btn')).toBeVisible();
  await expect(page.locator('#restore-notes-btn')).toBeVisible();

  await app.assertNoFatalErrors();
});
