const { expect } = require('@playwright/test');

class AppActor {
  constructor(page) {
    this.page = page;
    this.consoleErrors = [];
    this.pageErrors = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        this.consoleErrors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      this.pageErrors.push(error.stack || error.message);
    });
  }

  async forceLocalIndexedDbMode() {
    await this.page.route('**/js/config.local.js*', async (route) => {
      await route.fulfill({
        contentType: 'application/javascript',
        body: `
          window.SUPABASE_URL = '';
          window.SUPABASE_ANON_KEY = '';
          window.USE_SUPABASE = false;
          window.REQUIRE_LOGIN = false;
          window.ACTIVE_PRODUCT = 'hairdresser';
          window.ADDRESS_LOOKUP_ENABLED = false;
        `
      });
    });
  }

  async clearBrowserAppState() {
    await this.page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('noteInputMode', 'text');

      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      }

      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((database) => database.name)
            .filter(Boolean)
            .map((name) => new Promise((resolve, reject) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
              request.onblocked = () => resolve();
            }))
        );
      }
    });
  }

  async openClean() {
    await this.forceLocalIndexedDbMode();
    await this.page.goto('/manifest.json');
    await this.clearBrowserAppState();
    await this.page.goto('/');
    await this.waitForReady();
  }

  async waitForReady() {
    await expect(this.page.locator('#app')).toBeVisible();
    await expect(this.page.getByTestId('nav-new-customer').first()).toBeVisible();
    await this.page.waitForFunction(() => !!window.CrmDB && !!window.ProductConfig);
  }

  async assertNoFatalErrors() {
    const ignored = [/favicon/i];
    const consoleErrors = this.consoleErrors.filter((message) => !ignored.some((pattern) => pattern.test(message)));
    expect(consoleErrors, 'browser console errors').toEqual([]);
    expect(this.pageErrors, 'uncaught page errors').toEqual([]);
  }
}

module.exports = { AppActor };
