/**
 * Product Configuration Layer
 * 
 * This file centralizes all business-specific terminology, fields, and configuration.
 * Switch between editions (hairdresser, tradie, etc.) by changing the ACTIVE_PRODUCT.
 * 
 * Architecture:
 * - Core infrastructure (db.js, app.js UI shell) remains unchanged
 * - All business-specific elements are defined here
 * - Data model stays consistent; only labels/terminology change
 */

(function () {
  'use strict';

  // ============================================================================
  // PRODUCT DEFINITIONS
  // ============================================================================

  const PRODUCTS = {
    // Original hairdressing CRM
    hairdresser: {
      // Branding
      appName: 'Chikas DB',
      appSlug: 'chikas-db',
      themeColor: '#22d3ee',
      
      // Database
      dbName: 'chikas-db',
      dbVersion: 6,
      storagePrefix: 'chikas_',
      
      // Entity names (what we call things)
      entities: {
        customer: { singular: 'Customer', plural: 'Customers' },
        appointment: { singular: 'Appointment', plural: 'Appointments' },
        note: { singular: 'Note', plural: 'Notes' },
        image: { singular: 'Image', plural: 'Images' },
      },
      
      // Service/booking types
      serviceTypes: [
        { id: 'cut', label: 'Cut', labelJa: 'カット' },
        { id: 'colour', label: 'Colour', labelJa: 'カラー' },
        { id: 'touch_up', label: 'Touch up', labelJa: 'タッチアップ' },
        { id: 'treatment', label: 'Treatment', labelJa: 'トリートメント' },
        { id: 'bleach_colour', label: 'Bleach colour', labelJa: 'ブリーチカラー' },
        { id: 'head_spa', label: 'Head Spa', labelJa: 'ヘッドスパ' },
        { id: 'perm', label: 'Perm', labelJa: 'パーマ' },
        { id: 'straightening', label: 'Straightening', labelJa: '縮毛矯正' },
        { id: 'fringe_cut', label: 'Fringe cut', labelJa: '前髪カット' },
      ],
      
      // Referral sources
      referralTypes: [
        { id: 'walk_in', label: 'Walk in', labelJa: '飛び込み' },
        { id: 'friend', label: 'Friend', labelJa: '友人' },
        { id: 'instagram', label: 'Instagram', labelJa: 'インスタ' },
        { id: 'website', label: 'Website', labelJa: 'ウェブサイト' },
        { id: 'google_maps', label: 'Google Maps', labelJa: 'Googleマップ' },
        { id: 'other', label: 'Other', labelJa: 'その他' },
      ],
      
      // Customer fields (which fields to show)
      customerFields: {
        firstName: { enabled: true, required: false, label: 'First Name', labelJa: '名' },
        lastName: { enabled: true, required: false, label: 'Last Name', labelJa: '姓' },
        contactNumber: { enabled: true, required: false, label: 'Contact Number', labelJa: '電話番号', placeholder: '0400 123 456' },
        socialMediaName: { enabled: true, required: false, label: 'Social Media Name', labelJa: 'SNS名', placeholder: 'Enter social media username' },
        referralType: { enabled: true, required: false, label: 'Referral Type', labelJa: '紹介区分' },
        referralNotes: { enabled: true, required: false, label: 'Referral Notes', labelJa: '紹介メモ' },
      },
      
      // Duration options for appointments (in minutes)
      durationOptions: [30, 45, 60, 90, 120, 150, 180],
      defaultDuration: 60,
      
      // Status pipeline (for appointments)
      statuses: [
        { id: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
        { id: 'completed', label: 'Completed', color: '#34d399' },
        { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        { id: 'no_show', label: 'No Show', color: '#f59e0b' },
      ],
      
      // Feature flags
      features: {
        calendar: true,
        quickBook: true,
        images: true,
        handwritingNotes: true,
        japaneseSupport: true,
      },
    },

    // Tradie/Sole Trader CRM
    tradie: {
      // Branding
      appName: 'TradieCRM',
      appSlug: 'tradie-crm',
      themeColor: '#f59e0b', // Amber/orange for tradie feel
      
      // Database
      dbName: 'tradie-crm-db',
      dbVersion: 4, // Version 4: Added payment fields to appointments
      storagePrefix: 'tradie_',
      
      // Entity names
      entities: {
        customer: { singular: 'Customer', plural: 'Customers' },
        appointment: { singular: 'Job', plural: 'Jobs' }, // Appointments become Jobs
        note: { singular: 'Note', plural: 'Notes' },
        image: { singular: 'Photo', plural: 'Photos' }, // Images become Photos
      },
      
      // Job types for tradies
      serviceTypes: [
        { id: 'quote', label: 'Quote', labelJa: '見積もり' },
        { id: 'inspection', label: 'Inspection', labelJa: '点検' },
        { id: 'repair', label: 'Repair', labelJa: '修理' },
        { id: 'installation', label: 'Installation', labelJa: '設置' },
        { id: 'maintenance', label: 'Maintenance', labelJa: 'メンテナンス' },
        { id: 'emergency', label: 'Emergency Call-out', labelJa: '緊急対応' },
        { id: 'warranty', label: 'Warranty Work', labelJa: '保証作業' },
        { id: 'followup', label: 'Follow-up', labelJa: 'フォローアップ' },
      ],
      
      // Lead/referral sources for tradies
      referralTypes: [
        { id: 'word_of_mouth', label: 'Word of Mouth', labelJa: '口コミ' },
        { id: 'google', label: 'Google Search', labelJa: 'Google検索' },
        { id: 'facebook', label: 'Facebook', labelJa: 'Facebook' },
        { id: 'hipages', label: 'hipages', labelJa: 'hipages' },
        { id: 'airtasker', label: 'Airtasker', labelJa: 'Airtasker' },
        { id: 'repeat', label: 'Repeat Customer', labelJa: 'リピーター' },
        { id: 'real_estate', label: 'Real Estate Agent', labelJa: '不動産業者' },
        { id: 'other', label: 'Other', labelJa: 'その他' },
      ],
      
      // Customer fields for tradies
      customerFields: {
        firstName: { enabled: true, required: false, label: 'First Name', labelJa: '名' },
        lastName: { enabled: true, required: false, label: 'Last Name', labelJa: '姓' },
        contactNumber: { enabled: true, required: false, label: 'Phone', labelJa: '電話番号', placeholder: '0400 123 456' },
        // Repurpose socialMediaName as address for tradies
        socialMediaName: { enabled: true, required: false, label: 'Address', labelJa: '住所', placeholder: '123 Main St, Suburb' },
        email: { enabled: true, required: false, label: 'Email', labelJa: 'メール', placeholder: 'email@example.com' },
        referralType: { enabled: true, required: false, label: 'Lead Source', labelJa: 'リード元' },
        referralNotes: { enabled: true, required: false, label: 'Notes', labelJa: 'メモ' },
      },
      
      // Duration options for jobs (in minutes)
      durationOptions: [30, 60, 90, 120, 180, 240, 300, 360, 480],
      defaultDuration: 120, // 2 hours default for jobs
      
      // Job status pipeline
      statuses: [
        { id: 'lead', label: 'Lead', color: '#94a3b8' },
        { id: 'quoted', label: 'Quoted', color: '#60a5fa' },
        { id: 'scheduled', label: 'Scheduled', color: '#a78bfa' },
        { id: 'in_progress', label: 'In Progress', color: '#fbbf24' },
        { id: 'completed', label: 'Completed', color: '#34d399' },
        { id: 'invoiced', label: 'Invoiced', color: '#f97316' },
        { id: 'paid', label: 'Paid', color: '#22c55e' },
        { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
      ],
      
      // Feature flags
      features: {
        calendar: true,
        quickBook: true,
        images: true, // Before/after photos
        handwritingNotes: true,
        japaneseSupport: true,
        jobPipeline: true, // New feature for tradies
      },
    },
  };

  // ============================================================================
  // ACTIVE PRODUCT SELECTION
  // ============================================================================
  
  // Change this to switch editions
  const ACTIVE_PRODUCT = 'tradie';

  // ============================================================================
  // CONFIGURATION API
  // ============================================================================

  const config = PRODUCTS[ACTIVE_PRODUCT];

  // Helper to get service type label by ID
  function getServiceTypeLabel(id, lang = 'en') {
    const serviceType = config.serviceTypes.find(s => s.id === id);
    if (!serviceType) return id;
    return lang === 'ja' ? (serviceType.labelJa || serviceType.label) : serviceType.label;
  }

  // Helper to get all service type labels
  function getServiceTypeLabels(lang = 'en') {
    return config.serviceTypes.map(s => 
      lang === 'ja' ? (s.labelJa || s.label) : s.label
    );
  }

  // Helper to get referral type label by ID
  function getReferralTypeLabel(id, lang = 'en') {
    const refType = config.referralTypes.find(r => r.id === id);
    if (!refType) return id;
    return lang === 'ja' ? (refType.labelJa || refType.label) : refType.label;
  }

  // Helper to get status by ID
  function getStatus(id) {
    return config.statuses.find(s => s.id === id) || config.statuses[0];
  }

  // Helper to get entity name
  function getEntityName(entity, plural = false) {
    const e = config.entities[entity];
    if (!e) return entity;
    return plural ? e.plural : e.singular;
  }

  // Helper to get customer field config
  function getCustomerField(fieldName) {
    return config.customerFields[fieldName] || { enabled: false };
  }

  // Check if a feature is enabled
  function isFeatureEnabled(featureName) {
    return config.features[featureName] === true;
  }

  // ============================================================================
  // I18N TRANSLATIONS (Product-specific overrides)
  // ============================================================================

  // Base translations that products can override
  const productTranslations = {
    tradie: {
      en: {
        // Override appointment-related terms
        bookAppointment: 'Schedule Job',
        appointmentBooked: 'Job scheduled',
        appointmentDetails: 'Job Details',
        todaysAppointments: "Today's Jobs",
        noAppointmentsToday: 'No jobs scheduled today',
        nextAppointment: 'Next Job',
        noUpcomingAppointments: 'No upcoming jobs',
        confirmDelete: 'Are you sure you want to delete this job?',
        
        // Override for address field (repurposed socialMediaName)
        socialMediaName: 'Address',
        socialMediaNamePlaceholder: '123 Main St, Suburb',
        
        // Tradie-specific
        leadSource: 'Lead Source',
        jobStatus: 'Job Status',
        jobType: 'Job Type',
        quoteAmount: 'Quote Amount',
        photos: 'Photos',
        beforeAfter: 'Before/After Photos',
      },
      ja: {
        bookAppointment: 'ジョブ予約',
        appointmentBooked: 'ジョブを予約しました',
        appointmentDetails: 'ジョブ詳細',
        todaysAppointments: '今日のジョブ',
        noAppointmentsToday: '今日のジョブはありません',
        nextAppointment: '次のジョブ',
        noUpcomingAppointments: '予定のジョブはありません',
        confirmDelete: 'このジョブを削除してもよろしいですか？',
        socialMediaName: '住所',
        socialMediaNamePlaceholder: '住所を入力',
        leadSource: 'リード元',
        jobStatus: 'ジョブ状況',
        jobType: 'ジョブ種類',
        quoteAmount: '見積金額',
        photos: '写真',
        beforeAfter: 'ビフォー・アフター写真',
      },
    },
    hairdresser: {
      en: {},
      ja: {},
    },
  };

  // Get product-specific translation
  function getProductTranslation(key, lang = 'en') {
    const productTrans = productTranslations[ACTIVE_PRODUCT];
    if (productTrans && productTrans[lang] && productTrans[lang][key]) {
      return productTrans[lang][key];
    }
    return null; // Fall back to base translations
  }

  // ============================================================================
  // EXPORT CONFIG
  // ============================================================================

  window.ProductConfig = {
    // Current config
    config,
    activeProduct: ACTIVE_PRODUCT,
    
    // Branding
    appName: config.appName,
    appSlug: config.appSlug,
    themeColor: config.themeColor,
    
    // Database
    dbName: config.dbName,
    dbVersion: config.dbVersion,
    storagePrefix: config.storagePrefix,
    
    // Data
    serviceTypes: config.serviceTypes,
    referralTypes: config.referralTypes,
    customerFields: config.customerFields,
    statuses: config.statuses,
    durationOptions: config.durationOptions,
    defaultDuration: config.defaultDuration,
    
    // Helpers
    getServiceTypeLabel,
    getServiceTypeLabels,
    getReferralTypeLabel,
    getStatus,
    getEntityName,
    getCustomerField,
    isFeatureEnabled,
    getProductTranslation,
    
    // For backward compatibility - get legacy booking type labels
    getLegacyBookingTypes() {
      return config.serviceTypes.map(s => s.label);
    },
  };

  // Log active product on load (for debugging)
  console.log(`[ProductConfig] Active product: ${ACTIVE_PRODUCT} (${config.appName})`);

})();
