(function () {
  'use strict';

  window.ProductProfiles = window.ProductProfiles || {};

  window.ProductProfiles.hairdresser = {
    config: {
      appName: 'CRMicro Beautician',
      appSlug: 'chikas-db',
      themeColor: '#22d3ee',
      logoLight: '/assets/CRMicro_logo_beautician_light.png',
      logoAlt: 'CRMicro Hairdresser logo',
      lockTitle: 'CRMicro Locked',
      appLockSalt: 'tradie_salt',
      dbName: 'chikas-db',
      dbVersion: 6,
      storagePrefix: 'chikas_',
      supabaseSchema: 'hairdresser',
      theme: {
        backgroundImage: 'assets/beautician-bg.png',
        haze1: 'rgba(34, 211, 238, 0.10)',
        hazeTop: 'rgba(8, 47, 73, 0.50)',
        hazeBottom: 'rgba(8, 47, 73, 0.88)'
      },
      entities: {
        customer: { singular: 'Customer', plural: 'Customers' },
        appointment: { singular: 'Appointment', plural: 'Appointments' },
        note: { singular: 'Note', plural: 'Notes' },
        image: { singular: 'Image', plural: 'Images' }
      },
      serviceTypes: [
        { id: 'cut', label: 'Cut', labelJa: 'カット' },
        { id: 'colour', label: 'Colour', labelJa: 'カラー' },
        { id: 'touch_up', label: 'Touch up', labelJa: 'タッチアップ' },
        { id: 'treatment', label: 'Treatment', labelJa: 'トリートメント' },
        { id: 'bleach_colour', label: 'Bleach colour', labelJa: 'ブリーチカラー' },
        { id: 'head_spa', label: 'Head Spa', labelJa: 'ヘッドスパ' },
        { id: 'perm', label: 'Perm', labelJa: 'パーマ' },
        { id: 'straightening', label: 'Straightening', labelJa: '縮毛矯正' },
        { id: 'fringe_cut', label: 'Fringe cut', labelJa: '前髪カット' }
      ],
      referralTypes: [
        { id: 'walk_in', label: 'Walk in', labelJa: '飛び込み' },
        { id: 'friend', label: 'Friend', labelJa: '友人' },
        { id: 'instagram', label: 'Instagram', labelJa: 'インスタ' },
        { id: 'website', label: 'Website', labelJa: 'ウェブサイト' },
        { id: 'google_maps', label: 'Google Maps', labelJa: 'Googleマップ' },
        { id: 'other', label: 'Other', labelJa: 'その他' }
      ],
      customerFields: {
        firstName: { enabled: true, required: false, label: 'First Name', labelJa: '名' },
        lastName: { enabled: true, required: false, label: 'Last Name', labelJa: '姓' },
        contactNumber: { enabled: true, required: false, label: 'Contact Number', labelJa: '電話番号', placeholder: '0400 123 456' },
        socialMediaName: { enabled: true, required: false, label: 'Social Media Name', labelJa: 'SNS名', placeholder: 'Enter social media username' },
        addressLine1: { enabled: true, required: false, label: 'Address line 1', labelJa: '住所1' },
        addressLine2: { enabled: true, required: false, label: 'Address line 2', labelJa: '住所2' },
        suburb: { enabled: true, required: false, label: 'Suburb', labelJa: '市区町村' },
        state: { enabled: true, required: false, label: 'State', labelJa: '都道府県' },
        postcode: { enabled: true, required: false, label: 'Postcode', labelJa: '郵便番号' },
        country: { enabled: true, required: false, label: 'Country', labelJa: '国' },
        referralType: { enabled: true, required: false, label: 'Referral Type', labelJa: '紹介区分' },
        referralNotes: { enabled: true, required: false, label: 'Referral Notes', labelJa: '紹介メモ' }
      },
      durationOptions: [30, 45, 60, 90, 120, 150, 180],
      defaultDuration: 60,
      statuses: [
        { id: 'scheduled', label: 'Scheduled', color: '#60a5fa' },
        { id: 'completed', label: 'Completed', color: '#34d399' },
        { id: 'cancelled', label: 'Cancelled', color: '#ef4444' },
        { id: 'no_show', label: 'No Show', color: '#f59e0b' }
      ],
      features: {
        calendar: true,
        quickBook: true,
        images: true,
        handwritingNotes: true,
        japaneseSupport: true
      }
    },
    translations: {
      en: {
        welcomeMenuMessage: 'Welcome back {firstName}, who are we making beautiful today?'
      },
      ja: {
        welcomeMenuMessage: 'おかえりなさい {firstName} さん、今日は誰をもっと素敵にしましょうか？'
      }
    }
  };
})();
