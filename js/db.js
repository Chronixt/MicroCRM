/* IndexedDB wrapper for Chikas DB */
(function () {
  const DB_NAME = 'chikas-db';
  const DB_VERSION = 1;

  /** @type {IDBDatabase | null} */
  let database = null;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (database) return resolve(database);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = /** @type {IDBDatabase} */ (request.result);
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
          customerStore.createIndex('lastName', 'lastName', { unique: false });
          customerStore.createIndex('firstName', 'firstName', { unique: false });
          customerStore.createIndex('contactNumber', 'contactNumber', { unique: false });
        }
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
          appointmentStore.createIndex('customerId', 'customerId', { unique: false });
          appointmentStore.createIndex('start', 'start', { unique: false });
        }
        if (!db.objectStoreNames.contains('images')) {
          const imagesStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
          imagesStore.createIndex('customerId', 'customerId', { unique: false });
        }
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

  // Images
  function addImages(customerId, fileEntries) {
    return runTransaction(['images'], 'readwrite', (images) => (
      Promise.all(fileEntries.map((entry) => new Promise((resolve, reject) => {
        const toStore = {
          customerId,
          name: entry.name,
          type: entry.type,
          blob: entry.blob,
          createdAt: new Date().toISOString(),
        };
        const req = images.add(toStore);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })))
    ));
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
          if (cursor) { results.push(cursor.value); cursor.continue(); }
          else resolve(results);
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
    // For simplicity, load all and filter
    return runTransaction(['appointments'], 'readonly', (appointments) => (
      new Promise((resolve, reject) => {
        const items = [];
        const req = appointments.openCursor();
        req.onsuccess = (e) => {
          const cursor = /** @type {IDBCursorWithValue|null} */ (e.target.result);
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            const filtered = items.filter((a) => (!startISO || a.start >= startISO) && (!endISO || a.start <= endISO));
            resolve(filtered);
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
    const [customers, appointments, images] = await Promise.all([
      getAllCustomers(),
      getAllAppointments(),
      getAllImages(),
    ]);
    const imagesSerialized = await Promise.all(images.map(async (img) => ({
      id: img.id,
      customerId: img.customerId,
      name: img.name,
      type: img.type,
      createdAt: img.createdAt,
      dataUrl: await blobToDataURL(img.blob),
    })));
    return {
      __meta: {
        app: 'chikas-db',
        version: 1,
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
      await runTransaction(['images'], 'readwrite', (imagesStore) => {
        images.forEach((img) => {
          const blob = dataURLToBlob(img.dataUrl, img.type);
          imagesStore.put({ id: img.id, customerId: img.customerId, name: img.name, type: img.type, blob, createdAt: img.createdAt });
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
      const mimeMatch = /data:([^;]+);base64/.exec(meta);
      const mime = mimeMatch ? mimeMatch[1] : (fallbackType || 'application/octet-stream');
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      return new Blob([], { type: fallbackType || 'application/octet-stream' });
    }
  }

  // Expose API
  window.ChikasDB = {
    createCustomer,
    updateCustomer,
    getCustomerById,
    getAllCustomers,
    getAllAppointments,
    searchCustomers,
    addImages,
    getImagesByCustomerId,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deleteCustomer,
    getAppointmentsBetween,
    getAppointmentsForCustomer,
    getAppointmentById,
    fileListToEntries,
    exportAllData,
    importAllData,
    clearAllStores,
  };
})();


