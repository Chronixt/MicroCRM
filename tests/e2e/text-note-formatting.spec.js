const { test } = require('@playwright/test');
const { AppActor } = require('./actors/AppActor');
const { CustomerActor } = require('./actors/CustomerActor');
const { NoteActor } = require('./actors/NoteActor');

test('text note toolbar formats bold text and bullet lists', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'Format',
    lastName: `Note ${stamp}`,
    contactNumber: `0444${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Format Street`
  };

  await app.openClean();
  await customers.createCustomer(customer);
  await notes.createFormattedTextNote();
  await notes.expectFormattedTextNote();
  await app.assertNoFatalErrors();
});
