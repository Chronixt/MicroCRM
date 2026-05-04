(function () {
  // Get product configuration
  const productConfig = window.ProductConfig || {};
  const STORAGE_PREFIX = productConfig.storagePrefix || 'chikas_';
  const APP_NAME = productConfig.appName || 'CRM';
  const BRAND_LOGO_LIGHT = productConfig.logoLight || '/assets/icon-192.png';
  const BRAND_LOGO_ALT = productConfig.logoAlt || `${APP_NAME} logo`;
  const LOCK_TITLE = productConfig.lockTitle || `${APP_NAME} Locked`;
  const APP_LOCK_SALT = productConfig.config?.appLockSalt || 'tradie_salt';
  const PRODUCT_THEME = productConfig.config?.theme || {};
  const NATIVE_DRIVER_MODE_KEY = `${STORAGE_PREFIX}native_driver_mode`;
  const SIDEBAR_COLLAPSED_KEY = `${STORAGE_PREFIX}sidebar_collapsed`;
  const SIDEBAR_TOP_OFFSET_KEY = `${STORAGE_PREFIX}sidebar_top_offset`;
  const RUNTIME_INFO = {
    email: null
  };
  
  console.log(`[App] Starting ${APP_NAME}`);

  function deriveBrandPair(hex) {
    const fallback = { brand: '#f59e0b', brand2: '#fbbf24' };
    if (!hex || typeof hex !== 'string') return fallback;
    var m = hex.trim().match(/^#?([a-fA-F0-9]{6})$/);
    if (!m) return { brand: hex, brand2: hex };
    var raw = m[1];
    var r = parseInt(raw.slice(0, 2), 16);
    var g = parseInt(raw.slice(2, 4), 16);
    var b = parseInt(raw.slice(4, 6), 16);
    var lighten = function (v) { return Math.max(0, Math.min(255, v + 28)); };
    var toHex = function (v) { return v.toString(16).padStart(2, '0'); };
    return {
      brand: '#' + raw,
      brand2: '#' + toHex(lighten(r)) + toHex(lighten(g)) + toHex(lighten(b))
    };
  }

  function applyProductTheme() {
    var root = document.documentElement;
    var body = document.body;
    var pair = deriveBrandPair(productConfig.themeColor || '#f59e0b');
    root.style.setProperty('--brand', pair.brand);
    root.style.setProperty('--brand-2', pair.brand2);
    var backgroundImage = PRODUCT_THEME.backgroundImage || 'assets/tradie-bg.png';
    root.style.setProperty('--app-bg-image', 'url("' + backgroundImage + '")');
    root.style.setProperty('--app-haze-1', PRODUCT_THEME.haze1 || 'rgba(255,255,255,0.06)');
    root.style.setProperty('--app-haze-top', PRODUCT_THEME.hazeTop || 'rgba(2,6,23,0.45)');
    root.style.setProperty('--app-haze-bottom', PRODUCT_THEME.hazeBottom || 'rgba(2,6,23,0.85)');
    if (body) body.setAttribute('data-product', productConfig.activeProduct || 'core');
  }

  function applyProductMetadata() {
    var appName = productConfig.appName || APP_NAME || 'CRM';
    var themeColor = productConfig.themeColor || '#0f172a';
    document.title = appName;

    var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', appName);
    var appNameMeta = document.querySelector('meta[name="application-name"]');
    if (appNameMeta) appNameMeta.setAttribute('content', appName);
    var themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', themeColor);
    var tileMeta = document.querySelector('meta[name="msapplication-TileColor"]');
    if (tileMeta) tileMeta.setAttribute('content', themeColor);
  }

  function getNativeDriverMode() {
    const mode = localStorage.getItem(NATIVE_DRIVER_MODE_KEY) || 'adapter';
    return mode === 'sqlite_test' ? 'sqlite_test' : 'adapter';
  }

  function setNativeDriverMode(mode) {
    const next = mode === 'sqlite_test' ? 'sqlite_test' : 'adapter';
    localStorage.setItem(NATIVE_DRIVER_MODE_KEY, next);
    return next;
  }

  function isSidebarCollapsed() {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === null) return window.matchMedia('(max-width: 480px)').matches;
    return stored === 'true';
  }

  function setSidebarCollapsed(collapsed) {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false');
    return collapsed;
  }

  function useSidebarMenuOnPortraitMobile() {
    return window.matchMedia('(max-width: 768px) and (orientation: portrait)').matches;
  }

  function getCachedSidebarTopOffset() {
    const raw = localStorage.getItem(SIDEBAR_TOP_OFFSET_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.round(parsed);
  }

  function setCachedSidebarTopOffset(px) {
    if (!Number.isFinite(px) || px < 0) return;
    localStorage.setItem(SIDEBAR_TOP_OFFSET_KEY, String(Math.round(px)));
  }

  function sidebarToggleIconSvg(collapsed) {
    // Collapsed: hamburger + right chevron (open).
    // Expanded: left chevron + hamburger (close).
    if (collapsed) {
      return `
        <svg viewBox="0 0 28 16" width="18" height="18" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="4" x2="14" y2="4"></line>
            <line x1="4" y1="8" x2="14" y2="8"></line>
            <line x1="4" y1="12" x2="14" y2="12"></line>
            <polyline points="18,4 24,8 18,12"></polyline>
          </g>
        </svg>
      `;
    }
    return `
      <svg viewBox="0 0 28 16" width="18" height="18" aria-hidden="true" focusable="false">
        <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="10,4 4,8 10,12"></polyline>
          <line x1="14" y1="4" x2="24" y2="4"></line>
          <line x1="14" y1="8" x2="24" y2="8"></line>
          <line x1="14" y1="12" x2="24" y2="12"></line>
        </g>
      </svg>
    `;
  }

  async function initializeStorageDriverLayer() {
    if (window.FileSystemDriver && typeof window.FileSystemDriver.init === 'function') {
      try {
        await window.FileSystemDriver.init();
      } catch (error) {
        console.warn('[Storage] FileSystemDriver init skipped:', error.message || error);
      }
    }

    if (!window.StorageDriverFactory || typeof window.StorageDriverFactory.initializeFromDbApi !== 'function') {
      return;
    }
    const dbApi = window.CrmDB;
    if (!dbApi) return;
    try {
      const readiness = window.StorageDriverFactory.getNativeReadiness?.();
      const backend = productConfig.useSupabase
        ? (readiness?.isNative ? 'supabase-native' : 'supabase')
        : (readiness?.isNative ? 'indexeddb-native' : 'indexeddb');
      await window.StorageDriverFactory.initializeFromDbApi(dbApi, { backend });
      const status = window.StorageDriverFactory.getStatus?.();
      if (status?.initialized) {
        console.log(`[Storage] Driver active: ${status.driver} (${status.backend})`);
      }
    } catch (error) {
      console.warn('[Storage] Driver initialization skipped:', error.message || error);
    }
  }

  function getDataApi() {
    try {
      const driver = window.StorageDriverFactory?.getDriver?.();
      const api = driver?.getDatabase?.();
      if (api) return api;
    } catch (error) {
      // Fall through to legacy globals
    }
    return window.CrmDB || null;
  }

  function requireDataApi() {
    const api = getDataApi();
    if (!api) throw new Error('Data API unavailable');
    return api;
  }

  async function ensureSupabaseAuthSession() {
    if (!productConfig.useSupabase || !window.REQUIRE_LOGIN) return true;

    let api;
    try {
      api = requireDataApi();
    } catch (e) {
      return false;
    }

    if (typeof api.getSession !== 'function' || typeof api.signInWithPassword !== 'function') {
      return true;
    }

    try {
      const existing = await api.getSession();
      if (existing) {
        RUNTIME_INFO.email = existing?.user?.email || null;
        return true;
      }
    } catch (e) {}

    for (let attempt = 1; attempt <= 3; attempt++) {
      const email = window.prompt('Sign in required for Supabase.\nEmail:');
      if (!email) return false;
      const password = window.prompt('Password:');
      if (password === null) return false;
      try {
        const session = await api.signInWithPassword(email.trim(), password);
        if (session) {
          RUNTIME_INFO.email = session?.user?.email || email.trim();
          return true;
        }
      } catch (e) {
        alert(`Login failed: ${e.message || e}`);
      }
    }

    alert('Unable to sign in. Please reload and try again.');
    return false;
  }

  async function refreshRuntimeUserInfo() {
    RUNTIME_INFO.email = null;
    if (!productConfig.useSupabase) return;
    let api;
    try {
      api = requireDataApi();
    } catch (e) {
      return;
    }
    if (typeof api.getSession !== 'function') return;
    try {
      const session = await api.getSession();
      RUNTIME_INFO.email = session?.user?.email || null;
    } catch (e) {
      RUNTIME_INFO.email = null;
    }
  }

  async function signOutCurrentUser() {
    if (!productConfig.useSupabase) return;
    let api;
    try {
      api = requireDataApi();
    } catch (e) {
      return;
    }
    if (typeof api.signOut !== 'function') {
      alert('Sign out is not available for this backend.');
      return;
    }
    try {
      await api.signOut();
      RUNTIME_INFO.email = null;
      alert('Signed out.');
      window.location.reload();
    } catch (e) {
      alert(`Sign out failed: ${e.message || e}`);
    }
  }

  function attachRuntimeBannerHandlers() {
    const btns = document.querySelectorAll('[data-action=\"runtime-signout\"]');
    btns.forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ok = confirm('Sign out of Supabase now?');
        if (!ok) return;
        await signOutCurrentUser();
      });
    });
  }

  function attachSidebarToggleHandler() {
    const btn = document.getElementById('sidebar-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const layout = document.querySelector('.layout');
      if (!layout) return;
      const next = !layout.classList.contains('sidebar-collapsed');
      layout.classList.toggle('sidebar-collapsed', next);
      setSidebarCollapsed(next);
      const nextLabel = next ? 'Expand sidebar menu' : 'Collapse sidebar menu';
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);
      btn.setAttribute('aria-expanded', next ? 'false' : 'true');
      btn.innerHTML = sidebarToggleIconSvg(next);
      // Re-sync offset after layout animation completes.
      setTimeout(adjustSidebarOffset, 240);
    });
  }

  function runtimeBannerHtml(options = {}) {
    if (window.SHOW_ENV_BANNER === false) return '';
    const compact = options.compact === true;
    const env = window.APP_ENV_LABEL || 'LOCAL DEV';
    const backend = productConfig.useSupabase ? 'SUPABASE' : 'INDEXEDDB';
    const schema = productConfig.supabaseSchema || 'public';
    const user = RUNTIME_INFO.email || 'not signed in';
    const productLabel = (productConfig.activeProduct || 'core').toUpperCase();
    const appLabel = productConfig.appName || APP_NAME || 'CRM';
    const isTestUser = /test/i.test(user);
    const toneBg = isTestUser ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)';
    const toneBorder = isTestUser ? 'rgba(16,185,129,0.45)' : 'rgba(245,158,11,0.45)';
    const toneText = isTestUser ? '#a7f3d0' : '#fde68a';
    const toneVars = `--rb-bg:${toneBg};--rb-border:${toneBorder};--rb-text:${toneText};`;
    const signOutButton = productConfig.useSupabase && RUNTIME_INFO.email
      ? '<button type=\"button\" data-action=\"runtime-signout\" class=\"runtime-signout-btn\">Sign Out</button>'
      : '';
    if (compact) {
      return `
        <div class="runtime-banner runtime-banner--compact" style="${toneVars}" title="${env} | ${productLabel} (${appLabel}) | ${backend} | schema: ${schema} | user: ${user}">
          <strong>${env}</strong>&nbsp;|&nbsp;${productLabel}&nbsp;|&nbsp;${user}${signOutButton}
        </div>
      `;
    }
    return `
      <div class="runtime-banner runtime-banner--full" style="${toneVars}">
        <strong>${env}</strong> | ${productLabel} (${appLabel}) | ${backend} | schema: ${schema} | user: ${user}${signOutButton}
      </div>
    `;
  }

  // Compatibility proxy: existing CrmDB calls now resolve through the active
  // storage driver first (IndexedDB/Supabase today, SQLite later).
  const CrmDB = new Proxy({}, {
    get(_target, prop) {
      const api = requireDataApi();
      const value = api[prop];
      return typeof value === 'function' ? value.bind(api) : value;
    }
  });
  
  // Check for force update parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force') === 'true' || urlParams.get('v')) {
    // Clear all caches immediately
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        return Promise.all(cacheNames.map(name => caches.delete(name)));
      });
    }
    // Clear service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        return Promise.all(registrations.map(registration => registration.unregister()));
      });
    }
  }

  // Smart Backup System - Check if daily backup is needed
  function checkDailyBackup() {
    const lastBackup = localStorage.getItem(`${STORAGE_PREFIX}last_backup`);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // If no previous backup or last backup was more than 24 hours ago
    if (!lastBackup || new Date(lastBackup) < oneDayAgo) {
      showBackupReminder();
    }
  }

  function showBackupReminder() {
    // Don't show if already showing or if user dismissed today
    const dismissedToday = localStorage.getItem(`${STORAGE_PREFIX}backup_dismissed_today`);
    const today = new Date().toDateString();
    
    if (dismissedToday === today) {
      return;
    }

    // Create backup reminder banner
    const reminderBanner = document.createElement('div');
    reminderBanner.id = 'backup-reminder';
    reminderBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: white;
      padding: 12px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      font-size: 14px;
      font-weight: 500;
    `;

    const lastBackup = localStorage.getItem(`${STORAGE_PREFIX}last_backup`);
    const daysSinceBackup = lastBackup ? 
      Math.floor((new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24)) : 
      'unknown';

    reminderBanner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
        <span>📥 Daily backup available (${daysSinceBackup} days since last backup)</span>
        <button id="backup-now-btn" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        ">Backup Now</button>
        <button id="dismiss-backup-btn" style="
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Dismiss</button>
      </div>
    `;

    document.body.appendChild(reminderBanner);

    // Add event listeners with a small delay to ensure DOM is ready
    setTimeout(() => {
      const backupBtn = document.getElementById('backup-now-btn');
      const dismissBtn = document.getElementById('dismiss-backup-btn');
      
      if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
          await performDailyBackup();
          reminderBanner.remove();
        });
      }
      
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          localStorage.setItem(`${STORAGE_PREFIX}backup_dismissed_today`, today);
          reminderBanner.remove();
        });
      } else {
      }
    }, 100);

    // Fallback: Use event delegation for the dismiss button
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'dismiss-backup-btn') {
        localStorage.setItem(`${STORAGE_PREFIX}backup_dismissed_today`, today);
        reminderBanner.remove();
      }
    });
  }

  // ============================================================================
  // PRO FEATURES: APP LOCK & BACKUP REMINDERS
  // ============================================================================

  async function showPinLockScreen(hashedPin) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'pin-lock-overlay';
      overlay.style.cssText = 'position: fixed; inset: 0; background: var(--bg, #1a1a2e); z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;';
      
      overlay.innerHTML = `
        <div style="text-align: center; max-width: 300px;">
          <div style="font-size: 48px; margin-bottom: 20px;">🔒</div>
          <h2 style="margin: 0 0 8px 0; color: white;">${LOCK_TITLE}</h2>
          <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px;">Enter your 4-digit PIN to unlock</p>
          <input type="password" id="unlock-pin-input" placeholder="• • • •" maxlength="4" pattern="[0-9]*" inputmode="numeric" style="width: 100%; padding: 16px; font-size: 24px; text-align: center; letter-spacing: 12px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 12px; color: white;" />
          <button id="unlock-btn" style="width: 100%; margin-top: 16px; padding: 14px; font-size: 16px; font-weight: 600; background: var(--brand, #f59e0b); color: white; border: none; border-radius: 12px; cursor: pointer;">Unlock</button>
          <p id="pin-error" style="color: #ef4444; margin-top: 12px; font-size: 13px; display: none;">Incorrect PIN. Please try again.</p>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const pinInput = document.getElementById('unlock-pin-input');
      const unlockBtn = document.getElementById('unlock-btn');
      const errorMsg = document.getElementById('pin-error');
      
      setTimeout(() => pinInput.focus(), 100);
      
      const attemptUnlock = () => {
        const enteredPin = pinInput.value.trim();
        const enteredHash = btoa(enteredPin + APP_LOCK_SALT);
        
        if (enteredHash === hashedPin) {
          overlay.remove();
          resolve(true);
        } else {
          errorMsg.style.display = 'block';
          pinInput.value = '';
          pinInput.focus();
        }
      };
      
      unlockBtn.addEventListener('click', attemptUnlock);
      pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') attemptUnlock();
      });
    });
  }

  function checkBackupReminder() {
    const frequency = localStorage.getItem(`${STORAGE_PREFIX}backup_reminder_frequency`);
    if (!frequency || frequency === 'off') return;
    
    const nextReminderStr = localStorage.getItem(`${STORAGE_PREFIX}next_backup_reminder`);
    if (!nextReminderStr) return;
    
    const nextReminder = new Date(nextReminderStr);
    const now = new Date();
    
    if (now >= nextReminder) {
      // Show reminder after a short delay
      setTimeout(() => {
        const shouldBackup = confirm('It\'s time for your scheduled backup! Would you like to create a backup now?');
        
        if (shouldBackup) {
          // Navigate to backup page
          navigate('/backup');
        }
        
        // Schedule next reminder
        let nextDate;
        if (frequency === 'weekly') {
          nextDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (frequency === 'monthly') {
          nextDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }
        
        if (nextDate) {
          localStorage.setItem(`${STORAGE_PREFIX}next_backup_reminder`, nextDate.toISOString());
        }
      }, 2000);
    }
  }

  async function loadStorageStats() {
    const container = document.getElementById('storage-meter-container');
    if (!container) return;
    
    try {
      const db = getDataApi();
      if (!db || typeof db.getStorageStats !== 'function') {
        container.innerHTML = '<div class="muted" style="font-size: 12px;">Storage info unavailable</div>';
        return;
      }
      const stats = await db.getStorageStats();
      
      let statusColor = '#22c55e'; // green
      let statusText = 'Healthy';
      if (stats.isCritical) {
        statusColor = '#ef4444'; // red
        statusText = 'Critical - consider deleting some photos';
      } else if (stats.isWarning) {
        statusColor = '#f97316'; // orange
        statusText = 'High usage - consider cleaning up';
      }

      const needsAttention = stats.isWarning || stats.isCritical;
      const attentionTitle = stats.isCritical ? 'Storage Critical' : 'Storage Warning';
      const attentionBg = stats.isCritical ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)';
      const attentionBorder = stats.isCritical ? 'rgba(239,68,68,0.35)' : 'rgba(249,115,22,0.35)';
      const attentionText = stats.isCritical
        ? 'You are close to the limit. Export and remove old photos to avoid failures.'
        : 'Usage is getting high. Consider a data-only backup and cleaning up older photos.';
      
      container.innerHTML = `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <span>${stats.imageCount} photos</span>
            <span>${stats.totalMB} MB used</span>
          </div>
          <div style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 8px; overflow: hidden;">
            <div style="background: ${statusColor}; height: 100%; width: ${stats.usagePercent}%; transition: width 0.3s;"></div>
          </div>
          <div style="font-size: 11px; color: ${statusColor}; margin-top: 4px;">
            ${statusText} (${stats.usagePercent}% of ~50MB limit)
          </div>
        </div>
        ${needsAttention ? `
        <div style="background: ${attentionBg}; border: 1px solid ${attentionBorder}; border-radius: 8px; padding: 10px; margin-top: 8px;">
          <div style="font-size: 13px; font-weight: 700; color: ${statusColor}; margin-bottom: 6px;">${attentionTitle}</div>
          <div style="font-size: 12px; color: var(--text); margin-bottom: 10px;">${attentionText}</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="storage-export-lite-btn" class="button secondary" style="padding: 6px 10px; font-size: 12px;">Export Data Only</button>
            <button id="storage-cleanup-btn" class="button secondary" style="padding: 6px 10px; font-size: 12px;">Review Customer Photos</button>
          </div>
        </div>
        ` : ''}
      `;

      const storageExportLiteBtn = document.getElementById('storage-export-lite-btn');
      if (storageExportLiteBtn) {
        storageExportLiteBtn.addEventListener('click', () => {
          const exportLiteBtn = document.getElementById('export-lite-btn');
          if (exportLiteBtn) {
            exportLiteBtn.click();
          } else {
            alert('Data-only export is only available on the Options page.');
          }
        });
      }

      const storageCleanupBtn = document.getElementById('storage-cleanup-btn');
      if (storageCleanupBtn) {
        storageCleanupBtn.addEventListener('click', () => {
          navigate('/find');
          alert('Open a customer and remove older photos you no longer need.');
        });
      }
    } catch (error) {
      console.error('Error loading storage stats:', error);
      container.innerHTML = '<div class="muted" style="font-size: 12px;">Could not calculate storage</div>';
    }
  }

  async function confirmImageStorageCapacity(fileList, label = 'photos') {
    const files = Array.from(fileList || []);
    if (files.length === 0) return true;

    try {
      const db = getDataApi();
      if (!db || typeof db.getStorageStats !== 'function') return true;

      const stats = await db.getStorageStats();
      const storageLimitBytes = 50 * 1024 * 1024;
      // Rough estimate: compressed image footprint + storage overhead.
      const estimatedIncomingBytes = files.reduce((sum, file) => sum + (file.size || 0), 0) * 0.55;
      const projectedBytes = Number(stats.totalBytes || 0) + estimatedIncomingBytes;
      const projectedPercent = (projectedBytes / storageLimitBytes) * 100;
      const projectedMb = (projectedBytes / (1024 * 1024)).toFixed(1);

      if (projectedPercent >= 100) {
        alert(
          `Storage limit risk detected.\n\n` +
          `Current usage: ${stats.totalMB} MB\n` +
          `Projected usage after adding ${files.length} ${label}: ~${projectedMb} MB\n\n` +
          `Please backup and delete old photos before adding more.`
        );
        return false;
      }

      if (projectedPercent >= 85 || stats.isWarning || stats.isCritical) {
        return confirm(
          `Storage warning:\n\n` +
          `Current usage: ${stats.totalMB} MB (${stats.usagePercent}%)\n` +
          `Projected after this upload: ~${projectedMb} MB (${projectedPercent.toFixed(1)}%)\n\n` +
          `Continue adding ${files.length} ${label}?`
        );
      }
    } catch (error) {
      console.warn('Could not check storage capacity before upload:', error);
    }

    return true;
  }

  let googlePlacesLoadPromise = null;
  let placesLibraryLoadPromise = null;

  async function loadGooglePlacesApi() {
    if (window.google?.maps) return true;
    if (googlePlacesLoadPromise) return googlePlacesLoadPromise;

    const apiKey = window.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return false;

    googlePlacesLoadPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[data-google-places="true"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(!!window.google?.maps), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googlePlaces = 'true';
      script.onload = () => resolve(!!window.google?.maps);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return googlePlacesLoadPromise;
  }

  async function loadPlacesLibrary() {
    if (placesLibraryLoadPromise) return placesLibraryLoadPromise;

    placesLibraryLoadPromise = (async () => {
      const loaded = await loadGooglePlacesApi();
      if (!loaded || !window.google?.maps) return null;
      for (let i = 0; i < 10; i++) {
        if (typeof window.google.maps.importLibrary === 'function') {
          try {
            const lib = await window.google.maps.importLibrary('places');
            if (lib) return lib;
          } catch (error) {
            console.warn('[AddressLookup] Failed to import Places library:', error);
            return null;
          }
        }
        if (window.google.maps.places) {
          return window.google.maps.places;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return null;
    })();
    const result = await placesLibraryLoadPromise;
    // Do not cache null forever; allow retry once Maps finishes bootstrapping.
    if (!result) {
      placesLibraryLoadPromise = null;
    }
    return result;
  }

  function getAddressComponent(components, type, useShortText = false) {
    const comp = (components || []).find(c => Array.isArray(c.types) && c.types.includes(type));
    if (!comp) return '';
    if (useShortText) {
      return comp.shortText || comp.short_name || comp.longText || comp.long_name || '';
    }
    return comp.longText || comp.long_name || comp.shortText || comp.short_name || '';
  }

  function applyAddressComponentsToForm(fields, place) {
    const components = place?.addressComponents || place?.address_components || [];
    if (!components.length) return;

    const subpremise = getAddressComponent(components, 'subpremise');
    const premise = getAddressComponent(components, 'premise');
    const streetNumber = getAddressComponent(components, 'street_number');
    const route = getAddressComponent(components, 'route');

    let streetAddress = [streetNumber, route].filter(Boolean).join(' ').trim();
    if (subpremise) {
      streetAddress = streetAddress ? `${subpremise}/${streetAddress}` : subpremise;
    } else if (!streetAddress && premise) {
      streetAddress = premise;
    }

    if (!streetAddress) {
      const formatted = (place?.formattedAddress || place?.formatted_address || '').split(',')[0].trim();
      streetAddress = formatted || (place?.displayName || place?.name || '').trim();
    }

    if (fields.line1Input && streetAddress) {
      fields.line1Input.value = streetAddress;
    }

    const suburb =
      getAddressComponent(components, 'locality') ||
      getAddressComponent(components, 'postal_town') ||
      getAddressComponent(components, 'sublocality_level_1') ||
      getAddressComponent(components, 'administrative_area_level_2');
    if (fields.suburbInput && suburb) {
      fields.suburbInput.value = suburb;
    }

    const state = getAddressComponent(components, 'administrative_area_level_1', true);
    if (fields.stateInput && state) {
      const upper = String(state).toUpperCase();
      if (fields.stateInput.tagName === 'SELECT') {
        if (Array.from(fields.stateInput.options).some(opt => opt.value === upper)) {
          fields.stateInput.value = upper;
        }
      } else {
        fields.stateInput.value = upper;
      }
    }

    const postcode = getAddressComponent(components, 'postal_code');
    if (fields.postcodeInput && postcode) {
      fields.postcodeInput.value = postcode;
    }

    const country = getAddressComponent(components, 'country');
    if (fields.countryInput && country) {
      fields.countryInput.value = country;
    }
  }

  function attachLegacyAutocomplete(fields, countryCodes) {
    try {
      if (!window.google?.maps?.places?.Autocomplete || !fields.line1Input) return false;
      if (fields.line1Input.dataset.autocompleteBound === 'true') return true;

      const options = {
        fields: ['address_components', 'formatted_address', 'name'],
      };
      if (countryCodes.length > 0) {
        options.componentRestrictions = { country: countryCodes };
      }

      const autocomplete = new window.google.maps.places.Autocomplete(fields.line1Input, options);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        applyAddressComponentsToForm(fields, place);
      });

      fields.line1Input.dataset.autocompleteBound = 'true';
      return true;
    } catch (error) {
      console.warn('[AddressLookup] Legacy autocomplete setup failed:', error);
      return false;
    }
  }

  function createAddressLookupWidget(form, line1Input, countryCodes) {
    if (form.querySelector('[data-address-lookup-widget="true"]')) return form.querySelector('[data-address-lookup-widget="true"]');

    const wrapper = document.createElement('div');
    wrapper.dataset.addressLookupWidget = 'true';
    wrapper.style.marginBottom = '10px';

    const label = document.createElement('label');
    label.textContent = t('addressLookupPlaceholder');
    wrapper.appendChild(label);

    const host = document.createElement('div');
    host.style.marginTop = '4px';
    wrapper.appendChild(host);

    const reference = line1Input.closest('.input-with-button') || line1Input;
    const parent = reference.parentElement;
    if (parent) {
      parent.parentElement?.insertBefore(wrapper, parent);
    }

    return host;
  }

  async function attachAddressAutocomplete(form) {
    const supportsAddressAutocomplete = hasAddressFields();
    if (!supportsAddressAutocomplete) return;
    if (window.ADDRESS_LOOKUP_ENABLED === false) return;
    if ((window.ADDRESS_LOOKUP_PROVIDER || 'google') !== 'google') return;

    const line1Input = form?.querySelector('input[name="addressLine1"]');
    const suburbInput = form?.querySelector('input[name="suburb"]');
    const stateInput = form?.querySelector('select[name="state"], input[name="state"]');
    const postcodeInput = form?.querySelector('input[name="postcode"]');
    const countryInput = form?.querySelector('input[name="country"]');
    if (!line1Input || line1Input.dataset.autocompleteBound === 'true') return;

    const countryCodes = String(window.ADDRESS_LOOKUP_COUNTRY_CODES || 'au')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const placesLib = await loadPlacesLibrary();
    let PlaceAutocompleteElement = placesLib?.PlaceAutocompleteElement || window.google?.maps?.places?.PlaceAutocompleteElement;
    if (!PlaceAutocompleteElement) {
      await new Promise(resolve => setTimeout(resolve, 250));
      PlaceAutocompleteElement = window.google?.maps?.places?.PlaceAutocompleteElement || null;
    }

    const fields = { line1Input, suburbInput, stateInput, postcodeInput, countryInput };
    if (!PlaceAutocompleteElement) {
      const legacyAttached = attachLegacyAutocomplete(fields, countryCodes);
      if (!legacyAttached) {
        console.warn('[AddressLookup] PlaceAutocompleteElement and legacy Autocomplete are unavailable. Using manual address entry.');
      }
      return;
    }

    const host = createAddressLookupWidget(form, line1Input, countryCodes);
    if (!host) return;

    try {
      const widget = new PlaceAutocompleteElement();
      widget.setAttribute('placeholder', t('addressLookupPlaceholder'));
      if (countryCodes.length > 0) {
        widget.setAttribute('included-region-codes', countryCodes.join(','));
        widget.includedRegionCodes = countryCodes;
      }
      widget.style.width = '100%';
      widget.style.display = 'block';
      host.replaceChildren(widget);

      const handleSelection = async (event) => {
        try {
          const prediction =
            event?.placePrediction ||
            event?.detail?.placePrediction ||
            event?.detail?.prediction ||
            null;

          if (!prediction || typeof prediction.toPlace !== 'function') return;
          const place = prediction.toPlace();
          if (!place || typeof place.fetchFields !== 'function') return;

          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'addressComponents']
          });
          applyAddressComponentsToForm(fields, place);
        } catch (error) {
          console.warn('[AddressLookup] Could not apply selected address:', error);
        }
      };

      widget.addEventListener('gmp-select', handleSelection);
      widget.addEventListener('gmp-placeselect', handleSelection);
      line1Input.dataset.autocompleteBound = 'true';
    } catch (error) {
      console.warn('[AddressLookup] Failed to initialize PlaceAutocompleteElement:', error);
    }
  }

  async function performDailyBackup() {
    try {
      const db = getDataApi();
      if (!db || typeof db.exportDataWithoutImages !== 'function') {
        alert('Backup is unavailable in the current storage mode.');
        return;
      }
      // Show loading state
      const backupBtn = document.getElementById('backup-now-btn');
      if (backupBtn) {
        backupBtn.textContent = 'Backing up...';
        backupBtn.disabled = true;
      }

      // Perform lightweight backup
      const result = await db.exportDataWithoutImages((message, progress) => {
      });

      // Create and download backup
      const timestamp = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productConfig.appSlug || 'crm'}-daily-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update last backup time
      localStorage.setItem(`${STORAGE_PREFIX}last_backup`, new Date().toISOString());
      
      // Show success message
      const reminderBanner = document.getElementById('backup-reminder');
      if (reminderBanner) {
        reminderBanner.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        reminderBanner.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            <span>✅ Daily backup completed! (${result.customers.length} customers, ${result.appointments.length} appointments)</span>
            <button onclick="this.parentElement.parentElement.remove()" style="
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 6px 12px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Close</button>
          </div>
        `;
      }

    } catch (error) {
      alert('Backup failed: ' + error.message);
    }
  }

  // Register Service Worker for PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const host = window.location.hostname;
      const isLocalDev = host === 'localhost' || host === '127.0.0.1' || host === '::1';
      if (isLocalDev) return;
      navigator.serviceWorker.register('/sw.js?v=1.0.3')
        .then((registration) => {
          
          // Check for updates every time the app loads
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version available, prompt user to update
                if (confirm('A new version of the app is available. Reload to update?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          });
          
          // Check for updates
          registration.update();
        })
        .catch((registrationError) => {
        });
    });
  }

  const appRoot = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');

  const routes = {
    '/': renderMenu,
    '/add': renderAddRecord,
    '/find': renderFind,
    '/calendar': renderCalendar,
    '/follow-ups': renderFollowUps,
    '/backup': renderBackup,
    '/customer': renderCustomer, // expects id query ?id=123
    '/customer-edit': renderCustomerEdit,
    '/emergency-backup': renderEmergencyBackup,
  };

  // i18n
  const translations = {
    en: {
              add: 'New Customer', find: 'Find', customers: 'Customers', calendar: 'Calendar', backup: 'Backup',
      export: 'Export', download: 'Download', load: 'Load', preview: 'Preview',
      selectAll: 'Select All', selectNone: 'Select None', includeAppointments: 'Include appointments', includeImages: 'Include images',
      mergeAppendUpdate: 'Merge (append/update)', replaceWipeThenImport: 'Replace (wipe then import)', importSelected: 'Import Selected', wipeAllData: 'Wipe All Data',
      deleteMyData: 'Delete My Data',
      goHome: 'Go Home', notFound: 'Not found',
        newCustomer: 'New Customer', newAppointment: 'New Appointment', findCustomer: 'Find Customer', backupRestore: 'Backup / Restore',
      firstName: 'First Name', lastName: 'Last Name', contactNumber: 'Contact Number', contactNumberPlaceholder: '0400 123 456', socialMediaName: 'Social Media Name', socialMediaNamePlaceholder: 'Enter social media username',
      address: 'Address', addressLookupPlaceholder: 'Search address', addressLine1: 'Address line 1', addressLine2: 'Address line 2', suburb: 'Suburb', state: 'State', postcode: 'Postcode', country: 'Country',
      referralType: 'Referral Type', referralNotes: 'Referral notes', referralNotesPlaceholder: 'Details related to referral', notes: 'Notes', attachImages: 'Attach Images',
      save: 'Save', saveChanges: 'Save Changes', cancel: 'Cancel', open: 'Open', select: 'Select',
      walkIn: 'Walk in', friend: 'Friend', instagram: 'Instagram', website: 'Website', googleMaps: 'Google Maps', other: 'Other',
      addNotes: 'Add notes', edit: 'Edit', images: 'Images', contact: 'Contact', referral: 'Referral', noNotesAdded: 'No notes added',
      bookAppointment: 'Book Appointment', bookingDate: 'Booking date', duration: 'Duration', bookingType: 'Booking type',
      selectTypes: 'Select types', noneSelected: 'None selected', book: 'Book',
      suggested: 'Suggested', recentlyUpdated: 'Recently updated', noMatchesFound: 'No matches found',
      quickBook: 'Quick Book', customer: 'Customer', searchPlaceholder: 'Search by name, phone, or social media…', noCustomerSelected: 'No customer selected', titleOptional: 'Title (optional)',
      appointmentBooked: 'Appointment booked', pleaseSelectDateTime: 'Please select booking date/time', pleaseSelectCustomer: 'Please select a customer',
      menu: 'Menu',
      month: 'Month', week: 'Week', day: 'Day', list: 'List', today: 'Today',
      sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
      langToggleEn: 'English', langToggleJa: '日本語',
      todaysAppointments: 'Today\'s Appointments', noAppointmentsToday: 'No appointments today',
      loading: 'Loading', nextAppointment: 'Next Appointment', noUpcomingAppointments: 'No upcoming appointments', errorLoadingAppointment: 'Error loading appointment',
      delete: 'Delete', confirmDelete: 'Are you sure you want to delete this appointment?', appointmentDetails: 'Appointment Details', pleaseSelectDateTime: 'Please select date and time',
      emergencyBackup: 'Emergency Backup', backupBeforeCacheClear: 'Backup Before Cache Clear', downloadBackupNow: 'Download Backup Now', cacheCleared: 'Cache Cleared - App Will Reload', clearCacheAndReload: 'Clear Cache & Reload App',
      followUps: 'Follow-ups', newReminder: 'New Reminder', followUpsUnavailableTitle: 'Follow-ups Unavailable',
      followUpsUnavailableMessage: 'This product does not enable reminders/follow-ups.',
      noFollowUps: 'No Follow-ups', followUpsEmptyMessage: 'Create a reminder from a customer or appointment to track follow-ups.',
      errorLoadingFollowUps: 'Error loading follow-ups', loadingJobs: 'Loading jobs...', errorLoadingJobs: 'Error loading jobs',
      pipeline: 'Pipeline', needsInvoice: 'Needs Invoice', unpaid: 'Unpaid', noResultsFound: 'No results found', errorSearching: 'Error searching',
      paymentTracking: 'Payment Tracking', jobPhotos: 'Job Photos', quickAddAppointment: 'Quick Add Appointment', all: 'All'
      , welcomeMenuMessage: 'Welcome back {firstName}, ready for today?'
    },
    ja: {
              add: '新規顧客', find: '検索', customers: '顧客', calendar: 'カレンダー', backup: 'バックアップ',
      export: 'エクスポート', download: 'ダウンロード', load: '読み込み', preview: 'プレビュー',
      selectAll: '全選択', selectNone: '全解除', includeAppointments: '予約を含む', includeImages: '画像を含む',
      mergeAppendUpdate: 'マージ（追加/更新）', replaceWipeThenImport: '置換（削除して取り込み）', importSelected: '選択を取り込み', wipeAllData: '全データを削除',
      deleteMyData: '自分のデータを削除',
      goHome: 'ホームへ', notFound: '見つかりません',
        newCustomer: '新規顧客', newAppointment: '新規予約', findCustomer: '顧客検索', backupRestore: 'バックアップ／復元',
      firstName: '名', lastName: '姓', contactNumber: '電話番号', contactNumberPlaceholder: '0400 123 456', socialMediaName: 'SNS名', socialMediaNamePlaceholder: 'SNSのユーザー名を入力',
      address: '住所', addressLookupPlaceholder: '住所検索', addressLine1: '住所1', addressLine2: '住所2', suburb: '市区町村', state: '都道府県', postcode: '郵便番号', country: '国',
      referralType: '紹介区分', referralNotes: '紹介メモ', referralNotesPlaceholder: '紹介に関する詳細', notes: 'ノート', attachImages: '画像を追加',
      save: '保存', saveChanges: '変更を保存', cancel: 'キャンセル', open: '開く', select: '選択',
      walkIn: '飛び込み', friend: '友人', instagram: 'インスタ', website: 'ウェブサイト', googleMaps: 'Googleマップ', other: 'その他',
      addNotes: 'ノート追加', edit: '編集', images: '画像', contact: '連絡先', referral: '紹介', noNotesAdded: 'ノートはありません',
      bookAppointment: '予約', bookingDate: '予約日時', duration: '施術時間', bookingType: 'メニュー',
      selectTypes: 'メニューを選択', noneSelected: '未選択', book: '予約する',
      suggested: '候補', recentlyUpdated: '最近更新', noMatchesFound: '該当なし',
      quickBook: 'クイック予約', customer: '顧客', searchPlaceholder: '氏名、電話、またはSNS名で検索…', noCustomerSelected: '未選択', titleOptional: 'タイトル（任意）',
      appointmentBooked: '予約を登録しました', pleaseSelectDateTime: '予約日時を選択してください', pleaseSelectCustomer: '顧客を選択してください',
      menu: 'メニュー',
      month: '月', week: '週', day: '日', list: 'リスト', today: '今日',
      sun: '日', mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土',
      langToggleEn: 'English', langToggleJa: '日本語',
      todaysAppointments: '今日の予約', noAppointmentsToday: '予約はありません',
      loading: '読み込み中', nextAppointment: '次の予約', noUpcomingAppointments: '予約はありません', errorLoadingAppointment: '予約の読み込みエラー',
              delete: '削除', confirmDelete: 'この予約を削除してもよろしいですか？', appointmentDetails: '予約詳細', pleaseSelectDateTime: '日時を選択してください',
      emergencyBackup: '緊急バックアップ', backupBeforeCacheClear: 'キャッシュクリア前のバックアップ', downloadBackupNow: '今すぐバックアップをダウンロード', cacheCleared: 'キャッシュクリア完了 - アプリが再読み込みされます', clearCacheAndReload: 'キャッシュクリア＆アプリ再読み込み',
      followUps: 'フォローアップ', newReminder: '新規リマインダー', followUpsUnavailableTitle: 'フォローアップは利用できません',
      followUpsUnavailableMessage: 'このプロダクトではリマインダー／フォローアップ機能は無効です。',
      noFollowUps: 'フォローアップはありません', followUpsEmptyMessage: '顧客または予約からリマインダーを作成してフォローアップを管理してください。',
      errorLoadingFollowUps: 'フォローアップの読み込みエラー', loadingJobs: 'ジョブ読み込み中...', errorLoadingJobs: 'ジョブの読み込みエラー',
      pipeline: 'パイプライン', needsInvoice: '請求書未作成', unpaid: '未入金', noResultsFound: '結果が見つかりません', errorSearching: '検索エラー',
      paymentTracking: '支払い管理', jobPhotos: 'ジョブ写真', quickAddAppointment: 'クイック追加', all: 'すべて'
      , welcomeMenuMessage: 'おかえりなさい {firstName} さん、今日の準備はいいですか？'
    }
  };

  function getLang() {
    return localStorage.getItem(`${STORAGE_PREFIX}lang`) || 'en';
  }
  function setLang(lang) {
    localStorage.setItem(`${STORAGE_PREFIX}lang`, lang);
  }
  function t(key) {
    const lang = getLang();
    // First check product-specific translations
    if (productConfig.getProductTranslation) {
      const productTrans = productConfig.getProductTranslation(key, lang);
      if (productTrans) return productTrans;
    }
    // Fall back to base translations
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  }

  function getWelcomeMenuMessage() {
    const firstNameOrEmail = RUNTIME_INFO.email || '{firstName}';
    const product = productConfig.activeProduct || 'core';
    let defaultTemplate = 'Welcome back {firstName}, ready for today?';
    if (product === 'hairdresser') {
      defaultTemplate = 'Welcome back {firstName}, who are we making beautiful today?';
    } else if (product === 'tradie') {
      defaultTemplate = 'Welcome back {firstName}, what job are we tackling today?';
    }
    const translated = t('welcomeMenuMessage');
    const template = String(
      translated && translated !== 'welcomeMenuMessage' ? translated : defaultTemplate
    );
    const safeTemplate = escapeHtml(template);
    const safeName = escapeHtml(firstNameOrEmail);
    return safeTemplate.replace('{firstName}', `<span class="menu-welcome-name">${safeName}</span>`);
  }
  function formatReferralType(value) {
    switch (value) {
      case 'Walk in': return t('walkIn');
      case 'Friend': return t('friend');
      case 'Instagram': return t('instagram');
      case 'Website': return t('website');
      case 'Google Maps': return t('googleMaps');
      case 'Other': return t('other');
      default: return value || '';
    }
  }

  function getInitials(firstName, lastName) {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return first + last;
  }

  // Generate service/booking type checkboxes from ProductConfig
  function generateServiceTypeOptions(className) {
    const serviceTypes = productConfig.serviceTypes || [];
    const lang = getLang();
    return serviceTypes.map(s => {
      const label = lang === 'ja' ? (s.labelJa || s.label) : s.label;
      return `<label class="check"><input type="checkbox" value="${s.label}" class="${className}" /> ${label}</label>`;
    }).join('\n                  ');
  }

  // Get service type labels array (for backward compatibility)
  function getBookingTypes() {
    return (productConfig.serviceTypes || []).map(s => s.label);
  }

  // Generate duration options from ProductConfig
  function generateDurationOptions() {
    const options = productConfig.durationOptions || [30, 45, 60, 90, 120, 150, 180];
    const defaultDuration = productConfig.defaultDuration || 60;
    return options.map(mins => {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      let label;
      if (hours === 0) {
        label = `${mins} mins`;
      } else if (remainingMins === 0) {
        label = hours === 1 ? '1 hour' : `${hours} hours`;
      } else {
        label = `${hours}.5 hours`;
      }
      const selected = mins === defaultDuration ? ' selected' : '';
      return `<option value="${mins}"${selected}>${label}</option>`;
    }).join('\n                    ');
  }

  // Generate job status options (for tradie edition)
  function generateStatusOptions(currentStatus) {
    const statuses = productConfig.statuses || [];
    return statuses.map(s => {
      const selected = s.id === currentStatus ? ' selected' : '';
      return `<option value="${s.id}"${selected}>${s.label}</option>`;
    }).join('\n');
  }

  // Get status badge HTML
  function getStatusBadge(statusId) {
    const statuses = productConfig.statuses || [];
    const status = statuses.find(s => s.id === statusId) || statuses[0];
    if (!status) return '';
    return `<span class="job-status-badge status-${status.id.replace('_', '-')}">${status.label}</span>`;
  }

  // Check if we're in tradie mode
  function isTradie() {
    return productConfig.activeProduct === 'tradie';
  }

  function usesJobPipeline() {
    return typeof productConfig.isFeatureEnabled === 'function'
      ? productConfig.isFeatureEnabled('jobPipeline')
      : !!productConfig.features?.jobPipeline;
  }

  function appointmentEntitySingular() {
    return typeof productConfig.getEntityName === 'function'
      ? productConfig.getEntityName('appointment', false)
      : 'Appointment';
  }

  function appointmentEntityPlural() {
    return typeof productConfig.getEntityName === 'function'
      ? productConfig.getEntityName('appointment', true)
      : 'Appointments';
  }

  function appointmentTypeLabel() {
    return usesJobPipeline() ? `${appointmentEntitySingular()} type` : t('bookingType');
  }

  function isCustomerFieldEnabled(fieldName) {
    if (typeof productConfig.getCustomerField === 'function') {
      return productConfig.getCustomerField(fieldName)?.enabled === true;
    }
    return !!productConfig.customerFields?.[fieldName]?.enabled;
  }

  function hasAddressFields() {
    return isCustomerFieldEnabled('addressLine1') || isCustomerFieldEnabled('suburb') || isCustomerFieldEnabled('state') || isCustomerFieldEnabled('postcode');
  }

  function usesExtendedAddressForm() {
    return isCustomerFieldEnabled('addressLine2') || isCustomerFieldEnabled('country');
  }

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function currentPath() {
    return window.location.hash.replace(/^#/, '') || '/';
  }

  function setTestId(selector, testId, scope = document) {
    scope.querySelector(selector)?.setAttribute('data-testid', testId);
  }

  function setTestIds(selector, testId, scope = document) {
    scope.querySelectorAll(selector).forEach((el) => {
      el.setAttribute('data-testid', testId);
    });
  }

  function applyE2ETestIds(scope = document) {
    setTestIds('a[href="#/add"]', 'nav-new-customer', scope);
    setTestIds('a[href="#/find"]', 'nav-customers', scope);
    setTestIds('a[href="#/backup"]', 'nav-backup', scope);
    setTestId('#new-form', 'new-customer-form', scope);
    setTestId('#customer-form', 'edit-customer-form', scope);
    setTestIds('input[name="firstName"]', 'customer-first-name', scope);
    setTestIds('input[name="lastName"]', 'customer-last-name', scope);
    setTestIds('input[name="contactNumber"]', 'customer-contact-number', scope);
    setTestIds('input[name="addressLine1"]', 'customer-address-line1', scope);
    setTestIds('input[name="addressLine2"]', 'customer-address-line2', scope);
    setTestIds('input[name="suburb"]', 'customer-suburb', scope);
    setTestIds('input[name="state"]', 'customer-state', scope);
    setTestIds('input[name="postcode"]', 'customer-postcode', scope);
    setTestIds('input[name="country"]', 'customer-country', scope);
    setTestId('#save-btn', 'save-customer-button', scope);
    setTestId('#search', 'customer-search', scope);
    setTestId('#results', 'customer-results', scope);
    setTestId('#recents', 'recent-customers', scope);
    setTestId('#all-customers-list', 'all-customers-list', scope);
    setTestId('.customer-title', 'customer-title', scope);
    setTestId('#edit-btn', 'edit-customer-button', scope);
    setTestId('.detail-list .detail-item:first-child .detail-value', 'customer-contact-value', scope);
    setTestIds('.add-note-btn', 'add-note-button', scope);
    setTestIds('.notes-list', 'notes-list', scope);
    setTestIds('.pinned-notes-view', 'pinned-notes-view', scope);
    setTestIds('.pinned-notes-list', 'pinned-notes-list', scope);
    setTestId('#export-btn', 'backup-export-full', scope);
    setTestId('#export-lite-btn', 'backup-export-data-only', scope);
    setTestId('#download-btn', 'backup-download', scope);
    setTestId('#backup-status', 'backup-status', scope);
  }

  // Global image cache cleanup
  function cleanupAllImageCaches() {
    // Clean up any existing image caches
    if (window.currentImageCache) {
      window.currentImageCache.forEach(url => URL.revokeObjectURL(url));
      window.currentImageCache.clear();
    }
    if (window.currentEditImageCache) {
      window.currentEditImageCache.forEach(url => URL.revokeObjectURL(url));
      window.currentEditImageCache.clear();
    }
  }

  async function render() {
    const path = currentPath();
    const [base, queryString] = path.split('?');
    const query = new URLSearchParams(queryString || '');
    const view = routes[base] || renderNotFound;
    
    // Clean up image caches before rendering new view
    cleanupAllImageCaches();
    
    appRoot.innerHTML = '';
    await view({ query });
    applyE2ETestIds(appRoot);
    const contentEl = appRoot.querySelector('.content');
    if (contentEl) {
      contentEl.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    adjustSidebarOffset();
    attachLangToggleHandler();
    attachVerticalBackupHandler();
    attachRuntimeBannerHandlers();
    attachSidebarToggleHandler();
    
    // Show FAB/search on products that enable the job pipeline.
    if (usesJobPipeline()) {
      const fabPages = ['/', '/find', '/calendar', '/follow-ups', '/customer'];
      renderFAB(fabPages.includes(base), base);
      
      // Attach global search handler
      attachGlobalSearchHandler();
    }
    
    // Check if daily backup is needed (only on main pages)
    if (base === '/' || base === '/find' || base === '/calendar') {
      setTimeout(checkDailyBackup, 1000); // Small delay to let page render
    }
  }

  // Views
  function renderMenu() {
    const lang = getLang();
    const homePanelHtml = `
      <div class="menu-home-panel">
        <div class="menu-welcome-block">
          <div class="menu-welcome-title">${getWelcomeMenuMessage()}</div>
        </div>
        <div class="todays-appointments">
          <h3>${t('todaysAppointments')}</h3>
          <div class="no-appointments">${t('noAppointmentsToday')}</div>
          <button id="refresh-appointments" class="refresh-appointments-btn">Refresh</button>
        </div>
      </div>
    `;

    if (useSidebarMenuOnPortraitMobile()) {
      appRoot.innerHTML = wrapWithSidebar(homePanelHtml);
    } else {
      appRoot.innerHTML = `
      <div class="menu-container">
        <div class="menu-toolbar">
          <div class="toolbar-top-row">
            ${runtimeBannerHtml({ compact: true })}
            <div class="lang-toolbar-group">
              <img src="${BRAND_LOGO_LIGHT}" alt="${BRAND_LOGO_ALT}" class="toolbar-logo" />
              <button id="lang-toggle" class="lang-btn">${lang === 'en' ? '\u65e5\u672c\u8a9e' : 'English'}</button>
            </div>
          </div>
        </div>
        <div class="menu-content">
          <div class="menu-primary">
            <div class="menu-welcome-block">
              <div class="menu-welcome-title">${getWelcomeMenuMessage()}</div>
            </div>
            <nav class="menu-tiles" aria-label="Main menu">
            <a class="menu-tile" href="#/add" aria-label="Add new record">
              <div class="tile-icon" aria-hidden="true">➕</div>
              <div class="tile-label">${t('add')}</div>
            </a>
            <a class="menu-tile" href="#/find" aria-label="Customers">
              <div class="tile-icon" aria-hidden="true">🔎</div>
              <div class="tile-label">${t('customers')}</div>
            </a>
            <a class="menu-tile" href="#/calendar" aria-label="Calendar">
              <div class="tile-icon" aria-hidden="true">🗓️</div>
              <div class="tile-label">${t('calendar')}</div>
            </a>
            ${usesJobPipeline() ? `
            <a class="menu-tile" href="#/follow-ups" aria-label="Follow-ups">
              <div class="tile-icon" aria-hidden="true">🔔</div>
              <div class="tile-label">${t('followUps')}</div>
            </a>
            ` : ''}
            <a class="menu-tile" href="#/backup" aria-label="Options">
              <div class="tile-icon" aria-hidden="true">⚙️</div>
              <div class="tile-label">Options</div>
            </a>
            <!-- Emergency Backup tile hidden from main menu but functionality preserved -->
            <a class="menu-tile" href="#/emergency-backup" aria-label="Emergency Backup" style="display: none; background: linear-gradient(135deg, #ff6b6b, #ee5a52);">
              <div class="tile-icon" aria-hidden="true">🚨</div>
              <div class="tile-label">${t('emergencyBackup')}</div>
            </a>
            <button class="menu-tile menu-tile--backup" id="daily-backup-btn" aria-label="1-tap Backup" style="background: linear-gradient(135deg, #4ecdc4, #44a08d); cursor: pointer;">
              <div class="tile-icon" aria-hidden="true">📥</div>
              <div class="tile-label">1-tap Backup</div>
            </button>
            </nav>
            <div class="todays-appointments">
              <h3>${t('todaysAppointments')}</h3>
              <div class="no-appointments">${t('noAppointmentsToday')}</div>
              <button id="refresh-appointments" class="refresh-appointments-btn">Refresh</button>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    
    // Load appointments after rendering the basic structure
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      loadTodaysAppointments();
      // Add event listener for refresh button
      const refreshBtn = document.getElementById('refresh-appointments');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTodaysAppointments);
      }
      
      // Add event listener for daily backup button
      const dailyBackupBtn = document.getElementById('daily-backup-btn');
      if (dailyBackupBtn) {
        dailyBackupBtn.addEventListener('click', async () => {
          await performDailyBackup();
        });
      }
      
      // Note: Vertical backup button event listener is handled globally
    }, 100);
  }
  
  async function loadTodaysAppointments() {
    try {
      const today = new Date();
      
      // Use the new optimized function instead of loading all appointments
      const todaysAppointments = await CrmDB.getAppointmentsForDate(today);
      
      // Sort by time
      const sortedAppointments = todaysAppointments.sort((a, b) => {
        const dateA = a.start instanceof Date ? a.start : new Date(a.start);
        const dateB = b.start instanceof Date ? b.start : new Date(b.start);
        return dateA - dateB;
      });
      
      const appointmentsContainer = document.querySelector('.todays-appointments');
      
      if (appointmentsContainer) {
        if (sortedAppointments.length > 0) {
          // Get customer details for each appointment
          const appointmentsWithCustomers = await Promise.all(
            sortedAppointments.map(async (apt) => {
              try {
                const customer = await CrmDB.getCustomerById(apt.customerId);
                return {
                  ...apt,
                  customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer'
                };
              } catch (error) {
                return {
                  ...apt,
                  customerName: 'Unknown Customer'
                };
              }
            })
          );
          
                          appointmentsContainer.innerHTML = `
                  <h3>${t('todaysAppointments')}</h3>
                  <div class="appointment-list">
                    ${appointmentsWithCustomers.map(apt => `
                      <div class="appointment-item" data-appointment-id="${apt.id}" style="cursor: pointer;">
                        <div class="apt-time">${new Date(apt.start).toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: getLang() === 'en'
                        })}</div>
                        <div class="apt-details">
                          <div class="apt-customer">${apt.customerName}</div>
                          <div class="apt-title">${apt.title || 'No service type'}</div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                                `;
                // Add click handlers for appointment items
                const appointmentItems = appointmentsContainer.querySelectorAll('.appointment-item');
                appointmentItems.forEach(item => {
                  item.addEventListener('click', () => {
                    const appointmentId = item.dataset.appointmentId;
                    if (appointmentId) {
                      navigate(`/calendar?appointment=${encodeURIComponent(appointmentId)}`);
                    }
                  });
                });
        } else {
          // No appointments found for today
        }
      }
    } catch (error) {
      // Keep the "no appointments" message if there's an error
    }
  }

  function wrapWithSidebar(contentHtml) {
    const lang = getLang();
    const collapsed = isSidebarCollapsed();
    const cachedSidebarTopOffset = getCachedSidebarTopOffset();
    const toggleLabel = collapsed ? 'Expand sidebar menu' : 'Collapse sidebar menu';
    const toggleIcon = sidebarToggleIconSvg(collapsed);
    const sidebarInlineStyle = cachedSidebarTopOffset != null
      ? ` style="--sidebar-top-offset: ${cachedSidebarTopOffset}px;"`
      : '';
    return `
      <div class="layout ${collapsed ? 'sidebar-collapsed' : ''}">
        <aside class="sidebar"${sidebarInlineStyle}>
          <div class="sidebar-controls">
            <button type="button" id="sidebar-toggle-btn" class="sidebar-icon-btn" aria-label="${toggleLabel}" title="${toggleLabel}" aria-expanded="${collapsed ? 'false' : 'true'}">${toggleIcon}</button>
          </div>
          <nav class="sidebar-tiles" aria-label="Sidebar menu">
            <a class="menu-tile small" href="#/" aria-label="Menu">
              <div class="tile-icon" aria-hidden="true">🏠</div>
              <div class="tile-label">${t('menu')}</div>
            </a>
            <a class="menu-tile small" href="#/add" aria-label="Add new record">
              <div class="tile-icon" aria-hidden="true">➕</div>
              <div class="tile-label">${t('add')}</div>
            </a>
            <a class="menu-tile small" href="#/find" aria-label="Customers">
              <div class="tile-icon" aria-hidden="true">🔎</div>
              <div class="tile-label">${t('customers')}</div>
            </a>
            <a class="menu-tile small" href="#/calendar" aria-label="Calendar">
              <div class="tile-icon" aria-hidden="true">🗓️</div>
              <div class="tile-label">${t('calendar')}</div>
            </a>
            ${usesJobPipeline() ? `
            <a class="menu-tile small" href="#/follow-ups" aria-label="Follow-ups">
              <div class="tile-icon" aria-hidden="true">🔔</div>
              <div class="tile-label">${t('followUps')}</div>
            </a>
            ` : ''}
            <a class="menu-tile small" href="#/backup" aria-label="Options">
              <div class="tile-icon" aria-hidden="true">⚙️</div>
              <div class="tile-label">Options</div>
            </a>
            <button class="menu-tile small menu-tile--backup" id="daily-backup-btn-vertical" aria-label="1-tap Backup" style="background: linear-gradient(135deg, #4ecdc4, #44a08d); cursor: pointer;">
              <div class="tile-icon" aria-hidden="true">📥</div>
              <div class="tile-label">1-tap Backup</div>
            </button>
          </nav>
        </aside>
        <section class="content">
          <div class="content-toolbar">
            ${runtimeBannerHtml({ compact: true })}
            ${usesJobPipeline() ? `
            <div class="global-search-container">
              <input type="text" id="global-search-input" class="global-search-input" placeholder="Search customers, ${appointmentEntityPlural().toLowerCase()}..." />
              <span class="global-search-icon" aria-hidden="true">&#128269;</span>
              <div id="global-search-results" class="search-results-dropdown search-results-dropdown--hidden"></div>
            </div>
            ` : ''}
            <div class="lang-toolbar-group">
              <img src="${BRAND_LOGO_LIGHT}" alt="${BRAND_LOGO_ALT}" class="toolbar-logo" />
              <button id="lang-toggle" class="lang-btn">${lang === 'en' ? '\u65e5\u672c\u8a9e' : 'English'}</button>
            </div>
          </div>
          ${contentHtml}
        </section>
      </div>
    `;
  }

  const NOTE_INPUT_MODE_KEY = 'noteInputMode';

  function getDefaultNoteInputMode() {
    return productConfig.activeProduct === 'hairdresser' ? 'canvas' : 'text';
  }

  function getNoteInputMode() {
    const saved = localStorage.getItem(NOTE_INPUT_MODE_KEY);
    if (saved === 'text' || saved === 'canvas') return saved;
    return getDefaultNoteInputMode();
  }

  function setNoteInputMode(mode) {
    if (mode !== 'text' && mode !== 'canvas') return;
    localStorage.setItem(NOTE_INPUT_MODE_KEY, mode);
    applyNoteInputModeToggleState(mode);
  }

  function shouldUseCanvasNoteInput() {
    return getNoteInputMode() === 'canvas';
  }

  function renderNoteInputModeToggle(options = {}) {
    const compact = options.compact === true;
    const noMargin = options.noMargin === true;
    const marginStyle = noMargin ? '' : (compact ? ' margin-top:10px;' : ' margin-bottom:10px;');
    return `
      <div class="note-input-mode-toggle" style="display:flex; align-items:center;${marginStyle}">
        <label style="position:relative; display:inline-flex; width:64px; height:38px; cursor:pointer; vertical-align:middle;" title="Toggle note input mode">
          <input type="checkbox" data-note-input-toggle style="opacity:0; width:0; height:0;" aria-label="Toggle note input mode" />
          <span class="note-input-mode-slider" style="position:absolute; inset:0; background:rgba(255,255,255,0.18); border:1px solid rgba(255,255,255,0.25); border-radius:999px; transition:all 0.2s ease;"></span>
          <span class="note-input-mode-knob" style="position:absolute; top:3px; left:3px; width:32px; height:32px; background:#ffffff; border-radius:50%; transition:transform 0.2s ease; position:absolute;">
            <span class="note-input-mode-icon" aria-hidden="true" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:16px; height:16px; display:block; pointer-events:none;">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="5" width="20" height="14" rx="2" fill="#dbeafe"></rect>
                <path d="M6 9h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01M8 15h8" stroke="#1d4ed8"></path>
              </svg>
            </span>
          </span>
        </label>
      </div>
    `;
  }

  function noteInputModeIconSvg(mode) {
    if (mode === 'canvas') {
      return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7c2d12" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c-4.9 0-9 3.6-9 8 0 4.2 3.7 7 6.8 7h1.5c1.1 0 2 .9 2 2v.5c0 .8.7 1.5 1.5 1.5 4.6 0 8.2-3.6 8.2-8.3C23 7.9 18.1 3 12 3Z" fill="#fde68a"></path><circle cx="7.5" cy="10" r="1" fill="#ef4444" stroke="#ef4444"></circle><circle cx="10.5" cy="8" r="1" fill="#22c55e" stroke="#22c55e"></circle><circle cx="14" cy="8.5" r="1" fill="#3b82f6" stroke="#3b82f6"></circle><circle cx="16.5" cy="11" r="1" fill="#a855f7" stroke="#a855f7"></circle></svg>';
    }
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" fill="#dbeafe"></rect><path d="M6 9h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01M8 15h8" stroke="#1d4ed8"></path></svg>';
  }

  function applyNoteInputModeToggleState(mode = getNoteInputMode()) {
    const isCanvas = mode === 'canvas';
    document.querySelectorAll('input[data-note-input-toggle]').forEach((input) => {
      input.checked = isCanvas;
      input.setAttribute('aria-checked', isCanvas ? 'true' : 'false');
      const container = input.closest('.note-input-mode-toggle');
      const slider = container ? container.querySelector('.note-input-mode-slider') : null;
      const knob = container ? container.querySelector('.note-input-mode-knob') : null;
      if (slider) {
        slider.style.background = isCanvas ? 'var(--brand)' : 'rgba(255,255,255,0.18)';
        slider.style.borderColor = isCanvas ? 'var(--brand)' : 'rgba(255,255,255,0.25)';
      }
      if (knob) {
        knob.style.transform = isCanvas ? 'translateX(26px)' : 'translateX(0)';
      }
      const icon = container ? container.querySelector('.note-input-mode-icon') : null;
      if (icon) {
        icon.innerHTML = noteInputModeIconSvg(isCanvas ? 'canvas' : 'text');
      }
    });
  }

  function bindNoteInputModeToggles(scope = document) {
    scope.querySelectorAll('input[data-note-input-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        setNoteInputMode(input.checked ? 'canvas' : 'text');
      });
    });
    applyNoteInputModeToggleState();
  }

  function openNoteEditorByMode(customerId) {
    if (shouldUseCanvasNoteInput()) {
      fullscreenNotesCanvas.show();
    } else {
      textNotesOverlay.show(customerId);
    }
  }

  // NOTE_CONTRACT_GUARDRAIL:
  // During first-pass stability hardening, note payload typing rules are owned by DB adapters.
  // Do not introduce new note persistence branching here until adapter parity gates pass.
  const noteRuntime = window.NoteRuntime || {};
  function escapeXmlText(value) {
    return noteRuntime.escapeXmlText ? noteRuntime.escapeXmlText(value) : String(value || '');
  }
  function isSerializedTextNoteSvg(svgValue) {
    return noteRuntime.isSerializedTextNoteSvg ? noteRuntime.isSerializedTextNoteSvg(svgValue) : false;
  }
  function extractTextFromSerializedTextNoteSvg(svgValue) {
    return noteRuntime.extractTextFromSerializedTextNoteSvg ? noteRuntime.extractTextFromSerializedTextNoteSvg(svgValue) : '';
  }
  function getNoteTextValue(note) {
    return noteRuntime.getNoteTextValue ? noteRuntime.getNoteTextValue(note) : '';
  }
  function getNoteTypeValue(note) {
    return noteRuntime.getNoteTypeValue ? noteRuntime.getNoteTypeValue(note) : 'svg';
  }
  function shouldRenderAsText(note) {
    if (noteRuntime.shouldRenderAsText) return noteRuntime.shouldRenderAsText(note);
    return getNoteTypeValue(note) === 'text';
  }
  function isNoteQueuedForSync(note) {
    return noteRuntime.isNoteQueuedForSync ? noteRuntime.isNoteQueuedForSync(note) : !!(note && note.queuedSync === true);
  }
  function isNotePinned(note) {
    return noteRuntime.isNotePinned ? noteRuntime.isNotePinned(note) : !!(note && (note.isPinned === true || note.isPinned === 'true'));
  }
  function serializeTextNoteToSvg(textValue) {
    return noteRuntime.serializeTextNoteToSvg ? noteRuntime.serializeTextNoteToSvg(textValue) : '';
  }
  const PINNED_NOTES_LIMIT = 5;

  function renderPinnedNotesSection() {
    return `
      <div class="pinned-notes-view" style="display:none; margin: 16px 0;" data-testid="pinned-notes-view">
        <h3 style="margin:0 0 8px 0;">Pinned Notes</h3>
        <div class="pinned-notes-list" style="display:flex; flex-direction:column; gap:8px;" data-testid="pinned-notes-list"></div>
      </div>
    `;
  }

  async function renderAddRecord() {
    // Clear global customer variables to prevent notes from being assigned to wrong customer
    window.currentCustomerId = null;
    window.currentCustomer = null;
    clearTempNewCustomerDraft();
    
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between section-header">
        <h2>${t('newCustomer')}</h2>
      </div>
      <div class="card">
        <div class="view-header" style="margin-bottom: 8px;">
          <div></div>
          <div class="view-actions" style="display: flex; gap: 8px;">
            ${renderNoteInputModeToggle({ compact: true, noMargin: true })}
          </div>
        </div>
        <div class="form" id="new-form">
          <div class="grid-2">
            <div>
              <label>${t('firstName')}</label>
              <div class="input-with-button">
                <input type="text" name="firstName" placeholder="${t('firstName')}" inputmode="text" />
              </div>
            </div>
            <div>
              <label>${t('lastName')}</label>
              <div class="input-with-button">
                <input type="text" name="lastName" placeholder="${t('lastName')}" inputmode="text" />
              </div>
            </div>
          </div>
          <div>
            <label>${t('contactNumber')}</label>
            <div class="input-with-button">
              <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" inputmode="tel" />
            </div>
          </div>
          ${!isTradie() ? `
          <div>
            <label>${t('socialMediaName')}</label>
            <div class="input-with-button">
              <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" inputmode="text" />
            </div>
          </div>
          ` : ''}
          ${isTradie() ? `
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <strong style="font-size: 14px;">📍 Address</strong>
            <div style="margin-top: 12px;">
              <label style="font-size: 12px;">Street Address</label>
              <input type="text" name="addressLine1" placeholder="123 Main Street" />
            </div>
            <div class="grid-2" style="margin-top: 8px;">
              <div>
                <label style="font-size: 12px;">Suburb</label>
                <input type="text" name="suburb" placeholder="Suburb" />
              </div>
              <div class="grid-2">
                <div>
                  <label style="font-size: 12px;">State</label>
                  <select name="state">
                    <option value="">-</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 12px;">Postcode</label>
                  <input type="text" name="postcode" placeholder="0000" maxlength="4" />
                </div>
              </div>
            </div>
          </div>
          ` : ''}
          ${usesExtendedAddressForm() ? `
          <div>
            <label>${t('address')}</label>
            <div class="input-with-button">
              <input type="text" name="addressLine1" placeholder="${t('addressLine1')}" inputmode="text" />
            </div>
          </div>
          <div>
            <label>${t('addressLine2')}</label>
            <div class="input-with-button">
              <input type="text" name="addressLine2" placeholder="${t('addressLine2')}" inputmode="text" />
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label>${t('suburb')}</label>
              <div class="input-with-button">
                <input type="text" name="suburb" placeholder="${t('suburb')}" inputmode="text" />
              </div>
            </div>
            <div>
              <label>${t('state')}</label>
              <div class="input-with-button">
                <input type="text" name="state" placeholder="${t('state')}" inputmode="text" />
              </div>
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label>${t('postcode')}</label>
              <div class="input-with-button">
                <input type="text" name="postcode" placeholder="${t('postcode')}" inputmode="text" />
              </div>
            </div>
            <div>
              <label>${t('country')}</label>
              <div class="input-with-button">
                <input type="text" name="country" placeholder="${t('country')}" inputmode="text" />
              </div>
            </div>
          </div>
          ` : ''}
          <div>
            <label>Referral</label>
            <div class="input-with-button">
              <input type="text" name="referralNotes" placeholder="${t('referralNotesPlaceholder')}" />
            </div>
          </div>
          <div>
            <label>${t('notes')}</label>
            ${renderPinnedNotesSection()}
            <button type="button" class="add-note-btn" style="background: var(--brand); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 12px;">+ Add Note</button>
            <div class="notes-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
          <div>
            <label>${t('attachImages')}</label>
            <input type="file" name="images" accept="image/*" multiple />
          </div>
          <div class="row">
            <button class="button" id="save-btn">${t('save')}</button>
          </div>
        </div>
      </div>
    `);

    await attachAddressAutocomplete(document.getElementById('new-form'));

    // Initialize add note button functionality
    document.querySelector('.add-note-btn').addEventListener('click', () => {
      openNoteEditorByMode('temp-new-customer');
    });
    bindNoteInputModeToggles(appRoot);
    
    // Load any existing temporary notes for new customer
    loadExistingNotes('temp-new-customer');
    
    document.getElementById('save-btn').addEventListener('click', async () => {
      const form = document.getElementById('new-form');
      const firstName = form.querySelector('input[name="firstName"]').value.trim();
      const lastName = form.querySelector('input[name="lastName"]').value.trim();
      const contactNumber = form.querySelector('input[name="contactNumber"]').value.trim();
      const referralNotes = form.querySelector('input[name="referralNotes"]').value.trim();
      const socialMediaName = isCustomerFieldEnabled('socialMediaName')
        ? (form.querySelector('input[name="socialMediaName"]')?.value?.trim() || '')
        : '';
      const addressLine1 = isCustomerFieldEnabled('addressLine1') ? (form.querySelector('input[name="addressLine1"]')?.value?.trim() || '') : '';
      const addressLine2 = isCustomerFieldEnabled('addressLine2') ? (form.querySelector('input[name="addressLine2"]')?.value?.trim() || '') : '';
      const suburb = isCustomerFieldEnabled('suburb') ? (form.querySelector('input[name="suburb"]')?.value?.trim() || '') : '';
      const state = isCustomerFieldEnabled('state')
        ? (form.querySelector('select[name="state"]')?.value || form.querySelector('input[name="state"]')?.value?.trim() || '')
        : '';
      const postcode = isCustomerFieldEnabled('postcode') ? (form.querySelector('input[name="postcode"]')?.value?.trim() || '') : '';
      const country = isCustomerFieldEnabled('country') ? (form.querySelector('input[name="country"]')?.value?.trim() || '') : '';
      
      // Get notes data from fullscreenNotesCanvas if available, otherwise use empty string
      let notesImageData = '';
      if (shouldUseCanvasNoteInput() && fullscreenNotesCanvas && fullscreenNotesCanvas.canvas && fullscreenNotesCanvas.strokes && fullscreenNotesCanvas.strokes.length > 0) {
        notesImageData = fullscreenNotesCanvas.getImageData();
      }
      
      const imageFiles = form.querySelector('input[name="images"]').files;

      const customer = {
        firstName, lastName, contactNumber, socialMediaName, referralNotes,
        notesImageData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (isCustomerFieldEnabled('addressLine1')) customer.addressLine1 = addressLine1;
      if (isCustomerFieldEnabled('addressLine2')) customer.addressLine2 = addressLine2;
      if (isCustomerFieldEnabled('suburb')) customer.suburb = suburb;
      if (isCustomerFieldEnabled('state')) customer.state = state;
      if (isCustomerFieldEnabled('postcode')) customer.postcode = postcode;
      if (isCustomerFieldEnabled('country')) customer.country = country;

      const newId = await CrmDB.createCustomer(customer);

      // Persist any temporary notes from 'temp-new-customer' into the DB, then clear localStorage
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const tempNotes = existingNotes['temp-new-customer'] || [];
      if (tempNotes.length > 0) {
        for (let i = 0; i < tempNotes.length; i++) {
          const note = tempNotes[i];
          await CrmDB.createNote({
            customerId: newId,
            text: note.text || note.textValue || note.content,
            textValue: note.textValue || note.text || note.content || null,
            noteType: note.noteType || note.type || null,
            isPinned: isNotePinned(note),
            svg: note.svg || null,
            date: note.date,
            noteNumber: note.noteNumber != null ? note.noteNumber : i + 1,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString()
          });
        }
        delete existingNotes['temp-new-customer'];
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
      }

      // Always clear temp draft notes once customer save is complete
      clearTempNewCustomerDraft();

      if (imageFiles && imageFiles.length > 0) {
        const canUpload = await confirmImageStorageCapacity(imageFiles, 'customer photos');
        if (!canUpload) return;
        const entries = await CrmDB.fileListToEntries(imageFiles);
        await CrmDB.addImages(newId, entries);
      }

      navigate(`/customer?id=${encodeURIComponent(newId)}`);
    });
  }

  async function renderFind() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between section-header">
        <h2>${t('customers')}</h2>
      </div>
      <div class="card">
        <div class="form">
          <input id="search" type="text" placeholder="${t('searchPlaceholder')}" />
          <div id="suggested-section" class="hidden" style="margin-top:12px;">
            <h3 style="margin:0 0 6px 0;">${t('suggested')}</h3>
            <div id="results" class="list"></div>
          </div>
          <div id="recents-section" style="margin-top:12px;">
            <h3 style="margin:0 0 6px 0;">${t('recentlyUpdated')}</h3>
            <div id="recents" class="list"></div>
            <button id="show-all-customers-btn" class="text-button" style="margin-top: 12px; color: var(--muted); font-size: 13px; text-decoration: underline; cursor: pointer; background: none; border: none; padding: 0;">Show all customers ▾</button>
          </div>
          
          <div id="all-customers-section" class="hidden" style="margin-top:12px;">
            <h3 style="margin:0 0 6px 0;">All Customers</h3>
            <div class="all-customers-container">
              <div id="all-customers-list" class="list"></div>
              <div id="alphabet-scrollbar" class="alphabet-scrollbar">
                <div class="scrollbar-letter" data-letter="A">A</div>
                <div class="scrollbar-letter" data-letter="B">B</div>
                <div class="scrollbar-letter" data-letter="C">C</div>
                <div class="scrollbar-letter" data-letter="D">D</div>
                <div class="scrollbar-letter" data-letter="E">E</div>
                <div class="scrollbar-letter" data-letter="F">F</div>
                <div class="scrollbar-letter" data-letter="G">G</div>
                <div class="scrollbar-letter" data-letter="H">H</div>
                <div class="scrollbar-letter" data-letter="I">I</div>
                <div class="scrollbar-letter" data-letter="J">J</div>
                <div class="scrollbar-letter" data-letter="K">K</div>
                <div class="scrollbar-letter" data-letter="L">L</div>
                <div class="scrollbar-letter" data-letter="M">M</div>
                <div class="scrollbar-letter" data-letter="N">N</div>
                <div class="scrollbar-letter" data-letter="O">O</div>
                <div class="scrollbar-letter" data-letter="P">P</div>
                <div class="scrollbar-letter" data-letter="Q">Q</div>
                <div class="scrollbar-letter" data-letter="R">R</div>
                <div class="scrollbar-letter" data-letter="S">S</div>
                <div class="scrollbar-letter" data-letter="T">T</div>
                <div class="scrollbar-letter" data-letter="U">U</div>
                <div class="scrollbar-letter" data-letter="V">V</div>
                <div class="scrollbar-letter" data-letter="W">W</div>
                <div class="scrollbar-letter" data-letter="X">X</div>
                <div class="scrollbar-letter" data-letter="Y">Y</div>
                <div class="scrollbar-letter" data-letter="Z">Z</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const searchInput = document.getElementById('search');
    const resultsEl = document.getElementById('results');
    const suggestedSection = document.getElementById('suggested-section');
    const recentsEl = document.getElementById('recents');
    const allCustomersSection = document.getElementById('all-customers-section');
    const allCustomersList = document.getElementById('all-customers-list');
    const showAllCustomersBtn = document.getElementById('show-all-customers-btn');

    async function refresh() {
      const query = (searchInput.value || '').trim();
      if (query.length < 1) {
        resultsEl.innerHTML = '';
        suggestedSection.classList.add('hidden');
        return;
      }
      const customers = await CrmDB.searchCustomers(query);
      if (customers.length === 0) {
        resultsEl.innerHTML = `<div class="muted">${t('noMatchesFound')}</div>`;
      } else {
        // Use optimized query to get only future appointments
        const now = new Date().toISOString();
        const futureAppts = await CrmDB.getAppointmentsBetween(now, '9999-12-31T23:59:59.999Z');
        const nextByCustomer = new Map();
        futureAppts.forEach((a) => {
          const start = new Date(a.start);
          if (start <= new Date(now)) return;
          const cur = nextByCustomer.get(a.customerId);
          if (!cur || new Date(cur.start) > start) nextByCustomer.set(a.customerId, a);
        });
        resultsEl.innerHTML = customers.map((c) => {
          const next = nextByCustomer.get(c.id);
          let rightHtml = '';
          if (next) {
            const start = new Date(next.start);
            const dateStr = start.toLocaleDateString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const timeStr = start.toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: getLang() === 'en' });
            rightHtml = `<div class=\"next-apt-inline\"><div class=\"muted\">Next appointment: ${dateStr}</div><div class=\"brand\">${timeStr}</div></div>`;
          }
          return `
          <div class=\"list-item\" data-id=\"${c.id}\"> 
            <div>
              <div><strong>${escapeHtml(c.firstName || '')} ${escapeHtml(c.lastName || '')}</strong></div>
              <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${isTradie() ? ((c.addressLine1 || c.suburb) ? ` • ${escapeHtml((c.addressLine1 || c.suburb).trim())}` : '') : (c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : '')}</div>
            </div>
            ${rightHtml}
          </div>`;
        }).join('');
        resultsEl.querySelectorAll('.list-item').forEach((rowEl) => {
          rowEl.addEventListener('click', () => {
            const id = Number(rowEl.getAttribute('data-id'));
            if (!Number.isNaN(id)) navigate(`/customer?id=${encodeURIComponent(id)}`);
          });
        });
      }
      suggestedSection.classList.remove('hidden');
    }

    searchInput.addEventListener('input', debounce(refresh, 200));
    await refresh();

    async function refreshRecents() {
      // Use the new optimized function for recent customers
      const customers = await CrmDB.getRecentCustomers(10);
      
      // Use optimized query to get only future appointments
      const now = new Date().toISOString();
      const futureAppts = await CrmDB.getAppointmentsBetween(now, '9999-12-31T23:59:59.999Z');
      const nextByCustomer = new Map();
      futureAppts.forEach((a) => {
        const start = new Date(a.start);
        if (start <= new Date(now)) return;
        const cur = nextByCustomer.get(a.customerId);
        if (!cur || new Date(cur.start) > start) nextByCustomer.set(a.customerId, a);
      });
      recentsEl.innerHTML = customers.map((c) => {
        const next = nextByCustomer.get(c.id);
        let rightHtml = '';
        if (next) {
          const start = new Date(next.start);
          const dateStr = start.toLocaleDateString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const timeStr = start.toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: getLang() === 'en' });
          rightHtml = `<div class=\"next-apt-inline\"><div class=\"muted\">Next appointment: ${dateStr}</div><div class=\"brand\">${timeStr}</div></div>`;
        }
        return `
        <div class=\"list-item\" data-id=\"${c.id}\"> 
          <div>
            <div><strong>${escapeHtml(c.firstName || '')} ${escapeHtml(c.lastName || '')}</strong></div>
            <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${isTradie() ? ((c.addressLine1 || c.suburb) ? ` • ${escapeHtml((c.addressLine1 || c.suburb).trim())}` : '') : (c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : '')}</div>
          </div>
          ${rightHtml}
        </div>`;
      }).join('');
      recentsEl.querySelectorAll('.list-item').forEach((rowEl) => {
        rowEl.addEventListener('click', () => {
          const id = Number(rowEl.getAttribute('data-id'));
          if (!Number.isNaN(id)) navigate(`/customer?id=${encodeURIComponent(id)}`);
        });
      });
    }
    await refreshRecents();

    if (showAllCustomersBtn) {
      showAllCustomersBtn.addEventListener('click', async () => {
        if (allCustomersSection.classList.contains('hidden')) {
          // Show all customers section
          allCustomersSection.classList.remove('hidden');
          showAllCustomersBtn.textContent = 'Hide all customers ▴';
          
          // Load and display all customers
          await loadAllCustomers();
        } else {
          // Hide all customers section
          allCustomersSection.classList.add('hidden');
          showAllCustomersBtn.textContent = 'Show all customers ▾';
        }
      });
    }

    // Function to load and display all customers
    async function loadAllCustomers() {
      try {
        let allCustomers = await CrmDB.getAllCustomers();
        

        
        const sortedCustomers = [...allCustomers].sort((a, b) => {
          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName);
        });
        
        {
          const now = new Date();
          const allAppts = await CrmDB.getAllAppointments();
          const nextByCustomer = new Map();
          allAppts.forEach((a) => {
            const start = new Date(a.start);
            if (start <= now) return;
            const cur = nextByCustomer.get(a.customerId);
            if (!cur || new Date(cur.start) > start) nextByCustomer.set(a.customerId, a);
          });
          allCustomersList.innerHTML = sortedCustomers.map((c) => {
            const next = nextByCustomer.get(c.id);
            let rightHtml = '';
            if (next) {
              const start = new Date(next.start);
              const dateStr = start.toLocaleDateString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const timeStr = start.toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: getLang() === 'en' });
              rightHtml = `<div class=\"next-apt-inline\"><div class=\"muted\">Next appointment: ${dateStr}</div><div class=\"brand\">${timeStr}</div></div>`;
            }
            return `
            <div class=\"list-item\" data-first-letter=\"${(c.firstName || '').charAt(0).toUpperCase()}\" data-id=\"${c.id}\"> 
              <div>
                <div><strong>${escapeHtml(c.firstName || '')} ${escapeHtml(c.lastName || '')}</strong></div>
                <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${isTradie() ? ((c.addressLine1 || c.suburb) ? ` • ${escapeHtml((c.addressLine1 || c.suburb).trim())}` : '') : (c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : '')}</div>
              </div>
              ${rightHtml}
            </div>`;
          }).join('');
          allCustomersList.querySelectorAll('.list-item').forEach((rowEl) => {
            rowEl.addEventListener('click', () => {
              const id = Number(rowEl.getAttribute('data-id'));
              if (!Number.isNaN(id)) navigate(`/customer?id=${encodeURIComponent(id)}`);
            });
          });
        }
        
        // Set up alphabet scrollbar functionality
        setupAlphabetScrollbar();
      } catch (error) {
        allCustomersList.innerHTML = '<div class="muted">Error loading customers</div>';
      }
    }



    // Function to set up alphabet scrollbar functionality
    function setupAlphabetScrollbar() {
      const scrollbarLetters = document.querySelectorAll('.scrollbar-letter');
      const customerItems = document.querySelectorAll('#all-customers-list .list-item');
      
      scrollbarLetters.forEach(letterDiv => {
        letterDiv.addEventListener('click', () => {
          const targetLetter = letterDiv.dataset.letter;
          
          // Find the first customer starting with this letter
          const targetCustomer = Array.from(customerItems).find(item => 
            item.dataset.firstLetter === targetLetter
          );
          
          if (targetCustomer) {
            // Scroll to the customer
            targetCustomer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight the letter briefly
          }
        });
      });
    }
  }

  async function renderCustomer({ query }) {
    const id = Number(query.get('id'));
    if (!id) return renderNotFound();
    const customer = await CrmDB.getCustomerById(id);
    if (!customer) return renderNotFound();
    
    // Store customer ID globally for notes system
    window.currentCustomerId = id;
    window.currentCustomer = customer;

    appRoot.innerHTML = wrapWithSidebar(`
      <div class="card customer-view">
        <div class="view-header">
          <h2 class="customer-title" style="text-align: left; font-size: 24px; margin: 0; padding-left: 16px;">👤 ${escapeHtml((customer.firstName || '') + ' ' + (customer.lastName || ''))}</h2>
          <div class="view-actions" style="display: flex; gap: 8px;">
            ${renderNoteInputModeToggle({ compact: true })}
            <button id="reminder-btn" class="edit-btn-custom" title="Set Follow-up" aria-label="Set Follow-up" style="background: rgba(251,191,36,0.2); border: 2px solid rgba(251,191,36,0.4); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 10px 0 0 0; line-height: 1; font-size: 12px; cursor: pointer;">🔔</button>
            <button id="edit-btn" class="edit-btn-custom" title="Edit" aria-label="Edit" style="background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 10px 0 0 0; line-height: 1; font-size: 12px; cursor: pointer;">✏️</button>
          </div>
        </div>

        <div id="next-appointment-module" class="next-appointment" style="cursor: pointer;">
          <h3 style="margin:0 0 8px 0;">${t('nextAppointment')}</h3>
          <div id="next-appointment-content" class="next-appointment-content">
            <div class="loading">${t('loading')}...</div>
          </div>
        </div>

        <details id="appt-collapse" class="collapse">
          <summary class="summary-button" style="background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 10px 0 0 0; line-height: 1; font-size: 12px; cursor: pointer; font-weight: normal; padding-right: 28px; position: relative;">${t('bookAppointment')}</summary>
          <div class="collapse-body">
            <div class="grid-3">
              <div>
                <label>${t('bookingDate')}</label>
                <input type="datetime-local" id="appt-start" step="900" />
              </div>
              <div>
                <label>${t('duration')}</label>
                <div class="select-wrap">
                  <select id="appt-duration">
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="150">2.5 hours</option>
                    <option value="180">3 hours</option>
                    <option value="210">3.5 hours</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label>${appointmentTypeLabel()}</label>
                <div class="multi-select" id="appt-type-dropdown">
                  <div id="appt-type-display" class="multi-select-display" tabindex="0">${t('noneSelected')}</div>
                  <div class="dropdown-menu hidden" id="appt-type-menu">
                  ${generateServiceTypeOptions('appt-type-opt')}
                  </div>
                </div>
              </div>
            </div>
            <div class="row" style="margin-top:8px;">
              <button class="button" id="book-btn" style="background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 0; line-height: 1; font-size: 12px; cursor: pointer; font-weight: normal;">${t('book')}</button>
            </div>
          </div>
        </details>

        <div class="detail-list">
          <div class="detail-item"><span class="detail-icon">📞</span><span class="detail-label">Contact</span><span class="detail-value">${escapeHtml(customer.contactNumber || '—')}</span></div>
          ${!isTradie() ? `<div class="detail-item"><span class="detail-icon">📱</span><span class="detail-label">${t('socialMediaName')}</span><span class="detail-value">${escapeHtml(customer.socialMediaName || '—')}</span></div>` : ''}
          <div class="detail-item"><span class="detail-icon">💬</span><span class="detail-label">Referral</span><span class="detail-value">${escapeHtml(customer.referralNotes || '—')}</span></div>
          ${isTradie() && customer.preferredContactMethod ? `
          <div class="detail-item"><span class="detail-icon">❤️</span><span class="detail-label">Preferred Contact</span><span class="detail-value">${escapeHtml(customer.preferredContactMethod === 'phone' ? 'Phone Call' : customer.preferredContactMethod === 'sms' ? 'SMS' : customer.preferredContactMethod === 'email' ? 'Email' : customer.preferredContactMethod)}</span></div>
          ` : ''}
        </div>

        ${renderPinnedNotesSection()}

        ${isTradie() && (customer.addressLine1 || customer.suburb) ? `
        <div class="address-section" style="margin: 16px 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h3 style="margin: 0 0 8px 0; font-size: 14px;">📍 Address</h3>
              <div style="font-size: 14px; line-height: 1.5;">
                ${customer.addressLine1 ? escapeHtml(customer.addressLine1) + '<br>' : ''}
                ${customer.suburb ? escapeHtml(customer.suburb) : ''}${customer.state ? ' ' + escapeHtml(customer.state) : ''}${customer.postcode ? ' ' + escapeHtml(customer.postcode) : ''}
              </div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="copy-address-btn" class="button secondary" style="font-size: 12px; padding: 6px 10px;" title="Copy Address">📋 Copy</button>
              <button id="open-maps-btn" class="button secondary" style="font-size: 12px; padding: 6px 10px;" title="Open in Maps">🗺️ Maps</button>
            </div>
          </div>
        </div>
        ` : ''}

        ${isTradie() ? `
        <div class="recent-activity" style="margin: 16px 0; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <h3 style="margin: 0 0 12px 0; font-size: 14px;">📋 Recent Activity</h3>
          <div id="customer-recent-activity">
            <div class="muted" style="font-size: 12px; text-align: center;">Loading...</div>
          </div>
        </div>
        ` : ''}

        <div class="notes-view">
          <h3 style="margin:0 0 6px 0;">Notes</h3>
          <button type="button" class="add-note-btn" style="background: var(--brand); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 12px;">+ Add Note</button>
          <div class="notes-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>

        <div class="gallery" style="margin-top: 20px;">
          <h3 style="margin:0;">Images</h3>
          <div id="no-images-message" class="muted" style="margin-top:10px; display: none;">No images uploaded</div>
          <div id="image-grid" class="image-grid" style="margin-top:10px;"></div>
        </div>
      </div>
    `);

    // Images
    const imageGrid = document.getElementById('image-grid');
    
    // Image cache to prevent re-conversion of dataURL to blob
    window.currentImageCache = new Map();
    
    // Cleanup function to prevent memory leaks
    function cleanupImageCache() {
      window.currentImageCache.forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      window.currentImageCache.clear();
    }
    
    async function renderImageThumbHtml(img) {
      try {
        
        const hasBlob = !!(img.blob && img.blob.size > 0);
        const hasDataUrl = typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:image/');
        if (!hasBlob && !hasDataUrl) {
          return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
        }
        
        // Use cached URL if available
        let url = window.currentImageCache.get(img.id);
        if (!url) {
          try {
            // Check if we're on iPad Safari and use dataURL directly as fallback
            const isIpadSafari = /iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            
            if (isIpadSafari && hasDataUrl) {
              // Use dataURL directly for iPad Safari (more reliable)
              url = img.dataUrl;
            } else if (hasBlob) {
              // Use object URL for other browsers
              url = URL.createObjectURL(img.blob);
            } else {
              url = img.dataUrl;
            }
            window.currentImageCache.set(img.id, url);
          } catch (urlError) {
            // Fallback to dataURL if available
            if (hasDataUrl) {
              url = img.dataUrl;
            } else {
              return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Failed to create image URL</div>`;
            }
          }
        } else {
        }
        
        return `<div class="lazy-image-container" data-image-id="${img.id}" style="position: relative; min-height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <div class="image-placeholder" style="color: rgba(255,255,255,0.3); font-size: 12px;">Loading...</div>
          <img data-src="${url}" alt="${escapeHtml(img.name)}" data-image-id="${img.id}" class="clickable-image lazy-image" style="display: none; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" />
          <div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center; display: none;">Failed to load image</div>
        </div>`;
      } catch (error) {
        return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
      }
    }
    
    async function refreshImages() {
      const imgs = await CrmDB.getImagesByCustomerId(id);
      const noImagesMessage = document.getElementById('no-images-message');
      
      if (imgs.length === 0) {
        noImagesMessage.style.display = 'block';
        imageGrid.innerHTML = '';
      } else {
        noImagesMessage.style.display = 'none';
        imageGrid.innerHTML = (await Promise.all(imgs.map(renderImageThumbHtml))).join('');
        
        // Set up lazy loading for images
        setupLazyLoading(imgs);
      }
    }
    
    // Lazy loading setup with intersection observer
    function setupLazyLoading(imgs) {
      const lazyImages = imageGrid.querySelectorAll('.lazy-image');
      
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              
              
              // Load the image
              img.src = img.dataset.src;
              img.style.display = 'block';
              
              img.onload = () => {
                if (placeholder) placeholder.style.display = 'none';
              };
              
              img.onerror = () => {
                if (placeholder) placeholder.style.display = 'none';
                const errorDiv = container.querySelector('.image-error');
                if (errorDiv) errorDiv.style.display = 'block';
              };
              
              // Add click handler
              img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const imageId = parseInt(img.dataset.imageId);
                const index = imgs.findIndex(i => i.id === imageId);
                if (index !== -1) {
                  showImageViewer(imgs, index);
                }
              });
              
              observer.unobserve(img);
            }
          });
        }, {
          rootMargin: '50px 0px', // Start loading 50px before image comes into view
          threshold: 0.1
        });
        
        lazyImages.forEach((img, index) => {
          imageObserver.observe(img);
          
          // Fallback: load image after 2 seconds if intersection observer doesn't trigger
          setTimeout(() => {
            if (img.style.display === 'none' || !img.src) {
              img.src = img.dataset.src;
              img.style.display = 'block';
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              if (placeholder) placeholder.style.display = 'none';
            }
          }, 2000);
        });
      } else {
        // Fallback for browsers without IntersectionObserver
        lazyImages.forEach((img, index) => {
          img.src = img.dataset.src;
          img.style.display = 'block';
          img.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showImageViewer(imgs, index);
          });
        });
      }
    }
    
    await refreshImages();

    // Notes view render - load existing notes
    loadExistingNotes(id);
    
    // Add note button event listener
    document.querySelector('.add-note-btn').addEventListener('click', () => {
      openNoteEditorByMode(id);
    });
    bindNoteInputModeToggles(appRoot);

    // Load next appointment
    async function loadNextAppointment() {
      try {
        // Use the new optimized function instead of loading all appointments
        const futureAppointments = await CrmDB.getFutureAppointmentsForCustomer(id);
        
        const nextAppointmentContent = document.getElementById('next-appointment-content');
        
        if (futureAppointments.length > 0) {
          const nextApt = futureAppointments[0];
          const appointmentDate = new Date(nextApt.start);
          const formattedDate = appointmentDate.toLocaleDateString(getLang() === 'ja' ? 'ja-JP' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const formattedTime = appointmentDate.toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: getLang() === 'en'
          });
          
          nextAppointmentContent.innerHTML = `
            <div class="next-apt-details" data-appointment-id="${nextApt.id}">
              <div class="next-apt-date">${formattedDate}</div>
              <div class="next-apt-time">${formattedTime}</div>
              <div class="next-apt-service">${nextApt.title || 'No service type'}</div>
            </div>
          `;
        } else {
          nextAppointmentContent.innerHTML = `<div class="no-next-apt">${t('noUpcomingAppointments')}</div>`;
        }
      } catch (error) {
        const nextAppointmentContent = document.getElementById('next-appointment-content');
        nextAppointmentContent.innerHTML = `<div class="error">${t('errorLoadingAppointment')}</div>`;
      }
    }
    
    await loadNextAppointment();
    
    // Add click handler for next appointment module
    const nextAppointmentModule = document.getElementById('next-appointment-module');
    if (nextAppointmentModule) {
      nextAppointmentModule.addEventListener('click', () => {
        const appointmentDetails = nextAppointmentModule.querySelector('.next-apt-details');
        if (appointmentDetails && appointmentDetails.dataset.appointmentId) {
          const appointmentId = appointmentDetails.dataset.appointmentId;
          navigate(`/calendar?appointment=${encodeURIComponent(appointmentId)}`);
        }
      });
    }

    // Booking
    document.getElementById('book-btn').addEventListener('click', async () => {
      const startStr = document.getElementById('appt-start').value;
      const durationMin = parseInt(document.getElementById('appt-duration').value || '60', 10);
      const types = Array.from(document.querySelectorAll('.appt-type-opt'))
        .filter((el) => el.checked)
        .map((el) => el.value);
      if (!startStr) return alert(t('pleaseSelectDateTime'));
      const roundedStartLocal = roundDatetimeLocalToStep(startStr, 15);
      const startISO = new Date(roundedStartLocal).toISOString();
      const endISO = new Date(new Date(roundedStartLocal).getTime() + durationMin * 60000).toISOString();
      const typeLabel = types.length ? types.join(' + ') : '';
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      const title = typeLabel || (isTradie() ? 'Job' : 'Appointment');
      // Get default status (first status in pipeline, or 'scheduled' for hairdresser, 'lead' for tradie)
      const defaultStatus = (productConfig.statuses && productConfig.statuses[0]?.id) || 'scheduled';
      const appt = { customerId: id, title, start: startISO, end: endISO, status: defaultStatus, createdAt: new Date().toISOString() };
      const appointmentId = await CrmDB.createAppointment(appt);
      alert(t('appointmentBooked'));
      
      // Refresh the Next Appointment block to show the newly created appointment
      await loadNextAppointment();
    });

    // Enforce 15-minute steps in the native picker by snapping on change
    const apptStartEl = document.getElementById('appt-start');
    if (apptStartEl) {
      const handler = () => {
        if (!apptStartEl.value) return;
        apptStartEl.value = formatAsDatetimeLocal(roundDatetimeLocalToStep(apptStartEl.value, 15));
      };
      apptStartEl.addEventListener('change', handler);
      apptStartEl.addEventListener('blur', handler);
    }

    // Booking type dropdown behavior
    const typeDropdown = document.getElementById('appt-type-dropdown');
    const typeDisplay = document.getElementById('appt-type-display');
    const typeMenu = document.getElementById('appt-type-menu');
    function updateTypeSummary() {
      const selected = Array.from(document.querySelectorAll('.appt-type-opt'))
        .filter((el) => el.checked)
        .map((el) => el.value);
      const label = selected.length ? selected.join(' + ') : t('noneSelected');
      typeDisplay.textContent = label;
      if (selected.length === 0) {
        typeDisplay.classList.add('placeholder');
      } else {
        typeDisplay.classList.remove('placeholder');
      }
    }
    function toggleTypeMenu() {
      typeMenu.classList.toggle('hidden');
      typeDropdown.classList.toggle('open');
    }
    typeDisplay.addEventListener('click', toggleTypeMenu);
    typeDisplay.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTypeMenu(); } });
    typeMenu.addEventListener('change', updateTypeSummary);
      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('appt-type-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
          typeMenu.classList.add('hidden');
          typeDropdown.classList.remove('open');
        }
      });
    updateTypeSummary();


    // Edit customer functionality
    document.getElementById('edit-btn').addEventListener('click', () => {
      navigate(`/customer-edit?id=${encodeURIComponent(id)}`);
    });

    // Reminder button functionality
    document.getElementById('reminder-btn')?.addEventListener('click', () => {
      openCreateReminderModal(id, null);
    });

    // Load recent activity for tradie edition
    if (isTradie()) {
      loadCustomerRecentActivity(id);
      
      // Address buttons
      const copyAddressBtn = document.getElementById('copy-address-btn');
      if (copyAddressBtn) {
        copyAddressBtn.addEventListener('click', () => {
          const addressParts = [
            customer.addressLine1,
            customer.suburb,
            customer.state,
            customer.postcode
          ].filter(p => p);
          const fullAddress = addressParts.join(', ');
          
          if (navigator.clipboard) {
            navigator.clipboard.writeText(fullAddress).then(() => {
              copyAddressBtn.textContent = '✓ Copied';
              setTimeout(() => {
                copyAddressBtn.innerHTML = '📋 Copy';
              }, 2000);
            });
          } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = fullAddress;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyAddressBtn.textContent = '✓ Copied';
            setTimeout(() => {
              copyAddressBtn.innerHTML = '📋 Copy';
            }, 2000);
          }
        });
      }
      
      const openMapsBtn = document.getElementById('open-maps-btn');
      if (openMapsBtn) {
        openMapsBtn.addEventListener('click', () => {
          const addressParts = [
            customer.addressLine1,
            customer.suburb,
            customer.state,
            customer.postcode
          ].filter(p => p);
          const fullAddress = addressParts.join(', ');
          const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(fullAddress);
          window.open(mapsUrl, '_blank');
        });
      }
    }
}

  async function renderCustomerEdit({ query }) {
    const id = Number(query.get('id'));
    if (!id) return renderNotFound();
    const customer = await CrmDB.getCustomerById(id);
    if (!customer) return renderNotFound();
    
    // Store customer ID globally for notes system
    window.currentCustomerId = id;
    window.currentCustomer = customer;

    appRoot.innerHTML = wrapWithSidebar(`
      <div class="card">
        <div class="space-between">
          <h2>${t('edit')} ${t('customer')}</h2>
          <div style="display:flex; align-items:center; gap:12px;">
            ${renderNoteInputModeToggle({ compact: true })}
            <a class="button secondary" href="#/customer?id=${encodeURIComponent(id)}">${t('cancel')}</a>
          </div>
        </div>
        <div class="form" id="customer-form">
          <div class="grid-2">
            <div>
              <label>First Name</label>
              <div class="input-with-button">
                <input type="text" name="firstName" />
              </div>
            </div>
            <div>
              <label>Last Name</label>
              <div class="input-with-button">
                <input type="text" name="lastName" />
              </div>
            </div>
          </div>
          <div>
            <label>Contact Number</label>
            <div class="input-with-button">
              <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" />
            </div>
          </div>
          ${!isTradie() ? `
          <div>
            <label>${t('socialMediaName')}</label>
            <div class="input-with-button">
              <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" />
            </div>
          </div>
          ` : ''}
          <div>
            <label>Referral</label>
            <div class="input-with-button">
              <input type="text" name="referralNotes" />
            </div>
          </div>
          
          ${isTradie() ? `
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <strong style="font-size: 14px;">📍 Address</strong>
            <div style="margin-top: 12px;">
              <label style="font-size: 12px;">Street Address</label>
              <input type="text" name="addressLine1" placeholder="123 Main Street" />
            </div>
            <div class="grid-2" style="margin-top: 8px;">
              <div>
                <label style="font-size: 12px;">Suburb</label>
                <input type="text" name="suburb" placeholder="Suburb" />
              </div>
              <div class="grid-2">
                <div>
                  <label style="font-size: 12px;">State</label>
                  <select name="state">
                    <option value="">-</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="WA">WA</option>
                    <option value="SA">SA</option>
                    <option value="TAS">TAS</option>
                    <option value="ACT">ACT</option>
                    <option value="NT">NT</option>
                  </select>
                </div>
                <div>
                  <label style="font-size: 12px;">Postcode</label>
                  <input type="text" name="postcode" placeholder="0000" maxlength="4" />
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 12px;">
            <label style="font-size: 12px;">Preferred Contact Method</label>
            <select name="preferredContactMethod">
              <option value="">No preference</option>
              <option value="phone">📞 Phone Call</option>
              <option value="sms">💬 SMS</option>
              <option value="email">✉️ Email</option>
            </select>
          </div>
          ` : ''}
          ${usesExtendedAddressForm() ? `
          <div>
            <label>${t('address')}</label>
            <div class="input-with-button">
              <input type="text" name="addressLine1" placeholder="${t('addressLine1')}" />
            </div>
          </div>
          <div>
            <label>${t('addressLine2')}</label>
            <div class="input-with-button">
              <input type="text" name="addressLine2" placeholder="${t('addressLine2')}" />
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label>${t('suburb')}</label>
              <div class="input-with-button">
                <input type="text" name="suburb" placeholder="${t('suburb')}" />
              </div>
            </div>
            <div>
              <label>${t('state')}</label>
              <div class="input-with-button">
                <input type="text" name="state" placeholder="${t('state')}" />
              </div>
            </div>
          </div>
          <div class="grid-2">
            <div>
              <label>${t('postcode')}</label>
              <div class="input-with-button">
                <input type="text" name="postcode" placeholder="${t('postcode')}" />
              </div>
            </div>
            <div>
              <label>${t('country')}</label>
              <div class="input-with-button">
                <input type="text" name="country" placeholder="${t('country')}" />
              </div>
            </div>
          </div>
          ` : ''}
          
          <div>
            <label>Notes</label>
            ${renderPinnedNotesSection()}
            <button type="button" class="add-note-btn" style="background: var(--brand); color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 12px;">+ Add Note</button>
            <div class="notes-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
          </div>
          
          <div>
            <label>${t('attachImages')}</label>
            <input type="file" name="images" accept="image/*" multiple />
          </div>
          
          <div id="existing-images-section" style="margin-top: 16px;">
            <h4 style="margin: 0 0 8px 0;">Existing Images</h4>
            <div id="existing-images-grid" class="image-grid" style="margin-top: 8px;"></div>
          </div>
          
          <div class="row" style="margin-top: 10px;">
            <button class="button" id="save-btn">${t('saveChanges')}</button>
            <a class="button secondary" href="#/customer?id=${encodeURIComponent(id)}">${t('cancel')}</a>
            <button class="button secondary" id="delete-customer-btn" style="background: rgba(220,53,69,0.12); border-color: rgba(220,53,69,0.5); color: #ff7f8a;">Delete Customer</button>
          </div>
        </div>
      </div>
    `);

    const form = document.getElementById('customer-form');
    await attachAddressAutocomplete(form);
    setInputValue(form, 'firstName', customer.firstName || '');
    setInputValue(form, 'lastName', customer.lastName || '');
    setInputValue(form, 'contactNumber', customer.contactNumber || '');
    setInputValue(form, 'socialMediaName', customer.socialMediaName || '');
    setInputValue(form, 'referralNotes', customer.referralNotes || '');
    
    // Set address fields by product
    if (isTradie()) {
      setInputValue(form, 'addressLine1', customer.addressLine1 || '');
      setInputValue(form, 'suburb', customer.suburb || '');
      setInputValue(form, 'postcode', customer.postcode || '');
      
      // Set select values
      const stateSelect = form.querySelector('select[name="state"]');
      if (stateSelect && customer.state) {
        stateSelect.value = customer.state;
      }
      const contactMethodSelect = form.querySelector('select[name="preferredContactMethod"]');
      if (contactMethodSelect && customer.preferredContactMethod) {
        contactMethodSelect.value = customer.preferredContactMethod;
      }
    } else if (usesExtendedAddressForm()) {
      setInputValue(form, 'addressLine1', customer.addressLine1 || '');
      setInputValue(form, 'addressLine2', customer.addressLine2 || '');
      setInputValue(form, 'suburb', customer.suburb || '');
      setInputValue(form, 'state', customer.state || '');
      setInputValue(form, 'postcode', customer.postcode || '');
      setInputValue(form, 'country', customer.country || '');
    }

    // Initialize add note button functionality
    document.querySelector('.add-note-btn').addEventListener('click', () => {
      openNoteEditorByMode(customer.id);
    });
    bindNoteInputModeToggles(appRoot);
    
    // Load existing notes
    loadExistingNotes(customer.id);
    
    // Load and display existing images
    const existingImagesGrid = document.getElementById('existing-images-grid');
    
    // Image cache for edit view
    window.currentEditImageCache = new Map();
    
    // Cleanup function for edit view
    function cleanupEditImageCache() {
      window.currentEditImageCache.forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      window.currentEditImageCache.clear();
    }
    
    async function renderImageThumbHtml(img) {
      try {
        const hasBlob = !!(img.blob && img.blob.size > 0);
        const hasDataUrl = typeof img.dataUrl === 'string' && img.dataUrl.startsWith('data:image/');
        if (!hasBlob && !hasDataUrl) {
          return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
        }
        
        // Use cached URL if available
        let url = window.currentEditImageCache.get(img.id);
        if (!url) {
          url = hasBlob ? URL.createObjectURL(img.blob) : img.dataUrl;
          window.currentEditImageCache.set(img.id, url);
        }
        
        return `<div class="lazy-image-container" data-image-id="${img.id}" style="position: relative; min-height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <div class="image-placeholder" style="color: rgba(255,255,255,0.3); font-size: 12px;">Loading...</div>
          <img data-src="${url}" alt="${escapeHtml(img.name)}" data-image-id="${img.id}" class="clickable-image lazy-image" style="display: none; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" />
          <div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center; display: none;">Failed to load image</div>
        </div>`;
      } catch (error) {
        return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
      }
    }
    
    async function loadExistingImages() {
      try {
        const imgs = await CrmDB.getImagesByCustomerId(id);
        if (imgs.length === 0) {
          existingImagesGrid.innerHTML = '<div class="muted">No images uploaded yet</div>';
          return;
        }
        
        existingImagesGrid.innerHTML = (await Promise.all(imgs.map(renderImageThumbHtml))).join('');
        
        // Set up lazy loading for images in edit view
        setupEditLazyLoading(imgs);
      } catch (error) {
        existingImagesGrid.innerHTML = '<div class="error">Error loading images</div>';
      }
    }
    
    // Lazy loading setup for edit view
    function setupEditLazyLoading(imgs) {
      const lazyImages = existingImagesGrid.querySelectorAll('.lazy-image');
      
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              
              
              // Load the image
              img.src = img.dataset.src;
              img.style.display = 'block';
              
              img.onload = () => {
                if (placeholder) placeholder.style.display = 'none';
              };
              
              img.onerror = () => {
                if (placeholder) placeholder.style.display = 'none';
                const errorDiv = container.querySelector('.image-error');
                if (errorDiv) errorDiv.style.display = 'block';
              };
              
              // Add click handler
              img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const imageId = parseInt(img.dataset.imageId);
                const index = imgs.findIndex(i => i.id === imageId);
                if (index !== -1) {
                  showImageViewer(imgs, index);
                }
              });
              
              observer.unobserve(img);
            }
          });
        }, {
          rootMargin: '50px 0px',
          threshold: 0.1
        });
        
        lazyImages.forEach((img, index) => {
          imageObserver.observe(img);
          
          // Fallback: load image after 2 seconds if intersection observer doesn't trigger
          setTimeout(() => {
            if (img.style.display === 'none' || !img.src) {
              img.src = img.dataset.src;
              img.style.display = 'block';
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              if (placeholder) placeholder.style.display = 'none';
            }
          }, 2000);
        });
      } else {
        // Fallback for browsers without IntersectionObserver
        lazyImages.forEach((img, index) => {
          img.src = img.dataset.src;
          img.style.display = 'block';
          img.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showImageViewer(imgs, index);
          });
        });
      }
    }
    
    await loadExistingImages();

    document.getElementById('save-btn').addEventListener('click', async () => {
      // Check if canvas has meaningful content
      let notesImageData = customer.notesImageData || '';
      let hasNotes = false;
      
      if (shouldUseCanvasNoteInput() && fullscreenNotesCanvas && fullscreenNotesCanvas.canvas && fullscreenNotesCanvas.strokes && fullscreenNotesCanvas.strokes.length > 0) {
        notesImageData = fullscreenNotesCanvas.getImageData();
        hasNotes = true;
      }
      
      const updated = {
        ...customer,
        firstName: getInputValue(form, 'firstName').trim(),
        lastName: getInputValue(form, 'lastName').trim(),
        contactNumber: getInputValue(form, 'contactNumber').trim(),
        socialMediaName: getInputValue(form, 'socialMediaName').trim(),
        referralNotes: getInputValue(form, 'referralNotes').trim(),
        notesImageData: hasNotes ? notesImageData : '',
        updatedAt: new Date().toISOString(),
      };
      
      // Add product-specific address fields
      if (isCustomerFieldEnabled('addressLine1')) updated.addressLine1 = getInputValue(form, 'addressLine1')?.trim() || '';
      if (isCustomerFieldEnabled('addressLine2')) updated.addressLine2 = getInputValue(form, 'addressLine2')?.trim() || '';
      if (isCustomerFieldEnabled('suburb')) updated.suburb = getInputValue(form, 'suburb')?.trim() || '';
      if (isCustomerFieldEnabled('state')) {
        updated.state = form.querySelector('select[name="state"]')?.value || getInputValue(form, 'state')?.trim() || '';
      }
      if (isCustomerFieldEnabled('postcode')) updated.postcode = getInputValue(form, 'postcode')?.trim() || '';
      if (isCustomerFieldEnabled('country')) updated.country = getInputValue(form, 'country')?.trim() || '';
      if (isTradie()) {
        updated.preferredContactMethod = form.querySelector('select[name="preferredContactMethod"]')?.value || '';
      }
      
      try {
        await CrmDB.updateCustomer(updated);
        
        // Handle new image uploads
        const imageFiles = form.querySelector('input[name="images"]').files;
        if (imageFiles && imageFiles.length > 0) {
          const entries = await CrmDB.fileListToEntries(imageFiles);
          // Process images one by one to avoid transaction timeout
          for (const entry of entries) {
            await CrmDB.addImage(id, entry);
          }
        }
        
        navigate(`/customer?id=${encodeURIComponent(id)}`);
      } catch (error) {
        console.error('Error saving customer:', error);
        alert(`Error saving customer: ${error.message || 'Please try again.'}`);
      }
    });

    document.getElementById('delete-customer-btn').addEventListener('click', async () => {
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'this customer';
      if (!confirm(`Are you sure you want to delete ${customerName}? This will also delete all their appointments and images. This action cannot be undone.`)) {
        return;
      }

      try {
        await CrmDB.deleteCustomer(id);
        alert('Customer deleted successfully');
        navigate('/find');
      } catch (error) {
        alert('Error deleting customer. Please try again.');
      }
    });
  }

  async function renderCalendar() {
    // Check if we have an appointment parameter to open
    const currentPath = window.location.hash;
    const appointmentMatch = currentPath.match(/[?&]appointment=([^&]+)/);
    const appointmentId = appointmentMatch ? appointmentMatch[1] : null;
    const compactNewAppointmentButton = useSidebarMenuOnPortraitMobile();
    const compactCalendarToolbar = useSidebarMenuOnPortraitMobile();
    let calendar = null;
    const calendarHeaderToolbar = compactCalendarToolbar
      ? {
          left: 'prev',
          center: 'title',
          right: 'next'
        }
      : {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listWeek'
        };

    function toLocalYmd(dateValue) {
      const d = new Date(dateValue);
      if (!Number.isFinite(d.getTime())) return null;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function decorateMobileMonthDots() {
      if (!compactCalendarToolbar || !calendar || calendar.view?.type !== 'dayGridMonth') return;
      const dayCells = calendarEl.querySelectorAll('.fc-daygrid-day[data-date]');
      const eventDays = new Set();
      calendar.getEvents().forEach((event) => {
        if (!event.start) return;
        const day = toLocalYmd(event.start);
        if (day) eventDays.add(day);
      });
      dayCells.forEach((cell) => {
        const date = cell.getAttribute('data-date');
        const hasEvent = !!date && eventDays.has(date);
        cell.classList.toggle('fc-mobile-has-event', hasEvent);
      });
    }
    
    appRoot.innerHTML = wrapWithSidebar(`
        <div class="space-between section-header">
          <h2>${usesJobPipeline() ? appointmentEntityPlural() : t('calendar')}</h2>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            ${usesJobPipeline() ? `
            <div class="view-toggle" style="display: flex; gap: 4px;">
              <button id="calendar-view-btn" class="button" style="padding: 6px 12px; font-size: 12px;">${t('calendar')}</button>
              <button id="pipeline-view-btn" class="button secondary" style="padding: 6px 12px; font-size: 12px;">${t('pipeline')}</button>
            </div>
            <div class="payment-filters" style="display: flex; gap: 4px;">
              <button id="filter-all-btn" class="button" style="padding: 6px 10px; font-size: 11px;">${t('all')}</button>
              <button id="filter-needs-invoice-btn" class="button secondary" style="padding: 6px 10px; font-size: 11px;">📄 ${t('needsInvoice')}</button>
              <button id="filter-unpaid-btn" class="button secondary" style="padding: 6px 10px; font-size: 11px;">💰 ${t('unpaid')}</button>
            </div>
            ` : ''}
            <button id="new-appointment-btn" style="
              background: var(--brand);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 8px 16px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.2s ease;
            ">
              ${compactNewAppointmentButton
                ? `<span>+</span>`
                : `<span>+</span><span>${usesJobPipeline() ? `New ${appointmentEntitySingular()}` : t('newAppointment')}</span>`}
            </button>
          </div>
        </div>
      ${compactCalendarToolbar ? `
      <div class="calendar-mobile-controls" aria-label="Calendar controls">
        <button id="calendar-mobile-today-btn" class="button secondary">${t('today')}</button>
        <div class="calendar-mobile-view-group">
          <button id="calendar-mobile-list-btn" class="button secondary">${t('list')}</button>
          <button id="calendar-mobile-month-btn" class="button secondary">${t('month')}</button>
        </div>
      </div>
      ` : ''}
      <div class="card" id="calendar-container">
        <div id="calendar"></div>
      </div>
      ${usesJobPipeline() ? `
      <div class="card hidden" id="pipeline-container">
        <div id="pipeline" class="pipeline-view"></div>
      </div>
      ` : ''}
    `);

    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'listWeek',
      headerToolbar: calendarHeaderToolbar,
      height: 'auto',
      selectable: true,
      locale: getLang(),
      // Month view: show only first event with a +n link
      dayMaxEvents: 1,
      moreLinkContent: (arg) => {
        // Display as "+ n"
        return { html: `+ ${arg.num}` };
      },
      buttonText: {
        today: t('today'),
        month: t('month'),
        week: t('week'),
        day: t('day'),
        list: t('list')
      },
      dayHeaderFormat: { weekday: 'short' },
      datesSet: (info) => {
        if (!compactCalendarToolbar) return;
        const todayBtn = document.getElementById('calendar-mobile-today-btn');
        const listBtn = document.getElementById('calendar-mobile-list-btn');
        const monthBtn = document.getElementById('calendar-mobile-month-btn');
        const isList = info.view.type === 'listWeek';
        const isMonth = info.view.type === 'dayGridMonth';
        listBtn?.classList.toggle('secondary', !isList);
        monthBtn?.classList.toggle('secondary', !isMonth);
        if (listBtn && isList) listBtn.classList.remove('secondary');
        if (monthBtn && isMonth) monthBtn.classList.remove('secondary');
        todayBtn?.classList.add('secondary');
        setTimeout(decorateMobileMonthDots, 0);
      },
      eventsSet: () => {
        if (!compactCalendarToolbar) return;
        setTimeout(decorateMobileMonthDots, 0);
      },
      events: async (info, successCallback, failureCallback) => {
        try {
          const events = await CrmDB.getAppointmentsBetween(info.start.toISOString(), info.end.toISOString());
          const customers = await CrmDB.getAllCustomers();
          const idToCustomer = new Map(customers.map(c => [c.id, c]));
          const mapped = events.map((e) => {
            const customer = idToCustomer.get(e.customerId);
            const fallbackName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '';
            const mappedEvent = {
              id: String(e.id),
              title: e.title || appointmentEntitySingular(),
              start: e.start,
              end: e.end,
              extendedProps: { 
                customerId: e.customerId,
                customerName: fallbackName,
                customerInitials: customer ? getInitials(customer.firstName, customer.lastName) : '',
                bookingType: e.title || '',
                status: e.status || 'scheduled',
                quotedAmount: e.quotedAmount || null,
                invoiceAmount: e.invoiceAmount || null,
                paidAmount: e.paidAmount || null
              }
            };
            return mappedEvent;
          });
          successCallback(mapped);
        } catch (err) { 
          console.error('Error loading calendar events:', err);
          failureCallback(err); 
        }
      },
      eventContent: (arg) => {
        const time = new Date(arg.event.start).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        const initials = arg.event.extendedProps.customerInitials || '';
        
        // Render similar content for list and month views
        const customerName = arg.event.extendedProps.customerName || '';
        const bookingType = arg.event.extendedProps.bookingType || '';
        const status = arg.event.extendedProps.status || 'scheduled';
        const start = new Date(arg.event.start);
        const end = new Date(arg.event.end);
        const durationMs = end - start;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const duration = durationMinutes > 0 ? `${durationMinutes}m` : '';
        
        // Get status badge HTML for tradie edition
        const statusBadgeHtml = usesJobPipeline() ? getStatusBadge(status) : '';

        // Custom content only for list and month views. Week/day views use FullCalendar defaults.
        if (arg.view.type === 'listWeek' || arg.view.type === 'dayGridMonth') {
          return {
            html: `
              <div class="fc-list-event-content">
                <div class="custom-start-time">${time}</div>
                ${duration ? `<div class="custom-duration">${duration}</div>` : ''}
                ${statusBadgeHtml ? `<div style="margin-left: auto;">${statusBadgeHtml}</div>` : ''}
                ${customerName ? `<div class="fc-list-event-customer">${customerName}</div>` : ''}
                ${bookingType ? `<div class="fc-list-event-type">${bookingType}</div>` : ''}
              </div>
            `
          };
        }
        // Return undefined to allow default rendering for timeGridWeek/timeGridDay
      },
      eventClick: async (info) => {
        // Open appointment details modal instead of navigating to customer
        openAppointmentDetailsModal(info.event);
      },
      dateClick: (info) => {
        openQuickBookModal(info.dateStr);
      }
    });
    
    // Set global calendar reference
    globalCalendar = calendar;
    
    calendar.render();
    decorateMobileMonthDots();

    if (compactCalendarToolbar) {
      const todayBtn = document.getElementById('calendar-mobile-today-btn');
      const listBtn = document.getElementById('calendar-mobile-list-btn');
      const monthBtn = document.getElementById('calendar-mobile-month-btn');
      todayBtn?.addEventListener('click', () => {
        calendar.today();
      });
      listBtn?.addEventListener('click', () => {
        calendar.changeView('listWeek');
      });
      monthBtn?.addEventListener('click', () => {
        calendar.changeView('dayGridMonth');
      });
    }
    
    // Add event listener for new appointment button
    document.getElementById('new-appointment-btn').addEventListener('click', () => {
      // Open quick book modal with today's date (local timezone)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      openQuickBookModal(todayStr);
    });
    
    // Current filter state
    let currentFilter = 'all';
    
    // Set up view toggle for tradie edition
    if (usesJobPipeline()) {
      const calendarViewBtn = document.getElementById('calendar-view-btn');
      const pipelineViewBtn = document.getElementById('pipeline-view-btn');
      const calendarContainer = document.getElementById('calendar-container');
      const pipelineContainer = document.getElementById('pipeline-container');

      function adjustPipelineHeight() {
        if (!pipelineContainer || pipelineContainer.classList.contains('hidden')) return;
        const rect = pipelineContainer.getBoundingClientRect();
        const available = window.innerHeight - rect.top - 16; // keep small bottom breathing room
        pipelineContainer.style.height = `${Math.max(320, Math.floor(available))}px`;
      }

      // Keep pipeline height responsive without stacking duplicate listeners
      if (window.__pipelineResizeHandler) {
        window.removeEventListener('resize', window.__pipelineResizeHandler);
      }
      window.__pipelineResizeHandler = adjustPipelineHeight;
      window.addEventListener('resize', window.__pipelineResizeHandler);
      
      // Payment filter buttons
      const filterAllBtn = document.getElementById('filter-all-btn');
      const filterNeedsInvoiceBtn = document.getElementById('filter-needs-invoice-btn');
      const filterUnpaidBtn = document.getElementById('filter-unpaid-btn');
      
      function updateFilterButtons(activeFilter) {
        currentFilter = activeFilter;
        filterAllBtn?.classList.toggle('secondary', activeFilter !== 'all');
        filterNeedsInvoiceBtn?.classList.toggle('secondary', activeFilter !== 'needs-invoice');
        filterUnpaidBtn?.classList.toggle('secondary', activeFilter !== 'unpaid');
        if (filterAllBtn && activeFilter === 'all') filterAllBtn.classList.remove('secondary');
      }
      
      filterAllBtn?.addEventListener('click', async () => {
        updateFilterButtons('all');
        await renderPipelineView();
      });
      
      filterNeedsInvoiceBtn?.addEventListener('click', async () => {
        updateFilterButtons('needs-invoice');
        await renderPipelineView();
      });
      
      filterUnpaidBtn?.addEventListener('click', async () => {
        updateFilterButtons('unpaid');
        await renderPipelineView();
      });
      
      if (calendarViewBtn && pipelineViewBtn) {
        calendarViewBtn.addEventListener('click', () => {
          calendarViewBtn.classList.remove('secondary');
          pipelineViewBtn.classList.add('secondary');
          calendarContainer.classList.remove('hidden');
          pipelineContainer.classList.add('hidden');
        });
        
        pipelineViewBtn.addEventListener('click', async () => {
          pipelineViewBtn.classList.remove('secondary');
          calendarViewBtn.classList.add('secondary');
          pipelineContainer.classList.remove('hidden');
          calendarContainer.classList.add('hidden');
          adjustPipelineHeight();
          // Render pipeline view
          await renderPipelineView();
        });
      }
    }
    
    // If we have an appointment ID, open it after calendar loads
    if (appointmentId) {
      // Wait for calendar to fully load events and then open the appointment
      const openAppointment = async () => {
        try {
          const appointment = await CrmDB.getAppointmentById(appointmentId);
          if (appointment) {
            // Navigate to the date of the appointment
            calendar.gotoDate(appointment.start);
            
            // Wait a bit for the calendar to update, then open the appointment details modal
            setTimeout(() => {
              const event = calendar.getEventById(appointmentId);
              if (event) {
                openAppointmentDetailsModal(event);
              }
            }, 500);
          }
        } catch (error) {
        }
      };
      
      // Wait for events to load, then open appointment
      setTimeout(openAppointment, 1000);
    }

    // Render pipeline/kanban view for tradie edition
    async function renderPipelineView() {
      const pipelineEl = document.getElementById('pipeline');
      if (!pipelineEl) return;
      
      pipelineEl.innerHTML = `<div class="muted" style="text-align: center; padding: 20px;">${t('loadingJobs')}</div>`;
      
      try {
        const statuses = productConfig.statuses || [];
        const grouped = await CrmDB.getAppointmentsGroupedByStatus();
        const customers = await CrmDB.getAllCustomers();
        const idToCustomer = new Map(customers.map(c => [c.id, c]));
        
        // Apply payment filter
        const filterJob = (job) => {
          if (currentFilter === 'all') return true;
          
          const invoiced = job.invoiceAmount || 0;
          const paid = job.paidAmount || 0;
          const status = job.status || 'scheduled';
          const completedStatuses = ['completed', 'invoiced', 'paid'];
          
          if (currentFilter === 'needs-invoice') {
            return completedStatuses.includes(status) && invoiced === 0;
          }
          if (currentFilter === 'unpaid') {
            return invoiced > 0 && paid < invoiced;
          }
          return true;
        };
        
        // Build pipeline HTML
        let pipelineHtml = '';
        let totalVisibleJobs = 0;
        
        for (const status of statuses) {
          const allJobs = grouped[status.id] || [];
          const jobs = allJobs.filter(filterJob);
          const count = jobs.length;
          totalVisibleJobs += count;
          
          pipelineHtml += `
            <div class="pipeline-column">
              <div class="pipeline-column-header">
                <span class="pipeline-column-title" style="color: ${status.color};">${status.label}</span>
                <span class="pipeline-column-count">${count}</span>
              </div>
              <div class="pipeline-column-jobs" data-status="${status.id}">
          `;
          
          for (const job of jobs) {
            const customer = idToCustomer.get(job.customerId);
            const customerName = customer 
              ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() 
              : 'Unknown Customer';
            const jobType = job.title || 'No type';
            const jobDate = new Date(job.start);
            const dateStr = jobDate.toLocaleDateString(getLang() === 'ja' ? 'ja-JP' : 'en-AU', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            });
            const timeStr = jobDate.toLocaleTimeString(getLang() === 'ja' ? 'ja-JP' : 'en-AU', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            // Payment indicator
            const quoted = job.quotedAmount || 0;
            const invoiced = job.invoiceAmount || 0;
            const paid = job.paidAmount || 0;
            let paymentBadge = '';
            if (paid > 0 && paid >= invoiced && invoiced > 0) {
              paymentBadge = '<span style="color: #22c55e; font-size: 11px;">✓ Paid</span>';
            } else if (paid > 0 && paid < invoiced) {
              paymentBadge = '<span style="color: #f97316; font-size: 11px;">◐ Part Paid</span>';
            } else if (invoiced > 0) {
              paymentBadge = '<span style="color: #60a5fa; font-size: 11px;">📄 Invoiced</span>';
            } else if (quoted > 0) {
              paymentBadge = `<span style="color: #a78bfa; font-size: 11px;">$${quoted.toLocaleString()}</span>`;
            }
            
            pipelineHtml += `
              <div class="pipeline-job-card" data-job-id="${job.id}" data-customer-id="${job.customerId}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div class="pipeline-job-customer">${escapeHtml(customerName)}</div>
                  ${paymentBadge ? `<div>${paymentBadge}</div>` : ''}
                </div>
                <div class="pipeline-job-type">${escapeHtml(jobType)}</div>
                <div class="pipeline-job-date">${dateStr} at ${timeStr}</div>
              </div>
            `;
          }
          
          pipelineHtml += `
              </div>
            </div>
          `;
        }
        
        if (totalVisibleJobs === 0) {
          pipelineEl.innerHTML = `
            <div class="pipeline-empty-state">
              No ${appointmentEntityPlural().toLowerCase()} found. Tap the New ${appointmentEntitySingular()} button to add one.
            </div>
          `;
          adjustPipelineHeight();
          return;
        }

        pipelineEl.innerHTML = pipelineHtml;
        adjustPipelineHeight();
        
        // Add click handlers for job cards
        pipelineEl.querySelectorAll('.pipeline-job-card').forEach(card => {
          card.addEventListener('click', async () => {
            const jobId = card.dataset.jobId;
            if (jobId) {
              // Fetch the job and open the modal
              const job = await CrmDB.getAppointmentById(jobId);
              if (job) {
                const customer = idToCustomer.get(job.customerId);
                // Create a mock event object for the modal
                const mockEvent = {
                  id: String(job.id),
                  title: job.title,
                  start: new Date(job.start),
                  end: new Date(job.end),
                  extendedProps: {
                    customerId: job.customerId,
                    customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '',
                    status: job.status || 'scheduled',
                    quotedAmount: job.quotedAmount || null,
                    invoiceAmount: job.invoiceAmount || null,
                    paidAmount: job.paidAmount || null
                  },
                  toPlainObject: () => job
                };
                openAppointmentDetailsModal(mockEvent);
              }
            }
          });
        });
        
      } catch (error) {
        console.error('Error rendering pipeline view:', error);
        pipelineEl.innerHTML = `<div class="error" style="text-align: center; padding: 20px;">${t('errorLoadingJobs')}</div>`;
      }
    }

    function openQuickBookModal(dateStr) {
      showModal(`
        <div class="modal">
          <h3 style="margin-top:0;">${t('quickBook')}</h3>
          <div class="form">
            <label>${t('customer')}</label>
            <div id="qb-customer-area">
              <div id="qb-search-area">
                <input type="text" id="qb-customer-search" placeholder="${t('searchPlaceholder')}" />
                <div id="qb-results" class="list" style="max-height: 180px; overflow:auto; margin-top:6px;"></div>
              </div>
              <div id="qb-selected-area" class="selected-row hidden" style="margin: 4px 0 6px 0;">
                <h4 id="qb-selected-name" style="margin:0;">&nbsp;</h4>
                <button id="qb-clear" class="icon-btn" title="Clear selection" aria-label="Clear">✖</button>
              </div>
            </div>

            <label>${t('titleOptional')}</label>
            <input type="text" id="qb-title" placeholder="${t('titleOptional')}" />

            <div class="grid-2" style="margin-top: 6px;">
              <div>
                <label>${t('bookingDate')}</label>
                <input type="datetime-local" id="qb-start" step="900" />
              </div>
              <div>
                <label>${t('duration')}</label>
                <div class="select-wrap"><select id="qb-duration">
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select></div>
              </div>
            </div>

            <div>
              <label>${appointmentTypeLabel()}</label>
              <div class="multi-select" id="qb-type-dropdown">
                <div id="qb-type-display" class="multi-select-display" tabindex="0">${t('noneSelected')}</div>
                <div class="dropdown-menu hidden" id="qb-type-menu">
                  ${generateServiceTypeOptions('qb-type-opt')}
                </div>
              </div>
            </div>

            <div class="row" style="margin-top:8px;">
              <button class="button" id="qb-save">Save</button>
              <button class="button secondary" id="qb-cancel">Cancel</button>
            </div>
          </div>
        </div>
      `);

      // Prefill date
      const startInput = document.getElementById('qb-start');
      startInput.value = dateStr + 'T09:00';
      document.getElementById('qb-cancel').onclick = hideModal;

      // Snap to 15-minute steps on change/blur
      const qbHandler = () => {
        if (!startInput.value) return;
        startInput.value = formatAsDatetimeLocal(roundDatetimeLocalToStep(startInput.value, 15));
      };
      startInput.addEventListener('change', qbHandler);
      startInput.addEventListener('blur', qbHandler);

      // Customer search
      let selectedCustomer = null;
      const searchEl = document.getElementById('qb-customer-search');
      const resultsEl = document.getElementById('qb-results');
      const selectedArea = document.getElementById('qb-selected-area');
      const selectedNameEl = document.getElementById('qb-selected-name');
      const searchArea = document.getElementById('qb-search-area');
      const clearBtn = document.getElementById('qb-clear');

      async function doSearch() {
        const query = (searchEl.value || '').trim();
        if (query.length < 1) { resultsEl.innerHTML = ''; return; }
        const people = await CrmDB.searchCustomers(query);
        resultsEl.innerHTML = people.slice(0, 8).map((c) => `
          <button type="button" class="list-item" data-id="${c.id}">
            <div>
             <div><strong>${escapeHtml(c.firstName || '')} ${escapeHtml(c.lastName || '')}</strong></div>
              <div class="muted">${escapeHtml(c.contactNumber || '')}</div>
            </div>
            <span class="muted">Select</span>
          </button>
        `).join('');
        resultsEl.querySelectorAll('button.list-item').forEach((btn) => {
          btn.addEventListener('click', () => {
            const id = Number(btn.getAttribute('data-id'));
            selectedCustomer = people.find((p) => p.id === id) || null;
            if (selectedCustomer) {
              selectedNameEl.textContent = `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim();
              resultsEl.innerHTML = '';
              searchArea.classList.add('hidden');
              selectedArea.classList.remove('hidden');
            }
          });
        });
      }
      searchEl.addEventListener('input', debounce(doSearch, 200));
      // Do not show suggestions until user types

      clearBtn.addEventListener('click', () => {
        selectedCustomer = null;
        selectedNameEl.textContent = '';
        selectedArea.classList.add('hidden');
        searchArea.classList.remove('hidden');
        searchEl.value = '';
        resultsEl.innerHTML = '';
        searchEl.focus();
      });

      // Booking type dropdown behavior
      const typeDropdown = document.getElementById('qb-type-dropdown');
      const typeDisplay = document.getElementById('qb-type-display');
      const typeMenu = document.getElementById('qb-type-menu');
      function updateTypeSummary() {
        const selected = Array.from(document.querySelectorAll('.qb-type-opt'))
          .filter((el) => el.checked)
          .map((el) => el.value);
        const label = selected.length ? selected.join(' + ') : t('noneSelected');
        typeDisplay.textContent = label;
        if (selected.length === 0) typeDisplay.classList.add('placeholder'); else typeDisplay.classList.remove('placeholder');
      }
      function toggleTypeMenu() { typeMenu.classList.toggle('hidden'); typeDropdown.classList.toggle('open'); }
      typeDisplay.addEventListener('click', toggleTypeMenu);
      typeDisplay.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTypeMenu(); } });
      typeMenu.addEventListener('change', updateTypeSummary);
      document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('qb-type-dropdown');
        if (dropdown && !dropdown.contains(e.target)) {
          typeMenu.classList.add('hidden');
          typeDropdown.classList.remove('open');
        }
      });
      updateTypeSummary();

      // Save
      document.getElementById('qb-save').onclick = async () => {
        if (!selectedCustomer) { alert(t('pleaseSelectCustomer')); return; }
        const titleInput = document.getElementById('qb-title').value.trim();
        const startStr = document.getElementById('qb-start').value;
        const durationMin = parseInt(document.getElementById('qb-duration').value || '60', 10);
        if (!startStr) { alert(t('pleaseSelectDateTime')); return; }
        const types = Array.from(document.querySelectorAll('.qb-type-opt'))
          .filter((el) => el.checked)
          .map((el) => el.value);
        const typeLabel = types.length ? types.join(' + ') : '';
        const fullName = `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim();
        const title = typeLabel || titleInput || 'No service type';
        const roundedStartLocal = roundDatetimeLocalToStep(startStr, 15);
        
        // Convert to ISO string properly, preserving the local date/time
        const startDate = new Date(roundedStartLocal);
        const startISO = startDate.toISOString();
        const endDate = new Date(startDate.getTime() + durationMin * 60000);
        const endISO = endDate.toISOString();
        
        // Get default status (first status in pipeline)
        const defaultStatus = (productConfig.statuses && productConfig.statuses[0]?.id) || 'scheduled';
        const appointmentId = await CrmDB.createAppointment({ customerId: selectedCustomer.id, title, start: startISO, end: endISO, status: defaultStatus, createdAt: new Date().toISOString() });
        
        hideModal();
        
        // Refresh calendar if it exists
        if (globalCalendar) {
          globalCalendar.refetchEvents();
        }
        
        // Refresh customer pages if they're open
        refreshCustomerPages();
        
        // Show success message
        alert(t('appointmentBooked'));
      };
    }
  }

  // Function to refresh customer pages when appointments are created
  function refreshCustomerPages() {
    // Check if we're currently on a customer page and refresh it
    const currentPath = window.location.hash;
    const customerMatch = currentPath.match(/[?&]id=([^&]+)/);
    
    if (customerMatch) {
      const customerId = customerMatch[1];
      // Re-render the customer page to show the new appointment
      const query = new URLSearchParams(window.location.search);
      query.set('id', customerId);
      renderCustomer({ query });
    }
  }

  function renderNotFound() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="card">
        <h2>${t('notFound')}</h2>
        <a class="button" href="#/">${t('goHome')}</a>
      </div>
    `);
  }

  function openAppointmentDetailsModal(event) {
    // Get customer details for the appointment
    
    if (!event.extendedProps.customerId) {
      alert('Error: Appointment data is corrupted. Cannot load appointment details.');
      return;
    }
    
    CrmDB.getCustomerById(event.extendedProps.customerId).then(customer => {
      if (!customer) {
        alert('Customer not found');
        return;
      }

      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const duration = Math.round((endDate - startDate) / 60000); // Duration in minutes
      
      // Format dates for datetime-local input - use local timezone
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const hours = String(startDate.getHours()).padStart(2, '0');
      const minutes = String(startDate.getMinutes()).padStart(2, '0');
      const startStr = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      showModal(`
        <div class="modal">
          <h3 style="margin-top:0;">${t('appointmentDetails')}</h3>
          <div class="form">
            <label>${t('customer')}</label>
            <div id="apt-customer-link" style="padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" tabindex="0" role="button" aria-label="Open customer record">
              ${escapeHtml(customer.firstName || '')} ${escapeHtml(customer.lastName || '')}
            </div>

            <label>${t('titleOptional')}</label>
            <input type="text" id="apt-title" value="${escapeHtml(event.title || '')}" />

            <div class="grid-2" style="margin-top: 6px;">
              <div>
                <label>${t('bookingDate')}</label>
                <input type="datetime-local" id="apt-start" value="${startStr}" step="900" />
              </div>
              <div>
                <label>${t('duration')}</label>
                <div class="select-wrap">
                  <select id="apt-duration">
                    <option value="30" ${duration === 30 ? 'selected' : ''}>30 minutes</option>
                    <option value="60" ${duration === 60 ? 'selected' : ''}>60 minutes</option>
                    <option value="90" ${duration === 90 ? 'selected' : ''}>90 minutes</option>
                    <option value="120" ${duration === 120 ? 'selected' : ''}>120 minutes</option>
                    <option value="150" ${duration === 150 ? 'selected' : ''}>150 minutes</option>
                    <option value="180" ${duration === 180 ? 'selected' : ''}>180 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <label>${appointmentTypeLabel()}</label>
            <div class="select-wrap">
              <div class="multi-select" id="apt-type-dropdown">
                <div class="multi-select-display" id="apt-type-display">${t('noneSelected')}</div>
                <div class="dropdown-menu hidden" id="apt-type-menu">
                  ${generateServiceTypeOptions('apt-type-opt')}
                </div>
              </div>
            </div>

            ${isTradie() ? `
            <label>${t('jobStatus')}</label>
            <div class="select-wrap">
              <select id="apt-status" class="job-status-select">
                ${generateStatusOptions(event.extendedProps?.status || 'scheduled')}
              </select>
            </div>
            
            <div class="payment-section" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <strong style="font-size: 14px;">💰 ${t('paymentTracking')}</strong>
                <span id="payment-status-badge" class="job-status-badge" style="font-size: 11px;"></span>
              </div>
              <div class="grid-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <div>
                  <label style="font-size: 12px; margin-bottom: 4px;">Quoted $</label>
                  <input type="number" id="apt-quoted" placeholder="0.00" step="0.01" min="0" value="${event.extendedProps?.quotedAmount || ''}" style="font-size: 14px;" />
                </div>
                <div>
                  <label style="font-size: 12px; margin-bottom: 4px;">Invoiced $</label>
                  <input type="number" id="apt-invoiced" placeholder="0.00" step="0.01" min="0" value="${event.extendedProps?.invoiceAmount || ''}" style="font-size: 14px;" />
                </div>
                <div>
                  <label style="font-size: 12px; margin-bottom: 4px;">Paid $</label>
                  <input type="number" id="apt-paid" placeholder="0.00" step="0.01" min="0" value="${event.extendedProps?.paidAmount || ''}" style="font-size: 14px;" />
                </div>
              </div>
            </div>
            
            <div class="timeline-section" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <strong style="font-size: 14px;">📋 Quick Log</strong>
              </div>
              <div class="quick-actions" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                <button class="quick-action-btn" data-type="call" data-phone="${escapeHtml(customer.contactNumber || '')}" style="padding: 8px 12px; font-size: 12px; background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; border-radius: 6px; cursor: pointer;">📞 Call</button>
                <button class="quick-action-btn" data-type="sms" data-phone="${escapeHtml(customer.contactNumber || '')}" style="padding: 8px 12px; font-size: 12px; background: rgba(96,165,250,0.2); border: 1px solid rgba(96,165,250,0.4); color: #60a5fa; border-radius: 6px; cursor: pointer;">💬 SMS</button>
                <button class="quick-action-btn" data-type="email" style="padding: 8px 12px; font-size: 12px; background: rgba(167,139,250,0.2); border: 1px solid rgba(167,139,250,0.4); color: #a78bfa; border-radius: 6px; cursor: pointer;">✉️ Email</button>
                <button class="quick-action-btn" data-type="quote_sent" style="padding: 8px 12px; font-size: 12px; background: rgba(251,191,36,0.2); border: 1px solid rgba(251,191,36,0.4); color: #fbbf24; border-radius: 6px; cursor: pointer;">📄 Quote Sent</button>
                <button class="quick-action-btn" data-type="invoice_sent" style="padding: 8px 12px; font-size: 12px; background: rgba(249,115,22,0.2); border: 1px solid rgba(249,115,22,0.4); color: #f97316; border-radius: 6px; cursor: pointer;">🧾 Invoice Sent</button>
                <button class="quick-action-btn" data-type="payment_received" style="padding: 8px 12px; font-size: 12px; background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; border-radius: 6px; cursor: pointer;">💵 Payment</button>
              </div>
              <div id="job-timeline" style="max-height: 200px; overflow-y: auto;">
                <div class="muted" style="font-size: 12px; text-align: center;">Loading timeline...</div>
              </div>
            </div>
            
            <div class="job-photos-section" style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <strong style="font-size: 14px;">📷 ${t('jobPhotos')}</strong>
                <label class="button secondary" style="font-size: 12px; padding: 6px 10px; cursor: pointer;">
                  + Add
                  <input type="file" id="job-photo-input" accept="image/*" multiple style="display: none;" />
                </label>
              </div>
              <div id="job-photos-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px;">
                <div class="muted" style="font-size: 12px; text-align: center; grid-column: 1/-1;">Loading...</div>
              </div>
            </div>
            ` : ''}

            <div class="row" style="margin-top: 16px; gap: 12px;">
              <button class="button" id="apt-save">${t('saveChanges')}</button>
              <button class="button secondary" id="apt-reminder" title="Set Reminder">🔔 Reminder</button>
              <button class="button secondary" id="apt-delete">${t('delete')}</button>
              <button class="button secondary" id="apt-cancel">${t('cancel')}</button>
            </div>
          </div>
        </div>
      `);

      // Wait for DOM to be ready, then set up event listeners
      setTimeout(() => {
        // Add reminder button
        const reminderBtn = document.getElementById('apt-reminder');
        if (reminderBtn) {
          reminderBtn.addEventListener('click', () => {
            hideModal();
            setTimeout(() => {
              openCreateReminderModal(customer.id, parseInt(event.id));
            }, 100);
          });
        }

        // Payment status badge update function
        function updatePaymentStatusBadge() {
          const badge = document.getElementById('payment-status-badge');
          if (!badge) return;
          
          const quoted = parseFloat(document.getElementById('apt-quoted')?.value) || 0;
          const invoiced = parseFloat(document.getElementById('apt-invoiced')?.value) || 0;
          const paid = parseFloat(document.getElementById('apt-paid')?.value) || 0;
          
          let status, color;
          if (paid > 0 && paid >= invoiced && invoiced > 0) {
            status = 'Paid'; color = '#22c55e';
          } else if (paid > 0 && paid < invoiced) {
            status = 'Part Paid'; color = '#f97316';
          } else if (invoiced > 0) {
            status = 'Invoiced'; color = '#60a5fa';
          } else if (quoted > 0) {
            status = 'Quoted'; color = '#a78bfa';
          } else {
            status = 'Not Quoted'; color = '#94a3b8';
          }
          
          badge.textContent = status;
          badge.style.background = color;
          badge.style.color = 'white';
          badge.style.padding = '2px 8px';
          badge.style.borderRadius = '4px';
        }
        
        // Update badge on load and on change
        updatePaymentStatusBadge();
        document.getElementById('apt-quoted')?.addEventListener('input', updatePaymentStatusBadge);
        document.getElementById('apt-invoiced')?.addEventListener('input', updatePaymentStatusBadge);
        document.getElementById('apt-paid')?.addEventListener('input', updatePaymentStatusBadge);

        // Load and display timeline
        async function loadJobTimeline() {
          const timelineEl = document.getElementById('job-timeline');
          if (!timelineEl) return;
          
          try {
            const events = await CrmDB.getEventsForAppointment(event.id);
            
            if (events.length === 0) {
              timelineEl.innerHTML = '<div class="muted" style="font-size: 12px; text-align: center;">No activity logged yet</div>';
              return;
            }
            
            const eventIcons = {
              call: '📞', sms: '💬', email: '✉️', site_visit: '🏠',
              quote_sent: '📄', invoice_sent: '🧾', payment_received: '💵', note: '📝', other: '•'
            };
            const eventLabels = {
              call: 'Called', sms: 'Sent SMS', email: 'Sent Email', site_visit: 'Site Visit',
              quote_sent: 'Quote Sent', invoice_sent: 'Invoice Sent', payment_received: 'Payment Received', note: 'Note', other: 'Activity'
            };
            
            let html = '';
            for (const evt of events) {
              const icon = eventIcons[evt.type] || '•';
              const label = eventLabels[evt.type] || evt.type;
              const timeAgo = formatRelativeTime(new Date(evt.createdAt));
              const noteHtml = evt.note ? '<div style="font-size: 11px; color: var(--muted);">' + escapeHtml(evt.note) + '</div>' : '';
              
              html += '<div style="display: flex; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">' +
                '<span style="font-size: 14px;">' + icon + '</span>' +
                '<div style="flex: 1;">' +
                  '<div style="font-size: 12px; font-weight: 500;">' + label + '</div>' +
                  noteHtml +
                  '<div style="font-size: 10px; color: var(--muted); margin-top: 2px;">' + timeAgo + '</div>' +
                '</div>' +
              '</div>';
            }
            
            timelineEl.innerHTML = html;
          } catch (error) {
            console.error('Error loading timeline:', error);
            timelineEl.innerHTML = '<div class="muted" style="font-size: 12px; text-align: center;">Error loading timeline</div>';
          }
        }
        
        // Quick action button handlers
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const type = btn.dataset.type;
            const phone = btn.dataset.phone;
            
            // Log the event
            try {
              await CrmDB.createJobEvent({
                appointmentId: event.id,
                customerId: customer.id,
                type: type
              });
              
              // Reload timeline
              await loadJobTimeline();
              
              // Open deep link if applicable
              if (type === 'call' && phone) {
                window.location.href = 'tel:' + phone;
              } else if (type === 'sms' && phone) {
                window.location.href = 'sms:' + phone;
              }
            } catch (error) {
              console.error('Error logging event:', error);
              alert('Error logging event: ' + error.message);
            }
          });
        });
        
        // Load timeline on modal open
        loadJobTimeline();

        // Load and display job photos
        async function loadJobPhotos() {
          const photosGrid = document.getElementById('job-photos-grid');
          if (!photosGrid) return;
          
          try {
            const photos = await CrmDB.getImagesByAppointmentId(event.id);
            
            if (photos.length === 0) {
              photosGrid.innerHTML = '<div class="muted" style="font-size: 12px; text-align: center; grid-column: 1/-1;">No photos attached to this job</div>';
              return;
            }
            
            let html = '';
            for (const photo of photos) {
              html += '<div style="position: relative;">' +
                '<img src="' + photo.dataUrl + '" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; cursor: pointer;" data-id="' + photo.id + '" class="job-photo-thumb" />' +
              '</div>';
            }
            
            photosGrid.innerHTML = html;
            
            // Click handlers for photos
            photosGrid.querySelectorAll('.job-photo-thumb').forEach(img => {
              img.addEventListener('click', () => {
                // Simple lightbox
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
                overlay.innerHTML = '<img src="' + img.src + '" style="max-width: 90%; max-height: 90%; object-fit: contain;" />';
                overlay.addEventListener('click', () => overlay.remove());
                document.body.appendChild(overlay);
              });
            });
          } catch (error) {
            console.error('Error loading job photos:', error);
            photosGrid.innerHTML = '<div class="muted" style="font-size: 12px; text-align: center; grid-column: 1/-1;">Error loading photos</div>';
          }
        }
        
        // Handle job photo upload
        const jobPhotoInput = document.getElementById('job-photo-input');
        if (jobPhotoInput) {
          jobPhotoInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            try {
              const entries = await CrmDB.fileListToEntries(files);
              for (const entry of entries) {
                await CrmDB.addImage(customer.id, entry, event.id);
              }
              await loadJobPhotos();
              e.target.value = ''; // Reset input
            } catch (error) {
              console.error('Error uploading job photos:', error);
              alert('Error uploading photos: ' + error.message);
            }
          });
        }
        
        // Load job photos on modal open
        loadJobPhotos();

        // Make customer name clickable to open customer view
        const customerLink = document.getElementById('apt-customer-link');
        if (customerLink) {
          const goToCustomer = () => { hideModal(); navigate(`/customer?id=${encodeURIComponent(customer.id)}`); };
          customerLink.addEventListener('click', goToCustomer);
          customerLink.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToCustomer(); }
          });
        }

        // Snap appointment start to 15-minute increments
        const aptStartEl = document.getElementById('apt-start');
        if (aptStartEl) {
          const handler = () => {
            if (!aptStartEl.value) return;
            aptStartEl.value = formatAsDatetimeLocal(roundDatetimeLocalToStep(aptStartEl.value, 15));
          };
          aptStartEl.addEventListener('change', handler);
          aptStartEl.addEventListener('blur', handler);
        }

        // Parse existing title to pre-select booking types
        const title = event.title || '';
        
        const typeOptions = document.querySelectorAll('.apt-type-opt');
        
        let hasSelectedTypes = false;
        
        // Check if title contains any of the booking types
        const bookingTypes = getBookingTypes();
        const foundTypes = [];
        
        typeOptions.forEach((option, index) => {
          if (title.includes(option.value)) {
            option.checked = true;
            hasSelectedTypes = true;
            foundTypes.push(option.value);
          } else {
            option.checked = false;
          }
        });
        
        // Get DOM elements
        const typeDropdown = document.getElementById('apt-type-dropdown');
        const typeDisplay = document.getElementById('apt-type-display');
        const typeMenu = document.getElementById('apt-type-menu');

        // Define functions with unique names to avoid conflicts
        function updateAptTypeSummary() {
          const typeOptions = document.querySelectorAll('.apt-type-opt');
          
          const selected = Array.from(typeOptions)
            .filter((el) => el.checked)
            .map((el) => el.value);
          
          const label = selected.length ? selected.join(' + ') : t('noneSelected');
          
          if (typeDisplay) {
            typeDisplay.textContent = label;
            if (selected.length === 0) {
              typeDisplay.classList.add('placeholder');
            } else {
              typeDisplay.classList.remove('placeholder');
            }
                  }
        }

        function toggleAptTypeMenu() { 
          if (typeMenu && typeDropdown) {
            typeMenu.classList.toggle('hidden'); 
            typeDropdown.classList.toggle('open'); 
          }
        }

        // Update the display immediately after pre-selecting
        updateAptTypeSummary();

        // Add event listeners
        if (typeDisplay) {
          typeDisplay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleAptTypeMenu();
          });
          
          typeDisplay.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault(); 
              toggleAptTypeMenu(); 
            } 
          });
        }
        
        // Add change event listeners to checkboxes
        if (typeOptions && typeOptions.length > 0) {
          typeOptions.forEach((option, index) => {
            option.addEventListener('change', (e) => {
              updateAptTypeSummary();
            });
          });
        } else {
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
          const dropdown = document.getElementById('apt-type-dropdown');
          if (dropdown && typeMenu && typeDropdown && !dropdown.contains(e.target)) {
            typeMenu.classList.add('hidden');
            typeDropdown.classList.remove('open');
          }
        });

        // Save changes
        const saveBtn = document.getElementById('apt-save');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('apt-title').value.trim();
            const startStr = document.getElementById('apt-start').value;
            const durationMin = parseInt(document.getElementById('apt-duration').value || '60', 10);
            const types = Array.from(document.querySelectorAll('.apt-type-opt'))
              .filter((el) => el.checked)
              .map((el) => el.value);
            const typeLabel = types.length ? types.join(' + ') : '';
            const newTitle = typeLabel || titleInput || 'No service type';
            
            // Get status (only for tradie edition)
            const statusEl = document.getElementById('apt-status');
            const status = statusEl ? statusEl.value : (event.extendedProps?.status || 'scheduled');
            
            // Get payment fields (only for tradie edition)
            const quotedEl = document.getElementById('apt-quoted');
            const invoicedEl = document.getElementById('apt-invoiced');
            const paidEl = document.getElementById('apt-paid');
            const quotedAmount = quotedEl && quotedEl.value ? parseFloat(quotedEl.value) : null;
            const invoiceAmount = invoicedEl && invoicedEl.value ? parseFloat(invoicedEl.value) : null;
            const paidAmount = paidEl && paidEl.value ? parseFloat(paidEl.value) : null;
            
            // Convert local datetime to ISO string
            const roundedLocal = roundDatetimeLocalToStep(startStr, 15);
            const startDate = new Date(roundedLocal);
            const startISO = startDate.toISOString();
            const endISO = new Date(startDate.getTime() + durationMin * 60000).toISOString();
            
            // Update the appointment - ensure ID and customerId are preserved
            let updatedAppointment;
            
            // Get customerId from the event object
            const customerId = event.extendedProps?.customerId;
            if (!customerId) {
              alert('Error: Cannot find customer information for this appointment.');
              return;
            }
            
            if (typeof event.toPlainObject === 'function') {
              const plainEvent = event.toPlainObject();
              updatedAppointment = {
                ...plainEvent, // Preserve other properties
                id: event.id, // Ensure ID is explicitly set
                customerId: customerId, // Use the validated customerId
                title: newTitle,
                start: startISO,
                end: endISO,
                status: status,
                quotedAmount: quotedAmount,
                invoiceAmount: invoiceAmount,
                paidAmount: paidAmount
              };
            } else {
              // Fallback for plain appointment objects
              updatedAppointment = {
                id: event.id,
                customerId: customerId, // Use the validated customerId
                title: newTitle,
                start: startISO,
                end: endISO,
                status: status,
                quotedAmount: quotedAmount,
                invoiceAmount: invoiceAmount,
                paidAmount: paidAmount,
                createdAt: event.createdAt || new Date().toISOString()
              };
            }
            
            // Validate that we have all required fields
            if (!updatedAppointment.id) {
              alert('Error: Missing appointment ID. Cannot update appointment.');
              return;
            }
            
            if (!updatedAppointment.customerId) {
              alert('Error: Missing customer ID. Cannot update appointment.');
              return;
            }
            
            try {
              await CrmDB.updateAppointment(updatedAppointment);
              hideModal();
              if (globalCalendar) {
                globalCalendar.refetchEvents();
              }
              // If pipeline is visible, refresh it immediately so moved status cards
              // jump columns without requiring navigation/reload.
              const pipelineContainerEl = document.getElementById('pipeline-container');
              if (pipelineContainerEl && !pipelineContainerEl.classList.contains('hidden')) {
                document.getElementById('pipeline-view-btn')?.click();
              }
            } catch (error) {
              alert('Error updating appointment: ' + error.message);
            }
          });
        } else {
        }

        // Delete appointment
        const deleteBtn = document.getElementById('apt-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (confirm(t('confirmDelete'))) {
              try {
                await CrmDB.deleteAppointment(event.id);
                hideModal();
                if (globalCalendar) {
                  globalCalendar.refetchEvents();
                }
                const pipelineContainerEl = document.getElementById('pipeline-container');
                if (pipelineContainerEl && !pipelineContainerEl.classList.contains('hidden')) {
                  document.getElementById('pipeline-view-btn')?.click();
                }
              } catch (error) {
                alert('Error deleting appointment');
              }
            }
          });
        } else {
        }
        


        // Cancel
        const cancelBtn = document.getElementById('apt-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            hideModal();
          });
        } else {
        }
        

      }, 100); // Small delay to ensure DOM is ready
    }).catch(error => {
      alert('Error loading appointment details. Check console for details.');
    });
  }

  function attachVerticalBackupHandler() {
    const btn = document.getElementById('daily-backup-btn-vertical');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await performDailyBackup();
    });
  }

  function attachLangToggleHandler() {
    const btn = document.getElementById('lang-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = getLang();
      setLang(current === 'en' ? 'ja' : 'en');
      render();
    }, { once: true });
  }

  // ============================================================================
  // FOLLOW-UPS / REMINDERS VIEW
  // ============================================================================

  async function renderFollowUps() {
    if (!usesJobPipeline()) {
      appRoot.innerHTML = wrapWithSidebar(`
        <div class="card" style="text-align: center; padding: 40px;">
          <h3 style="margin: 0 0 8px 0;">${t('followUpsUnavailableTitle')}</h3>
          <p class="muted" style="margin: 0;">${t('followUpsUnavailableMessage')}</p>
        </div>
      `);
      return;
    }

    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between section-header">
        <h2>${t('followUps')}</h2>
        <button id="add-reminder-btn" class="button" style="padding: 8px 16px;">
          + ${t('newReminder')}
        </button>
      </div>
      <div id="follow-ups-container">
        <div class="muted" style="text-align: center; padding: 40px;">Loading...</div>
      </div>
    `);

    await loadFollowUpsView();

    // Add reminder button handler
    document.getElementById('add-reminder-btn')?.addEventListener('click', () => {
      openCreateReminderModal();
    });
  }

  async function loadFollowUpsView() {
    const container = document.getElementById('follow-ups-container');
    if (!container) return;

    try {
      const [overdue, today, upcoming, allPending] = await Promise.all([
        CrmDB.getOverdueReminders(),
        CrmDB.getTodayReminders(),
        CrmDB.getUpcomingReminders(7),
        CrmDB.getPendingReminders()
      ]);

      // Get later reminders (beyond 7 days)
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8);
      const later = allPending.filter(r => new Date(r.dueAt) >= sevenDaysFromNow);

      // Get all customers and appointments for linking
      const customers = await CrmDB.getAllCustomers();
      const appointments = await CrmDB.getAllAppointments();
      const customerMap = new Map(customers.map(c => [c.id, c]));
      const appointmentMap = new Map(appointments.map(a => [a.id, a]));

      let html = '';

      // Overdue section
      if (overdue.length > 0) {
        html += renderReminderSection('Overdue', overdue, customerMap, appointmentMap, 'overdue');
      }

      // Today section
      if (today.length > 0) {
        html += renderReminderSection('Today', today, customerMap, appointmentMap, 'today');
      }

      // Next 7 days section
      if (upcoming.length > 0) {
        html += renderReminderSection('Next 7 Days', upcoming, customerMap, appointmentMap, 'upcoming');
      }

      // Later section
      if (later.length > 0) {
        html += renderReminderSection('Later', later, customerMap, appointmentMap, 'later');
      }

      // Empty state
      if (!html) {
        html = `
          <div class="card" style="text-align: center; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔔</div>
            <h3 style="margin: 0 0 8px 0;">${t('noFollowUps')}</h3>
            <p class="muted" style="margin: 0;">${t('followUpsEmptyMessage')}</p>
          </div>
        `;
      }

      container.innerHTML = html;

      // Attach event handlers
      attachReminderEventHandlers();

    } catch (error) {
      console.error('Error loading follow-ups:', error);
      container.innerHTML = `
        <div class="card" style="text-align: center; padding: 40px; color: #ef4444;">
          <p>${t('errorLoadingFollowUps')}: ${error.message}</p>
        </div>
      `;
    }
  }

  function renderReminderSection(title, reminders, customerMap, appointmentMap, sectionType) {
    const sectionColors = {
      overdue: 'rgba(239, 68, 68, 0.2)',
      today: 'rgba(251, 191, 36, 0.15)',
      upcoming: 'rgba(96, 165, 250, 0.1)',
      later: 'rgba(148, 163, 184, 0.1)'
    };
    const borderColors = {
      overdue: '#ef4444',
      today: '#fbbf24',
      upcoming: '#60a5fa',
      later: '#94a3b8'
    };

    let html = `
      <div class="reminder-section" style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px 0; color: ${borderColors[sectionType]};">${title} (${reminders.length})</h3>
        <div class="reminder-cards">
    `;

    for (const reminder of reminders) {
      const customer = reminder.customerId ? customerMap.get(reminder.customerId) : null;
      const appointment = reminder.appointmentId ? appointmentMap.get(reminder.appointmentId) : null;
      
      const customerName = customer 
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unnamed'
        : null;
      const jobTitle = appointment?.title || null;

      const dueDate = new Date(reminder.dueAt);
      const timeStr = formatRelativeTime(dueDate);

      html += `
        <div class="reminder-card" data-reminder-id="${reminder.id}" style="
          background: ${sectionColors[sectionType]};
          border-left: 4px solid ${borderColors[sectionType]};
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; margin-bottom: 4px;">
                ${escapeHtml(reminder.message || 'Follow-up reminder')}
              </div>
              <div class="muted" style="font-size: 13px;">
                ${customerName ? `<span>👤 ${escapeHtml(customerName)}</span>` : ''}
                ${jobTitle ? `<span style="margin-left: 8px;">📋 ${escapeHtml(jobTitle)}</span>` : ''}
              </div>
              <div class="muted" style="font-size: 12px; margin-top: 4px;">
                ⏰ ${timeStr}
              </div>
            </div>
            <div class="reminder-actions" style="display: flex; gap: 8px; flex-shrink: 0;">
              <button class="reminder-done-btn" data-id="${reminder.id}" title="Mark Done" style="
                background: #22c55e;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                color: white;
                cursor: pointer;
                font-size: 14px;
              ">✓</button>
              <button class="reminder-snooze-btn" data-id="${reminder.id}" title="Snooze" style="
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                padding: 8px 12px;
                color: white;
                cursor: pointer;
                font-size: 14px;
              ">💤</button>
              <button class="reminder-delete-btn" data-id="${reminder.id}" title="Delete" style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.4);
                border-radius: 6px;
                padding: 8px 12px;
                color: #ef4444;
                cursor: pointer;
                font-size: 14px;
              ">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }

    html += '</div></div>';
    return html;
  }

  function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMs < 0) {
      // Past
      const absMins = Math.abs(diffMins);
      const absHours = Math.abs(diffHours);
      const absDays = Math.abs(diffDays);
      
      if (absMins < 60) return `${absMins} min ago`;
      if (absHours < 24) return `${absHours} hours ago`;
      if (absDays === 1) return 'Yesterday';
      if (absDays < 7) return `${absDays} days ago`;
      return date.toLocaleDateString();
    } else {
      // Future
      if (diffMins < 60) return `In ${diffMins} min`;
      if (diffHours < 24) return `In ${diffHours} hours`;
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 7) return `In ${diffDays} days`;
      return date.toLocaleDateString();
    }
  }

  async function loadCustomerRecentActivity(customerId) {
    const container = document.getElementById('customer-recent-activity');
    if (!container) return;
    
    try {
      const events = await CrmDB.getRecentEventsForCustomer(customerId, 5);
      const lastContact = await CrmDB.getLastContactTime(customerId);
      
      const eventIcons = {
        call: '📞', sms: '💬', email: '✉️', site_visit: '🏠',
        quote_sent: '📄', invoice_sent: '🧾', payment_received: '💵', note: '📝', other: '•'
      };
      const eventLabels = {
        call: 'Called', sms: 'SMS', email: 'Email', site_visit: 'Site Visit',
        quote_sent: 'Quote Sent', invoice_sent: 'Invoice', payment_received: 'Payment', note: 'Note', other: 'Activity'
      };
      
      let html = '';
      
      // Last contacted info
      if (lastContact) {
        const timeAgo = formatRelativeTime(lastContact);
        html += `<div style="font-size: 12px; margin-bottom: 12px; color: var(--muted);">Last contacted: <strong>${timeAgo}</strong></div>`;
      }
      
      if (events.length === 0) {
        html += '<div class="muted" style="font-size: 12px; text-align: center;">No recent activity</div>';
      } else {
        for (const evt of events) {
          const icon = eventIcons[evt.type] || '•';
          const label = eventLabels[evt.type] || evt.type;
          const timeAgo = formatRelativeTime(new Date(evt.createdAt));
          
          html += `
            <div style="display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 12px;">
              <span>${icon}</span>
              <span style="flex: 1;">${label}${evt.note ? ': ' + escapeHtml(evt.note) : ''}</span>
              <span style="color: var(--muted);">${timeAgo}</span>
            </div>
          `;
        }
      }
      
      container.innerHTML = html;
    } catch (error) {
      console.error('Error loading recent activity:', error);
      container.innerHTML = '<div class="muted" style="font-size: 12px;">Error loading activity</div>';
    }
  }

  function attachReminderEventHandlers() {
    // Done buttons
    document.querySelectorAll('.reminder-done-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
          const reminder = await CrmDB.getReminderById(id);
          if (reminder) {
            reminder.status = 'done';
            await CrmDB.updateReminder(reminder);
            await loadFollowUpsView();
          }
        } catch (error) {
          console.error('Error marking reminder done:', error);
          alert('Error: ' + error.message);
        }
      });
    });

    // Snooze buttons
    document.querySelectorAll('.reminder-snooze-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        openSnoozeModal(id);
      });
    });

    // Delete buttons
    document.querySelectorAll('.reminder-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this reminder?')) {
          try {
            await CrmDB.deleteReminder(id);
            await loadFollowUpsView();
          } catch (error) {
            console.error('Error deleting reminder:', error);
            alert('Error: ' + error.message);
          }
        }
      });
    });

    // Card click to view details
    document.querySelectorAll('.reminder-card').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.dataset.reminderId;
        const reminder = await CrmDB.getReminderById(id);
        if (reminder) {
          if (reminder.appointmentId) {
            navigate(`/calendar?appointment=${reminder.appointmentId}`);
          } else if (reminder.customerId) {
            navigate(`/customer?id=${reminder.customerId}`);
          }
        }
      });
    });
  }

  function openSnoozeModal(reminderId) {
    showModal(`
      <div class="modal">
        <h3 style="margin-top: 0;">Snooze Reminder</h3>
        <div class="form">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <button class="button secondary snooze-option" data-hours="1">1 Hour</button>
            <button class="button secondary snooze-option" data-hours="3">3 Hours</button>
            <button class="button secondary snooze-option" data-days="1">Tomorrow 9am</button>
            <button class="button secondary snooze-option" data-days="3">3 Days</button>
            <button class="button secondary snooze-option" data-days="7">1 Week</button>
            <button class="button secondary" id="snooze-custom-btn">Custom...</button>
          </div>
          <div id="snooze-custom-picker" style="display: none; margin-top: 12px;">
            <input type="datetime-local" id="snooze-custom-datetime" class="form-input" />
          </div>
          <div class="row" style="margin-top: 16px;">
            <button class="button secondary" id="snooze-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `);

    // Snooze option handlers
    document.querySelectorAll('.snooze-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const hours = btn.dataset.hours ? parseInt(btn.dataset.hours) : 0;
        const days = btn.dataset.days ? parseInt(btn.dataset.days) : 0;
        
        let newDueAt;
        if (days === 1) {
          // Tomorrow 9am
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          newDueAt = tomorrow;
        } else if (hours > 0) {
          newDueAt = new Date(Date.now() + hours * 3600000);
        } else if (days > 0) {
          newDueAt = new Date(Date.now() + days * 86400000);
        }

        await snoozeReminder(reminderId, newDueAt);
      });
    });

    // Custom picker
    document.getElementById('snooze-custom-btn')?.addEventListener('click', () => {
      document.getElementById('snooze-custom-picker').style.display = 'block';
    });

    document.getElementById('snooze-custom-datetime')?.addEventListener('change', async (e) => {
      const newDueAt = new Date(e.target.value);
      if (!isNaN(newDueAt.getTime())) {
        await snoozeReminder(reminderId, newDueAt);
      }
    });

    document.getElementById('snooze-cancel')?.addEventListener('click', hideModal);
  }

  async function snoozeReminder(reminderId, newDueAt) {
    try {
      const reminder = await CrmDB.getReminderById(reminderId);
      if (reminder) {
        reminder.dueAt = newDueAt.toISOString();
        reminder.snoozedUntil = newDueAt.toISOString();
        await CrmDB.updateReminder(reminder);
        hideModal();
        await loadFollowUpsView();
      }
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      alert('Error: ' + error.message);
    }
  }

  function openCreateReminderModal(prefilledCustomerId = null, prefilledAppointmentId = null) {
    const now = new Date();
    const tomorrow9am = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
    const defaultDateTime = tomorrow9am.toISOString().slice(0, 16);

    showModal(`
      <div class="modal">
        <h3 style="margin-top: 0;">New Reminder</h3>
        <div class="form">
          <label>Message</label>
          <input type="text" id="reminder-message" placeholder="e.g., Call back, Send quote..." />
          
          <label>Due Date/Time</label>
          <input type="datetime-local" id="reminder-due" value="${defaultDateTime}" />
          
          <div style="margin-top: 12px;">
            <strong style="font-size: 13px;">Quick Presets:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
              <button class="button secondary preset-btn" data-message="Call back" style="font-size: 12px; padding: 6px 12px;">📞 Call back</button>
              <button class="button secondary preset-btn" data-message="Send quote" style="font-size: 12px; padding: 6px 12px;">📄 Send quote</button>
              <button class="button secondary preset-btn" data-message="Chase invoice" style="font-size: 12px; padding: 6px 12px;">💰 Chase invoice</button>
              <button class="button secondary preset-btn" data-message="Follow up" style="font-size: 12px; padding: 6px 12px;">🔔 Follow up</button>
            </div>
          </div>
          
          <div class="row" style="margin-top: 20px; gap: 12px;">
            <button class="button" id="save-reminder-btn">Save Reminder</button>
            <button class="button secondary" id="cancel-reminder-btn">Cancel</button>
          </div>
        </div>
      </div>
    `);

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('reminder-message').value = btn.dataset.message;
      });
    });

    // Save button
    document.getElementById('save-reminder-btn')?.addEventListener('click', async () => {
      const message = document.getElementById('reminder-message').value.trim();
      const dueAt = document.getElementById('reminder-due').value;

      if (!dueAt) {
        alert('Please select a due date/time');
        return;
      }

      try {
        await CrmDB.createReminder({
          customerId: prefilledCustomerId,
          appointmentId: prefilledAppointmentId,
          message: message || 'Follow-up reminder',
          dueAt: new Date(dueAt).toISOString(),
          status: 'pending'
        });
        hideModal();
        await loadFollowUpsView();
      } catch (error) {
        console.error('Error creating reminder:', error);
        alert('Error: ' + error.message);
      }
    });

    document.getElementById('cancel-reminder-btn')?.addEventListener('click', hideModal);
  }

  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================

  let searchDebounceTimer = null;

  function attachGlobalSearchHandler() {
    const searchInput = document.getElementById('global-search-input');
    const resultsContainer = document.getElementById('global-search-results');
    if (!searchInput || !resultsContainer) return;
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Clear previous debounce
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      
      if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
      }
      
      // Debounce search
      searchDebounceTimer = setTimeout(() => {
        performGlobalSearch(query);
      }, 200);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-search-container')) {
        resultsContainer.style.display = 'none';
      }
    });
    
    // Show results on focus if there's a query
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2) {
        performGlobalSearch(searchInput.value.trim());
      }
    });
  }

  async function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('global-search-results');
    if (!resultsContainer) return;
    
    const lowerQuery = query.toLowerCase();
    
    try {
      // Search in parallel
      const [customers, appointments, notes] = await Promise.all([
        CrmDB.getAllCustomers(),
        CrmDB.getAllAppointments(),
        CrmDB.getAllNotes()
      ]);
      
      // Filter customers
      const matchingCustomers = customers.filter(c => {
        const name = ((c.firstName || '') + ' ' + (c.lastName || '')).toLowerCase();
        const phone = (c.contactNumber || '').toLowerCase();
        const social = (c.socialMediaName || '').toLowerCase();
        return name.includes(lowerQuery) || phone.includes(lowerQuery) || social.includes(lowerQuery);
      }).slice(0, 5);
      
      // Filter jobs
      const matchingJobs = appointments.filter(a => {
        const title = (a.title || '').toLowerCase();
        const address = (a.address || '').toLowerCase();
        return title.includes(lowerQuery) || address.includes(lowerQuery);
      }).slice(0, 5);
      
      // Filter notes
      const matchingNotes = notes.filter(n => {
        const content = getNoteTextValue(n).toLowerCase();
        return content.includes(lowerQuery);
      }).slice(0, 3);
      
      // Build customer map for job display
      const customerMap = new Map(customers.map(c => [c.id, c]));
      
      // Build results HTML
      let html = '';
      
      if (matchingCustomers.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">Customers</div>';
        for (const c of matchingCustomers) {
          const name = ((c.firstName || '') + ' ' + (c.lastName || '')).trim() || 'Unnamed';
          html += '<div class="search-result-item" data-type="customer" data-id="' + c.id + '">';
          html += '<span class="search-icon">👤</span>';
          html += '<span class="search-text">' + escapeHtml(name) + '</span>';
          if (c.contactNumber) html += '<span class="search-meta">' + escapeHtml(c.contactNumber) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }
      
      if (matchingJobs.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">' + escapeHtml(appointmentEntityPlural()) + '</div>';
        for (const j of matchingJobs) {
          const customer = customerMap.get(j.customerId);
          const customerName = customer ? ((customer.firstName || '') + ' ' + (customer.lastName || '')).trim() : '';
          html += '<div class="search-result-item" data-type="job" data-id="' + j.id + '">';
          html += '<span class="search-icon">📋</span>';
          html += '<span class="search-text">' + escapeHtml(j.title || appointmentEntitySingular()) + '</span>';
          if (customerName) html += '<span class="search-meta">' + escapeHtml(customerName) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }
      
      if (matchingNotes.length > 0) {
        html += '<div class="search-section"><div class="search-section-title">Notes</div>';
        for (const n of matchingNotes) {
          const noteText = getNoteTextValue(n);
          const preview = noteText.substring(0, 50) + (noteText.length > 50 ? '...' : '');
          html += '<div class="search-result-item" data-type="note" data-customer-id="' + n.customerId + '">';
          html += '<span class="search-icon">📝</span>';
          html += '<span class="search-text">' + escapeHtml(preview) + '</span>';
          html += '</div>';
        }
        html += '</div>';
      }
      
      if (!html) {
        html = `<div class="search-no-results">${t('noResultsFound')}</div>`;
      }
      
      resultsContainer.innerHTML = html;
      resultsContainer.style.display = 'block';
      
      // Attach click handlers
      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const type = item.dataset.type;
          const id = item.dataset.id;
          const customerId = item.dataset.customerId;
          
          resultsContainer.style.display = 'none';
          document.getElementById('global-search-input').value = '';
          
          if (type === 'customer') {
            navigate('/customer?id=' + id);
          } else if (type === 'job') {
            navigate('/calendar?appointment=' + id);
          } else if (type === 'note' && customerId) {
            navigate('/customer?id=' + customerId);
          }
        });
      });
      
    } catch (error) {
      console.error('Search error:', error);
      resultsContainer.innerHTML = `<div class="search-no-results">${t('errorSearching')}</div>`;
      resultsContainer.style.display = 'block';
    }
  }

  // ============================================================================
  // FLOATING ACTION BUTTON (FAB) & QUICK ADD JOB
  // ============================================================================

  function renderFAB(show, currentRoute) {
    // Remove existing FAB
    const existingFab = document.getElementById('quick-add-fab');
    if (existingFab) existingFab.remove();
    
    if (!show) return;
    
    const fab = document.createElement('button');
    fab.id = 'quick-add-fab';
    fab.innerHTML = '+';
    fab.title = t('quickAddAppointment');
    fab.setAttribute('aria-label', t('quickAddAppointment'));
    const isCustomerScreen = currentRoute === '/customer' || currentRoute === '/customer-edit';
    const fabBottom = isCustomerScreen ? 'calc(96px + env(safe-area-inset-bottom, 0px))' : '24px';

    fab.style.cssText = `
      position: fixed;
      bottom: ${fabBottom};
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--brand);
      color: white;
      font-size: 28px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;
    
    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'scale(1.1)';
    });
    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'scale(1)';
    });
    
    fab.addEventListener('click', () => {
      // Pre-fill customer if on customer page
      const customerId = window.currentCustomerId || null;
      openQuickAddJobModal(customerId);
    });
    
    document.body.appendChild(fab);
  }

  async function openQuickAddJobModal(prefilledCustomerId = null) {
    // Load customers for the dropdown
    const customers = await CrmDB.getAllCustomers();
    customers.sort((a, b) => {
      const nameA = (a.firstName + ' ' + a.lastName).trim().toLowerCase();
      const nameB = (b.firstName + ' ' + b.lastName).trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    const customerOptions = customers.map(c => {
      const name = (c.firstName + ' ' + c.lastName).trim() || 'Unnamed';
      const selected = c.id === prefilledCustomerId ? 'selected' : '';
      return '<option value="' + c.id + '" ' + selected + '>' + escapeHtml(name) + '</option>';
    }).join('');
    
    // Get service types for job suggestions
    const serviceTypes = productConfig.serviceTypes || [];
    const jobSuggestions = serviceTypes.map(t => 
      '<button type="button" class="job-suggestion-btn button secondary" data-value="' + escapeHtml(t.label) + '" style="font-size: 11px; padding: 4px 8px;">' + escapeHtml(t.label) + '</button>'
    ).join('');
    
    showModal(`
      <div class="modal" style="max-width: 400px;">
        <h3 style="margin-top: 0;">${t('quickAddAppointment')}</h3>
        <div class="form">
          <label>Customer</label>
          <div style="display: flex; gap: 8px;">
            <select id="quick-add-customer" style="flex: 1;">
              <option value="">-- Select Customer --</option>
              ${customerOptions}
              <option value="__new__">+ Create New Customer</option>
            </select>
          </div>
          
          <div id="new-customer-fields" style="display: none; margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <label style="font-size: 12px;">New Customer Name *</label>
            <input type="text" id="quick-add-customer-name" placeholder="Name" />
            <label style="font-size: 12px; margin-top: 8px;">Phone</label>
            <input type="tel" id="quick-add-customer-phone" placeholder="Phone number" />
          </div>
          
          <label style="margin-top: 12px;">Job Title</label>
          <input type="text" id="quick-add-title" placeholder="e.g., Quote, Repair, Installation..." />
          <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px;">
            ${jobSuggestions}
          </div>
          
          ${isTradie() ? `
          <div style="margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px;">
              <input type="checkbox" id="quick-add-address-different" />
              <span>Different from customer address</span>
            </label>
            <div id="quick-add-address-fields">
              <div style="margin-bottom: 8px;">
                <label style="font-size: 12px;">Street Address</label>
                <input type="text" id="quick-add-address-line1" placeholder="123 Main Street" />
              </div>
              <div class="grid-2" style="gap: 8px;">
                <div>
                  <label style="font-size: 12px;">Suburb</label>
                  <input type="text" id="quick-add-suburb" placeholder="Suburb" />
                </div>
                <div class="grid-2" style="gap: 4px;">
                  <div>
                    <label style="font-size: 12px;">State</label>
                    <select id="quick-add-state">
                      <option value="">-</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size: 12px;">Postcode</label>
                    <input type="text" id="quick-add-postcode" placeholder="0000" maxlength="4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          ` : `
          <label style="margin-top: 12px;">Address (optional)</label>
          <input type="text" id="quick-add-address" placeholder="Job address" />
          `}
          
          <label style="margin-top: 12px;">Set Reminder</label>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <button type="button" class="reminder-preset-btn button" data-days="0" style="font-size: 11px; padding: 6px 10px;">None</button>
            <button type="button" class="reminder-preset-btn button secondary" data-days="1" style="font-size: 11px; padding: 6px 10px;">Tomorrow</button>
            <button type="button" class="reminder-preset-btn button secondary" data-days="3" style="font-size: 11px; padding: 6px 10px;">3 Days</button>
            <button type="button" class="reminder-preset-btn button secondary" data-days="7" style="font-size: 11px; padding: 6px 10px;">1 Week</button>
          </div>
          <input type="hidden" id="quick-add-reminder-days" value="0" />
          
          <div class="row" style="margin-top: 20px; gap: 12px;">
            <button class="button" id="quick-add-save">Create Job</button>
            <button class="button secondary" id="quick-add-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `);
    
    function setQuickAddAddressFromCustomer(customer) {
      if (!customer || !isTradie()) return;
      const line1 = document.getElementById('quick-add-address-line1');
      const suburb = document.getElementById('quick-add-suburb');
      const state = document.getElementById('quick-add-state');
      const postcode = document.getElementById('quick-add-postcode');
      if (line1) line1.value = customer.addressLine1 || '';
      if (suburb) suburb.value = customer.suburb || '';
      if (state) state.value = customer.state || '';
      if (postcode) postcode.value = customer.postcode || '';
    }
    function clearQuickAddAddressFields() {
      if (!isTradie()) return;
      const line1 = document.getElementById('quick-add-address-line1');
      const suburb = document.getElementById('quick-add-suburb');
      const state = document.getElementById('quick-add-state');
      const postcode = document.getElementById('quick-add-postcode');
      if (line1) line1.value = '';
      if (suburb) suburb.value = '';
      if (state) state.value = '';
      if (postcode) postcode.value = '';
    }
    async function refreshQuickAddAddressFromCustomer() {
      const different = document.getElementById('quick-add-address-different');
      const customerSelect = document.getElementById('quick-add-customer');
      if (!isTradie() || !customerSelect) return;
      const customerId = customerSelect.value;
      if (different && different.checked) {
        clearQuickAddAddressFields();
        return;
      }
      if (!customerId || customerId === '__new__') {
        clearQuickAddAddressFields();
        return;
      }
      try {
        const customer = await CrmDB.getCustomerById(parseInt(customerId, 10));
        setQuickAddAddressFromCustomer(customer || {});
      } catch (e) {
        clearQuickAddAddressFields();
      }
    }

    // Customer dropdown change handler
    document.getElementById('quick-add-customer')?.addEventListener('change', async (e) => {
      const newCustomerFields = document.getElementById('new-customer-fields');
      if (e.target.value === '__new__') {
        newCustomerFields.style.display = 'block';
      } else {
        newCustomerFields.style.display = 'none';
      }
      await refreshQuickAddAddressFromCustomer();
    });

    // "Different from customer address" checkbox
    document.getElementById('quick-add-address-different')?.addEventListener('change', async (e) => {
      if (e.target.checked) {
        clearQuickAddAddressFields();
      } else {
        await refreshQuickAddAddressFromCustomer();
      }
    });
    
    // Job suggestion buttons
    document.querySelectorAll('.job-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('quick-add-title').value = btn.dataset.value;
      });
    });
    
    // Reminder preset buttons
    document.querySelectorAll('.reminder-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.reminder-preset-btn').forEach(b => b.classList.add('secondary'));
        btn.classList.remove('secondary');
        document.getElementById('quick-add-reminder-days').value = btn.dataset.days;
      });
    });
    
    // Save handler
    document.getElementById('quick-add-save')?.addEventListener('click', async () => {
      const customerSelect = document.getElementById('quick-add-customer');
      const title = document.getElementById('quick-add-title').value.trim();
      let address = '';
      if (isTradie()) {
        const line1 = document.getElementById('quick-add-address-line1')?.value?.trim() || '';
        const suburb = document.getElementById('quick-add-suburb')?.value?.trim() || '';
        const state = document.getElementById('quick-add-state')?.value?.trim() || '';
        const postcode = document.getElementById('quick-add-postcode')?.value?.trim() || '';
        address = [line1, suburb, state, postcode].filter(Boolean).join(', ');
      } else {
        address = document.getElementById('quick-add-address')?.value?.trim() || '';
      }
      const reminderDays = parseInt(document.getElementById('quick-add-reminder-days').value) || 0;
      
      let customerId = customerSelect.value;
      
      // Create new customer if selected
      if (customerId === '__new__') {
        const newName = document.getElementById('quick-add-customer-name').value.trim();
        const newPhone = document.getElementById('quick-add-customer-phone').value.trim();
        
        if (!newName) {
          alert('Please enter a customer name');
          return;
        }
        
        // Split name into first/last
        const nameParts = newName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        try {
          customerId = await CrmDB.createCustomer({
            firstName,
            lastName,
            contactNumber: newPhone,
            socialMediaName: '',
            referralNotes: ''
          });
        } catch (error) {
          console.error('Error creating customer:', error);
          alert('Error creating customer: ' + error.message);
          return;
        }
      }
      
      if (!customerId) {
        alert('Please select or create a customer');
        return;
      }
      
      if (!title) {
        alert('Please enter a job title');
        return;
      }
      
      try {
        // Create the job (appointment) with status "lead"
        const now = new Date();
        const appointmentId = await CrmDB.createAppointment({
          customerId: parseInt(customerId),
          title: title,
          start: now.toISOString(),
          end: new Date(now.getTime() + 3600000).toISOString(), // 1 hour default
          status: 'lead',
          address: address || null,
          quotedAmount: null,
          invoiceAmount: null,
          paidAmount: null
        });
        
        // Create reminder if requested
        if (reminderDays > 0) {
          const dueAt = new Date();
          dueAt.setDate(dueAt.getDate() + reminderDays);
          dueAt.setHours(9, 0, 0, 0); // 9am
          
          await CrmDB.createReminder({
            customerId: parseInt(customerId),
            appointmentId: appointmentId,
            message: 'Follow up on: ' + title,
            dueAt: dueAt.toISOString(),
            status: 'pending'
          });
        }
        
        hideModal();
        
        // Refresh the current view
        render();
        
      } catch (error) {
        console.error('Error creating job:', error);
        alert('Error creating job: ' + error.message);
      }
    });
    
    document.getElementById('quick-add-cancel')?.addEventListener('click', hideModal);

    // Populate address from prefilled customer when modal opens
    if (prefilledCustomerId && isTradie()) {
      setTimeout(() => refreshQuickAddAddressFromCustomer(), 0);
    }
  }

  async function renderBackup() {
    const db = getDataApi();
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between section-header">
        <h2>Options</h2>
      </div>
      
      ${isTradie() ? `
      <div class="card" style="margin-bottom: 16px;">
        <h3 style="margin-top: 0;">📊 Storage Usage</h3>
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
          Driver: <span id="storage-driver-name">Detecting...</span>
        </div>
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
          Runtime: <span id="native-runtime-status">Detecting...</span>
        </div>
        <div class="muted" style="font-size: 12px; margin-bottom: 8px;">
          Native Plugins: <span id="native-plugin-status">Detecting...</span>
        </div>
        <div class="row" style="align-items: flex-end; margin-bottom: 8px; gap: 8px;">
          <label style="font-size: 12px;">
            Native Driver Mode<br />
            <select id="native-driver-mode" style="margin-top: 4px;">
              <option value="adapter">Adapter (Default)</option>
              <option value="sqlite_test">SQLite Test Mode</option>
            </select>
          </label>
          <button id="save-native-driver-mode-btn" class="button secondary" style="padding: 6px 10px; font-size: 12px;">Save Mode</button>
        </div>
        <div id="native-driver-mode-status" class="muted" style="font-size: 12px; margin-bottom: 8px;"></div>
        <div id="storage-meter-container">
          <div class="muted" style="font-size: 12px;">Calculating...</div>
        </div>
        <div class="row" style="margin-top: 10px;">
          <button id="native-migrate-btn" class="button secondary" style="padding: 6px 10px; font-size: 12px;">Migrate Current Data to Native SQLite</button>
        </div>
        <div id="native-migrate-status" class="muted" style="font-size: 12px; margin-top: 6px;"></div>
        <div class="row" style="margin-top: 10px;">
          <button id="native-smoke-test-btn" class="button secondary" style="padding: 6px 10px; font-size: 12px;">Run Native Storage Smoke Test</button>
        </div>
        <div id="native-smoke-test-status" class="muted" style="font-size: 12px; margin-top: 6px;"></div>
      </div>
      ` : ''}
      
      <div class="card" style="margin-bottom: 16px;">
        <div class="form">
          <h3 style="margin-top: 0; margin-bottom: 10px;">Export</h3>
          <div class="muted" style="font-size: 12px; margin-bottom: 10px;">
            Create a backup file first, then download it.
          </div>
          <div class="row">
            <button id="export-btn" class="button">Export with Images</button>
            <button id="export-lite-btn" class="button secondary">Export Data Only</button>
            <button id="export-images-only-btn" class="button secondary">Export Images Only</button>
            <button id="download-btn" class="button secondary" disabled>${t('download')}</button>
          </div>
          <div class="muted" id="backup-status" style="margin-top: 8px;"></div>
          
          <hr style="border-color: rgba(255,255,255,0.08); width:100%; margin: 16px 0;" />
          
          <h3 style="margin-top: 0; margin-bottom: 10px;">Import</h3>
          <div class="muted" style="font-size: 12px; margin-bottom: 10px;">
            Load a backup file, preview what will import, then run selected import.
          </div>
          <div class="row">
            <input id="import-file" type="file" accept="application/json" />
            <button id="load-backup" class="button secondary">${t('load')}</button>
          </div>
          <div id="backup-preview" class="card hidden" style="margin-top:8px;">
            <h3 style="margin-top:0;">${t('preview')}</h3>
            <div id="summary" class="muted"></div>
            <div class="row" style="margin:8px 0;">
              <button id="select-all" class="button secondary">${t('selectAll')}</button>
              <button id="select-none" class="button secondary">${t('selectNone')}</button>
            </div>
            <div id="customer-list" class="list" style="max-height: 280px; overflow:auto;"></div>
            <div class="row" style="margin-top: 8px;">
              <label><input type="checkbox" id="include-appts" checked /> ${t('includeAppointments')}</label>
              <label><input type="checkbox" id="include-images" checked /> ${t('includeImages')}</label>
            </div>
            <div class="row" style="margin-top: 8px;">
              <label><input type="radio" name="mode" value="merge" checked /> ${t('mergeAppendUpdate')}</label>
              ${(window.ALLOW_DESTRUCTIVE_WIPE === true || !productConfig.useSupabase)
                ? `<label><input type="radio" name="mode" value="replace" /> ${t('replaceWipeThenImport')}</label>`
                : ''}
            </div>
            <div class="row" style="margin-top: 8px;">
              <button id="import-selected" class="button">${t('importSelected')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="form">
          <div class="row">
            <button id="wipe-btn" class="button danger">${productConfig.useSupabase ? t('deleteMyData') : t('wipeAllData')}</button>
          </div>
          ${productConfig.useSupabase ? `
          <div class="row" style="margin-top: 8px;">
            <button id="signout-btn" class="button secondary">Sign Out</button>
          </div>
          ` : ''}
          
          <hr style="border-color: rgba(255,255,255,0.08); width:100%; margin: 16px 0;" />
          
          <h3 style="margin-top: 16px; margin-bottom: 8px;">🔧 Note Recovery</h3>
          <div class="card" style="background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3);">
            <div class="muted" style="font-size: 12px; margin-bottom: 12px;">
              If notes are missing content after editing, this tool can recover them from backups or alternate storage.
            </div>
            
            <div class="row" style="gap: 8px; margin-bottom: 12px;">
              <button id="scan-notes-btn" class="button" style="background: linear-gradient(135deg, #f59e0b, #d97706); flex: 1;">
                🔍 Scan for Corrupted Notes
              </button>
            </div>
            
            <div id="scan-results" class="hidden" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
              <div id="scan-summary" style="margin-bottom: 12px;"></div>
              <div id="recovery-actions" class="hidden">
                <div class="row" style="gap: 8px;">
                  <button id="recover-notes-btn" class="button" style="background: linear-gradient(135deg, #10b981, #059669); flex: 1;">
                    ✅ Recover Notes
                  </button>
                </div>
              </div>
            </div>
            
            <div id="recovery-status" style="margin-top: 12px; font-size: 12px;"></div>
          </div>
          
          <h3 style="margin-top: 16px; margin-bottom: 8px;">Restore Notes from Backup</h3>
          <div class="card" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);">
            <div class="muted" style="font-size: 12px; margin-bottom: 12px;">
              Load a backup file and restore notes from it. This will only replace corrupted notes.
            </div>
            
            <div class="row" style="gap: 8px;">
              <input id="restore-notes-file" type="file" accept="application/json" style="flex: 1;" />
              <button id="restore-notes-btn" class="button secondary">Load Backup</button>
            </div>
            
            <div id="restore-notes-status" style="margin-top: 12px; font-size: 12px;"></div>
          </div>
          
          ${isTradie() ? `
          <hr style="border-color: rgba(255,255,255,0.08); width:100%; margin: 16px 0;" />
          
          <h3 style="margin-top: 16px; margin-bottom: 8px;">⭐ Pro Settings</h3>
          
          <div class="card" style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="margin-bottom: 16px;">
              <strong style="font-size: 14px;">🔔 Backup Reminders</strong>
              <div class="muted" style="font-size: 12px; margin: 8px 0;">Get reminded to backup your data regularly.</div>
              <div style="display: flex; gap: 8px; margin-top: 8px;">
                <select id="backup-reminder-frequency" style="flex: 1;">
                  <option value="off">Off</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button id="save-backup-reminder" class="button secondary" style="padding: 8px 12px;">Save</button>
              </div>
            </div>
            
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
              <strong style="font-size: 14px;">🔒 App Lock</strong>
              <div class="muted" style="font-size: 12px; margin: 8px 0;">Protect your data with a PIN code when opening the app.</div>
              <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="app-lock-enabled" />
                  <span>Enable PIN Lock</span>
                </label>
              </div>
              <div id="pin-setup-section" style="display: none; margin-top: 12px;">
                <div style="display: flex; gap: 8px;">
                  <input type="password" id="app-lock-pin" placeholder="Enter 4-digit PIN" maxlength="4" pattern="[0-9]*" inputmode="numeric" style="flex: 1; text-align: center; letter-spacing: 8px; font-size: 18px;" />
                  <button id="save-app-lock" class="button" style="padding: 8px 16px;">Set PIN</button>
                </div>
              </div>
              <div id="pin-status" style="margin-top: 8px; font-size: 12px;"></div>
            </div>
          </div>
          ` : ''}
          
          <hr style="border-color: rgba(255,255,255,0.08); width:100%; margin: 16px 0;" />
          
          <div class="row">
            <button id="refresh-app-btn" class="button" style="background: linear-gradient(135deg, #667eea, #764ba2);">
              🔄 Refresh App (PWA)
            </button>
          </div>
          <div class="muted" style="font-size: 12px; margin-top: 8px;">
            Use this if notes don't appear after migration, especially when using the app from home screen.
          </div>
        </div>
      </div>
    `);

    // Load storage stats for tradie edition
    if (isTradie()) {
      loadStorageStats();
      const driverNameEl = document.getElementById('storage-driver-name');
      const runtimeEl = document.getElementById('native-runtime-status');
      const pluginEl = document.getElementById('native-plugin-status');
      const nativeDriverModeEl = document.getElementById('native-driver-mode');
      const saveNativeDriverModeBtn = document.getElementById('save-native-driver-mode-btn');
      const nativeDriverModeStatusEl = document.getElementById('native-driver-mode-status');
      const nativeMigrateBtn = document.getElementById('native-migrate-btn');
      const nativeMigrateStatusEl = document.getElementById('native-migrate-status');
      const nativeSmokeBtn = document.getElementById('native-smoke-test-btn');
      const nativeSmokeStatusEl = document.getElementById('native-smoke-test-status');
      if (driverNameEl) {
        const status = window.StorageDriverFactory?.getStatus?.();
        if (status?.initialized) {
          driverNameEl.textContent = `${status.driver} (${status.backend})`;
        } else {
          driverNameEl.textContent = productConfig.useSupabase ? 'Supabase API' : 'IndexedDB';
        }
      }
      const readiness = window.StorageDriverFactory?.getNativeReadiness?.();
      if (runtimeEl) {
        if (readiness) {
          runtimeEl.textContent = readiness.isNative ? `Native (${readiness.platform})` : `Web/PWA (${readiness.platform})`;
        } else {
          runtimeEl.textContent = 'Unknown';
        }
      }
      if (pluginEl) {
        if (readiness) {
          const sqliteText = readiness.sqlite?.available ? `SQLite: ready (${readiness.sqlite.pluginName})` : 'SQLite: missing';
          const fsText = readiness.filesystem?.available ? `Filesystem: ready (${readiness.filesystem.pluginName})` : 'Filesystem: missing';
          pluginEl.textContent = `${sqliteText} | ${fsText}`;
        } else {
          pluginEl.textContent = 'Unavailable';
        }
      }

      if (nativeDriverModeEl) {
        nativeDriverModeEl.value = getNativeDriverMode();
      }
      if (nativeDriverModeStatusEl) {
        nativeDriverModeStatusEl.textContent = `Current mode: ${getNativeDriverMode() === 'sqlite_test' ? 'SQLite Test Mode' : 'Adapter (Default)'}`;
      }
      if (saveNativeDriverModeBtn && nativeDriverModeEl) {
        saveNativeDriverModeBtn.addEventListener('click', () => {
          const saved = setNativeDriverMode(nativeDriverModeEl.value);
          if (nativeDriverModeStatusEl) {
            nativeDriverModeStatusEl.textContent = `Saved mode: ${saved === 'sqlite_test' ? 'SQLite Test Mode' : 'Adapter (Default)'}`;
          }
        });
      }

      if (nativeMigrateBtn && nativeMigrateStatusEl) {
        nativeMigrateBtn.addEventListener('click', async () => {
          const readinessCheck = window.StorageDriverFactory?.getNativeReadiness?.();
          if (!readinessCheck?.isNative) {
            nativeMigrateStatusEl.textContent = 'Native migration is only available in iOS/Android builds.';
            return;
          }
          if (!readinessCheck?.sqlite?.available) {
            nativeMigrateStatusEl.textContent = 'SQLite plugin is not available on this native runtime.';
            return;
          }

          const proceed = confirm(
            'This will copy current app data into a native SQLite database for migration testing. ' +
            'Your existing data source will remain unchanged. Continue?'
          );
          if (!proceed) return;

          nativeMigrateBtn.disabled = true;
          nativeMigrateStatusEl.textContent = 'Preparing data...';
          const backend = productConfig.useSupabase ? 'supabase-native' : 'indexeddb-native';
          const sourceApi = window.CrmDB || null;

          const sanitizeRecord = (record) => {
            if (!record || typeof record !== 'object') return null;
            const clone = { ...record };
            if ('blob' in clone) delete clone.blob;
            try {
              return JSON.parse(JSON.stringify(clone));
            } catch (error) {
              return null;
            }
          };

          try {
            if (!sourceApi) {
              throw new Error('Source data API unavailable');
            }

            const customers = typeof sourceApi.getAllCustomers === 'function' ? await sourceApi.getAllCustomers() : [];
            nativeMigrateStatusEl.textContent = `Loaded customers (${customers.length})...`;
            const appointments = typeof sourceApi.getAllAppointments === 'function' ? await sourceApi.getAllAppointments() : [];
            nativeMigrateStatusEl.textContent = `Loaded jobs (${appointments.length})...`;
            const notes = typeof sourceApi.getAllNotes === 'function' ? await sourceApi.getAllNotes() : [];
            const reminders = typeof sourceApi.getAllReminders === 'function' ? await sourceApi.getAllReminders() : [];
            const jobEvents = typeof sourceApi.getAllJobEvents === 'function' ? await sourceApi.getAllJobEvents() : [];

            let images = [];
            if (typeof sourceApi.getImagesByCustomerId === 'function') {
              nativeMigrateStatusEl.textContent = `Collecting photos for ${customers.length} customers...`;
              const imageMap = new Map();
              for (let i = 0; i < customers.length; i++) {
                const customer = customers[i];
                const customerImages = await sourceApi.getImagesByCustomerId(customer.id);
                customerImages.forEach((img) => {
                  const safe = sanitizeRecord(img);
                  if (!safe) return;
                  const key = safe.id != null ? String(safe.id) : `${safe.customerId || customer.id}-${safe.name || 'img'}-${safe.createdAt || i}`;
                  if (!imageMap.has(key)) imageMap.set(key, safe);
                });
              }
              images = Array.from(imageMap.values());
            }

            const datasets = {
              customers: (customers || []).map(sanitizeRecord).filter(Boolean),
              appointments: (appointments || []).map(sanitizeRecord).filter(Boolean),
              notes: (notes || []).map(sanitizeRecord).filter(Boolean),
              reminders: (reminders || []).map(sanitizeRecord).filter(Boolean),
              jobEvents: (jobEvents || []).map(sanitizeRecord).filter(Boolean),
              images: (images || []).map(sanitizeRecord).filter(Boolean)
            };

            nativeMigrateStatusEl.textContent = 'Opening native SQLite database...';
            await window.StorageDriverFactory.initialize({
              forceDriver: 'sqlite',
              dbName: `${productConfig.dbName || 'tradie-crm-db'}-native`,
              dbVersion: Number(productConfig.dbVersion || 1)
            });

            const sqliteDriver = window.StorageDriverFactory.getDriver();
            const stores = ['customers', 'appointments', 'notes', 'reminders', 'jobEvents', 'images'];
            const migratedCounts = {};

            for (let i = 0; i < stores.length; i++) {
              const store = stores[i];
              const rows = datasets[store] || [];
              nativeMigrateStatusEl.textContent = `Migrating ${store} (${rows.length})...`;
              await sqliteDriver.clear(store);
              for (let j = 0; j < rows.length; j++) {
                await sqliteDriver.create(store, rows[j]);
              }
              migratedCounts[store] = rows.length;
            }

            localStorage.setItem(`${STORAGE_PREFIX}last_native_migration`, JSON.stringify({
              at: new Date().toISOString(),
              database: `${productConfig.dbName || 'tradie-crm-db'}-native`,
              counts: migratedCounts
            }));

            nativeMigrateStatusEl.textContent =
              `Migration complete. customers:${migratedCounts.customers || 0}, jobs:${migratedCounts.appointments || 0}, notes:${migratedCounts.notes || 0}, reminders:${migratedCounts.reminders || 0}, events:${migratedCounts.jobEvents || 0}, images:${migratedCounts.images || 0}`;
          } catch (error) {
            nativeMigrateStatusEl.textContent = `Migration failed: ${error.message || error}`;
          } finally {
            try {
              if (window.CrmDB && typeof window.StorageDriverFactory.initializeFromDbApi === 'function') {
                await window.StorageDriverFactory.initializeFromDbApi(window.CrmDB, { backend });
              }
            } catch (restoreError) {
              // Keep migration result visible; restore errors can be checked in console.
            }
            const status = window.StorageDriverFactory?.getStatus?.();
            if (driverNameEl && status?.initialized) {
              driverNameEl.textContent = `${status.driver} (${status.backend})`;
            }
            nativeMigrateBtn.disabled = false;
          }
        });
      }

      if (nativeSmokeBtn && nativeSmokeStatusEl) {
        nativeSmokeBtn.addEventListener('click', async () => {
          const readinessCheck = window.StorageDriverFactory?.getNativeReadiness?.();
          if (!readinessCheck?.isNative) {
            nativeSmokeStatusEl.textContent = 'Native smoke test is only available in iOS/Android builds.';
            return;
          }
          const selectedMode = getNativeDriverMode();
          if (selectedMode !== 'sqlite_test') {
            nativeSmokeStatusEl.textContent = 'Driver mode is set to Adapter. Switch to SQLite Test Mode to run the SQLite smoke test.';
            return;
          }
          if (!readinessCheck?.sqlite?.available) {
            nativeSmokeStatusEl.textContent = 'SQLite plugin is not available on this native runtime.';
            return;
          }

          nativeSmokeBtn.disabled = true;
          nativeSmokeStatusEl.textContent = 'Running SQLite smoke test...';
          const backend = productConfig.useSupabase ? 'supabase-native' : 'indexeddb-native';

          try {
            await window.StorageDriverFactory.initialize({
              forceDriver: 'sqlite',
              dbName: `${productConfig.dbName || 'tradie-crm-db'}-smoke`,
              dbVersion: 1
            });
            const driver = window.StorageDriverFactory.getDriver();
            const store = 'smoke_test';

            await driver.clear(store);
            const id = await driver.create(store, {
              label: 'smoke',
              probe: 'write',
              createdAt: new Date().toISOString()
            });
            const fetched = await driver.getById(store, id);
            if (!fetched || fetched.id !== id) {
              throw new Error('create/getById check failed');
            }

            await driver.update(store, { ...fetched, label: 'updated' });
            const indexed = await driver.getByIndex(store, 'label', 'updated');
            if (!Array.isArray(indexed) || !indexed.some((row) => row && row.id === id)) {
              throw new Error('update/getByIndex check failed');
            }

            await driver.delete(store, id);
            const deleted = await driver.getById(store, id);
            if (deleted) {
              throw new Error('delete/getById check failed');
            }

            nativeSmokeStatusEl.textContent = 'SQLite smoke test passed (create/read/update/index/delete).';
          } catch (error) {
            nativeSmokeStatusEl.textContent = `SQLite smoke test failed: ${error.message || error}`;
          } finally {
            try {
              if (window.CrmDB && typeof window.StorageDriverFactory.initializeFromDbApi === 'function') {
                await window.StorageDriverFactory.initializeFromDbApi(window.CrmDB, { backend });
              }
            } catch (restoreError) {
              // Keep smoke result visible; restore errors can be checked via console.
            }
            const status = window.StorageDriverFactory?.getStatus?.();
            if (driverNameEl && status?.initialized) {
              driverNameEl.textContent = `${status.driver} (${status.backend})`;
            }
            nativeSmokeBtn.disabled = false;
          }
        });
      }
    }

    const exportBtn = document.getElementById('export-btn');
    const exportLiteBtn = document.getElementById('export-lite-btn');
    const exportImagesOnlyBtn = document.getElementById('export-images-only-btn');
    const downloadBtn = document.getElementById('download-btn');
    const loadBtn = document.getElementById('load-backup');
    const importFile = document.getElementById('import-file');
    const wipeBtn = document.getElementById('wipe-btn');
    const signOutBtn = document.getElementById('signout-btn');
    const statusEl = document.getElementById('backup-status');
    const preview = document.getElementById('backup-preview');
    const summary = document.getElementById('summary');
    const customerList = document.getElementById('customer-list');
    const selectAllBtn = document.getElementById('select-all');
    const selectNoneBtn = document.getElementById('select-none');
    const includeApptsEl = document.getElementById('include-appts');
    const includeImagesEl = document.getElementById('include-images');
    const importSelectedBtn = document.getElementById('import-selected');
    const destructiveWipeAllowed = window.ALLOW_DESTRUCTIVE_WIPE === true;

    let lastExportBlobUrl = null;
    let lastExportFileName = null;
    let loadedBackup = null;
    const filterCustomerNotesForIds = (notesInput, allowedIds) => {
      const allowed = new Set((allowedIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id)));
      if (Array.isArray(notesInput)) {
        return notesInput.filter((n) => allowed.has(Number(n?.customerId)));
      }
      if (notesInput && typeof notesInput === 'object') {
        const out = {};
        Object.keys(notesInput).forEach((cid) => {
          const numId = Number(cid);
          if (!allowed.has(numId)) return;
          out[cid] = (notesInput[cid] || []).filter((n) => allowed.has(Number(n?.customerId ?? cid)));
        });
        return out;
      }
      return [];
    };
    const isImagesOnlyBackup = (backup) => {
      if (!backup || typeof backup !== 'object') return false;
      const type = String(backup.__meta?.backupType || '').toLowerCase();
      return type === 'images-only' || ((backup.customers || []).length === 0 && (backup.images || []).length > 0);
    };

    if (!db) {
      statusEl.textContent = 'Storage backend unavailable on this screen.';
      [exportBtn, exportLiteBtn, exportImagesOnlyBtn, downloadBtn, loadBtn, importSelectedBtn, wipeBtn].forEach((el) => {
        if (el) el.disabled = true;
      });
      return;
    }

    if (wipeBtn && !productConfig.useSupabase && !destructiveWipeAllowed) {
      wipeBtn.disabled = true;
      wipeBtn.title = 'Disabled in this environment';
    }

    exportBtn.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Starting full export...';
        exportBtn.disabled = true;
        if (exportLiteBtn) exportLiteBtn.disabled = true;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        
        const result = await db.safeExportAllData((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });
        
        statusEl.textContent = 'Creating backup file...';
        
        if (lastExportBlobUrl) URL.revokeObjectURL(lastExportBlobUrl);
        lastExportBlobUrl = URL.createObjectURL(result.blob);
        lastExportFileName = `${productConfig.appSlug || 'crm'}-backup-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
        downloadBtn.disabled = false;
        statusEl.textContent = `Full backup ready: ${lastExportFileName}`;
        
        exportBtn.disabled = false;
        if (exportLiteBtn) exportLiteBtn.disabled = false;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = false;
        exportBtn.textContent = 'Export with Images';
      } catch (error) {
        statusEl.textContent = `Full export failed: ${error.message}`;
        exportBtn.disabled = false;
        if (exportLiteBtn) exportLiteBtn.disabled = false;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = false;
        exportBtn.textContent = 'Export with Images';
      }
    });

    exportLiteBtn?.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Starting data-only export...';
        exportBtn.disabled = true;
        exportLiteBtn.disabled = true;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = true;
        exportLiteBtn.textContent = 'Exporting...';

        const result = await db.exportDataWithoutImages((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });

        if (lastExportBlobUrl) URL.revokeObjectURL(lastExportBlobUrl);
        lastExportBlobUrl = URL.createObjectURL(result.blob);
        lastExportFileName = `${productConfig.appSlug || 'crm'}-backup-data-only-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
        downloadBtn.disabled = false;
        statusEl.textContent = `Data-only backup ready: ${lastExportFileName}`;

        exportBtn.disabled = false;
        exportLiteBtn.disabled = false;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = false;
        exportLiteBtn.textContent = 'Export Data Only';
      } catch (error) {
        statusEl.textContent = `Data-only export failed: ${error.message}`;
        exportBtn.disabled = false;
        exportLiteBtn.disabled = false;
        if (exportImagesOnlyBtn) exportImagesOnlyBtn.disabled = false;
        exportLiteBtn.textContent = 'Export Data Only';
      }
    });

    exportImagesOnlyBtn?.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Starting images-only export...';
        exportBtn.disabled = true;
        if (exportLiteBtn) exportLiteBtn.disabled = true;
        exportImagesOnlyBtn.disabled = true;
        exportImagesOnlyBtn.textContent = 'Exporting...';

        const result = await db.exportImagesOnly((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });

        if (lastExportBlobUrl) URL.revokeObjectURL(lastExportBlobUrl);
        lastExportBlobUrl = URL.createObjectURL(result.blob);
        lastExportFileName = `${productConfig.appSlug || 'crm'}-backup-images-only-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
        downloadBtn.disabled = false;
        statusEl.textContent = `Images-only backup ready: ${lastExportFileName}`;

        exportBtn.disabled = false;
        if (exportLiteBtn) exportLiteBtn.disabled = false;
        exportImagesOnlyBtn.disabled = false;
        exportImagesOnlyBtn.textContent = 'Export Images Only';
      } catch (error) {
        statusEl.textContent = `Images-only export failed: ${error.message}`;
        exportBtn.disabled = false;
        if (exportLiteBtn) exportLiteBtn.disabled = false;
        exportImagesOnlyBtn.disabled = false;
        exportImagesOnlyBtn.textContent = 'Export Images Only';
      }
    });

    downloadBtn.addEventListener('click', () => {
      if (!lastExportBlobUrl) return;
      const a = document.createElement('a');
      a.href = lastExportBlobUrl;
      a.download = lastExportFileName || 'backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });

    loadBtn.addEventListener('click', async () => {
      const file = importFile.files && importFile.files[0];
      if (!file) { alert('Choose a backup file first'); return; }
      try {
        const text = await file.text();
        loadedBackup = JSON.parse(text);
        const customers = loadedBackup.customers || [];
        const appointments = loadedBackup.appointments || [];
        const images = loadedBackup.images || [];
        if (isImagesOnlyBackup(loadedBackup)) {
          summary.textContent = `Images-only backup detected: ${images.length} images`;
          customerList.innerHTML = `<div class="muted">This file contains images only. Import will merge images into existing data.</div>`;
          importSelectedBtn.textContent = 'Import Images Only';
          includeApptsEl.checked = false;
          includeApptsEl.disabled = true;
          includeImagesEl.checked = true;
          includeImagesEl.disabled = true;
        } else {
          summary.textContent = `Customers: ${customers.length}, Appointments: ${appointments.length}, Images: ${images.length}`;
          customerList.innerHTML = customers.map((c) => `
            <label class="list-item">
              <span>
                <strong>${escapeHtml(c.lastName || '')} ${escapeHtml(c.firstName || '')}</strong>
                <span class="muted"> (ID ${c.id || '?'}, ${escapeHtml(c.contactNumber || '')})</span>
              </span>
              <input type="checkbox" class="select-customer" data-id="${c.id}" checked />
            </label>
          `).join('');
          importSelectedBtn.textContent = t('importSelected');
          includeApptsEl.disabled = false;
          includeImagesEl.disabled = false;
        }
        preview.classList.remove('hidden');
      } catch (e) {
        alert('Could not read backup file: ' + e.message);
      }
    });

    selectAllBtn.addEventListener('click', () => {
      customerList.querySelectorAll('.select-customer').forEach((cb) => { cb.checked = true; });
    });
    selectNoneBtn.addEventListener('click', () => {
      customerList.querySelectorAll('.select-customer').forEach((cb) => { cb.checked = false; });
    });


    importSelectedBtn.addEventListener('click', async () => {
      if (!loadedBackup) { alert('Load a backup first'); return; }

      if (isImagesOnlyBackup(loadedBackup)) {
        const images = loadedBackup.images || [];
        if (images.length === 0) { alert('No images found in this backup'); return; }
        try {
          statusEl.textContent = 'Importing images...';
          await db.importAllData({
            __meta: loadedBackup.__meta || { app: productConfig.appSlug || 'crm', version: 1 },
            customers: [],
            appointments: [],
            images,
            customerNotes: {}
          }, { mode: 'merge' });
          statusEl.textContent = `Images import complete (${images.length} images)`;
          alert(`Imported ${images.length} images`);
        } catch (e) {
          statusEl.textContent = 'Images import failed';
          alert('Images import failed: ' + e.message);
        }
        return;
      }

      const selectedIds = Array.from(customerList.querySelectorAll('.select-customer'))
        .filter((cb) => cb.checked)
        .map((cb) => Number(cb.getAttribute('data-id')))
        .filter((v) => !Number.isNaN(v));
      if (selectedIds.length === 0) { alert('No customers selected'); return; }
      const includeAppointments = includeApptsEl.checked;
      const includeImages = includeImagesEl.checked;
      const mode = (document.querySelector('input[name="mode"]:checked') || {}).value || 'merge';
      if (mode === 'replace' && !destructiveWipeAllowed) {
        alert('Replace import (wipe + import) is disabled in this environment for safety.');
        return;
      }

      const customers = (loadedBackup.customers || []).filter((c) => selectedIds.includes(c.id));
      const appointments = includeAppointments ? (loadedBackup.appointments || []).filter((a) => selectedIds.includes(a.customerId)) : [];
      const images = includeImages ? (loadedBackup.images || []).filter((img) => selectedIds.includes(img.customerId)) : [];
      
      // Chunked import for large datasets
      const CHUNK_SIZE = 5; // Process 5 customers at a time
      const totalCustomers = customers.length;
      
      if (totalCustomers > CHUNK_SIZE) {
        const proceed = confirm(`Importing ${totalCustomers} customers. This will be done in chunks of ${CHUNK_SIZE} to prevent memory issues. Continue?`);
        if (!proceed) return;
        
        statusEl.textContent = `Importing in chunks... (0/${totalCustomers})`;
        importSelectedBtn.disabled = true;
        
        try {
          for (let i = 0; i < customers.length; i += CHUNK_SIZE) {
            const chunk = customers.slice(i, i + CHUNK_SIZE);
            const chunkCustomerIds = chunk.map(c => c.id);
            const chunkAppointments = appointments.filter(a => chunkCustomerIds.includes(a.customerId));
            const chunkImages = images.filter(img => chunkCustomerIds.includes(img.customerId));
            // In chunked imports, a full replace should only happen once.
            // Running replace on every chunk repeatedly wipes previously imported chunks.
            const chunkMode = (mode === 'replace' && i > 0) ? 'merge' : mode;
            
            const payload = {
              __meta: loadedBackup.__meta || { app: productConfig.appSlug || 'crm', version: 1 },
              customers: chunk, 
              appointments: chunkAppointments, 
              images: chunkImages,
              customerNotes: filterCustomerNotesForIds(loadedBackup.customerNotes || loadedBackup.notes || [], chunkCustomerIds)
            };
            
            await db.importAllData(payload, { mode: chunkMode });
            
            const processed = Math.min(i + CHUNK_SIZE, totalCustomers);
            statusEl.textContent = `Importing in chunks... (${processed}/${totalCustomers})`;
            
            // Small delay to prevent overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          statusEl.textContent = `Import complete! ${totalCustomers} customers imported.`;
          alert(`Import complete! ${totalCustomers} customers imported successfully.`);
        } catch (e) {
          statusEl.textContent = 'Import failed';
          alert('Import failed: ' + e.message);
        } finally {
          importSelectedBtn.disabled = false;
        }
      } else {
        // Small dataset, import normally
        const payload = { 
          __meta: loadedBackup.__meta || { app: productConfig.appSlug || 'crm', version: 1 }, 
          customers, 
          appointments, 
          images,
          customerNotes: filterCustomerNotesForIds(loadedBackup.customerNotes || loadedBackup.notes || [], selectedIds)
        };
        try {
          statusEl.textContent = 'Importing...';
          await db.importAllData(payload, { mode });
          statusEl.textContent = 'Import complete';
          alert('Import complete');
        } catch (e) {
          statusEl.textContent = 'Import failed';
          alert('Import failed: ' + e.message);
        }
      }
    });

    wipeBtn.addEventListener('click', async () => {
      if (productConfig.useSupabase) {
        if (typeof db.deleteMyData !== 'function') {
          alert('Delete My Data is not available yet. Please apply the latest migration and redeploy.');
          return;
        }
        const warning = 'This will permanently delete ONLY your own cloud data in this product profile.';
        if (!confirm(`${warning}\n\nContinue?`)) return;
        const phrase = window.prompt('Type DELETE MY DATA to confirm:');
        if (phrase !== 'DELETE MY DATA') {
          alert('Deletion cancelled.');
          return;
        }
        await db.deleteMyData();
        alert('Your profile data has been deleted.');
        window.location.hash = '#/find';
        window.location.reload();
        return;
      }

      if (!destructiveWipeAllowed) {
        alert('Wipe All Data is disabled in this environment for safety.');
        return;
      }
      const wipeScope = 'all local data on this device';
      if (!confirm(`This will permanently delete ${wipeScope}. Continue?`)) return;
      const phrase = window.prompt('Type DELETE to confirm destructive wipe:');
      if (phrase !== 'DELETE') {
        alert('Wipe cancelled.');
        return;
      }
      await db.clearAllStores();
      alert('All local data deleted');
    });

    signOutBtn?.addEventListener('click', async () => {
      const ok = confirm('Sign out of Supabase now?');
      if (!ok) return;
      await signOutCurrentUser();
    });

    // Add event listener for refresh app button
    const refreshAppBtn = document.getElementById('refresh-app-btn');
    if (refreshAppBtn) {
      refreshAppBtn.addEventListener('click', () => {
        // Clear migration completed flag to force re-migration
        localStorage.removeItem(`${STORAGE_PREFIX}migration_completed`);
        // Reload the page
        window.location.reload();
      });
    }

    // Pro Settings handlers (tradie edition)
    if (isTradie()) {
      // Load saved backup reminder setting
      const backupReminderSelect = document.getElementById('backup-reminder-frequency');
      if (backupReminderSelect) {
        const savedFrequency = localStorage.getItem(`${STORAGE_PREFIX}backup_reminder_frequency`) || 'off';
        backupReminderSelect.value = savedFrequency;
        
        document.getElementById('save-backup-reminder')?.addEventListener('click', () => {
          const frequency = backupReminderSelect.value;
          localStorage.setItem(`${STORAGE_PREFIX}backup_reminder_frequency`, frequency);
          
          // Schedule next reminder
          if (frequency !== 'off') {
            const now = new Date();
            let nextReminder;
            if (frequency === 'weekly') {
              nextReminder = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            } else if (frequency === 'monthly') {
              nextReminder = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            }
            localStorage.setItem(`${STORAGE_PREFIX}next_backup_reminder`, nextReminder.toISOString());
          } else {
            localStorage.removeItem(`${STORAGE_PREFIX}next_backup_reminder`);
          }
          
          alert('Backup reminder setting saved!');
        });
      }
      
      // App Lock settings
      const appLockCheckbox = document.getElementById('app-lock-enabled');
      const pinSetupSection = document.getElementById('pin-setup-section');
      const pinStatus = document.getElementById('pin-status');
      
      if (appLockCheckbox) {
        // Load current setting
        const hasPin = localStorage.getItem(`${STORAGE_PREFIX}app_lock_pin`);
        appLockCheckbox.checked = !!hasPin;
        if (hasPin) {
          pinStatus.innerHTML = '<span style="color: #22c55e;">✓ PIN is set</span>';
        }
        
        appLockCheckbox.addEventListener('change', () => {
          if (appLockCheckbox.checked) {
            pinSetupSection.style.display = 'block';
          } else {
            pinSetupSection.style.display = 'none';
            // Clear the PIN
            localStorage.removeItem(`${STORAGE_PREFIX}app_lock_pin`);
            pinStatus.innerHTML = '<span style="color: #94a3b8;">PIN lock disabled</span>';
          }
        });
        
        document.getElementById('save-app-lock')?.addEventListener('click', () => {
          const pinInput = document.getElementById('app-lock-pin');
          const pin = pinInput.value.trim();
          
          if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            alert('Please enter a 4-digit PIN');
            return;
          }
          
          // Store hashed PIN (simple hash for demo - in production use proper hashing)
          const hashedPin = btoa(pin + APP_LOCK_SALT);
          localStorage.setItem(`${STORAGE_PREFIX}app_lock_pin`, hashedPin);
          
          pinInput.value = '';
          pinSetupSection.style.display = 'none';
          pinStatus.innerHTML = '<span style="color: #22c55e;">✓ PIN has been set!</span>';
        });
      }
    }

    // Note Recovery handlers (extracted module)
    if (window.NoteRecoveryUI && typeof window.NoteRecoveryUI.bindHandlers === 'function') {
      window.NoteRecoveryUI.bindHandlers({ escapeHtml });
    }
  }

  async function renderEmergencyBackup() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between section-header">
        <h2>${t('emergencyBackup')}</h2>
      </div>
      <div class="card">
        <div class="form">
          <div style="background: #ff6b6b; color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin-top: 0; color: white;">⚠️ CRITICAL: Backup Your Data First!</h3>
            <p style="margin-bottom: 0;">Before clearing Safari's cache, you MUST backup your database or you will lose all customer data!</p>
          </div>
          
          <div class="row">
            <button id="emergency-export-btn" class="button" style="background: #ff6b6b; color: white; font-weight: bold;">
              ${t('downloadBackupNow')}
            </button>
          </div>
          
          <hr style="border-color: rgba(255,255,255,0.08); width:100%; margin: 16px 0;" />
          
          <div style="background: #4ecdc4; color: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <h3 style="margin-top: 0; color: white;">🔄 Force App Update</h3>
            <p style="margin-bottom: 0;">After backing up, use this to force the app to update to the latest version:</p>
          </div>
          
          <div class="row">
            <button id="clear-cache-btn" class="button" style="background: #4ecdc4; color: white; font-weight: bold;">
              ${t('clearCacheAndReload')}
            </button>
          </div>
          
          <div class="muted" id="emergency-status" style="margin-top: 16px;"></div>
        </div>
      </div>
    `);

    const exportBtn = document.getElementById('emergency-export-btn');
    const clearCacheBtn = document.getElementById('clear-cache-btn');
    const statusEl = document.getElementById('emergency-status');

    exportBtn.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Starting backup...';
        statusEl.style.color = '#4ecdc4';
        
        // Disable button during backup
        exportBtn.disabled = true;
        exportBtn.textContent = 'Backing up...';
        
        const result = await CrmDB.exportDataWithoutImages((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });
        
        statusEl.textContent = 'Creating download...';
        
        // Use the pre-created blob
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${productConfig.appSlug || 'crm'}-emergency-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        statusEl.textContent = `✅ Backup downloaded! ${result.customers.length} customers, ${result.appointments.length} appointments, ${result.imageCount} images`;
        statusEl.style.color = '#4ecdc4';
        
        // Re-enable button
        exportBtn.disabled = false;
        exportBtn.textContent = t('downloadBackupNow');
        
      } catch (error) {
        statusEl.textContent = `❌ Backup failed: ${error.message}`;
        statusEl.style.color = '#ff6b6b';
        
        // Re-enable button
        exportBtn.disabled = false;
        exportBtn.textContent = t('downloadBackupNow');
      }
    });

    clearCacheBtn.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Clearing cache and reloading...';
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        
        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(registration => registration.unregister()));
        }
        
        // Clear localStorage (but keep language preference)
        const lang = localStorage.getItem(`${STORAGE_PREFIX}lang`);
        localStorage.clear();
        if (lang) localStorage.setItem(`${STORAGE_PREFIX}lang`, lang);
        
        // Force reload with cache busting
        const timestamp = Date.now();
        window.location.href = `${window.location.origin}${window.location.pathname}?v=${timestamp}`;
        
      } catch (error) {
        statusEl.textContent = `❌ Cache clear failed: ${error.message}`;
        statusEl.style.color = '#ff6b6b';
      }
    });
  }

  // Helpers
  function setFormReadOnly(formEl, readOnly) {
    formEl.dataset.readOnly = readOnly ? 'true' : 'false';
    const inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach((el) => {
      if (el.name === 'firstName' || el.name === 'lastName' || el.name === 'contactNumber' || el.name === 'referralType' || el.name === 'referralNotes') {
        el.disabled = readOnly;
      }
    });
  }

  function setInputValue(container, name, value) {
    const el = container.querySelector(`input[name="${name}"]`);
    if (el) el.value = value;
  }
  function getInputValue(container, name) {
    const el = container.querySelector(`input[name="${name}"]`);
    return el ? el.value : '';
  }
  function setSelectValue(container, name, value) {
    const el = container.querySelector(`select[name="${name}"]`);
    if (el) el.value = value;
  }
  function getSelectValue(container, name) {
    const el = container.querySelector(`select[name="${name}"]`);
    return el ? el.value : '';
  }

  function showModal(html) {
    modalRoot.innerHTML = html;
    modalRoot.setAttribute('aria-hidden', 'false');
    modalRoot.addEventListener('click', (e) => {
      if (e.target === modalRoot) hideModal();
    }, { once: true });
  }
  function hideModal() {
    modalRoot.innerHTML = '';
    modalRoot.setAttribute('aria-hidden', 'true');
  }

  // Enhanced Quill configuration for handwriting
  function createHandwritingQuill(containerId, options = {}) {
    const defaultConfig = {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']
        ]
      },
      placeholder: 'Write with Apple Pencil...',
      readOnly: false
    };
    
    const config = { ...defaultConfig, ...options };
    const quill = new Quill(containerId, config);
    
    // Register custom embed for handwriting content
    const CustomHandwriting = Quill.import('blots/embed');
    class HandwritingBlot extends CustomHandwriting {
      static create(value) {
        const node = super.create();
        node.innerHTML = value;
        return node;
      }
      
      static value(node) {
        return node.innerHTML;
      }
    }
    HandwritingBlot.blotName = 'custom-handwriting';
    HandwritingBlot.tagName = 'div';
    HandwritingBlot.className = 'handwriting-embed';
    
    Quill.register(HandwritingBlot);
    
    return quill;
  }

  // Image viewer modal
  function showImageViewer(images, currentIndex = 0) {
    if (!images || images.length === 0) return;
    
    const modalId = 'image-viewer-' + Date.now();
    const currentImage = images[currentIndex];
    const hasMultiple = images.length > 1;
    
    const modalHtml = `
      <div class="image-viewer-modal" id="${modalId}">
        <div class="image-viewer-header">
          <div class="image-counter">${currentIndex + 1} / ${images.length}</div>
          <button class="image-viewer-close" id="image-viewer-close">✕</button>
        </div>
        <div class="image-viewer-content">
          ${hasMultiple ? '<button class="image-nav-btn image-nav-prev" id="image-nav-prev">‹</button>' : ''}
          <div class="image-viewer-main">
            <img src="${URL.createObjectURL(currentImage.blob)}" alt="${escapeHtml(currentImage.name)}" class="viewer-image" />
            <div class="image-actions">
              <button class="image-delete-btn" id="image-delete-btn" data-image-id="${currentImage.id}">🗑️ Delete</button>
            </div>
          </div>
          ${hasMultiple ? '<button class="image-nav-btn image-nav-next" id="image-nav-next">›</button>' : ''}
        </div>
      </div>
    `;
    
    modalRoot.innerHTML = modalHtml;
    modalRoot.setAttribute('aria-hidden', 'false');
    
    let currentIdx = currentIndex;
    
    // Navigation functions
    function showImage(index) {
      if (index < 0 || index >= images.length) return;
      currentIdx = index;
      const img = images[currentIdx];
      const imgEl = document.querySelector('.viewer-image');
      const counterEl = document.querySelector('.image-counter');
      const deleteBtn = document.getElementById('image-delete-btn');
      
      imgEl.src = URL.createObjectURL(img.blob);
      imgEl.alt = escapeHtml(img.name);
      counterEl.textContent = `${currentIdx + 1} / ${images.length}`;
      deleteBtn.dataset.imageId = img.id;
      
      // Update navigation button states
      const prevBtn = document.getElementById('image-nav-prev');
      const nextBtn = document.getElementById('image-nav-next');
      if (prevBtn) prevBtn.disabled = currentIdx === 0;
      if (nextBtn) nextBtn.disabled = currentIdx === images.length - 1;
    }
    
    // Event handlers
    document.getElementById('image-viewer-close').addEventListener('click', hideModal);
    
    const prevBtn = document.getElementById('image-nav-prev');
    const nextBtn = document.getElementById('image-nav-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => showImage(currentIdx - 1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => showImage(currentIdx + 1));
    }
    
    // Delete image
    document.getElementById('image-delete-btn').addEventListener('click', async () => {
      const imageId = parseInt(document.getElementById('image-delete-btn').dataset.imageId);
      if (!confirm('Delete this image?')) return;
      
      try {
        await CrmDB.deleteImage(imageId);
        // Remove from local array
        images.splice(currentIdx, 1);
        
        if (images.length === 0) {
          hideModal();
          // Refresh the image grid by triggering a page refresh or re-rendering
          window.location.reload();
          return;
        }
        
        // Adjust current index if needed
        if (currentIdx >= images.length) {
          currentIdx = images.length - 1;
        }
        
        showImage(currentIdx);
        
        // Refresh the image grid by triggering a page refresh
        window.location.reload();
      } catch (error) {
        alert('Error deleting image');
      }
    });
    
    // Keyboard navigation
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        hideModal();
      } else if (e.key === 'ArrowLeft' && hasMultiple) {
        showImage(currentIdx - 1);
      } else if (e.key === 'ArrowRight' && hasMultiple) {
        showImage(currentIdx + 1);
      }
    };
    document.addEventListener('keydown', handleKeydown);
    
    // Initialize
    showImage(currentIdx);
  }

  // Enhanced handwriting modal for iPad
  function showHandwritingModal(title, initialContent = '', onSave = null) {
    const modalId = 'handwriting-modal-' + Date.now();
    const modalHtml = `
      <div class="handwriting-modal" id="${modalId}">
        <div class="modal-header">
          <h2 class="modal-title">${title}</h2>
          <div class="modal-actions">
            <button class="button secondary" id="handwriting-cancel">${t('cancel')}</button>
            <button class="button" id="handwriting-save">${t('save')}</button>
          </div>
        </div>
        <div class="handwriting-controls">
          <div class="handwriting-mode-selector">
            <label>
              <input type="radio" name="handwriting-mode" value="auto" ${handwritingSettings.digitizationMode === 'auto' ? 'checked' : ''}>
              Auto Digitization
            </label>
            <label>
              <input type="radio" name="handwriting-mode" value="vector" ${handwritingSettings.digitizationMode === 'vector' ? 'checked' : ''}>
              Save as Vector/Image
            </label>
          </div>
          <div class="handwriting-options" id="handwriting-options" style="display: ${handwritingSettings.digitizationMode === 'vector' ? 'block' : 'none'};">
            <label>
              Format:
              <select id="vector-format">
                <option value="svg" ${handwritingSettings.vectorFormat === 'svg' ? 'selected' : ''}>SVG</option>
                <option value="png" ${handwritingSettings.vectorFormat === 'png' ? 'selected' : ''}>PNG</option>
              </select>
            </label>
            <label>
              <input type="checkbox" id="auto-resize" ${handwritingSettings.autoResize ? 'checked' : ''}>
              Auto-resize to line height
            </label>
            <label>
              Line height: <input type="number" id="line-height" value="${handwritingSettings.lineHeight}" min="12" max="48" step="2">
            </label>
          </div>
        </div>
        <div id="handwriting-content">
          <div id="handwriting-quill-container" style="display: ${handwritingSettings.digitizationMode === 'auto' ? 'block' : 'none'};"></div>
          <div id="handwriting-canvas-container" style="display: ${handwritingSettings.digitizationMode === 'vector' ? 'block' : 'none'};">
            <div class="canvas-toolbar">
              <button type="button" id="clear-canvas" class="button secondary">Clear</button>
              <button type="button" id="undo-stroke" class="button secondary">Undo</button>
            </div>
            <div id="handwriting-canvas-wrapper"></div>
          </div>
        </div>
      </div>
    `;
    
    modalRoot.innerHTML = modalHtml;
    modalRoot.setAttribute('aria-hidden', 'false');
    
    // Prevent touch events from going through to elements behind the modal
    modalRoot.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    });
    modalRoot.addEventListener('touchmove', (e) => {
      e.stopPropagation();
    });
    modalRoot.addEventListener('touchend', (e) => {
      e.stopPropagation();
    });
    
    let quill = null;
    let handwritingCanvas = null;
    let currentContent = initialContent;

    // Initialize based on selected mode
    function initializeHandwriting() {
      const mode = document.querySelector('input[name="handwriting-mode"]:checked').value;
      
      if (mode === 'auto') {
        // Initialize Quill for auto digitization
        if (!quill) {
          quill = createHandwritingQuill('#handwriting-quill-container');
          if (initialContent) {
            quill.clipboard.dangerouslyPasteHTML(initialContent);
          }
        }
        document.getElementById('handwriting-quill-container').style.display = 'block';
        document.getElementById('handwriting-canvas-container').style.display = 'none';
      } else {
        // Initialize canvas for vector/image mode
        if (!handwritingCanvas) {
          // Calculate canvas size to use most of the available screen space
          const availableWidth = window.innerWidth - 100; // Account for padding
          const availableHeight = window.innerHeight - 200; // Account for header and controls
          const canvasWidth = Math.max(800, availableWidth);
          const canvasHeight = Math.max(500, availableHeight);
          
          handwritingCanvas = new HandwritingCanvas('#handwriting-canvas-wrapper', {
            width: canvasWidth,
            height: canvasHeight,
            lineWidth: 3, // Slightly thicker for better visibility on larger canvas
            strokeColor: '#ffffff'
          });
        }
        document.getElementById('handwriting-quill-container').style.display = 'none';
        document.getElementById('handwriting-canvas-container').style.display = 'block';
      }
    }

    // Initialize on load
    initializeHandwriting();

    // Mode change handler
    document.querySelectorAll('input[name="handwriting-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        handwritingSettings.digitizationMode = e.target.value;
        saveHandwritingSettings();
        
        // Show/hide options panel
        const optionsPanel = document.getElementById('handwriting-options');
        if (e.target.value === 'vector') {
          optionsPanel.style.display = 'block';
        } else {
          optionsPanel.style.display = 'none';
        }
        
        initializeHandwriting();
      });
    });

    // Options change handlers
    document.getElementById('vector-format').addEventListener('change', (e) => {
      handwritingSettings.vectorFormat = e.target.value;
      saveHandwritingSettings();
    });

    document.getElementById('auto-resize').addEventListener('change', (e) => {
      handwritingSettings.autoResize = e.target.checked;
      saveHandwritingSettings();
    });

    document.getElementById('line-height').addEventListener('change', (e) => {
      handwritingSettings.lineHeight = parseInt(e.target.value);
      saveHandwritingSettings();
    });

    // Canvas controls
    document.getElementById('clear-canvas').addEventListener('click', () => {
      if (handwritingCanvas) {
        handwritingCanvas.clear();
      }
    });

    document.getElementById('undo-stroke').addEventListener('click', () => {
      if (handwritingCanvas && handwritingCanvas.strokes.length > 0) {
        handwritingCanvas.strokes.pop();
        handwritingCanvas.clear();
        handwritingCanvas.ctx.strokeStyle = '#ffffff';
        handwritingCanvas.ctx.lineWidth = 2;
        handwritingCanvas.ctx.lineCap = 'round';
        handwritingCanvas.ctx.lineJoin = 'round';
        
        // Redraw all strokes except the last one
        handwritingCanvas.strokes.forEach(stroke => {
          if (stroke.length < 2) return;
          handwritingCanvas.ctx.beginPath();
          handwritingCanvas.ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            handwritingCanvas.ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          handwritingCanvas.ctx.stroke();
        });
      }
    });

    // Event handlers
    document.getElementById('handwriting-cancel').addEventListener('click', () => {
      const hasContent = handwritingCanvas ? handwritingCanvas.strokes.length > 0 : 
                        quill ? (quill.getText() || '').trim().length > 0 : false;
      if (hasContent) {
        if (!confirm('Discard changes?')) return;
      }
      hideModal();
    });
    
    document.getElementById('handwriting-save').addEventListener('click', () => {
      const mode = document.querySelector('input[name="handwriting-mode"]:checked').value;
      
      if (mode === 'auto' && quill) {
        // Auto digitization mode - save as HTML
        currentContent = quill.root.innerHTML;
      } else if (mode === 'vector' && handwritingCanvas) {
        // Vector/image mode - save as image or SVG
        if (handwritingCanvas.strokes.length === 0) {
          alert('Please draw something before saving.');
          return;
        }

        let content;
        if (handwritingSettings.vectorFormat === 'svg') {
          // For SVG, apply auto-resize by scaling the viewBox if enabled
          let svgContent = handwritingCanvas.getSVG();
          if (handwritingSettings.autoResize) {
            // Calculate scale factor
            const originalHeight = handwritingCanvas.canvas.height;
            const targetHeight = handwritingSettings.lineHeight;
            const scale = targetHeight / originalHeight;
            const newWidth = Math.round(handwritingCanvas.canvas.width * scale);
            
            // Update SVG dimensions - use regex to match any width/height values
            svgContent = svgContent.replace(
              /width="\d+" height="\d+"/,
              `width="${newWidth}" height="${targetHeight}"`
            );
          }
          content = `<div class="handwriting-svg" style="max-height: ${handwritingSettings.lineHeight}px; width: auto; display: inline-block;">${svgContent}</div>`;
        } else {
          // PNG format
          let canvas = handwritingCanvas.canvas;
          if (handwritingSettings.autoResize) {
            canvas = handwritingCanvas.resizeToLineHeight();
          }
          content = `<img src="${canvas.toDataURL('image/png')}" style="max-height: ${handwritingSettings.lineHeight}px; width: auto;" />`;
        }
        
        currentContent = content;
      }
      
      
      if (onSave) {
        onSave(currentContent);
      }
      hideModal();
    });
    
    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        hideModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  function debounce(fn, ms) {
    let t = 0;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] || c);
  }

  // Helper function to get current customer ID from URL or page context
  function getCurrentCustomerId() {
    // Try to get customer ID from URL hash parameters
    const hash = window.location.hash;
    const idMatch = hash.match(/[?&]id=([^&]+)/);
    if (idMatch) {
      return idMatch[1];
    }
    
    // Try to get from search params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      return id;
    }
    
    // Check for temp-new-customer (add customer screen)
    if (hash.includes('#/add')) {
      return 'temp-new-customer';
    }
    
    return null;
  }

  // Helper function to format date as yyyy-mm-dd (ISO date format)
  function formatDateYYYYMMDD(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]; // Fallback to today
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeDateTimeToISO(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      if (!trimmed) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`;
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
      return null;
    }
    const parsed = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function parseNoteDateValue(raw) {
    if (noteRuntime.parseNoteDateValue) return noteRuntime.parseNoteDateValue(raw);
    if (!raw) return Number.NaN;
    return new Date(raw).getTime();
  }

  function noteSortTimestamp(note) {
    if (noteRuntime.noteSortTimestamp) return noteRuntime.noteSortTimestamp(note);
    const fallback = parseNoteDateValue(note?.createdAt ?? note?.created_at);
    return Number.isFinite(fallback) ? fallback : Number.NEGATIVE_INFINITY;
  }

  function noteSortId(note) {
    if (noteRuntime.noteSortId) return noteRuntime.noteSortId(note);
    return Number.NEGATIVE_INFINITY;
  }

  function compareNotesByCreatedDesc(a, b) {
    if (noteRuntime.compareNotesByCreatedDesc) return noteRuntime.compareNotesByCreatedDesc(a, b);
    return 0;
  }

  const NOTE_OFFLINE_QUEUE_KEY = `${STORAGE_PREFIX}noteOfflineQueue`;

  function isOfflineLikeError(error) {
    if (!navigator.onLine) return true;
    const msg = String(error && error.message ? error.message : error || '').toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed') ||
      msg.includes('load failed') ||
      msg.includes('timeout')
    );
  }

  function readNoteOfflineQueue() {
    if (noteRuntime.readNoteOfflineQueue) return noteRuntime.readNoteOfflineQueue(NOTE_OFFLINE_QUEUE_KEY);
    return [];
  }

  function writeNoteOfflineQueue(queue) {
    if (noteRuntime.writeNoteOfflineQueue) {
      noteRuntime.writeNoteOfflineQueue(NOTE_OFFLINE_QUEUE_KEY, queue);
    }
  }

  function enqueueNoteOfflineOp(op) {
    if (noteRuntime.enqueueNoteOfflineOp) {
      noteRuntime.enqueueNoteOfflineOp(NOTE_OFFLINE_QUEUE_KEY, op);
      return;
    }
    const queue = readNoteOfflineQueue();
    queue.push(op);
    writeNoteOfflineQueue(queue);
  }

  function getLocalNotesForCustomer(customerId) {
    if (noteRuntime.getLocalNotesForCustomer) return noteRuntime.getLocalNotesForCustomer(customerId, 'customerNotes');
    return [];
  }

  function getNotePayloadForSync(note) {
    if (noteRuntime.getNotePayloadForSync) {
      return noteRuntime.getNotePayloadForSync(note, {
        formatDateYYYYMMDD,
        normalizeDateTimeToISO
      });
    }
    return null;
  }

  function buildNoteSyncSignature(note) {
    if (noteRuntime.buildNoteSyncSignature) {
      return noteRuntime.buildNoteSyncSignature(note, {
        formatDateYYYYMMDD,
        normalizeDateTimeToISO
      });
    }
    return null;
  }

  function buildDbNoteInputFromAnyNote(note, customerId) {
    if (noteRuntime.buildDbNoteInputFromAnyNote) {
      return noteRuntime.buildDbNoteInputFromAnyNote(note, customerId, {
        formatDateYYYYMMDD,
        normalizeDateTimeToISO
      });
    }
    return null;
  }

  function upsertLocalCustomerNote(customerId, note) {
    if (noteRuntime.upsertLocalCustomerNote) {
      noteRuntime.upsertLocalCustomerNote(customerId, note, 'customerNotes');
    }
  }

  function removeLocalCustomerNote(customerId, noteId) {
    if (noteRuntime.removeLocalCustomerNote) {
      noteRuntime.removeLocalCustomerNote(customerId, noteId, 'customerNotes');
    }
  }

  function noteIdentity(note) {
    if (!note) return '';
    return String(note.id ?? note.originalId ?? note.noteId ?? '');
  }

  function updateLocalStoredNote(customerId, noteId, updates) {
    const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
    const key = String(customerId);
    const customerNotes = existingNotes[key] || [];
    const idx = customerNotes.findIndex((note) => noteIdentity(note) === String(noteId));
    if (idx === -1) return false;
    customerNotes[idx] = { ...customerNotes[idx], ...updates };
    existingNotes[key] = customerNotes;
    localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
    return true;
  }

  async function getPinnedNotesCount(customerId, excludingNote = null) {
    const notes = fullscreenNotesCanvas && typeof fullscreenNotesCanvas.loadNotesHybrid === 'function'
      ? await fullscreenNotesCanvas.loadNotesHybrid(customerId)
      : getLocalNotesForCustomer(customerId);
    const excludedId = noteIdentity(excludingNote);
    return notes.filter((note) => {
      if (!isNotePinned(note)) return false;
      return !excludedId || noteIdentity(note) !== excludedId;
    }).length;
  }

  async function configurePinCheckbox(checkbox, statusEl, customerId, editingNote = null) {
    if (!checkbox) return;
    const currentlyPinned = isNotePinned(editingNote);
    checkbox.checked = currentlyPinned;
    checkbox.disabled = false;
    checkbox.title = '';
    if (statusEl) statusEl.textContent = '';

    if (!currentlyPinned) {
      try {
        const pinnedCount = await getPinnedNotesCount(customerId, editingNote);
        if (pinnedCount >= PINNED_NOTES_LIMIT) {
          checkbox.checked = false;
          checkbox.disabled = true;
          checkbox.title = `Pinned note limit reached (${PINNED_NOTES_LIMIT})`;
          if (statusEl) statusEl.textContent = `Pinned note limit reached (${PINNED_NOTES_LIMIT})`;
        }
      } catch (error) {
        console.warn('Could not check pinned note limit:', error);
      }
    }
  }

  function getPinCheckboxValue(checkbox, existingNote = null) {
    if (!checkbox) return isNotePinned(existingNote);
    if (checkbox.disabled) return false;
    return checkbox.checked === true;
  }

  async function persistNotePinnedState(noteData, shouldPin) {
    const customerId = noteData.customerId || getCurrentCustomerId();
    if (!customerId || customerId === 'default') throw new Error('Cannot determine customer for this note');
    if (shouldPin) {
      const pinnedCount = await getPinnedNotesCount(customerId, noteData);
      if (pinnedCount >= PINNED_NOTES_LIMIT) {
        alert(`Only ${PINNED_NOTES_LIMIT} notes can be pinned to a customer profile.`);
        return false;
      }
    }

    const updatedNote = {
      ...noteData,
      customerId,
      isPinned: shouldPin === true,
      updatedAt: new Date().toISOString()
    };
    const noteId = noteIdentity(noteData);

    if (customerId === 'temp-new-customer') {
      if (!updateLocalStoredNote(customerId, noteId, updatedNote)) {
        throw new Error('Could not update temporary note pin state');
      }
      await fullscreenNotesCanvas.refreshNotesDisplay(customerId);
      return true;
    }

    if (productConfig.useSupabase) {
      try {
        await CrmDB.updateNote(updatedNote);
      } catch (error) {
        if (!isOfflineLikeError(error)) throw error;
        const queuedLocal = {
          ...updatedNote,
          source: 'localStorage',
          queuedSync: true,
          queuedOpType: 'update'
        };
        upsertLocalCustomerNote(customerId, queuedLocal);
        const dbInput = buildDbNoteInputFromAnyNote(queuedLocal, customerId);
        if (dbInput) {
          enqueueNoteOfflineOp({
            type: 'update',
            customerId: parseInt(customerId, 10),
            noteId,
            note: { ...dbInput, id: noteId }
          });
        }
      }
      await fullscreenNotesCanvas.refreshNotesDisplay(customerId);
      return true;
    }

    if (isDbBackedNoteSource(noteData.source)) {
      await CrmDB.updateNote(updatedNote);
    } else if (!updateLocalStoredNote(customerId, noteId, updatedNote)) {
      throw new Error('Could not update note pin state');
    }

    await fullscreenNotesCanvas.refreshNotesDisplay(customerId);
    return true;
  }

  async function flushQueuedNoteOperations() {
    if (!productConfig.useSupabase || !navigator.onLine || !window.CrmDB) return { processed: 0, remaining: 0 };
    const queue = readNoteOfflineQueue();
    if (queue.length === 0) return { processed: 0, remaining: 0 };

    const remaining = [];
    const createdIdMap = {};
    let processed = 0;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      try {
        if (op.type === 'create') {
          const dbInput = op.note;
          if (!dbInput) {
            processed++;
            continue;
          }
          const newId = await CrmDB.createNote(dbInput);
          if (op.localId) createdIdMap[String(op.localId)] = newId;
          if (op.customerId && op.localId) removeLocalCustomerNote(op.customerId, op.localId);
          processed++;
          continue;
        }

        if (op.type === 'update') {
          const rawId = op.noteId;
          const mappedId = createdIdMap[String(rawId)];
          const targetId = mappedId != null ? mappedId : rawId;
          if (String(targetId).startsWith('local-')) {
            remaining.push(op);
            continue;
          }
          await CrmDB.updateNote({ ...(op.note || {}), id: targetId });
          if (op.customerId && rawId != null) removeLocalCustomerNote(op.customerId, rawId);
          processed++;
          continue;
        }

        if (op.type === 'delete') {
          const rawId = op.noteId;
          const mappedId = createdIdMap[String(rawId)];
          const targetId = mappedId != null ? mappedId : rawId;
          if (String(targetId).startsWith('local-')) {
            if (op.customerId && rawId != null) removeLocalCustomerNote(op.customerId, rawId);
            processed++;
            continue;
          }
          await CrmDB.deleteNote(targetId);
          if (op.customerId && rawId != null) removeLocalCustomerNote(op.customerId, rawId);
          processed++;
          continue;
        }

        // Unknown op types are dropped.
        processed++;
      } catch (error) {
        if (isOfflineLikeError(error)) {
          remaining.push(op, ...queue.slice(i + 1));
          break;
        }
        console.warn('Dropping failed queued note operation:', op, error);
        processed++;
      }
    }

    writeNoteOfflineQueue(remaining);
    if (processed > 0) {
      console.log(`Flushed queued note operations: processed=${processed}, remaining=${remaining.length}`);
    }
    return { processed, remaining: remaining.length };
  }

  function isDbBackedNoteSource(source) {
    if (noteRuntime.isDbBackedNoteSource) return noteRuntime.isDbBackedNoteSource(source);
    return false;
  }

  function appendNotesHtml(existingHtml, newHtml, timestamp) {
    if (noteRuntime.appendNotesHtml) {
      return noteRuntime.appendNotesHtml(existingHtml, newHtml, timestamp, { escapeHtml });
    }
    const ts = timestamp instanceof Date ? timestamp : new Date();
    const tsStr = ts.toLocaleString();
    const block = `<div class="note-entry"><div class="muted" style="font-size:12px;">${escapeHtml(tsStr)}</div>${newHtml}</div>`;
    if (!existingHtml || existingHtml.trim() === '') return block;
    return existingHtml + '<hr />' + block;
  }

  function appendNotesCanvas(existingImageData, newImageData, timestamp) {
    if (noteRuntime.appendNotesCanvas) return noteRuntime.appendNotesCanvas(existingImageData, newImageData, timestamp);
    return newImageData;
  }

  // Round a datetime-local string to the nearest N minutes (default 15)
  function roundDatetimeLocalToStep(datetimeLocalStr, stepMinutes) {
    try {
      const date = new Date(datetimeLocalStr);
      if (Number.isNaN(date.getTime())) return datetimeLocalStr;
      const ms = date.getTime();
      const stepMs = (stepMinutes || 15) * 60 * 1000;
      const roundedMs = Math.round(ms / stepMs) * stepMs;
      return new Date(roundedMs);
    } catch {
      return datetimeLocalStr;
    }
  }

  // Format a Date into yyyy-MM-ddTHH:mm for input[type="datetime-local"]
  function formatAsDatetimeLocal(dateLike) {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }

  function adjustSidebarOffset() {
    const layout = document.querySelector('.layout');
    if (!layout) return;
    const content = layout.querySelector('.content');
    const sidebar = layout.querySelector('.sidebar');
    if (!content || !sidebar) return;
    const toolbar = content.querySelector('.content-toolbar');
    if (toolbar) {
      const toolbarHeight = Math.max(0, Math.round(toolbar.getBoundingClientRect().height));
      const extraOffset = Math.round(toolbarHeight * 0.15);
      // Keep sidebar controls aligned with the top content frame.
      const resolvedOffset = toolbarHeight + 4 + extraOffset;
      sidebar.style.setProperty('--sidebar-top-offset', `${resolvedOffset}px`);
      setCachedSidebarTopOffset(resolvedOffset);
    } else {
      sidebar.style.removeProperty('--sidebar-top-offset');
    }
    const firstCard = content.querySelector('.card');
    const layoutRect = layout.getBoundingClientRect();
    if (firstCard) {
      const cardRect = firstCard.getBoundingClientRect();
      const offset = Math.max(0, Math.round(cardRect.top - layoutRect.top));
      sidebar.style.marginTop = `${offset}px`;
    } else {
      sidebar.style.marginTop = '';
    }
  }


  window.addEventListener('hashchange', render);
  window.addEventListener('online', () => {
    flushQueuedNoteOperations().catch((error) => {
      console.warn('Failed to flush queued note operations on reconnect', error);
    });
  });
  window.addEventListener('load', async () => {
    function showBlockingStartupError(title, message, details) {
      const safeTitle = String(title || 'Startup error');
      const safeMessage = String(message || 'The app could not initialize safely.');
      const safeDetails = details ? String(details) : '';
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;background:#0b1220;color:#e5e7eb;">
          <div style="max-width:760px;width:100%;border:1px solid #334155;border-radius:14px;padding:20px;background:#111827;box-shadow:0 18px 40px rgba(0,0,0,0.35);">
            <h2 style="margin:0 0 10px 0;color:#f59e0b;font-size:22px;">${safeTitle}</h2>
            <p style="margin:0 0 12px 0;line-height:1.5;">${safeMessage}</p>
            ${safeDetails ? `<pre style="margin:0 0 14px 0;padding:12px;border-radius:10px;background:#0f172a;border:1px solid #1f2937;white-space:pre-wrap;word-break:break-word;font-size:12px;color:#cbd5e1;">${safeDetails}</pre>` : ''}
            <button id="startup-reload-btn" style="padding:10px 14px;border:none;border-radius:8px;background:#22d3ee;color:#0f172a;font-weight:700;cursor:pointer;">Reload App</button>
          </div>
        </div>
      `;
      const reloadBtn = document.getElementById('startup-reload-btn');
      reloadBtn?.addEventListener('click', () => window.location.reload());
    }

    applyProductMetadata();
    applyProductTheme();
    await initializeStorageDriverLayer();
    const authReady = await ensureSupabaseAuthSession();
    if (!authReady) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ef4444;font-size:18px;">Sign-in required. Reload to try again.</div>';
      return;
    }
    await refreshRuntimeUserInfo();

    if (productConfig.useSupabase) {
      try {
        const api = requireDataApi();
        if (api && typeof api.runRuntimePreflight === 'function') {
          await api.runRuntimePreflight();
        }
      } catch (error) {
        const details = (error && (error.details || error.message)) || '';
        showBlockingStartupError(
          'Schema Mismatch Detected',
          'The selected product profile does not match the active Supabase schema. This can cause data corruption, so startup was blocked.',
          details
        );
        return;
      }
    }

    await flushQueuedNoteOperations();

    // Check for app lock (tradie edition)
    if (isTradie()) {
      const hashedPin = localStorage.getItem(`${STORAGE_PREFIX}app_lock_pin`);
      if (hashedPin) {
        const unlocked = await showPinLockScreen(hashedPin);
        if (!unlocked) {
          document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #ef4444; font-size: 18px;">App locked. Please reload and enter your PIN.</div>';
          return;
        }
      }
      
      // Check for backup reminder
      checkBackupReminder();
    }
    
    // Default route
    if (!window.location.hash) navigate('/');
    render();
    
    // Run migration for old notes system
    migrateOldNotes();
  });

  function getDefaultHandwritingSettings() {
    const isHairdresser = productConfig.activeProduct === 'hairdresser';
    return {
      digitizationMode: isHairdresser ? 'vector' : 'auto', // hairdresser defaults to canvas/vector
      vectorFormat: 'svg',
      autoResize: true,
      lineHeight: 24
    };
  }

  // Handwriting digitization settings and functionality
  let handwritingSettings = {
    ...getDefaultHandwritingSettings()
  };

  // Load settings from localStorage
  function loadHandwritingSettings() {
    const saved = localStorage.getItem('handwritingSettings');
    if (saved) {
      handwritingSettings = { ...getDefaultHandwritingSettings(), ...JSON.parse(saved) };
    } else {
      handwritingSettings = { ...getDefaultHandwritingSettings() };
    }
  }

  // Save settings to localStorage
  function saveHandwritingSettings() {
    localStorage.setItem('handwritingSettings', JSON.stringify(handwritingSettings));
  }

  // Initialize settings on app start
  loadHandwritingSettings();

  // Expand canvas function

  // Notes canvas functionality - simplified version for notes
  class NotesCanvas {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.isDrawing = false;
      this.strokes = [];
      this.currentStroke = [];
      
      // Drawing properties
      this.strokeColor = '#ffffff';
      this.strokeWidth = 2;
      
      // Set up canvas
      this.setupCanvas(options);
      
      // Set up toolbar
      this.setupToolbar();
    }

    setupCanvas(options = {}) {
      const width = options.width || 400;
      const height = options.height || 300;
      
      // Set display size first
      this.canvas.style.border = '1px solid rgba(255,255,255,0.2)';
      this.canvas.style.borderRadius = '4px';
      this.canvas.style.cursor = 'crosshair';
      this.canvas.style.backgroundColor = 'rgba(255,255,255,0.03)';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      
      this.container.appendChild(this.canvas);
      
      // Set actual canvas size to match display size for crisp rendering
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      
      // Set drawing properties
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      // Mouse events
      this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
      this.canvas.addEventListener('mousemove', this.draw.bind(this));
      this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
      this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
      
      // Touch events
      this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }

    setupToolbar() {
      // Find the toolbar for this canvas
      const toolbar = this.container.parentNode.querySelector('.notes-toolbar');
      if (!toolbar) return;

      // Color buttons
      const colorButtons = toolbar.querySelectorAll('.color-btn');
      colorButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const color = btn.dataset.color;
          this.setStrokeColor(color);
          
          // Update active state
          colorButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });

      // Stroke width slider
      const widthSlider = toolbar.querySelector('.stroke-width-slider');
      const widthValue = toolbar.querySelector('.stroke-width-value');
      if (widthSlider && widthValue) {
        widthSlider.addEventListener('input', (e) => {
          const newWidth = parseInt(e.target.value);
          this.setStrokeWidth(newWidth);
          widthValue.textContent = newWidth + 'px';
        });
      }

      // Undo button
      const undoBtn = toolbar.querySelector('.undo-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          this.undo();
        });
      }

      // Clear button
      const clearBtn = toolbar.querySelector('.clear-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.clear();
        });
      }
    }

    handleTouch(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                       e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }

    getEventPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    startDrawing(e) {
      this.isDrawing = true;
      this.currentStroke = [];
      
      const pos = this.getEventPos(e);
      this.currentStroke.push(pos);
    }

    draw(e) {
      if (!this.isDrawing) return;
      
      const pos = this.getEventPos(e);
      this.currentStroke.push(pos);
      
      if (this.currentStroke.length >= 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentStroke[this.currentStroke.length - 2].x, 
                       this.currentStroke[this.currentStroke.length - 2].y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
      }
    }

    stopDrawing() {
      if (this.isDrawing) {
        this.isDrawing = false;
        if (this.currentStroke.length > 0) {
          this.strokes.push([...this.currentStroke]);
          this.currentStroke = [];
        }
      }
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.strokes = [];
      this.currentStroke = [];
    }

    getImageData() {
      return this.canvas.toDataURL('image/png');
    }

    setImageData(dataUrl) {
      const img = new Image();
      img.onload = () => {
        this.clear();
        this.ctx.drawImage(img, 0, 0);
        // Note: This doesn't restore strokes for editing, just displays the image
      };
      img.src = dataUrl;
    }

    hasContent() {
      return this.strokes.length > 0;
    }

    setStrokeColor(color) {
      this.strokeColor = color;
      this.ctx.strokeStyle = color;
    }

    setStrokeWidth(width) {
      this.strokeWidth = width;
      this.ctx.lineWidth = width;
    }

    undo() {
      if (this.strokes.length > 0) {
        this.strokes.pop();
        this.redrawStrokes();
      }
    }

    redrawStrokes() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.strokes.forEach(stroke => {
        if (stroke.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let i = 1; i < stroke.length; i++) {
            this.ctx.lineTo(stroke[i].x, stroke[i].y);
          }
          this.ctx.stroke();
        }
      });
    }

  }

  // Check if a note is a migrated note by content analysis
  function isMigratedNoteByContent(noteData) {
    if (noteRuntime.isMigratedNoteByContent) return noteRuntime.isMigratedNoteByContent(noteData);
    return false;
  }

  // Fullscreen Notes Canvas functionality
  class FullscreenNotesCanvas {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.isDrawing = false;
      this.strokes = [];
      this.currentStroke = { points: [], color: '#ffffff', width: 2 };
      this.strokeColor = '#ffffff';
      this.strokeWidth = 2;
      this.overlay = null;
      this.isErasing = false;
      this.eraserWidth = 10;
      this.pencilBtn = null;
      this.eraserBtn = null;
      this.isEditingImageBasedNote = false;
      this.pinCheckbox = null;
      this.pinStatus = null;
      this.canvasContainer = null;
    }


    show() {
      this.createOverlay();
      this.setupCanvas();
      this.setupToolbar();
      this.setupEventListeners();
      
      // If editing a note, redraw the existing strokes and update header
      if (this.editingNote) {
        this.redrawStrokes();
        const headerTitle = document.querySelector('#fullscreen-notes-overlay .header h2');
        if (headerTitle) {
          headerTitle.textContent = `Edit Note ${this.editingNote.noteNumber}`;
        }
      } else {
        // Reset header for new note
        const headerTitle = document.querySelector('#fullscreen-notes-overlay .header h2');
        if (headerTitle) {
          headerTitle.textContent = 'Add Note';
        }
      }
    }

    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'fullscreen-notes-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(17, 24, 39, 0.98);
        z-index: 10010;
        display: flex;
        flex-direction: column;
        padding: 20px;
      `;
      
      // Header
      const header = document.createElement('div');
      header.className = 'header';
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      `;
      
      const title = document.createElement('h2');
      title.textContent = 'Add Note';
      title.style.margin = '0';
      title.style.color = 'var(--text)';

      const rightControls = document.createElement('div');
      rightControls.style.cssText = 'display:flex; align-items:center; gap:12px; flex-wrap:wrap; justify-content:flex-end;';

      const pinWrap = document.createElement('label');
      pinWrap.style.cssText = 'display:flex; align-items:center; gap:8px; color:var(--text); font-size:14px; cursor:pointer; user-select:none;';
      this.pinCheckbox = document.createElement('input');
      this.pinCheckbox.type = 'checkbox';
      this.pinCheckbox.setAttribute('data-testid', 'note-pin-checkbox');
      this.pinCheckbox.style.cssText = 'width:16px; height:16px; cursor:pointer;';
      const pinText = document.createElement('span');
      pinText.textContent = 'Pin to profile';
      this.pinStatus = document.createElement('span');
      this.pinStatus.style.cssText = 'color:var(--muted); font-size:12px;';
      pinWrap.appendChild(this.pinCheckbox);
      pinWrap.appendChild(pinText);
      
      const doneBtn = document.createElement('button');
      doneBtn.textContent = 'Done';
      doneBtn.style.cssText = `
        background: var(--brand);
        border: none;
        color: white;
        border-radius: 6px;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      `;

      rightControls.appendChild(pinWrap);
      rightControls.appendChild(this.pinStatus);
      rightControls.appendChild(doneBtn);
      header.appendChild(title);
      header.appendChild(rightControls);

      // Canvas container
      const canvasContainer = document.createElement('div');
      this.canvasContainer = canvasContainer;
      canvasContainer.style.cssText = `
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 20px;
        min-height: 0;
      `;

      this.overlay.appendChild(header);
      this.overlay.appendChild(canvasContainer);

      // Event listeners
      doneBtn.addEventListener('click', () => this.handleDone());
      // Removed click-outside-to-close functionality to prevent accidental data loss

      document.body.appendChild(this.overlay);
      configurePinCheckbox(this.pinCheckbox, this.pinStatus, this.getCurrentCustomerId(), this.editingNote);
    }

    setupCanvas() {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      const canvasContainer = this.canvasContainer || this.overlay.querySelector('canvas')?.parentElement;
      if (!canvasContainer) {
        throw new Error('Canvas container not found');
      }
      canvasContainer.appendChild(this.canvas);

      // Set canvas size
      const rect = canvasContainer.getBoundingClientRect();
      const width = Math.min(1000, window.innerWidth - 100);
      const height = Math.min(700, window.innerHeight - 200);
      
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.canvas.style.border = '1px solid rgba(255,255,255,0.2)';
      this.canvas.style.borderRadius = '4px';
      this.canvas.style.cursor = 'crosshair';
      this.canvas.style.backgroundColor = 'rgba(255,255,255,0.03)';

      // Set drawing properties
      this.ctx.strokeStyle = this.strokeColor;
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }

    setupToolbar() {
      const toolbar = document.createElement('div');
      toolbar.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
        padding: 16px;
        background: rgba(255,255,255,0.05);
        border-radius: 12px;
      `;

      // Top row: Colors and Brush Size
      const topRow = document.createElement('div');
      topRow.style.cssText = `
        display: flex;
        gap: 16px;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
      `;
      
      // Color presets
      const colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      const colorPresets = document.createElement('div');
      colorPresets.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
      `;
      
      const colorLabel = document.createElement('span');
      colorLabel.textContent = 'Colors:';
      colorLabel.style.color = 'var(--text)';
      colorLabel.style.fontSize = '14px';
      colorLabel.style.fontWeight = '600';
      
      colors.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'color-btn';
        colorBtn.style.cssText = `
          width: 32px;
          height: 32px;
          border: 2px solid ${color === this.strokeColor ? 'var(--brand)' : 'rgba(255,255,255,0.3)'};
          border-radius: 50%;
          background: ${color};
          cursor: pointer;
          transition: all 0.2s ease;
        `;
        colorBtn.addEventListener('click', () => {
          this.setStrokeColor(color);
          colorPresets.querySelectorAll('button').forEach(btn => {
            btn.style.borderColor = btn === colorBtn ? 'var(--brand)' : 'rgba(255,255,255,0.3)';
          });
        });
        colorPresets.appendChild(colorBtn);
      });
      
      // Brush size
      const sizeContainer = document.createElement('div');
      sizeContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      `;
      
      const sizeLabel = document.createElement('span');
      sizeLabel.textContent = 'Brush Size';
      sizeLabel.style.color = 'var(--text)';
      sizeLabel.style.fontSize = '14px';
      sizeLabel.style.fontWeight = '600';
      
      const sizeSlider = document.createElement('input');
      sizeSlider.type = 'range';
      sizeSlider.min = '1';
      sizeSlider.max = '20';
      sizeSlider.value = this.strokeWidth;
      sizeSlider.style.cssText = `
        width: 120px;
        height: 6px;
        background: rgba(255,255,255,0.2);
        border-radius: 3px;
        outline: none;
      `;
      
      const sizeValue = document.createElement('span');
      sizeValue.textContent = this.strokeWidth + 'px';
      sizeValue.style.color = 'var(--muted)';
      sizeValue.style.fontSize = '12px';
      
      // Bottom row: Drawing tools (left) and Action tools (right)
      const bottomRow = document.createElement('div');
      bottomRow.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      // Drawing tools (pencil and eraser) - left side
      const drawingToolsContainer = document.createElement('div');
      drawingToolsContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
      `;
      
      this.pencilBtn = document.createElement('button');
      this.pencilBtn.innerHTML = '✏️ Pencil';
      this.pencilBtn.style.cssText = `
        background: ${!this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)'};
        border: 1px solid ${!this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)'};
        color: ${!this.isErasing ? '#3b82f6' : 'var(--text)'};
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
      `;

      this.eraserBtn = document.createElement('button');
      this.eraserBtn.innerHTML = '🧽 Eraser';
      this.eraserBtn.style.cssText = `
        background: ${this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)'};
        border: 1px solid ${this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)'};
        color: ${this.isErasing ? '#3b82f6' : 'var(--text)'};
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
      `;

      // Action tools (undo and clear) - right side
      const actionToolsContainer = document.createElement('div');
      actionToolsContainer.style.cssText = `
        display: flex;
        gap: 8px;
        align-items: center;
      `;
      
      const undoBtn = document.createElement('button');
      undoBtn.innerHTML = '↶ Undo';
      undoBtn.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--text);
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
      `;
      
      const clearBtn = document.createElement('button');
      clearBtn.innerHTML = '🗑️ Clear';
      clearBtn.style.cssText = `
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s ease;
      `;

      // Assemble toolbar
      colorPresets.insertBefore(colorLabel, colorPresets.firstChild);
      sizeContainer.appendChild(sizeLabel);
      sizeContainer.appendChild(sizeSlider);
      sizeContainer.appendChild(sizeValue);
      
      drawingToolsContainer.appendChild(this.pencilBtn);
      drawingToolsContainer.appendChild(this.eraserBtn);
      actionToolsContainer.appendChild(undoBtn);
      actionToolsContainer.appendChild(clearBtn);
      
      topRow.appendChild(colorPresets);
      topRow.appendChild(sizeContainer);
      bottomRow.appendChild(drawingToolsContainer);
      bottomRow.appendChild(actionToolsContainer);
      
      toolbar.appendChild(topRow);
      toolbar.appendChild(bottomRow);

      // Insert toolbar before canvas container
      const canvasContainer = this.canvasContainer;
      if (!canvasContainer || canvasContainer.parentNode !== this.overlay) {
        throw new Error('Canvas container not found');
      }
      this.overlay.insertBefore(toolbar, canvasContainer);
      
      // Event listeners
      sizeSlider.addEventListener('input', (e) => {
        const newWidth = parseInt(e.target.value);
        this.setStrokeWidth(newWidth);
        sizeValue.textContent = newWidth + 'px';
      });
      
      clearBtn.addEventListener('click', () => this.clear());
      undoBtn.addEventListener('click', () => this.undo());
      this.pencilBtn.addEventListener('click', () => this.setDrawingMode());
      this.eraserBtn.addEventListener('click', () => this.setEraserMode());
    }

    setupEventListeners() {
      // Mouse events
      this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
      this.canvas.addEventListener('mousemove', this.draw.bind(this));
      this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
      this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

      // Touch events
      this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }

    handleTouch(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                       e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }

    getEventPos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }

    startDrawing(e) {
      this.isDrawing = true;
      this.currentStroke = {
        points: [],
        color: this.isErasing ? 'eraser' : this.strokeColor,
        width: this.isErasing ? this.eraserWidth : this.strokeWidth
      };
      const pos = this.getEventPos(e);
      this.currentStroke.points.push(pos);
      
      // Set up drawing context for eraser or normal drawing
      if (this.isErasing) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = this.eraserWidth;
      } else {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.strokeStyle = this.strokeColor;
      }
    }

    draw(e) {
      if (!this.isDrawing) return;
      
      const pos = this.getEventPos(e);
      this.currentStroke.points.push(pos);
      
      if (this.currentStroke.points.length >= 2) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.currentStroke.points[this.currentStroke.points.length - 2].x, 
                       this.currentStroke.points[this.currentStroke.points.length - 2].y);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
      }
    }

    stopDrawing() {
      if (this.isDrawing) {
        this.isDrawing = false;
        if (this.currentStroke.points.length > 0) {
          this.strokes.push({...this.currentStroke});
          this.currentStroke = { points: [], color: this.strokeColor, width: this.strokeWidth };
        }
      }
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.strokes = [];
      this.currentStroke = { points: [], color: this.strokeColor, width: this.strokeWidth };
      this.isEditingImageBasedNote = false;
    }

    undo() {
      if (this.strokes.length > 0) {
        this.strokes.pop();
        this.redrawStrokes();
      }
    }

    redrawStrokes() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.strokes.forEach(stroke => {
        if (stroke.points && stroke.points.length > 1) {
          // Set up context for eraser or normal drawing
          if (stroke.color === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
          } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = stroke.color;
          }
          
          this.ctx.lineWidth = stroke.width;
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          
          this.ctx.beginPath();
          this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          this.ctx.stroke();
        }
      });
      
      // Reset to normal drawing mode
      this.ctx.globalCompositeOperation = 'source-over';
    }

    setStrokeColor(color) {
      this.strokeColor = color;
      this.ctx.strokeStyle = color;
    }

    setStrokeWidth(width) {
      this.strokeWidth = width;
      this.ctx.lineWidth = width;
    }

    setDrawingMode() {
      this.isErasing = false;
      this.updateToolButtons();
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.lineWidth = this.strokeWidth;
      this.ctx.strokeStyle = this.strokeColor;
    }

    setEraserMode() {
      this.isErasing = true;
      this.updateToolButtons();
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.lineWidth = this.eraserWidth;
    }

    updateToolButtons() {
      // Use stored button references for immediate updates
      if (this.pencilBtn) {
        this.pencilBtn.style.background = !this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)';
        this.pencilBtn.style.borderColor = !this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)';
        this.pencilBtn.style.color = !this.isErasing ? '#3b82f6' : 'var(--text)';
      }
      
      if (this.eraserBtn) {
        this.eraserBtn.style.background = this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)';
        this.eraserBtn.style.borderColor = this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)';
        this.eraserBtn.style.color = this.isErasing ? '#3b82f6' : 'var(--text)';
      }
    }

    canvasToSVG() {
      // Check if there are any eraser strokes - if so, we need to use a different approach
      const hasEraserStrokes = this.strokes.some(stroke => stroke.color === 'eraser');
      
      // Preserve full canvas for image-based note edits so existing content is not lost.
      const isEditingImageNote = this.editingNote && this.isEditingImageBasedNote;
      
      if (hasEraserStrokes || isEditingImageNote) {
        // When eraser strokes are present OR we're editing an image-based note,
        // capture the final canvas state as an image
        if (isEditingImageNote) {
          const canvasData = this.canvas.toDataURL('image/png');
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', this.canvas.width);
          svg.setAttribute('height', this.canvas.height);
          svg.setAttribute('viewBox', `0 0 ${this.canvas.width} ${this.canvas.height}`);
          
          const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          image.setAttribute('href', canvasData);
          image.setAttribute('width', this.canvas.width);
          image.setAttribute('height', this.canvas.height);
          image.setAttribute('x', '0');
          image.setAttribute('y', '0');
          svg.appendChild(image);
          
          return new XMLSerializer().serializeToString(svg);
        }
        
        // Calculate bounding box of all strokes (including eraser strokes for bounds)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasStrokes = false;
        
        this.strokes.forEach(stroke => {
          if (stroke.points && stroke.points.length > 0) {
            hasStrokes = true;
            stroke.points.forEach(point => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });
          }
        });
        
        // If no strokes and not editing, return empty SVG
        if (!hasStrokes) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '1');
          svg.setAttribute('height', '1');
          svg.setAttribute('viewBox', '0 0 1 1');
          return new XMLSerializer().serializeToString(svg);
        }
        
        // Add some padding around the content
        const padding = 10;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(this.canvas.width, maxX + padding);
        maxY = Math.min(this.canvas.height, maxY + padding);
        
        // Calculate dimensions
        const width = maxX - minX;
        const height = maxY - minY;
        
        // Create a temporary canvas to crop the image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the cropped portion of the original canvas
        tempCtx.drawImage(this.canvas, minX, minY, width, height, 0, 0, width, height);
        
        // Get the cropped image data
        const canvasData = tempCanvas.toDataURL('image/png');
        
        // Create SVG with the cropped dimensions
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        image.setAttribute('href', canvasData);
        image.setAttribute('width', width);
        image.setAttribute('height', height);
        image.setAttribute('x', '0');
        image.setAttribute('y', '0');
        svg.appendChild(image);
        
        return new XMLSerializer().serializeToString(svg);
      }
      
      // Original logic for non-eraser strokes
      // Calculate bounding box of all strokes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      let hasStrokes = false;
      
      this.strokes.forEach(stroke => {
        if (stroke.points && stroke.points.length > 0 && stroke.color !== 'eraser') {
          hasStrokes = true;
          stroke.points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
          });
        }
      });
      
      // If no strokes, return empty SVG
      if (!hasStrokes) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '1');
        svg.setAttribute('height', '1');
        svg.setAttribute('viewBox', '0 0 1 1');
        return new XMLSerializer().serializeToString(svg);
      }
      
      // Add some padding around the content
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(this.canvas.width, maxX + padding);
      maxY = Math.min(this.canvas.height, maxY + padding);
      
      // Calculate dimensions
      const width = maxX - minX;
      const height = maxY - minY;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      // Group strokes by color and width for better organization
      const strokeGroups = {};
      
      this.strokes.forEach(stroke => {
        if (stroke.points && stroke.points.length > 1 && stroke.color !== 'eraser') {
          const strokeKey = `${stroke.color}_${stroke.width}`;
          if (!strokeGroups[strokeKey]) {
            strokeGroups[strokeKey] = {
              color: stroke.color,
              width: stroke.width,
              paths: []
            };
          }
          
          // Adjust coordinates relative to the bounding box
          let pathData = `M ${stroke.points[0].x - minX} ${stroke.points[0].y - minY}`;
          for (let i = 1; i < stroke.points.length; i++) {
            pathData += ` L ${stroke.points[i].x - minX} ${stroke.points[i].y - minY}`;
          }
          strokeGroups[strokeKey].paths.push(pathData);
        }
      });

      // Create path elements for each stroke group
      Object.values(strokeGroups).forEach(group => {
        group.paths.forEach(pathData => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', pathData);
          path.setAttribute('stroke', group.color);
          path.setAttribute('stroke-width', group.width);
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          path.setAttribute('fill', 'none');
          svg.appendChild(path);
        });
      });

      return new XMLSerializer().serializeToString(svg);
    }

    handleDone() {
      if (this.strokes.length === 0) {
        this.hide();
        return;
      }

      // Prevent multiple dialogs
      if (document.querySelector('.save-note-prompt')) {
        console.log('Save dialog already open, ignoring request');
        return;
      }

      // Show save prompt
      const savePrompt = document.createElement('div');
      savePrompt.className = 'save-note-prompt'; // Add class for identification
      savePrompt.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 24px;
        z-index: 10011;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      `;

      const promptText = document.createElement('p');
      promptText.textContent = 'Do you want to save this note?';
      promptText.style.margin = '0 0 16px 0';
      promptText.style.color = 'var(--text)';
      promptText.style.fontSize = '16px';

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('data-testid', 'cancel-note-button');
      cancelBtn.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--text);
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
      `;

      const dontSaveBtn = document.createElement('button');
      dontSaveBtn.textContent = "Don't Save";
      dontSaveBtn.style.cssText = `
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      `;

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.setAttribute('data-testid', 'save-note-button');
      saveBtn.style.cssText = `
        background: var(--brand);
        border: none;
        color: white;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      `;

      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(dontSaveBtn);
      buttonContainer.appendChild(saveBtn);
      savePrompt.appendChild(promptText);
      savePrompt.appendChild(buttonContainer);

      document.body.appendChild(savePrompt);

      cancelBtn.addEventListener('click', () => {
        if (document.body.contains(savePrompt)) {
          document.body.removeChild(savePrompt);
        }
        // Don't hide the overlay, just close the dialog
      });

      dontSaveBtn.addEventListener('click', () => {
        if (document.body.contains(savePrompt)) {
          document.body.removeChild(savePrompt);
        }
        this.hide();
      });

      saveBtn.addEventListener('click', async () => {
        try {
          // Disable button to prevent double-clicks
          saveBtn.disabled = true;
          saveBtn.textContent = 'Saving...';
          saveBtn.style.opacity = '0.6';
          
          if (document.body.contains(savePrompt)) {
            document.body.removeChild(savePrompt);
          }
          await this.saveNote();
        } catch (error) {
          console.error('Error during save operation:', error);
          // Re-enable button if save failed
          if (document.body.contains(savePrompt)) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
            saveBtn.style.opacity = '1';
          }
          // Show detailed error popup instead of simple alert
          this.showErrorPopup(error, 'Save Note');
        }
      });
    }

    async saveNote() {
      try {
        console.log('Starting save note operation...');
        
        // Validate canvas state
        if (!this.canvas || !this.strokes || this.strokes.length === 0) {
          throw new Error('No drawing data to save');
        }
        
        // Generate SVG data with optimization for large drawings
        const svgData = this.canvasToSVG();
        if (!svgData || svgData.trim().length === 0) {
          throw new Error('Failed to generate SVG data');
        }
        
        // Optimize SVG if it's too large (iPad localStorage constraint)
        const optimizedSvgData = this.optimizeSVGForStorage(svgData);
        console.log(`SVG size: ${svgData.length} chars → ${optimizedSvgData.length} chars (${((1 - optimizedSvgData.length / svgData.length) * 100).toFixed(1)}% reduction)`);
        
        // Get customer ID with validation
        const customerId = this.getCurrentCustomerId();
        if (!customerId || customerId === 'default') {
          throw new Error('Cannot determine customer ID for saving note');
        }
        
        console.log(`Saving note for customer ID: ${customerId}`);
        const requestedPinned = getPinCheckboxValue(this.pinCheckbox, this.editingNote);
        if (requestedPinned && !isNotePinned(this.editingNote)) {
          const pinnedCount = await getPinnedNotesCount(customerId, this.editingNote);
          if (pinnedCount >= PINNED_NOTES_LIMIT) {
            throw new Error(`Only ${PINNED_NOTES_LIMIT} notes can be pinned to a customer profile`);
          }
        }
        
        // Check localStorage availability and space
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
        } catch (e) {
          throw new Error('LocalStorage is not available or is full');
        }
        
        // Check localStorage usage and available space (iPad-specific)
        const storageInfo = this.getStorageInfo();
        console.log('Storage info:', storageInfo);
        
        // If storage is getting full, try to clean up old data
        if (storageInfo.isNearLimit && !productConfig.useSupabase) {
          console.log('Storage near limit, attempting cleanup...');
          await this.cleanupOldData();
        }
        
        // Get existing notes for this customer using hybrid loading
        const allExistingNotes = await this.loadNotesHybrid(customerId);
        
        if (this.editingNote) {
          // Editing existing note - update it
          console.log('Updating existing note:', this.editingNote.id);
          const editingNoteId = this.editingNote.id != null ? String(this.editingNote.id) : '';
          const matchedExistingNote = allExistingNotes.find((n) => String(n?.id) === editingNoteId);
          const effectiveSource = (this.editingNote.source || matchedExistingNote?.source || '').toString();
          
          // Update the note data
          const updatedNote = {
            ...this.editingNote,
            svg: optimizedSvgData,
            isPinned: getPinCheckboxValue(this.pinCheckbox, this.editingNote),
            editedDate: new Date().toISOString()
          };
          
          // Determine which storage method to use based on the note's source
          if (isDbBackedNoteSource(effectiveSource)) {
            if (!editingNoteId) {
              throw new Error('Edit mode requires an existing note ID for DB-backed notes');
            }
            // Update in IndexedDB
            try {
              await CrmDB.updateNote(updatedNote);
              console.log('Note updated successfully in IndexedDB');
            } catch (error) {
              if (!productConfig.useSupabase || !isOfflineLikeError(error)) {
                throw new Error(`Failed to update note in IndexedDB: ${error.message}`);
              }
              const queuedLocal = {
                ...updatedNote,
                source: 'localStorage',
                queuedSync: true,
                queuedOpType: 'update'
              };
              upsertLocalCustomerNote(customerId, queuedLocal);
              const dbInput = buildDbNoteInputFromAnyNote(queuedLocal, customerId);
              if (dbInput) {
                enqueueNoteOfflineOp({
                  type: 'update',
                  customerId: parseInt(customerId, 10),
                  noteId: editingNoteId,
                  note: { ...dbInput, id: editingNoteId }
                });
              }
              console.log('⚠️ Offline: queued note update for sync when online.');
            }
          } else {
            if (productConfig.useSupabase && !this.editingNote?.queuedSync) {
              throw new Error('Supabase mode requires DB-backed notes. Refresh the page and retry to avoid mixed local note edits.');
            }
            // Update in localStorage
            const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
            const customerNotes = existingNotes[customerId] || [];
            
            const noteIndex = customerNotes.findIndex(note => String(note.id) === editingNoteId);
            if (noteIndex === -1) {
              throw new Error('Could not find existing note to update in localStorage. Edit was aborted to avoid creating a duplicate note.');
            }
            
            // Save previous version to IndexedDB if possible (for future migration/recovery)
            const existingNote = customerNotes[noteIndex];
            try {
              // Try to save version history in IndexedDB (lightweight, doesn't affect localStorage quota)
              await CrmDB.getNotePreviousVersion(existingNote.id).catch(() => null); // Check if noteVersions store exists
              // Only save if this note might be migrated to IndexedDB later
              // For now, we'll skip version history for pure localStorage notes to save space
            } catch (versionError) {
              // Version history not available, that's okay
              console.debug('Version history not available for localStorage note');
            }
            
            // Ensure dates are normalized
            const normalizedUpdatedNote = {
              ...updatedNote,
              date: formatDateYYYYMMDD(updatedNote.date || this.editingNote.date),
              editedDate: updatedNote.editedDate ? (normalizeDateTimeToISO(updatedNote.editedDate) || updatedNote.editedDate) : undefined
            };
            
            customerNotes[noteIndex] = normalizedUpdatedNote;
            
            // Try to update localStorage. Do not create a replacement note during edit.
            try {
              existingNotes[customerId] = customerNotes;
              localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
              if (productConfig.useSupabase && this.editingNote?.queuedSync) {
                const dbInput = buildDbNoteInputFromAnyNote(normalizedUpdatedNote, customerId);
                if (dbInput) {
                  enqueueNoteOfflineOp({
                    type: 'update',
                    customerId: parseInt(customerId, 10),
                    noteId: editingNoteId,
                    note: { ...dbInput, id: editingNoteId }
                  });
                }
              }
              console.log('Note updated successfully in localStorage');
            } catch (localStorageError) {
              console.log('❌ localStorage update failed:', localStorageError.message);
              throw new Error(`Failed to update existing note in localStorage: ${localStorageError.message}`);
            }
          }
          
          // Refresh the notes list using hybrid loading
          try {
            if (typeof loadExistingNotes === 'function') {
              loadExistingNotes(customerId);
            } else {
              // Fallback: reload notes using hybrid method
              await this.refreshNotesDisplay(customerId);
            }
          } catch (refreshError) {
            console.warn('Note updated but failed to refresh display:', refreshError);
          }
          
          // Clear editing state
          this.editingNote = null;
        } else {
          // Creating new note
          const nextNoteNumber = allExistingNotes.length + 1;
          
          console.log(`Creating new note #${nextNoteNumber} (based on ${allExistingNotes.length} existing notes)`);
          
          // Generate unique ID that won't conflict with IndexedDB auto-increment
          // Use timestamp + random number to avoid conflicts
          const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
          
          const noteData = {
            id: uniqueId,
            svg: optimizedSvgData,
            date: formatDateYYYYMMDD(new Date()),
            noteNumber: nextNoteNumber,
            isPinned: getPinCheckboxValue(this.pinCheckbox)
          };

          // Use hybrid storage (localStorage first, IndexedDB fallback)
          const saveResult = await this.saveNoteHybrid(noteData, customerId);
          
          if (!saveResult.success) {
            throw new Error('Failed to save note with hybrid storage');
          }

          console.log(`New note saved successfully using ${saveResult.method}`);

          // Add note to UI immediately with the correct data
          try {
            // If saved to IndexedDB, update the noteData with the new ID
            if (saveResult.method === 'indexeddb' && saveResult.id) {
              noteData.id = saveResult.id;
              noteData.source = 'indexeddb-fallback';
            }
            
            this.addNoteToUI(noteData);
            
            // Also refresh the full notes list to ensure consistency
            setTimeout(async () => {
              try {
                await this.refreshNotesDisplay(customerId);
              } catch (refreshError) {
                console.warn('Failed to refresh notes display:', refreshError);
              }
            }, 100);
            
          } catch (uiError) {
            console.warn('Note saved but failed to update UI:', uiError);
            // Don't throw - the save was successful
          }
        }
        
        console.log('Save note operation completed successfully');
        this.hide();
        
      } catch (error) {
        console.error('Error in saveNote():', error);
        
        // Show detailed error popup instead of simple alert
        this.showErrorPopup(error, 'Save Note');
        throw error; // Re-throw for the calling function
      }
    }

    // Show detailed error popup for iPad debugging
    showErrorPopup(error, context = 'Save Note') {
      console.error(`${context} Error:`, error);
      
      // Create error modal
      const errorModal = document.createElement('div');
      errorModal.className = 'error-popup-modal';
      errorModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10012;
        padding: 20px;
        box-sizing: border-box;
      `;

      const errorContent = document.createElement('div');
      errorContent.style.cssText = `
        background: var(--bg);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
      `;

      const title = document.createElement('h3');
      title.textContent = `${context} Failed`;
      title.style.cssText = `
        margin: 0 0 16px 0;
        color: #ef4444;
        font-size: 20px;
        font-weight: 600;
      `;

      const message = document.createElement('p');
      message.style.cssText = `
        margin: 0 0 16px 0;
        color: var(--text);
        font-size: 16px;
        line-height: 1.5;
      `;

      // Create user-friendly error message
      let userMessage = 'An error occurred while saving your note. ';
      let technicalDetails = '';

      if (error.message) {
        if (error.message.includes('customer ID')) {
          userMessage += 'The app could not determine which customer this note belongs to. Please make sure you are viewing a specific customer page.';
        } else if (error.message.includes('LocalStorage')) {
          userMessage += 'Your device storage is full or unavailable. Please free up some space and try again.';
        } else if (error.message.includes('SVG')) {
          userMessage += 'There was a problem processing your drawing. Please try drawing again.';
        } else if (error.message.includes('drawing data')) {
          userMessage += 'No drawing was detected. Please make sure you have drawn something before saving.';
        } else {
          userMessage += 'Please try again. If the problem persists, try refreshing the page.';
        }
        technicalDetails = error.message;
      } else {
        userMessage += 'An unknown error occurred. Please try again.';
        technicalDetails = 'Unknown error - no error message available';
      }

      message.textContent = userMessage;

      // Technical details section (collapsible)
      const detailsContainer = document.createElement('div');
      detailsContainer.style.cssText = `
        margin: 16px 0;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        overflow: hidden;
      `;

      const detailsHeader = document.createElement('button');
      detailsHeader.textContent = 'Show Technical Details';
      detailsHeader.style.cssText = `
        width: 100%;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border: none;
        color: var(--text);
        font-size: 14px;
        cursor: pointer;
        text-align: left;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      `;

      const detailsContent = document.createElement('div');
      detailsContent.style.cssText = `
        padding: 12px;
        background: rgba(0,0,0,0.3);
        font-family: monospace;
        font-size: 12px;
        color: #fbbf24;
        white-space: pre-wrap;
        word-break: break-word;
        display: none;
      `;

      // Add current state information for debugging
      const debugInfo = this.getDebugInfo();
      detailsContent.textContent = `Error: ${technicalDetails}

Debug Information:
${debugInfo}

Browser: ${navigator.userAgent}
Time: ${new Date().toISOString()}`;

      let detailsVisible = false;
      detailsHeader.addEventListener('click', () => {
        detailsVisible = !detailsVisible;
        detailsContent.style.display = detailsVisible ? 'block' : 'none';
        detailsHeader.textContent = detailsVisible ? 'Hide Technical Details' : 'Show Technical Details';
      });

      detailsContainer.appendChild(detailsHeader);
      detailsContainer.appendChild(detailsContent);

      // Buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
      `;

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy Error Info';
      copyButton.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--text);
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
      `;

      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.cssText = `
        background: var(--brand);
        border: none;
        color: white;
        border-radius: 6px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      `;

      // Copy functionality
      copyButton.addEventListener('click', async () => {
        const errorInfo = `${APP_NAME} - Save Error Report
Time: ${new Date().toISOString()}
Error: ${technicalDetails}

${debugInfo}

Browser: ${navigator.userAgent}`;

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(errorInfo);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
              copyButton.textContent = 'Copy Error Info';
            }, 2000);
          } else {
            // Fallback for older browsers/iPad
            const textArea = document.createElement('textarea');
            textArea.value = errorInfo;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
              copyButton.textContent = 'Copy Error Info';
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy error info:', err);
          copyButton.textContent = 'Copy Failed';
          setTimeout(() => {
            copyButton.textContent = 'Copy Error Info';
          }, 2000);
        }
      });

      closeButton.addEventListener('click', () => {
        if (document.body.contains(errorModal)) {
          document.body.removeChild(errorModal);
        }
      });

      buttonContainer.appendChild(copyButton);
      buttonContainer.appendChild(closeButton);

      errorContent.appendChild(title);
      errorContent.appendChild(message);
      errorContent.appendChild(detailsContainer);
      errorContent.appendChild(buttonContainer);
      errorModal.appendChild(errorContent);

      document.body.appendChild(errorModal);

      // Auto-close after 30 seconds if user doesn't interact
      setTimeout(() => {
        if (document.body.contains(errorModal)) {
          document.body.removeChild(errorModal);
        }
      }, 30000);
    }

    // Get debug information for error reporting
    getDebugInfo() {
      const customerId = this.getCurrentCustomerId();
      const hasStrokes = this.strokes && this.strokes.length > 0;
      const strokeCount = hasStrokes ? this.strokes.length : 0;
      
      let svgStatus = 'Not tested';
      try {
        if (hasStrokes) {
          const svgData = this.canvasToSVG();
          svgStatus = svgData && svgData.trim().length > 0 ? `Success (${svgData.length} chars)` : 'Failed - empty result';
        } else {
          svgStatus = 'No strokes to convert';
        }
      } catch (error) {
        svgStatus = `Failed - ${error.message}`;
      }

      let localStorageStatus = 'Available';
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
      } catch (e) {
        localStorageStatus = `Unavailable - ${e.message}`;
      }

      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const customerNotes = existingNotes[customerId] || [];

      // iPad-specific checks
      const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalone = window.navigator.standalone === true;
      const memoryInfo = navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Unknown';
      
      // Storage information
      const storageInfo = this.getStorageInfo();
      
      return `Customer ID: ${customerId}
Stroke Count: ${strokeCount}
SVG Generation: ${svgStatus}
LocalStorage: ${localStorageStatus}
Storage Usage: ${storageInfo.totalSizeMB}MB (${storageInfo.usagePercentage}% of ~${storageInfo.estimatedLimitMB}MB limit)
Storage Items: ${storageInfo.itemCount}
Near Limit: ${storageInfo.isNearLimit ? 'YES' : 'NO'}
iPad Detected: ${storageInfo.isIPad ? 'YES' : 'NO'}
Existing Notes: ${customerNotes.length}
Canvas Visible: ${this.overlay ? this.overlay.style.display !== 'none' : 'No overlay'}
Current URL: ${window.location.href}
Editing Note: ${this.editingNote ? this.editingNote.id : 'None'}
Device: ${isIPad ? 'iPad/iOS' : 'Other'}
Standalone Mode: ${isStandalone}
Device Memory: ${memoryInfo}
Screen Size: ${window.screen.width}x${window.screen.height}
Viewport Size: ${window.innerWidth}x${window.innerHeight}
Touch Support: ${navigator.maxTouchPoints || 0} points`;
    }

    // Get storage usage information
    getStorageInfo() {
      let totalSize = 0;
      let itemCount = 0;
      let largestItems = [];
      
      try {
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            const value = localStorage.getItem(key);
            const size = value ? value.length : 0;
            totalSize += size;
            itemCount++;
            
            largestItems.push({ key, size });
          }
        }
        
        // Sort by size, largest first
        largestItems.sort((a, b) => b.size - a.size);
        largestItems = largestItems.slice(0, 10); // Top 10 largest items
        
        // Detect iPad and adjust storage limit estimate
        const isIPad = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const estimatedLimit = isIPad ? 2.5 * 1024 * 1024 : 10 * 1024 * 1024; // iPad: 2.5MB, Others: 10MB
        const usagePercentage = (totalSize / estimatedLimit) * 100;
        const isNearLimit = usagePercentage > 80; // 80% threshold
        
        return {
          totalSize,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          itemCount,
          usagePercentage: usagePercentage.toFixed(1),
          estimatedLimitMB: (estimatedLimit / (1024 * 1024)).toFixed(1),
          isIPad,
          isNearLimit,
          largestItems: largestItems.slice(0, 5) // Top 5 for logging
        };
      } catch (error) {
        return {
          totalSize: 0,
          totalSizeMB: '0.00',
          itemCount: 0,
          usagePercentage: '0.0',
          isNearLimit: false,
          largestItems: [],
          error: error.message
        };
      }
    }

    // Clean up old data to free space
    async cleanupOldData() {
      console.log('Starting storage cleanup...');
      let freedSpace = 0;
      
      try {
        // 1. Clean up old temporary data
        const keysToRemove = [];
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            // Remove old test keys
            if (key.startsWith('test') || key.startsWith('temp')) {
              keysToRemove.push(key);
            }
            // Remove old image cache keys (if any)
            if (key.startsWith(`${STORAGE_PREFIX}image_`) && Math.random() < 0.1) { // Remove 10% randomly
              keysToRemove.push(key);
            }
          }
        }
        
        keysToRemove.forEach(key => {
          const size = localStorage.getItem(key)?.length || 0;
          localStorage.removeItem(key);
          freedSpace += size;
        });
        
        // In Supabase mode, never mutate localStorage notes history during cleanup.
        if (productConfig.useSupabase) {
          console.log('Supabase mode: skipping customerNotes cleanup to preserve local note history.');
          console.log(`Cleanup completed. Freed approximately ${(freedSpace / 1024).toFixed(1)}KB`);
          return freedSpace;
        }

        // 2. Compress customer notes by removing redundant data
        const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        let notesModified = false;
        
        for (let customerId in customerNotes) {
          const notes = customerNotes[customerId];
          if (Array.isArray(notes)) {
            // Keep only the most recent 50 notes per customer
            if (notes.length > 50) {
              // Sort by creation time (newer first) and keep top 50
              notes.sort((a, b) => {
                const timeA = a.id || 0;
                const timeB = b.id || 0;
                return timeB - timeA;
              });
              customerNotes[customerId] = notes.slice(0, 50);
              notesModified = true;
              console.log(`Trimmed notes for customer ${customerId} from ${notes.length} to 50`);
            }
          }
        }
        
        if (notesModified) {
          const oldSize = localStorage.getItem('customerNotes')?.length || 0;
          localStorage.setItem('customerNotes', JSON.stringify(customerNotes));
          const newSize = localStorage.getItem('customerNotes')?.length || 0;
          freedSpace += Math.max(0, oldSize - newSize);
        }
        
        console.log(`Cleanup completed. Freed approximately ${(freedSpace / 1024).toFixed(1)}KB`);
        return freedSpace;
        
      } catch (error) {
        console.error('Error during cleanup:', error);
        return 0;
      }
    }

    // Enhanced save with quota handling
    async saveNoteWithQuotaHandling(noteData, customerId, existingNotes, customerNotes) {
      const maxRetries = 3;
      let attempt = 0;
      
      while (attempt < maxRetries) {
        try {
          // Try to save
          if (!existingNotes[customerId]) {
            existingNotes[customerId] = [];
          }
          existingNotes[customerId].push(noteData);
          
          const dataToSave = JSON.stringify(existingNotes);
          localStorage.setItem('customerNotes', dataToSave);
          
          console.log(`Note saved successfully on attempt ${attempt + 1}`);
          return true;
          
        } catch (error) {
          attempt++;
          console.log(`Save attempt ${attempt} failed:`, error.message);
          
          if (error.message.includes('quota') || error.message.includes('QuotaExceededError')) {
            if (attempt < maxRetries) {
              console.log(`Quota exceeded, attempting cleanup before retry ${attempt + 1}...`);
              
              // Progressive cleanup strategies
              if (attempt === 1) {
                // First retry: basic cleanup
                await this.cleanupOldData();
              } else if (attempt === 2) {
                // Second retry: more aggressive cleanup
                await this.aggressiveCleanup();
              }
              
              // Wait a bit before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              // Final attempt failed, show storage full error
              throw new Error(`Storage quota exceeded. Please free up space by:\n1. Clearing browser data\n2. Deleting old notes\n3. Restarting the app\n\nStorage used: ${this.getStorageInfo().totalSizeMB}MB`);
            }
          } else {
            // Non-quota error, don't retry
            throw error;
          }
        }
      }
      
      return false;
    }

    // More aggressive cleanup for critical situations
    async aggressiveCleanup() {
      console.log('Performing aggressive cleanup...');
      
      try {
        if (productConfig.useSupabase) {
          console.log('Supabase mode: skipping aggressive customerNotes cleanup to preserve local note history.');
          return;
        }
        // Remove all non-essential localStorage items
        const essentialKeys = ['customerNotes'];
        const keysToRemove = [];
        
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key) && !essentialKeys.includes(key)) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log(`Aggressive cleanup removed ${keysToRemove.length} non-essential items`);
        
        // Also limit notes per customer more aggressively
        const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        let modified = false;
        
        for (let customerId in customerNotes) {
          const notes = customerNotes[customerId];
          if (Array.isArray(notes) && notes.length > 20) {
            // Keep only 20 most recent notes per customer
            notes.sort((a, b) => (b.id || 0) - (a.id || 0));
            customerNotes[customerId] = notes.slice(0, 20);
            modified = true;
          }
        }
        
        if (modified) {
          localStorage.setItem('customerNotes', JSON.stringify(customerNotes));
        }
        
      } catch (error) {
        console.error('Error during aggressive cleanup:', error);
      }
    }

    // Check if IndexedDB is ready for notes storage
    async checkIndexedDBReady() {
      try {
        if (!window.CrmDB) {
          return { ready: false, error: 'CrmDB not available' };
        }
        
        // Try to access the notes store by attempting a simple operation
        const testNotes = await CrmDB.getNotesByCustomerId(999999); // Non-existent customer
        return { ready: true, error: null };
        
      } catch (error) {
        return { ready: false, error: error.message };
      }
    }

    // Hybrid storage manager - tries localStorage first, falls back to IndexedDB
    async saveNoteHybrid(noteData, customerId) {
      console.log('Attempting hybrid save for customer:', customerId);
      
      // Ensure dates are in yyyy-mm-dd format before saving
      const normalizedNoteData = {
        ...noteData,
        date: formatDateYYYYMMDD(noteData.date),
        editedDate: noteData.editedDate ? (normalizeDateTimeToISO(noteData.editedDate) || noteData.editedDate) : undefined,
        createdAt: noteData.createdAt ? (normalizeDateTimeToISO(noteData.createdAt) || noteData.createdAt) : undefined
      };

      // Supabase mode: keep notes DB-backed only.
      if (productConfig.useSupabase) {
        const noteForDB = buildDbNoteInputFromAnyNote(normalizedNoteData, customerId);
        if (!noteForDB) {
          throw new Error('Cannot save note: invalid note payload');
        }
        try {
          const savedId = await CrmDB.createNote(noteForDB);
          normalizedNoteData.id = savedId;
          normalizedNoteData.source = 'supabase';
          normalizedNoteData.queuedSync = false;
          Object.assign(noteData, normalizedNoteData);
          console.log('✅ Note saved to Supabase successfully, ID:', savedId);
          return { method: 'supabase', success: true, id: savedId };
        } catch (error) {
          if (!isOfflineLikeError(error)) throw error;
          const localId = normalizedNoteData.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const queuedLocal = {
            ...normalizedNoteData,
            id: localId,
            source: 'localStorage',
            queuedSync: true,
            queuedOpType: 'create'
          };
          upsertLocalCustomerNote(customerId, queuedLocal);
          enqueueNoteOfflineOp({
            type: 'create',
            customerId: parseInt(customerId, 10),
            localId: localId,
            note: noteForDB
          });
          Object.assign(noteData, queuedLocal);
          console.log('⚠️ Offline: queued note create for sync when online.');
          return { method: 'offline-queued', success: true, id: localId };
        }
      }
      
      try {
        // First, try localStorage (existing method)
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        if (!existingNotes[customerId]) {
          existingNotes[customerId] = [];
        }
        existingNotes[customerId].push(normalizedNoteData);
        
        const dataToSave = JSON.stringify(existingNotes);
        localStorage.setItem('customerNotes', dataToSave);
        
        console.log('✅ Note saved to localStorage successfully');
        return { method: 'localStorage', success: true };
        
      } catch (localStorageError) {
        console.log('❌ localStorage failed:', localStorageError.message);
        console.log('🔄 Attempting IndexedDB fallback...');
        
        try {
          // Fallback to IndexedDB
          console.log('🔄 Initializing IndexedDB for notes fallback...');
          
          // Check if IndexedDB is ready
          const dbStatus = await this.checkIndexedDBReady();
          if (!dbStatus.ready) {
            throw new Error(`IndexedDB not ready: ${dbStatus.error}`);
          }
          
          const noteForDB = {
            customerId: parseInt(customerId),
            svg: normalizedNoteData.svg,
            date: normalizedNoteData.date,
            noteNumber: normalizedNoteData.noteNumber,
            createdAt: new Date().toISOString(),
            editedDate: normalizedNoteData.editedDate,
            isPinned: normalizedNoteData.isPinned === true,
            source: 'indexeddb-fallback', // Mark as fallback save
            originalId: normalizedNoteData.id // Store the original ID for reference
          };
          
          console.log('Attempting to save note to IndexedDB...', noteForDB);
          const savedId = await CrmDB.createNote(noteForDB);
          console.log('✅ Note saved to IndexedDB successfully, ID:', savedId);
          
          // Update the noteData with the database ID for UI consistency
          normalizedNoteData.id = savedId;
          normalizedNoteData.source = 'indexeddb-fallback';
          normalizedNoteData.originalId = noteForDB.originalId;
          
          // Also update original noteData for return consistency
          Object.assign(noteData, normalizedNoteData);
          
          return { method: 'indexeddb', success: true, id: savedId };
          
        } catch (indexedDBError) {
          console.error('❌ IndexedDB fallback also failed:', indexedDBError);
          
          // Provide specific guidance based on the error
          let errorDetails = `Both storage methods failed:\nLocalStorage: ${localStorageError.message}\nIndexedDB: ${indexedDBError.message}`;
          
          if (indexedDBError.message.includes('object stores was not found') || 
              indexedDBError.message.includes('IndexedDB not ready')) {
            errorDetails += '\n\n🔧 Fix: Please refresh the page to update the database schema.';
          } else if (indexedDBError.message.includes('CrmDB not available')) {
            errorDetails += '\n\n🔧 Fix: Please refresh the page to initialize the database.';
          }
          
          throw new Error(errorDetails);
        }
      }
    }

    // Load notes from both localStorage and IndexedDB
    async loadNotesHybrid(customerId) {
      // Supabase mode: use DB-backed notes only to avoid mixed local + DB note state.
      if (productConfig.useSupabase && customerId !== 'temp-new-customer') {
        try {
          await flushQueuedNoteOperations();
          let dbNotes = await CrmDB.getNotesByCustomerId(customerId);
          const localNotes = getLocalNotesForCustomer(customerId);
          if (localNotes.length > 0) {
            const syncedCount = await this.syncLocalNotesToSupabase(customerId, localNotes, dbNotes);
            if (syncedCount > 0) {
              dbNotes = await CrmDB.getNotesByCustomerId(customerId);
            }
          }
          dbNotes.forEach((note) => {
            note.source = note.source || 'supabase';
          });
          dbNotes.sort(compareNotesByCreatedDesc);
          dbNotes.forEach((note, index) => {
            note.noteNumber = index + 1;
          });
          console.log(`Loaded ${dbNotes.length} notes from Supabase (DB-only mode)`);
          return dbNotes;
        } catch (error) {
          console.warn('Error loading DB-only notes in Supabase mode:', error);
          const localNotes = getLocalNotesForCustomer(customerId);
          localNotes.forEach((note) => {
            note.source = note.source || 'localStorage';
          });
          localNotes.sort(compareNotesByCreatedDesc);
          localNotes.forEach((note, index) => {
            note.noteNumber = index + 1;
          });
          return localNotes;
        }
      }

      const allNotes = [];
      
      try {
        // Load from localStorage
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        const localStorageNotes = existingNotes[customerId] || [];
        
        // Mark localStorage notes
        localStorageNotes.forEach(note => {
          note.source = note.source || 'localStorage';
        });
        
        allNotes.push(...localStorageNotes);
        console.log(`Loaded ${localStorageNotes.length} notes from localStorage`);
        
      } catch (error) {
        console.warn('Error loading from localStorage:', error);
      }
      
      try {
        // Load from IndexedDB
        const indexedDBNotes = await CrmDB.getNotesByCustomerId(customerId);
        const dbSourceDefault = productConfig.useSupabase ? 'supabase' : 'indexeddb';
        
        // Mark IndexedDB notes
        indexedDBNotes.forEach(note => {
          note.source = note.source || dbSourceDefault;
        });
        
        allNotes.push(...indexedDBNotes);
        console.log(`Loaded ${indexedDBNotes.length} notes from IndexedDB`);
        
      } catch (error) {
        console.warn('Error loading from IndexedDB:', error);
      }

      // De-duplicate by note ID, preferring DB-backed copies over localStorage copies.
      const dedupedById = new Map();
      allNotes.forEach((note) => {
        if (!note || note.id == null) return;
        const key = String(note.id);
        const existing = dedupedById.get(key);
        if (!existing) {
          dedupedById.set(key, note);
          return;
        }
        const existingDb = isDbBackedNoteSource(existing.source);
        const incomingDb = isDbBackedNoteSource(note.source);
        if (!existingDb && incomingDb) {
          dedupedById.set(key, note);
          return;
        }
        if (existingDb && !incomingDb) return;
        const existingTime = new Date(existing.editedDate || existing.updatedAt || existing.createdAt || existing.date || 0).getTime() || 0;
        const incomingTime = new Date(note.editedDate || note.updatedAt || note.createdAt || note.date || 0).getTime() || 0;
        if (incomingTime >= existingTime) {
          dedupedById.set(key, note);
        }
      });
      const notesWithoutId = allNotes.filter((note) => !note || note.id == null);
      const mergedNotes = [...dedupedById.values(), ...notesWithoutId];
      
      // Sort all notes by creation time (newest first)
      mergedNotes.sort(compareNotesByCreatedDesc);
      
      // Re-number notes for display consistency
      mergedNotes.forEach((note, index) => {
        note.noteNumber = index + 1;
      });
      
      console.log(`Total notes loaded: ${mergedNotes.length}`);
      return mergedNotes;
    }

    async syncLocalNotesToSupabase(customerId, localNotesInput, dbNotesInput) {
      if (!productConfig.useSupabase) return 0;
      const localNotes = Array.isArray(localNotesInput) ? localNotesInput : [];
      const dbNotes = Array.isArray(dbNotesInput) ? dbNotesInput : [];
      if (localNotes.length === 0) return 0;

      const existingSigs = new Set();
      dbNotes.forEach((note) => {
        const sig = buildNoteSyncSignature(note);
        if (sig) existingSigs.add(sig);
      });

      let syncedCount = 0;
      const numericCustomerId = parseInt(customerId, 10);
      if (Number.isNaN(numericCustomerId)) return 0;

      for (const localNote of localNotes) {
        if (localNote && localNote.queuedSync === true) continue;
        const sig = buildNoteSyncSignature(localNote);
        if (!sig || existingSigs.has(sig)) continue;

        const payload = getNotePayloadForSync(localNote);
        if (!payload) continue;

        try {
          const createInput = {
            customerId: numericCustomerId,
            date: payload.date,
            noteNumber: payload.noteNumber,
            createdAt: payload.createdAt || new Date().toISOString(),
            editedDate: payload.editedDate || null,
            noteType: payload.noteType,
            isPinned: payload.isPinned === true
          };
          if (payload.noteType === 'text') {
            createInput.text = payload.text;
            createInput.textValue = payload.text;
            createInput.svg = null;
          } else {
            createInput.svg = payload.svg;
          }

          await CrmDB.createNote(createInput);
          existingSigs.add(sig);
          syncedCount++;
        } catch (error) {
          console.warn('Failed syncing local note to Supabase', error);
        }
      }

      if (syncedCount > 0) {
        console.log(`Synced ${syncedCount} local note(s) to Supabase for customer ${customerId}`);
      }
      return syncedCount;
    }

    // Refresh the notes display using hybrid loading
    async refreshNotesDisplay(customerId) {
      try {
        const allNotes = await this.loadNotesHybrid(customerId);
        
        // Clear existing notes from UI
        const notesList = document.querySelector('.notes-list');
        if (notesList) {
          notesList.innerHTML = '';
        }
        const pinnedList = document.querySelector('.pinned-notes-list');
        const pinnedView = document.querySelector('.pinned-notes-view');
        if (pinnedList) pinnedList.innerHTML = '';
        if (pinnedView) pinnedView.style.display = 'none';
        
        // Add all notes to UI
        allNotes.forEach(note => {
          this.addNoteToUI(note);
        });
        
        console.log(`Refreshed display with ${allNotes.length} notes`);
        
      } catch (error) {
        console.error('Error refreshing notes display:', error);
      }
    }

    // Optimize SVG for storage by reducing precision and removing redundant data
    optimizeSVGForStorage(svgData) {
      try {
        // For very large SVGs (>100KB), apply aggressive optimization
        if (svgData.length > 100000) {
          console.log('Applying aggressive SVG optimization for large drawing...');
          
          // Reduce coordinate precision (from 6 decimals to 2)
          let optimized = svgData.replace(/(\d+\.\d{3,})/g, (match) => {
            return parseFloat(match).toFixed(2);
          });
          
          // Remove unnecessary whitespace and newlines
          optimized = optimized.replace(/\s+/g, ' ').trim();
          
          // Compress path data by removing redundant commands
          optimized = optimized.replace(/([ML])\s*(\d+\.?\d*)\s*(\d+\.?\d*)\s*([ML])\s*(\d+\.?\d*)\s*(\d+\.?\d*)/g, 
            (match, cmd1, x1, y1, cmd2, x2, y2) => {
              // If consecutive M or L commands are very close, merge them
              const dx = Math.abs(parseFloat(x2) - parseFloat(x1));
              const dy = Math.abs(parseFloat(y2) - parseFloat(y1));
              if (dx < 1 && dy < 1) {
                return `${cmd1} ${x1} ${y1}`;
              }
              return match;
            });
          
          // Remove very short path segments (less than 1 pixel)
          optimized = optimized.replace(/<path[^>]*d="([^"]*)"[^>]*>/g, (match, pathData) => {
            const commands = pathData.split(/(?=[ML])/);
            const filteredCommands = commands.filter(cmd => {
              if (cmd.length < 5) return false; // Very short commands
              const coords = cmd.match(/(\d+\.?\d*)/g);
              if (coords && coords.length >= 4) {
                const dx = Math.abs(parseFloat(coords[2]) - parseFloat(coords[0]));
                const dy = Math.abs(parseFloat(coords[3]) - parseFloat(coords[1]));
                return dx > 0.5 || dy > 0.5; // Keep only meaningful movements
              }
              return true;
            });
            
            if (filteredCommands.length < commands.length * 0.5) {
              // If we filtered out more than 50%, the path might be too simplified
              return match;
            }
            
            return match.replace(pathData, filteredCommands.join(''));
          });
          
          console.log(`SVG optimization: ${svgData.length} → ${optimized.length} chars (${((1 - optimized.length / svgData.length) * 100).toFixed(1)}% reduction)`);
          return optimized;
        }
        
        // For smaller SVGs, apply light optimization
        let optimized = svgData;
        
        // Reduce coordinate precision slightly
        optimized = optimized.replace(/(\d+\.\d{4,})/g, (match) => {
          return parseFloat(match).toFixed(3);
        });
        
        // Remove unnecessary whitespace
        optimized = optimized.replace(/\s+/g, ' ').trim();
        
        return optimized;
        
      } catch (error) {
        console.warn('SVG optimization failed, using original:', error);
        return svgData;
      }
    }

    getCurrentCustomerId() {
      
      // Try to get customer ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        console.log(`Found customer ID from URL: ${id}`);
        return id;
      }
      
      // Try to get from the current customer data if available
      if (window.currentCustomer && window.currentCustomer.id) {
        console.log(`Found customer ID from window.currentCustomer: ${window.currentCustomer.id}`);
        return window.currentCustomer.id;
      }
      
      // Try to extract from the current page context
      // Check if we're on a customer view page by looking for customer data in the DOM
      const currentId = window.currentCustomerId || window.customerId;
      if (currentId) {
        console.log(`Found customer ID from window variables: ${currentId}`);
        return currentId;
      }
      
      // If editing, try to get from form
      const form = document.querySelector('form');
      if (form && form.dataset.customerId) {
        console.log(`Found customer ID from form dataset: ${form.dataset.customerId}`);
        return form.dataset.customerId;
      }
      
      // Check if we're on the new customer page
      const isNewCustomerPage = window.location.hash.includes('#/add') || 
                               document.querySelector('h2')?.textContent?.includes('New Customer') ||
                               document.querySelector('h2')?.textContent?.includes('newCustomer');
      
      if (isNewCustomerPage) {
        console.log('Detected new customer page, using temp ID');
        return 'temp-new-customer';
      }
      
      // Try to find customer ID in the page title or header
      const pageTitle = document.querySelector('h2')?.textContent;
      if (pageTitle) {
        const idMatch = pageTitle.match(/ID:\s*(\d+)/);
        if (idMatch) {
          console.log(`Found customer ID from page title: ${idMatch[1]}`);
          return idMatch[1];
        }
      }
      
      // Try to find customer ID in any data attributes on the page
      const customerElements = document.querySelectorAll('[data-customer-id]');
      if (customerElements.length > 0) {
        const foundId = customerElements[0].dataset.customerId;
        console.log(`Found customer ID from data attribute: ${foundId}`);
        return foundId;
      }
      
      // Log warning about fallback
      console.warn('Could not determine customer ID, using default fallback');
      
      // Default fallback
      return 'default';
    }

    createNoteContentContainer(noteData, isMigratedNote = false) {
      const noteText = getNoteTextValue(noteData);
      const isTextNote = shouldRenderAsText(noteData);

      if (isTextNote) {
        const contentContainer = document.createElement('div');
        contentContainer.className = 'text-note-content';
        contentContainer.setAttribute('data-testid', 'text-note-content');
        contentContainer.style.cssText = `
          max-width: 100%;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          color: var(--text);
          font-size: 15px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        `;
        contentContainer.textContent = noteText || '(No text payload)';
        return contentContainer;
      }

      const contentContainer = document.createElement('div');
      contentContainer.innerHTML = noteData.svg || '';
      contentContainer.style.cssText = `
        max-width: 100%;
        overflow: visible;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        padding: 8px;
        background: transparent;
        display: flex;
        justify-content: ${isMigratedNote ? 'flex-start' : 'center'};
        align-items: flex-start;
        min-height: 100px;
      `;

      const svg = contentContainer.querySelector('svg');
      if (svg) {
        const originalViewBox = svg.getAttribute('viewBox');
        const originalWidth = svg.getAttribute('width');
        const originalHeight = svg.getAttribute('height');
        let svgWidth = 500; // default width
        let svgHeight = 60; // default height

        if (originalViewBox) {
          const parts = originalViewBox.split(' ');
          if (parts.length >= 4) {
            svgWidth = parseInt(parts[2]) || 500;
            svgHeight = parseInt(parts[3]) || 60;
          }
        } else if (originalWidth && originalHeight) {
          svgWidth = parseInt(originalWidth) || 500;
          svgHeight = parseInt(originalHeight) || 60;
        }

        const textElements = svg.querySelectorAll('text, tspan');
        let maxY = 0;
        let maxX = 0;
        let fontSize = 16; // default font size

        textElements.forEach(textEl => {
          const computedFontSize = textEl.getAttribute('font-size');
          if (computedFontSize) {
            fontSize = parseInt(computedFontSize) || 16;
          }

          const x = parseFloat(textEl.getAttribute('x')) || 0;
          const y = parseFloat(textEl.getAttribute('y')) || 0;
          const dy = parseFloat(textEl.getAttribute('dy')) || 0;
          const actualY = y + dy;
          const lineHeight = fontSize * 1.3;
          const textHeight = actualY + lineHeight;
          const textContent = textEl.textContent || '';
          const estimatedTextWidth = textContent.length * fontSize * 0.6;
          const textWidth = x + estimatedTextWidth;

          if (textHeight > maxY) {
            maxY = textHeight;
          }

          if (textWidth > maxX) {
            maxX = textWidth;
          }
        });

        if (maxY > 0) {
          svgHeight = Math.max(svgHeight, maxY + 20);
        }

        if (maxX > 0) {
          svgWidth = Math.max(svgWidth, maxX + 20);
        }

        const containerWidth = contentContainer.parentElement?.offsetWidth || 500;
        const containerHeight = contentContainer.parentElement?.offsetHeight || 400;
        const maxAllowedWidth = containerWidth - 40;
        const maxAllowedHeight = containerHeight - 40;
        const widthScale = maxAllowedWidth / svgWidth;
        const heightScale = maxAllowedHeight / svgHeight;
        const scale = Math.min(widthScale, heightScale, 1);

        if (scale < 1) {
          svgWidth = svgWidth * scale;
          svgHeight = svgHeight * scale;
        } else {
          svgWidth = Math.min(svgWidth, maxAllowedWidth);
          svgHeight = Math.min(svgHeight, maxAllowedHeight);
        }

        svg.setAttribute('viewBox', `0 0 ${svgWidth / scale} ${svgHeight / scale}`);
        svg.setAttribute('width', svgWidth);
        svg.setAttribute('height', svgHeight);

        svg.style.cssText = `
          max-width: 100%;
          width: ${svgWidth}px;
          height: ${svgHeight}px;
          background: transparent;
        `;
      }

      return contentContainer;
    }

    createNoteEditButton(noteData) {
      const editButton = document.createElement('button');
      editButton.textContent = '✏️';
      editButton.title = 'Edit Note';
      editButton.setAttribute('data-testid', 'edit-note-button');
      editButton.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--text);
        font-size: 12px;
        transition: background 0.2s ease;
      `;
      editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (shouldRenderAsText(noteData)) {
          textNotesOverlay.show(noteData.customerId || getCurrentCustomerId(), noteData);
        } else {
          this.editNote(noteData);
        }
      });
      editButton.addEventListener('mouseenter', () => {
        editButton.style.background = 'rgba(255,255,255,0.2)';
      });
      editButton.addEventListener('mouseleave', () => {
        editButton.style.background = 'rgba(255,255,255,0.1)';
      });
      return editButton;
    }

    addNoteToUI(noteData) {
      const notesList = document.querySelector('.notes-list');
      if (!notesList) return;
      if (isNotePinned(noteData)) {
        const pinnedList = document.querySelector('.pinned-notes-list');
        if (pinnedList) {
          this.addPinnedNoteToUI(noteData);
          return;
        }
      }
      const isPendingSync = isNoteQueuedForSync(noteData);

      const noteElement = document.createElement('div');
      noteElement.className = 'note-entry';
      noteElement.setAttribute('data-testid', 'note-entry');
      noteElement.style.cssText = `
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        background: rgba(255,255,255,0.03);
        overflow: hidden;
      `;
      if (isPendingSync) {
        noteElement.style.borderColor = 'rgba(245, 158, 11, 0.45)';
        noteElement.style.boxShadow = '0 0 0 1px rgba(245, 158, 11, 0.18) inset';
      }

      const noteHeader = document.createElement('div');
      noteHeader.className = 'note-header';
      noteHeader.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      `;

      // Check if this is a migrated note (either explicitly flagged or by content analysis)
      const isMigratedNote = noteData.isMigrated || isMigratedNoteByContent(noteData);

      const noteTitle = document.createElement('span');
      noteTitle.style.color = 'var(--text)';
      noteTitle.style.fontWeight = '600';
      
      // Create the main title text
      const titleText = document.createElement('span');
      // Format date for display (convert yyyy-mm-dd to readable format)
      let displayDate = noteData.date;
      if (displayDate && /^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
        // Convert yyyy-mm-dd to readable format
        try {
          const date = new Date(displayDate + 'T00:00:00');
          if (!isNaN(date.getTime())) {
            displayDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        } catch (e) {
          // Keep original if conversion fails
        }
      }
      titleText.textContent = `Note ${noteData.noteNumber} - ${displayDate}`;
      
      // Add migrated indicator if this is a migrated note
      if (isMigratedNote) {
        const migratedIndicator = document.createElement('span');
        migratedIndicator.textContent = ' (migrated)';
        migratedIndicator.style.fontStyle = 'italic';
        migratedIndicator.style.fontSize = '0.85em';
        migratedIndicator.style.color = 'var(--muted)';
        migratedIndicator.style.fontWeight = '400';
        titleText.appendChild(migratedIndicator);
      }
      
      noteTitle.appendChild(titleText);
      
      // Add edited timestamp if the note was edited
      if (noteData.editedDate) {
        // Format editedDate for display (supports ISO datetime and yyyy-mm-dd legacy values)
        let displayEditedDate = noteData.editedDate;
        try {
          const isDateOnlyEdited = /^\d{4}-\d{2}-\d{2}$/.test(displayEditedDate);
          const toParse = isDateOnlyEdited
            ? (noteData.updatedAt || `${displayEditedDate}T00:00:00`)
            : displayEditedDate;
          const date = new Date(toParse);
          if (!isNaN(date.getTime())) {
            displayEditedDate = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (e) {
          // Keep original if conversion fails
        }
        const editedText = document.createElement('span');
        editedText.textContent = ` (edited: ${displayEditedDate})`;
        editedText.style.fontStyle = 'italic';
        editedText.style.fontSize = '0.85em';
        editedText.style.color = 'var(--muted)';
        editedText.style.fontWeight = '400';
        noteTitle.appendChild(editedText);
      }

      const headerRight = document.createElement('div');
      headerRight.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      if (isPendingSync) {
        const pendingBadge = document.createElement('span');
        pendingBadge.textContent = 'Sync pending';
        pendingBadge.title = 'Saved offline. Will sync when connection is restored.';
        pendingBadge.style.cssText = `
          font-size: 11px;
          line-height: 1;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid rgba(245, 158, 11, 0.45);
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          font-weight: 700;
          letter-spacing: 0.01em;
          white-space: nowrap;
        `;
        headerRight.appendChild(pendingBadge);
      }

      // Only show edit button for non-migrated notes
      if (!isMigratedNote) {
        const editButton = document.createElement('button');
        editButton.textContent = '✏️';
        editButton.title = 'Edit Note';
        editButton.setAttribute('data-testid', 'edit-note-button');
        editButton.style.cssText = `
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 12px;
          transition: background 0.2s ease;
        `;
        editButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent header click
          // Use text overlay for text-based notes, canvas for SVG notes.
          // Be defensive: render/edit as text when text payload exists but SVG payload is empty.
          const noteText = getNoteTextValue(noteData);
          const isTextNote = shouldRenderAsText(noteData);
          if (isTextNote) {
            textNotesOverlay.show(noteData.customerId || getCurrentCustomerId(), noteData);
          } else {
            this.editNote(noteData);
          }
        });
        editButton.addEventListener('mouseenter', () => {
          editButton.style.background = 'rgba(255,255,255,0.2)';
        });
        editButton.addEventListener('mouseleave', () => {
          editButton.style.background = 'rgba(255,255,255,0.1)';
        });
        
        headerRight.appendChild(editButton);
      }

      if (!isNotePinned(noteData)) {
        const pinButton = document.createElement('button');
        pinButton.textContent = '📌';
        pinButton.title = 'Pin Note';
        pinButton.setAttribute('data-testid', 'pin-note-button');
        pinButton.style.cssText = `
          background: rgba(251,191,36,0.16);
          border: 1px solid rgba(251,191,36,0.38);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          color: var(--text);
          font-size: 12px;
          transition: background 0.2s ease;
        `;
        pinButton.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await persistNotePinnedState(noteData, true);
          } catch (error) {
            alert(`Failed to pin note: ${error.message}`);
          }
        });
        pinButton.addEventListener('mouseenter', () => {
          pinButton.style.background = 'rgba(251,191,36,0.28)';
        });
        pinButton.addEventListener('mouseleave', () => {
          pinButton.style.background = 'rgba(251,191,36,0.16)';
        });
        headerRight.appendChild(pinButton);
      }

      const expandIcon = document.createElement('span');
      expandIcon.textContent = '▼';
      expandIcon.style.color = 'var(--muted)';
      expandIcon.style.transition = 'transform 0.2s ease';

      // Add delete button only on edit and new customer screens, for all notes
      const isEditScreen = window.location.hash.includes('#/customer-edit');
      const isNewCustomerScreen = window.location.hash.includes('#/add') || 
                                 document.querySelector('h2')?.textContent?.includes('New Customer') ||
                                 document.querySelector('h2')?.textContent?.includes('newCustomer');
      
      // Show delete button only on edit/new customer screens for all notes
      if (isEditScreen || isNewCustomerScreen) {
        // Add revert button for IndexedDB notes (only they have version history)
        if (isDbBackedNoteSource(noteData.source)) {
          const revertButton = document.createElement('button');
          revertButton.textContent = '↩️';
          revertButton.title = 'Revert to Previous Version';
          revertButton.style.cssText = `
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            color: #3b82f6;
            font-size: 12px;
            transition: background 0.2s ease;
            margin-right: 6px;
          `;
          revertButton.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent header click
            if (confirm('Are you sure you want to revert this note to its previous version? This will replace the current content with the last saved version.')) {
              try {
                await this.revertNoteToPreviousVersion(noteData);
              } catch (error) {
                alert(`Failed to revert note: ${error.message}`);
              }
            }
          });
          revertButton.addEventListener('mouseenter', () => {
            revertButton.style.background = 'rgba(59, 130, 246, 0.3)';
          });
          revertButton.addEventListener('mouseleave', () => {
            revertButton.style.background = 'rgba(59, 130, 246, 0.2)';
          });
          
          headerRight.appendChild(revertButton);
        }
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '🗑️';
        deleteButton.title = 'Delete Note';
        deleteButton.style.cssText = `
          background: rgba(255,100,100,0.2);
          border: 1px solid rgba(255,100,100,0.4);
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          color: #ff6b6b;
          font-size: 12px;
          transition: background 0.2s ease;
        `;
        deleteButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent header click
          this.deleteNote(noteData);
        });
        deleteButton.addEventListener('mouseenter', () => {
          deleteButton.style.background = 'rgba(255,100,100,0.3)';
        });
        deleteButton.addEventListener('mouseleave', () => {
          deleteButton.style.background = 'rgba(255,100,100,0.2)';
        });
        
        headerRight.appendChild(deleteButton);
      }
      headerRight.appendChild(expandIcon);
      noteHeader.appendChild(noteTitle);
      noteHeader.appendChild(headerRight);

      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.style.cssText = `
        padding: 16px;
        display: none;
        background: rgba(255,255,255,0.02);
        max-height: 90vh;
        overflow-y: auto;
      `;

      const contentContainer = this.createNoteContentContainer(noteData, isMigratedNote);

      noteContent.appendChild(contentContainer);
      noteElement.appendChild(noteHeader);
      noteElement.appendChild(noteContent);

      // Toggle functionality
      noteHeader.addEventListener('click', () => {
        const isExpanded = noteContent.style.display !== 'none';
        noteContent.style.display = isExpanded ? 'none' : 'block';
        expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
      });

      notesList.appendChild(noteElement);
    }

    addPinnedNoteToUI(noteData) {
      const pinnedList = document.querySelector('.pinned-notes-list');
      const pinnedView = document.querySelector('.pinned-notes-view');
      if (!pinnedList) return;
      if (pinnedView) pinnedView.style.display = 'block';

      const isPendingSync = isNoteQueuedForSync(noteData);
      const isMigratedNote = noteData.isMigrated || isMigratedNoteByContent(noteData);
      const showPinnedActions = window.location.hash.includes('#/customer-edit');

      const noteElement = document.createElement('div');
      noteElement.className = 'note-entry pinned-note-entry';
      noteElement.setAttribute('data-testid', 'pinned-note-entry');
      noteElement.style.cssText = `
        border: 1px solid rgba(251,191,36,0.38);
        border-radius: 8px;
        background: rgba(251,191,36,0.08);
        overflow: hidden;
        box-shadow: 0 0 0 1px rgba(251,191,36,0.08) inset;
      `;
      if (isPendingSync) {
        noteElement.style.borderColor = 'rgba(245, 158, 11, 0.55)';
      }

      const noteHeader = document.createElement('div');
      noteHeader.className = 'pinned-note-actions';
      noteHeader.style.cssText = `
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        background: rgba(251,191,36,0.08);
        border-bottom: 1px solid rgba(251,191,36,0.22);
      `;

      const headerRight = document.createElement('div');
      headerRight.style.cssText = 'display:flex; align-items:center; gap:8px; flex-shrink:0;';

      if (isPendingSync) {
        const pendingBadge = document.createElement('span');
        pendingBadge.textContent = 'Sync pending';
        pendingBadge.title = 'Saved offline. Will sync when connection is restored.';
        pendingBadge.style.cssText = `
          font-size: 11px;
          line-height: 1;
          padding: 5px 8px;
          border-radius: 999px;
          border: 1px solid rgba(245, 158, 11, 0.45);
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          font-weight: 700;
          white-space: nowrap;
        `;
        headerRight.appendChild(pendingBadge);
      }

      if (!isMigratedNote) {
        headerRight.appendChild(this.createNoteEditButton(noteData));
      }

      const unpinButton = document.createElement('button');
      unpinButton.title = 'Unpin Note';
      unpinButton.textContent = 'Unpin';
      unpinButton.setAttribute('data-testid', 'unpin-note-button');
      unpinButton.style.cssText = `
        background: rgba(251,191,36,0.24);
        border: 1px solid rgba(251,191,36,0.5);
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        color: var(--text);
        font-size: 12px;
        transition: background 0.2s ease;
      `;
      unpinButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await persistNotePinnedState(noteData, false);
        } catch (error) {
          alert(`Failed to unpin note: ${error.message}`);
        }
      });
      headerRight.appendChild(unpinButton);

      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.style.cssText = `
        padding: 16px;
        display: block;
        background: rgba(255,255,255,0.02);
        max-height: 90vh;
        overflow-y: auto;
      `;
      noteContent.appendChild(this.createNoteContentContainer(noteData, isMigratedNote));

      if (showPinnedActions) {
        noteHeader.appendChild(headerRight);
        noteElement.appendChild(noteHeader);
      }
      noteElement.appendChild(noteContent);
      pinnedList.appendChild(noteElement);
    }

    async revertNoteToPreviousVersion(noteData) {
      try {
        // Only works for IndexedDB notes
        if (!isDbBackedNoteSource(noteData.source)) {
          throw new Error('Version history is only available for notes stored in IndexedDB');
        }
        
        const noteId = noteData.id || noteData.noteId;
        if (!noteId) {
          throw new Error('Note ID not found');
        }
        
        // Force database upgrade if needed by closing and reopening
        try {
          // Close any existing database connections to force upgrade
          const dbName = productConfig.dbName || 'chikas-db';
          const existingDb = await new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
          });
          
          if (existingDb) {
            const hasStore = existingDb.objectStoreNames.contains('noteVersions');
            existingDb.close();
            
            if (!hasStore) {
              // Force upgrade by opening with higher version
              const upgradeReq = indexedDB.open(dbName, 5);
              upgradeReq.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('noteVersions')) {
                  console.log('Creating noteVersions store during forced upgrade...');
                  try {
                    const noteVersionsStore = db.createObjectStore('noteVersions', { keyPath: 'id', autoIncrement: true });
                    noteVersionsStore.createIndex('noteId', 'noteId', { unique: false });
                    noteVersionsStore.createIndex('savedAt', 'savedAt', { unique: false });
                    console.log('noteVersions store created successfully');
                  } catch (createError) {
                    console.error('Failed to create noteVersions store:', createError);
                  }
                }
              };
              await new Promise((resolve, reject) => {
                upgradeReq.onsuccess = () => {
                  upgradeReq.result.close();
                  resolve();
                };
                upgradeReq.onerror = () => reject(upgradeReq.error);
              });
              
              // Wait a moment for upgrade to complete
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (upgradeError) {
          console.warn('Could not force database upgrade:', upgradeError);
        }
        
        // Check if previous version exists
        const previousVersion = await CrmDB.getNotePreviousVersion(noteId);
        if (!previousVersion) {
          throw new Error('No previous version found for this note. The note may not have been edited yet, or try refreshing the page.');
        }
        
        // Restore the note
        await CrmDB.restoreNoteToPreviousVersion(noteId);
        
        // Refresh the notes display
        const customerId = this.getCurrentCustomerId();
        if (customerId) {
          await this.refreshNotesDisplay(customerId);
          alert('Note reverted to previous version successfully!');
        } else {
          alert('Note reverted to previous version successfully! Please refresh the page to see the change.');
        }
        
      } catch (error) {
        console.error('Error reverting note:', error);
        throw error;
      }
    }

    async deleteNote(noteData) {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
      }

      const customerId = this.getCurrentCustomerId();

      try {
        if (productConfig.useSupabase) {
          if (!noteData || noteData.id == null) {
            throw new Error('Cannot delete note: missing note ID');
          }
          try {
            await CrmDB.deleteNote(noteData.id);
            console.log('Note deleted successfully in Supabase mode');
          } catch (error) {
            if (!isOfflineLikeError(error)) throw error;
            removeLocalCustomerNote(customerId, noteData.id);
            enqueueNoteOfflineOp({
              type: 'delete',
              customerId: parseInt(customerId, 10),
              noteId: noteData.id
            });
            console.log('⚠️ Offline: queued note delete for sync when online.');
          }
          await this.refreshNotesList(customerId);
          return;
        }

        // Determine which storage method to use based on the note's source
        if (isDbBackedNoteSource(noteData.source)) {
          // Delete from IndexedDB
          await CrmDB.deleteNote(noteData.id);
          console.log('Note deleted successfully from IndexedDB');
        } else {
          // Delete from localStorage
          const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
          const customerNotes = existingNotes[customerId] || [];

          // Find and remove the note
          const noteIndex = customerNotes.findIndex(note => note.id === noteData.id);
          if (noteIndex !== -1) {
            customerNotes.splice(noteIndex, 1);
            
            // Update localStorage
            existingNotes[customerId] = customerNotes;
            localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
            
            console.log('Note deleted successfully from localStorage');
          } else {
            throw new Error('Note not found in localStorage');
          }
        }
        
        // Refresh the notes list using hybrid loading
        await this.refreshNotesList(customerId);
        
      } catch (error) {
        console.error('Error deleting note:', error);
        alert(`Failed to delete note: ${error.message}`);
      }
    }

    async refreshNotesList(customerId) {
      try {
        // Use hybrid loading to refresh the notes list
        await this.refreshNotesDisplay(customerId);
      } catch (error) {
        console.error('Error refreshing notes list:', error);
        
        // Fallback to basic refresh
        const notesList = document.querySelector('.notes-list');
        if (notesList) {
          notesList.innerHTML = '';
        }
      }
    }

    editNote(noteData) {
      
      // Store the note being edited
      this.editingNote = noteData;
      
      // Parse the SVG to extract stroke data
      this.loadNoteFromSVG(noteData.svg);
      
      // Show the fullscreen canvas
      this.show();
      
      // Update the header to show we're editing
      const headerTitle = document.querySelector('#fullscreen-notes-overlay .header h2');
      if (headerTitle) {
        headerTitle.textContent = `Edit Note ${noteData.noteNumber}`;
      }
    }

    loadNoteFromSVG(svgString) {
      try {
        // Parse the SVG string
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        
        // Check if this is an image-based SVG (from eraser strokes)
        const image = svgDoc.querySelector('image');
        if (image) {
          this.isEditingImageBasedNote = true;
          // Handle image-based SVG
          const imageData = image.getAttribute('href');
          if (imageData) {
            // Clear existing strokes
            this.strokes = [];
            this.currentStroke = { points: [], color: this.strokeColor, width: this.strokeWidth };
            
            // Create a temporary image to load the data
            const tempImg = new Image();
            tempImg.onload = () => {
              // Draw the image onto the canvas
              this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
              this.ctx.drawImage(tempImg, 0, 0);
            };
            tempImg.src = imageData;
          }
          return;
        }

        this.isEditingImageBasedNote = false;
        
        // Handle vector-based SVG
        const paths = svgDoc.querySelectorAll('path');
        
        // Clear existing strokes
        this.strokes = [];
        this.currentStroke = { points: [], color: this.strokeColor, width: this.strokeWidth };
        
        // Convert SVG paths back to stroke data
        paths.forEach(path => {
          const pathData = path.getAttribute('d');
          const stroke = path.getAttribute('stroke');
          const strokeWidth = parseFloat(path.getAttribute('stroke-width'));
          
          if (pathData && stroke && strokeWidth) {
            // Parse the path data to extract points
            const points = this.parsePathData(pathData);
            if (points.length > 0) {
              this.strokes.push({
                points: points,
                color: stroke,
                width: strokeWidth
              });
            }
          }
        });
        
        // Redraw the strokes
        this.redrawStrokes();
        
      } catch (error) {
        console.error('Error loading note from SVG:', error);
      }
    }

    parsePathData(pathData) {
      // Simple path parser for basic drawing paths
      const points = [];
      const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];
      
      let currentX = 0;
      let currentY = 0;
      
      commands.forEach(command => {
        const type = command[0];
        const coords = command.slice(1).trim().split(/[\s,]+/).filter(c => c).map(Number);
        
        if (type === 'M' || type === 'm') {
          // Move to
          if (coords.length >= 2) {
            currentX = type === 'm' ? currentX + coords[0] : coords[0];
            currentY = type === 'm' ? currentY + coords[1] : coords[1];
            points.push({ x: currentX, y: currentY });
          }
        } else if (type === 'L' || type === 'l') {
          // Line to
          if (coords.length >= 2) {
            currentX = type === 'l' ? currentX + coords[0] : coords[0];
            currentY = type === 'l' ? currentY + coords[1] : coords[1];
            points.push({ x: currentX, y: currentY });
          }
        }
      });
      
      return points;
    }

    hide() {
      if (this.overlay) {
        document.body.removeChild(this.overlay);
        this.overlay = null;
      }
      this.clear();
      
      // Reset editing state
      this.editingNote = null;
      this.isEditingImageBasedNote = false;
    }
  }

  // ============================================================================
  // TEXT-BASED NOTES OVERLAY (Primary note-taking method)
  // ============================================================================
  class FullscreenTextNotesOverlay {
    constructor() {
      this.overlay = null;
      this.textarea = null;
      this.editingNote = null;
      this.customerId = null;
      this.onSaveCallback = null;
      this.pinCheckbox = null;
      this.pinStatus = null;
    }

    show(customerId = null, editingNote = null) {
      this.customerId = customerId || getCurrentCustomerId();
      this.editingNote = editingNote;
      this.createOverlay();
      
      // Focus the textarea after a brief delay to ensure DOM is ready
      setTimeout(() => {
        if (this.textarea) {
          this.textarea.focus();
          // Scroll to end if editing
          if (this.editingNote && getNoteTextValue(this.editingNote)) {
            this.textarea.setSelectionRange(this.textarea.value.length, this.textarea.value.length);
          }
        }
      }, 100);
    }

    createOverlay() {
      this.overlay = document.createElement('div');
      this.overlay.id = 'fullscreen-text-notes-overlay';
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(17, 24, 39, 0.98);
        z-index: 10010;
        display: flex;
        flex-direction: column;
        padding: 20px;
        padding-bottom: env(safe-area-inset-bottom, 20px);
      `;
      
      // Header
      const header = document.createElement('div');
      header.className = 'header';
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        flex-shrink: 0;
      `;
      
      const title = document.createElement('h2');
      title.textContent = this.editingNote ? `Edit Note ${this.editingNote.noteNumber || ''}` : 'Add Note';
      title.style.margin = '0';
      title.style.color = 'var(--text)';
      
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end;';

      const pinWrap = document.createElement('label');
      pinWrap.style.cssText = 'display:flex; align-items:center; gap:8px; color:var(--text); font-size:14px; cursor:pointer; user-select:none;';
      this.pinCheckbox = document.createElement('input');
      this.pinCheckbox.type = 'checkbox';
      this.pinCheckbox.setAttribute('data-testid', 'note-pin-checkbox');
      this.pinCheckbox.style.cssText = 'width:16px; height:16px; cursor:pointer;';
      const pinText = document.createElement('span');
      pinText.textContent = 'Pin to profile';
      this.pinStatus = document.createElement('span');
      this.pinStatus.style.cssText = 'color:var(--muted); font-size:12px;';
      pinWrap.appendChild(this.pinCheckbox);
      pinWrap.appendChild(pinText);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.setAttribute('data-testid', 'cancel-note-button');
      cancelBtn.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: none;
        color: var(--text);
        border-radius: 6px;
        padding: 10px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
      `;
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.setAttribute('data-testid', 'save-note-button');
      saveBtn.style.cssText = `
        background: var(--brand);
        border: none;
        color: white;
        border-radius: 6px;
        padding: 10px 20px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      `;

      buttonContainer.appendChild(pinWrap);
      buttonContainer.appendChild(this.pinStatus);
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(saveBtn);
      header.appendChild(title);
      header.appendChild(buttonContainer);

      // Textarea container
      const textareaContainer = document.createElement('div');
      textareaContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      `;

      this.textarea = document.createElement('textarea');
      this.textarea.placeholder = 'Type your note here...';
      this.textarea.setAttribute('data-testid', 'note-textarea');
      this.textarea.style.cssText = `
        flex: 1;
        width: 100%;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 16px;
        color: var(--text);
        font-size: 16px;
        line-height: 1.6;
        resize: none;
        font-family: inherit;
        outline: none;
      `;
      this.textarea.addEventListener('focus', () => {
        this.textarea.style.borderColor = 'var(--brand)';
      });
      this.textarea.addEventListener('blur', () => {
        this.textarea.style.borderColor = 'rgba(255,255,255,0.1)';
      });

      // Pre-fill if editing
      if (this.editingNote) {
        // Handle both text-based notes and legacy SVG notes
        const existingText = getNoteTextValue(this.editingNote);
        if (existingText) {
          this.textarea.value = existingText;
        } else if (this.editingNote.svg) {
          // Try to extract text from SVG (for legacy notes)
          const textContent = this.extractTextFromSVG(this.editingNote.svg);
          this.textarea.value = textContent || '[This note contains handwritten content that cannot be edited as text]';
        }
      }

      textareaContainer.appendChild(this.textarea);

      this.overlay.appendChild(header);
      this.overlay.appendChild(textareaContainer);

      // Event listeners
      cancelBtn.addEventListener('click', () => this.hide());
      saveBtn.addEventListener('click', () => this.handleSave());
      
      // Handle keyboard shortcuts
      this.textarea.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to save
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          this.handleSave();
        }
        // Escape to cancel
        if (e.key === 'Escape') {
          e.preventDefault();
          this.hide();
        }
      });

      document.body.appendChild(this.overlay);
      configurePinCheckbox(this.pinCheckbox, this.pinStatus, this.customerId, this.editingNote);
    }

    extractTextFromSVG(svgString) {
      // Try to extract text content from SVG text elements
      try {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        const textElements = svgDoc.querySelectorAll('text');
        if (textElements.length > 0) {
          return Array.from(textElements).map(el => el.textContent).join('\n');
        }
      } catch (e) {
        console.warn('Could not extract text from SVG:', e);
      }
      return null;
    }

    async handleSave() {
      const text = this.textarea.value.trim();
      
      if (!text) {
        // Don't save empty notes
        this.hide();
        return;
      }

      try {
        const customerId = this.customerId;
        const now = new Date();
        const dateStr = formatDateYYYYMMDD(now);
        const requestedPinned = getPinCheckboxValue(this.pinCheckbox, this.editingNote);
        if (requestedPinned && !isNotePinned(this.editingNote)) {
          const pinnedCount = await getPinnedNotesCount(customerId, this.editingNote);
          if (pinnedCount >= PINNED_NOTES_LIMIT) {
            throw new Error(`Only ${PINNED_NOTES_LIMIT} notes can be pinned to a customer profile`);
          }
        }
        
        if (this.editingNote) {
          await this.updateNote(text);
        } else {
          await this.createNote(customerId, text, dateStr);
        }
        
        await loadExistingNotes(customerId);
        this.hide();
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Error saving note: ' + error.message);
      }
    }

    async createNote(customerId, text, dateStr) {
      const existingNotesList = await this.getNotesForCustomer(customerId);
      const noteNumber = existingNotesList.length + 1;
      const serializedSvg = serializeTextNoteToSvg(text);
      
      const noteData = {
        customerId: customerId,
        text: text,
        textValue: text,
        svg: serializedSvg,
        date: dateStr,
        noteNumber: noteNumber,
        isPinned: getPinCheckboxValue(this.pinCheckbox),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'text',
        noteType: 'text'
      };
      
      // New customer flow: queue in localStorage until customer is saved
      if (customerId === 'temp-new-customer') {
        const tempId = 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
        noteData.id = tempId;
        noteData.source = 'localStorage';
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        const tempNotes = existingNotes['temp-new-customer'] || [];
        tempNotes.push(noteData);
        existingNotes['temp-new-customer'] = tempNotes;
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
        return tempId;
      }
      
      try {
        const savedId = await CrmDB.createNote(noteData);
        return savedId;
      } catch (error) {
        if (!productConfig.useSupabase || !isOfflineLikeError(error)) throw error;
        const localId = noteData.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const queuedLocal = {
          ...noteData,
          id: localId,
          source: 'localStorage',
          queuedSync: true,
          queuedOpType: 'create'
        };
        upsertLocalCustomerNote(customerId, queuedLocal);
        const dbInput = buildDbNoteInputFromAnyNote(queuedLocal, customerId);
        if (dbInput) {
          enqueueNoteOfflineOp({
            type: 'create',
            customerId: parseInt(customerId, 10),
            localId: localId,
            note: dbInput
          });
        }
        console.log('⚠️ Offline: queued text note create for sync when online.');
        return localId;
      }
    }

    async updateNote(text) {
      if (!this.editingNote) return;
      const serializedSvg = serializeTextNoteToSvg(text);
      
      const updatedNote = {
        ...this.editingNote,
        text: text,
        textValue: text,
        svg: serializedSvg,
        isPinned: getPinCheckboxValue(this.pinCheckbox, this.editingNote),
        editedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'text',
        noteType: 'text'
      };
      
      // Temp-new-customer: update in localStorage queue
      if (this.customerId === 'temp-new-customer') {
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        const tempNotes = existingNotes['temp-new-customer'] || [];
        const idx = tempNotes.findIndex(n => (n.id === this.editingNote.id) || (n.id === this.editingNote.originalId));
        if (idx !== -1) {
          tempNotes[idx] = { ...tempNotes[idx], ...updatedNote };
          existingNotes['temp-new-customer'] = tempNotes;
          localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
        }
        return;
      }
      
      const editingNoteId = this.editingNote.id != null ? String(this.editingNote.id) : '';
      const notesForCustomer = await this.getNotesForCustomer(this.customerId);
      const matchedExistingNote = notesForCustomer.find((n) => String(n?.id) === editingNoteId);
      const effectiveSource = String(this.editingNote.source || matchedExistingNote?.source || '');

      if (editingNoteId && isDbBackedNoteSource(effectiveSource)) {
        try {
          await CrmDB.updateNote(updatedNote);
        } catch (error) {
          if (!productConfig.useSupabase || !isOfflineLikeError(error)) throw error;
          const queuedLocal = {
            ...updatedNote,
            source: 'localStorage',
            queuedSync: true,
            queuedOpType: 'update'
          };
          upsertLocalCustomerNote(this.customerId, queuedLocal);
          const dbInput = buildDbNoteInputFromAnyNote(queuedLocal, this.customerId);
          if (dbInput) {
            enqueueNoteOfflineOp({
              type: 'update',
              customerId: parseInt(this.customerId, 10),
              noteId: editingNoteId,
              note: { ...dbInput, id: editingNoteId }
            });
          }
          console.log('⚠️ Offline: queued text note update for sync when online.');
        }
        return;
      }

      if (editingNoteId) {
        if (productConfig.useSupabase && !this.editingNote?.queuedSync) {
          throw new Error('Supabase mode requires DB-backed note updates. Refresh and retry.');
        }
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        const customerNotes = existingNotes[String(this.customerId)] || [];
        const idx = customerNotes.findIndex((n) => String(n?.id) === editingNoteId);
        if (idx !== -1) {
          customerNotes[idx] = { ...customerNotes[idx], ...updatedNote };
          existingNotes[String(this.customerId)] = customerNotes;
          localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
          if (productConfig.useSupabase && this.editingNote?.queuedSync) {
            const dbInput = buildDbNoteInputFromAnyNote(customerNotes[idx], this.customerId);
            if (dbInput) {
              enqueueNoteOfflineOp({
                type: 'update',
                customerId: parseInt(this.customerId, 10),
                noteId: editingNoteId,
                note: { ...dbInput, id: editingNoteId }
              });
            }
          }
          return;
        }
      }

      throw new Error('Cannot update note: existing note metadata is missing. Refresh the page and try editing again.');
    }

    async getNotesForCustomer(customerId) {
      // Temp notes (new customer flow): queue in localStorage until customer is saved
      if (customerId === 'temp-new-customer') {
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        return existingNotes['temp-new-customer'] || [];
      }
      try {
        const dbNotes = await CrmDB.getNotesByCustomerId(customerId);
        return dbNotes || [];
      } catch (error) {
        console.error('Error getting notes:', error);
        return [];
      }
    }

    hide() {
      if (this.overlay && document.body.contains(this.overlay)) {
        document.body.removeChild(this.overlay);
        this.overlay = null;
      }
      this.textarea = null;
      this.editingNote = null;
      this.customerId = null;
      this.pinCheckbox = null;
      this.pinStatus = null;
    }
  }

  // Global instances
  // Initialize fullscreen notes canvas (kept for legacy SVG note viewing)
  const fullscreenNotesCanvas = new FullscreenNotesCanvas();
  
  // Initialize text-based notes overlay (primary note-taking method)
  const textNotesOverlay = new FullscreenTextNotesOverlay();

  // Debug utility for testing save functionality
  window.debugNoteSave = {
    testSave: () => {
      console.log('=== Testing Note Save Functionality ===');
      
      // Check if canvas exists
      const canvas = fullscreenNotesCanvas;
      if (!canvas) {
        console.error('❌ FullscreenNotesCanvas not found');
        return;
      }
      
      console.log('✅ FullscreenNotesCanvas found');
      
      // Check customer ID detection
      const customerId = canvas.getCurrentCustomerId();
      console.log(`Customer ID: ${customerId}`);
      
      if (customerId === 'default') {
        console.warn('⚠️ Using default customer ID - this may cause save issues');
      } else {
        console.log('✅ Valid customer ID detected');
      }
      
      // Check localStorage availability
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        console.log('✅ LocalStorage is available');
      } catch (e) {
        console.error('❌ LocalStorage is not available:', e);
      }
      
      // Check if there are strokes to save
      if (canvas.strokes && canvas.strokes.length > 0) {
        console.log(`✅ Found ${canvas.strokes.length} strokes to save`);
        
        // Test SVG generation
        try {
          const svgData = canvas.canvasToSVG();
          if (svgData && svgData.trim().length > 0) {
            console.log('✅ SVG generation successful');
            console.log(`SVG length: ${svgData.length} characters`);
          } else {
            console.error('❌ SVG generation failed - empty result');
          }
        } catch (error) {
          console.error('❌ SVG generation failed:', error);
        }
      } else {
        console.warn('⚠️ No strokes found - nothing to save');
      }
      
      // Check for existing notes
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const customerNotes = existingNotes[customerId] || [];
      console.log(`Existing notes for customer: ${customerNotes.length}`);
      
      console.log('=== End Test ===');
    },
    
    simulateSave: async () => {
      console.log('=== Simulating Save Operation ===');
      
      const canvas = fullscreenNotesCanvas;
      if (!canvas || !canvas.strokes || canvas.strokes.length === 0) {
        console.error('❌ No canvas or strokes available for simulation');
        return;
      }
      
      try {
        await canvas.saveNote();
        console.log('✅ Save simulation completed successfully');
      } catch (error) {
        console.error('❌ Save simulation failed:', error);
      }
    },
    
    checkDialog: () => {
      const dialogs = document.querySelectorAll('.save-note-prompt');
      console.log(`Found ${dialogs.length} save dialogs on page`);
      
      if (dialogs.length > 1) {
        console.warn('⚠️ Multiple save dialogs detected - this could cause issues');
      }
      
      return dialogs.length;
    },
    
    clearDialogs: () => {
      const dialogs = document.querySelectorAll('.save-note-prompt');
      dialogs.forEach(dialog => {
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
        }
      });
      console.log(`Cleared ${dialogs.length} save dialogs`);
    },
    
    // Test the error popup system
    testErrorPopup: () => {
      const testError = new Error('This is a test error to verify the popup system works on iPad');
      fullscreenNotesCanvas.showErrorPopup(testError, 'Test Error');
    },
    
    // Force an error to test error handling
    forceError: async () => {
      console.log('Forcing an error to test error handling...');
      try {
        // Temporarily break localStorage to simulate an error
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = () => {
          throw new Error('Simulated localStorage error for testing');
        };
        
        await fullscreenNotesCanvas.saveNote();
        
        // Restore localStorage
        localStorage.setItem = originalSetItem;
      } catch (error) {
        // Restore localStorage in case of any issues
        if (localStorage.setItem.toString().includes('Simulated')) {
          localStorage.setItem = Storage.prototype.setItem;
        }
        console.log('Error successfully caught and displayed');
      }
    },
    
    // Check storage usage
    checkStorage: () => {
      const storageInfo = fullscreenNotesCanvas.getStorageInfo();
      console.log('=== Storage Information ===');
      console.log(`Total Usage: ${storageInfo.totalSizeMB}MB (${storageInfo.usagePercentage}%)`);
      console.log(`Items: ${storageInfo.itemCount}`);
      console.log(`Near Limit: ${storageInfo.isNearLimit ? 'YES ⚠️' : 'NO ✅'}`);
      
      if (storageInfo.largestItems && storageInfo.largestItems.length > 0) {
        console.log('\nLargest items:');
        storageInfo.largestItems.forEach((item, index) => {
          const sizeMB = (item.size / (1024 * 1024)).toFixed(2);
          console.log(`${index + 1}. ${item.key}: ${sizeMB}MB`);
        });
      }
      
      return storageInfo;
    },
    
    // Clean up storage
    cleanStorage: async () => {
      console.log('=== Starting Storage Cleanup ===');
      const freedSpace = await fullscreenNotesCanvas.cleanupOldData();
      const storageInfo = fullscreenNotesCanvas.getStorageInfo();
      console.log(`Cleanup completed. Storage now: ${storageInfo.totalSizeMB}MB (${storageInfo.usagePercentage}%)`);
      return { freedSpace, newStorageInfo: storageInfo };
    },
    
    // Aggressive cleanup
    aggressiveClean: async () => {
      console.log('=== Starting Aggressive Cleanup ===');
      await fullscreenNotesCanvas.aggressiveCleanup();
      const storageInfo = fullscreenNotesCanvas.getStorageInfo();
      console.log(`Aggressive cleanup completed. Storage now: ${storageInfo.totalSizeMB}MB (${storageInfo.usagePercentage}%)`);
      return storageInfo;
    },
    
    // Test hybrid storage system
    testHybridSave: async () => {
      console.log('=== Testing Hybrid Storage System ===');
      
      const canvas = fullscreenNotesCanvas;
      const customerId = canvas.getCurrentCustomerId();
      
      if (!customerId || customerId === 'default') {
        console.error('❌ Cannot test - no valid customer ID');
        return;
      }
      
      // Create test note data
      const testNote = {
        id: Date.now(),
        svg: '<svg><text>Test Note</text></svg>',
        date: formatDateYYYYMMDD(new Date()),
        noteNumber: 999
      };
      
      try {
        const result = await canvas.saveNoteHybrid(testNote, customerId);
        console.log(`✅ Hybrid save test successful using ${result.method}`);
        
        // Test loading
        const loadedNotes = await canvas.loadNotesHybrid(customerId);
        console.log(`✅ Loaded ${loadedNotes.length} notes from hybrid storage`);
        
        return { saveResult: result, loadedCount: loadedNotes.length };
        
      } catch (error) {
        console.error('❌ Hybrid save test failed:', error);
        return { error: error.message };
      }
    },
    
    // Show storage method breakdown
    showStorageMethods: async () => {
      const canvas = fullscreenNotesCanvas;
      const customerId = canvas.getCurrentCustomerId();
      
      if (!customerId || customerId === 'default') {
        console.error('❌ Cannot show storage methods - no valid customer ID');
        return;
      }
      
      try {
        const allNotes = await canvas.loadNotesHybrid(customerId);
        
        const breakdown = allNotes.reduce((acc, note) => {
          const method = note.source || 'unknown';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {});
        
        console.log('=== Storage Method Breakdown ===');
        Object.entries(breakdown).forEach(([method, count]) => {
          console.log(`${method}: ${count} notes`);
        });
        
        return breakdown;
        
      } catch (error) {
        console.error('Error showing storage methods:', error);
        return { error: error.message };
      }
    },
    
    // Check IndexedDB readiness
    checkDatabase: async () => {
      console.log('=== Checking IndexedDB Status ===');
      
      const canvas = fullscreenNotesCanvas;
      const dbStatus = await canvas.checkIndexedDBReady();
      
      console.log(`Database Ready: ${dbStatus.ready ? '✅ YES' : '❌ NO'}`);
      if (!dbStatus.ready) {
        console.log(`Error: ${dbStatus.error}`);
      }
      
      // Also check if CrmDB is available
      console.log(`CrmDB Available: ${window.CrmDB ? '✅ YES' : '❌ NO'}`);
      
      if (window.CrmDB) {
        // List available functions
        const functions = Object.keys(window.CrmDB);
        console.log(`Available functions: ${functions.join(', ')}`);
      }
      
      return dbStatus;
    },
    
    // Test editing functionality
    testEdit: async () => {
      console.log('=== Testing Note Editing ===');
      
      const canvas = fullscreenNotesCanvas;
      const customerId = canvas.getCurrentCustomerId();
      
      if (!customerId || customerId === 'default') {
        console.error('❌ Cannot test - no valid customer ID');
        return;
      }
      
      try {
        // Load all notes
        const allNotes = await canvas.loadNotesHybrid(customerId);
        console.log(`Found ${allNotes.length} notes`);
        
        if (allNotes.length === 0) {
          console.log('ℹ️ No notes to test editing with');
          return;
        }
        
        // Test with the first note
        const testNote = allNotes[0];
        console.log(`Testing edit on note ID: ${testNote.id}, Source: ${testNote.source}`);
        
        // Simulate editing
        canvas.editingNote = testNote;
        console.log('✅ Set editing note successfully');
        
        // Show which storage method would be used
        if (testNote.source === 'indexeddb-fallback' || testNote.source === 'indexeddb') {
          console.log('✅ Would use IndexedDB for editing');
        } else {
          console.log('✅ Would use localStorage for editing');
        }
        
        return { noteId: testNote.id, source: testNote.source, editingSet: true };
        
      } catch (error) {
        console.error('❌ Edit test failed:', error);
        return { error: error.message };
      }
    },
    
    // Debug note numbering issues
    debugNoteNumbers: async () => {
      console.log('=== Debugging Note Numbers ===');
      
      const canvas = fullscreenNotesCanvas;
      const customerId = canvas.getCurrentCustomerId();
      
      if (!customerId || customerId === 'default') {
        console.error('❌ Cannot debug - no valid customer ID');
        return;
      }
      
      try {
        // Check localStorage notes
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        const localStorageNotes = existingNotes[customerId] || [];
        
        console.log(`📦 LocalStorage notes (${localStorageNotes.length}):`);
        localStorageNotes.forEach((note, index) => {
          console.log(`  ${index + 1}. ID: ${note.id}, Note #: ${note.noteNumber}, Source: ${note.source || 'localStorage'}`);
        });
        
        // Check IndexedDB notes
        const indexedDBNotes = await CrmDB.getNotesByCustomerId(customerId);
        
        console.log(`🗄️ IndexedDB notes (${indexedDBNotes.length}):`);
        indexedDBNotes.forEach((note, index) => {
          console.log(`  ${index + 1}. ID: ${note.id}, Note #: ${note.noteNumber}, Source: ${note.source || 'indexeddb'}`);
        });
        
        // Check hybrid loading
        const allNotes = await canvas.loadNotesHybrid(customerId);
        
        console.log(`🔄 Hybrid loaded notes (${allNotes.length}):`);
        allNotes.forEach((note, index) => {
          console.log(`  ${index + 1}. ID: ${note.id}, Note #: ${note.noteNumber}, Source: ${note.source}`);
        });
        
        // Check for duplicates or numbering issues
        const noteNumbers = allNotes.map(note => note.noteNumber);
        const duplicateNumbers = noteNumbers.filter((num, index) => noteNumbers.indexOf(num) !== index);
        
        if (duplicateNumbers.length > 0) {
          console.warn(`⚠️ Duplicate note numbers found: ${duplicateNumbers.join(', ')}`);
        } else {
          console.log('✅ No duplicate note numbers found');
        }
        
        return {
          localStorage: localStorageNotes.length,
          indexedDB: indexedDBNotes.length,
          hybrid: allNotes.length,
          duplicates: duplicateNumbers
        };
        
      } catch (error) {
        console.error('❌ Debug failed:', error);
        return { error: error.message };
      }
    },

    // Regression test: editing an SVG note must update in place (same ID, no extra row)
    verifySvgEditUpdatesInPlace: async () => {
      console.log('=== Verify SVG Edit Updates In Place ===');
      const customerId = getCurrentCustomerId();
      if (!customerId || customerId === 'default' || customerId === 'temp-new-customer') {
        console.error('❌ Open a real customer page first (with ?id=...)');
        return { ok: false, error: 'invalid-customer-context' };
      }

      const cid = parseInt(customerId, 10);
      if (Number.isNaN(cid)) {
        console.error('❌ Invalid customer ID:', customerId);
        return { ok: false, error: 'invalid-customer-id' };
      }

      const marker = `debug-svg-edit-${Date.now()}`;
      const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120" viewBox="0 0 420 120"><text x="10" y="40" fill="#fff" font-size="20">${marker}</text></svg>`;
      const editedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="120" viewBox="0 0 420 120"><text x="10" y="40" fill="#fff" font-size="20">${marker}-edited</text></svg>`;

      let createdId = null;
      try {
        const before = await CrmDB.getNotesByCustomerId(cid);
        const beforeCount = before.length;

        createdId = await CrmDB.createNote({
          customerId: cid,
          svg: baseSvg,
          date: formatDateYYYYMMDD(new Date()),
          noteNumber: beforeCount + 1,
          createdAt: new Date().toISOString()
        });

        await CrmDB.updateNote({
          id: createdId,
          customerId: cid,
          svg: editedSvg,
          editedDate: new Date().toISOString()
        });

        const after = await CrmDB.getNotesByCustomerId(cid);
        const afterCount = after.length;
        const updated = after.find((n) => String(n.id) === String(createdId));

        const sameCount = afterCount === beforeCount + 1;
        const sameIdExists = !!updated;
        const svgUpdated = !!(updated && typeof updated.svg === 'string' && updated.svg.indexOf(`${marker}-edited`) !== -1);

        const ok = sameCount && sameIdExists && svgUpdated;
        if (ok) {
          console.log('✅ PASS: SVG edit updated existing row in place.');
        } else {
          console.error('❌ FAIL:', { sameCount, sameIdExists, svgUpdated, beforeCount, afterCount, createdId });
        }

        return {
          ok,
          beforeCount,
          afterCount,
          createdId,
          sameCount,
          sameIdExists,
          svgUpdated
        };
      } catch (error) {
        console.error('❌ verifySvgEditUpdatesInPlace failed:', error);
        return { ok: false, error: error.message || String(error), createdId };
      } finally {
        if (createdId != null) {
          try {
            await CrmDB.deleteNote(createdId);
            console.log('🧹 Cleaned up test note:', createdId);
          } catch (cleanupError) {
            console.warn('Cleanup failed for test note', createdId, cleanupError);
          }
        }
      }
    }
  };

  // Global debugging flag
  window.debugNoteCanvas = false;

  // Helper function to toggle debug mode
  window.toggleNoteDebug = () => {
    window.debugNoteCanvas = !window.debugNoteCanvas;
    console.log(`Note canvas debugging ${window.debugNoteCanvas ? 'enabled' : 'disabled'}`);
  };

  // NOTE_CONTRACT_GUARDRAIL: first-pass integration safety harness.
  // Run from console in an opened customer context:
  //   await window.noteContractSmoke.run()
  window.noteContractSmoke = {
    run: async () => {
      const report = {
        ok: false,
        steps: [],
        errors: []
      };
      const pushStep = (name, ok, details = '') => {
        report.steps.push({ name, ok, details });
      };

      try {
        const queryId = new URLSearchParams(window.location.search).get('id');
        const cidRaw = (typeof getCurrentCustomerId === 'function' ? getCurrentCustomerId() : null) || queryId;
        const customerId = parseInt(cidRaw, 10);
        if (Number.isNaN(customerId) || customerId <= 0) {
          throw new Error('Open a real customer context first (valid ?id=...).');
        }

        const marker = `note-contract-${Date.now()}`;
        const textPayload = `${marker}-text`;
        const svgPayload = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64"><text x="8" y="36">${marker}-svg</text></svg>`;

        const noteId = await CrmDB.createNote({
          customerId,
          noteType: 'text',
          text: textPayload,
          date: formatDateYYYYMMDD(new Date()),
          noteNumber: 9999
        });
        pushStep('create text note', true, `noteId=${noteId}`);

        await CrmDB.updateNote({
          id: noteId,
          customerId,
          noteType: 'svg',
          svg: svgPayload,
          editedDate: new Date().toISOString()
        });
        pushStep('update text->svg', true);

        const previous = await CrmDB.getNotePreviousVersion(noteId);
        if (!previous) {
          throw new Error('No previous version found after update.');
        }
        pushStep('version snapshot exists', true);

        await CrmDB.restoreNoteToPreviousVersion(noteId);
        pushStep('restore previous version', true);

        const notes = await CrmDB.getNotesByCustomerId(customerId);
        const restored = notes.find((n) => String(n.id) === String(noteId));
        const restoredText = restored ? (restored.text ?? restored.textValue ?? restored.content ?? '') : '';
        if (!restored || String(restoredText).indexOf(textPayload) === -1) {
          throw new Error('Restore validation failed: expected text payload after restore.');
        }
        pushStep('post-restore payload check', true);

        await CrmDB.deleteNote(noteId);
        pushStep('cleanup delete', true);

        report.ok = true;
        return report;
      } catch (err) {
        report.errors.push(err && err.message ? err.message : String(err));
        report.steps.forEach((s) => { if (s.ok !== true) s.ok = false; });
        return report;
      }
    }
  };

  // Function to retroactively mark migrated notes with the isMigrated flag
  function markExistingMigratedNotes() {
    if (window.NoteMigrationRuntime && typeof window.NoteMigrationRuntime.markExistingMigratedNotes === 'function') {
      window.NoteMigrationRuntime.markExistingMigratedNotes({ storageKey: 'customerNotes' });
    }
  }

  // Run the migration marking on page load
  markExistingMigratedNotes();

  // Migration function to convert old notesHtml to new SVG notes system
  async function migrateOldNotes() {
    if (window.NoteMigrationRuntime && typeof window.NoteMigrationRuntime.migrateOldNotes === 'function') {
      await window.NoteMigrationRuntime.migrateOldNotes({
        CrmDB,
        formatDateYYYYMMDD,
        storageKey: 'customerNotes'
      });
    }
  }

  // Convert old HTML notes to SVG format
  function convertHtmlNotesToSVG(htmlContent) {
    if (window.NoteMigrationRuntime && typeof window.NoteMigrationRuntime.convertHtmlNotesToSVG === 'function') {
      return window.NoteMigrationRuntime.convertHtmlNotesToSVG(htmlContent);
    }
    return '';
  }

  // Load existing notes for a customer
  async function loadExistingNotes(customerId) {
    if (window.NoteMigrationRuntime && typeof window.NoteMigrationRuntime.loadExistingNotes === 'function') {
      await window.NoteMigrationRuntime.loadExistingNotes(customerId, {
        fullscreenNotesCanvas,
        storageKey: 'customerNotes'
      });
    }
  }

  function clearTempNewCustomerDraft() {
    try {
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      if (existingNotes['temp-new-customer']) {
        delete existingNotes['temp-new-customer'];
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
      }
    } catch (error) {
      console.warn('Failed clearing temp-new-customer notes draft:', error);
    }

    try {
      if (fullscreenNotesCanvas && typeof fullscreenNotesCanvas.clear === 'function') {
        fullscreenNotesCanvas.clear();
      }
    } catch (error) {
      // Non-blocking cleanup
    }
  }

  // Handwriting canvas functionality
  class HandwritingCanvas {
    constructor(containerId, options = {}) {
      this.container = document.querySelector(containerId);
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.strokes = [];
      this.currentStroke = [];
      
      // Set up canvas
      this.setupCanvas(options);
      this.setupEventListeners();
    }

    setupCanvas(options = {}) {
      const { width = 800, height = 500, lineWidth = 2, strokeColor = '#ffffff' } = options;
      
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.border = '1px solid rgba(255,255,255,0.2)';
      this.canvas.style.borderRadius = '4px';
      this.canvas.style.cursor = 'crosshair';
      this.canvas.style.backgroundColor = 'rgba(255,255,255,0.03)';
      
      this.ctx.lineWidth = lineWidth;
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.container.appendChild(this.canvas);
    }

    setupEventListeners() {
      // Mouse events
      this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
      this.canvas.addEventListener('mousemove', this.draw.bind(this));
      this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
      this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

      // Touch events for mobile
      this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
      this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }

    handleTouch(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                       e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }

    startDrawing(e) {
      this.isDrawing = true;
      this.currentStroke = [];
      const rect = this.canvas.getBoundingClientRect();
      this.lastX = e.clientX - rect.left;
      this.lastY = e.clientY - rect.top;
      this.currentStroke.push({ x: this.lastX, y: this.lastY });
    }

    draw(e) {
      if (!this.isDrawing) return;

      const rect = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(currentX, currentY);
      this.ctx.stroke();

      this.currentStroke.push({ x: currentX, y: currentY });
      this.lastX = currentX;
      this.lastY = currentY;
    }

    stopDrawing() {
      if (this.isDrawing) {
        this.isDrawing = false;
        if (this.currentStroke.length > 0) {
          this.strokes.push([...this.currentStroke]);
        }
      }
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.strokes = [];
    }

    getImageData() {
      return this.canvas.toDataURL('image/png');
    }

    getSVG() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', this.canvas.width);
      svg.setAttribute('height', this.canvas.height);
      svg.setAttribute('viewBox', `0 0 ${this.canvas.width} ${this.canvas.height}`);

      this.strokes.forEach(stroke => {
        if (stroke.length < 2) return;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        let pathData = `M ${stroke[0].x} ${stroke[0].y}`;
        
        for (let i = 1; i < stroke.length; i++) {
          pathData += ` L ${stroke[i].x} ${stroke[i].y}`;
        }
        
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        
        svg.appendChild(path);
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      return svgString;
    }

    resizeToLineHeight(targetHeight = handwritingSettings.lineHeight) {
      const currentHeight = this.canvas.height;
      const scale = targetHeight / currentHeight;
      const newWidth = Math.round(this.canvas.width * scale);
      const newHeight = targetHeight;

      // Create a new canvas with the target size
      const resizedCanvas = document.createElement('canvas');
      const resizedCtx = resizedCanvas.getContext('2d');
      resizedCanvas.width = newWidth;
      resizedCanvas.height = newHeight;

      // Draw the original canvas scaled to the new size
      resizedCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);

      return resizedCanvas;
    }
  }


})();

