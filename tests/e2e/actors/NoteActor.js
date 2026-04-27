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

  async editFirstTextNote(updatedText) {
    await this.page.getByTestId('edit-note-button').first().click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(updatedText);
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
    await this.expectSingleNoteWithText(updatedText);
  }

  async expectSingleNoteWithText(text) {
    await expect(this.page.getByTestId('note-entry')).toHaveCount(1);
    const note = this.page.getByTestId('note-entry').first();
    await note.locator('.note-header').click();
    await expect(note.getByTestId('text-note-content')).toContainText(text);
  }
}

module.exports = { NoteActor };
