const { test, expect } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');
const { CustomerActor } = require('./actors/CustomerActor');

test('image viewer rotation persists per customer image', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'Rotate',
    lastName: `Image ${stamp}`,
    contactNumber: `0455${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Rotate Street`
  };

  await app.openClean();
  const customerId = await customers.createCustomer(customer);

  await page.evaluate(async (id) => {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, 80, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('Rotate', 8, 25);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    await window.CrmDB.addImage(id, { name: 'rotate-test.png', type: 'image/png', blob });
  }, customerId);

  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(customer);

  const thumb = page.locator('.clickable-image').first();
  await expect(thumb).toBeVisible();
  await thumb.click();
  await expect(page.getByTestId('viewer-image')).toBeVisible();
  await page.getByTestId('image-rotate-right-button').click();
  await expect(page.getByTestId('viewer-image')).toHaveCSS('transform', /matrix/);
  await expect(page.getByTestId('viewer-image')).toHaveAttribute('style', /rotate\(90deg\)/);
  await page.waitForFunction(async (id) => {
    const images = await window.CrmDB.getImagesByCustomerId(id);
    return images[0] && images[0].rotationDegrees === 90;
  }, customerId);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('viewer-image')).toBeHidden();
  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(customer);
  await expect(thumb).toBeVisible();
  await thumb.click();
  await expect(page.getByTestId('viewer-image')).toHaveAttribute('style', /rotate\(90deg\)/);
  await app.assertNoFatalErrors();
});
