(function () {
  'use strict';

  window.ProductProfiles = window.ProductProfiles || {};

  window.ProductProfiles.tradie = {
    config: {
      appName: 'TradieCRM',
      appSlug: 'tradie-crm',
      themeColor: '#f59e0b',
      logoLight: '/assets/CRMicro_logo_tradie_light.png',
      logoAlt: 'CRMicro Tradie logo',
      lockTitle: 'TradieCRM Locked',
      appLockSalt: 'tradie_salt',
      dbName: 'tradie-crm-db',
      dbVersion: 6,
      storagePrefix: 'tradie_',
      theme: {
        backgroundImage: 'assets/tradie-bg.png',
        haze1: 'rgba(255,255,255,0.06)',
        hazeTop: 'rgba(2,6,23,0.45)',
        hazeBottom: 'rgba(2,6,23,0.85)'
      },
      useSupabase: true,
      supabaseSchema: 'tradie',
      entities: {
        customer: { singular: 'Customer', plural: 'Customers' },
        appointment: { singular: 'Job', plural: 'Jobs' },
        note: { singular: 'Note', plural: 'Notes' },
        image: { singular: 'Photo', plural: 'Photos' }
      },
      serviceTypes: [
        { id: 'quote', label: 'Quote', labelJa: '見積もり' },
        { id: 'inspection', label: 'Inspection', labelJa: '点検' },
        { id: 'repair', label: 'Repair', labelJa: '修理' },
        { id: 'installation', label: 'Installation', labelJa: '設置' },
        { id: 'maintenance', label: 'Maintenance', labelJa: 'メンテナンス' },
        { id: 'emergency', label: 'Emergency Call-out', labelJa: '緊急対応' },
        { id: 'warranty', label: 'Warranty Work', labelJa: '保証作業' },
        { id: 'followup', label: 'Follow-up', labelJa: 'フォローアップ' }
      ],
      referralTypes: [
        { id: 'word_of_mouth', label: 'Word of Mouth', labelJa: '口コミ' },
        { id: 'google', label: 'Google Search', labelJa: 'Google検索' },
        { id: 'facebook', label: 'Facebook', labelJa: 'Facebook' },
        { id: 'hipages', label: 'hipages', labelJa: 'hipages' },
        { id: 'airtasker', label: 'Airtasker', labelJa: 'Airtasker' },
        { id: 'repeat', label: 'Repeat Customer', labelJa: 'リピーター' },
        { id: 'real_estate', label: 'Real Estate Agent', labelJa: '不動産業者' },
        { id: 'other', label: 'Other', labelJa: 'その他' }
      ],
      customerFields: {
        firstName: { enabled: true, required: false, label: 'First Name', labelJa: '名' },
        lastName: { enabled: true, required: false, label: 'Last Name', labelJa: '姓' },
        contactNumber: { enabled: true, required: false, label: 'Phone', labelJa: '電話番号', placeholder: '0400 123 456' },
        socialMediaName: { enabled: false, required: false, label: 'Social Media', labelJa: 'SNS' },
        addressLine1: { enabled: true, required: false, label: 'Street Address', labelJa: '住所', placeholder: '123 Main Street' },
        suburb: { enabled: true, required: false, label: 'Suburb', labelJa: '市区町村' },
        state: { enabled: true, required: false, label: 'State', labelJa: '州' },
        postcode: { enabled: true, required: false, label: 'Postcode', labelJa: '郵便番号', placeholder: '0000' },
        email: { enabled: true, required: false, label: 'Email', labelJa: 'メール', placeholder: 'email@example.com' },
        referralType: { enabled: true, required: false, label: 'Lead Source', labelJa: 'リード元' },
        referralNotes: { enabled: true, required: false, label: 'Notes', labelJa: 'メモ' }
      },
      durationOptions: [30, 60, 90, 120, 180, 240, 300, 360, 480],
      defaultDuration: 120,
      statuses: [
        { id: 'lead', label: 'Lead', color: '#94a3b8' },
        { id: 'quoted', label: 'Quoted', color: '#60a5fa' },
        { id: 'scheduled', label: 'Scheduled', color: '#a78bfa' },
        { id: 'in_progress', label: 'In Progress', color: '#fbbf24' },
        { id: 'completed', label: 'Completed', color: '#34d399' },
        { id: 'invoiced', label: 'Invoiced', color: '#f97316' },
        { id: 'paid', label: 'Paid', color: '#22c55e' },
        { id: 'cancelled', label: 'Cancelled', color: '#ef4444' }
      ],
      features: {
        calendar: true,
        quickBook: true,
        images: true,
        handwritingNotes: true,
        japaneseSupport: true,
        jobPipeline: true
      }
    },
    translations: {
      en: {
        bookAppointment: 'Schedule Job',
        appointmentBooked: 'Job scheduled',
        appointmentDetails: 'Job Details',
        todaysAppointments: "Today's Jobs",
        noAppointmentsToday: 'No jobs scheduled today',
        nextAppointment: 'Next Job',
        noUpcomingAppointments: 'No upcoming jobs',
        confirmDelete: 'Are you sure you want to delete this job?',
        socialMediaName: 'Social Media',
        socialMediaNamePlaceholder: 'Username',
        leadSource: 'Lead Source',
        jobStatus: 'Job Status',
        jobType: 'Job Type',
        quoteAmount: 'Quote Amount',
        photos: 'Photos',
        beforeAfter: 'Before/After Photos',
        welcomeMenuMessage: 'Welcome back {firstName}, what jobs are we tackling today?'
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
        socialMediaName: 'SNS',
        socialMediaNamePlaceholder: 'ユーザー名',
        leadSource: 'リード元',
        jobStatus: 'ジョブ状況',
        jobType: 'ジョブ種類',
        quoteAmount: '見積金額',
        photos: '写真',
        beforeAfter: 'ビフォー・アフター写真'
      }
    }
  };
})();
