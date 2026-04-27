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

  function parseNoteDateValue(raw) {
    if (!raw) return Number.NaN;
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T12:00:00.000Z`).getTime();
    }
    return new Date(raw).getTime();
  }

  function noteSortTimestamp(note) {
    const primary = parseNoteDateValue(note?.date);
    if (Number.isFinite(primary)) return primary;
    const fallback = parseNoteDateValue(note?.createdAt ?? note?.created_at);
    if (Number.isFinite(fallback)) return fallback;
    return Number.NEGATIVE_INFINITY;
  }

  function noteSortId(note) {
    const idNum = Number(note?.id);
    return Number.isFinite(idNum) ? idNum : Number.NEGATIVE_INFINITY;
  }

  function compareNotesByCreatedDesc(a, b) {
    const aTime = noteSortTimestamp(a);
    const bTime = noteSortTimestamp(b);
    if (aTime !== bTime) return bTime - aTime;
    return noteSortId(b) - noteSortId(a);
  }

  function formatDateYYYYMMDDFallback(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeDateTimeToISOFallback(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
      return null;
    }
    const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function getNotePayloadForSync(note, options = {}) {
    const formatDateYYYYMMDD = typeof options.formatDateYYYYMMDD === 'function'
      ? options.formatDateYYYYMMDD
      : formatDateYYYYMMDDFallback;
    const normalizeDateTimeToISO = typeof options.normalizeDateTimeToISO === 'function'
      ? options.normalizeDateTimeToISO
      : normalizeDateTimeToISOFallback;

    const noteType = getNoteTypeValue(note);
    const date = formatDateYYYYMMDD(note?.date || new Date());
    const noteNumber = note?.noteNumber != null ? note.noteNumber : null;
    const createdAt = note?.createdAt ? (normalizeDateTimeToISO(note.createdAt) || note.createdAt) : null;
    const editedDate = note?.editedDate ? (normalizeDateTimeToISO(note.editedDate) || note.editedDate) : null;
    const textValue = getNoteTextValue(note);
    const svgValue = typeof note?.svg === 'string' ? note.svg : '';

    if (noteType === 'text') {
      const text = (textValue || '').trim();
      if (!text) return null;
      return { noteType: 'text', text, date, noteNumber, createdAt, editedDate, svg: null };
    }

    const svg = (svgValue || '').trim();
    if (!svg) return null;
    return { noteType: 'svg', svg, date, noteNumber, createdAt, editedDate, text: '' };
  }

  function buildNoteSyncSignature(note, options = {}) {
    const payload = getNotePayloadForSync(note, options);
    if (!payload) return null;
    const base = `${payload.noteType}|${payload.date}|${payload.noteNumber ?? ''}`;
    if (payload.noteType === 'text') return `${base}|text:${payload.text}`;
    return `${base}|svg:${payload.svg}`;
  }

  function buildDbNoteInputFromAnyNote(note, customerId, options = {}) {
    const payload = getNotePayloadForSync(note, options);
    if (!payload) return null;
    const numericCustomerId = parseInt(customerId, 10);
    if (Number.isNaN(numericCustomerId)) return null;
    const input = {
      customerId: numericCustomerId,
      date: payload.date,
      noteNumber: payload.noteNumber,
      createdAt: payload.createdAt || new Date().toISOString(),
      editedDate: payload.editedDate || null,
      noteType: payload.noteType
    };
    if (payload.noteType === 'text') {
      input.text = payload.text;
      input.textValue = payload.text;
      input.svg = null;
    } else {
      input.svg = payload.svg;
    }
    return input;
  }

  function isDbBackedNoteSource(source) {
    const normalized = String(source || '').toLowerCase();
    return normalized === 'indexeddb' ||
      normalized === 'indexeddb-fallback' ||
      normalized === 'supabase' ||
      normalized === 'supabase-native';
  }

  window.NoteRuntime = Object.assign({}, window.NoteRuntime || {}, {
    escapeXmlText,
    isSerializedTextNoteSvg,
    extractTextFromSerializedTextNoteSvg,
    getNoteTextValue,
    getNoteTypeValue,
    isNoteQueuedForSync,
    serializeTextNoteToSvg,
    parseNoteDateValue,
    noteSortTimestamp,
    noteSortId,
    compareNotesByCreatedDesc,
    getNotePayloadForSync,
    buildNoteSyncSignature,
    buildDbNoteInputFromAnyNote,
    isDbBackedNoteSource
  });
})();
