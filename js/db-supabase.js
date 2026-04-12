/* Supabase backend for CRMicro (hairdresser schema). Same API as db.js. */
(function () {
  const SCHEMA = window.SUPABASE_SCHEMA || 'hairdresser';
  var cachedClient = null;

  function getClient() {
    if (cachedClient) return cachedClient;
    if (window.SupabaseClient) {
      cachedClient = window.SupabaseClient;
      return cachedClient;
    }
    const url = window.SUPABASE_URL || '';
    const key = window.SUPABASE_ANON_KEY || '';
    if (!url || !key) throw new Error('Supabase: SUPABASE_URL and SUPABASE_ANON_KEY must be set when USE_SUPABASE is true.');
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

  function toSnake(obj) {
    if (obj == null) return obj;
    const map = {
      firstName: 'first_name', lastName: 'last_name', contactNumber: 'contact_number',
      socialMediaName: 'social_media_name', referralNotes: 'referral_notes', referralType: 'referral_type',
      addressLine1: 'address_line1', addressLine2: 'address_line2', suburb: 'suburb', state: 'state', postcode: 'postcode', country: 'country',
      updatedAt: 'updated_at', customerId: 'customer_id', createdAt: 'created_at',
      editedDate: 'edited_date', noteNumber: 'note_number', dataUrl: 'data_url',
      noteId: 'note_id', savedAt: 'saved_at'
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
      note_id: 'noteId', saved_at: 'savedAt'
    };
    const out = {};
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const key = map[k] || k;
      out[key] = obj[k];
    }
    return out;
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
    if (!isMissingRpc) throwIfError(rpcRes);

    // Fallback path for environments where migration has not been applied yet.
    const session = await getSession();
    const uid = session?.user?.id;
    if (!uid) throw new Error('Not authenticated');

    let deleted = { customers: 0, appointments: 0, images: 0, notes: 0, noteVersions: 0, fallback: true };
    const delNoteVersions = await supabase.from('note_versions').delete().eq('owner_user_id', uid).select('id');
    throwIfError(delNoteVersions); deleted.noteVersions = (delNoteVersions.data || []).length;
    const delNotes = await supabase.from('notes').delete().eq('owner_user_id', uid).select('id');
    throwIfError(delNotes); deleted.notes = (delNotes.data || []).length;
    const delImages = await supabase.from('images').delete().eq('owner_user_id', uid).select('id');
    throwIfError(delImages); deleted.images = (delImages.data || []).length;
    const delAppointments = await supabase.from('appointments').delete().eq('owner_user_id', uid).select('id');
    throwIfError(delAppointments); deleted.appointments = (delAppointments.data || []).length;
    const delCustomers = await supabase.from('customers').delete().eq('owner_user_id', uid).select('id');
    throwIfError(delCustomers); deleted.customers = (delCustomers.data || []).length;
    return deleted;
  }

  function extractAppointmentCustomerId(appointment) {
    if (!appointment || typeof appointment !== 'object') return null;
    return appointment.customerId ?? (appointment.extendedProps && appointment.extendedProps.customerId) ?? null;
  }

  function buildAppointmentRow(appointment, customerIdOverride) {
    const rawCustomerId = customerIdOverride != null ? customerIdOverride : extractAppointmentCustomerId(appointment);
    const customerId = rawCustomerId == null ? null : parseInt(rawCustomerId, 10);
    return {
      customer_id: Number.isNaN(customerId) ? null : customerId,
      start: appointment.start || null,
      end: appointment.end || null,
      title: appointment.title || null,
      created_at: appointment.createdAt || new Date().toISOString()
    };
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

  async function getAppointmentById(id) {
    const supabase = getClient();
    const res = throwIfError(await supabase.from('appointments').select('*').eq('id', parseInt(id)).maybeSingle());
    return res.data ? toCamel(res.data) : null;
  }

  async function updateAppointment(updated) {
    const supabase = getClient();
    const row = buildAppointmentRow(updated);
    if (row.customer_id == null) throw new Error('Appointment is missing customerId');
    if (!row.start) throw new Error('Appointment is missing start');
    throwIfError(await supabase.from('appointments').update(row).eq('id', parseInt(updated.id)));
  }

  async function deleteAppointment(id) {
    const supabase = getClient();
    throwIfError(await supabase.from('appointments').delete().eq('id', parseInt(id)));
  }

  // --- Images ---
  async function addImage(customerId, entry) {
    const blob = await compressImage(entry.blob, entry.type);
    const dataUrl = await blobToDataURL(blob);
    const supabase = getClient();
    const row = { customer_id: parseInt(customerId), name: entry.name, type: entry.type || blob.type, data_url: dataUrl };
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

  async function deleteImage(imageId) {
    const supabase = getClient();
    throwIfError(await supabase.from('images').delete().eq('id', parseInt(imageId)));
  }

  // --- Notes ---
  async function createNote(note) {
    const date = normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(new Date());
    const createdAt = normalizeDateToYYYYMMDD(note.createdAt) || new Date().toISOString().split('T')[0];
    const editedDate = note.editedDate ? normalizeDateToYYYYMMDD(note.editedDate) : undefined;
    const supabase = getClient();
    const row = {
      customer_id: parseInt(note.customerId),
      date: date,
      created_at: createdAt,
      edited_date: editedDate || null,
      svg: note.svg ?? null,
      note_number: note.noteNumber ?? null
    };
    const res = throwIfError(await supabase.from('notes').insert(row).select('id').single());
    return res.data.id;
  }

  async function getNotesByCustomerId(customerId) {
    const numId = typeof customerId === 'number' ? customerId : parseInt(customerId, 10);
    if (customerId == null || customerId === '' || customerId === 'temp-new-customer' || Number.isNaN(numId)) {
      return [];
    }
    const supabase = getClient();
    const res = throwIfError(await supabase.from('notes').select('*').eq('customer_id', numId).order('created_at', { ascending: false }));
    const list = (res.data || []).map(toCamel);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }

  async function updateNote(updatedNote) {
    const supabase = getClient();
    const noteId = parseInt(updatedNote.id);
    const { data: existing } = throwIfError(await supabase.from('notes').select('*').eq('id', noteId).single());
    if (!existing) throw new Error('Note with id ' + noteId + ' not found');
    const existingCamel = toCamel(existing);
    if (existingCamel.svg && existingCamel.svg !== updatedNote.svg) {
      throwIfError(await supabase.from('note_versions').insert({
        note_id: noteId,
        svg: existingCamel.svg,
        edited_date: existingCamel.editedDate || null,
        saved_at: new Date().toISOString()
      }));
    }
    const merged = {
      ...existingCamel,
      ...updatedNote,
      id: existingCamel.id,
      date: updatedNote.date ? normalizeDateToYYYYMMDD(updatedNote.date) : (existingCamel.date || normalizeDateToYYYYMMDD(new Date())),
      editedDate: updatedNote.editedDate ? normalizeDateToYYYYMMDD(updatedNote.editedDate) : existingCamel.editedDate,
      createdAt: existingCamel.createdAt || normalizeDateToYYYYMMDD(updatedNote.createdAt) || new Date().toISOString().split('T')[0]
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
    const row = {
      customer_id: parseInt(restored.customerId),
      date: restored.date || null,
      created_at: restored.createdAt || null,
      edited_date: restored.editedDate || null,
      svg: restored.svg ?? null,
      note_number: restored.noteNumber ?? null
    };
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

  // --- Recovery (Supabase-only: no localStorage) ---
  async function scanForCorruptedNotes() {
    const notes = await getAllNotes();
    const corrupted = [];
    const healthy = [];
    const isCorrupted = (n) => {
      if (!n) return true;
      const hasSvg = n.svg && typeof n.svg === 'string' && n.svg.length > 10;
      const hasDate = n.date || n.createdAt;
      return !hasSvg || !hasDate;
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
        const hasSvg = note.svg && typeof note.svg === 'string' && note.svg.length > 10;
        const hasDate = note.date || note.createdAt;
        if (!hasSvg || !hasDate) {
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
    const customerNotes = {};
    notes.forEach((n) => {
      const cid = String(n.customerId);
      if (!customerNotes[cid]) customerNotes[cid] = [];
      customerNotes[cid].push(n);
    });
    const images = await getClient().from('images').select('*').then((r) => { throwIfError(r); return r.data || []; });
    const imagesSerialized = images.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      dataUrl: row.data_url
    }));
    return {
      __meta: { app: 'chikas-db', version: 3, exportedAt: new Date().toISOString() },
      customers,
      appointments,
      customerNotes,
      images: imagesSerialized
    };
  }

  async function safeExportAllData(progressCallback = null) {
    if (progressCallback) progressCallback('Starting backup...', 0);
    const customers = await getAllCustomers();
    if (progressCallback) progressCallback('Exported ' + customers.length + ' customers', 10);
    const appointments = await getAllAppointments();
    if (progressCallback) progressCallback('Exported ' + appointments.length + ' appointments', 20);
    const notes = await getAllNotes();
    const customerNotes = {};
    notes.forEach((n) => {
      const cid = String(n.customerId);
      if (!customerNotes[cid]) customerNotes[cid] = [];
      customerNotes[cid].push(n);
    });
    if (progressCallback) progressCallback('Exported notes', 25);
    const images = await getClient().from('images').select('*').then((r) => { throwIfError(r); return r.data || []; });
    const imagesSerialized = images.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      dataUrl: row.data_url
    }));
    if (progressCallback) progressCallback('Backup complete!', 100);
    return {
      blob: new Blob([JSON.stringify({
        __meta: { app: 'chikas-db', version: 3, exportedAt: new Date().toISOString() },
        customers,
        appointments,
        customerNotes,
        images: imagesSerialized
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
      __meta: { app: 'chikas-db', version: 3, exportedAt: new Date().toISOString(), backupType: 'lightweight-no-images' },
      customers,
      appointments,
      customerNotes,
      images: []
    }, null, 2)], { type: 'application/json' });
    return { blob, customers, appointments, imageCount: 0 };
  }

  async function exportImagesOnly(progressCallback = null) {
    if (progressCallback) progressCallback('Starting images-only export...', 0);
    const images = await getClient().from('images').select('*').then((r) => { throwIfError(r); return r.data || []; });
    const imagesSerialized = images.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      name: row.name,
      type: row.type,
      createdAt: row.created_at,
      dataUrl: row.data_url
    }));
    if (progressCallback) progressCallback('Creating images export file...', 85);
    const blob = new Blob([JSON.stringify({
      __meta: { app: 'chikas-db', version: 3, exportedAt: new Date().toISOString(), backupType: 'images-only' },
      images: imagesSerialized
    }, null, 2)], { type: 'application/json' });
    if (progressCallback) progressCallback('Images-only export complete!', 100);
    return { blob, imageCount: imagesSerialized.length };
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
  }

  async function importAllData(payload, options = {}) {
    const mode = options.mode || 'replace';
    const { customers = [], appointments = [], images = [], customerNotes = {} } = payload || {};
    if (mode === 'replace') await clearAllStores();
    const supabase = getClient();
    const customerIdMap = {};
    const importedCustomerIds = new Set();

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
        updated_at: new Date().toISOString()
      };
    }

    let mergeMatch = null;
    if (mode === 'merge') {
      const existingCustomers = await getAllCustomers();
      const byId = new Map();
      const byContact = new Map();
      const bySocial = new Map();
      const byNamePhone = new Map();

      function addUnique(map, key, customer) {
        if (!key) return;
        const arr = map.get(key) || [];
        arr.push(customer);
        map.set(key, arr);
      }

      existingCustomers.forEach((ec) => {
        byId.set(String(ec.id), ec);
        addUnique(byContact, normalizePhone(ec.contactNumber), ec);
        addUnique(bySocial, normalizeText(ec.socialMediaName), ec);
        addUnique(byNamePhone, `${normalizeText(ec.firstName)}|${normalizeText(ec.lastName)}|${normalizePhone(ec.contactNumber)}`, ec);
      });

      function pickUnique(map, key) {
        const arr = map.get(key) || [];
        return arr.length === 1 ? arr[0] : null;
      }

      mergeMatch = function findExistingCustomer(c) {
        const oldIdKey = c && c.id != null ? String(c.id) : '';
        if (oldIdKey && byId.has(oldIdKey)) return byId.get(oldIdKey);

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
      if (!Number.isNaN(parsed) && importedCustomerIds.has(parsed)) return parsed;
      return null;
    }

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
      throwIfError(await supabase.from('appointments').insert(row));
    }

    const orphanNotes = [];
    for (const cid in customerNotes || {}) {
      for (const note of customerNotes[cid] || []) {
        const rawCustomerId = note && note.customerId != null ? note.customerId : cid;
        const newCid = resolveImportedCustomerId(rawCustomerId);
        if (newCid == null) {
          orphanNotes.push(rawCustomerId);
          continue;
        }
        const n = { ...note, customerId: newCid };
        await createNote(n);
      }
    }
    if (orphanNotes.length > 0) {
      const unique = Array.from(new Set(orphanNotes.map((v) => String(v))));
      throw new Error(`Import failed: ${orphanNotes.length} note(s) reference missing customerId(s): ${unique.slice(0, 20).join(', ')}${unique.length > 20 ? ' ...' : ''}`);
    }

    for (const img of images || []) {
      const newCustomerId = resolveImportedCustomerId(img.customerId);
      if (newCustomerId == null) {
        throw new Error(`Import failed: image references missing customerId (${img.customerId})`);
      }
      throwIfError(await supabase.from('images').insert({
        customer_id: newCustomerId,
        name: img.name,
        type: img.type,
        data_url: img.dataUrl,
        created_at: img.createdAt
      }));
    }
  }

  const dbAPI = {
    getSession,
    signInWithPassword,
    signOut,
    onAuthStateChange,
    claimUnownedData,
    deleteMyData,
    createCustomer,
    updateCustomer,
    getCustomerById,
    getAllCustomers,
    getRecentCustomers,
    getAllAppointments,
    searchCustomers,
    addImages,
    addImage,
    getImagesByCustomerId,
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
    scanForCorruptedNotes,
    recoverCorruptedNotes,
    restoreNotesFromBackup,
    getNotePreviousVersion,
    restoreNoteToPreviousVersion
  };
  window.ChikasDBSupabase = dbAPI;
  window.CrmDB = dbAPI;
})();
