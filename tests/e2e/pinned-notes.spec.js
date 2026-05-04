const { test, expect } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');
const { CustomerActor } = require('./actors/CustomerActor');
const { NoteActor } = require('./actors/NoteActor');

test('pinned text note moves out of regular notes, persists, unpins, and remains editable', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'Pinned',
    lastName: `Flow ${stamp}`,
    contactNumber: `0411${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Pin Street`
  };
  const firstNote = `Pinned e2e note ${stamp}`;
  const editedNote = `Pinned e2e note edited ${stamp}`;

  await app.openClean();
  await customers.createCustomer(customer);

  await notes.createTextNote(firstNote);
  await notes.pinFirstNote();
  await notes.expectPinnedNoteWithText(firstNote);
  await notes.expectPinnedProfileBodyOnly();
  await notes.expectNoRegularNotes();

  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(customer);
  await notes.expectPinnedNoteWithText(firstNote);
  await notes.expectPinnedProfileBodyOnly();
  await notes.expectNoRegularNotes();

  await page.getByTestId('edit-customer-button').click();
  await expect(page.getByTestId('edit-customer-form')).toBeVisible();
  await notes.editFirstPinnedTextNote(editedNote);
  await notes.expectPinnedNoteWithText(editedNote);

  await notes.unpinFirstPinnedNote();
  await notes.expectSingleNoteWithText(editedNote);
  await app.assertNoFatalErrors();
});

test('new customer temp pinned notes persist after save and pin limit disables sixth pin', async ({ page }) => {
  const app = new AppActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'TempPinned',
    lastName: `Limit ${stamp}`,
    contactNumber: `0422${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Temp Pin Street`
  };

  await app.openClean();
  await page.getByTestId('nav-new-customer').first().click();
  await expect(page.getByTestId('new-customer-form')).toBeVisible();
  await page.getByTestId('customer-first-name').fill(customer.firstName);
  await page.getByTestId('customer-last-name').fill(customer.lastName);
  await page.getByTestId('customer-contact-number').fill(customer.contactNumber);
  const address = page.getByTestId('customer-address-line1');
  if (await address.count()) {
    await address.fill(customer.addressLine1);
  }

  for (let i = 1; i <= 5; i++) {
    await notes.createTextNotePinned(`Temp pinned ${i} ${stamp}`);
  }
  await notes.expectPinnedCount(5);
  await notes.expectPinLimitDisabledForNewNote();

  await page.getByTestId('save-customer-button').click();
  await expect(page).toHaveURL(/#\/customer\?id=/);
  await expect(page.getByTestId('customer-title')).toContainText(customer.firstName);
  await notes.expectPinnedCount(5);
  await expect(page.getByTestId('note-entry')).toHaveCount(0);
  await app.assertNoFatalErrors();
});

test('canvas note creation opens toolbar and accepts drawing input', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'Canvas',
    lastName: `Note ${stamp}`,
    contactNumber: `0433${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Canvas Street`
  };

  await app.openClean();
  await customers.createCustomer(customer);
  await notes.createCanvasNote();
  await app.assertNoFatalErrors();
});
