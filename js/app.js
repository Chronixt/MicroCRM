(function () {
  // Check for force update parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('force') === 'true' || urlParams.get('v')) {
    console.log('Force update detected, clearing caches...');
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

  // Register Service Worker for PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js?v=1.0.2')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
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
          console.log('SW registration failed: ', registrationError);
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
      goHome: 'Go Home', notFound: 'Not found',
      newCustomer: 'New Customer', findCustomer: 'Find Customer', backupRestore: 'Backup / Restore',
      firstName: 'First Name', lastName: 'Last Name', contactNumber: 'Contact Number', contactNumberPlaceholder: '0400 123 456', socialMediaName: 'Social Media Name', socialMediaNamePlaceholder: 'Enter social media username',
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
    },
    ja: {
              add: '新規顧客', find: '検索', customers: '顧客', calendar: 'カレンダー', backup: 'バックアップ',
      export: 'エクスポート', download: 'ダウンロード', load: '読み込み', preview: 'プレビュー',
      selectAll: '全選択', selectNone: '全解除', includeAppointments: '予約を含む', includeImages: '画像を含む',
      mergeAppendUpdate: 'マージ（追加/更新）', replaceWipeThenImport: '置換（削除して取り込み）', importSelected: '選択を取り込み', wipeAllData: '全データを削除',
      goHome: 'ホームへ', notFound: '見つかりません',
      newCustomer: '新規顧客', findCustomer: '顧客検索', backupRestore: 'バックアップ／復元',
      firstName: '名', lastName: '姓', contactNumber: '電話番号', contactNumberPlaceholder: '0400 123 456', socialMediaName: 'SNS名', socialMediaNamePlaceholder: 'SNSのユーザー名を入力',
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
    }
  };

  function getLang() {
    return localStorage.getItem('chikas_lang') || 'en';
  }
  function setLang(lang) {
    localStorage.setItem('chikas_lang', lang);
  }
  function t(key) {
    const lang = getLang();
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
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

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function currentPath() {
    return window.location.hash.replace(/^#/, '') || '/';
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    adjustSidebarOffset();
    attachLangToggleHandler();
  }

  // Views
  function renderMenu() {
    const lang = getLang();
    
    appRoot.innerHTML = `
      <div class="menu-container">
        <div class="menu-toolbar">
          <button id="lang-toggle" class="lang-btn">${lang === 'en' ? '日本語' : 'English'}</button>
        </div>
        <div class="menu-content">
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
            <a class="menu-tile" href="#/backup" aria-label="Backup and Restore">
              <div class="tile-icon" aria-hidden="true">💾</div>
              <div class="tile-label">${t('backup')}</div>
            </a>
            <a class="menu-tile" href="#/emergency-backup" aria-label="Emergency Backup" style="background: linear-gradient(135deg, #ff6b6b, #ee5a52);">
              <div class="tile-icon" aria-hidden="true">🚨</div>
              <div class="tile-label">${t('emergencyBackup')}</div>
            </a>
          </nav>
          
          <div class="todays-appointments">
            <h3>${t('todaysAppointments')}</h3>
            <div class="no-appointments">${t('noAppointmentsToday')}</div>
            <button id="refresh-appointments" style="margin-top: 10px; padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer;">Refresh</button>
          </div>
        </div>
      </div>
    `;
    
    // Load appointments after rendering the basic structure
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      loadTodaysAppointments();
      // Add event listener for refresh button
      const refreshBtn = document.getElementById('refresh-appointments');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTodaysAppointments);
      }
    }, 100);
  }
  
  async function loadTodaysAppointments() {
    try {
      const today = new Date();
      
      // Use the new optimized function instead of loading all appointments
      const todaysAppointments = await ChikasDB.getAppointmentsForDate(today);
      
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
                const customer = await ChikasDB.getCustomerById(apt.customerId);
                return {
                  ...apt,
                  customerName: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer'
                };
              } catch (error) {
                console.error('Error fetching customer for appointment:', error);
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
      console.error('Error loading appointments:', error);
      // Keep the "no appointments" message if there's an error
    }
  }

  function wrapWithSidebar(contentHtml) {
    const lang = getLang();
    return `
      <div class="layout">
        <aside class="sidebar">
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
            <a class="menu-tile small" href="#/backup" aria-label="Backup and Restore">
              <div class="tile-icon" aria-hidden="true">💾</div>
              <div class="tile-label">${t('backup')}</div>
            </a>
          </nav>
        </aside>
        <section class="content">
          <div class="content-toolbar"><button id="lang-toggle" class="lang-btn">${lang === 'en' ? '日本語' : 'English'}</button></div>
          ${contentHtml}
        </section>
      </div>
    `;
  }

  async function renderAddRecord() {
    // Clear global customer variables to prevent notes from being assigned to wrong customer
    window.currentCustomerId = null;
    window.currentCustomer = null;
    
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
        <h2>${t('newCustomer')}</h2>
      </div>
      <div class="card">
        <div class="form" id="new-form">
          <div class="grid-2">
            <div>
              <label>${t('firstName')}</label>
              <div class="input-with-button">
                <input type="text" name="firstName" placeholder="${t('firstName')}" inputmode="text" />
                <button type="button" class="input-icon-btn" data-field="firstName" title="Handwrite">✏️</button>
              </div>
            </div>
            <div>
              <label>${t('lastName')}</label>
              <div class="input-with-button">
                <input type="text" name="lastName" placeholder="${t('lastName')}" inputmode="text" />
                <button type="button" class="input-icon-btn" data-field="lastName" title="Handwrite">✏️</button>
              </div>
            </div>
          </div>
          <div>
            <label>${t('contactNumber')}</label>
            <div class="input-with-button">
              <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" inputmode="tel" />
              <button type="button" class="input-icon-btn" data-field="contactNumber" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>${t('socialMediaName')}</label>
            <div class="input-with-button">
              <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" inputmode="text" />
              <button type="button" class="input-icon-btn" data-field="socialMediaName" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>Referral</label>
            <div class="input-with-button">
              <input type="text" name="referralNotes" placeholder="${t('referralNotesPlaceholder')}" />
              <button type="button" class="input-icon-btn" data-field="referralNotes" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>${t('notes')}</label>
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

    // Initialize add note button functionality
    document.querySelector('.add-note-btn').addEventListener('click', () => {
      fullscreenNotesCanvas.show();
    });
    
    // Load any existing temporary notes for new customer
    loadExistingNotes('temp-new-customer');
    
    // Add handwriting functionality for text inputs
    document.querySelectorAll('.input-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fieldName = btn.dataset.field;
        const input = document.querySelector(`input[name="${fieldName}"]`);
        const currentValue = input.value;
        
        // Get field label for modal title
        const label = input.closest('.input-with-button').previousElementSibling.textContent;
        
        showHandwritingModal(`Handwrite ${label}`, currentValue, (newValue) => {
          // Extract plain text from HTML (in case user used formatting)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newValue;
          input.value = tempDiv.textContent || tempDiv.innerText || '';
        });
      });
    });
    
    document.getElementById('save-btn').addEventListener('click', async () => {
      const form = document.getElementById('new-form');
      const firstName = form.querySelector('input[name="firstName"]').value.trim();
      const lastName = form.querySelector('input[name="lastName"]').value.trim();
      const contactNumber = form.querySelector('input[name="contactNumber"]').value.trim();
      const socialMediaName = form.querySelector('input[name="socialMediaName"]').value.trim();
      const referralNotes = form.querySelector('input[name="referralNotes"]').value.trim();
      
      // Get notes data from fullscreenNotesCanvas if available, otherwise use empty string
      let notesImageData = '';
      if (fullscreenNotesCanvas && fullscreenNotesCanvas.canvas && fullscreenNotesCanvas.strokes && fullscreenNotesCanvas.strokes.length > 0) {
        notesImageData = fullscreenNotesCanvas.getImageData();
      }
      
      const imageFiles = form.querySelector('input[name="images"]').files;

      const customer = {
        firstName, lastName, contactNumber, socialMediaName, referralNotes,
        notesImageData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newId = await ChikasDB.createCustomer(customer);

      // Transfer any temporary notes from 'temp-new-customer' to the real customer ID
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const tempNotes = existingNotes['temp-new-customer'] || [];
      if (tempNotes.length > 0) {
        console.log(`Transferring ${tempNotes.length} temporary notes to customer ${newId}`);
        existingNotes[newId] = tempNotes;
        delete existingNotes['temp-new-customer'];
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
      }

      if (imageFiles && imageFiles.length > 0) {
        const entries = await ChikasDB.fileListToEntries(imageFiles);
        await ChikasDB.addImages(newId, entries);
      }

      navigate(`/customer?id=${encodeURIComponent(newId)}`);
    });
  }

  async function renderFind() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
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
      const customers = await ChikasDB.searchCustomers(query);
      if (customers.length === 0) {
        resultsEl.innerHTML = `<div class="muted">${t('noMatchesFound')}</div>`;
      } else {
        // Use optimized query to get only future appointments
        const now = new Date().toISOString();
        const futureAppts = await ChikasDB.getAppointmentsBetween(now, '9999-12-31T23:59:59.999Z');
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
              <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : ''}</div>
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
      const customers = await ChikasDB.getRecentCustomers(10);
      
      // Use optimized query to get only future appointments
      const now = new Date().toISOString();
      const futureAppts = await ChikasDB.getAppointmentsBetween(now, '9999-12-31T23:59:59.999Z');
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
            <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : ''}</div>
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
        let allCustomers = await ChikasDB.getAllCustomers();
        

        
        const sortedCustomers = [...allCustomers].sort((a, b) => {
          const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
          const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
          return aName.localeCompare(bName);
        });
        
        {
          const now = new Date();
          const allAppts = await ChikasDB.getAllAppointments();
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
                <div class=\"muted\">${escapeHtml(c.contactNumber || '')}${c.socialMediaName ? ` • ${escapeHtml(c.socialMediaName)}` : ''}</div>
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
        console.error('Error loading all customers:', error);
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
    const customer = await ChikasDB.getCustomerById(id);
    if (!customer) return renderNotFound();
    
    // Store customer ID globally for notes system
    window.currentCustomerId = id;
    window.currentCustomer = customer;

    appRoot.innerHTML = wrapWithSidebar(`
      <div class="card customer-view">
        <div class="view-header">
          <h2 class="customer-title" style="text-align: left; font-size: 24px; margin: 0; padding-left: 16px;">👤 ${escapeHtml((customer.firstName || '') + ' ' + (customer.lastName || ''))}</h2>
          <div class="view-actions">
            <button id="quick-note-btn" class="button secondary small" title="Add notes" aria-label="Add notes">Add notes</button>
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
          <summary class="summary-button" style="background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 10px 0 0 0; line-height: 1; font-size: 12px; cursor: pointer; font-weight: normal; padding-right: 28px; position: relative;">Book Appointment</summary>
          <div class="collapse-body">
            <div class="grid-3">
              <div>
                <label>Booking date</label>
                <input type="datetime-local" id="appt-start" step="900" />
              </div>
              <div>
                <label>Duration</label>
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
                <label>Booking type</label>
                <div class="multi-select" id="appt-type-dropdown">
                  <div id="appt-type-display" class="multi-select-display" tabindex="0">${t('noneSelected')}</div>
                  <div class="dropdown-menu hidden" id="appt-type-menu">
                                      <label class="check"><input type="checkbox" value="Cut" class="appt-type-opt" /> Cut</label>
                  <label class="check"><input type="checkbox" value="Colour" class="appt-type-opt" /> Colour</label>
                  <label class="check"><input type="checkbox" value="Touch up" class="appt-type-opt" /> Touch up</label>
                  <label class="check"><input type="checkbox" value="Treatment" class="appt-type-opt" /> Treatment</label>
                  <label class="check"><input type="checkbox" value="Bleach colour" class="appt-type-opt" /> Bleach colour</label>
                  <label class="check"><input type="checkbox" value="Head Spa" class="appt-type-opt" /> Head Spa</label>
                  <label class="check"><input type="checkbox" value="Perm" class="appt-type-opt" /> Perm</label>
                  <label class="check"><input type="checkbox" value="Straightening" class="appt-type-opt" /> Straightening</label>
                  <label class="check"><input type="checkbox" value="Fringe cut" class="appt-type-opt" /> Fringe cut</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="row" style="margin-top:8px;">
              <button class="button" id="book-btn" style="background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15); color: var(--text); border-radius: 10px; padding: 12px 14px; height: 42px; display: inline-flex; align-items: center; justify-content: center; vertical-align: top; margin: 0; line-height: 1; font-size: 12px; cursor: pointer; font-weight: normal;">Book</button>
            </div>
          </div>
        </details>

        <div class="detail-list">
          <div class="detail-item"><span class="detail-icon">📞</span><span class="detail-label">Contact</span><span class="detail-value">${escapeHtml(customer.contactNumber || '—')}</span></div>
          <div class="detail-item"><span class="detail-icon">📱</span><span class="detail-label">${t('socialMediaName')}</span><span class="detail-value">${escapeHtml(customer.socialMediaName || '—')}</span></div>
          <div class="detail-item"><span class="detail-icon">💬</span><span class="detail-label">Referral</span><span class="detail-value">${escapeHtml(customer.referralNotes || '—')}</span></div>
        </div>

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
        
        <div class="customer-view-actions-bottom">
          <button id="delete-btn" class="icon-btn delete" title="Delete customer" aria-label="Delete customer" style="color: #dc3545;">🗑️</button>
        </div>
      </div>
    `);

    // Images
    const imageGrid = document.getElementById('image-grid');
    
    // Image cache to prevent re-conversion of dataURL to blob
    window.currentImageCache = new Map();
    
    // Cleanup function to prevent memory leaks
    function cleanupImageCache() {
      window.currentImageCache.forEach(url => URL.revokeObjectURL(url));
      window.currentImageCache.clear();
    }
    
    async function renderImageThumbHtml(img) {
      try {
        console.log(`Rendering image ${img.id}:`, {
          name: img.name,
          blobSize: img.blob ? img.blob.size : 'no blob',
          blobType: img.blob ? img.blob.type : 'no blob'
        });
        
        if (!img.blob || img.blob.size === 0) {
          console.warn('Invalid or empty blob for image:', img.name);
          return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
        }
        
        // Use cached URL if available
        let url = window.currentImageCache.get(img.id);
        if (!url) {
          try {
            // Check if we're on iPad Safari and use dataURL directly as fallback
            const isIpadSafari = /iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            
            if (isIpadSafari && img.dataUrl) {
              // Use dataURL directly for iPad Safari (more reliable)
              url = img.dataUrl;
              console.log(`Using dataURL directly for iPad Safari image ${img.id}`);
            } else {
              // Use object URL for other browsers
              url = URL.createObjectURL(img.blob);
              console.log(`Created object URL for image ${img.id}:`, url);
            }
            window.currentImageCache.set(img.id, url);
          } catch (urlError) {
            console.error(`Failed to create object URL for image ${img.id}:`, urlError);
            // Fallback to dataURL if available
            if (img.dataUrl) {
              url = img.dataUrl;
              console.log(`Fallback to dataURL for image ${img.id}`);
            } else {
              return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Failed to create image URL</div>`;
            }
          }
        } else {
          console.log(`Using cached URL for image ${img.id}:`, url);
        }
        
        return `<div class="lazy-image-container" data-image-id="${img.id}" style="position: relative; min-height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <div class="image-placeholder" style="color: rgba(255,255,255,0.3); font-size: 12px;">Loading...</div>
          <img data-src="${url}" alt="${escapeHtml(img.name)}" data-image-id="${img.id}" class="clickable-image lazy-image" style="display: none; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" />
          <div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center; display: none;">Failed to load image</div>
        </div>`;
      } catch (error) {
        console.error('Error rendering image:', img.name, error);
        return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
      }
    }
    
    async function refreshImages() {
      const imgs = await ChikasDB.getImagesByCustomerId(id);
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
      console.log('Setting up lazy loading for', lazyImages.length, 'images');
      
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              
              console.log('Loading image:', img.dataset.src);
              
              // Load the image
              img.src = img.dataset.src;
              img.style.display = 'block';
              
              img.onload = () => {
                console.log('Image loaded successfully');
                if (placeholder) placeholder.style.display = 'none';
              };
              
              img.onerror = () => {
                console.error('Image failed to load:', img.dataset.src);
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
          console.log('Observing image', index, img.dataset.src);
          imageObserver.observe(img);
          
          // Fallback: load image after 2 seconds if intersection observer doesn't trigger
          setTimeout(() => {
            if (img.style.display === 'none' || !img.src) {
              console.log('Fallback loading image', index);
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
        console.log('IntersectionObserver not supported, loading all images immediately');
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
      fullscreenNotesCanvas.show();
    });

    // Load next appointment
    async function loadNextAppointment() {
      try {
        // Use the new optimized function instead of loading all appointments
        const futureAppointments = await ChikasDB.getFutureAppointmentsForCustomer(id);
        
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
        console.error('Error loading next appointment:', error);
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
      const title = typeLabel || 'Appointment';
      const appt = { customerId: id, title, start: startISO, end: endISO, createdAt: new Date().toISOString() };
      const appointmentId = await ChikasDB.createAppointment(appt);
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
      if (!document.getElementById('appt-type-dropdown').contains(e.target)) {
        typeMenu.classList.add('hidden');
        typeDropdown.classList.remove('open');
      }
    });
    updateTypeSummary();

    // Quick notes overlay - create temporary canvas for drawing
    document.getElementById('quick-note-btn').addEventListener('click', () => {
      const now = new Date();
      const tempCanvas = new NotesCanvas('#notes-view', { width: 400, height: 300 });
      tempCanvas.container.innerHTML = ''; // Clear existing content
      tempCanvas.container.appendChild(tempCanvas.canvas);
      
      // Create a simple fullscreen overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(17, 24, 39, 0.98);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        padding: 20px;
      `;
      
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
      `;
      
      const title = document.createElement('h2');
      title.textContent = t('addNotes');
      title.style.margin = '0';
      title.style.color = 'var(--text)';
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = `
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: var(--text);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        cursor: pointer;
        font-size: 18px;
      `;
      
      const canvasContainer = document.createElement('div');
      canvasContainer.style.cssText = `
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 20px;
      `;
      
      const canvas = new NotesCanvas(canvasContainer, { width: 800, height: 600 });
      
      const actions = document.createElement('div');
      actions.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;
      `;
      
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save Note';
      saveBtn.style.cssText = `
        background: linear-gradient(135deg, var(--brand), var(--brand-2));
        color: black;
        border: none;
        border-radius: 8px;
        padding: 12px 24px;
        cursor: pointer;
        font-weight: 600;
      `;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        background: rgba(255,255,255,0.1);
        color: var(--text);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 8px;
        padding: 12px 24px;
        cursor: pointer;
      `;
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      actions.appendChild(saveBtn);
      actions.appendChild(cancelBtn);
      
      overlay.appendChild(header);
      overlay.appendChild(canvasContainer);
      overlay.appendChild(actions);
      document.body.appendChild(overlay);
      
      const cleanup = () => {
        document.body.removeChild(overlay);
      };
      
      closeBtn.addEventListener('click', cleanup);
      cancelBtn.addEventListener('click', cleanup);
      
      saveBtn.addEventListener('click', async () => {
        if (canvas.hasContent()) {
          const newContent = canvas.getImageData();
          const appended = appendNotesCanvas(customer.notesImageData || '', newContent, now);
          const updated = { ...customer, notesImageData: appended, updatedAt: new Date().toISOString() };
          await ChikasDB.updateCustomer(updated);
          customer.notesImageData = appended;
          const notesView = document.getElementById('notes-view');
          if (notesView) {
            notesView.innerHTML = `<img src="${appended}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="Notes drawing" />`;
          }
          alert('Note added');
        }
        cleanup();
      });
    });

    // Edit customer functionality
    document.getElementById('edit-btn').addEventListener('click', () => {
      navigate(`/customer-edit?id=${encodeURIComponent(id)}`);
    });

    // Delete customer functionality
    document.getElementById('delete-btn').addEventListener('click', async () => {
      const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'this customer';
      if (!confirm(`Are you sure you want to delete ${customerName}? This will also delete all their appointments and images. This action cannot be undone.`)) {
        return;
      }
      
      try {
        await ChikasDB.deleteCustomer(id);
        alert('Customer deleted successfully');
        navigate('/find');
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
      }
    });
  }

  async function renderCustomerEdit({ query }) {
    const id = Number(query.get('id'));
    if (!id) return renderNotFound();
    const customer = await ChikasDB.getCustomerById(id);
    if (!customer) return renderNotFound();
    
    // Store customer ID globally for notes system
    window.currentCustomerId = id;
    window.currentCustomer = customer;

    appRoot.innerHTML = wrapWithSidebar(`
      <div class="card">
        <div class="space-between">
          <h2>${t('edit')} ${t('customer')}</h2>
          <a class="button secondary" href="#/customer?id=${encodeURIComponent(id)}">${t('cancel')}</a>
        </div>
        <div class="form" id="customer-form">
          <div class="grid-2">
            <div>
              <label>First Name</label>
              <div class="input-with-button">
                <input type="text" name="firstName" />
                <button type="button" class="input-icon-btn" data-field="firstName" title="Handwrite">✏️</button>
              </div>
            </div>
            <div>
              <label>Last Name</label>
              <div class="input-with-button">
                <input type="text" name="lastName" />
                <button type="button" class="input-icon-btn" data-field="lastName" title="Handwrite">✏️</button>
              </div>
            </div>
          </div>
          <div>
            <label>Contact Number</label>
            <div class="input-with-button">
              <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" />
              <button type="button" class="input-icon-btn" data-field="contactNumber" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>${t('socialMediaName')}</label>
            <div class="input-with-button">
              <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" />
              <button type="button" class="input-icon-btn" data-field="socialMediaName" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>Referral</label>
            <div class="input-with-button">
              <input type="text" name="referralNotes" />
              <button type="button" class="input-icon-btn" data-field="referralNotes" title="Handwrite">✏️</button>
            </div>
          </div>
          <div>
            <label>Notes</label>
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
          </div>
        </div>
      </div>
    `);

    const form = document.getElementById('customer-form');
    setInputValue(form, 'firstName', customer.firstName || '');
    setInputValue(form, 'lastName', customer.lastName || '');
    setInputValue(form, 'contactNumber', customer.contactNumber || '');
    setInputValue(form, 'socialMediaName', customer.socialMediaName || '');
    setInputValue(form, 'referralNotes', customer.referralNotes || '');

    // Initialize add note button functionality
    document.querySelector('.add-note-btn').addEventListener('click', () => {
      fullscreenNotesCanvas.show();
    });
    
    // Load existing notes
    loadExistingNotes(customer.id);
    
    // Add handwriting functionality for text inputs
    document.querySelectorAll('.input-icon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fieldName = btn.dataset.field;
        const input = document.querySelector(`input[name="${fieldName}"]`);
        const currentValue = input.value;
        
        // Get field label for modal title
        const label = input.closest('.input-with-button').previousElementSibling.textContent;
        
        showHandwritingModal(`Handwrite ${label}`, currentValue, (newValue) => {
          // Extract plain text from HTML (in case user used formatting)
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newValue;
          input.value = tempDiv.textContent || tempDiv.innerText || '';
        });
      });
    });

    // Load and display existing images
    const existingImagesGrid = document.getElementById('existing-images-grid');
    
    // Image cache for edit view
    window.currentEditImageCache = new Map();
    
    // Cleanup function for edit view
    function cleanupEditImageCache() {
      window.currentEditImageCache.forEach(url => URL.revokeObjectURL(url));
      window.currentEditImageCache.clear();
    }
    
    async function renderImageThumbHtml(img) {
      try {
        if (!img.blob || img.blob.size === 0) {
          console.warn('Invalid or empty blob for image:', img.name);
          return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
        }
        
        // Use cached URL if available
        let url = window.currentEditImageCache.get(img.id);
        if (!url) {
          url = URL.createObjectURL(img.blob);
          window.currentEditImageCache.set(img.id, url);
        }
        
        return `<div class="lazy-image-container" data-image-id="${img.id}" style="position: relative; min-height: 120px; background: rgba(255,255,255,0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
          <div class="image-placeholder" style="color: rgba(255,255,255,0.3); font-size: 12px;">Loading...</div>
          <img data-src="${url}" alt="${escapeHtml(img.name)}" data-image-id="${img.id}" class="clickable-image lazy-image" style="display: none; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; cursor: pointer;" />
          <div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center; display: none;">Failed to load image</div>
        </div>`;
      } catch (error) {
        console.error('Error rendering image:', img.name, error);
        return `<div class="image-error" style="padding: 10px; border: 1px solid #ff6b6b; color: #ff6b6b; text-align: center;">Error loading image</div>`;
      }
    }
    
    async function loadExistingImages() {
      try {
        const imgs = await ChikasDB.getImagesByCustomerId(id);
        if (imgs.length === 0) {
          existingImagesGrid.innerHTML = '<div class="muted">No images uploaded yet</div>';
          return;
        }
        
        existingImagesGrid.innerHTML = (await Promise.all(imgs.map(renderImageThumbHtml))).join('');
        
        // Set up lazy loading for images in edit view
        setupEditLazyLoading(imgs);
      } catch (error) {
        console.error('Error loading existing images:', error);
        existingImagesGrid.innerHTML = '<div class="error">Error loading images</div>';
      }
    }
    
    // Lazy loading setup for edit view
    function setupEditLazyLoading(imgs) {
      const lazyImages = existingImagesGrid.querySelectorAll('.lazy-image');
      console.log('Setting up lazy loading for edit view:', lazyImages.length, 'images');
      
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              const container = img.closest('.lazy-image-container');
              const placeholder = container.querySelector('.image-placeholder');
              
              console.log('Loading edit image:', img.dataset.src);
              
              // Load the image
              img.src = img.dataset.src;
              img.style.display = 'block';
              
              img.onload = () => {
                console.log('Edit image loaded successfully');
                if (placeholder) placeholder.style.display = 'none';
              };
              
              img.onerror = () => {
                console.error('Edit image failed to load:', img.dataset.src);
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
          console.log('Observing edit image', index, img.dataset.src);
          imageObserver.observe(img);
          
          // Fallback: load image after 2 seconds if intersection observer doesn't trigger
          setTimeout(() => {
            if (img.style.display === 'none' || !img.src) {
              console.log('Fallback loading edit image', index);
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
        console.log('IntersectionObserver not supported, loading all edit images immediately');
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
      
      if (fullscreenNotesCanvas && fullscreenNotesCanvas.canvas && fullscreenNotesCanvas.strokes && fullscreenNotesCanvas.strokes.length > 0) {
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
      
      try {
        await ChikasDB.updateCustomer(updated);
        
        // Handle new image uploads
        const imageFiles = form.querySelector('input[name="images"]').files;
        if (imageFiles && imageFiles.length > 0) {
          const entries = await ChikasDB.fileListToEntries(imageFiles);
          await ChikasDB.addImages(id, entries);
        }
        
        navigate(`/customer?id=${encodeURIComponent(id)}`);
      } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer. Please try again.');
      }
    });
  }

  async function renderCalendar() {
    // Check if we have an appointment parameter to open
    const currentPath = window.location.hash;
    const appointmentMatch = currentPath.match(/[?&]appointment=([^&]+)/);
    const appointmentId = appointmentMatch ? appointmentMatch[1] : null;
    
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
        <h2>${t('calendar')}</h2>
      </div>
      <div class="card">
        <div id="calendar"></div>
      </div>
    `);

    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'listWeek',
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
      dayHeaderNames: [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'listWeek,dayGridMonth'
      },
      events: async (info, successCallback, failureCallback) => {
        try {
          const events = await ChikasDB.getAppointmentsBetween(info.start.toISOString(), info.end.toISOString());
          const customers = await ChikasDB.getAllCustomers();
          const idToCustomer = new Map(customers.map(c => [c.id, c]));
          const mapped = events.map((e) => {
            const customer = idToCustomer.get(e.customerId);
            const fallbackName = customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : '';
            const mappedEvent = {
              id: String(e.id),
              title: e.title || 'Appointment',
              start: e.start,
              end: e.end,
              extendedProps: { 
                customerId: e.customerId,
                customerName: fallbackName,
                customerInitials: customer ? getInitials(customer.firstName, customer.lastName) : '',
                bookingType: e.title || ''
              }
            };
            return mappedEvent;
          });
          successCallback(mapped);
        } catch (err) { 
          console.error('Error loading events:', err);
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
        const start = new Date(arg.event.start);
        const end = new Date(arg.event.end);
        const durationMs = end - start;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        const duration = durationMinutes > 0 ? `${durationMinutes}m` : '';

        // Custom content only for list and month views. Week/day views use FullCalendar defaults.
        if (arg.view.type === 'listWeek' || arg.view.type === 'dayGridMonth') {
          return {
            html: `
              <div class="fc-list-event-content">
                <div class="custom-start-time">${time}</div>
                ${duration ? `<div class="custom-duration">${duration}</div>` : ''}
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
    
    // If we have an appointment ID, open it after calendar loads
    if (appointmentId) {
      // Wait for calendar to fully load events and then open the appointment
      const openAppointment = async () => {
        try {
          const appointment = await ChikasDB.getAppointmentById(appointmentId);
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
          console.error('Error opening appointment:', error);
        }
      };
      
      // Wait for events to load, then open appointment
      setTimeout(openAppointment, 1000);
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
              <label>${t('bookingType')}</label>
              <div class="multi-select" id="qb-type-dropdown">
                <div id="qb-type-display" class="multi-select-display" tabindex="0">${t('noneSelected')}</div>
                <div class="dropdown-menu hidden" id="qb-type-menu">
                  <label class="check"><input type="checkbox" value="Cut" class="qb-type-opt" /> Cut</label>
                  <label class="check"><input type="checkbox" value="Colour" class="qb-type-opt" /> Colour</label>
                  <label class="check"><input type="checkbox" value="Touch up" class="qb-type-opt" /> Touch up</label>
                  <label class="check"><input type="checkbox" value="Treatment" class="qb-type-opt" /> Treatment</label>
                  <label class="check"><input type="checkbox" value="Bleach colour" class="qb-type-opt" /> Bleach colour</label>
                  <label class="check"><input type="checkbox" value="Head Spa" class="qb-type-opt" /> Head Spa</label>
                  <label class="check"><input type="checkbox" value="Perm" class="qb-type-opt" /> Perm</label>
                  <label class="check"><input type="checkbox" value="Straightening" class="qb-type-opt" /> Straightening</label>
                  <label class="check"><input type="checkbox" value="Fringe cut" class="qb-type-opt" /> Fringe cut</label>
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
        const people = await ChikasDB.searchCustomers(query);
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
        if (!document.getElementById('qb-type-dropdown').contains(e.target)) {
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
        const startISO = new Date(roundedStartLocal).toISOString();
        const endISO = new Date(new Date(startStr).getTime() + durationMin * 60000).toISOString();
        const appointmentId = await ChikasDB.createAppointment({ customerId: selectedCustomer.id, title, start: startISO, end: endISO, createdAt: new Date().toISOString() });
        hideModal();
        if (globalCalendar) {
          globalCalendar.refetchEvents();
        }
      };
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
      console.error('No customerId found in event.extendedProps');
      alert('Error: Appointment data is corrupted. Cannot load appointment details.');
      return;
    }
    
    ChikasDB.getCustomerById(event.extendedProps.customerId).then(customer => {
      if (!customer) {
        console.error('Customer not found for ID:', event.extendedProps.customerId);
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

            <label>${t('bookingType')}</label>
            <div class="select-wrap">
              <div class="multi-select" id="apt-type-dropdown">
                <div class="multi-select-display" id="apt-type-display">${t('noneSelected')}</div>
                <div class="dropdown-menu hidden" id="apt-type-menu">
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Cut" /> Cut</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Colour" /> Colour</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Touch up" /> Touch up</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Treatment" /> Treatment</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Bleach colour" /> Bleach colour</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Head Spa" /> Head Spa</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Perm" /> Perm</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Straightening" /> Straightening</label>
                  <label class="check"><input type="checkbox" class="apt-type-opt" value="Fringe cut" /> Fringe cut</label>
                </div>
              </div>
            </div>

            <div class="row" style="margin-top: 16px; gap: 12px;">
              <button class="button" id="apt-save">${t('saveChanges')}</button>
              <button class="button secondary" id="apt-delete">${t('delete')}</button>
              <button class="button secondary" id="apt-cancel">${t('cancel')}</button>
            </div>
          </div>
        </div>
      `);

      // Wait for DOM to be ready, then set up event listeners
      setTimeout(() => {
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
        const bookingTypes = ['Cut', 'Colour', 'Touch up', 'Treatment', 'Bleach colour', 'Head Spa', 'Perm', 'Straightening', 'Fringe cut'];
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
          console.error('No type options found for event listeners');
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
              console.error('No customerId found in event.extendedProps:', event.extendedProps);
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
                end: endISO
              };
            } else {
              // Fallback for plain appointment objects
              updatedAppointment = {
                id: event.id,
                customerId: customerId, // Use the validated customerId
                title: newTitle,
                start: startISO,
                end: endISO,
                createdAt: event.createdAt || new Date().toISOString()
              };
            }
            
            // Validate that we have all required fields
            if (!updatedAppointment.id) {
              console.error('Missing appointment ID for update');
              alert('Error: Missing appointment ID. Cannot update appointment.');
              return;
            }
            
            if (!updatedAppointment.customerId) {
              console.error('Missing customer ID for update');
              alert('Error: Missing customer ID. Cannot update appointment.');
              return;
            }
            
            try {
              await ChikasDB.updateAppointment(updatedAppointment);
              hideModal();
              if (globalCalendar) {
                globalCalendar.refetchEvents();
              }
            } catch (error) {
              console.error('Error updating appointment:', error);
              alert('Error updating appointment: ' + error.message);
            }
          });
        } else {
          console.error('Save button not found!');
        }

        // Delete appointment
        const deleteBtn = document.getElementById('apt-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            if (confirm(t('confirmDelete'))) {
              try {
                await ChikasDB.deleteAppointment(event.id);
                hideModal();
                if (globalCalendar) {
                  globalCalendar.refetchEvents();
                }
              } catch (error) {
                console.error('Error deleting appointment:', error);
                alert('Error deleting appointment');
              }
            }
          });
        } else {
          console.error('Delete button not found!');
        }
        


        // Cancel
        const cancelBtn = document.getElementById('apt-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            hideModal();
          });
        } else {
          console.error('Cancel button not found!');
        }
        

      }, 100); // Small delay to ensure DOM is ready
    }).catch(error => {
      console.error('Error loading customer details:', error);
      console.error('Event object that caused error:', event);
      console.error('Event ID:', event.id);
      console.error('Event extendedProps:', event.extendedProps);
      alert('Error loading appointment details. Check console for details.');
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

  async function renderBackup() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
        <h2>${t('backupRestore')}</h2>
      </div>
      <div class="card">
        <div class="form">
          <div class="row">
            <button id="export-btn" class="button">${t('export')}</button>
            <button id="download-btn" class="button secondary" disabled>${t('download')}</button>
          </div>
          <hr style="border-color: rgba(255,255,255,0.08); width:100%;" />
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
              <label><input type="radio" name="mode" value="replace" /> ${t('replaceWipeThenImport')}</label>
            </div>
            <div class="row" style="margin-top: 8px;">
              <button id="import-selected" class="button">${t('importSelected')}</button>
            </div>
          </div>
          <div class="row">
            <button id="wipe-btn" class="button danger">${t('wipeAllData')}</button>
          </div>
          <div class="muted" id="backup-status"></div>
        </div>
      </div>
    `);

    const exportBtn = document.getElementById('export-btn');
    const downloadBtn = document.getElementById('download-btn');
    const loadBtn = document.getElementById('load-backup');
    const importFile = document.getElementById('import-file');
    const wipeBtn = document.getElementById('wipe-btn');
    const statusEl = document.getElementById('backup-status');
    const preview = document.getElementById('backup-preview');
    const summary = document.getElementById('summary');
    const customerList = document.getElementById('customer-list');
    const selectAllBtn = document.getElementById('select-all');
    const selectNoneBtn = document.getElementById('select-none');
    const includeApptsEl = document.getElementById('include-appts');
    const includeImagesEl = document.getElementById('include-images');
    const importSelectedBtn = document.getElementById('import-selected');

    let lastExportBlobUrl = null;
    let lastExportFileName = null;
    let loadedBackup = null;

    exportBtn.addEventListener('click', async () => {
      try {
        statusEl.textContent = 'Starting export...';
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        
        const data = await ChikasDB.safeExportAllData((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });
        
        statusEl.textContent = 'Creating backup file...';
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        if (lastExportBlobUrl) URL.revokeObjectURL(lastExportBlobUrl);
        lastExportBlobUrl = URL.createObjectURL(blob);
        lastExportFileName = `chikas-backup-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
        downloadBtn.disabled = false;
        statusEl.textContent = `✅ Backup ready: ${lastExportFileName}`;
        
        exportBtn.disabled = false;
        exportBtn.textContent = t('export');
      } catch (error) {
        console.error('Export error:', error);
        statusEl.textContent = `❌ Export failed: ${error.message}`;
        exportBtn.disabled = false;
        exportBtn.textContent = t('export');
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

    // Add a "Select First 10" button for testing
    const selectFirst10Btn = document.createElement('button');
    selectFirst10Btn.textContent = 'Select First 10';
    selectFirst10Btn.className = 'button secondary';
    selectFirst10Btn.style.marginLeft = '8px';
    selectAllBtn.parentNode.insertBefore(selectFirst10Btn, selectNoneBtn.nextSibling);
    
    selectFirst10Btn.addEventListener('click', () => {
      const checkboxes = customerList.querySelectorAll('.select-customer');
      checkboxes.forEach((cb, index) => {
        cb.checked = index < 10;
      });
    });

    importSelectedBtn.addEventListener('click', async () => {
      if (!loadedBackup) { alert('Load a backup first'); return; }
      const selectedIds = Array.from(customerList.querySelectorAll('.select-customer'))
        .filter((cb) => cb.checked)
        .map((cb) => Number(cb.getAttribute('data-id')))
        .filter((v) => !Number.isNaN(v));
      if (selectedIds.length === 0) { alert('No customers selected'); return; }
      const includeAppointments = includeApptsEl.checked;
      const includeImages = includeImagesEl.checked;
      const mode = (document.querySelector('input[name="mode"]:checked') || {}).value || 'merge';

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
            
            const payload = { 
              __meta: loadedBackup.__meta || { app: 'chikas-db', version: 1 }, 
              customers: chunk, 
              appointments: chunkAppointments, 
              images: chunkImages 
            };
            
            await ChikasDB.importAllData(payload, { mode });
            
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
        const payload = { __meta: loadedBackup.__meta || { app: 'chikas-db', version: 1 }, customers, appointments, images };
        try {
          statusEl.textContent = 'Importing...';
          await ChikasDB.importAllData(payload, { mode });
          statusEl.textContent = 'Import complete';
          alert('Import complete');
        } catch (e) {
          statusEl.textContent = 'Import failed';
          alert('Import failed: ' + e.message);
        }
      }
    });

    wipeBtn.addEventListener('click', async () => {
      if (!confirm('This will permanently delete all local data. Continue?')) return;
      await ChikasDB.clearAllStores();
      alert('All local data deleted');
    });
  }

  async function renderEmergencyBackup() {
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
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
        
        const data = await ChikasDB.safeExportAllData((message, progress) => {
          statusEl.textContent = `${message} (${Math.round(progress)}%)`;
        });
        
        statusEl.textContent = 'Creating download...';
        
        // Create blob in smaller chunks to avoid memory issues
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chikas-emergency-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        statusEl.textContent = `✅ Backup downloaded! ${data.customers.length} customers, ${data.appointments.length} appointments, ${data.images.length} images`;
        statusEl.style.color = '#4ecdc4';
        
        // Re-enable button
        exportBtn.disabled = false;
        exportBtn.textContent = t('downloadBackupNow');
        
      } catch (error) {
        console.error('Backup error:', error);
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
        const lang = localStorage.getItem('chikas_lang');
        localStorage.clear();
        if (lang) localStorage.setItem('chikas_lang', lang);
        
        // Force reload with cache busting
        const timestamp = Date.now();
        window.location.href = `${window.location.origin}${window.location.pathname}?v=${timestamp}`;
        
      } catch (error) {
        console.error('Cache clear error:', error);
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
    console.log('showImageViewer called with:', images?.length, 'images, index:', currentIndex);
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
        await ChikasDB.deleteImage(imageId);
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
        console.error('Error deleting image:', error);
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
      
      console.log('Saving handwriting content:', currentContent);
      
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

  function appendNotesHtml(existingHtml, newHtml, timestamp) {
    const ts = timestamp instanceof Date ? timestamp : new Date();
    const tsStr = ts.toLocaleString();
    const block = `<div class="note-entry"><div class="muted" style="font-size:12px;">${escapeHtml(tsStr)}</div>${newHtml}</div>`;
    if (!existingHtml || existingHtml.trim() === '') return block;
    return existingHtml + '<hr />' + block;
  }

  function appendNotesCanvas(existingImageData, newImageData, timestamp) {
    const ts = timestamp instanceof Date ? timestamp : new Date();
    const tsStr = ts.toLocaleString();
    
    // For canvas data, we'll create a simple HTML structure with the new image
    // Since we can't easily combine canvas images, we'll just return the new one
    // In a more sophisticated implementation, you might want to create a composite image
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

  // Add a global function to clear all data (for development/testing)
  window.clearAllData = async () => {
    if (confirm('This will permanently delete ALL data including customers, appointments, and images. This action cannot be undone. Are you sure?')) {
      try {
        await ChikasDB.clearAllStores();
        alert('All data has been cleared successfully. The page will now refresh.');
        window.location.reload();
      } catch (error) {
        console.error('Error clearing data:', error);
        alert('Error clearing data: ' + error.message);
      }
    }
  };

  window.addEventListener('hashchange', render);
  window.addEventListener('load', () => {
    // Default route
    if (!window.location.hash) navigate('/');
    render();
    
    // Run migration for old notes system
    migrateOldNotes();
  });

  // Handwriting digitization settings and functionality
  let handwritingSettings = {
    digitizationMode: 'auto', // 'auto' or 'vector'
    vectorFormat: 'svg', // 'svg' or 'png'
    autoResize: true,
    lineHeight: 24 // pixels
  };

  // Load settings from localStorage
  function loadHandwritingSettings() {
    const saved = localStorage.getItem('handwritingSettings');
    if (saved) {
      handwritingSettings = { ...handwritingSettings, ...JSON.parse(saved) };
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
        z-index: 10000;
        display: flex;
        flex-direction: column;
        padding: 20px;
      `;
      
      // Header
      const header = document.createElement('div');
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

      header.appendChild(title);
      header.appendChild(doneBtn);

      // Canvas container
      const canvasContainer = document.createElement('div');
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
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.hide();
      });

      document.body.appendChild(this.overlay);
    }

    setupCanvas() {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      const canvasContainer = this.overlay.querySelector('div:last-child');
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
      
      const pencilBtn = document.createElement('button');
      pencilBtn.innerHTML = '✏️ Pencil';
      pencilBtn.style.cssText = `
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

      const eraserBtn = document.createElement('button');
      eraserBtn.innerHTML = '🧽 Eraser';
      eraserBtn.style.cssText = `
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
      
      drawingToolsContainer.appendChild(pencilBtn);
      drawingToolsContainer.appendChild(eraserBtn);
      actionToolsContainer.appendChild(undoBtn);
      actionToolsContainer.appendChild(clearBtn);
      
      topRow.appendChild(colorPresets);
      topRow.appendChild(sizeContainer);
      bottomRow.appendChild(drawingToolsContainer);
      bottomRow.appendChild(actionToolsContainer);
      
      toolbar.appendChild(topRow);
      toolbar.appendChild(bottomRow);

      // Insert toolbar before canvas container
      const canvasContainer = this.overlay.querySelector('div:last-child');
      this.overlay.insertBefore(toolbar, canvasContainer);
      
      // Event listeners
      sizeSlider.addEventListener('input', (e) => {
        const newWidth = parseInt(e.target.value);
        this.setStrokeWidth(newWidth);
        sizeValue.textContent = newWidth + 'px';
      });
      
      clearBtn.addEventListener('click', () => this.clear());
      undoBtn.addEventListener('click', () => this.undo());
      pencilBtn.addEventListener('click', () => this.setDrawingMode());
      eraserBtn.addEventListener('click', () => this.setEraserMode());
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
      const pencilBtn = this.overlay.querySelector('button[innerHTML*="Pencil"]');
      const eraserBtn = this.overlay.querySelector('button[innerHTML*="Eraser"]');
      
      if (pencilBtn) {
        pencilBtn.style.background = !this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)';
        pencilBtn.style.borderColor = !this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)';
        pencilBtn.style.color = !this.isErasing ? '#3b82f6' : 'var(--text)';
      }
      
      if (eraserBtn) {
        eraserBtn.style.background = this.isErasing ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)';
        eraserBtn.style.borderColor = this.isErasing ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.2)';
        eraserBtn.style.color = this.isErasing ? '#3b82f6' : 'var(--text)';
      }
    }

    canvasToSVG() {
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

      // Show save prompt
      const savePrompt = document.createElement('div');
      savePrompt.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 12px;
        padding: 24px;
        z-index: 10001;
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
        document.body.removeChild(savePrompt);
        // Don't hide the overlay, just close the dialog
      });

      dontSaveBtn.addEventListener('click', () => {
        document.body.removeChild(savePrompt);
        this.hide();
      });

      saveBtn.addEventListener('click', () => {
        document.body.removeChild(savePrompt);
        this.saveNote();
      });
    }

    saveNote() {
      const svgData = this.canvasToSVG();
      const customerId = this.getCurrentCustomerId();
      
      console.log('Saving note for customer ID:', customerId);
      
      // Get existing notes for this customer
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const customerNotes = existingNotes[customerId] || [];
      
      if (this.editingNote) {
        // Editing existing note - update it
        console.log('Updating existing note:', this.editingNote.id);
        
        const noteIndex = customerNotes.findIndex(note => note.id === this.editingNote.id);
        if (noteIndex !== -1) {
          customerNotes[noteIndex] = {
            ...this.editingNote,
            svg: svgData,
            editedDate: new Date().toLocaleString()
          };
          
          // Update localStorage
          existingNotes[customerId] = customerNotes;
          localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
          
          console.log('Updated note data:', customerNotes[noteIndex]);
          
          // Refresh the notes list
          loadExistingNotes(customerId);
        }
        
        // Clear editing state
        this.editingNote = null;
      } else {
        // Creating new note
        const nextNoteNumber = customerNotes.length + 1;
        
        console.log('Existing notes for customer:', customerNotes.length, 'Next note number:', nextNoteNumber);
        
        const noteData = {
          id: Date.now(),
          svg: svgData,
          date: new Date().toLocaleDateString(),
          noteNumber: nextNoteNumber
        };

        // Store in localStorage
        if (!existingNotes[customerId]) {
          existingNotes[customerId] = [];
        }
        existingNotes[customerId].push(noteData);
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));

        console.log('Saved note data:', noteData);

        // Add note to UI
        this.addNoteToUI(noteData);
      }
      
      this.hide();
    }

    getCurrentCustomerId() {
      // Try to get customer ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        console.log('Found customer ID from URL:', id);
        return id;
      }
      
      // Try to get from the current customer data if available
      if (window.currentCustomer && window.currentCustomer.id) {
        console.log('Found customer ID from currentCustomer:', window.currentCustomer.id);
        return window.currentCustomer.id;
      }
      
      // Try to extract from the current page context
      // Check if we're on a customer view page by looking for customer data in the DOM
      const currentId = window.currentCustomerId || window.customerId;
      if (currentId) {
        console.log('Found customer ID from page context:', currentId);
        return currentId;
      }
      
      // If editing, try to get from form
      const form = document.querySelector('form');
      if (form && form.dataset.customerId) {
        console.log('Found customer ID from form dataset:', form.dataset.customerId);
        return form.dataset.customerId;
      }
      
      // Check if we're on the new customer page
      const isNewCustomerPage = window.location.hash.includes('#/add') || 
                               document.querySelector('h2')?.textContent?.includes('New Customer') ||
                               document.querySelector('h2')?.textContent?.includes('newCustomer');
      
      if (isNewCustomerPage) {
        console.log('On new customer page, using temporary ID');
        return 'temp-new-customer';
      }
      
      console.log('No customer ID found, using default');
      // Default fallback
      return 'default';
    }

    addNoteToUI(noteData) {
      const notesList = document.querySelector('.notes-list');
      if (!notesList) return;

      const noteElement = document.createElement('div');
      noteElement.className = 'note-entry';
      noteElement.style.cssText = `
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        background: rgba(255,255,255,0.03);
        overflow: hidden;
      `;

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

      const noteTitle = document.createElement('span');
      noteTitle.style.color = 'var(--text)';
      noteTitle.style.fontWeight = '600';
      
      // Create the main title text
      const titleText = document.createElement('span');
      titleText.textContent = `Note ${noteData.noteNumber} - ${noteData.date}`;
      
      noteTitle.appendChild(titleText);
      
      // Add edited timestamp if the note was edited
      if (noteData.editedDate) {
        const editedText = document.createElement('span');
        editedText.textContent = ` (edited: ${noteData.editedDate})`;
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

      const editButton = document.createElement('button');
      editButton.textContent = '✏️';
      editButton.title = 'Edit Note';
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
        this.editNote(noteData);
      });
      editButton.addEventListener('mouseenter', () => {
        editButton.style.background = 'rgba(255,255,255,0.2)';
      });
      editButton.addEventListener('mouseleave', () => {
        editButton.style.background = 'rgba(255,255,255,0.1)';
      });

      const expandIcon = document.createElement('span');
      expandIcon.textContent = '▼';
      expandIcon.style.color = 'var(--muted)';
      expandIcon.style.transition = 'transform 0.2s ease';

      // Add delete button only on edit and new customer screens
      const isEditScreen = window.location.hash.includes('#/customer-edit');
      const isNewCustomerScreen = window.location.hash.includes('#/add') || 
                                 document.querySelector('h2')?.textContent?.includes('New Customer') ||
                                 document.querySelector('h2')?.textContent?.includes('newCustomer');
      
      if (isEditScreen || isNewCustomerScreen) {
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

      headerRight.appendChild(editButton);
      headerRight.appendChild(expandIcon);
      noteHeader.appendChild(noteTitle);
      noteHeader.appendChild(headerRight);

      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.style.cssText = `
        padding: 16px;
        display: none;
        background: rgba(255,255,255,0.02);
      `;

      const svgContainer = document.createElement('div');
      svgContainer.innerHTML = noteData.svg;
      svgContainer.style.cssText = `
        max-width: 100%;
        overflow: auto;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 4px;
        padding: 8px;
        background: transparent;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      
      // Scale the SVG to fit the container
      const svg = svgContainer.querySelector('svg');
      if (svg) {
        svg.style.cssText = `
          max-width: 100%;
          max-height: 300px;
          width: auto;
          height: auto;
          background: transparent;
        `;
      }

      noteContent.appendChild(svgContainer);
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

    deleteNote(noteData) {
      // Confirm deletion
      if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
      }

      const customerId = this.getCurrentCustomerId();
      console.log('Deleting note for customer ID:', customerId, 'Note ID:', noteData.id);

      // Get existing notes for this customer
      const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
      const customerNotes = existingNotes[customerId] || [];

      // Find and remove the note
      const noteIndex = customerNotes.findIndex(note => note.id === noteData.id);
      if (noteIndex !== -1) {
        customerNotes.splice(noteIndex, 1);
        
        // Update localStorage
        existingNotes[customerId] = customerNotes;
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
        
        console.log('Note deleted successfully');
        
        // Refresh the notes list
        this.refreshNotesList(customerId);
      } else {
        console.error('Note not found for deletion');
      }
    }

    refreshNotesList(customerId) {
      // Clear existing notes
      const notesList = document.querySelector('.notes-list');
      if (notesList) {
        notesList.innerHTML = '';
      }
      
      // Reload notes for this customer
      loadExistingNotes(customerId);
    }

    editNote(noteData) {
      console.log('Editing note:', noteData);
      
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
        
        console.log('Loaded strokes from SVG:', this.strokes.length);
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
    }
  }

  // Global instance
  const fullscreenNotesCanvas = new FullscreenNotesCanvas();

  // Migration function to convert old notesHtml to new SVG notes system
  async function migrateOldNotes() {
    try {
      console.log('Starting migration of old notes system...');
      
      // Get all customers from the database
      const customers = await ChikasDB.getAllCustomers();
      let migratedCount = 0;
      
      for (const customer of customers) {
        if (customer.notesHtml && customer.notesHtml.trim() !== '' && customer.notesHtml !== '<p><br></p>') {
          console.log(`Migrating notes for customer ${customer.id}: ${customer.firstName} ${customer.lastName}`);
          
          // Convert HTML notes to SVG
          const svgContent = convertHtmlNotesToSVG(customer.notesHtml);
          
          // Create a note entry for the old notes
          const noteData = {
            id: Date.now() + Math.random(), // Unique ID
            svg: svgContent,
            date: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
            noteNumber: 1 // First note for this customer
          };
          
          // Get existing notes for this customer
          const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
          if (!existingNotes[customer.id]) {
            existingNotes[customer.id] = [];
          }
          
          // Add the migrated note
          existingNotes[customer.id].push(noteData);
          
          // Save back to localStorage
          localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
          
          // Remove the old notesHtml from the customer record
          const updatedCustomer = { ...customer };
          delete updatedCustomer.notesHtml;
          await ChikasDB.updateCustomer(updatedCustomer);
          
          migratedCount++;
        }
      }
      
      console.log(`Migration completed. Migrated ${migratedCount} customers' notes.`);
      
      if (migratedCount > 0) {
        // Show a notification to the user
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--brand);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `Migrated ${migratedCount} customers' notes to new system`;
        document.body.appendChild(notification);
        
        // Remove notification after 5 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      }
      
    } catch (error) {
      console.error('Error during notes migration:', error);
    }
  }

  // Convert old HTML notes to SVG format
  function convertHtmlNotesToSVG(htmlContent) {
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Extract text content and basic styling
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!textContent.trim()) {
      return ''; // Return empty if no content
    }
    
    // Calculate dynamic height based on text content
    const lines = textContent.split('\n').filter(line => line.trim());
    const lineHeight = 20;
    const padding = 20;
    const minHeight = 60;
    const calculatedHeight = Math.max(minHeight, (lines.length * lineHeight) + padding);
    
    // Create SVG with the text content
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '400');
    svg.setAttribute('height', calculatedHeight);
    svg.setAttribute('viewBox', `0 0 400 ${calculatedHeight}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    
    // Create text element
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '10');
    text.setAttribute('y', '30');
    text.setAttribute('font-family', 'Arial, sans-serif');
    text.setAttribute('font-size', '16');
    text.setAttribute('fill', '#ffffff');
    text.setAttribute('white-space', 'pre-wrap');
    
    // Handle line breaks and wrap long lines
    const allLines = textContent.split('\n');
    const maxCharsPerLine = 50; // Approximate characters per line
    let processedLines = [];
    
    allLines.forEach(line => {
      if (line.trim()) {
        // If line is too long, wrap it
        if (line.length > maxCharsPerLine) {
          const words = line.split(' ');
          let currentLine = '';
          
          words.forEach(word => {
            if ((currentLine + ' ' + word).length > maxCharsPerLine && currentLine.length > 0) {
              processedLines.push(currentLine.trim());
              currentLine = word;
            } else {
              currentLine += (currentLine.length > 0 ? ' ' : '') + word;
            }
          });
          
          if (currentLine.trim()) {
            processedLines.push(currentLine.trim());
          }
        } else {
          processedLines.push(line.trim());
        }
      }
    });
    
    // Create tspan elements for each processed line
    processedLines.forEach((line, index) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', '10');
      tspan.setAttribute('dy', index === 0 ? '0' : '20');
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    
    svg.appendChild(text);
    
    return new XMLSerializer().serializeToString(svg);
  }

  // Load existing notes for a customer
  function loadExistingNotes(customerId) {
    console.log('Loading notes for customer ID:', customerId);
    const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
    const customerNotes = existingNotes[customerId] || [];
    
    console.log('Found notes for customer:', customerNotes.length);
    
    const notesList = document.querySelector('.notes-list');
    if (!notesList) {
      console.log('No notes list found');
      return;
    }
    
    // Clear existing notes
    notesList.innerHTML = '';
    
    // Ensure proper note numbering and add each note
    customerNotes.forEach((noteData, index) => {
      // Ensure note has correct number (1-based indexing)
      noteData.noteNumber = index + 1;
      console.log('Loading note:', noteData.noteNumber, noteData.date);
      fullscreenNotesCanvas.addNoteToUI(noteData);
    });
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
      console.log('Generated SVG:', svgString);
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


