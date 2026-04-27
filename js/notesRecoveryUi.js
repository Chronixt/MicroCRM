/* Note recovery/debug UI handlers extracted from app.js (no behavior change). */
(function () {
  'use strict';
  function bindHandlers(options = {}) {
    const escapeHtml = typeof options.escapeHtml === 'function'
      ? options.escapeHtml
      : function (value) { return String(value || ''); };
    // Note Recovery handlers
    const scanNotesBtn = document.getElementById('scan-notes-btn');
    const recoverNotesBtn = document.getElementById('recover-notes-btn');
    const scanResults = document.getElementById('scan-results');
    const scanSummary = document.getElementById('scan-summary');
    const recoveryActions = document.getElementById('recovery-actions');
    const recoveryStatus = document.getElementById('recovery-status');
    const restoreNotesFile = document.getElementById('restore-notes-file');
    const restoreNotesBtn = document.getElementById('restore-notes-btn');
    const restoreNotesStatus = document.getElementById('restore-notes-status');
    if (!scanNotesBtn || !recoverNotesBtn || !scanResults || !scanSummary || !recoveryActions || !recoveryStatus || !restoreNotesFile || !restoreNotesBtn || !restoreNotesStatus) {
      return;
    }
    if (!window.CrmDB) {
      console.warn('[notesRecoveryUi] CrmDB unavailable; skipping recovery UI bindings.');
      return;
    }

    let scanResultData = null;

    // Scan for corrupted notes
    scanNotesBtn.addEventListener('click', async () => {
      try {
        scanNotesBtn.disabled = true;
        scanNotesBtn.textContent = 'Scanning...';
        recoveryStatus.textContent = '🔍 Scanning notes... This may take a moment.';
        recoveryStatus.style.color = '';

        const results = await window.CrmDB.scanForCorruptedNotes();
        scanResultData = results;

        // Get customer names for display
        const allCustomers = await window.CrmDB.getAllCustomers();
        const customerMap = new Map();
        allCustomers.forEach(customer => {
          customerMap.set(customer.id, customer);
        });

        // Helper to get customer name
        const getCustomerName = (customerId) => {
          const customer = customerMap.get(customerId);
          if (!customer) return `Customer ID: ${customerId}`;
          const firstName = customer.firstName || '';
          const lastName = customer.lastName || '';
          return `${firstName} ${lastName}`.trim() || `Customer ID: ${customerId}`;
        };

        // Helper to format date
        const formatDate = (dateStr) => {
          if (!dateStr) return 'Unknown date';
          try {
            // Handle various date formats
            let date;
            if (typeof dateStr === 'string') {
              // First priority: try yyyy-mm-dd format (our standard format)
              const yyyymmddMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
              if (yyyymmddMatch) {
                const [, year, month, day] = yyyymmddMatch;
                const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                if (!isNaN(testDate.getTime())) {
                  const now = new Date();
                  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                  if (testDate <= oneYearFromNow && testDate >= new Date(2020, 0, 1)) {
                    date = testDate;
                  }
                }
              }
              
              // Second priority: try ISO date string (includes time)
              if (!date || isNaN(date.getTime())) {
                const isoDate = new Date(dateStr);
                if (!isNaN(isoDate.getTime())) {
                  // Check if it's a reasonable date (not too far in future)
                  const now = new Date();
                  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                  if (isoDate <= oneYearFromNow && isoDate >= new Date(2020, 0, 1)) {
                    date = isoDate;
                  }
                }
              }
              
              // If ISO parsing failed or date seems invalid, try manual parsing
              // For ambiguous dates, prioritize DD/MM/YYYY format
              if (!date || isNaN(date.getTime())) {
                // Try DD/MM/YYYY format first (prioritize European format)
                const dmyMatch = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
                if (dmyMatch) {
                  const [, first, second, year] = dmyMatch;
                  const firstNum = parseInt(first);
                  const secondNum = parseInt(second);
                  const yearNum = parseInt(year);
                  
                  // Determine which is day and which is month
                  let day, month;
                  
                  if (firstNum > 12) {
                    // First part is definitely day (DD/MM/YYYY)
                    day = firstNum;
                    month = secondNum;
                  } else if (secondNum > 12) {
                    // Second part is definitely day (MM/DD/YYYY)
                    month = firstNum;
                    day = secondNum;
                  } else {
                    // Ambiguous: both could be month or day
                    // Prioritize DD/MM/YYYY interpretation
                    const now = new Date();
                    const ddmmDate = new Date(yearNum, secondNum - 1, firstNum); // DD/MM
                    const mmddDate = new Date(yearNum, firstNum - 1, secondNum); // MM/DD
                    
                    // Prefer DD/MM if MM/DD would be in the future
                    if (mmddDate > now && ddmmDate <= now) {
                      day = firstNum;
                      month = secondNum;
                    } else if (ddmmDate > now && mmddDate <= now) {
                      month = firstNum;
                      day = secondNum;
                    } else {
                      // Both are valid, prefer DD/MM/YYYY
                      day = firstNum;
                      month = secondNum;
                    }
                  }
                  
                  // Validate and use the date
                  if (month >= 1 && month <= 12 && day >= 1 && day <= 31 &&
                      yearNum >= 2020 && yearNum <= new Date().getFullYear() + 1) {
                    const testDate = new Date(yearNum, month - 1, day);
                    const now = new Date();
                    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                    if (!isNaN(testDate.getTime()) && testDate <= oneYearFromNow) {
                      date = testDate;
                    }
                  }
                }
              }
              
              // Last resort: try standard Date parsing
              if (!date || isNaN(date.getTime())) {
                date = new Date(dateStr);
              }
            } else {
              date = new Date(dateStr);
            }
            
            if (isNaN(date.getTime())) {
              return `${String(dateStr).substring(0, 30)} (invalid date)`;
            }
            
            // Final validation: date should be reasonable
            const now = new Date();
            const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
            const minDate = new Date(2020, 0, 1);
            
            if (date > oneYearFromNow) {
              return `${dateStr} (future date?)`;
            }
            
            if (date < minDate) {
              return `${dateStr} (old date?)`;
            }
            
            return date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch (e) {
            return `${String(dateStr).substring(0, 30)} (parse error)`;
          }
        };

        // Helper to process notes and get last 10
        const getLast10Notes = (notes, getNoteFn) => {
          return notes
            .map(item => {
              const note = getNoteFn(item);
              const editedDate = note?.editedDate || note?.date || note?.createdAt || '';
              
              // Extract customerId from multiple possible locations
              let customerId = item.customerId;
              if (customerId === undefined && note) {
                customerId = note.customerId;
              }
              // Ensure it's a number if it exists
              if (customerId !== undefined && customerId !== null) {
                customerId = parseInt(customerId);
                if (isNaN(customerId)) {
                  customerId = undefined;
                }
              }
              
              // If customerId is still undefined, log for debugging but continue
              if (customerId === undefined || customerId === null) {
                console.warn('Note with undefined customerId:', { 
                  item, 
                  note, 
                  noteId: note?.id,
                  itemCustomerId: item.customerId,
                  noteCustomerId: note?.customerId
                });
              }
              
              // Try one more time to get customerId from the note structure itself
              if (customerId === undefined && note) {
                // Some notes might have customerId nested differently
                customerId = note.customerId;
                if (customerId !== undefined && customerId !== null) {
                  customerId = parseInt(customerId);
                  if (isNaN(customerId)) customerId = undefined;
                }
              }
              
              // Normalize date to yyyy-mm-dd format for display
              let normalizedDate = editedDate;
              if (editedDate && typeof editedDate === 'string') {
                // Try to normalize using the helper (it's in db.js, so we'll use a simple check)
                if (/^\d{4}-\d{2}-\d{2}$/.test(editedDate)) {
                  normalizedDate = editedDate; // Already in correct format
                } else {
                  // Try to parse and normalize
                  try {
                    // Use the same logic as normalizeDateToYYYYMMDD
                    const dmyMatch = editedDate.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
                    if (dmyMatch) {
                      const [, first, second, year] = dmyMatch;
                      const firstNum = parseInt(first);
                      const secondNum = parseInt(second);
                      
                      // Prioritize DD/MM/YYYY
                      let day, month;
                      if (firstNum > 12) {
                        day = firstNum;
                        month = secondNum;
                      } else if (secondNum > 12) {
                        month = firstNum;
                        day = secondNum;
                      } else {
                        // Ambiguous - prefer DD/MM
                        const now = new Date();
                        const ddmmDate = new Date(parseInt(year), secondNum - 1, firstNum);
                        const mmddDate = new Date(parseInt(year), firstNum - 1, secondNum);
                        if (mmddDate > now && ddmmDate <= now) {
                          day = firstNum;
                          month = secondNum;
                        } else {
                          day = firstNum;
                          month = secondNum; // Default to DD/MM
                        }
                      }
                      
                      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        normalizedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      }
                    } else {
                      // Try ISO or standard date parsing
                      const date = new Date(editedDate);
                      if (!isNaN(date.getTime())) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        normalizedDate = `${year}-${month}-${day}`;
                      }
                    }
                  } catch (e) {
                    // Keep original if normalization fails
                  }
                }
              }
              
              return {
                noteId: note?.id || item.noteId,
                customerId: customerId,
                customerName: customerId !== undefined && customerId !== null ? getCustomerName(customerId) : 'Unknown Customer (Missing Customer ID)',
                editedDate: normalizedDate,
                note: note
              };
            })
            .filter(item => item.noteId !== undefined) // Filter out items without noteId
            .sort((a, b) => {
              // Handle date comparison more carefully
              let dateA = 0;
              let dateB = 0;
              
              if (a.editedDate) {
                try {
                  const d = new Date(a.editedDate);
                  if (!isNaN(d.getTime())) {
                    // Check if date seems reasonable (not too far in future)
                    const now = new Date();
                    const maxFutureDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                    if (d <= maxFutureDate) {
                      dateA = d.getTime();
                    }
                  }
                } catch (e) {
                  // Invalid date, use 0
                }
              }
              
              if (b.editedDate) {
                try {
                  const d = new Date(b.editedDate);
                  if (!isNaN(d.getTime())) {
                    const now = new Date();
                    const maxFutureDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
                    if (d <= maxFutureDate) {
                      dateB = d.getTime();
                    }
                  }
                } catch (e) {
                  // Invalid date, use 0
                }
              }
              
              return dateB - dateA; // Most recent first
            })
            .slice(0, 10);
        };

        // Helper to normalize date string to yyyy-mm-dd (for display consistency)
        const normalizeDateForDisplay = (dateStr) => {
          if (!dateStr) return '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr; // Already normalized
          
          // Use same logic as normalizeDateToYYYYMMDD
          const dmyMatch = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
          if (dmyMatch) {
            const [, first, second, year] = dmyMatch;
            const firstNum = parseInt(first);
            const secondNum = parseInt(second);
            
            let day, month;
            if (firstNum > 12) {
              day = firstNum;
              month = secondNum;
            } else if (secondNum > 12) {
              month = firstNum;
              day = secondNum;
            } else {
              // Ambiguous - prefer DD/MM
              const now = new Date();
              const ddmmDate = new Date(parseInt(year), secondNum - 1, firstNum);
              const mmddDate = new Date(parseInt(year), firstNum - 1, secondNum);
              if (mmddDate > now && ddmmDate <= now) {
                day = firstNum;
                month = secondNum;
              } else {
                day = firstNum;
                month = secondNum; // Default to DD/MM
              }
            }
            
            if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            }
          }
          
          // Try standard parsing
          try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
          } catch (e) {
            // Ignore
          }
          
          return dateStr; // Return original if can't normalize
        };
        
        // Process each category
        const healthyNotes = getLast10Notes(results.healthy, (item) => item.note);
        const corruptedNotes = results.corrupted
          .map(item => {
            const note = item.healthyVersion || item.corruptedVersion || {};
            const editedDateRaw = note?.editedDate || note?.date || note?.createdAt || '';
            const editedDate = normalizeDateForDisplay(editedDateRaw);
            return {
              noteId: note?.id || item.noteId,
              customerId: item.customerId || note?.customerId,
              customerName: getCustomerName(item.customerId || note?.customerId),
              editedDate: editedDate,
              note: note,
              canRecover: !!item.healthyVersion,
              source: item.source
            };
          })
          .sort((a, b) => {
            // Use normalized dates for comparison
            const dateA = a.editedDate && /^\d{4}-\d{2}-\d{2}$/.test(a.editedDate) ? new Date(a.editedDate + 'T00:00:00').getTime() : 0;
            const dateB = b.editedDate && /^\d{4}-\d{2}-\d{2}$/.test(b.editedDate) ? new Date(b.editedDate + 'T00:00:00').getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10);
        const localStorageNotes = getLast10Notes(results.localStorageOnly, (item) => item.note);
        const indexedDBNotes = getLast10Notes(results.indexeddbOnly, (item) => item.note);

        // Process conflicting notes
        const conflictingNotes = results.conflicts
          .map(item => {
            const indexedDBDateRaw = item.indexedDBVersion?.editedDate || item.indexedDBVersion?.date || item.indexedDBVersion?.createdAt || '';
            const localStorageDateRaw = item.localStorageVersion?.editedDate || item.localStorageVersion?.date || item.localStorageVersion?.createdAt || '';
            
            // Normalize dates to yyyy-mm-dd
            const indexedDBDate = normalizeDateForDisplay(indexedDBDateRaw);
            const localStorageDate = normalizeDateForDisplay(localStorageDateRaw);
            
            // Use the more recent date as the "last edited" date (compare normalized dates)
            const indexedDBTime = indexedDBDate && /^\d{4}-\d{2}-\d{2}$/.test(indexedDBDate) ? new Date(indexedDBDate + 'T00:00:00').getTime() : 0;
            const localStorageTime = localStorageDate && /^\d{4}-\d{2}-\d{2}$/.test(localStorageDate) ? new Date(localStorageDate + 'T00:00:00').getTime() : 0;
            const mostRecentDate = indexedDBTime > localStorageTime ? indexedDBDate : localStorageDate;
            
            return {
              noteId: item.noteId,
              customerId: item.customerId,
              customerName: getCustomerName(item.customerId),
              indexedDBVersion: item.indexedDBVersion,
              localStorageVersion: item.localStorageVersion,
              indexedDBDate: indexedDBDate,
              localStorageDate: localStorageDate,
              editedDate: mostRecentDate,
              indexedDBSvgSize: (item.indexedDBVersion?.svg || '').length,
              localStorageSvgSize: (item.localStorageVersion?.svg || '').length
            };
          })
          .sort((a, b) => {
            // Use normalized dates for comparison
            const dateA = a.editedDate && /^\d{4}-\d{2}-\d{2}$/.test(a.editedDate) ? new Date(a.editedDate + 'T00:00:00').getTime() : 0;
            const dateB = b.editedDate && /^\d{4}-\d{2}-\d{2}$/.test(b.editedDate) ? new Date(b.editedDate + 'T00:00:00').getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, 10);

        // Helper to render notes list
        const renderNotesList = (notes, title, color, icon = '', showRecoverable = false) => {
          if (notes.length === 0) return '';
          return `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
              <strong style="font-size: 13px; color: ${color};">${icon} ${title}:</strong>
              <div style="margin-top: 8px; max-height: 300px; overflow-y: auto; font-size: 12px;">
                ${notes.map((note, index) => `
                  <div style="padding: 8px; margin-bottom: 6px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid ${color};">
                    <div style="font-weight: 600; color: ${color};">
                      ${index + 1}. ${escapeHtml(note.customerName)}
                      ${showRecoverable && note.canRecover ? '<span style="color: #10b981; font-size: 11px; margin-left: 6px;">✓ Recoverable</span>' : ''}
                      ${showRecoverable && !note.canRecover ? '<span style="color: #ef4444; font-size: 11px; margin-left: 6px;">⚠ No backup</span>' : ''}
                    </div>
                    <div style="color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 4px;">
                      Last edited: ${note.editedDate && /^\d{4}-\d{2}-\d{2}$/.test(note.editedDate) ? note.editedDate : (note.editedDate ? formatDate(note.editedDate) : 'Unknown')}
                    </div>
                    <div style="color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 2px;">
                      Note ID: ${note.noteId}
                      ${note.source ? ` | Source: ${note.source}` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        };

        // Helper to render conflicting notes with both versions
        const renderConflictingNotes = (notes, title, color, icon = '') => {
          if (notes.length === 0) return '';
          return `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
              <strong style="font-size: 13px; color: ${color};">${icon} ${title}:</strong>
              <div style="margin-top: 8px; max-height: 400px; overflow-y: auto; font-size: 12px;">
                ${notes.map((note, index) => {
                  // Compare normalized dates properly
                  const indexedDBTime = note.indexedDBDate && /^\d{4}-\d{2}-\d{2}$/.test(note.indexedDBDate) ? new Date(note.indexedDBDate + 'T00:00:00').getTime() : 0;
                  const localStorageTime = note.localStorageDate && /^\d{4}-\d{2}-\d{2}$/.test(note.localStorageDate) ? new Date(note.localStorageDate + 'T00:00:00').getTime() : 0;
                  const indexedDBNewer = indexedDBTime > localStorageTime;
                  
                  // Format dates for display (show yyyy-mm-dd if normalized, otherwise format)
                  const indexedDBDateDisplay = note.indexedDBDate && /^\d{4}-\d{2}-\d{2}$/.test(note.indexedDBDate) ? note.indexedDBDate : (note.indexedDBDate ? formatDate(note.indexedDBDate) : 'Unknown');
                  const localStorageDateDisplay = note.localStorageDate && /^\d{4}-\d{2}-\d{2}$/.test(note.localStorageDate) ? note.localStorageDate : (note.localStorageDate ? formatDate(note.localStorageDate) : 'Unknown');
                  
                  return `
                    <div style="padding: 8px; margin-bottom: 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border-left: 3px solid ${color};">
                      <div style="font-weight: 600; color: ${color}; margin-bottom: 8px;">
                        ${index + 1}. ${escapeHtml(note.customerName)}
                      </div>
                      
                      <div style="margin-bottom: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; border-left: 3px solid #3b82f6;">
                        <div style="font-weight: 600; color: #3b82f6; font-size: 11px; margin-bottom: 4px;">
                          💾 IndexedDB Version ${indexedDBNewer ? '<span style="color: #10b981; font-size: 10px;">(Newer)</span>' : ''}
                        </div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 10px;">
                          Last edited: ${indexedDBDateDisplay}
                        </div>
                        <div style="color: rgba(255,255,255,0.6); font-size: 10px; margin-top: 2px;">
                          SVG size: ${note.indexedDBSvgSize.toLocaleString()} characters
                        </div>
                      </div>
                      
                      <div style="padding: 8px; background: rgba(139, 92, 246, 0.1); border-radius: 4px; border-left: 3px solid #8b5cf6;">
                        <div style="font-weight: 600; color: #8b5cf6; font-size: 11px; margin-bottom: 4px;">
                          📱 localStorage Version ${!indexedDBNewer ? '<span style="color: #10b981; font-size: 10px;">(Newer)</span>' : ''}
                        </div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 10px;">
                          Last edited: ${localStorageDateDisplay}
                        </div>
                        <div style="color: rgba(255,255,255,0.6); font-size: 10px; margin-top: 2px;">
                          SVG size: ${note.localStorageSvgSize.toLocaleString()} characters
                        </div>
                      </div>
                      
                      <div style="color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 6px;">
                        Note ID: ${note.noteId} | Customer ID: ${note.customerId}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        };

        // Build summary HTML
        const summaryHTML = `
          <div style="margin-bottom: 8px;">
            <strong>Scan Results:</strong>
          </div>
          <div style="font-size: 13px; line-height: 1.6;">
            <div style="color: #10b981;">✓ Healthy notes: ${results.healthy.length}</div>
            <div style="color: ${results.corrupted.length > 0 ? '#ef4444' : '#10b981'};">${results.corrupted.length > 0 ? '⚠' : '✓'} Corrupted notes: ${results.corrupted.length}</div>
            <div style="color: #6366f1;">📱 Only in localStorage: ${results.localStorageOnly.length}</div>
            <div style="color: #6366f1;">💾 Only in IndexedDB: ${results.indexeddbOnly.length}</div>
            ${results.conflicts.length > 0 ? `<div style="color: #f59e0b;">⚠ Conflicting versions: ${results.conflicts.length}</div>` : ''}
          </div>
          ${renderNotesList(healthyNotes, 'Last 10 Healthy Notes', '#10b981', '✓')}
          ${renderNotesList(corruptedNotes, 'Last 10 Corrupted Notes', '#ef4444', '⚠', true)}
          ${renderConflictingNotes(conflictingNotes, 'Last 10 Conflicting Notes (Different SVG in IndexedDB vs localStorage)', '#f59e0b', '⚠')}
          ${renderNotesList(localStorageNotes, 'Last 10 localStorage-Only Notes', '#6366f1', '📱')}
          ${renderNotesList(indexedDBNotes, 'Last 10 IndexedDB-Only Notes', '#6366f1', '💾')}
        `;
        scanSummary.innerHTML = summaryHTML;

        // Show recovery button if there are corrupted notes that can be recovered
        const canRecover = results.corrupted.some(c => c.healthyVersion);
        if (canRecover) {
          const recoverableCount = results.corrupted.filter(c => c.healthyVersion).length;
          recoveryActions.classList.remove('hidden');
          recoveryStatus.innerHTML = `<span style="color: #10b981;">✅ Found ${recoverableCount} note(s) that can be recovered!</span>`;
        } else if (results.corrupted.length > 0) {
          recoveryActions.classList.add('hidden');
          recoveryStatus.innerHTML = `<span style="color: #ef4444;">⚠ Found ${results.corrupted.length} corrupted note(s), but no healthy version found to recover from.</span><br><span style="font-size: 11px;">Try restoring from a backup file.</span>`;
        } else {
          recoveryActions.classList.add('hidden');
          recoveryStatus.innerHTML = `<span style="color: #10b981;">✅ All notes appear healthy!</span>`;
        }

        scanResults.classList.remove('hidden');
        scanNotesBtn.disabled = false;
        scanNotesBtn.textContent = '🔍 Scan for Corrupted Notes';
      } catch (error) {
        console.error('Scan error:', error);
        recoveryStatus.textContent = `❌ Scan failed: ${error.message}`;
        recoveryStatus.style.color = '#ef4444';
        scanNotesBtn.disabled = false;
        scanNotesBtn.textContent = '🔍 Scan for Corrupted Notes';
      }
    });

    // Recover corrupted notes
    recoverNotesBtn.addEventListener('click', async () => {
      if (!scanResultData) {
        recoveryStatus.textContent = 'Please scan for corrupted notes first.';
        recoveryStatus.style.color = '#ef4444';
        return;
      }

      const recoverable = scanResultData.corrupted.filter(c => c.healthyVersion);
      if (recoverable.length === 0) {
        recoveryStatus.textContent = 'No recoverable notes found.';
        recoveryStatus.style.color = '#ef4444';
        return;
      }

      if (!confirm(`This will recover ${recoverable.length} corrupted note(s) from their healthy versions. Continue?`)) {
        return;
      }

      try {
        recoverNotesBtn.disabled = true;
        recoverNotesBtn.textContent = 'Recovering...';
        recoveryStatus.textContent = `🔄 Recovering ${recoverable.length} note(s)...`;
        recoveryStatus.style.color = '';

        const result = await window.CrmDB.recoverCorruptedNotes(false); // dryRun = false

        if (result.recovered > 0) {
          recoveryStatus.innerHTML = `
            <span style="color: #10b981;">✅ Successfully recovered ${result.recovered} note(s)!</span><br>
            ${result.failed > 0 ? `<span style="color: #ef4444;">⚠ ${result.failed} note(s) failed to recover.</span>` : ''}
            <br><span style="font-size: 11px;">Please refresh the customer page to see the recovered notes.</span>
          `;
          
          // Refresh scan results
          scanNotesBtn.click();
        } else {
          recoveryStatus.textContent = 'Recovery completed, but no notes were recovered.';
          recoveryStatus.style.color = '#f59e0b';
        }

        recoverNotesBtn.disabled = false;
        recoverNotesBtn.textContent = '✅ Recover Notes';
      } catch (error) {
        console.error('Recovery error:', error);
        recoveryStatus.textContent = `❌ Recovery failed: ${error.message}`;
        recoveryStatus.style.color = '#ef4444';
        recoverNotesBtn.disabled = false;
        recoverNotesBtn.textContent = '✅ Recover Notes';
      }
    });

    // Restore notes from backup file
    restoreNotesBtn.addEventListener('click', async () => {
      const file = restoreNotesFile.files && restoreNotesFile.files[0];
      if (!file) {
        restoreNotesStatus.textContent = 'Please select a backup file first.';
        restoreNotesStatus.style.color = '#ef4444';
        return;
      }

      try {
        restoreNotesBtn.disabled = true;
        restoreNotesBtn.textContent = 'Loading...';
        restoreNotesStatus.textContent = '📂 Loading backup file...';
        restoreNotesStatus.style.color = '';

        const text = await file.text();
        const backupData = JSON.parse(text);

        if (!backupData.customerNotes && (!backupData.notes || backupData.notes.length === 0)) {
          restoreNotesStatus.textContent = '⚠ Backup file does not contain any notes.';
          restoreNotesStatus.style.color = '#f59e0b';
          restoreNotesBtn.disabled = false;
          restoreNotesBtn.textContent = 'Load Backup';
          return;
        }

        restoreNotesStatus.textContent = '🔄 Restoring notes from backup...';
        
        const result = await window.CrmDB.restoreNotesFromBackup(backupData, {
          mode: 'merge' // Smart mode - only replaces corrupted notes
        });

        if (result.restored > 0) {
          restoreNotesStatus.innerHTML = `
            <span style="color: #10b981;">✅ Successfully restored ${result.restored} note(s) from backup!</span><br>
            ${result.skipped > 0 ? `<span style="color: #6366f1;">⏭️ Skipped ${result.skipped} note(s) (already healthy or no backup version).</span>` : ''}
            ${result.failed > 0 ? `<span style="color: #ef4444;">⚠ ${result.failed} note(s) failed to restore.</span>` : ''}
            <br><span style="font-size: 11px;">Please refresh the customer page to see the restored notes.</span>
          `;
        } else {
          restoreNotesStatus.innerHTML = `
            <span style="color: #6366f1;">ℹ️ No notes were restored. Current notes appear healthier than backup versions.</span><br>
            ${result.skipped > 0 ? `<span style="font-size: 11px;">Skipped ${result.skipped} note(s).</span>` : ''}
          `;
        }

        restoreNotesBtn.disabled = false;
        restoreNotesBtn.textContent = 'Load Backup';
      } catch (error) {
        console.error('Restore error:', error);
        restoreNotesStatus.textContent = `❌ Restore failed: ${error.message}`;
        restoreNotesStatus.style.color = '#ef4444';
        restoreNotesBtn.disabled = false;
        restoreNotesBtn.textContent = 'Load Backup';
      }
    });

  }
  window.NoteRecoveryUI = Object.assign({}, window.NoteRecoveryUI || {}, {
    bindHandlers
  });
})();

