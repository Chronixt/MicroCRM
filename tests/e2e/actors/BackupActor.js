const fs = require('node:fs/promises');
const { expect } = require('@playwright/test');

class BackupActor {
  constructor(page) {
    this.page = page;
  }

  async downloadDataOnlyBackup() {
    await this.page.goto('/#/backup');
    await expect(this.page.getByTestId('backup-export-data-only')).toBeVisible();
    await this.page.getByTestId('backup-export-data-only').click();
    await expect(this.page.getByTestId('backup-status')).toContainText('Data-only backup ready');

    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByTestId('backup-download').click();
    const download = await downloadPromise;
    const path = await download.path();
    if (!path) throw new Error('Playwright did not provide a download path.');

    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  }

  assertBackupContainsCustomerAndNote(backup, customer, editedNoteText) {
    const customers = backup.customers || [];
    const matchedCustomer = customers.find((candidate) =>
      candidate.firstName === customer.firstName &&
      candidate.lastName === customer.lastName &&
      candidate.contactNumber === customer.contactNumber
    );

    expect(matchedCustomer, 'backup should include the smoke-test customer').toBeTruthy();

    const notes = Array.isArray(backup.notes)
      ? backup.notes
      : Object.values(backup.customerNotes || {}).flat();

    const matchedNote = notes.find((note) => {
      const payload = [
        note.text,
        note.textValue,
        note.content,
        note.svg
      ].filter(Boolean).join('\n');
      return Number(note.customerId) === Number(matchedCustomer.id) && payload.includes(editedNoteText);
    });

    expect(matchedNote, 'backup should include the edited smoke-test note').toBeTruthy();
  }
}

module.exports = { BackupActor };
