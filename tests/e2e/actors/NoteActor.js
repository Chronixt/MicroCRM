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

  async createTextNoteOnly(text) {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'text'));
    await this.page.getByTestId('add-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();
    await this.page.getByTestId('note-textarea').fill(text);
    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
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

  async createFormattedTextNote() {
    await this.page.evaluate(() => localStorage.setItem('noteInputMode', 'text'));
    await this.page.getByTestId('add-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeVisible();

    await this.page.getByTestId('note-textarea').fill('Important\nLine one\nLine two');
    await this.page.getByTestId('note-textarea').evaluate((el) => {
      const start = el.value.indexOf('Important');
      el.setSelectionRange(start, start + 'Important'.length);
    });
    await this.page.getByTestId('note-format-bold').click();
    await this.page.getByTestId('note-textarea').evaluate((el) => {
      const start = el.value.indexOf('Line one');
      el.setSelectionRange(start, el.value.length);
    });
    await this.page.getByTestId('note-format-bullet').click();

    const preview = this.page.getByTestId('note-format-preview');
    await expect(preview.locator('strong')).toHaveText('Important');
    await expect(preview.locator('ul li')).toHaveText(['Line one', 'Line two']);

    await this.page.getByTestId('save-note-button').click();
    await expect(this.page.getByTestId('note-textarea')).toBeHidden();
  }

  async expectFormattedTextNote() {
    await expect(this.page.getByTestId('note-entry')).toHaveCount(1);
    const note = this.page.getByTestId('note-entry').first();
    await note.locator('.note-header').click();
    const content = note.getByTestId('text-note-content');
    await expect(content.locator('strong')).toHaveText('Important');
    await expect(content.locator('ul li')).toHaveText(['Line one', 'Line two']);
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

  async pinRegularNoteByNumber(noteNumber) {
    const note = this.page.getByTestId('note-entry').filter({ hasText: `Note ${noteNumber} -` });
    await expect(note).toHaveCount(1);
    await note.getByTestId('pin-note-button').click();
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

  async expectRegularNoteHeaders(noteNumbers) {
    await expect(this.page.getByTestId('note-entry')).toHaveCount(noteNumbers.length);
    const headers = await this.page.getByTestId('note-entry').locator('.note-header').allTextContents();
    for (const noteNumber of noteNumbers) {
      expect(headers.some((text) => text.includes(`Note ${noteNumber} -`))).toBe(true);
    }
  }

  async expectPinnedEditHeader(noteNumber) {
    const pinned = this.page.getByTestId('pinned-note-entry').filter({ hasText: `Note ${noteNumber} -` });
    await expect(pinned).toHaveCount(1);
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
