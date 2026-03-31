/**
 * StorageDriver Abstraction Layer
 * 
 * This module provides an abstraction layer for storage operations,
 * allowing the app to seamlessly switch between IndexedDB (web/PWA)
 * and SQLite (native mobile apps via Capacitor).
 * 
 * Currently implements IndexedDbDriver. SQLiteDriver will be added
 * when Capacitor integration is implemented.
 */

(function() {
  'use strict';

  // ============================================================================
  // STORAGE DRIVER INTERFACE
  // ============================================================================
  
  /**
   * StorageDriver Interface
   * All storage drivers must implement these methods:
   * 
   * - init(): Promise<void>
   * - getAll(storeName): Promise<array>
   * - getById(storeName, id): Promise<object|null>
   * - getByIndex(storeName, indexName, value): Promise<array>
   * - create(storeName, data): Promise<id>
   * - update(storeName, data): Promise<void>
   * - delete(storeName, id): Promise<void>
   * - clear(storeName): Promise<void>
   * - transaction(storeNames, mode, callback): Promise<any>
   */

  // ============================================================================
  // INDEXED DB DRIVER (Current Implementation)
  // ============================================================================

  const IndexedDbDriver = {
    name: 'IndexedDB',
    db: null,
    dbName: null,
    dbVersion: null,
    
    async init(config) {
      this.dbName = config.dbName;
      this.dbVersion = config.dbVersion;
      
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          this.db = request.result;
          console.log(`IndexedDbDriver initialized: ${this.dbName} v${this.dbVersion}`);
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          // Delegate to the upgrade handler passed in config
          if (config.onUpgrade) {
            config.onUpgrade(event);
          }
        };
      });
    },
    
    async getAll(storeName) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const items = [];
        
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      });
    },
    
    async getById(storeName, id) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(parseInt(id));
        
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    },
    
    async getByIndex(storeName, indexName, value) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const items = [];
        
        const req = index.openCursor(IDBKeyRange.only(value));
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            items.push(cursor.value);
            cursor.continue();
          } else {
            resolve(items);
          }
        };
        req.onerror = () => reject(req.error);
      });
    },
    
    async create(storeName, data) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.add(data);
        
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    
    async update(storeName, data) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(data);
        
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    
    async delete(storeName, id) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(parseInt(id));
        
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    
    async clear(storeName) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    },
    
    async transaction(storeNames, mode, callback) {
      return new Promise((resolve, reject) => {
        const tx = this.db.transaction(storeNames, mode);
        const stores = storeNames.map(name => tx.objectStore(name));
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(new Error('Transaction aborted'));
        
        callback(...stores);
      });
    },
    
    isAvailable() {
      return typeof indexedDB !== 'undefined';
    },
    
    getDatabase() {
      return this.db;
    }
  };

  // ============================================================================
  // SQLITE DRIVER (Placeholder for Capacitor SQLite)
  // ============================================================================

  const SQLiteDriver = {
    name: 'SQLite',
    db: null,
    
    async init(config) {
      // This will be implemented when Capacitor is integrated
      // Will use @capacitor-community/sqlite
      throw new Error('SQLiteDriver not yet implemented. Use IndexedDbDriver for web/PWA.');
    },
    
    isAvailable() {
      // Check if running in Capacitor with SQLite plugin available
      return typeof window.Capacitor !== 'undefined' && 
             window.Capacitor.Plugins && 
             window.Capacitor.Plugins.CapacitorSQLite;
    }
    
    // Other methods will mirror IndexedDbDriver interface
  };

  // ============================================================================
  // DB API ADAPTER DRIVER (safe bridge for existing runtime APIs)
  // ============================================================================

  const DbApiAdapterDriver = {
    name: 'DB API Adapter',
    dbApi: null,
    backend: 'unknown',

    async init(config = {}) {
      this.dbApi = config.dbApi || window.CrmDB || null;
      this.backend = config.backend || 'unknown';
      if (!this.dbApi) {
        throw new Error('DB API adapter could not find an initialized database API');
      }
    },

    isAvailable() {
      return !!window.CrmDB;
    },

    getDatabase() {
      return this.dbApi;
    }
  };

  // ============================================================================
  // DRIVER FACTORY
  // ============================================================================

  const StorageDriverFactory = {
    currentDriver: null,
    
    async initialize(config = {}) {
      // Prefer adapter mode when an existing DB API is supplied
      if (config.dbApi) {
        await DbApiAdapterDriver.init(config);
        this.currentDriver = DbApiAdapterDriver;
        return this.currentDriver;
      }

      // Determine which driver to use based on environment
      let driver;
      
      if (config.forceDriver) {
        driver = config.forceDriver === 'sqlite' ? SQLiteDriver : IndexedDbDriver;
      } else if (SQLiteDriver.isAvailable()) {
        driver = SQLiteDriver;
      } else if (IndexedDbDriver.isAvailable()) {
        driver = IndexedDbDriver;
      } else {
        throw new Error('No compatible storage driver available');
      }
      
      console.log(`Initializing storage driver: ${driver.name}`);
      await driver.init(config);
      this.currentDriver = driver;
      
      return driver;
    },

    async initializeFromDbApi(dbApi, config = {}) {
      return this.initialize({ ...config, dbApi });
    },
    
    getDriver() {
      if (!this.currentDriver) {
        throw new Error('Storage driver not initialized. Call initialize() first.');
      }
      return this.currentDriver;
    },
    
    getDriverName() {
      return this.currentDriver ? this.currentDriver.name : 'Not initialized';
    },

    getStatus() {
      if (!this.currentDriver) {
        return { initialized: false, driver: 'Not initialized', backend: 'unknown' };
      }
      return {
        initialized: true,
        driver: this.currentDriver.name,
        backend: this.currentDriver.backend || 'unknown'
      };
    }
  };

  // ============================================================================
  // FILE SYSTEM ABSTRACTION (for photos in native apps)
  // ============================================================================

  const FileSystemDriver = {
    initialized: false,
    isNativeMode: false,
    filesystem: null,
    directory: null,

    async init() {
      try {
        this.isNativeMode = this.isNative();
        if (!this.isNativeMode) {
          this.initialized = true;
          return;
        }

        const plugins = window.Capacitor?.Plugins || {};
        this.filesystem = plugins.Filesystem || null;
        this.directory = this.filesystem?.Directory || { Data: 'DATA' };
        this.initialized = !!this.filesystem;
      } catch (error) {
        this.initialized = false;
      }
    },

    ensureInitialized() {
      if (!this.initialized) {
        // Lazy-init so existing flows do not need explicit boot ordering.
        return this.init();
      }
      return Promise.resolve();
    },

    sanitizeFilename(filename) {
      return String(filename || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    },

    guessMimeFromPath(path) {
      const lower = String(path || '').toLowerCase();
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      return 'image/jpeg';
    },
    
    async saveImage(blob, filename) {
      await this.ensureInitialized();

      // Web/PWA fallback: inline data URL (current behavior).
      if (!this.isNativeMode || !this.filesystem) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }

      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      const stamp = Date.now();
      const safeName = this.sanitizeFilename(filename);
      const path = `images/${stamp}-${safeName}`;

      await this.filesystem.writeFile({
        path,
        data: base64,
        directory: this.directory.Data || 'DATA',
        recursive: true
      });

      return path;
    },
    
    async loadImage(path) {
      await this.ensureInitialized();

      if (!path) return null;

      // Existing inline storage.
      if (String(path).startsWith('data:')) return path;

      // Web fallback when given a non-data path.
      if (!this.isNativeMode || !this.filesystem) return null;

      const result = await this.filesystem.readFile({
        path,
        directory: this.directory.Data || 'DATA'
      });
      const base64 = typeof result?.data === 'string' ? result.data : '';
      if (!base64) return null;
      const mime = this.guessMimeFromPath(path);
      return `data:${mime};base64,${base64}`;
    },
    
    async deleteImage(path) {
      await this.ensureInitialized();
      if (!path || String(path).startsWith('data:')) return true;
      if (!this.isNativeMode || !this.filesystem) return true;
      try {
        await this.filesystem.deleteFile({
          path,
          directory: this.directory.Data || 'DATA'
        });
      } catch (error) {
        // Ignore missing file errors; DB delete should still succeed.
      }
      return true;
    },
    
    isNative() {
      return typeof window.Capacitor !== 'undefined';
    }
  };

  // ============================================================================
  // EXPORTS
  // ============================================================================

  window.StorageDriverFactory = StorageDriverFactory;
  window.IndexedDbDriver = IndexedDbDriver;
  window.SQLiteDriver = SQLiteDriver;
  window.DbApiAdapterDriver = DbApiAdapterDriver;
  window.FileSystemDriver = FileSystemDriver;

})();
