/* Notes migration/load helpers extracted from app.js (no behavior change). */
(function () {
  'use strict';

  function markExistingMigratedNotes(options = {}) {
    const storageKey = options.storageKey || 'customerNotes';
    try {
      const existingNotes = JSON.parse(localStorage.getItem(storageKey) || '{}');
      let updatedCount = 0;

      Object.keys(existingNotes).forEach(customerId => {
        const customerNotes = existingNotes[customerId];
        customerNotes.forEach(note => {
          if (note.svg && typeof note.svg === 'string' && note.isMigrated !== true) {
            if (note.svg.includes('<svg') && note.svg.includes('<text')) {
              note.isMigrated = true;
              updatedCount++;
            }
          }
        });
      });

      if (updatedCount > 0) {
        localStorage.setItem(storageKey, JSON.stringify(existingNotes));
      }
    } catch (error) {
      // Intentionally non-fatal to preserve legacy behavior.
    }
  }

  function convertHtmlNotesToSVG(htmlContent) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    if (!textContent.trim()) {
      return '';
    }

    const lines = textContent.split('\n').filter(line => line.trim());
    const lineHeight = 20;
    const padding = 20;
    const minHeight = 60;
    const calculatedHeight = Math.max(minHeight, (lines.length * lineHeight) + padding);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', calculatedHeight);
    svg.setAttribute('viewBox', `0 0 400 ${calculatedHeight}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '10');
    text.setAttribute('y', '30');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '16');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('white-space', 'pre-wrap');

    const allLines = textContent.split('\n');
    const maxCharsPerLine = 50;
    let processedLines = [];

    allLines.forEach(line => {
      if (line.trim()) {
        if (line.length > maxCharsPerLine) {
          const words = line.split(' ');
          let currentLine = '';
          words.forEach(word => {
            if ((currentLine + ' ' + word).length > maxCharsPerLine && currentLine.length > 0) {
              processedLines.push(currentLine.trim());
              currentLine = word;
            } else {
              currentLine += (currentLine.length > 0 ? ' ' : '') + word;
            }
          });
          if (currentLine.trim()) {
            processedLines.push(currentLine.trim());
          }
        } else {
          processedLines.push(line.trim());
        }
      }
    });

    processedLines.forEach((line, index) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', '10');
      tspan.setAttribute('dy', index === 0 ? '0' : '20');
      tspan.textContent = line;
      text.appendChild(tspan);
    });

    svg.appendChild(text);
    return new XMLSerializer().serializeToString(svg);
  }

  async function migrateOldNotes(options = {}) {
    const CrmDB = options.CrmDB;
    const formatDateYYYYMMDD = options.formatDateYYYYMMDD;
    const storageKey = options.storageKey || 'customerNotes';

    if (!CrmDB || typeof CrmDB.getAllCustomers !== 'function' || typeof CrmDB.updateCustomer !== 'function' || typeof formatDateYYYYMMDD !== 'function') {
      return;
    }

    try {
      const customers = await CrmDB.getAllCustomers();
      let migratedCount = 0;

      for (const customer of customers) {
        if (customer.notesHtml && customer.notesHtml.trim() !== '' && customer.notesHtml !== '<p><br></p>') {
          const svgContent = convertHtmlNotesToSVG(customer.notesHtml);
          const noteData = {
            id: Date.now() + Math.random(),
            svg: svgContent,
            date: customer.createdAt ? formatDateYYYYMMDD(new Date(customer.createdAt)) : formatDateYYYYMMDD(new Date()),
            noteNumber: 1,
            isMigrated: true
          };

          const existingNotes = JSON.parse(localStorage.getItem(storageKey) || '{}');
          if (!existingNotes[customer.id]) {
            existingNotes[customer.id] = [];
          }
          existingNotes[customer.id].push(noteData);
          localStorage.setItem(storageKey, JSON.stringify(existingNotes));

          const updatedCustomer = { ...customer };
          delete updatedCustomer.notesHtml;
          await CrmDB.updateCustomer(updatedCustomer);
          migratedCount++;
        }
      }

      if (migratedCount > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--brand);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `Migrated ${migratedCount} customers' notes to new system`;
        document.body.appendChild(notification);
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      }
    } catch (error) {
      // Intentionally non-fatal to preserve legacy behavior.
    }
  }

  async function loadExistingNotes(customerId, options = {}) {
    const fullscreenNotesCanvas = options.fullscreenNotesCanvas;
    const storageKey = options.storageKey || 'customerNotes';
    if (!fullscreenNotesCanvas || typeof fullscreenNotesCanvas.loadNotesHybrid !== 'function' || typeof fullscreenNotesCanvas.addNoteToUI !== 'function') {
      return;
    }

    try {
      const allNotes = await fullscreenNotesCanvas.loadNotesHybrid(customerId);
      const notesList = document.querySelector('.notes-list');
      if (!notesList) return;
      const pinnedList = document.querySelector('.pinned-notes-list');
      const pinnedView = document.querySelector('.pinned-notes-view');

      notesList.innerHTML = '';
      if (pinnedList) pinnedList.innerHTML = '';
      if (pinnedView) pinnedView.style.display = 'none';
      allNotes.forEach((noteData) => {
        fullscreenNotesCanvas.addNoteToUI(noteData);
      });

      console.log(`Loaded ${allNotes.length} notes using hybrid storage`);
    } catch (error) {
      console.error('Error loading notes with hybrid storage:', error);
      console.log('Falling back to localStorage-only loading...');
      const existingNotes = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const customerNotes = existingNotes[customerId] || [];
      const notesList = document.querySelector('.notes-list');
      if (!notesList) return;
      const pinnedList = document.querySelector('.pinned-notes-list');
      const pinnedView = document.querySelector('.pinned-notes-view');

      notesList.innerHTML = '';
      if (pinnedList) pinnedList.innerHTML = '';
      if (pinnedView) pinnedView.style.display = 'none';
      customerNotes.forEach((noteData, index) => {
        noteData.noteNumber = index + 1;
        fullscreenNotesCanvas.addNoteToUI(noteData);
      });
    }
  }

  window.NoteMigrationRuntime = Object.assign({}, window.NoteMigrationRuntime || {}, {
    markExistingMigratedNotes,
    convertHtmlNotesToSVG,
    migrateOldNotes,
    loadExistingNotes
  });
})();
