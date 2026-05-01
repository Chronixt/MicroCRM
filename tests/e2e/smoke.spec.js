const { test } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');
const { CustomerActor } = require('./actors/CustomerActor');
const { NoteActor } = require('./actors/NoteActor');
const { BackupActor } = require('./actors/BackupActor');

test('critical local CRM smoke flow: customer, note, persistence, backup', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const backups = new BackupActor(page);

  const stamp = Date.now();
  const customer = {
    firstName: 'E2E',
    lastName: `Smoke ${stamp}`,
    contactNumber: `0400${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Test Street`
  };
  const editedCustomer = {
    ...customer,
    lastName: `Smoke Edited ${stamp}`,
    contactNumber: `0499${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Edited Test Street`
  };
  const firstNote = `E2E smoke note ${stamp}`;
  const editedNote = `E2E smoke note edited ${stamp}`;

  await app.openClean();

  await customers.createCustomer(customer);
  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(customer);

  await customers.editCustomer(customer, editedCustomer);
  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(editedCustomer);

  await notes.createTextNote(firstNote);
  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(editedCustomer);
  await notes.expectSingleNoteWithText(firstNote);

  await notes.editFirstTextNote(editedNote);
  await page.reload();
  await app.waitForReady();
  await customers.openCustomerBySearch(editedCustomer);
  await notes.expectSingleNoteWithText(editedNote);

  const backup = await backups.downloadDataOnlyBackup();
  backups.assertBackupContainsCustomerAndNote(backup, editedCustomer, editedNote);

  await app.assertNoFatalErrors();
});
