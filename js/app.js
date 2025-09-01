(function () {
  // Register Service Worker for PWA functionality
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
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

  async function render() {
    const path = currentPath();
    const [base, queryString] = path.split('?');
    const query = new URLSearchParams(queryString || '');
    const view = routes[base] || renderNotFound;
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
      const todayStr = today.toISOString().split('T')[0];
      
      const appointments = await ChikasDB.getAllAppointments();
      
      const todaysAppointments = appointments.filter(apt => {
        // Handle both Date objects and ISO strings
        const aptDate = apt.start instanceof Date ? apt.start : new Date(apt.start);
        const aptDateStr = aptDate.toISOString().split('T')[0];
        return aptDateStr === todayStr;
      }).sort((a, b) => {
        const dateA = a.start instanceof Date ? a.start : new Date(a.start);
        const dateB = b.start instanceof Date ? b.start : new Date(b.start);
        return dateA - dateB;
      });
      
      const appointmentsContainer = document.querySelector('.todays-appointments');
      
      if (appointmentsContainer) {
        if (todaysAppointments.length > 0) {
          // Get customer details for each appointment
          const appointmentsWithCustomers = await Promise.all(
            todaysAppointments.map(async (apt) => {
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
    appRoot.innerHTML = wrapWithSidebar(`
      <div class="space-between" style="margin-bottom: 8px;">
        <h2>${t('newCustomer')}</h2>
      </div>
      <div class="card">
        <div class="form" id="new-form">
          <div class="grid-2">
            <div>
              <label>${t('firstName')}</label>
              <input type="text" name="firstName" placeholder="${t('firstName')}" inputmode="text" />
            </div>
            <div>
              <label>${t('lastName')}</label>
              <input type="text" name="lastName" placeholder="${t('lastName')}" inputmode="text" />
            </div>
          </div>
          <div>
            <label>${t('contactNumber')}</label>
            <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" inputmode="tel" />
          </div>
          <div>
            <label>${t('socialMediaName')}</label>
            <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" inputmode="text" />
          </div>
          <div>
            <label>Referral</label>
            <input type="text" name="referralNotes" placeholder="${t('referralNotesPlaceholder')}" />
          </div>
          <div>
            <label>${t('notes')}</label>
            <div id="new-notes" style="height: 180px;"></div>
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

    const quill = new Quill('#new-notes', { theme: 'snow' });
    document.getElementById('save-btn').addEventListener('click', async () => {
      const form = document.getElementById('new-form');
      const firstName = form.querySelector('input[name="firstName"]').value.trim();
      const lastName = form.querySelector('input[name="lastName"]').value.trim();
      const contactNumber = form.querySelector('input[name="contactNumber"]').value.trim();
      const socialMediaName = form.querySelector('input[name="socialMediaName"]').value.trim();
      const referralNotes = form.querySelector('input[name="referralNotes"]').value.trim();
      const notesHtml = quill.root.innerHTML;
      const imageFiles = form.querySelector('input[name="images"]').files;

      const customer = {
        firstName, lastName, contactNumber, socialMediaName, referralNotes,
        notesHtml,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newId = await ChikasDB.createCustomer(customer);

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
        const now = new Date();
        const allAppts = await ChikasDB.getAllAppointments();
        const nextByCustomer = new Map();
        allAppts.forEach((a) => {
          const start = new Date(a.start);
          if (start <= now) return;
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
      const customers = await ChikasDB.getAllCustomers();
      const sorted = [...customers].sort((a, b) => {
        const ad = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
        const bd = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
        return bd - ad;
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
        recentsEl.innerHTML = sorted.slice(0, 10).map((c) => {
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
        
        // Add dummy customers if we have less than 50 total
        if (allCustomers.length < 50) {
          await addDummyCustomers();
          allCustomers = await ChikasDB.getAllCustomers();
        }
        
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

    // Function to add dummy customer records
    async function addDummyCustomers() {
      const dummyFirstNames = [
        'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia',
        'Kevin', 'Laura', 'Michael', 'Natalie', 'Oliver', 'Patricia', 'Quentin', 'Rachel', 'Samuel', 'Tiffany',
        'Ulysses', 'Victoria', 'William', 'Xena', 'Yasmine', 'Zachary', 'Amelia', 'Benjamin', 'Charlotte', 'Daniel',
        'Emma', 'Franklin', 'Grace', 'Henry', 'Isabella', 'Jackson', 'Katherine', 'Liam', 'Madison', 'Noah',
        'Olivia', 'Parker', 'Quinn', 'Riley', 'Sophia', 'Thomas', 'Uma', 'Vincent', 'Willow', 'Xavier'
      ];
      
      const dummyLastNames = [
        'Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Fisher', 'Garcia', 'Harris', 'Johnson', 'King',
        'Lee', 'Miller', 'Nelson', 'O\'Connor', 'Parker', 'Quinn', 'Roberts', 'Smith', 'Taylor', 'Underwood',
        'Valdez', 'Wilson', 'Young', 'Zimmerman', 'Adams', 'Baker', 'Campbell', 'Edwards', 'Foster', 'Green',
        'Hall', 'Irwin', 'Jones', 'Kelly', 'Lewis', 'Moore', 'Newman', 'Owen', 'Phillips', 'Reed',
        'Scott', 'Thompson', 'Walker', 'White', 'Young', 'Adams', 'Baker', 'Campbell', 'Davis', 'Evans'
      ];
      
      const dummyPhoneNumbers = [
        '555-0101', '555-0102', '555-0103', '555-0104', '555-0105', '555-0106', '555-0107', '555-0108', '555-0109', '555-0110',
        '555-0111', '555-0112', '555-0113', '555-0114', '555-0115', '555-0116', '555-0117', '555-0118', '555-0119', '555-0120',
        '555-0121', '555-0122', '555-0123', '555-0124', '555-0125', '555-0126', '555-0127', '555-0128', '555-0129', '555-0130',
        '555-0131', '555-0132', '555-0133', '555-0134', '555-0135', '555-0136', '555-0137', '555-0138', '555-0139', '555-0140',
        '555-0141', '555-0142', '555-0143', '555-0144', '555-0145', '555-0146', '555-0147', '555-0148', '555-0149', '555-0150'
      ];
      
      try {
        for (let i = 0; i < 50; i++) {
          const firstName = dummyFirstNames[i];
          const lastName = dummyLastNames[i];
          const phoneNumber = dummyPhoneNumbers[i];
          
          // Check if customer already exists
          const existingCustomers = await ChikasDB.getAllCustomers();
          const exists = existingCustomers.some(c => 
            c.firstName === firstName && c.lastName === lastName
          );
          
          if (!exists) {
            const dummyCustomer = {
              firstName: firstName,
              lastName: lastName,
              contactNumber: phoneNumber,
              email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
              address: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Elm St', 'Maple Dr'][Math.floor(Math.random() * 5)]}`,
              notes: `Dummy customer record for testing purposes.`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            await ChikasDB.createCustomer(dummyCustomer);
          }
        }
      } catch (error) {
        console.error('Error adding dummy customers:', error);
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
          <div id="notes-view" class="rich-note"></div>
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
    async function refreshImages() {
      const imgs = await ChikasDB.getImagesByCustomerId(id);
      const noImagesMessage = document.getElementById('no-images-message');
      
      if (imgs.length === 0) {
        noImagesMessage.style.display = 'block';
        imageGrid.innerHTML = '';
      } else {
        noImagesMessage.style.display = 'none';
        imageGrid.innerHTML = (await Promise.all(imgs.map(renderImageThumbHtml))).join('');
      }
    }
    async function renderImageThumbHtml(img) {
      const url = URL.createObjectURL(img.blob);
      return `<img src="${url}" alt="${escapeHtml(img.name)}" />`;
    }
    await refreshImages();

    // Notes view render
    const notesView = document.getElementById('notes-view');
    if (notesView) {
      if (customer.notesHtml && customer.notesHtml.trim() !== '') {
        notesView.innerHTML = customer.notesHtml;
      } else {
        notesView.innerHTML = '<div class="muted">No notes added</div>';
      }
    }

    // Load next appointment
    async function loadNextAppointment() {
      try {
        const now = new Date();
        const appointments = await ChikasDB.getAllAppointments();
        
        // Filter appointments for this customer that are in the future
        const futureAppointments = appointments
          .filter(apt => apt.customerId === id && new Date(apt.start) > now)
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        
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

    // Quick notes overlay
    document.getElementById('quick-note-btn').addEventListener('click', () => {
      const now = new Date();
      showModal(`
        <div class=\"modal\">
          <h3 style=\"margin-top:0;\">${t('addNotes')}</h3>
          <div id=\"quick-quill\" style=\"height: 180px;\"></div>
          <div class=\"row\" style=\"margin-top: 10px;\">
            <button class=\"button\" id=\"quick-save\">Save</button>
            <button class=\"button secondary\" id=\"quick-cancel\">Cancel</button>
          </div>
        </div>
      `);
      const q = new Quill('#quick-quill', { theme: 'snow' });
      document.getElementById('quick-cancel').onclick = () => {
        const hasContent = (q.getText() || '').trim().length > 0;
        if (hasContent) {
          if (!confirm('Discard entered note?')) return;
        }
        hideModal();
      };
      document.getElementById('quick-save').onclick = async () => {
        const html = q.root.innerHTML;
        if (!html || html === '<p><br></p>') { hideModal(); return; }
        const appended = appendNotesHtml(customer.notesHtml || '', html, now);
        const updated = { ...customer, notesHtml: appended, updatedAt: new Date().toISOString() };
        await ChikasDB.updateCustomer(updated);
        customer.notesHtml = appended;
        const notesView = document.getElementById('notes-view');
        if (notesView) notesView.innerHTML = appended;
        hideModal();
        alert('Note added');
      };
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
              <input type="text" name="firstName" />
            </div>
            <div>
              <label>Last Name</label>
              <input type="text" name="lastName" />
            </div>
          </div>
          <div>
            <label>Contact Number</label>
            <input type="tel" name="contactNumber" placeholder="${t('contactNumberPlaceholder')}" />
          </div>
          <div>
            <label>${t('socialMediaName')}</label>
            <input type="text" name="socialMediaName" placeholder="${t('socialMediaNamePlaceholder')}" />
          </div>
          <div>
            <label>Referral</label>
            <input type="text" name="referralNotes" />
          </div>
          <div>
            <label>Notes</label>
            <div id="notes" style="height: 220px;"></div>
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

    const notesQuill = new Quill('#notes', { theme: 'snow' });
    notesQuill.clipboard.dangerouslyPasteHTML(customer.notesHtml || '');

    // Load and display existing images
    const existingImagesGrid = document.getElementById('existing-images-grid');
    async function loadExistingImages() {
      try {
        const imgs = await ChikasDB.getImagesByCustomerId(id);
        if (imgs.length === 0) {
          existingImagesGrid.innerHTML = '<div class="muted">No images uploaded yet</div>';
          return;
        }
        
        existingImagesGrid.innerHTML = (await Promise.all(imgs.map(renderImageThumbHtml))).join('');
      } catch (error) {
        console.error('Error loading existing images:', error);
        existingImagesGrid.innerHTML = '<div class="error">Error loading images</div>';
      }
    }
    
    async function renderImageThumbHtml(img) {
      const url = URL.createObjectURL(img.blob);
      return `<img src="${url}" alt="${escapeHtml(img.name)}" />`;
    }
    
    await loadExistingImages();

    document.getElementById('save-btn').addEventListener('click', async () => {
      // Check if Quill editor has meaningful content
      const notesContent = notesQuill.root.innerHTML;
      const hasNotes = notesContent && notesContent.trim() !== '' && notesContent !== '<p><br></p>';
      
      const updated = {
        ...customer,
        firstName: getInputValue(form, 'firstName').trim(),
        lastName: getInputValue(form, 'lastName').trim(),
        contactNumber: getInputValue(form, 'contactNumber').trim(),
        socialMediaName: getInputValue(form, 'socialMediaName').trim(),
        referralNotes: getInputValue(form, 'referralNotes').trim(),
        notesHtml: hasNotes ? notesContent : '',
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
      statusEl.textContent = 'Exporting…';
      const data = await ChikasDB.exportAllData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      if (lastExportBlobUrl) URL.revokeObjectURL(lastExportBlobUrl);
      lastExportBlobUrl = URL.createObjectURL(blob);
      lastExportFileName = `chikas-backup-${new Date().toISOString().replace(/[:]/g, '-')}.json`;
      downloadBtn.disabled = false;
      statusEl.textContent = `Backup ready: ${lastExportFileName}`;
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
      const payload = { __meta: loadedBackup.__meta || { app: 'chikas-db', version: 1 }, customers, appointments, images };
      try {
        await ChikasDB.importAllData(payload, { mode });
        alert('Import complete');
      } catch (e) {
        alert('Import failed: ' + e.message);
      }
    });

    wipeBtn.addEventListener('click', async () => {
      if (!confirm('This will permanently delete all local data. Continue?')) return;
      await ChikasDB.clearAllStores();
      alert('All local data deleted');
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

  window.addEventListener('hashchange', render);
  window.addEventListener('load', () => {
    // Default route
    if (!window.location.hash) navigate('/');
    render();
  });
})();


