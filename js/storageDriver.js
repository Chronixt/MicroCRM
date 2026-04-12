/**
 * StorageDriver Abstraction Layer
 * 
 * This module provides an abstraction layer for storage operations,
 * allowing the app to seamlessly switch between IndexedDB (web/PWA)
 * and SQLite (native mobile apps via Capacitor).
 * 
 * Includes IndexedDbDriver today, with SQLite/native capability checks
 * for staged Capacitor rollout.
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
  // NATIVE RUNTIME HELPERS (Capacitor plugin detection)
  // ============================================================================

  const NativeRuntime = {
    getCapacitor() {
      return window.Capacitor || null;
    },

    getPlatform() {
      const cap = this.getCapacitor();
      if (!cap) return 'web';
      if (typeof cap.getPlatform === 'function') {
        try {
          return cap.getPlatform() || 'web';
        } catch (error) {
          return 'web';
        }
      }
      return 'web';
    },

    isNativePlatform() {
      const cap = this.getCapacitor();
      if (!cap) return false;
      if (typeof cap.isNativePlatform === 'function') {
        try {
          return !!cap.isNativePlatform();
        } catch (error) {
          // Fall through to platform-based check below.
        }
      }
      return this.getPlatform() !== 'web';
    },

    findPlugin(possibleNames) {
      const cap = this.getCapacitor();
      const plugins = cap?.Plugins || {};
      const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const plugin = plugins[name] || window[name] || null;
        if (plugin) return { name, plugin };
      }

      return { name: null, plugin: null };
    }
  };

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
    plugin: null,
    dbName: null,
    dbVersion: null,
    connected: false,
    
    async init(config) {
      this.dbName = config.dbName || 'tradie-crm-db';
      this.dbVersion = Number(config.dbVersion || 1);
      const pluginInfo = this.getPluginInfo();
      this.plugin = pluginInfo.plugin || null;
      if (!this.plugin) {
        throw new Error('SQLite plugin unavailable. Ensure Capacitor SQLite is installed and synced.');
      }

      await this.openConnection();
      await this.ensureSchema();
      console.log(`SQLiteDriver initialized: ${this.dbName} v${this.dbVersion}`);
    },
    
    isAvailable() {
      // Supports common community plugin globals during staged rollout.
      const pluginInfo = NativeRuntime.findPlugin(['CapacitorSQLite', 'SQLite', 'Sqlite']);
      return NativeRuntime.isNativePlatform() && !!pluginInfo.plugin;
    },

    getPluginInfo() {
      return NativeRuntime.findPlugin(['CapacitorSQLite', 'SQLite', 'Sqlite']);
    },

    async openConnection() {
      if (!this.plugin) throw new Error('SQLite plugin not initialized');

      // Pattern A: plugin returns a db object with .open/.run/.query methods.
      if (typeof this.plugin.createConnection === 'function') {
        let connection = null;
        try {
          connection = await this.plugin.createConnection({
            database: this.dbName,
            version: this.dbVersion,
            encrypted: false,
            mode: 'no-encryption',
            readonly: false
          });
        } catch (error) {
          try {
            connection = await this.plugin.createConnection(this.dbName, false, 'no-encryption', this.dbVersion, false);
          } catch (error2) {
            connection = null;
          }
        }

        if (connection) {
          this.db = connection;
          if (typeof this.db.open === 'function') {
            await this.db.open();
          }
          this.connected = true;
          return;
        }
      }

      // Pattern B: plugin manages named DB connections directly.
      if (typeof this.plugin.open === 'function') {
        try {
          await this.plugin.open({ database: this.dbName, readonly: false });
        } catch (error) {
          await this.plugin.open({ database: this.dbName });
        }
        this.db = this.plugin;
        this.connected = true;
        return;
      }

      throw new Error('Unsupported SQLite plugin interface detected');
    },

    async ensureSchema() {
      await this.executeStatements([
        `CREATE TABLE IF NOT EXISTS crm_records (
          store_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
          PRIMARY KEY (store_name, record_id)
        );`,
        `CREATE TABLE IF NOT EXISTS crm_counters (
          store_name TEXT PRIMARY KEY,
          next_id INTEGER NOT NULL
        );`,
        'CREATE INDEX IF NOT EXISTS idx_crm_records_store ON crm_records(store_name);',
        'CREATE INDEX IF NOT EXISTS idx_crm_records_updated ON crm_records(updated_at);'
      ]);
    },

    async executeStatements(statements) {
      for (let i = 0; i < statements.length; i++) {
        await this.runSql(statements[i], []);
      }
    },

    async runSql(statement, values) {
      const params = Array.isArray(values) ? values : [];
      if (!this.db) throw new Error('SQLite database not open');

      // DB object API
      if (typeof this.db.run === 'function') {
        try {
          return await this.db.run(statement, params);
        } catch (error) {
          try {
            return await this.db.run({ statement, values: params });
          } catch (error2) {
            // Fall through to plugin-style calls below.
          }
        }
      }

      // Plugin API
      if (typeof this.plugin?.run === 'function') {
        try {
          return await this.plugin.run({ database: this.dbName, statement, values: params });
        } catch (error) {
          return await this.plugin.run({ statement, values: params });
        }
      }

      // Execute fallback for statements without values
      if (params.length === 0 && typeof this.db.execute === 'function') {
        return this.db.execute(statement);
      }

      throw new Error('No compatible run method available on SQLite plugin');
    },

    async querySql(statement, values) {
      const params = Array.isArray(values) ? values : [];
      if (!this.db) throw new Error('SQLite database not open');

      // DB object API
      if (typeof this.db.query === 'function') {
        try {
          return await this.db.query(statement, params);
        } catch (error) {
          try {
            return await this.db.query({ statement, values: params });
          } catch (error2) {
            // Fall through to plugin-style calls below.
          }
        }
      }

      // Plugin API
      if (typeof this.plugin?.query === 'function') {
        try {
          return await this.plugin.query({ database: this.dbName, statement, values: params });
        } catch (error) {
          return await this.plugin.query({ statement, values: params });
        }
      }

      throw new Error('No compatible query method available on SQLite plugin');
    },

    extractRows(queryResult) {
      if (!queryResult) return [];
      if (Array.isArray(queryResult)) return queryResult;
      if (Array.isArray(queryResult.values)) return queryResult.values;
      if (queryResult.rows && Array.isArray(queryResult.rows.values)) return queryResult.rows.values;
      if (queryResult.rows && Array.isArray(queryResult.rows)) return queryResult.rows;
      return [];
    },

    parsePayload(row) {
      if (!row) return null;
      const payload = row.payload || row.PAYLOAD || null;
      if (typeof payload !== 'string') return null;
      try {
        return JSON.parse(payload);
      } catch (error) {
        return null;
      }
    },

    normalizeId(inputId) {
      const parsed = parseInt(inputId, 10);
      return Number.isFinite(parsed) ? parsed : null;
    },

    async nextId(storeName) {
      const rowsResult = await this.querySql(
        'SELECT next_id FROM crm_counters WHERE store_name = ? LIMIT 1;',
        [storeName]
      );
      const rows = this.extractRows(rowsResult);
      if (rows.length === 0) {
        await this.runSql(
          'INSERT INTO crm_counters (store_name, next_id) VALUES (?, ?);',
          [storeName, 2]
        );
        return 1;
      }

      const current = parseInt(rows[0].next_id, 10);
      const id = Number.isFinite(current) ? current : 1;
      await this.runSql(
        'UPDATE crm_counters SET next_id = ? WHERE store_name = ?;',
        [id + 1, storeName]
      );
      return id;
    },

    async getAll(storeName) {
      const result = await this.querySql(
        'SELECT payload FROM crm_records WHERE store_name = ? ORDER BY record_id ASC;',
        [storeName]
      );
      const rows = this.extractRows(result);
      return rows.map((row) => this.parsePayload(row)).filter(Boolean);
    },

    async getById(storeName, id) {
      const recordId = this.normalizeId(id);
      if (recordId == null) return null;
      const result = await this.querySql(
        'SELECT payload FROM crm_records WHERE store_name = ? AND record_id = ? LIMIT 1;',
        [storeName, recordId]
      );
      const rows = this.extractRows(result);
      if (rows.length === 0) return null;
      return this.parsePayload(rows[0]);
    },

    async getByIndex(storeName, indexName, value) {
      // Generic fallback: query store then filter in JS to keep schema simple.
      const all = await this.getAll(storeName);
      return all.filter((item) => item && item[indexName] === value);
    },

    async create(storeName, data) {
      const nowIso = new Date().toISOString();
      const item = data && typeof data === 'object' ? { ...data } : {};

      let recordId = this.normalizeId(item.id);
      if (recordId == null) {
        recordId = await this.nextId(storeName);
      }
      item.id = recordId;

      if (item.createdAt == null) item.createdAt = nowIso;
      item.updatedAt = nowIso;

      await this.runSql(
        `INSERT OR REPLACE INTO crm_records
         (store_name, record_id, payload, created_at, updated_at)
         VALUES (?, ?, ?, strftime('%s','now'), strftime('%s','now'));`,
        [storeName, recordId, JSON.stringify(item)]
      );
      return recordId;
    },

    async update(storeName, data) {
      const item = data && typeof data === 'object' ? { ...data } : null;
      if (!item) throw new Error('SQLite update requires a data object');
      const recordId = this.normalizeId(item.id);
      if (recordId == null) throw new Error('SQLite update requires an id');

      const existing = await this.getById(storeName, recordId);
      const nowIso = new Date().toISOString();
      const merged = {
        ...(existing || {}),
        ...item,
        id: recordId,
        createdAt: item.createdAt || existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      await this.runSql(
        `INSERT OR REPLACE INTO crm_records
         (store_name, record_id, payload, created_at, updated_at)
         VALUES (?, ?, ?, strftime('%s','now'), strftime('%s','now'));`,
        [storeName, recordId, JSON.stringify(merged)]
      );
      return recordId;
    },

    async delete(storeName, id) {
      const recordId = this.normalizeId(id);
      if (recordId == null) return;
      await this.runSql(
        'DELETE FROM crm_records WHERE store_name = ? AND record_id = ?;',
        [storeName, recordId]
      );
    },

    async clear(storeName) {
      await this.runSql('DELETE FROM crm_records WHERE store_name = ?;', [storeName]);
      await this.runSql('DELETE FROM crm_counters WHERE store_name = ?;', [storeName]);
    },

    async transaction(storeNames, mode, callback) {
      // mode is kept for API parity; SQLite uses explicit BEGIN/COMMIT here.
      await this.runSql('BEGIN TRANSACTION;', []);
      const list = Array.isArray(storeNames) ? storeNames : [storeNames];
      const stores = list.map((name) => ({
        getAll: () => this.getAll(name),
        getById: (id) => this.getById(name, id),
        getByIndex: (indexName, value) => this.getByIndex(name, indexName, value),
        create: (data) => this.create(name, data),
        update: (data) => this.update(name, data),
        delete: (id) => this.delete(name, id),
        clear: () => this.clear(name)
      }));

      try {
        const result = await callback(...stores);
        await this.runSql('COMMIT;', []);
        return result;
      } catch (error) {
        try {
          await this.runSql('ROLLBACK;', []);
        } catch (rollbackError) {
          // Keep original failure.
        }
        throw error;
      }
    },

    getDatabase() {
      return this.db;
    }
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
    },

    getNativeReadiness() {
      const sqliteInfo = SQLiteDriver.getPluginInfo();
      const fsInfo = NativeRuntime.findPlugin(['Filesystem']);
      return {
        platform: NativeRuntime.getPlatform(),
        isNative: NativeRuntime.isNativePlatform(),
        sqlite: {
          available: !!sqliteInfo.plugin,
          pluginName: sqliteInfo.name || 'missing'
        },
        filesystem: {
          available: !!fsInfo.plugin,
          pluginName: fsInfo.name || 'missing'
        }
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

        const fsInfo = NativeRuntime.findPlugin(['Filesystem']);
        this.filesystem = fsInfo.plugin || null;
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
      return NativeRuntime.isNativePlatform();
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
