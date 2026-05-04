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

test('text note editor continues bullet and numbered lists on enter', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'List',
    lastName: `Continue ${stamp}`,
    contactNumber: `0445${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} List Street`
  };

  await app.openClean();
  await customers.createCustomer(customer);
  await notes.createAutoContinuedListNote();
  await notes.expectAutoContinuedListNote();
  await app.assertNoFatalErrors();
});

test('text note editor does not treat bold markdown as a bullet list', async ({ page }) => {
  const app = new AppActor(page);
  const customers = new CustomerActor(page);
  const notes = new NoteActor(page);
  const stamp = Date.now();
  const customer = {
    firstName: 'Bold',
    lastName: `Enter ${stamp}`,
    contactNumber: `0446${String(stamp).slice(-6)}`,
    addressLine1: `${String(stamp).slice(-3)} Bold Street`
  };

  await app.openClean();
  await customers.createCustomer(customer);
  await notes.expectEnterAfterBoldTextDoesNotCreateBullet();
  await app.assertNoFatalErrors();
});
