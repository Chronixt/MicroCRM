/* IndexedDB wrapper for Chikas DB */
(function () {
  const DB_NAME = 'chikas-db';
  const DB_VERSION = 6; // Increment version to force noteVersions store creation

  /** @type {IDBDatabase | null} */
  let database = null;

  // Helper function to normalize date to yyyy-mm-dd format
  function normalizeDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    
    // If already in yyyy-mm-dd format, return as-is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Handle ambiguous date strings (DD/MM/YYYY vs MM/DD/YYYY)
    if (typeof dateValue === 'string') {
      // Try yyyy/mm/dd or yyyy-mm-dd format first (unambiguous)
      const ymdMatch = dateValue.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
      if (ymdMatch) {
        const [, year, month, day] = ymdMatch;
        const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(testDate.getTime())) {
          const yearStr = String(year);
          const monthStr = String(month).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          return `${yearStr}-${monthStr}-${dayStr}`;
        }
      }
      
      // For ambiguous d/m/yyyy or m/d/yyyy formats, prioritize DD/MM/YYYY
      // This is because dates like "1/11/2025" are more likely to be Nov 1st than Jan 11th
      const dmyMatch = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      if (dmyMatch) {
        const [, first, second, year] = dmyMatch;
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        const yearNum = parseInt(year);
        
        // Determine which is day and which is month
        // If first > 12, it must be day (DD/MM format)
        // If second > 12, it must be month first (MM/DD format)
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
          // Check which makes more sense (not too far in future)
          const now = new Date();
          const ddmmDate = new Date(yearNum, secondNum - 1, firstNum); // DD/MM
          const mmddDate = new Date(yearNum, firstNum - 1, secondNum); // MM/DD
          
          // Prefer DD/MM if MM/DD would be in the future or far future
          if (mmddDate > now && ddmmDate <= now) {
            day = firstNum;
            month = secondNum;
          } else if (ddmmDate > now && mmddDate <= now) {
            month = firstNum;
            day = secondNum;
          } else {
            // Both are valid, prefer DD/MM/YYYY (European format, more common)
            day = firstNum;
            month = secondNum;
          }
        }
        
        // Validate month and day
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const testDate = new Date(yearNum, month - 1, day);
          if (!isNaN(testDate.getTime())) {
            const yearStr = String(yearNum);
            const monthStr = String(month).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            return `${yearStr}-${monthStr}-${dayStr}`;
          }
        }
      }
    }
    
    // Try to parse the date normally (for ISO strings, Date objects, etc.)
    let date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    
    if (isNaN(date.getTime())) {
      return null; // Invalid date
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      // If database exists but might be old version, check if upgrade is needed
      if (database) {
        // Check if noteVersions store exists (indicator of version 5)
        if (!database.objectStoreNames.contains('noteVersions') && DB_VERSION >= 5) {
          // Database needs upgrade - close it and reopen
          console.log('Database needs upgrade, closing and reopening...');
          database.close();
          database = null;
        } else {
          return resolve(database);
        }
      }
      
      // Force open with new version to trigger upgrade
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = /** @type {IDBDatabase} */ (event.target.result);
        const oldVersion = event.oldVersion || 0;
        
        console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
        console.log('Current stores:', Array.from(db.objectStoreNames));
        
        // Handle upgrade from version 3 to 4 (add notes store)
        if (oldVersion < 4) {
          // For version 4, we need to add the notes store
          if (!db.objectStoreNames.contains('notes')) {
            console.log('Creating notes store...');
            const notesStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
            notesStore.createIndex('customerId', 'customerId', { unique: false });
            notesStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        }
        
        // Handle upgrade from version 4 to 5 or 5 to 6 (add noteVersions store for version history)
        if (oldVersion < 5 || (!db.objectStoreNames.contains('noteVersions') && oldVersion < 6)) {
          if (!db.objectStoreNames.contains('noteVersions')) {
            console.log('Creating noteVersions store...');
            try {
              const noteVersionsStore = db.createObjectStore('noteVersions', { keyPath: 'id', autoIncrement: true });
              noteVersionsStore.createIndex('noteId', 'noteId', { unique: false });
              noteVersionsStore.createIndex('savedAt', 'savedAt', { unique: false });
              console.log('noteVersions store created successfully');
            } catch (createError) {
              console.error('Failed to create noteVersions store:', createError);
            }
          }
        }
        
        // For version 3 and below, recreate all stores (existing logic)
        if (oldVersion < 3) {
          console.log('Performing full database recreation for version < 3');
          
          // Delete existing stores if they exist (for clean upgrade)
          if (db.objectStoreNames.contains('customers')) {
            db.deleteObjectStore('customers');
          }
          if (db.objectStoreNames.contains('appointments')) {
            db.deleteObjectStore('appointments');
          }
          if (db.objectStoreNames.contains('images')) {
            db.deleteObjectStore('images');
          }
          
          // Create customers store with all indexes
          const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
          customerStore.createIndex('lastName', 'lastName', { unique: false });
          customerStore.createIndex('firstName', 'firstName', { unique: false });
          customerStore.createIndex('contactNumber', 'contactNumber', { unique: false });
          customerStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          
          // Create appointments store with all indexes
          const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
          appointmentStore.createIndex('customerId', 'customerId', { unique: false });
          appointmentStore.createIndex('start', 'start', { unique: false });
          appointmentStore.createIndex('customerId_start', ['customerId', 'start'], { unique: false });
          
          // Create images store with indexes
          const imagesStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          imagesStore.createIndex('customerId', 'customerId', { unique: false });
          
          // Create notes store for localStorage fallback
          const notesStore = db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
          notesStore.createIndex('customerId', 'customerId', { unique: false });
          notesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        database = request.result;
        
        // Verify that noteVersions store exists after upgrade
        const stores = Array.from(database.objectStoreNames);
        console.log('Database opened. Version:', database.version, 'Expected:', DB_VERSION, 'Stores:', stores);
        
        if (DB_VERSION >= 5 && !database.objectStoreNames.contains('noteVersions')) {
          console.warn('noteVersions store missing. Database may need upgrade from version', database.version);
        }
        
        resolve(database);
      };
      request.onerror = () => {
        console.error('Failed to open database:', request.error);
        reject(request.error);
      };
    });
  }

  function runTransaction(storeNames, mode, executor) {
    return openDatabase().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = storeNames.map((name) => tx.objectStore(name));
      const result = executor(...stores);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  // Customers
  function createCustomer(customer) {
    return runTransaction(['customers'], 'readwrite', (customers) => (
      new Promise((resolve, reject) => {
        const req = customers.add(customer);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function updateCustomer(updated) {
    return runTransaction(['customers'], 'readwrite', (customers) => {
      customers.put(updated);
    });
  }

  function getCustomerById(id) {
    return runTransaction(['customers'], 'readonly', (customers) => (
      new Promise((resolve, reject) => {
        const req = customers.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function searchCustomers(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return getAllCustomers();
    return runTransaction(['customers'], 'readonly', (customers) => (
      new Promise((resolve, reject) => {
        const results = [];
        const req = customers.openCursor();
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) {
            const value = cursor.value;
            const hay = [value.firstName, value.lastName, value.contactNumber, value.socialMediaName].filter(Boolean).join(' ').toLowerCase();
            if (hay.includes(q)) results.push(value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAllCustomers() {
    return runTransaction(['customers'], 'readonly', (customers) => (
      new Promise((resolve, reject) => {
        const items = [];
        const req = customers.openCursor();
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) { items.push(cursor.value); cursor.continue(); }
          else resolve(items);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  // NEW: Get customers sorted by update time (for recent customers)
  function getRecentCustomers(limit = 10) {
    return runTransaction(['customers'], 'readonly', (customers) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = customers.index('updatedAt');
        const req = index.openCursor(null, 'prev'); // Descending order
        
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAllAppointments() {
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const items = [];
        const req = appointments.openCursor();
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) { items.push(cursor.value); cursor.continue(); }
          else resolve(items);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAllImages() {
    return runTransaction(['images'], 'readonly', (images) => (
      new Promise((resolve, reject) => {
        const items = [];
        const req = images.openCursor();
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) { items.push(cursor.value); cursor.continue(); }
          else resolve(items);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  // Images - Optimized approach with compression for iPad
  function addImages(customerId, fileEntries) {
    return runTransaction(['images'], 'readwrite', (images) => (
      Promise.all(fileEntries.map((entry) => new Promise(async (resolve, reject) => {
        try {
          // Compress image before storing
          const compressedBlob = await compressImage(entry.blob, entry.type);
          const dataUrl = await blobToDataURL(compressedBlob);
          
          const toStore = {
            customerId,
            name: entry.name,
            type: entry.type,
            dataUrl: dataUrl,
            createdAt: new Date().toISOString(),
          };
          
          const req = images.add(toStore);
          req.onsuccess = () => {
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        } catch (error) {
          reject(error);
        }
      })))
    ));
  }

  // Add a single image - avoids transaction timeout issues
  async function addImage(customerId, entry) {
    try {
      // Process image outside of transaction
      const compressedBlob = await compressImage(entry.blob, entry.type);
      const dataUrl = await blobToDataURL(compressedBlob);
      
      const toStore = {
        customerId,
        name: entry.name,
        type: entry.type,
        dataUrl: dataUrl,
        createdAt: new Date().toISOString(),
      };
      
      // Now do the database operation in a transaction
      return runTransaction(['images'], 'readwrite', (images) => (
        new Promise((resolve, reject) => {
          const req = images.add(toStore);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
      ));
    } catch (error) {
      throw error;
    }
  }
  
  // Image compression function for iPad memory optimization
  async function compressImage(blob, type) {
    return new Promise((resolve, reject) => {
      try {
        // Check if image is already small enough
        if (blob.size <= 500 * 1024) { // 500KB limit
          resolve(blob);
          return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          try {
            // Calculate new dimensions (max 1200px width/height)
            const maxSize = 1200;
            let { width, height } = img;
            
            if (width > maxSize || height > maxSize) {
              const ratio = Math.min(maxSize / width, maxSize / height);
              width *= ratio;
              height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw compressed image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob with quality compression
            canvas.toBlob((compressedBlob) => {
              if (compressedBlob && compressedBlob.size < blob.size) {
                resolve(compressedBlob);
              } else {
                resolve(blob); // Use original if compression didn't help
              }
            }, type || 'image/jpeg', 0.8); // 80% quality
          } catch (error) {
            console.error('Error during image compression:', error);
            resolve(blob); // Fallback to original
          }
        };
        
        img.onerror = (error) => {
          console.error('Error loading image for compression:', error);
          resolve(blob); // Fallback to original
        };
        
        img.src = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error in compressImage:', error);
        reject(error);
      }
    });
  }

  function getImagesByCustomerId(customerId) {
    return runTransaction(['images'], 'readonly', (images) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = images.index('customerId');
        const range = IDBKeyRange.only(customerId);
        const req = index.openCursor(range);
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) { 
            const imageData = cursor.value;
            // Convert dataURL back to blob for display
            if (imageData.dataUrl) {
              try {
                const blob = dataURLToBlob(imageData.dataUrl, imageData.type);
                if (blob && blob.size > 0) {
                  results.push({
                    ...imageData,
                    blob: blob,
                    dataUrl: imageData.dataUrl // Keep dataUrl for iPad Safari fallback
                  });
                } else {
                }
              } catch (error) {
              }
            } else {
            }
            cursor.continue(); 
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  // Appointments
  function createAppointment(appointment) {
    return runTransaction(['appointments'], 'readwrite', (appointments) => (
      new Promise((resolve, reject) => {
        const req = appointments.add(appointment);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAppointmentsBetween(startISO, endISO) {
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = appointments.index('start');
        const range = IDBKeyRange.bound(startISO, endISO);
        const req = index.openCursor(range);
        
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  // NEW: Get appointments for a specific date (for today's appointments)
  function getAppointmentsForDate(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return getAppointmentsBetween(start.toISOString(), end.toISOString());
  }

  // NEW: Get future appointments for a customer (for next appointment)
  function getFutureAppointmentsForCustomer(customerId) {
    const now = new Date().toISOString();
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = appointments.index('customerId_start');
        const range = IDBKeyRange.bound([customerId, now], [customerId, '\uffff']);
        const req = index.openCursor(range);
        
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAppointmentsForCustomer(customerId) {
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = appointments.index('customerId');
        const req = index.openCursor(IDBKeyRange.only(customerId));
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) { results.push(cursor.value); cursor.continue(); }
          else resolve(results);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAppointmentById(id) {
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const parsedId = parseInt(id);
        const req = appointments.get(parsedId);
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function updateAppointment(updated) {
    return runTransaction(['appointments'], 'readwrite', (appointments) => (
      new Promise((resolve, reject) => {
        // Ensure ID is a number
        const appointmentToUpdate = {
          ...updated,
          id: parseInt(updated.id)
        };
        
        const req = appointments.put(appointmentToUpdate);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function deleteAppointment(id) {
    return runTransaction(['appointments'], 'readwrite', (appointments) => (
      new Promise((resolve, reject) => {
        const req = appointments.delete(parseInt(id));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function deleteImage(imageId) {
    return runTransaction(['images'], 'readwrite', (images) => (
      new Promise((resolve, reject) => {
        const req = images.delete(parseInt(imageId));
        req.onsuccess = () => {
          // Also remove from localStorage
          clearImageFromLocalStorage(imageId);
          resolve(req.result);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function deleteCustomer(id) {
    return runTransaction(['customers', 'appointments', 'images'], 'readwrite', (customers, appointments, images) => (
      Promise.all([
        // Delete customer
        new Promise((resolve, reject) => {
          const req = customers.delete(parseInt(id));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }),
        // Delete all appointments for this customer
        new Promise((resolve, reject) => {
          const index = appointments.index('customerId');
          const range = IDBKeyRange.only(parseInt(id));
          const req = index.openCursor(range);
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              appointments.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              resolve(null);
            }
          };
          req.onerror = () => reject(req.error);
        }),
        // Delete all images for this customer
        new Promise((resolve, reject) => {
          const index = images.index('customerId');
          const range = IDBKeyRange.only(parseInt(id));
          const req = index.openCursor(range);
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              images.delete(cursor.primaryKey);
              cursor.continue();
            } else {
              resolve(null);
            }
          };
          req.onerror = () => reject(req.error);
        })
      ])
    ));
  }

  // Utils
  async function fileListToEntries(fileList) {
    const files = Array.from(fileList || []);
    const entries = await Promise.all(files.map((file) => fileToEntry(file)));
    return entries;
  }

  function fileToEntry(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const blob = new Blob([arrayBuffer], { type: file.type });
        resolve({ name: file.name, type: file.type, blob });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function exportAllData() {
    
    // Export customers first (usually small)
    const customers = await getAllCustomers();
    
    // Export appointments (usually small)
    const appointments = await getAllAppointments();
    
    // Export notes from localStorage (new SVG notes)
    const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
    
    // Export notes from IndexedDB and merge with localStorage notes
    const indexedDBNotes = await getAllNotes();
    const mergedCustomerNotes = { ...customerNotes };
    
    indexedDBNotes.forEach(note => {
      if (note && note.customerId !== undefined && note.customerId !== null) {
        const customerId = String(note.customerId);
        
        // Initialize array if it doesn't exist
        if (!mergedCustomerNotes[customerId]) {
          mergedCustomerNotes[customerId] = [];
        }
        
        // Check if note with same ID already exists (from localStorage)
        const existingIndex = mergedCustomerNotes[customerId].findIndex(n => n.id === note.id);
        
        if (existingIndex >= 0) {
          // Merge: prefer the note with more data (longer SVG or more recent)
          const existing = mergedCustomerNotes[customerId][existingIndex];
          const existingSvgSize = (existing.svg || '').length;
          const indexedDBSvgSize = (note.svg || '').length;
          
          // If IndexedDB version has more data, replace it
          if (indexedDBSvgSize > existingSvgSize) {
            mergedCustomerNotes[customerId][existingIndex] = note;
          } else {
            // Otherwise keep existing but ensure it has customerId
            if (!existing.customerId) {
              existing.customerId = note.customerId;
            }
          }
        } else {
          // Add new note, ensure it has customerId
          const noteToAdd = { ...note };
          if (!noteToAdd.customerId) {
            noteToAdd.customerId = note.customerId;
          }
          mergedCustomerNotes[customerId].push(noteToAdd);
        }
      } else {
        console.warn('Note from IndexedDB missing customerId:', note);
      }
    });
    
    // Also ensure all localStorage notes have customerId field
    for (const customerId in mergedCustomerNotes) {
      if (mergedCustomerNotes[customerId]) {
        mergedCustomerNotes[customerId].forEach(note => {
          if (!note.customerId) {
            note.customerId = parseInt(customerId);
          }
        });
      }
    }
    
    // Export images in chunks to avoid memory issues
    const images = await getAllImages();
    
    const imagesSerialized = [];
    const chunkSize = 10; // Process 10 images at a time
    
    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);
      
      const chunkProcessed = await Promise.all(chunk.map(async (img) => {
        try {
          return {
            id: img.id,
            customerId: img.customerId,
            name: img.name,
            type: img.type,
            createdAt: img.createdAt,
            dataUrl: img.dataUrl, // Use dataUrl directly instead of converting from blob
          };
        } catch (error) {
          return null;
        }
      }));
      
      // Filter out null results and add to main array
      imagesSerialized.push(...chunkProcessed.filter(img => img !== null));
      
      // Small delay to prevent memory pressure
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    
    return {
      __meta: {
        app: 'chikas-db',
        version: 3,
        exportedAt: new Date().toISOString(),
      },
      customers,
      appointments,
      customerNotes: mergedCustomerNotes, // Include notes from both localStorage and IndexedDB
      images: imagesSerialized,
    };
  }

  // Notes functions for localStorage fallback
  function createNote(note) {
    return runTransaction(['notes'], 'readwrite', (notes) => (
      new Promise((resolve, reject) => {
        // Normalize date fields to yyyy-mm-dd format
        const normalizedDate = normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(new Date());
        const normalizedCreatedAt = note.createdAt || new Date().toISOString().split('T')[0];
        
        const noteToStore = {
          ...note,
          date: normalizedDate,
          createdAt: normalizeDateToYYYYMMDD(normalizedCreatedAt) || new Date().toISOString().split('T')[0],
          editedDate: note.editedDate ? normalizeDateToYYYYMMDD(note.editedDate) : undefined
        };
        const req = notes.add(noteToStore);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getNotesByCustomerId(customerId) {
    return runTransaction(['notes'], 'readonly', (notes) => (
      new Promise((resolve, reject) => {
        const results = [];
        const index = notes.index('customerId');
        const range = IDBKeyRange.only(parseInt(customerId));
        const req = index.openCursor(range);
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) { 
            results.push(cursor.value);
            cursor.continue(); 
          } else {
            // Sort by creation time, newest first
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            resolve(results);
          }
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function updateNote(updatedNote) {
    // First, get the existing note to preserve all fields
    return runTransaction(['notes'], 'readonly', (notes) => (
      new Promise((resolve, reject) => {
        const noteId = parseInt(updatedNote.id);
        const req = notes.get(noteId);
        req.onsuccess = () => {
          const existingNote = req.result;
          if (!existingNote) {
            reject(new Error(`Note with id ${noteId} not found`));
            return;
          }
          resolve(existingNote);
        };
        req.onerror = () => reject(req.error);
      })
    )).then(async (existingNote) => {
      // Save previous version before updating (only store essential fields to save space)
      // Only save if the note actually has content that changed
      if (existingNote.svg && existingNote.svg !== updatedNote.svg) {
        try {
          // Check if store exists before trying to use it
          const storeExists = await checkNoteVersionsStoreExists();
          if (!storeExists) {
            console.debug('noteVersions store not available, skipping version save');
          } else {
            await runTransaction(['noteVersions'], 'readwrite', (noteVersions) => {
              return new Promise((resolve, reject) => {
                // Delete any existing version for this note (only keep latest)
                const index = noteVersions.index('noteId');
                const range = IDBKeyRange.only(existingNote.id);
                const request = index.openCursor(range);
                
                let hasDeleted = false;
                
                request.onsuccess = () => {
                  const cursor = request.result;
                  if (cursor) {
                    cursor.delete();
                    hasDeleted = true;
                    cursor.continue();
                  } else {
                    // No more versions, now add the new one
                    const previousVersion = {
                      noteId: existingNote.id,
                      // Store only essential fields to save memory
                      svg: existingNote.svg,
                      editedDate: existingNote.editedDate,
                      savedAt: new Date().toISOString()
                    };
                    const addReq = noteVersions.add(previousVersion);
                    addReq.onsuccess = () => resolve(addReq.result);
                    addReq.onerror = () => reject(addReq.error);
                  }
                };
                request.onerror = () => {
                  // If index doesn't exist yet or error, try to add anyway
                  const previousVersion = {
                    noteId: existingNote.id,
                    svg: existingNote.svg,
                    editedDate: existingNote.editedDate,
                    savedAt: new Date().toISOString()
                  };
                  const addReq = noteVersions.add(previousVersion);
                  addReq.onsuccess = () => resolve(addReq.result);
                  addReq.onerror = () => {
                    // If adding fails, just resolve without error (don't block update)
                    console.warn('Could not save note version history:', addReq.error);
                    resolve(null);
                  };
                };
              });
            });
          }
        } catch (versionError) {
          // If versioning fails, log but don't block the update
          console.warn('Failed to save note version:', versionError);
        }
      }
      
      // Merge existing note with updates, preserving all original fields
      // Normalize date fields to yyyy-mm-dd format
      const mergedNote = {
        ...existingNote,
        ...updatedNote,
        // Ensure ID is preserved from existing note
        id: existingNote.id,
        // Normalize date fields
        date: updatedNote.date ? normalizeDateToYYYYMMDD(updatedNote.date) : (existingNote.date ? normalizeDateToYYYYMMDD(existingNote.date) : normalizeDateToYYYYMMDD(new Date())),
        editedDate: updatedNote.editedDate ? normalizeDateToYYYYMMDD(updatedNote.editedDate) : existingNote.editedDate ? normalizeDateToYYYYMMDD(existingNote.editedDate) : undefined,
        createdAt: existingNote.createdAt ? normalizeDateToYYYYMMDD(existingNote.createdAt) : (updatedNote.createdAt ? normalizeDateToYYYYMMDD(updatedNote.createdAt) : new Date().toISOString().split('T')[0])
      };
      
      // Now save the merged note
      return runTransaction(['notes'], 'readwrite', (notes) => (
        new Promise((resolve, reject) => {
          const req = notes.put(mergedNote);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
      ));
    });
  }
  
  // Helper to check if noteVersions store exists
  async function checkNoteVersionsStoreExists() {
    try {
      const db = await openDatabase();
      return db.objectStoreNames.contains('noteVersions');
    } catch (error) {
      return false;
    }
  }

  // Get previous version of a note (if available)
  function getNotePreviousVersion(noteId) {
    return checkNoteVersionsStoreExists().then(async (storeExists) => {
      if (!storeExists) {
        console.warn('noteVersions store does not exist yet. Database may need to be upgraded.');
        return null;
      }
      
      return runTransaction(['noteVersions'], 'readonly', (noteVersions) => (
        new Promise((resolve, reject) => {
          try {
            const index = noteVersions.index('noteId');
            const range = IDBKeyRange.only(parseInt(noteId));
            const request = index.openCursor(range);
            
            let latestVersion = null;
            request.onsuccess = () => {
              const cursor = request.result;
              if (cursor) {
                const version = cursor.value;
                // Keep the most recent version (highest savedAt)
                if (!latestVersion || version.savedAt > latestVersion.savedAt) {
                  latestVersion = version;
                }
                cursor.continue();
              } else {
                resolve(latestVersion);
              }
            };
            request.onerror = () => reject(request.error);
          } catch (error) {
            // If index doesn't exist, return null
            console.warn('Note versions index not available:', error);
            resolve(null);
          }
        })
      ));
    }).catch((error) => {
      console.warn('Error checking note versions store:', error);
      return null;
    });
  }
  
  // Restore note to previous version
  function restoreNoteToPreviousVersion(noteId) {
    return getNotePreviousVersion(noteId).then(async (previousVersion) => {
      if (!previousVersion) {
        throw new Error('No previous version found for this note');
      }
      
      // Get the current note to preserve other fields
      const currentNote = await runTransaction(['notes'], 'readonly', (notes) => (
        new Promise((resolve, reject) => {
          const req = notes.get(parseInt(noteId));
          req.onsuccess = () => {
            if (!req.result) {
              reject(new Error(`Note with id ${noteId} not found`));
              return;
            }
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        })
      ));
      
      // Restore the note with previous version's SVG and editedDate
      const restoredNote = {
        ...currentNote,
        svg: previousVersion.svg,
        editedDate: previousVersion.editedDate || currentNote.editedDate,
        // Mark as restored
        restoredAt: new Date().toISOString()
      };
      
      // Save the restored note
      return runTransaction(['notes'], 'readwrite', (notes) => (
        new Promise((resolve, reject) => {
          const req = notes.put(restoredNote);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        })
      ));
    });
  }

  function deleteNote(noteId) {
    return runTransaction(['notes'], 'readwrite', (notes) => (
      new Promise((resolve, reject) => {
        const req = notes.delete(parseInt(noteId));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
    ));
  }

  function getAllNotes() {
    return runTransaction(['notes'], 'readonly', (notes) => (
      new Promise((resolve, reject) => {
        const items = [];
        const req = notes.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) { items.push(cursor.value); cursor.continue(); }
          else resolve(items);
        };
        req.onerror = () => reject(req.error);
      })
    ));
  }

  // Recovery function: Scan and identify potentially corrupted notes
  async function scanForCorruptedNotes() {
    const results = {
      corrupted: [],
      healthy: [],
      localStorageOnly: [],
      indexeddbOnly: [],
      conflicts: []
    };

    try {
      // Get all notes from IndexedDB
      const indexedDBNotes = await getAllNotes();
      const indexedDBMap = new Map();
      indexedDBNotes.forEach(note => {
        indexedDBMap.set(note.id, note);
      });

      // Get all notes from localStorage
      const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const localStorageNotes = [];
      for (const customerId in customerNotes) {
        const notes = customerNotes[customerId];
        notes.forEach(note => {
          note.customerId = parseInt(customerId); // Ensure customerId is set
          localStorageNotes.push(note);
        });
      }

      const localStorageMap = new Map();
      localStorageNotes.forEach(note => {
        localStorageMap.set(note.id, note);
      });

      // Check for notes that exist in both
      const allNoteIds = new Set([...indexedDBMap.keys(), ...localStorageMap.keys()]);

      for (const noteId of allNoteIds) {
        const indexedDBNote = indexedDBMap.get(noteId);
        const localStorageNote = localStorageMap.get(noteId);

        // Helper to check if a note is corrupted (missing essential fields)
        const isCorrupted = (note) => {
          if (!note) return true;
          // A note is corrupted if it's missing essential fields
          const hasSvg = note.svg && typeof note.svg === 'string' && note.svg.length > 10;
          const hasDate = note.date || note.createdAt;
          return !hasSvg || !hasDate;
        };

        if (indexedDBNote && localStorageNote) {
          // Note exists in both - compare them
          const indexedDBCorrupted = isCorrupted(indexedDBNote);
          const localStorageCorrupted = isCorrupted(localStorageNote);

          if (indexedDBCorrupted && !localStorageCorrupted) {
            // IndexedDB version is corrupted, localStorage is good
            results.corrupted.push({
              noteId,
              customerId: indexedDBNote.customerId || localStorageNote.customerId,
              source: 'indexeddb',
              issue: 'Missing essential fields (svg or date)',
              healthyVersion: localStorageNote,
              corruptedVersion: indexedDBNote
            });
          } else if (!indexedDBCorrupted && localStorageCorrupted) {
            // localStorage version is corrupted, IndexedDB is good
            results.corrupted.push({
              noteId,
              customerId: indexedDBNote.customerId || localStorageNote.customerId,
              source: 'localStorage',
              issue: 'Missing essential fields (svg or date)',
              healthyVersion: indexedDBNote,
              corruptedVersion: localStorageNote
            });
          } else if (indexedDBCorrupted && localStorageCorrupted) {
            // Both are corrupted - check if one has more data
            const indexedDBDataSize = JSON.stringify(indexedDBNote).length;
            const localStorageDataSize = JSON.stringify(localStorageNote).length;
            if (indexedDBDataSize > localStorageDataSize) {
              results.corrupted.push({
                noteId,
                customerId: indexedDBNote.customerId || localStorageNote.customerId,
                source: 'both',
                issue: 'Both corrupted, but IndexedDB has more data',
                healthyVersion: indexedDBNote,
                corruptedVersion: localStorageNote
              });
            } else {
              results.corrupted.push({
                noteId,
                customerId: indexedDBNote.customerId || localStorageNote.customerId,
                source: 'both',
                issue: 'Both corrupted, but localStorage has more data',
                healthyVersion: localStorageNote,
                corruptedVersion: indexedDBNote
              });
            }
          } else {
            // Both are healthy - check for conflicts (different svg content)
            const indexedDBSvg = indexedDBNote.svg || '';
            const localStorageSvg = localStorageNote.svg || '';
            if (indexedDBSvg !== localStorageSvg && indexedDBSvg.length > 10 && localStorageSvg.length > 10) {
              results.conflicts.push({
                noteId,
                customerId: indexedDBNote.customerId || localStorageNote.customerId,
                indexedDBVersion: indexedDBNote,
                localStorageVersion: localStorageNote
              });
            } else {
              results.healthy.push({
                noteId,
                customerId: indexedDBNote.customerId || localStorageNote.customerId,
                note: indexedDBNote // Either is fine if they match
              });
            }
          }
        } else if (indexedDBNote) {
          // Only in IndexedDB
          if (isCorrupted(indexedDBNote)) {
            results.corrupted.push({
              noteId,
              customerId: indexedDBNote.customerId,
              source: 'indexeddb-only',
              issue: 'Missing essential fields and only exists in IndexedDB',
              corruptedVersion: indexedDBNote
            });
          } else {
            results.indexeddbOnly.push({
              noteId,
              customerId: indexedDBNote.customerId,
              note: indexedDBNote
            });
          }
        } else if (localStorageNote) {
          // Only in localStorage
          if (isCorrupted(localStorageNote)) {
            results.corrupted.push({
              noteId,
              customerId: localStorageNote.customerId,
              source: 'localStorage-only',
              issue: 'Missing essential fields and only exists in localStorage',
              corruptedVersion: localStorageNote
            });
          } else {
            results.localStorageOnly.push({
              noteId,
              customerId: localStorageNote.customerId,
              note: localStorageNote
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error scanning for corrupted notes:', error);
      throw error;
    }
  }

  // Recovery function: Restore notes from backup file
  async function restoreNotesFromBackup(backupData, options = {}) {
    const { mode = 'merge', customerId = null } = options;
    const results = {
      restored: [],
      skipped: [],
      failed: []
    };

    try {
      // Extract notes from backup
      const backupNotes = backupData.customerNotes || {};
      let notesToRestore = [];

      if (customerId) {
        // Restore notes for a specific customer only
        const customerNotes = backupNotes[String(customerId)] || [];
        notesToRestore = customerNotes.map(note => ({
          ...note,
          customerId: parseInt(customerId)
        }));
      } else {
        // Restore all notes from backup
        for (const custId in backupNotes) {
          const customerNotes = backupNotes[custId];
          customerNotes.forEach(note => {
            notesToRestore.push({
              ...note,
              customerId: parseInt(custId)
            });
          });
        }
      }

      // Also check for notes in IndexedDB format in backup
      if (backupData.notes && Array.isArray(backupData.notes)) {
        backupData.notes.forEach(note => {
          if (!customerId || note.customerId === parseInt(customerId)) {
            notesToRestore.push(note);
          }
        });
      }

      // Get current notes to check what needs restoring
      const currentScan = await scanForCorruptedNotes();
      const currentNoteIds = new Set();
      
      // Collect all current note IDs
      currentScan.healthy.forEach(n => currentNoteIds.add(n.noteId));
      currentScan.corrupted.forEach(n => currentNoteIds.add(n.noteId));
      currentScan.indexeddbOnly.forEach(n => currentNoteIds.add(n.noteId));
      currentScan.localStorageOnly.forEach(n => currentNoteIds.add(n.noteId));

      for (const backupNote of notesToRestore) {
        try {
          const noteId = backupNote.id;
          const exists = currentNoteIds.has(noteId);
          
          // Check if note is healthy in backup
          const hasSvg = backupNote.svg && typeof backupNote.svg === 'string' && backupNote.svg.length > 10;
          const hasDate = backupNote.date || backupNote.createdAt;
          
          if (!hasSvg || !hasDate) {
            results.skipped.push({
              noteId,
              customerId: backupNote.customerId,
              reason: 'Note in backup is also corrupted (missing essential fields)'
            });
            continue;
          }

          if (mode === 'replace' || !exists) {
            // Restore the note
            try {
              if (exists) {
                // Update existing note
                await updateNote(backupNote);
                results.restored.push({
                  noteId,
                  customerId: backupNote.customerId,
                  method: 'indexeddb',
                  action: 'replaced'
                });
              } else {
                // Create new note (might be a note that was deleted)
                try {
                  await createNote(backupNote);
                  results.restored.push({
                    noteId,
                    customerId: backupNote.customerId,
                    method: 'indexeddb',
                    action: 'added'
                  });
                } catch (createError) {
                  // If create fails (e.g., ID conflict), try update
                  await updateNote(backupNote);
                  results.restored.push({
                    noteId,
                    customerId: backupNote.customerId,
                    method: 'indexeddb',
                    action: 'replaced'
                  });
                }
              }
            } catch (dbError) {
              // Fallback to localStorage
              const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
              const custId = String(backupNote.customerId);
              const customerNotes = existingNotes[custId] || [];
              
              const noteIndex = customerNotes.findIndex(n => n.id === noteId);
              if (noteIndex !== -1) {
                customerNotes[noteIndex] = backupNote;
              } else {
                customerNotes.push(backupNote);
              }
              
              existingNotes[custId] = customerNotes;
              localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
              
              results.restored.push({
                noteId,
                customerId: backupNote.customerId,
                method: 'localStorage',
                action: exists ? 'replaced' : 'added'
              });
            }
          } else {
            // Check if current version is corrupted and backup is better
            const currentCorrupted = currentScan.corrupted.find(c => c.noteId === noteId);
            if (currentCorrupted && currentCorrupted.healthyVersion) {
              // Current is corrupted, backup might be better - compare sizes
              const backupSize = JSON.stringify(backupNote).length;
              const currentSize = JSON.stringify(currentCorrupted.corruptedVersion).length;
              
              if (backupSize > currentSize * 1.1) { // Backup has significantly more data
                await updateNote(backupNote);
                results.restored.push({
                  noteId,
                  customerId: backupNote.customerId,
                  method: 'indexeddb',
                  action: 'recovered-from-backup'
                });
              } else {
                results.skipped.push({
                  noteId,
                  customerId: backupNote.customerId,
                  reason: 'Current version appears healthier than backup'
                });
              }
            } else {
              results.skipped.push({
                noteId,
                customerId: backupNote.customerId,
                reason: 'Note already exists and appears healthy'
              });
            }
          }
        } catch (error) {
          results.failed.push({
            noteId: backupNote.id,
            customerId: backupNote.customerId,
            error: error.message
          });
        }
      }

      return {
        restored: results.restored.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
        details: results
      };
    } catch (error) {
      console.error('Error restoring notes from backup:', error);
      throw error;
    }
  }

  // Recovery function: Restore corrupted notes from healthy versions
  async function recoverCorruptedNotes(dryRun = true) {
    const scanResults = await scanForCorruptedNotes();
    const recoveryActions = [];

    for (const corrupted of scanResults.corrupted) {
      if (corrupted.healthyVersion) {
        recoveryActions.push({
          noteId: corrupted.noteId,
          customerId: corrupted.customerId,
          action: corrupted.source.includes('indexeddb') ? 'restore-to-indexeddb' : 'restore-to-localstorage',
          healthyVersion: corrupted.healthyVersion
        });
      }
    }

    if (dryRun) {
      return {
        canRecover: recoveryActions.length,
        actions: recoveryActions,
        summary: scanResults
      };
    }

    // Actually perform recovery
    const recoveryResults = {
      recovered: [],
      failed: []
    };

    for (const action of recoveryActions) {
      try {
        if (action.action === 'restore-to-indexeddb') {
          // Restore to IndexedDB
          await updateNote(action.healthyVersion);
          recoveryResults.recovered.push({
            noteId: action.noteId,
            customerId: action.customerId,
            method: 'indexeddb'
          });
        } else if (action.action === 'restore-to-localstorage') {
          // Restore to localStorage
          const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
          const customerId = String(action.customerId);
          const customerNotes = existingNotes[customerId] || [];
          
          const noteIndex = customerNotes.findIndex(n => n.id === action.noteId);
          if (noteIndex !== -1) {
            customerNotes[noteIndex] = action.healthyVersion;
          } else {
            customerNotes.push(action.healthyVersion);
          }
          
          existingNotes[customerId] = customerNotes;
          localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
          
          recoveryResults.recovered.push({
            noteId: action.noteId,
            customerId: action.customerId,
            method: 'localStorage'
          });
        }
      } catch (error) {
        recoveryResults.failed.push({
          noteId: action.noteId,
          customerId: action.customerId,
          error: error.message
        });
      }
    }

    return {
      recovered: recoveryResults.recovered.length,
      failed: recoveryResults.failed.length,
      details: recoveryResults,
      summary: scanResults
    };
  }

  function clearAllStores() {
    return runTransaction(['customers', 'appointments', 'images', 'notes'], 'readwrite', (customers, appointments, images, notes) => (
      Promise.all([
        new Promise((resolve, reject) => { const r = customers.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
        new Promise((resolve, reject) => { const r = appointments.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
        new Promise((resolve, reject) => { const r = images.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
        new Promise((resolve, reject) => { const r = notes.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
      ])
    ));
  }

  function importAllData(payload, options = { mode: 'replace' }) {
    const mode = options.mode || 'replace';
    const { customers = [], appointments = [], images = [], customerNotes = {}, __meta = {} } = payload || {};
    if (!__meta || __meta.app !== 'chikas-db') {
      // Allow import anyway, but basic validation failed
    }
    const perform = async () => {
      if (mode === 'replace') await clearAllStores();
      // Insert customers and appointments retaining ids
      await runTransaction(['customers'], 'readwrite', (customersStore) => {
        customers.forEach((c) => customersStore.put(c));
      });
      await runTransaction(['appointments'], 'readwrite', (appointmentsStore) => {
        appointments.forEach((a) => appointmentsStore.put(a));
      });
      
      // Import customer notes to IndexedDB instead of localStorage to avoid quota issues
      // This is more reliable and can handle much larger datasets
      if (customerNotes && Object.keys(customerNotes).length > 0) {
        // Count total notes for progress tracking
        let totalNotes = 0;
        for (const customerId in customerNotes) {
          if (customerNotes[customerId] && Array.isArray(customerNotes[customerId])) {
            totalNotes += customerNotes[customerId].length;
          }
        }
        
        // Import notes to IndexedDB in chunks to avoid transaction timeout
        const chunkSize = 50; // Process 50 notes at a time
        let processedNotes = 0;
        
        for (const customerId in customerNotes) {
          const notes = customerNotes[customerId];
          if (!Array.isArray(notes)) continue;
          
          // Process notes in chunks
          for (let i = 0; i < notes.length; i += chunkSize) {
            const chunk = notes.slice(i, i + chunkSize);
            
            await runTransaction(['notes'], 'readwrite', (notesStore) => {
              return Promise.all(chunk.map(note => {
                return new Promise((resolve, reject) => {
                  try {
                    // Ensure note has customerId and normalize dates
                    const noteToImport = {
                      ...note,
                      customerId: note.customerId || parseInt(customerId),
                      date: normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(note.createdAt) || normalizeDateToYYYYMMDD(new Date()),
                      createdAt: normalizeDateToYYYYMMDD(note.createdAt) || normalizeDateToYYYYMMDD(note.date) || new Date().toISOString().split('T')[0],
                      editedDate: note.editedDate ? normalizeDateToYYYYMMDD(note.editedDate) : undefined
                    };
                    
                    // Use put() which will update if exists, add if new
                    const req = notesStore.put(noteToImport);
                    req.onsuccess = () => {
                      processedNotes++;
                      resolve(req.result);
                    };
                    req.onerror = () => reject(req.error);
                  } catch (error) {
                    reject(error);
                  }
                });
              }));
            });
            
            // Small delay to prevent overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        // Only store a minimal reference in localStorage if needed for backward compatibility
        // Store a lightweight version with just IDs and basic info
        try {
          const lightweightNotes = {};
          for (const customerId in customerNotes) {
            if (customerNotes[customerId] && Array.isArray(customerNotes[customerId])) {
              // Only store basic metadata, not full SVG data
              lightweightNotes[customerId] = customerNotes[customerId].map(note => ({
                id: note.id,
                date: note.date || note.createdAt || note.editedDate,
                noteNumber: note.noteNumber
              }));
            }
          }
          
          // Only store if it's reasonably small (under 1MB)
          const lightweightStr = JSON.stringify(lightweightNotes);
          if (lightweightStr.length < 1024 * 1024) { // Less than 1MB
            localStorage.setItem('customerNotesMetadata', lightweightStr);
          }
        } catch (metadataError) {
          // If even metadata is too large, skip localStorage entirely
          console.warn('Could not store notes metadata in localStorage:', metadataError);
        }
      }
      // Images need dataUrl -> blob
      let successCount = 0;
      let errorCount = 0;
      
      await runTransaction(['images'], 'readwrite', (imagesStore) => {
        images.forEach((img, index) => {
          try {
            // Store directly as dataURL (already in the backup)
            const imageData = { 
              id: img.id, 
              customerId: img.customerId, 
              name: img.name, 
              type: img.type, 
              dataUrl: img.dataUrl, 
              createdAt: img.createdAt 
            };
            imagesStore.put(imageData);
            successCount++;
          } catch (error) {
            errorCount++;
          }
        });
      });
      
    };
    return perform();
  }

  function dataURLToBlob(dataUrl, fallbackType) {
    try {
      const parts = String(dataUrl || '').split(',');
      const meta = parts[0] || '';
      const base64 = parts[1] || '';
      
      if (!base64) {
        return new Blob([], { type: fallbackType || 'application/octet-stream' });
      }
      
      const mimeMatch = /data:([^;]+);base64/.exec(meta);
      const mime = mimeMatch ? mimeMatch[1] : (fallbackType || 'application/octet-stream');
      
      // Check if base64 is too large (iPad memory limit)
      if (base64.length > 50 * 1024 * 1024) { // 50MB limit
        return new Blob([], { type: mime });
      }
      
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      return new Blob([], { type: fallbackType || 'application/octet-stream' });
    }
  }

  // localStorage backup functions for iOS Safari IndexedDB issues
  async function storeImageReferenceInLocalStorage(imageId, imageData) {
    try {
      const key = `chikas_image_${imageId}`;
      const dataToStore = {
        id: imageData.id,
        customerId: imageData.customerId,
        name: imageData.name,
        type: imageData.type,
        fileUrl: imageData.fileUrl,
        createdAt: imageData.createdAt,
        // Store a small dataURL for emergency fallback
        thumbnail: imageData.blob ? await createThumbnail(imageData.blob) : null
      };
      localStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (error) {
    }
  }

  function getImagesFromLocalStorage(customerId) {
    try {
      const images = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chikas_image_')) {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.customerId === customerId) {
            // Try to recreate blob from fileUrl or use thumbnail
            let blob = null;
            if (data.fileUrl) {
              // Try to fetch from fileUrl
              fetch(data.fileUrl)
                .then(response => response.blob())
                .then(fetchedBlob => {
                  images.push({
                    id: data.id,
                    customerId: data.customerId,
                    name: data.name,
                    type: data.type,
                    blob: fetchedBlob,
                    createdAt: data.createdAt
                  });
                })
                .catch(() => {
                  // Fallback to thumbnail if available
                  if (data.thumbnail) {
                    const thumbnailBlob = dataURLToBlob(data.thumbnail, data.type);
                    images.push({
                      id: data.id,
                      customerId: data.customerId,
                      name: data.name,
                      type: data.type,
                      blob: thumbnailBlob,
                      createdAt: data.createdAt
                    });
                  }
                });
            } else if (data.thumbnail) {
              // Use thumbnail as fallback
              const thumbnailBlob = dataURLToBlob(data.thumbnail, data.type);
              images.push({
                id: data.id,
                customerId: data.customerId,
                name: data.name,
                type: data.type,
                blob: thumbnailBlob,
                createdAt: data.createdAt
              });
            }
          }
        }
      }
      return images;
    } catch (error) {
      return [];
    }
  }

  function clearImageFromLocalStorage(imageId) {
    try {
      localStorage.removeItem(`chikas_image_${imageId}`);
    } catch (error) {
    }
  }

  // Create a small thumbnail for emergency fallback
  async function createThumbnail(blob) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Create a small thumbnail (150x150 max)
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((thumbnailBlob) => {
          if (thumbnailBlob) {
            blobToDataURL(thumbnailBlob).then(resolve);
          } else {
            resolve(null);
          }
        }, 'image/jpeg', 0.7);
      };
      
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  }

  // Lightweight backup function - customers, appointments, and notes only (no images)
  async function exportDataWithoutImages(progressCallback = null) {
    try {
      if (progressCallback) progressCallback('Starting lightweight backup...', 0);
      
      // Export customers first (usually small)
      const customers = await getAllCustomers();
      if (progressCallback) progressCallback(`Exported ${customers.length} customers`, 20);
      
      // Export appointments (usually small)
      const appointments = await getAllAppointments();
      if (progressCallback) progressCallback(`Exported ${appointments.length} appointments`, 40);
      
      // Export notes from localStorage (new SVG notes)
      const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      if (progressCallback) progressCallback(`Exported notes from localStorage for ${Object.keys(customerNotes).length} customers`, 55);
      
      // Export notes from IndexedDB
      const indexedDBNotes = await getAllNotes();
      if (progressCallback) progressCallback(`Exported ${indexedDBNotes.length} notes from IndexedDB`, 65);
      
      // Merge IndexedDB notes into customerNotes structure
      // IndexedDB notes already have customerId field, so we can organize them by customerId
      const mergedCustomerNotes = { ...customerNotes };
      
      indexedDBNotes.forEach(note => {
        if (note && note.customerId !== undefined && note.customerId !== null) {
          const customerId = String(note.customerId);
          
          // Initialize array if it doesn't exist
          if (!mergedCustomerNotes[customerId]) {
            mergedCustomerNotes[customerId] = [];
          }
          
          // Check if note with same ID already exists (from localStorage)
          const existingIndex = mergedCustomerNotes[customerId].findIndex(n => n.id === note.id);
          
          if (existingIndex >= 0) {
            // Merge: prefer the note with more data (longer SVG or more recent)
            const existing = mergedCustomerNotes[customerId][existingIndex];
            const existingSvgSize = (existing.svg || '').length;
            const indexedDBSvgSize = (note.svg || '').length;
            
            // If IndexedDB version has more data, replace it
            if (indexedDBSvgSize > existingSvgSize) {
              mergedCustomerNotes[customerId][existingIndex] = note;
            } else {
              // Otherwise keep existing but ensure it has customerId
              if (!existing.customerId) {
                existing.customerId = note.customerId;
              }
            }
          } else {
            // Add new note, ensure it has customerId
            const noteToAdd = { ...note };
            if (!noteToAdd.customerId) {
              noteToAdd.customerId = note.customerId;
            }
            mergedCustomerNotes[customerId].push(noteToAdd);
          }
        } else {
          console.warn('Note from IndexedDB missing customerId:', note);
        }
      });
      
      // Also ensure all localStorage notes have customerId field
      for (const customerId in mergedCustomerNotes) {
        if (mergedCustomerNotes[customerId]) {
          mergedCustomerNotes[customerId].forEach(note => {
            if (!note.customerId) {
              note.customerId = parseInt(customerId);
            }
          });
        }
      }
      
      const totalNotesCount = Object.values(mergedCustomerNotes).reduce((sum, notes) => sum + (notes?.length || 0), 0);
      if (progressCallback) progressCallback(`Merged notes: ${totalNotesCount} total notes for ${Object.keys(mergedCustomerNotes).length} customers`, 75);
      
      if (progressCallback) progressCallback('Creating backup file...', 90);
      
      const result = {
        __meta: {
          app: 'chikas-db',
          version: 3,
          exportedAt: new Date().toISOString(),
          backupType: 'lightweight-no-images'
        },
        customers,
        appointments,
        customerNotes: mergedCustomerNotes, // Include notes from both localStorage and IndexedDB
        images: [] // Empty images array
      };
      
      // Create blob directly
      const jsonString = JSON.stringify(result, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      if (progressCallback) progressCallback('Lightweight backup complete!', 100);
      
      return {
        blob: blob,
        customers: customers,
        appointments: appointments,
        imageCount: 0
      };
      
    } catch (error) {
      if (progressCallback) progressCallback(`Backup failed: ${error.message}`, 0);
      throw error;
    }
  }

  // Ultra-safe backup function with streaming JSON creation
  async function safeExportAllData(progressCallback = null) {
    try {
      if (progressCallback) progressCallback('Starting backup...', 0);
      
      // Export customers first (usually small)
      const customers = await getAllCustomers();
      if (progressCallback) progressCallback(`Exported ${customers.length} customers`, 10);
      
      // Export appointments (usually small)
      const appointments = await getAllAppointments();
      if (progressCallback) progressCallback(`Exported ${appointments.length} appointments`, 20);
      
      // Export notes from localStorage (new SVG notes)
      const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      if (progressCallback) progressCallback(`Exported notes from localStorage for ${Object.keys(customerNotes).length} customers`, 23);
      
      // Export notes from IndexedDB and merge with localStorage notes
      const indexedDBNotes = await getAllNotes();
      const mergedCustomerNotes = { ...customerNotes };
      
      indexedDBNotes.forEach(note => {
        if (note && note.customerId !== undefined && note.customerId !== null) {
          const customerId = String(note.customerId);
          
          // Initialize array if it doesn't exist
          if (!mergedCustomerNotes[customerId]) {
            mergedCustomerNotes[customerId] = [];
          }
          
          // Check if note with same ID already exists (from localStorage)
          const existingIndex = mergedCustomerNotes[customerId].findIndex(n => n.id === note.id);
          
          if (existingIndex >= 0) {
            // Merge: prefer the note with more data (longer SVG or more recent)
            const existing = mergedCustomerNotes[customerId][existingIndex];
            const existingSvgSize = (existing.svg || '').length;
            const indexedDBSvgSize = (note.svg || '').length;
            
            // If IndexedDB version has more data, replace it
            if (indexedDBSvgSize > existingSvgSize) {
              mergedCustomerNotes[customerId][existingIndex] = note;
            } else {
              // Otherwise keep existing but ensure it has customerId
              if (!existing.customerId) {
                existing.customerId = note.customerId;
              }
            }
          } else {
            // Add new note, ensure it has customerId
            const noteToAdd = { ...note };
            if (!noteToAdd.customerId) {
              noteToAdd.customerId = note.customerId;
            }
            mergedCustomerNotes[customerId].push(noteToAdd);
          }
        }
      });
      
      // Also ensure all localStorage notes have customerId field
      for (const customerId in mergedCustomerNotes) {
        if (mergedCustomerNotes[customerId]) {
          mergedCustomerNotes[customerId].forEach(note => {
            if (!note.customerId) {
              note.customerId = parseInt(customerId);
            }
          });
        }
      }
      
      const totalNotesCount = Object.values(mergedCustomerNotes).reduce((sum, notes) => sum + (notes?.length || 0), 0);
      if (progressCallback) progressCallback(`Merged ${indexedDBNotes.length} IndexedDB notes: ${totalNotesCount} total notes for ${Object.keys(mergedCustomerNotes).length} customers`, 25);
      
      // Get image count first
      const images = await getAllImages();
      if (progressCallback) progressCallback(`Found ${images.length} images, processing...`, 30);
      
      // Create streaming JSON writer
      const jsonParts = [];
      
      // Start JSON structure
      jsonParts.push('{\n');
      jsonParts.push('  "__meta": {\n');
      jsonParts.push('    "app": "chikas-db",\n');
      jsonParts.push('    "version": 3,\n');
      jsonParts.push(`    "exportedAt": "${new Date().toISOString()}"\n`);
      jsonParts.push('  },\n');
      
      // Add customers
      jsonParts.push('  "customers": ');
      jsonParts.push(JSON.stringify(customers, null, 2));
      jsonParts.push(',\n');
      
      // Add appointments
      jsonParts.push('  "appointments": ');
      jsonParts.push(JSON.stringify(appointments, null, 2));
      jsonParts.push(',\n');
      
      // Add customer notes (merged from both localStorage and IndexedDB)
      jsonParts.push('  "customerNotes": ');
      jsonParts.push(JSON.stringify(mergedCustomerNotes, null, 2));
      jsonParts.push(',\n');
      
      // Process images in very small chunks and add to JSON directly
      jsonParts.push('  "images": [\n');
      
      const chunkSize = 2; // Even smaller chunks - process 2 images at a time
      const totalChunks = Math.ceil(images.length / chunkSize);
      let isFirstImage = true;
      let processedCount = 0;
      
      for (let i = 0; i < images.length; i += chunkSize) {
        const chunk = images.slice(i, i + chunkSize);
        const chunkNumber = Math.floor(i / chunkSize) + 1;
        
        if (progressCallback) {
          progressCallback(`Processing images ${chunkNumber}/${totalChunks} (${processedCount}/${images.length})`, 30 + (chunkNumber / totalChunks) * 60);
        }
        
        for (const img of chunk) {
          try {
            if (!isFirstImage) {
              jsonParts.push(',\n');
            }
            
            // Process image data one at a time
            const imageData = {
              id: img.id,
              customerId: img.customerId,
              name: img.name,
              type: img.type,
              createdAt: img.createdAt,
              dataUrl: img.dataUrl,
            };
            
            jsonParts.push('    ');
            jsonParts.push(JSON.stringify(imageData, null, 4));
            isFirstImage = false;
            processedCount++;
            
            // Clear the image data immediately
            img.dataUrl = null;
            
          } catch (error) {
            // Continue with other images
          }
        }
        
        // Clear the chunk from memory
        chunk.length = 0;
        
        // Aggressive memory cleanup
        // Note: global.gc is not available in browser environment
        
        // Longer delay for iPad memory management
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Close images array and JSON
      jsonParts.push('\n  ]\n');
      jsonParts.push('}');
      
      if (progressCallback) progressCallback('Creating backup file...', 95);
      
      // Create blob from parts (this should use less memory)
      const jsonString = jsonParts.join('');
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Clear the parts array to free memory
      jsonParts.length = 0;
      
      if (progressCallback) progressCallback('Backup complete!', 100);
      
      return {
        blob: blob,
        customers: customers,
        appointments: appointments,
        imageCount: processedCount
      };
      
    } catch (error) {
      if (progressCallback) progressCallback(`Backup failed: ${error.message}`, 0);
      throw error;
    }
  }

  // Expose API
  window.ChikasDB = {
    createCustomer,
    updateCustomer,
    getCustomerById,
    getAllCustomers,
    getRecentCustomers, // NEW
    getAllAppointments,
    searchCustomers,
    addImages,
    addImage,
    getImagesByCustomerId,
    deleteImage,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deleteCustomer,
    getAppointmentsBetween,
    getAppointmentsForDate, // NEW
    getFutureAppointmentsForCustomer, // NEW
    getAppointmentsForCustomer,
    getAppointmentById,
    fileListToEntries,
    exportAllData,
    safeExportAllData, // NEW - safer backup function
    exportDataWithoutImages, // NEW - lightweight backup (no images)
    importAllData,
    clearAllStores,
    // Notes functions for localStorage fallback
    createNote,
    getNotesByCustomerId,
    updateNote,
    deleteNote,
    getAllNotes,
    // Recovery functions
    scanForCorruptedNotes,
    recoverCorruptedNotes,
    restoreNotesFromBackup,
    // Version history functions
    getNotePreviousVersion,
    restoreNoteToPreviousVersion,
  };
})();


