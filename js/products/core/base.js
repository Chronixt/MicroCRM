(function () {
  'use strict';

  window.ProductProfiles = window.ProductProfiles || {};

  window.ProductCore = {
    defaultProduct: 'hairdresser',
    defaultConfig: {
      appName: 'CRM',
      appSlug: 'crm',
      themeColor: '#0ea5e9',
      logoLight: '/assets/icon-192.png',
      logoAlt: 'CRM logo',
      lockTitle: 'CRM Locked',
      // Keep legacy default salt to avoid breaking existing stored app-lock PIN hashes.
      appLockSalt: 'tradie_salt',
      dbName: 'crm-db',
      dbVersion: 1,
      storagePrefix: 'crm_',
      useSupabase: false,
      supabaseSchema: 'public',
      theme: {
        backgroundImage: 'assets/tradie-bg.png',
        haze1: 'rgba(255,255,255,0.06)',
        hazeTop: 'rgba(2,6,23,0.45)',
        hazeBottom: 'rgba(2,6,23,0.85)'
      },
      entities: {
        customer: { singular: 'Customer', plural: 'Customers' },
        appointment: { singular: 'Appointment', plural: 'Appointments' },
        note: { singular: 'Note', plural: 'Notes' },
        image: { singular: 'Image', plural: 'Images' }
      },
      serviceTypes: [],
      referralTypes: [],
      customerFields: {},
      durationOptions: [30, 60, 90],
      defaultDuration: 60,
      statuses: [],
      features: {}
    },
    defaultTranslations: {
      en: {},
      ja: {}
    }
  };
})();
