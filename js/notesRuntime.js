/* Note runtime helpers extracted from app.js for seam-first modularization. */
(function () {
  'use strict';

  function escapeXmlText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isSerializedTextNoteSvg(svgValue) {
    return typeof svgValue === 'string' && svgValue.indexOf('data-note-type="text"') !== -1;
  }

  function extractTextFromSerializedTextNoteSvg(svgValue) {
    if (!isSerializedTextNoteSvg(svgValue)) return '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgValue, 'image/svg+xml');
      const tspans = doc.querySelectorAll('text tspan');
      if (tspans.length > 0) {
        return Array.from(tspans).map((el) => el.textContent || '').join('\n').trim();
      }
      const textEl = doc.querySelector('text');
      return textEl ? String(textEl.textContent || '').trim() : '';
    } catch (error) {
      return '';
    }
  }

  function getNoteTextValue(note) {
    if (!note) return '';
    const directText = note.text ?? note.textValue ?? note.content ?? '';
    if (typeof directText === 'string' && directText.trim().length > 0) return directText;
    return extractTextFromSerializedTextNoteSvg(note.svg);
  }

  function getNoteTypeValue(note) {
    if (!note) return 'svg';
    const noteType = String(note.noteType || note.type || '').toLowerCase();
    if (noteType === 'text' || noteType === 'svg') return noteType;
    const textValue = getNoteTextValue(note);
    if (textValue && textValue.trim().length > 0) return 'text';
    if (isSerializedTextNoteSvg(note.svg)) return 'text';
    return 'svg';
  }

  function isNoteQueuedForSync(note) {
    return !!(note && note.queuedSync === true);
  }

  function serializeTextNoteToSvg(textValue) {
    const text = String(textValue || '').replace(/\r\n/g, '\n');
    const lines = text.split('\n');
    const lineHeight = 24;
    const topPadding = 28;
    const bottomPadding = 20;
    const maxChars = Math.max(1, ...lines.map((l) => l.length));
    const width = Math.max(420, Math.min(2200, 40 + maxChars * 9));
    const height = Math.max(80, topPadding + lines.length * lineHeight + bottomPadding);
    const escapedLines = lines.map((line) => escapeXmlText(line));
    const tspans = escapedLines.map((line, idx) => (
      `<tspan x="16" dy="${idx === 0 ? 0 : lineHeight}">${line || '&#160;'}</tspan>`
    )).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" data-note-type="text"><rect width="100%" height="100%" fill="transparent"></rect><text x="16" y="${topPadding}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="16" fill="#f8fafc">${tspans}</text></svg>`;
  }

  window.NoteRuntime = Object.assign({}, window.NoteRuntime || {}, {
    escapeXmlText,
    isSerializedTextNoteSvg,
    extractTextFromSerializedTextNoteSvg,
    getNoteTextValue,
    getNoteTypeValue,
    isNoteQueuedForSync,
    serializeTextNoteToSvg
  });
})();
