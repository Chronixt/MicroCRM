/* Canonical Supabase backend for CRMicro. Same API as db.js (+ tradie pipeline extensions). */
(function () {
  const productConfig = window.ProductConfig || {};
  const profileConfig = productConfig.config || {};
  const FEATURE_FLAGS = profileConfig.features || {};
  const SCHEMA =
    window.SUPABASE_SCHEMA ||
    productConfig.supabaseSchema ||
    profileConfig.supabaseSchema ||
    'public';
  const APP_SLUG = productConfig.appSlug || profileConfig.appSlug || 'crm';
  const STORAGE_PREFIX = productConfig.storagePrefix || profileConfig.storagePrefix || 'crm_';
  const SUPPORTS_JOB_PIPELINE = !!FEATURE_FLAGS.jobPipeline;
  const APPOINTMENT_BASE_COLUMNS = [
    'customer_id',
    'title',
    'start',
    'end',
    'created_at'
  ];
  const APPOINTMENT_PIPELINE_COLUMNS = [
    'status',
    'address',
    'quoted_amount',
    'invoice_amount',
    'paid_amount'
  ];
  const APPOINTMENT_COLUMNS = SUPPORTS_JOB_PIPELINE
    ? APPOINTMENT_BASE_COLUMNS.concat(APPOINTMENT_PIPELINE_COLUMNS)
    : APPOINTMENT_BASE_COLUMNS;
  var cachedClient = null;
  let cachedTypedNoteColumns = null;
  let cachedTypedNoteVersionColumns = null;

  function getClient() {
    if (cachedClient) return cachedClient;
    if (window.SupabaseClient) {
      cachedClient = window.SupabaseClient;
      return cachedClient;
    }
    const url = window.SUPABASE_URL || '';
    const key = window.SUPABASE_PUBLISHABLE_KEY || window.SUPABASE_ANON_KEY || '';
    if (!url || !key) throw new Error('Supabase: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY) must be set when USE_SUPABASE is true.');
    if (typeof supabase === 'undefined') throw new Error('Supabase: supabase-js not loaded.');
    cachedClient = supabase.createClient(url, key, { db: { schema: SCHEMA } });
    window.SupabaseClient = cachedClient;
    return cachedClient;
  }

  function normalizeDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    if (typeof dateValue === 'string') {
      const ymdMatch = dateValue.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
      if (ymdMatch) {
        const [, y, m, d] = ymdMatch;
        const t = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        if (!isNaN(t.getTime())) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const dmyMatch = dateValue.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      if (dmyMatch) {
        const [, first, second, year] = dmyMatch;
        let day = parseInt(first), month = parseInt(second);
        if (first <= 12 && second > 12) { month = parseInt(first); day = parseInt(second); }
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const t = new Date(parseInt(year), month - 1, day);
          if (!isNaN(t.getTime())) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  function toSnake(obj) {
    if (obj == null) return obj;
    const map = {
      firstName: 'first_name', lastName: 'last_name', contactNumber: 'contact_number',
      socialMediaName: 'social_media_name', referralNotes: 'referral_notes', referralType: 'referral_type',
      addressLine1: 'address_line1', addressLine2: 'address_line2', suburb: 'suburb', state: 'state', postcode: 'postcode', country: 'country',
      updatedAt: 'updated_at', customerId: 'customer_id', createdAt: 'created_at',
      editedDate: 'edited_date', noteNumber: 'note_number', dataUrl: 'data_url',
      textValue: 'text_value', noteType: 'note_type',
      noteId: 'note_id', savedAt: 'saved_at',
      appointmentId: 'appointment_id', dueAt: 'due_at',
      quotedAmount: 'quoted_amount', invoiceAmount: 'invoice_amount', paidAmount: 'paid_amount'
    };
    const out = {};
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const key = map[k] || k;
      out[key] = obj[k];
    }
    return out;
  }

  function toCamel(obj) {
    if (obj == null) return obj;
    const map = {
      first_name: 'firstName', last_name: 'lastName', contact_number: 'contactNumber',
      social_media_name: 'socialMediaName', referral_notes: 'referralNotes', referral_type: 'referralType',
      address_line1: 'addressLine1', address_line2: 'addressLine2', suburb: 'suburb', state: 'state', postcode: 'postcode', country: 'country',
      updated_at: 'updatedAt', customer_id: 'customerId', created_at: 'createdAt',
      edited_date: 'editedDate', note_number: 'noteNumber', data_url: 'dataUrl',
      text_value: 'textValue', note_type: 'noteType',
      note_id: 'noteId', saved_at: 'savedAt',
      appointment_id: 'appointmentId', due_at: 'dueAt',
      quoted_amount: 'quotedAmount', invoice_amount: 'invoiceAmount', paid_amount: 'paidAmount'
    };
    const out = {};
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const key = map[k] || k;
      out[key] = obj[k];
    }
    if (out.text == null && typeof out.textValue === 'string') out.text = out.textValue;
    return out;
  }

  function hasNonEmptyText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function inferNoteType(note) {
    if (note && (note.noteType === 'svg' || note.type === 'svg')) return 'svg';
    const hasText = !!(note && (hasNonEmptyText(note.text) || hasNonEmptyText(note.textValue) || hasNonEmptyText(note.content)));
    const hasSvg = !!(note && hasNonEmptyText(note.svg));
    if (note && (note.noteType === 'text' || note.type === 'text')) {
      if (hasText || !hasSvg) return 'text';
      return 'svg';
    }
    if (hasText) return 'text';
    return 'svg';
  }

  function isMissingColumnError(errorLike) {
    const code = String(errorLike?.code || '');
    const msg = String(errorLike?.message || '').toLowerCase();
    return code === '42703' || msg.includes('column') && msg.includes('does not exist');
  }

  async function hasTypedNoteColumns() {
    if (cachedTypedNoteColumns != null) return cachedTypedNoteColumns;
    const supabase = getClient();
    const probe = await supabase.from('notes').select('id,note_type,text_value').limit(1);
    if (probe.error && isMissingColumnError(probe.error)) {
      cachedTypedNoteColumns = false;
      return false;
    }
    if (probe.error) throwIfError(probe);
    cachedTypedNoteColumns = true;
    return true;
  }

  async function hasTypedNoteVersionColumns() {
    if (cachedTypedNoteVersionColumns != null) return cachedTypedNoteVersionColumns;
    const supabase = getClient();
    const probe = await supabase.from('note_versions').select('id,note_type,text_value').limit(1);
    if (probe.error && isMissingColumnError(probe.error)) {
      cachedTypedNoteVersionColumns = false;
      return false;
    }
    if (probe.error) throwIfError(probe);
    cachedTypedNoteVersionColumns = true;
    return true;
  }

  function dataURLToBlob(dataUrl, fallbackType) {
    try {
      const parts = String(dataUrl || '').split(',');
      const base64 = parts[1] || '';
      if (!base64) return new Blob([], { type: fallbackType || 'application/octet-stream' });
      const mimeMatch = /data:([^;]+);base64/.exec(parts[0] || '');
      const mime = mimeMatch ? mimeMatch[1] : (fallbackType || 'application/octet-stream');
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      return new Blob([], { type: fallbackType || 'application/octet-stream' });
    }
  }

  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }

  function compressImage(blob, type) {
    return new Promise((resolve) => {
      if (blob.size <= 500 * 1024) { resolve(blob); return; }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        try {
          const maxSize = 1200;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w *= ratio; h *= ratio;
          }
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((b) => resolve(b && b.size < blob.size ? b : blob), type || 'image/jpeg', 0.8);
        } catch (e) { resolve(blob); }
      };
      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }

  function fileToEntry(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const blob = new Blob([r.result], { type: file.type });
        resolve({ name: file.name, type: file.type, blob });
      };
      r.onerror = () => reject(r.error);
      r.readAsArrayBuffer(file);
    });
  }

  async function fileListToEntries(fileList) {
    const files = Array.from(fileList || []);
    return Promise.all(files.map((f) => fileToEntry(f)));
  }

  function throwIfError(res) {
    if (res.error) throw new Error(res.error.message || 'Supabase error');
    return res;
  }

  function assertJobPipelineFeature(methodName) {
    if (SUPPORTS_JOB_PIPELINE) return;
    throw new Error(methodName + ' is not available for this product profile.');
  }

  function parseNoteDateValue(raw) {
    if (!raw) return Number.NaN;
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return new Date(`${raw}T12:00:00.000Z`).getTime();
    }
    return new Date(raw).getTime();
  }

  function noteSortTimestamp(note) {
    const primary = parseNoteDateValue(note?.date);
    if (Number.isFinite(primary)) return primary;
    const fallback = parseNoteDateValue(note?.createdAt ?? note?.created_at);
    if (Number.isFinite(fallback)) return fallback;
    return Number.NEGATIVE_INFINITY;
  }

  function noteSortId(note) {
    const idNum = Number(note?.id);
    return Number.isFinite(idNum) ? idNum : Number.NEGATIVE_INFINITY;
  }

  function compareNotesByCreatedDesc(a, b) {
    const aTime = noteSortTimestamp(a);
    const bTime = noteSortTimestamp(b);
    if (aTime !== bTime) return bTime - aTime;
    return noteSortId(b) - noteSortId(a);
  }

  async function fetchImagesForExportSafe() {
    try {
      const supabase = getClient();
      const pageSize = 50; // Fetch lightweight metadata in larger pages.
      const imagesSerialized = [];
      const skippedImageIds = [];
      let from = 0;

      while (true) {
        const to = from + pageSize - 1;
        const pageRes = await supabase
          .from('images')
          .select('id,customer_id,name,type,created_at')
          .order('id', { ascending: true })
          .range(from, to);
        throwIfError(pageRes);
        const page = pageRes.data || [];
        if (page.length === 0) break;

        for (const row of page) {
          let dataRes = null;
          try {
            dataRes = await supabase
              .from('images')
              .select('data_url')
              .eq('id', row.id)
              .maybeSingle();
          } catch (e) {
            skippedImageIds.push(row.id);
            continue;
          }
          if (dataRes.error || !dataRes.data || !dataRes.data.data_url) {
            skippedImageIds.push(row.id);
            continue;
          }
          imagesSerialized.push({
            id: row.id,
            customerId: row.customer_id,
            name: row.name,
            type: row.type,
            createdAt: row.created_at,
            dataUrl: dataRes.data.data_url
          });
        }

        if (page.length < pageSize) break;
        from += pageSize;
      }

      let warning = null;
      if (skippedImageIds.length > 0) {
        warning = `Skipped ${skippedImageIds.length} image(s) that could not be read: ${skippedImageIds.slice(0, 20).join(', ')}${skippedImageIds.length > 20 ? ' ...' : ''}`;
        console.warn('[Backup]', warning);
      }
      return { imagesSerialized, warning };
    } catch (error) {
      const warning = `Images export skipped: ${error.message || error}`;
      console.warn('[Backup]', warning);
      return { imagesSerialized: [], warning };
    }
  }

  async function getSession() {
    const supabase = getClient();
    const res = await supabase.auth.getSession();
    throwIfError(res);
    return res.data && res.data.session ? res.data.session : null;
  }

  async function signInWithPassword(email, password) {
    const supabase = getClient();
    const res = await supabase.auth.signInWithPassword({ email, password });
    throwIfError(res);
    return res.data && res.data.session ? res.data.session : null;
  }

  async function signOut() {
    const supabase = getClient();
    const res = await supabase.auth.signOut();
    throwIfError(res);
  }

  function onAuthStateChange(callback) {
    const supabase = getClient();
    const res = supabase.auth.onAuthStateChange((event, session) => {
      if (typeof callback === 'function') callback(event, session);
    });
    return res && res.data ? res.data.subscription : null;
  }

  async function claimUnownedData() {
    // Deliberately gated behind two explicit flags to avoid accidental ownership reassignment
    // in shared/live environments.
    if (window.ENABLE_AUTO_CLAIM_UNOWNED_DATA !== true || window.ALLOW_UNOWNED_CLAIM_RPC !== true) {
      console.warn('[Supabase] claim_unowned_data blocked (set ENABLE_AUTO_CLAIM_UNOWNED_DATA=true and ALLOW_UNOWNED_CLAIM_RPC=true to enable).');
      return null;
    }
    const supabase = getClient();
    const res = await supabase.rpc('claim_unowned_data');
    if (res && res.error) {
      const msg = String(res.error.message || '');
      const code = String(res.error.code || '');
      const isMissingRpc =
        code === 'PGRST202' ||
        msg.indexOf('Could not find the function') !== -1 ||
        msg.indexOf('claim_unowned_data') !== -1;
      if (isMissingRpc) {
        console.warn('[Supabase] Optional RPC claim_unowned_data is unavailable; continuing.');
        return null;
      }
    }
    throwIfError(res);
    return res.data;
  }

  async function deleteMyData() {
    const supabase = getClient();
    const rpcRes = await supabase.rpc('delete_my_data');
    if (!rpcRes.error) return rpcRes.data;

    const msg = String(rpcRes.error.message || '');
    const code = String(rpcRes.error.code || '');
    const isMissingRpc =
      code === 'PGRST202' ||
      msg.indexOf('Could not find the function') !== -1 ||
      msg.indexOf('delete_my_data') !== -1;
    const isTimeout =
      code === '57014' ||
      msg.indexOf('statement timeout') !== -1 ||
      msg.indexOf('canceling statement due to statement timeout') !== -1;
    if (!isMissingRpc && !isTimeout) throwIfError(rpcRes);

    // Fallback path for environments where migration is missing or RPC times out.
    const session = await getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Not authenticated');

    function isStatementTimeout(errorLike) {
      const message = String(errorLike?.message || '');
      const code = String(errorLike?.code || '');
      return (
        code === '57014' ||
        message.indexOf('statement timeout') !== -1 ||
        message.indexOf('canceling statement due to statement timeout') !== -1
      );
    }

    async function deleteIdsAdaptive(table, idColumn, ids, initialChunkSize) {
      let deleted = 0;
      let idx = 0;
      let chunkSize = Math.max(1, Math.min(initialChunkSize, ids.length));
      while (idx < ids.length) {
        const slice = ids.slice(idx, idx + chunkSize);
        const delRes = await supabase.from(table).delete().in(idColumn, slice);
        if (!delRes.error) {
          deleted += slice.length;
          idx += slice.length;
          continue;
        }

        if (!isStatementTimeout(delRes.error)) throwIfError(delRes);

        if (chunkSize <= 1) {
          // Single-row timeout is unlikely but possible under heavy load.
          throwIfError(delRes);
        }
        chunkSize = Math.max(1, Math.floor(chunkSize / 2));
      }
      return deleted;
    }

    const FETCH_BATCH_SIZE = 120;
    async function deleteOwnedByIdBatches(table, idColumn = 'id') {
      let deletedCount = 0;
      let loops = 0;
      const isImagesTable = table === 'images';
      const initialDeleteChunkSize = isImagesTable ? 8 : 40;
      while (true) {
        loops += 1;
        if (loops > 20000) throw new Error(`Delete failed: too many loops for ${table}`);
        const fetchRes = await supabase
          .from(table)
          .select(idColumn)
          .eq('owner_user_id', uid)
          .order(idColumn, { ascending: true })
          .limit(FETCH_BATCH_SIZE);
        throwIfError(fetchRes);
        const ids = (fetchRes.data || []).map((row) => row[idColumn]).filter((v) => v != null);
        if (ids.length === 0) break;
        deletedCount += await deleteIdsAdaptive(table, idColumn, ids, initialDeleteChunkSize);
      }
      return deletedCount;
    }

    let deleted = {
      customers: 0,
      appointments: 0,
      images: 0,
      notes: 0,
      noteVersions: 0,
      reminders: 0,
      jobEvents: 0,
      fallback: true,
      rpcTimedOut: isTimeout
    };

    deleted.noteVersions = await deleteOwnedByIdBatches('note_versions', 'id');
    deleted.notes = await deleteOwnedByIdBatches('notes', 'id');
    deleted.images = await deleteOwnedByIdBatches('images', 'id');
    if (SUPPORTS_JOB_PIPELINE) {
      deleted.reminders = await deleteOwnedByIdBatches('reminders', 'id');
      deleted.jobEvents = await deleteOwnedByIdBatches('job_events', 'id');
    }
    deleted.appointments = await deleteOwnedByIdBatches('appointments', 'id');
    deleted.customers = await deleteOwnedByIdBatches('customers', 'id');
    return deleted;
  }

  function extractAppointmentCustomerId(appointment) {
    if (!appointment || typeof appointment !== 'object') return null;
    return appointment.customerId ?? (appointment.extendedProps && appointment.extendedProps.customerId) ?? null;
  }

  function buildAppointmentRow(appointment, customerIdOverride) {
    const rawCustomerId = customerIdOverride != null ? customerIdOverride : extractAppointmentCustomerId(appointment);
    const customerId = rawCustomerId == null ? null : parseInt(rawCustomerId, 10);
    const row = {
      customer_id: Number.isNaN(customerId) ? null : customerId,
      start: appointment.start || null,
      end: appointment.end || null,
      title: appointment.title || null,
      created_at: appointment.createdAt || new Date().toISOString()
    };
    if (SUPPORTS_JOB_PIPELINE) {
      const optionalMap = {
        status: 'status',
        address: 'address',
        quotedAmount: 'quoted_amount',
        invoiceAmount: 'invoice_amount',
        paidAmount: 'paid_amount'
      };
      Object.keys(optionalMap).forEach((k) => {
        if (appointment[k] !== undefined) row[optionalMap[k]] = appointment[k];
      });
    }
    return row;
  }

  // --- Customers ---
  async function createCustomer(customer) {
    const supabase = getClient();
    const row = {
      first_name: customer.firstName ?? null,
      last_name: customer.lastName ?? null,
      contact_number: customer.contactNumber ?? null,
      social_media_name: customer.socialMediaName ?? null,
      referral_notes: customer.referralNotes ?? null,
      referral_type: customer.referralType ?? null,
      address_line1: customer.addressLine1 ?? null,
      address_line2: customer.addressLine2 ?? null,
      suburb: customer.suburb ?? null,
      state: customer.state ?? null,
      postcode: customer.postcode ?? null,
      country: customer.country ?? null,
      updated_at: customer.updatedAt || new Date().toISOString()
    };
    const res = throwIfError(await supabase.from('customers').insert(row).select('id').single());
    return res.data.id;
  }

  async function updateCustomer(updated) {
    const supabase = getClient();
    const id = parseInt(updated.id);
    const row = {
      first_name: updated.firstName ?? null,
      last_name: updated.lastName ?? null,
      contact_number: updated.contactNumber ?? null,
      social_media_name: updated.socialMediaName ?? null,
      referral_notes: updated.referralNotes ?? null,
      referral_type: updated.referralType ?? null,
      address_line1: updated.addressLine1 ?? null,
      address_line2: updated.addressLine2 ?? null,
      suburb: updated.suburb ?? null,
      state: updated.state ?? null,
      postcode: updated.postcode ?? null,
      country: updated.country ?? null,
      updated_at: new Date().toISOString()
    };
    throwIfError(await supabase.from('customers').update(row).eq('id', id));
  }

  async function getCustomerById(id) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('customers').select('*').eq('id', parseInt(id)).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function getAllCustomers() {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('customers').select('*').order('id'));
    return (res.data || []).map(toCamel);
  }

  async function getRecentCustomers(limit = 10) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(limit));
    return (res.data || []).map(toCamel);
  }

  async function searchCustomers(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return getAllCustomers();
    const all = await getAllCustomers();
    return all.filter((c) => {
      const hay = [c.firstName, c.lastName, c.contactNumber, c.socialMediaName, c.addressLine1, c.addressLine2, c.suburb, c.state, c.postcode, c.country].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  async function deleteCustomer(id) {
    const supabase = getClient();
    const numId = parseInt(id);
    throwIfError(await supabase.from('appointments').delete().eq('customer_id', numId));
    throwIfError(await supabase.from('images').delete().eq('customer_id', numId));
    if (SUPPORTS_JOB_PIPELINE) {
      throwIfError(await supabase.from('reminders').delete().eq('customer_id', numId));
      throwIfError(await supabase.from('job_events').delete().eq('customer_id', numId));
    }
    const noteRes = await supabase.from('notes').select('id').eq('customer_id', numId);
    throwIfError(noteRes);
    const noteIds = (noteRes.data || []).map((r) => r.id);
    if (noteIds.length) throwIfError(await supabase.from('note_versions').delete().in('note_id', noteIds));
    throwIfError(await supabase.from('notes').delete().eq('customer_id', numId));
    throwIfError(await supabase.from('customers').delete().eq('id', numId));
  }

  // --- Appointments ---
  async function createAppointment(appointment) {
    const supabase = getClient();
    const row = buildAppointmentRow(appointment);
    if (row.customer_id == null) throw new Error('Appointment is missing customerId');
    if (!row.start) throw new Error('Appointment is missing start');
    const res = throwIfError(await supabase.from('appointments').insert(row).select('id').single());
    return res.data.id;
  }

  async function getAppointmentsBetween(startISO, endISO) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').gte('start', startISO).lte('start', endISO).order('start'));
    return (res.data || []).map(toCamel);
  }

  function getAppointmentsForDate(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return getAppointmentsBetween(start.toISOString(), end.toISOString());
  }

  async function getFutureAppointmentsForCustomer(customerId) {
    const numId = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
    if (customerId == null || customerId === '' || customerId === 'temp-new-customer' || Number.isNaN(numId)) {
      return [];
    }
    const now = new Date().toISOString();
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').eq('customer_id', numId).gte('start', now).order('start'));
    return (res.data || []).map(toCamel);
  }

  async function getAppointmentsForCustomer(customerId) {
    const numId = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
    if (customerId == null || customerId === '' || customerId === 'temp-new-customer' || Number.isNaN(numId)) {
      return [];
    }
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').eq('customer_id', numId).order('start'));
    return (res.data || []).map(toCamel);
  }

  async function getAllAppointments() {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').order('start'));
    return (res.data || []).map(toCamel);
  }

  async function getAppointmentsByStatus(status) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').eq('status', status).order('start'));
    return (res.data || []).map(toCamel);
  }

  async function getAppointmentsGroupedByStatus() {
    const all = await getAllAppointments();
    const grouped = {};
    all.forEach((apt) => {
      const key = apt.status || 'scheduled';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(apt);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => new Date(a.start) - new Date(b.start));
    });
    return grouped;
  }

  async function getUnpaidJobs() {
    const all = await getAllAppointments();
    return all.filter((apt) => {
      const invoiceAmount = apt.invoiceAmount || 0;
      const paidAmount = apt.paidAmount || 0;
      return invoiceAmount > 0 && paidAmount < invoiceAmount;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  async function getNeedsInvoiceJobs() {
    const all = await getAllAppointments();
    const completedStatuses = ['completed', 'invoiced', 'paid'];
    return all.filter((apt) => {
      const status = apt.status || 'scheduled';
      const invoiceAmount = apt.invoiceAmount || 0;
      return completedStatuses.includes(status) && invoiceAmount === 0;
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  function computePaymentStatus(appointment) {
    const quoted = appointment.quotedAmount || 0;
    const invoiced = appointment.invoiceAmount || 0;
    const paid = appointment.paidAmount || 0;
    if (paid > 0 && paid >= invoiced && invoiced > 0) return 'paid';
    if (paid > 0 && paid < invoiced) return 'part_paid';
    if (invoiced > 0) return 'invoiced';
    if (quoted > 0) return 'quoted';
    return 'not_quoted';
  }

  async function getAppointmentById(id) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').eq('id', parseInt(id)).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function updateAppointment(updated) {
    const supabase = getClient();
    const raw = toSnake(updated);
    const row = {};
    APPOINTMENT_COLUMNS.forEach((k) => {
      if (raw[k] !== undefined) row[k] = raw[k];
    });
    if (row.customer_id == null) {
      const inferredCustomerId = extractAppointmentCustomerId(updated);
      if (inferredCustomerId != null) row.customer_id = parseInt(inferredCustomerId, 10);
    }
    if (row.customer_id == null || Number.isNaN(row.customer_id)) throw new Error('Appointment is missing customerId');
    if (!row.start) throw new Error('Appointment is missing start');
    throwIfError(await supabase.from('appointments').update(row).eq('id', parseInt(updated.id)));
  }

  async function deleteAppointment(id) {
    const supabase = getClient();
    throwIfError(await supabase.from('appointments').delete().eq('id', parseInt(id)));
  }

  // --- Images ---
  async function addImage(customerId, entry, appointmentId = null) {
    const blob = await compressImage(entry.blob, entry.type);
    const dataUrl = await blobToDataURL(blob);
    const supabase = getClient();
    const row = { customer_id: parseInt(customerId), name: entry.name, type: entry.type || blob.type, data_url: dataUrl };
    if (appointmentId != null && appointmentId !== '') {
      const parsedAppointmentId = parseInt(appointmentId, 10);
      if (!Number.isNaN(parsedAppointmentId)) row.appointment_id = parsedAppointmentId;
    }
    const res = throwIfError(await supabase.from('images').insert(row).select('id').single());
    return res.data.id;
  }

  async function addImages(customerId, fileEntries) {
    const ids = [];
    for (const entry of fileEntries) {
      ids.push(await addImage(customerId, entry));
    }
    return ids;
  }

  async function getImagesByCustomerId(customerId) {
    const numId = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
    if (customerId == null || customerId === '' || customerId === 'temp-new-customer' || Number.isNaN(numId)) {
      return [];
    }
    const supabase = getClient();
    const res = throwIfError(await supabase.from('images').select('*').eq('customer_id', numId).order('created_at'));
    const list = res.data || [];
    return list.map((row) => {
      const c = toCamel(row);
      if (c.dataUrl) {
        try {
          c.blob = dataURLToBlob(c.dataUrl, c.type);
          if (c.blob && c.blob.size > 0) return c;
        } catch (e) {}
      }
      return c;
    }).filter((c) => c.blob || c.dataUrl);
  }

  async function getImagesByAppointmentId(appointmentId) {
    const numId = typeof appointmentId === 'number' ? appointmentId : parseInt(appointmentId, 10);
    if (appointmentId == null || appointmentId === '' || Number.isNaN(numId)) return [];
    const supabase = getClient();
    const res = await supabase.from('images').select('*').eq('appointment_id', numId).order('created_at');
    if (res.error && isMissingColumnError(res.error)) return [];
    throwIfError(res);
    const list = res.data || [];
    return list.map((row) => {
      const c = toCamel(row);
      if (c.dataUrl) {
        try {
          c.blob = dataURLToBlob(c.dataUrl, c.type);
          if (c.blob && c.blob.size > 0) return c;
        } catch (e) {}
      }
      return c;
    }).filter((c) => c.blob || c.dataUrl);
  }

  async function deleteImage(imageId) {
    const supabase = getClient();
    throwIfError(await supabase.from('images').delete().eq('id', parseInt(imageId)));
  }

  // --- Notes ---
  async function createNote(note) {
    const date = normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(new Date());
    const createdAt = normalizeDateTimeToISO(note.createdAt) || new Date().toISOString();
    const editedDate = note.editedDate ? normalizeDateTimeToISO(note.editedDate) : undefined;
    const supabase = getClient();
    const noteType = inferNoteType(note);
    const textValue = note.text ?? note.textValue ?? note.content ?? null;
    const supportsTypedColumns = await hasTypedNoteColumns();
    const row = {
      customer_id: parseInt(note.customerId),
      date: date,
      created_at: createdAt,
      edited_date: editedDate || null,
      svg: note.svg ?? null,
      note_number: note.noteNumber ?? null
    };
    if (supportsTypedColumns) {
      row.note_type = noteType;
      row.text_value = noteType === 'text' ? textValue : null;
      if (noteType === 'text') row.svg = null;
    }
    const res = throwIfError(await supabase.from('notes').insert(row).select('id').single());
    return res.data.id;
  }

  async function getNotesByCustomerId(customerId) {
    const numId = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
    if (customerId == null || customerId === '' || customerId === 'temp-new-customer' || Number.isNaN(numId)) {
      return [];
    }
    const supabase = getClient();
    const res = throwIfError(
      await supabase
        .from('notes')
        .select('*')
        .eq('customer_id', numId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
    );
    const list = (res.data || []).map(toCamel);
    list.sort(compareNotesByCreatedDesc);
    return list;
  }

  async function updateNote(updatedNote) {
    const supabase = getClient();
    const noteId = parseInt(updatedNote.id);
    const { data: existing } = throwIfError(await supabase.from('notes').select('*').eq('id', noteId).single());
    if (!existing) throw new Error('Note with id ' + noteId + ' not found');
    const existingCamel = toCamel(existing);
    const supportsTypedColumns = await hasTypedNoteColumns();
    const supportsTypedVersionColumns = await hasTypedNoteVersionColumns();
    const nextNoteType = inferNoteType(updatedNote);
    const nextTextValue = updatedNote.text ?? updatedNote.textValue ?? updatedNote.content ?? null;
    const existingType = existingCamel.noteType || inferNoteType(existingCamel);
    const existingText = existingCamel.text ?? existingCamel.textValue ?? existingCamel.content ?? null;
    const previousSvg = existingType === 'svg' ? (existingCamel.svg ?? null) : null;
    const nextSvg = nextNoteType === 'svg' ? (updatedNote.svg ?? existingCamel.svg ?? null) : null;
    const contentChanged = (
      existingType !== nextNoteType ||
      (existingType === 'svg' && previousSvg !== nextSvg) ||
      (existingType === 'text' && existingText !== nextTextValue)
    );
    if (contentChanged) {
      const versionRow = {
        note_id: noteId,
        svg: existingCamel.svg,
        edited_date: existingCamel.editedDate || null,
        saved_at: new Date().toISOString()
      };
      if (supportsTypedVersionColumns) {
        versionRow.note_type = existingType;
        versionRow.text_value = existingType === 'text' ? existingText : null;
        if (existingType === 'text') versionRow.svg = null;
      }
      throwIfError(await supabase.from('note_versions').insert(versionRow));
    }
    const merged = {
      ...existingCamel,
      ...updatedNote,
      id: existingCamel.id,
      date: updatedNote.date ? normalizeDateToYYYYMMDD(updatedNote.date) : (existingCamel.date || normalizeDateToYYYYMMDD(new Date())),
      editedDate: updatedNote.editedDate ? normalizeDateTimeToISO(updatedNote.editedDate) : existingCamel.editedDate,
      createdAt: existingCamel.createdAt || normalizeDateTimeToISO(updatedNote.createdAt) || new Date().toISOString()
    };
    // Only send real DB columns; UI-only fields like `source` must never be written.
    const row = {
      customer_id: parseInt(merged.customerId),
      date: merged.date || null,
      created_at: merged.createdAt || null,
      edited_date: merged.editedDate || null,
      svg: merged.svg ?? null,
      note_number: merged.noteNumber ?? null
    };
    if (supportsTypedColumns) {
      row.note_type = nextNoteType;
      row.text_value = nextNoteType === 'text' ? nextTextValue : null;
      if (nextNoteType === 'text') row.svg = null;
    }
    throwIfError(await supabase.from('notes').update(row).eq('id', noteId));
  }

  async function getNotePreviousVersion(noteId) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('note_versions').select('*').eq('note_id', parseInt(noteId)).order('saved_at', { ascending: false }).limit(1).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function restoreNoteToPreviousVersion(noteId) {
    const previousVersion = await getNotePreviousVersion(noteId);
    if (!previousVersion) throw new Error('No previous version found for this note');
    const supabase = getClient();
    const current = throwIfError(await supabase.from('notes').select('*').eq('id', parseInt(noteId)).single());
    const currentCamel = toCamel(current.data);
    const restored = {
      ...currentCamel,
      svg: previousVersion.svg,
      editedDate: previousVersion.editedDate || currentCamel.editedDate,
      restoredAt: new Date().toISOString()
    };
    const supportsTypedColumns = await hasTypedNoteColumns();
    const row = {
      customer_id: parseInt(restored.customerId),
      date: restored.date || null,
      created_at: restored.createdAt || null,
      edited_date: restored.editedDate || null,
      svg: restored.svg ?? null,
      note_number: restored.noteNumber ?? null
    };
    if (supportsTypedColumns) {
      const restoredType = restored.noteType || inferNoteType(restored);
      row.note_type = restoredType;
      row.text_value = restoredType === 'text' ? (restored.text ?? restored.textValue ?? restored.content ?? null) : null;
      if (restoredType === 'text') row.svg = null;
    }
    throwIfError(await supabase.from('notes').update(row).eq('id', parseInt(noteId)));
  }

  async function deleteNote(noteId) {
    const supabase = getClient();
    throwIfError(await supabase.from('note_versions').delete().eq('note_id', parseInt(noteId)));
    throwIfError(await supabase.from('notes').delete().eq('id', parseInt(noteId)));
  }

  async function getAllNotes() {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('notes').select('*').order('id'));
    return (res.data || []).map(toCamel);
  }

  // --- Tradie pipeline helpers (feature-gated by product profile) ---
  async function createReminder(reminder) {
    assertJobPipelineFeature('createReminder');
    const supabase = getClient();
    const row = toSnake(reminder);
    row.status = row.status || 'pending';
    row.created_at = row.created_at || new Date().toISOString();
    row.updated_at = row.updated_at || new Date().toISOString();
    const res = throwIfError(await supabase.from('reminders').insert(row).select('id').single());
    return res.data.id;
  }

  async function getReminderById(id) {
    if (!SUPPORTS_JOB_PIPELINE) return null;
    const supabase = getClient();
    const res = throwIfError(await supabase.from('reminders').select('*').eq('id', parseInt(id, 10)).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function getRemindersForCustomer(customerId) {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('reminders').select('*').eq('customer_id', parseInt(customerId, 10)).order('due_at'));
    return (res.data || []).map(toCamel);
  }

  async function getRemindersForAppointment(appointmentId) {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('reminders').select('*').eq('appointment_id', parseInt(appointmentId, 10)).order('due_at'));
    return (res.data || []).map(toCamel);
  }

  async function getPendingReminders() {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('reminders').select('*').eq('status', 'pending').order('due_at'));
    return (res.data || []).map(toCamel);
  }

  async function getOverdueReminders() {
    const pending = await getPendingReminders();
    const now = new Date();
    return pending.filter((r) => new Date(r.dueAt) < now);
  }

  async function getTodayReminders() {
    const pending = await getPendingReminders();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return pending.filter((r) => {
      const due = new Date(r.dueAt);
      return due >= start && due < end;
    });
  }

  async function getUpcomingReminders(days = 7) {
    const pending = await getPendingReminders();
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days + 1);
    return pending.filter((r) => {
      const due = new Date(r.dueAt);
      return due >= start && due < end;
    });
  }

  async function getAllReminders() {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('reminders').select('*').order('due_at'));
    return (res.data || []).map(toCamel);
  }

  async function updateReminder(updated) {
    assertJobPipelineFeature('updateReminder');
    const supabase = getClient();
    const row = toSnake(updated);
    row.updated_at = new Date().toISOString();
    throwIfError(await supabase.from('reminders').update(row).eq('id', parseInt(updated.id, 10)));
  }

  async function deleteReminder(id) {
    assertJobPipelineFeature('deleteReminder');
    const supabase = getClient();
    throwIfError(await supabase.from('reminders').delete().eq('id', parseInt(id, 10)));
  }

  const JOB_EVENT_TYPES = ['call', 'sms', 'email', 'site_visit', 'quote_sent', 'invoice_sent', 'payment_received', 'note', 'other'];

  async function createJobEvent(event) {
    assertJobPipelineFeature('createJobEvent');
    const supabase = getClient();
    const row = {
      appointment_id: parseInt(event.appointmentId, 10),
      customer_id: parseInt(event.customerId, 10),
      type: event.type || 'other',
      note: event.note || null,
      created_at: new Date().toISOString()
    };
    const res = throwIfError(await supabase.from('job_events').insert(row).select('id').single());
    return res.data.id;
  }

  async function getJobEventById(id) {
    if (!SUPPORTS_JOB_PIPELINE) return null;
    const supabase = getClient();
    const res = throwIfError(await supabase.from('job_events').select('*').eq('id', parseInt(id, 10)).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function getEventsForAppointment(appointmentId) {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('job_events').select('*').eq('appointment_id', parseInt(appointmentId, 10)).order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }

  async function getEventsForCustomer(customerId) {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('job_events').select('*').eq('customer_id', parseInt(customerId, 10)).order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }

  async function getRecentEventsForCustomer(customerId, limit = 5) {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('job_events').select('*').eq('customer_id', parseInt(customerId, 10)).order('created_at', { ascending: false }).limit(limit));
    return (res.data || []).map(toCamel);
  }

  async function getAllJobEvents() {
    if (!SUPPORTS_JOB_PIPELINE) return [];
    const supabase = getClient();
    const res = throwIfError(await supabase.from('job_events').select('*').order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }

  async function deleteJobEvent(id) {
    assertJobPipelineFeature('deleteJobEvent');
    const supabase = getClient();
    throwIfError(await supabase.from('job_events').delete().eq('id', parseInt(id, 10)));
  }

  async function getLastContactTime(customerId) {
    const events = await getEventsForCustomer(customerId);
    const contact = events.filter((e) => ['call', 'sms', 'email'].includes(e.type));
    return contact.length > 0 ? new Date(contact[0].createdAt) : null;
  }

  async function getStorageStats() {
    const supabase = getClient();
    const res = await supabase.from('images').select('id, data_url');
    if (res.error) return { imageCount: 0, totalBytes: 0, totalMB: '0.00', usagePercent: '0', isWarning: false, isCritical: false };
    const items = res.data || [];
    let totalBytes = 0;
    items.forEach((img) => {
      if (!img.data_url) return;
      const base64Len = img.data_url.length - (img.data_url.indexOf(',') + 1);
      totalBytes += base64Len * 0.75;
    });
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const usagePercent = Math.min(100, (totalBytes / (50 * 1024 * 1024)) * 100).toFixed(1);
    return {
      imageCount: items.length,
      totalBytes,
      totalMB,
      usagePercent,
      isWarning: totalBytes > 40 * 1024 * 1024,
      isCritical: totalBytes > 45 * 1024 * 1024
    };
  }

  // --- Recovery (Supabase-only: no localStorage) ---
  async function scanForCorruptedNotes() {
    const notes = await getAllNotes();
    const corrupted = [];
    const healthy = [];
    const isCorrupted = (n) => {
      if (!n) return true;
      const noteType = inferNoteType(n);
      const hasSvg = n.svg && typeof n.svg === 'string' && n.svg.trim().length > 0;
      const hasText = hasNonEmptyText(n.text) || hasNonEmptyText(n.textValue) || hasNonEmptyText(n.content);
      const hasDate = n.date || n.createdAt;
      if (!hasDate) return true;
      return noteType === 'text' ? !hasText : !hasSvg;
    };
    notes.forEach((n) => {
      if (isCorrupted(n)) corrupted.push({ noteId: n.id, customerId: n.customerId, source: 'supabase', corruptedVersion: n });
      else healthy.push({ noteId: n.id, customerId: n.customerId, note: n });
    });
    return { corrupted, healthy, localStorageOnly: [], indexeddbOnly: [], conflicts: [] };
  }

  async function recoverCorruptedNotes(dryRun = true) {
    const scan = await scanForCorruptedNotes();
    const actions = scan.corrupted.filter((c) => c.healthyVersion).map((c) => ({ noteId: c.noteId, customerId: c.customerId, healthyVersion: c.healthyVersion }));
    if (dryRun) return { canRecover: actions.length, actions, summary: scan };
    for (const a of actions) {
      await updateNote(a.healthyVersion);
    }
    return { recovered: actions.length, failed: 0, details: { recovered: actions, failed: [] }, summary: scan };
  }

  async function restoreNotesFromBackup(backupData, options = {}) {
    const { mode = 'merge', customerId = null } = options;
    const backupNotes = backupData.customerNotes || {};
    let notesToRestore = [];
    if (customerId) {
      const arr = backupNotes[String(customerId)] || [];
      notesToRestore = arr.map((n) => ({ ...n, customerId: parseInt(customerId) }));
    } else {
      for (const cid in backupNotes) {
        (backupNotes[cid] || []).forEach((n) => notesToRestore.push({ ...n, customerId: parseInt(cid) }));
      }
    }
    const results = { restored: [], skipped: [], failed: [] };
    for (const note of notesToRestore) {
      try {
        const noteType = inferNoteType(note);
        const hasSvg = note.svg && typeof note.svg === 'string' && note.svg.trim().length > 0;
        const hasText = hasNonEmptyText(note.text) || hasNonEmptyText(note.textValue) || hasNonEmptyText(note.content);
        const hasDate = note.date || note.createdAt;
        if (!hasDate || (noteType === 'svg' && !hasSvg) || (noteType === 'text' && !hasText)) {
          results.skipped.push({ noteId: note.id, customerId: note.customerId, reason: 'Backup note missing essential fields' });
          continue;
        }
        if (mode === 'replace' || true) {
          try {
            await updateNote(note);
            results.restored.push({ noteId: note.id, customerId: note.customerId, method: 'supabase', action: 'replaced' });
          } catch (e) {
            await createNote(note);
            results.restored.push({ noteId: note.id, customerId: note.customerId, method: 'supabase', action: 'added' });
          }
        }
      } catch (err) {
        results.failed.push({ noteId: note.id, customerId: note.customerId, error: err.message });
      }
    }
    return { restored: results.restored.length, skipped: results.skipped.length, failed: results.failed.length, details: results };
  }

  // --- Export / Import / Clear ---
  async function exportAllData() {
    const customers = await getAllCustomers();
    const appointments = await getAllAppointments();
    const notes = await getAllNotes();
    const reminders = await getAllReminders();
    const jobEvents = await getAllJobEvents();
    const customerNotes = {};
    notes.forEach((n) => {
      const cid = String(n.customerId);
      if (!customerNotes[cid]) customerNotes[cid] = [];
      customerNotes[cid].push(n);
    });
    const { imagesSerialized, warning } = await fetchImagesForExportSafe();
    return {
      __meta: {
        app: APP_SLUG,
        version: 3,
        exportedAt: new Date().toISOString(),
        warnings: warning ? [warning] : []
      },
      customers,
      appointments,
      customerNotes,
      images: imagesSerialized,
      reminders,
      jobEvents
    };
  }

  async function safeExportAllData(progressCallback = null) {
    if (progressCallback) progressCallback('Starting backup...', 0);
    const customers = await getAllCustomers();
    if (progressCallback) progressCallback('Exported ' + customers.length + ' customers', 10);
    const appointments = await getAllAppointments();
    if (progressCallback) progressCallback('Exported ' + appointments.length + ' appointments', 20);
    const notes = await getAllNotes();
    const reminders = await getAllReminders();
    const jobEvents = await getAllJobEvents();
    const customerNotes = {};
    notes.forEach((n) => {
      const cid = String(n.customerId);
      if (!customerNotes[cid]) customerNotes[cid] = [];
      customerNotes[cid].push(n);
    });
    if (progressCallback) progressCallback('Exported notes', 25);
    const { imagesSerialized, warning } = await fetchImagesForExportSafe();
    if (progressCallback) progressCallback('Backup complete!', 100);
    return {
      blob: new Blob([JSON.stringify({
        __meta: {
          app: APP_SLUG,
          version: 3,
          exportedAt: new Date().toISOString(),
          warnings: warning ? [warning] : []
        },
        customers,
        appointments,
        customerNotes,
        images: imagesSerialized,
        reminders,
        jobEvents
      }, null, 2)], { type: 'application/json' }),
      customers,
      appointments,
      imageCount: imagesSerialized.length
    };
  }

  async function exportDataWithoutImages(progressCallback = null) {
    if (progressCallback) progressCallback('Starting lightweight backup...', 0);
    const customers = await getAllCustomers();
    const appointments = await getAllAppointments();
    const notes = await getAllNotes();
    const customerNotes = {};
    notes.forEach((n) => {
      const cid = String(n.customerId);
      if (!customerNotes[cid]) customerNotes[cid] = [];
      customerNotes[cid].push(n);
    });
    if (progressCallback) progressCallback('Lightweight backup complete!', 100);
    const blob = new Blob([JSON.stringify({
      __meta: { app: APP_SLUG, version: 3, exportedAt: new Date().toISOString(), backupType: 'lightweight-no-images' },
      customers,
      appointments,
      customerNotes,
      images: []
    }, null, 2)], { type: 'application/json' });
    return { blob, customers, appointments, imageCount: 0 };
  }

  async function exportImagesOnly(progressCallback = null) {
    if (progressCallback) progressCallback('Starting images-only export...', 0);
    const { imagesSerialized, warning } = await fetchImagesForExportSafe();
    if (progressCallback) progressCallback('Creating images export file...', 85);
    const warnings = warning ? [warning] : [];
    function tryBuildBlob(imagesSubset) {
      const payload = {
        __meta: {
          app: APP_SLUG,
          version: 3,
          exportedAt: new Date().toISOString(),
          backupType: 'images-only',
          warnings
        },
        images: imagesSubset
      };
      return new Blob([JSON.stringify(payload)], { type: 'application/json' });
    }

    let blob = null;
    let exportedImages = imagesSerialized;
    try {
      blob = tryBuildBlob(imagesSerialized);
    } catch (e) {
      const msg = String(e && e.message ? e.message : e);
      const isTooLarge = msg.toLowerCase().indexOf('invalid string length') !== -1;
      if (!isTooLarge) throw e;

      // Browser string limits vary; find the largest subset we can serialize.
      let low = 0;
      let high = imagesSerialized.length;
      let bestCount = 0;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        try {
          const testBlob = tryBuildBlob(imagesSerialized.slice(0, mid));
          blob = testBlob;
          bestCount = mid;
          low = mid + 1;
        } catch {
          high = mid - 1;
        }
      }
      exportedImages = imagesSerialized.slice(0, bestCount);
      warnings.push(`Image export truncated by browser memory limits: exported ${bestCount}/${imagesSerialized.length} images.`);
      blob = tryBuildBlob(exportedImages);
    }
    if (progressCallback) progressCallback('Images-only export complete!', 100);
    return { blob, imageCount: exportedImages.length };
  }

  async function clearAllStores() {
    if (window.ALLOW_DESTRUCTIVE_WIPE !== true) {
      throw new Error('Destructive wipe is disabled in this environment.');
    }
    const supabase = getClient();
    // Preferred path: fast server-side TRUNCATE function (if migration is applied).
    const truncateResult = await supabase.rpc('truncate_all_data');
    if (!truncateResult.error) return;

    const BATCH_SIZE = 100;

    async function deleteByIdBatches(table, idColumn = 'id') {
      let loops = 0;
      while (true) {
        loops += 1;
        if (loops > 10000) throw new Error(`Wipe failed: too many delete loops for ${table}`);

        const fetchRes = throwIfError(
          await supabase.from(table).select(idColumn).order(idColumn, { ascending: true }).limit(BATCH_SIZE)
        );
        const ids = (fetchRes.data || []).map((r) => r[idColumn]).filter((v) => v != null);
        if (ids.length === 0) break;

        throwIfError(await supabase.from(table).delete().in(idColumn, ids));
      }
    }

    // Fallback path when truncate_all_data() is unavailable.
    // Delete customers in batches and rely on FK cascades for dependent rows.
    await deleteByIdBatches('customers', 'id');

    // Defensive cleanup if any rows remain (should usually be no-ops).
    await deleteByIdBatches('appointments', 'id');
    await deleteByIdBatches('images', 'id');
    await deleteByIdBatches('notes', 'id');
    await deleteByIdBatches('note_versions', 'id');
    if (SUPPORTS_JOB_PIPELINE) {
      await deleteByIdBatches('reminders', 'id');
      await deleteByIdBatches('job_events', 'id');
    }
  }

  async function importAllData(payload, options = {}) {
    const mode = options.mode || 'replace';
    const { customers = [], appointments = [], images = [], customerNotes = {}, reminders = [] } = payload || {};
    const hasImportedCustomers = Array.isArray(customers) && customers.length > 0;
    if (mode === 'replace') await clearAllStores();
    const supabase = getClient();
    const customerIdMap = {};
    const importedCustomerIds = new Set();
    const existingCustomerIds = new Set();

    function normalizeText(value) {
      return String(value || '').trim().toLowerCase();
    }

    function normalizePhone(value) {
      return String(value || '').replace(/[^\d+]/g, '');
    }

    function customerInsertRow(c) {
      return {
        first_name: c.firstName ?? null,
        last_name: c.lastName ?? null,
        contact_number: c.contactNumber ?? null,
        social_media_name: c.socialMediaName ?? null,
        referral_notes: c.referralNotes ?? null,
        referral_type: c.referralType ?? null,
        address_line1: c.addressLine1 ?? null,
        address_line2: c.addressLine2 ?? null,
        suburb: c.suburb ?? null,
        state: c.state ?? null,
        postcode: c.postcode ?? null,
        country: c.country ?? null,
        updated_at: c.updatedAt || new Date().toISOString()
      };
    }

    function customerUpdateRow(c) {
      return {
        first_name: c.firstName ?? null,
        last_name: c.lastName ?? null,
        contact_number: c.contactNumber ?? null,
        social_media_name: c.socialMediaName ?? null,
        referral_notes: c.referralNotes ?? null,
        referral_type: c.referralType ?? null,
        address_line1: c.addressLine1 ?? null,
        address_line2: c.addressLine2 ?? null,
        suburb: c.suburb ?? null,
        state: c.state ?? null,
        postcode: c.postcode ?? null,
        country: c.country ?? null,
        // Preserve source update timestamp during imports so chronology is not flattened.
        updated_at: c.updatedAt || new Date().toISOString()
      };
    }

    let mergeMatch = null;
    let mergeIndexCustomer = null;
    if (mode === 'merge') {
      const existingCustomers = await getAllCustomers();
      const byContact = new Map();
      const bySocial = new Map();
      const byNamePhone = new Map();

      function addUnique(map, key, customer) {
        if (!key) return;
        const arr = map.get(key) || [];
        arr.push(customer);
        map.set(key, arr);
      }

      function indexCustomerForMerge(ec) {
        if (!ec || ec.id == null) return;
        existingCustomerIds.add(parseInt(ec.id, 10));
        addUnique(byContact, normalizePhone(ec.contactNumber), ec);
        addUnique(bySocial, normalizeText(ec.socialMediaName), ec);
        addUnique(byNamePhone, `${normalizeText(ec.firstName)}|${normalizeText(ec.lastName)}|${normalizePhone(ec.contactNumber)}`, ec);
      }

      existingCustomers.forEach(indexCustomerForMerge);

      function pickUnique(map, key) {
        const arr = map.get(key) || [];
        return arr.length === 1 ? arr[0] : null;
      }

      mergeMatch = function findExistingCustomer(c) {
        const phoneKey = normalizePhone(c.contactNumber);
        const socialKey = normalizeText(c.socialMediaName);
        const namePhoneKey = `${normalizeText(c.firstName)}|${normalizeText(c.lastName)}|${phoneKey}`;

        // Prefer unique phone match, then unique social handle, then unique name+phone.
        if (phoneKey) {
          const hit = pickUnique(byContact, phoneKey);
          if (hit) return hit;
        }
        if (socialKey) {
          const hit = pickUnique(bySocial, socialKey);
          if (hit) return hit;
        }
        if (phoneKey) {
          const hit = pickUnique(byNamePhone, namePhoneKey);
          if (hit) return hit;
        }
        return null;
      };

      mergeIndexCustomer = function mergeIndexCustomerFn(customer) {
        indexCustomerForMerge(customer);
      };
    }

    for (const c of customers) {
      const oldId = c.id;
      let finalCustomerId = null;

      if (mode === 'merge' && typeof mergeMatch === 'function') {
        const existing = mergeMatch(c);
        if (existing && existing.id != null) {
          const updateRow = customerUpdateRow(c);
          throwIfError(await supabase.from('customers').update(updateRow).eq('id', parseInt(existing.id, 10)));
          finalCustomerId = parseInt(existing.id, 10);
        }
      }

      if (finalCustomerId == null) {
        const insertRow = customerInsertRow(c);
        const res = throwIfError(await supabase.from('customers').insert(insertRow).select('id').single());
        finalCustomerId = res.data.id;
      }

      if (mode === 'merge' && typeof mergeIndexCustomer === 'function') {
        mergeIndexCustomer({
          ...c,
          id: finalCustomerId
        });
      }

      importedCustomerIds.add(finalCustomerId);
      if (oldId != null) {
        const oldIdNum = parseInt(oldId, 10);
        customerIdMap[oldId] = finalCustomerId;
        customerIdMap[String(oldId)] = finalCustomerId;
        if (!Number.isNaN(oldIdNum)) customerIdMap[String(oldIdNum)] = finalCustomerId;
      }
    }

    function resolveImportedCustomerId(rawCustomerId) {
      if (rawCustomerId == null || rawCustomerId === '') return null;
      const parsed = parseInt(rawCustomerId, 10);
      const candidates = [rawCustomerId, String(rawCustomerId)];
      if (!Number.isNaN(parsed)) {
        candidates.push(parsed);
        candidates.push(String(parsed));
      }
      for (const key of candidates) {
        if (customerIdMap[key] != null) return customerIdMap[key];
      }
      // Only allow loose direct-ID fallback for payloads that intentionally contain
      // no customer rows (for example, images-only imports).
      if (!hasImportedCustomers) {
        if (!Number.isNaN(parsed) && importedCustomerIds.has(parsed)) return parsed;
        if (mode === 'merge' && !Number.isNaN(parsed) && existingCustomerIds.has(parsed)) return parsed;
      }
      return null;
    }

    function normalizeNoteMergeDate(value) {
      const ymd = normalizeDateToYYYYMMDD(value);
      if (ymd) return ymd;
      const iso = normalizeDateTimeToISO(value);
      if (!iso) return '';
      return iso.split('T')[0];
    }

    function noteSignatureKey(note, customerId) {
      const createdKey = normalizeDateTimeToISO(note && note.createdAt) || '';
      const dateKey = normalizeNoteMergeDate(note && note.date);
      const noteNumberKey = note && note.noteNumber != null ? String(note.noteNumber) : '';
      return `sig:${customerId}:${noteNumberKey}:${dateKey}:${createdKey}`;
    }

    function isStatementTimeout(errorLike) {
      const message = String(errorLike?.message || '');
      const code = String(errorLike?.code || '');
      return (
        code === '57014' ||
        message.indexOf('statement timeout') !== -1 ||
        message.indexOf('canceling statement due to statement timeout') !== -1
      );
    }

    async function insertRowsAdaptive(table, rows, initialChunkSize) {
      if (!Array.isArray(rows) || rows.length === 0) return 0;
      let inserted = 0;
      let idx = 0;
      let chunkSize = Math.max(1, Math.min(initialChunkSize, rows.length));
      while (idx < rows.length) {
        const slice = rows.slice(idx, idx + chunkSize);
        const res = await supabase.from(table).insert(slice);
        if (!res.error) {
          inserted += slice.length;
          idx += slice.length;
          continue;
        }
        if (!isStatementTimeout(res.error)) throwIfError(res);
        if (chunkSize <= 1) throwIfError(res);
        chunkSize = Math.max(1, Math.floor(chunkSize / 2));
      }
      return inserted;
    }

    function buildNoteRowForImport(note, supportsTypedColumns) {
      const date = normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(new Date());
      const createdAt = normalizeDateTimeToISO(note.createdAt) || new Date().toISOString();
      const editedDate = note.editedDate ? normalizeDateTimeToISO(note.editedDate) : null;
      const row = {
        customer_id: parseInt(note.customerId, 10),
        date: date,
        created_at: createdAt,
        edited_date: editedDate,
        svg: note.svg ?? null,
        note_number: note.noteNumber ?? null
      };
      if (supportsTypedColumns) {
        const noteType = inferNoteType(note);
        row.note_type = noteType;
        row.text_value = noteType === 'text' ? (note.text ?? note.textValue ?? note.content ?? null) : null;
        if (noteType === 'text') row.svg = null;
      }
      return row;
    }

    const mergeNoteById = new Map();
    const mergeNoteBySignature = new Map();
    function indexMergeNote(note) {
      if (!note || note.customerId == null || note.id == null) return;
      const customerIdNum = parseInt(note.customerId, 10);
      if (Number.isNaN(customerIdNum)) return;
      mergeNoteById.set(`id:${customerIdNum}:${String(note.id)}`, note);
      mergeNoteBySignature.set(noteSignatureKey(note, customerIdNum), note);
    }
    if (mode === 'merge') {
      const existingNotesRes = throwIfError(
        await supabase
          .from('notes')
          .select('id,customer_id,note_number,date,created_at,edited_date')
          .order('id', { ascending: true })
      );
      (existingNotesRes.data || []).map(toCamel).forEach(indexMergeNote);
    }

    const appointmentRows = [];
    for (const a of appointments) {
      const rawCustomerId = extractAppointmentCustomerId(a);
      const newCustomerId = resolveImportedCustomerId(rawCustomerId);
      if (newCustomerId == null) {
        throw new Error(`Import failed: appointment references missing customerId (${rawCustomerId})`);
      }
      const row = buildAppointmentRow(a, newCustomerId);
      if (!row.start) {
        throw new Error('Import failed: appointment is missing start date/time');
      }
      appointmentRows.push(row);
    }
    if (appointmentRows.length > 0) {
      await insertRowsAdaptive('appointments', appointmentRows, 100);
    }

    function flattenImportedNotes(noteInput) {
      const out = [];
      if (Array.isArray(noteInput)) {
        noteInput.forEach((note) => {
          if (note && typeof note === 'object') out.push(note);
        });
        return out;
      }
      if (noteInput && typeof noteInput === 'object') {
        Object.keys(noteInput).forEach((cid) => {
          const list = noteInput[cid] || [];
          if (!Array.isArray(list)) return;
          list.forEach((note) => {
            if (!note || typeof note !== 'object') return;
            out.push(note.customerId == null ? { ...note, customerId: parseInt(cid, 10) } : note);
          });
        });
      }
      return out;
    }

    const supportsTypedNoteCols = await hasTypedNoteColumns();
    const orphanNotes = [];
    const replaceModeNoteRows = [];
    const importedNotesList = flattenImportedNotes(customerNotes);
    for (const note of importedNotesList) {
      const rawCustomerId = note && note.customerId != null ? note.customerId : null;
      const newCid = resolveImportedCustomerId(rawCustomerId);
      if (newCid == null) {
        orphanNotes.push(rawCustomerId);
        continue;
      }
      const n = { ...note, customerId: newCid };
      if (mode === 'merge') {
        const idKey = `id:${newCid}:${String(note && note.id != null ? note.id : '')}`;
        const sigKey = noteSignatureKey(n, newCid);
        const existingById = note && note.id != null ? mergeNoteById.get(idKey) : null;
        const existingBySig = mergeNoteBySignature.get(sigKey);
        const existing = existingById || existingBySig || null;
        if (existing && existing.id != null) {
          const row = buildNoteRowForImport(n, supportsTypedNoteCols);
          throwIfError(await supabase.from('notes').update(row).eq('id', parseInt(existing.id, 10)));
          indexMergeNote({ ...existing, ...n, id: existing.id, customerId: newCid });
        } else {
          const createdId = await createNote(n);
          indexMergeNote({ ...n, id: createdId, customerId: newCid });
        }
      } else {
        replaceModeNoteRows.push(buildNoteRowForImport(n, supportsTypedNoteCols));
      }
    }
    if (mode !== 'merge' && replaceModeNoteRows.length > 0) {
      // Notes can contain large SVG payloads; start conservative and adapt down on timeout.
      await insertRowsAdaptive('notes', replaceModeNoteRows, 20);
    }
    if (orphanNotes.length > 0) {
      const unique = Array.from(new Set(orphanNotes.map((v) => String(v))));
      throw new Error(`Import failed: ${orphanNotes.length} note(s) reference missing customerId(s): ${unique.slice(0, 20).join(', ')}${unique.length > 20 ? ' ...' : ''}`);
    }

    const imageRows = [];
    for (const img of images || []) {
      const newCustomerId = resolveImportedCustomerId(img.customerId);
      if (newCustomerId == null) {
        throw new Error(`Import failed: image references missing customerId (${img.customerId})`);
      }
      imageRows.push({
        customer_id: newCustomerId,
        name: img.name,
        type: img.type,
        data_url: img.dataUrl,
        created_at: img.createdAt
      });
    }
    if (imageRows.length > 0) {
      // Image rows can be very large due to data_url payloads.
      await insertRowsAdaptive('images', imageRows, 8);
    }

    if (SUPPORTS_JOB_PIPELINE && Array.isArray(reminders) && reminders.length > 0) {
      for (const reminder of reminders) {
        const mappedCustomerId = resolveImportedCustomerId(reminder.customerId);
        if (mappedCustomerId == null) continue;
        const row = toSnake({
          ...reminder,
          customerId: mappedCustomerId
        });
        delete row.id;
        row.created_at = row.created_at || new Date().toISOString();
        row.updated_at = row.updated_at || new Date().toISOString();
        throwIfError(await supabase.from('reminders').insert(row));
      }
    }
  }

  const dbAPI = {
    getSession,
    signInWithPassword,
    signOut,
    onAuthStateChange,
    claimUnownedData,
    deleteMyData,
    dbName: productConfig.dbName || profileConfig.dbName || 'crm-db',
    storagePrefix: STORAGE_PREFIX,
    createCustomer,
    updateCustomer,
    getCustomerById,
    getAllCustomers,
    getRecentCustomers,
    getAllAppointments,
    getAppointmentsByStatus,
    getAppointmentsGroupedByStatus,
    getUnpaidJobs,
    getNeedsInvoiceJobs,
    computePaymentStatus,
    searchCustomers,
    addImages,
    addImage,
    getImagesByCustomerId,
    getImagesByAppointmentId,
    deleteImage,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    deleteCustomer,
    getAppointmentsBetween,
    getAppointmentsForDate,
    getFutureAppointmentsForCustomer,
    getAppointmentsForCustomer,
    getAppointmentById,
    fileListToEntries,
    exportAllData,
    safeExportAllData,
    exportDataWithoutImages,
    exportImagesOnly,
    importAllData,
    clearAllStores,
    createNote,
    getNotesByCustomerId,
    updateNote,
    deleteNote,
    getAllNotes,
    createReminder,
    getReminderById,
    getRemindersForCustomer,
    getRemindersForAppointment,
    getAllReminders,
    getPendingReminders,
    getOverdueReminders,
    getTodayReminders,
    getUpcomingReminders,
    updateReminder,
    deleteReminder,
    createJobEvent,
    getJobEventById,
    getEventsForAppointment,
    getEventsForCustomer,
    getRecentEventsForCustomer,
    getAllJobEvents,
    deleteJobEvent,
    getLastContactTime,
    getStorageStats,
    JOB_EVENT_TYPES,
    scanForCorruptedNotes,
    recoverCorruptedNotes,
    restoreNotesFromBackup,
    getNotePreviousVersion,
    restoreNoteToPreviousVersion
  };
  window.ChikasDBSupabase = dbAPI;
  window.CrmDB = dbAPI;
})();
