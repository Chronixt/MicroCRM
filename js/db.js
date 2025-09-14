/* IndexedDB wrapper for Chikas DB */
(function () {
  const DB_NAME = 'chikas-db';
  const DB_VERSION = 3;

  /** @type {IDBDatabase | null} */
  let database = null;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (database) return resolve(database);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = /** @type {IDBDatabase} */ (request.result);
        const oldVersion = event.oldVersion;
        
        // For version 3, we'll recreate the database structure with all indexes
        // This ensures a clean upgrade from any previous version
        
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
      };

      request.onsuccess = () => {
        database = request.result;
        resolve(database);
      };
      request.onerror = () => reject(request.error);
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
          console.error('Error adding image:', error);
          reject(error);
        }
      })))
    ));
  }
  
  // Image compression function for iPad memory optimization
  async function compressImage(blob, type) {
    return new Promise((resolve) => {
      // Check if image is already small enough
      if (blob.size <= 500 * 1024) { // 500KB limit
        resolve(blob);
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
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
            console.log(`Image compressed: ${(blob.size / 1024).toFixed(1)}KB -> ${(compressedBlob.size / 1024).toFixed(1)}KB`);
            resolve(compressedBlob);
          } else {
            resolve(blob); // Use original if compression didn't help
          }
        }, type || 'image/jpeg', 0.8); // 80% quality
      };
      
      img.onerror = () => resolve(blob); // Fallback to original
      img.src = URL.createObjectURL(blob);
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
                  console.log(`Successfully converted image ${imageData.id}: ${(blob.size / 1024).toFixed(1)}KB`);
                } else {
                  console.error(`Failed to convert image ${imageData.id}: empty or invalid blob`);
                }
              } catch (error) {
                console.error(`Error converting image ${imageData.id}:`, error);
              }
            } else {
              console.error(`Image ${imageData.id} has no dataUrl`);
            }
            cursor.continue(); 
          } else {
            console.log(`Loaded ${results.length} images for customer ${customerId}`);
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
    console.log('Starting data export...');
    
    // Export customers first (usually small)
    const customers = await getAllCustomers();
    console.log(`Exported ${customers.length} customers`);
    
    // Export appointments (usually small)
    const appointments = await getAllAppointments();
    console.log(`Exported ${appointments.length} appointments`);
    
    // Export images in chunks to avoid memory issues
    const images = await getAllImages();
    console.log(`Found ${images.length} images, processing in chunks...`);
    
    const imagesSerialized = [];
    const chunkSize = 10; // Process 10 images at a time
    
    for (let i = 0; i < images.length; i += chunkSize) {
      const chunk = images.slice(i, i + chunkSize);
      console.log(`Processing image chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(images.length/chunkSize)}`);
      
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
          console.error(`Error processing image ${img.id}:`, error);
          return null;
        }
      }));
      
      // Filter out null results and add to main array
      imagesSerialized.push(...chunkProcessed.filter(img => img !== null));
      
      // Small delay to prevent memory pressure
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Successfully processed ${imagesSerialized.length} images`);
    
    return {
      __meta: {
        app: 'chikas-db',
        version: 3,
        exportedAt: new Date().toISOString(),
      },
      customers,
      appointments,
      images: imagesSerialized,
    };
  }

  function clearAllStores() {
    return runTransaction(['customers', 'appointments', 'images'], 'readwrite', (customers, appointments, images) => (
      Promise.all([
        new Promise((resolve, reject) => { const r = customers.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
        new Promise((resolve, reject) => { const r = appointments.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
        new Promise((resolve, reject) => { const r = images.clear(); r.onsuccess = () => resolve(null); r.onerror = () => reject(r.error); }),
      ])
    ));
  }

  function importAllData(payload, options = { mode: 'replace' }) {
    const mode = options.mode || 'replace';
    const { customers = [], appointments = [], images = [], __meta = {} } = payload || {};
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
      // Images need dataUrl -> blob
      console.log(`Importing ${images.length} images...`);
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
            console.error(`Error processing image ${index + 1}: ${img.name}`, error);
            errorCount++;
          }
        });
      });
      
      console.log(`Image import complete: ${successCount} successful, ${errorCount} failed`);
    };
    return perform();
  }

  function dataURLToBlob(dataUrl, fallbackType) {
    try {
      const parts = String(dataUrl || '').split(',');
      const meta = parts[0] || '';
      const base64 = parts[1] || '';
      
      if (!base64) {
        console.warn('Empty base64 data in dataURL');
        return new Blob([], { type: fallbackType || 'application/octet-stream' });
      }
      
      const mimeMatch = /data:([^;]+);base64/.exec(meta);
      const mime = mimeMatch ? mimeMatch[1] : (fallbackType || 'application/octet-stream');
      
      // Check if base64 is too large (iPad memory limit)
      if (base64.length > 50 * 1024 * 1024) { // 50MB limit
        console.warn('Base64 data too large for iPad, skipping image');
        return new Blob([], { type: mime });
      }
      
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      console.error('Error converting dataURL to blob:', e);
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
      console.warn('Failed to store image reference in localStorage:', error);
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
      console.warn('Failed to get images from localStorage:', error);
      return [];
    }
  }

  function clearImageFromLocalStorage(imageId) {
    try {
      localStorage.removeItem(`chikas_image_${imageId}`);
    } catch (error) {
      console.warn('Failed to clear image from localStorage:', error);
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
            console.error(`Error processing image ${img.id}:`, error);
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
      console.error('Backup failed:', error);
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
    importAllData,
    clearAllStores,
  };
})();


