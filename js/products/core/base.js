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
      dbName: 'crm-db',
      dbVersion: 1,
      storagePrefix: 'crm_',
      useSupabase: false,
      supabaseSchema: 'public',
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
