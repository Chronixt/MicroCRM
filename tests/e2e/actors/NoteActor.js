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

  async expectPinnedProfileBodyOnly() {
    const pinned = this.page.getByTestId('pinned-note-entry').first();
    await expect(pinned.locator('.note-header')).toHaveCount(0);
    await expect(pinned.getByTestId('edit-note-button')).toHaveCount(0);
    await expect(pinned.getByTestId('unpin-note-button')).toHaveCount(0);
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

  async createCanvasNote() {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'canvas'));
    await this.page.getByTestId('add-note-button').click();
    const overlay = this.page.locator('#fullscreen-notes-overlay');
    await expect(overlay).toBeVisible();
    const canvas = overlay.locator('canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas bounding box unavailable');
    await this.page.mouse.move(box.x + 20, box.y + 20);
    await this.page.mouse.down();
    await this.page.mouse.move(box.x + 100, box.y + 80);
    await this.page.mouse.up();
    await overlay.getByText('Done').click();
    await this.page.getByTestId('save-note-button').click();
    await expect(overlay).toBeHidden();
    await expect(this.page.getByTestId('note-entry')).toHaveCount(1);
  }
}

module.exports = { NoteActor };
