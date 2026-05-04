const { expect } = require('@playwright/test');

class NoteActor {
  constructor(page) {
    this.page = page;
  }

  async createTextNote(text) {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'text'));
    await this.page.getByTestId('add-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(text);
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
    await this.expectSingleNoteWithText(text);
  }

  async createTextNotePinned(text) {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'text'));
    await this.page.getByTestId('add-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(text);
    await this.page.getByTestId('note-pin-checkbox').check({ force: true });
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
    await expect(this.page.getByTestId('pinned-notes-view')).toBeVisible();
    await expect(this.page.getByTestId('pinned-note-entry').filter({ hasText: text })).toHaveCount(1);
  }

  async editFirstTextNote(updatedText) {
    await this.page.getByTestId('edit-note-button').first().click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(updatedText);
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
    await this.expectSingleNoteWithText(updatedText);
  }

  async editFirstPinnedTextNote(updatedText) {
    await this.page.getByTestId('pinned-note-entry').first().getByTestId('edit-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(updatedText);
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
    await this.expectPinnedNoteWithText(updatedText);
  }

  async pinFirstNote() {
    await this.page.getByTestId('pin-note-button').first().click();
  }

  async unpinFirstPinnedNote() {
    await this.page.getByTestId('unpin-note-button').first().click();
  }

  async expectSingleNoteWithText(text) {
    await expect(this.page.getByTestId('note-entry')).toHaveCount(1);
    const note = this.page.getByTestId('note-entry').first();
    await note.locator('.note-header').click();
    await expect(note.getByTestId('text-note-content')).toContainText(text);
  }

  async expectPinnedNoteWithText(text) {
    await expect(this.page.getByTestId('pinned-notes-view')).toBeVisible();
    await expect(this.page.getByTestId('pinned-note-entry')).toHaveCount(1);
    await expect(this.page.getByTestId('pinned-note-entry').first().getByTestId('text-note-content')).toContainText(text);
  }

  async expectNoRegularNotes() {
    await expect(this.page.getByTestId('note-entry')).toHaveCount(0);
  }

  async expectPinnedCount(count) {
    await expect(this.page.getByTestId('pinned-note-entry')).toHaveCount(count);
  }

  async expectPinLimitDisabledForNewNote() {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'text'));
    await this.page.getByTestId('add-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await expect(this.page.getByTestId('note-pin-checkbox')).toBeDisabled();
    await this.page.getByTestId('cancel-note-button').click();
  }
}

module.exports = { NoteActor };
