/**
 * Supabase-backed database layer for TradieCRM
 * Same API as db.js (CrmDB). Maps snake_case (Supabase) <-> camelCase (app).
 * Requires: window.SupabaseClient, window.ProductConfig
 */
(function () {
  'use strict';

  var config = window.ProductConfig || {};
  var STORAGE_PREFIX = config.storagePrefix || 'tradie_';
  var APP_SLUG = config.appSlug || 'tradie-crm';
  var SUPABASE_SCHEMA = config.supabaseSchema || 'public';
  var supabase = null;
  var cachedTypedNoteColumns = null;
  var cachedTypedNoteVersionColumns = null;

  function initSupabaseClient() {
    if (window.SupabaseClient) return window.SupabaseClient;
    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      try {
        var client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
          db: { schema: SUPABASE_SCHEMA }
        });
        window.SupabaseClient = client;
        return client;
      } catch (e) {
        console.warn('[dbSupabase] Failed to create schema-aware client, falling back to default client:', e && e.message ? e.message : e);
      }
    }
    return window.SupabaseClient || null;
  }

  supabase = initSupabaseClient();

  if (!supabase) {
    console.error('[dbSupabase] SupabaseClient not found. Load supabaseClient.js first.');
    window.CrmDB = {};
    return;
  }

  console.log('[dbSupabase] Using Supabase backend (schema: ' + SUPABASE_SCHEMA + ')');

  // ---- Key mapping: snake_case <-> camelCase ----
  function toSnakeKey(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }
  function toCamelKey(str) {
    return str.replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); });
  }
  function toSnake(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(toSnake);
    if (typeof obj !== 'object') return obj;
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[toSnakeKey(k)] = toSnake(obj[k]);
    }
    return out;
  }
  function toCamel(obj) {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(toCamel);
    if (typeof obj !== 'object') return obj;
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[toCamelKey(k)] = toCamel(obj[k]);
    }
    return out;
  }

  function hasNonEmptyText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function inferNoteType(note) {
    if (note && (note.noteType === 'svg' || note.type === 'svg')) return 'svg';
    var hasText = !!(note && (hasNonEmptyText(note.text) || hasNonEmptyText(note.textValue) || hasNonEmptyText(note.content)));
    var hasSvg = !!(note && hasNonEmptyText(note.svg));
    if (note && (note.noteType === 'text' || note.type === 'text')) {
      if (hasText || !hasSvg) return 'text';
      return 'svg';
    }
    if (hasText) return 'text';
    return 'svg';
  }

  function isMissingColumnError(errorLike) {
    var code = String((errorLike && errorLike.code) || '');
    var msg = String((errorLike && errorLike.message) || '').toLowerCase();
    return code === '42703' || (msg.indexOf('column') !== -1 && msg.indexOf('does not exist') !== -1);
  }

  async function hasTypedNoteColumns() {
    if (cachedTypedNoteColumns != null) return cachedTypedNoteColumns;
    var probe = await supabase.from('notes').select('id,note_type,text_value').limit(1);
    if (probe.error && isMissingColumnError(probe.error)) {
      cachedTypedNoteColumns = false;
      return false;
    }
    check(probe);
    cachedTypedNoteColumns = true;
    return true;
  }

  async function hasTypedNoteVersionColumns() {
    if (cachedTypedNoteVersionColumns != null) return cachedTypedNoteVersionColumns;
    var probe = await supabase.from('note_versions').select('id,note_type,text_value').limit(1);
    if (probe.error && isMissingColumnError(probe.error)) {
      cachedTypedNoteVersionColumns = false;
      return false;
    }
    check(probe);
    cachedTypedNoteVersionColumns = true;
    return true;
  }

  function check(res) {
    if (res.error) throw new Error(res.error.message || 'Supabase error');
    return res;
  }

  async function fetchImagesForExportSafe() {
    try {
      var pageSize = 50; // Fetch lightweight metadata in larger pages.
      var images = [];
      var skippedImageIds = [];
      var from = 0;

      while (true) {
        var to = from + pageSize - 1;
        var imgRes = check(
          await supabase
            .from('images')
            .select('id,customer_id,name,type,created_at')
            .order('id', { ascending: true })
            .range(from, to)
        );
        var page = imgRes.data || [];
        if (page.length === 0) break;
        for (var i = 0; i < page.length; i++) {
          var row = page[i];
          var dataRes = null;
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
          images.push(toCamel({
            id: row.id,
            customer_id: row.customer_id,
            name: row.name,
            type: row.type,
            created_at: row.created_at,
            data_url: dataRes.data.data_url
          }));
        }
        if (page.length < pageSize) break;
        from += pageSize;
      }

      var warning = null;
      if (skippedImageIds.length > 0) {
        warning = 'Skipped ' + skippedImageIds.length + ' image(s) that could not be read: ' +
          skippedImageIds.slice(0, 20).join(', ') +
          (skippedImageIds.length > 20 ? ' ...' : '');
        console.warn('[Backup]', warning);
      }
      return { images: images, warning: warning };
    } catch (error) {
      var warning = 'Images export skipped: ' + (error && error.message ? error.message : String(error));
      console.warn('[Backup]', warning);
      return { images: [], warning: warning };
    }
  }

  async function getSession() {
    var res = await supabase.auth.getSession();
    check(res);
    return res.data && res.data.session ? res.data.session : null;
  }

  async function signInWithPassword(email, password) {
    var res = await supabase.auth.signInWithPassword({ email: email, password: password });
    check(res);
    return res.data && res.data.session ? res.data.session : null;
  }

  async function signOut() {
    var res = await supabase.auth.signOut();
    check(res);
  }

  function onAuthStateChange(callback) {
    var res = supabase.auth.onAuthStateChange(function (event, session) {
      if (typeof callback === 'function') callback(event, session);
    });
    return res && res.data ? res.data.subscription : null;
  }

  async function claimUnownedData() {
    // Deliberately gated behind two explicit flags to avoid accidental ownership reassignment
    // in shared/live environments.
    if (window.ENABLE_AUTO_CLAIM_UNOWNED_DATA !== true || window.ALLOW_UNOWNED_CLAIM_RPC !== true) {
      console.warn('[dbSupabase] claim_unowned_data blocked (set ENABLE_AUTO_CLAIM_UNOWNED_DATA=true and ALLOW_UNOWNED_CLAIM_RPC=true to enable).');
      return null;
    }
    var res = await supabase.rpc('claim_unowned_data');
    check(res);
    return res.data;
  }

  async function deleteMyData() {
    var rpcRes = await supabase.rpc('delete_my_data');
    if (!rpcRes.error) return rpcRes.data;

    var msg = String(rpcRes.error.message || '');
    var code = String(rpcRes.error.code || '');
    var isMissingRpc =
      code === 'PGRST202' ||
      msg.indexOf('Could not find the function') !== -1 ||
      msg.indexOf('delete_my_data') !== -1;
    if (!isMissingRpc) check(rpcRes);

    // Fallback for environments where migration has not run yet.
    var session = await getSession();
    var uid = session && session.user ? session.user.id : null;
    if (!uid) throw new Error('Not authenticated');

    var deleted = { customers: 0, appointments: 0, images: 0, notes: 0, noteVersions: 0, reminders: 0, jobEvents: 0, fallback: true };
    var delNoteVersions = await supabase.from('note_versions').delete().eq('owner_user_id', uid).select('id'); check(delNoteVersions); deleted.noteVersions = (delNoteVersions.data || []).length;
    var delNotes = await supabase.from('notes').delete().eq('owner_user_id', uid).select('id'); check(delNotes); deleted.notes = (delNotes.data || []).length;
    var delImages = await supabase.from('images').delete().eq('owner_user_id', uid).select('id'); check(delImages); deleted.images = (delImages.data || []).length;
    var delReminders = await supabase.from('reminders').delete().eq('owner_user_id', uid).select('id'); check(delReminders); deleted.reminders = (delReminders.data || []).length;
    var delJobEvents = await supabase.from('job_events').delete().eq('owner_user_id', uid).select('id'); check(delJobEvents); deleted.jobEvents = (delJobEvents.data || []).length;
    var delAppointments = await supabase.from('appointments').delete().eq('owner_user_id', uid).select('id'); check(delAppointments); deleted.appointments = (delAppointments.data || []).length;
    var delCustomers = await supabase.from('customers').delete().eq('owner_user_id', uid).select('id'); check(delCustomers); deleted.customers = (delCustomers.data || []).length;
    return deleted;
  }

  // ---- Helpers (same as db.js for addImage) ----
  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(blob);
    });
  }
  function dataURLToBlob(dataUrl, fallbackType) {
    try {
      var parts = String(dataUrl || '').split(',');
      var meta = parts[0] || '';
      var base64 = parts[1] || '';
      if (!base64) return new Blob([], { type: fallbackType || 'application/octet-stream' });
      var mimeMatch = /data:([^;]+);base64/.exec(meta);
      var mime = mimeMatch ? mimeMatch[1] : (fallbackType || 'application/octet-stream');
      var binary = atob(base64);
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    } catch (e) {
      return new Blob([], { type: fallbackType || 'application/octet-stream' });
    }
  }

  async function hydrateImageRow(row) {
    var img = toCamel(row);
    var dataUrl = img.dataUrl || null;

    if (!dataUrl && img.filePath && window.FileSystemDriver && typeof window.FileSystemDriver.loadImage === 'function') {
      try {
        dataUrl = await window.FileSystemDriver.loadImage(img.filePath);
      } catch (e) {
        dataUrl = null;
      }
    }

    if (!dataUrl) return null;
    var blob = dataURLToBlob(dataUrl, img.type);
    if (!blob || blob.size === 0) return null;

    img.dataUrl = dataUrl;
    img.blob = blob;
    return img;
  }
  function fileToEntry(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var blob = new Blob([reader.result], { type: file.type });
        resolve({ name: file.name, type: file.type, blob: blob });
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(file);
    });
  }
  async function fileListToEntries(fileList) {
    var files = Array.from(fileList || []);
    return Promise.all(files.map(fileToEntry));
  }

  // ---- Customers ----
  async function createCustomer(customer) {
    var row = toSnake(customer);
    row.created_at = row.created_at || new Date().toISOString();
    row.updated_at = row.updated_at || new Date().toISOString();
    var res = check(await supabase.from('customers').insert(row).select('id').single());
    return res.data.id;
  }
  function updateCustomer(updated) {
    var row = toSnake(updated);
    row.updated_at = new Date().toISOString();
    return supabase.from('customers').update(row).eq('id', parseInt(updated.id)).then(check);
  }
  async function getCustomerById(id) {
    var res = check(await supabase.from('customers').select('*').eq('id', parseInt(id)).single());
    return res.data ? toCamel(res.data) : null;
  }
  async function getAllCustomers() {
    var res = check(await supabase.from('customers').select('*').order('id'));
    return (res.data || []).map(toCamel);
  }
  async function getRecentCustomers(limit) {
    var res = check(await supabase.from('customers').select('*').order('updated_at', { ascending: false }).limit(limit || 10));
    return (res.data || []).map(toCamel);
  }
  async function searchCustomers(query) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return getAllCustomers();
    var all = await getAllCustomers();
    return all.filter(function (c) {
      var hay = [c.firstName, c.lastName, c.contactNumber, c.socialMediaName, c.addressLine1, c.suburb, c.state, c.postcode].filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }
  async function deleteCustomer(id) {
    await supabase.from('appointments').delete().eq('customer_id', parseInt(id)).then(check);
    await supabase.from('images').delete().eq('customer_id', parseInt(id)).then(check);
    await supabase.from('notes').delete().eq('customer_id', parseInt(id)).then(check);
    await supabase.from('reminders').delete().eq('customer_id', parseInt(id)).then(check);
    await supabase.from('job_events').delete().eq('customer_id', parseInt(id)).then(check);
    return supabase.from('customers').delete().eq('id', parseInt(id)).then(check);
  }

  // ---- Appointments ----
  var APPOINTMENT_COLUMNS = ['customer_id', 'title', 'start', 'end', 'status', 'address', 'quoted_amount', 'invoice_amount', 'paid_amount', 'created_at'];
  async function createAppointment(appointment) {
    var row = toSnake(appointment);
    var res = check(await supabase.from('appointments').insert(row).select('id').single());
    return res.data.id;
  }
  function updateAppointment(updated) {
    var raw = toSnake(updated);
    var row = {};
    APPOINTMENT_COLUMNS.forEach(function (k) { if (raw[k] !== undefined) row[k] = raw[k]; });
    return supabase.from('appointments').update(row).eq('id', parseInt(updated.id, 10)).then(check);
  }
  function deleteAppointment(id) {
    return supabase.from('appointments').delete().eq('id', parseInt(id)).then(check);
  }
  async function getAppointmentById(id) {
    var res = check(await supabase.from('appointments').select('*').eq('id', parseInt(id)).single());
    return res.data ? toCamel(res.data) : null;
  }
  async function getAppointmentsForCustomer(customerId) {
    var res = check(await supabase.from('appointments').select('*').eq('customer_id', parseInt(customerId)).order('start'));
    return (res.data || []).map(toCamel);
  }
  async function getAppointmentsBetween(startISO, endISO) {
    var res = check(await supabase.from('appointments').select('*').gte('start', startISO).lte('start', endISO).order('start'));
    return (res.data || []).map(toCamel);
  }
  async function getAppointmentsForDate(date) {
    var start = new Date(date);
    start.setHours(0, 0, 0, 0);
    var end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return getAppointmentsBetween(start.toISOString(), end.toISOString());
  }
  async function getFutureAppointmentsForCustomer(customerId) {
    var now = new Date().toISOString();
    var res = check(await supabase.from('appointments').select('*').eq('customer_id', parseInt(customerId)).gte('start', now).order('start'));
    return (res.data || []).map(toCamel);
  }
  async function getAllAppointments() {
    var res = check(await supabase.from('appointments').select('*').order('start'));
    return (res.data || []).map(toCamel);
  }
  async function getAppointmentsByStatus(status) {
    var res = check(await supabase.from('appointments').select('*').eq('status', status).order('start'));
    return (res.data || []).map(toCamel);
  }
  async function getAppointmentsGroupedByStatus() {
    var all = await getAllAppointments();
    var grouped = {};
    all.forEach(function (apt) {
      var s = apt.status || 'scheduled';
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(apt);
    });
    Object.keys(grouped).forEach(function (s) {
      grouped[s].sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
    });
    return grouped;
  }
  async function getUnpaidJobs() {
    var all = await getAllAppointments();
    return all.filter(function (apt) {
      var inv = apt.invoiceAmount || 0;
      var paid = apt.paidAmount || 0;
      return inv > 0 && paid < inv;
    }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
  }
  async function getNeedsInvoiceJobs() {
    var all = await getAllAppointments();
    var completed = ['completed', 'invoiced', 'paid'];
    return all.filter(function (apt) {
      var s = apt.status || 'scheduled';
      var inv = apt.invoiceAmount || 0;
      return completed.indexOf(s) !== -1 && inv === 0;
    }).sort(function (a, b) { return new Date(a.start) - new Date(b.start); });
  }
  function computePaymentStatus(apt) {
    var quoted = apt.quotedAmount || 0;
    var invoiced = apt.invoiceAmount || 0;
    var paid = apt.paidAmount || 0;
    if (paid > 0 && paid >= invoiced && invoiced > 0) return 'paid';
    if (paid > 0 && paid < invoiced) return 'part_paid';
    if (invoiced > 0) return 'invoiced';
    if (quoted > 0) return 'quoted';
    return 'not_quoted';
  }

  // ---- Images ----
  async function addImage(customerId, entry, appointmentId) {
    var dataUrl = await blobToDataURL(entry.blob);
    var row = {
      customer_id: parseInt(customerId),
      appointment_id: appointmentId ? parseInt(appointmentId) : null,
      name: entry.name,
      type: entry.type,
      data_url: dataUrl,
      created_at: new Date().toISOString()
    };
    var res = check(await supabase.from('images').insert(row).select('id').single());
    return res.data.id;
  }
  async function addImages(customerId, fileEntries) {
    var ids = [];
    for (var i = 0; i < fileEntries.length; i++) {
      var id = await addImage(customerId, fileEntries[i], null);
      ids.push(id);
    }
    return ids;
  }
  async function getImagesByCustomerId(customerId) {
    var res = check(await supabase.from('images').select('*').eq('customer_id', parseInt(customerId)).order('created_at'));
    var rows = res.data || [];
    var hydrated = await Promise.all(rows.map(hydrateImageRow));
    return hydrated.filter(Boolean);
  }
  async function getImagesByAppointmentId(appointmentId) {
    var res = check(await supabase.from('images').select('*').eq('appointment_id', parseInt(appointmentId)).order('created_at'));
    var rows = res.data || [];
    var hydrated = await Promise.all(rows.map(hydrateImageRow));
    return hydrated.filter(Boolean);
  }
  function deleteImage(imageId) {
    return supabase.from('images').delete().eq('id', parseInt(imageId)).then(check);
  }

  // ---- Notes ----
  function normalizeDateToYYYYMMDD(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    var d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(d.getTime())) return null;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  var NOTES_COLUMNS = ['customer_id', 'content', 'svg', 'text_value', 'note_type', 'date', 'note_number', 'created_at', 'updated_at', 'edited_date'];
  async function createNote(note) {
    var cid = parseInt(note.customerId != null ? note.customerId : note.customer_id, 10);
    if (Number.isNaN(cid)) throw new Error('Cannot save note: customer not saved yet (e.g. temp-new-customer). Save the customer first.');
    var raw = toSnake(note);
    var row = {};
    NOTES_COLUMNS.forEach(function (k) { if (raw[k] !== undefined) row[k] = raw[k]; });
    row.date = normalizeDateToYYYYMMDD(note.date) || normalizeDateToYYYYMMDD(new Date());
    row.created_at = row.created_at || new Date().toISOString();
    row.updated_at = row.updated_at || new Date().toISOString();
    row.content = note.content != null ? note.content : (note.text != null ? note.text : null);
    row.customer_id = cid;
    var supportsTypedColumns = await hasTypedNoteColumns();
    if (supportsTypedColumns) {
      var noteType = inferNoteType(note);
      var textValue = note.text != null ? note.text : (note.textValue != null ? note.textValue : note.content);
      row.note_type = noteType;
      row.text_value = noteType === 'text' ? textValue : null;
      if (noteType === 'text') row.svg = null;
    }
    var res = check(await supabase.from('notes').insert(row).select('id').single());
    return res.data.id;
  }
  async function getNotesByCustomerId(customerId) {
    var id = parseInt(customerId, 10);
    if (Number.isNaN(id)) return []; // e.g. 'temp-new-customer' during add flow
    var res = check(await supabase.from('notes').select('*').eq('customer_id', id).order('created_at', { ascending: false }));
    var list = (res.data || []).map(toCamel);
    list.forEach(function (n) {
      if (n.text == null && n.textValue != null) n.text = n.textValue;
      if (n.content != null && n.text == null) n.text = n.content;
    });
    return list;
  }
  async function updateNote(updated) {
    var noteId = parseInt(updated.id, 10);
    var existingRes = check(await supabase.from('notes').select('*').eq('id', noteId).single());
    var existingRow = existingRes.data || null;
    if (!existingRow) throw new Error('Note with id ' + noteId + ' not found');
    var existing = toCamel(existingRow);
    if (existing.text == null && existing.textValue != null) existing.text = existing.textValue;

    var supportsTypedColumns = await hasTypedNoteColumns();
    var supportsTypedVersionColumns = await hasTypedNoteVersionColumns();
    var nextNoteType = inferNoteType(updated);
    var nextTextValue = updated.text != null ? updated.text : (updated.textValue != null ? updated.textValue : updated.content);
    var existingType = existing.noteType || inferNoteType(existing);
    var existingText = existing.text != null ? existing.text : (existing.textValue != null ? existing.textValue : existing.content);
    var existingSvg = existingType === 'svg' ? (existing.svg || null) : null;
    var nextSvg = nextNoteType === 'svg'
      ? (updated.svg != null ? updated.svg : (existing.svg != null ? existing.svg : null))
      : null;

    var contentChanged = (
      existingType !== nextNoteType ||
      (existingType === 'svg' && existingSvg !== nextSvg) ||
      (existingType === 'text' && existingText !== nextTextValue)
    );

    var raw = toSnake(updated);
    var row = {};
    NOTES_COLUMNS.forEach(function (k) { if (raw[k] !== undefined) row[k] = raw[k]; });
    row.updated_at = new Date().toISOString();
    row.content = nextTextValue != null ? nextTextValue : raw.content;

    // Save previous version (current state before this update) to note_versions
    if (contentChanged) {
      try {
        await supabase.from('note_versions').delete().eq('note_id', noteId).then(check);
        var versionRow = {
          note_id: noteId,
          content: existingText || null,
          svg: existing.svg || null,
          edited_date: existing.editedDate || updated.editedDate || updated.updatedAt || new Date().toISOString(),
          saved_at: new Date().toISOString()
        };
        if (supportsTypedVersionColumns) {
          versionRow.note_type = existingType;
          versionRow.text_value = existingType === 'text' ? (existingText || null) : null;
          if (existingType === 'text') versionRow.svg = null;
        }
        await supabase.from('note_versions').insert(versionRow).then(check);
      } catch (e) {
        console.warn('Failed to save note version:', e);
      }
    }

    if (supportsTypedColumns) {
      row.note_type = nextNoteType;
      row.text_value = nextNoteType === 'text' ? nextTextValue : null;
      if (nextNoteType === 'text') row.svg = null;
    }

    return supabase.from('notes').update(row).eq('id', noteId).then(check);
  }
  function deleteNote(noteId) {
    return supabase.from('notes').delete().eq('id', parseInt(noteId)).then(check);
  }
  async function getAllNotes() {
    var res = check(await supabase.from('notes').select('*').order('created_at', { ascending: false }));
    var list = (res.data || []).map(toCamel);
    list.forEach(function (n) {
      if (n.text == null && n.textValue != null) n.text = n.textValue;
      if (n.content != null && n.text == null) n.text = n.content;
    });
    return list;
  }

  // ---- Reminders ----
  async function createReminder(reminder) {
    var row = toSnake(reminder);
    row.status = row.status || 'pending';
    row.created_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    var res = check(await supabase.from('reminders').insert(row).select('id').single());
    return res.data.id;
  }
  async function getReminderById(id) {
    var res = check(await supabase.from('reminders').select('*').eq('id', parseInt(id)).single());
    return res.data ? toCamel(res.data) : null;
  }
  async function getRemindersForCustomer(customerId) {
    var res = check(await supabase.from('reminders').select('*').eq('customer_id', parseInt(customerId)).order('due_at'));
    return (res.data || []).map(toCamel);
  }
  async function getRemindersForAppointment(appointmentId) {
    var res = check(await supabase.from('reminders').select('*').eq('appointment_id', parseInt(appointmentId)).order('due_at'));
    return (res.data || []).map(toCamel);
  }
  async function getPendingReminders() {
    var res = check(await supabase.from('reminders').select('*').eq('status', 'pending').order('due_at'));
    return (res.data || []).map(toCamel);
  }
  async function getOverdueReminders() {
    var pending = await getPendingReminders();
    var now = new Date();
    return pending.filter(function (r) { return new Date(r.dueAt) < now; });
  }
  async function getTodayReminders() {
    var pending = await getPendingReminders();
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return pending.filter(function (r) {
      var due = new Date(r.dueAt);
      return due >= start && due < end;
    });
  }
  async function getUpcomingReminders(days) {
    var pending = await getPendingReminders();
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (days || 7) + 1);
    return pending.filter(function (r) {
      var due = new Date(r.dueAt);
      return due >= start && due < end;
    });
  }
  async function getAllReminders() {
    var res = check(await supabase.from('reminders').select('*').order('due_at'));
    return (res.data || []).map(toCamel);
  }
  function updateReminder(updated) {
    var row = toSnake(updated);
    row.updated_at = new Date().toISOString();
    return supabase.from('reminders').update(row).eq('id', parseInt(updated.id)).then(check);
  }
  function deleteReminder(id) {
    return supabase.from('reminders').delete().eq('id', parseInt(id)).then(check);
  }

  // ---- Job events ----
  var JOB_EVENT_TYPES = ['call', 'sms', 'email', 'site_visit', 'quote_sent', 'invoice_sent', 'payment_received', 'note', 'other'];
  async function createJobEvent(event) {
    var row = {
      appointment_id: parseInt(event.appointmentId),
      customer_id: parseInt(event.customerId),
      type: event.type || 'other',
      note: event.note || null,
      created_at: new Date().toISOString()
    };
    var res = check(await supabase.from('job_events').insert(row).select('id').single());
    return res.data.id;
  }
  async function getJobEventById(id) {
    var res = check(await supabase.from('job_events').select('*').eq('id', parseInt(id)).single());
    return res.data ? toCamel(res.data) : null;
  }
  async function getEventsForAppointment(appointmentId) {
    var res = check(await supabase.from('job_events').select('*').eq('appointment_id', parseInt(appointmentId)).order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }
  async function getEventsForCustomer(customerId) {
    var res = check(await supabase.from('job_events').select('*').eq('customer_id', parseInt(customerId)).order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }
  async function getRecentEventsForCustomer(customerId, limit) {
    var res = check(await supabase.from('job_events').select('*').eq('customer_id', parseInt(customerId)).order('created_at', { ascending: false }).limit(limit || 5));
    return (res.data || []).map(toCamel);
  }
  async function getAllJobEvents() {
    var res = check(await supabase.from('job_events').select('*').order('created_at', { ascending: false }));
    return (res.data || []).map(toCamel);
  }
  function deleteJobEvent(id) {
    return supabase.from('job_events').delete().eq('id', parseInt(id)).then(check);
  }
  async function getLastContactTime(customerId) {
    var events = await getEventsForCustomer(customerId);
    var types = ['call', 'sms', 'email'];
    var contact = events.filter(function (e) { return types.indexOf(e.type) !== -1; });
    return contact.length > 0 ? new Date(contact[0].createdAt) : null;
  }

  // ---- Storage stats ----
  async function getStorageStats() {
    var res = await supabase.from('images').select('id, data_url');
    if (res.error) return { imageCount: 0, totalBytes: 0, totalMB: '0.00', usagePercent: '0', isWarning: false, isCritical: false };
    var items = res.data || [];
    var totalBytes = 0;
    items.forEach(function (img) {
      if (img.data_url) {
        var base64Len = img.data_url.length - (img.data_url.indexOf(',') + 1);
        totalBytes += base64Len * 0.75;
      }
    });
    var totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    var pct = Math.min(100, (totalBytes / (50 * 1024 * 1024)) * 100).toFixed(1);
    return {
      imageCount: items.length,
      totalBytes: totalBytes,
      totalMB: totalMB,
      usagePercent: pct,
      isWarning: totalBytes > 40 * 1024 * 1024,
      isCritical: totalBytes > 45 * 1024 * 1024
    };
  }

  // ---- Backup / export ----
  async function exportAllData() {
    var customers = await getAllCustomers();
    var appointments = await getAllAppointments();
    var notes = await getAllNotes();
    var imageResult = await fetchImagesForExportSafe();
    var images = imageResult.images;
    var imageWarning = imageResult.warning;
    var reminders = await getAllReminders();
    var jobEvents = await getAllJobEvents();
    return {
      __meta: {
        app: APP_SLUG,
        version: 4,
        exportedAt: new Date().toISOString(),
        warnings: imageWarning ? [imageWarning] : []
      },
      customers: customers,
      appointments: appointments,
      customerNotes: notes,
      images: images,
      reminders: reminders,
      jobEvents: jobEvents
    };
  }
  async function safeExportAllData(progressCallback) {
    if (progressCallback) progressCallback('Starting backup...', 0);
    var customers = await getAllCustomers();
    if (progressCallback) progressCallback('Exported ' + customers.length + ' customers', 15);
    var appointments = await getAllAppointments();
    if (progressCallback) progressCallback('Exported ' + appointments.length + ' appointments', 30);
    var notes = await getAllNotes();
    if (progressCallback) progressCallback('Exported ' + notes.length + ' notes', 45);
    var imageResult = await fetchImagesForExportSafe();
    var images = imageResult.images;
    var imageWarning = imageResult.warning;
    if (progressCallback) progressCallback('Exported ' + images.length + ' images', 75);
    var reminders = await getAllReminders();
    var jobEvents = await getAllJobEvents();
    var payload = {
      __meta: {
        app: APP_SLUG,
        version: 4,
        exportedAt: new Date().toISOString(),
        warnings: imageWarning ? [imageWarning] : []
      },
      customers: customers,
      appointments: appointments,
      customerNotes: notes,
      images: images,
      reminders: reminders,
      jobEvents: jobEvents
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    if (progressCallback) progressCallback('Backup complete!', 100);
    return { blob: blob, customers: customers, appointments: appointments, imageCount: images.length };
  }
  async function exportDataWithoutImages(progressCallback) {
    if (progressCallback) progressCallback('Preparing...', 10);
    var customers = await getAllCustomers();
    if (progressCallback) progressCallback('Loading appointments...', 30);
    var appointments = await getAllAppointments();
    if (progressCallback) progressCallback('Loading notes...', 50);
    var notes = await getAllNotes();
    if (progressCallback) progressCallback('Building file...', 80);
    var blob = new Blob([JSON.stringify({
      __meta: { app: APP_SLUG, version: 4, exportedAt: new Date().toISOString() },
      customers: customers,
      appointments: appointments,
      customerNotes: notes,
      images: []
    }, null, 2)], { type: 'application/json' });
    if (progressCallback) progressCallback('Backup complete!', 100);
    return { blob: blob, customers: customers, appointments: appointments, imageCount: 0 };
  }
  async function exportImagesOnly(progressCallback) {
    if (progressCallback) progressCallback('Starting images-only export...', 0);
    var imageResult = await fetchImagesForExportSafe();
    var images = imageResult.images;
    var imageWarning = imageResult.warning;
    if (progressCallback) progressCallback('Exported ' + images.length + ' images', 70);
    var warnings = imageWarning ? [imageWarning] : [];
    function tryBuildBlob(imagesSubset) {
      var payload = {
        __meta: {
          app: APP_SLUG,
          version: 4,
          exportedAt: new Date().toISOString(),
          backupType: 'images-only',
          warnings: warnings
        },
        images: imagesSubset
      };
      return new Blob([JSON.stringify(payload)], { type: 'application/json' });
    }
    var blob = null;
    var exportedImages = images;
    try {
      blob = tryBuildBlob(images);
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      var isTooLarge = msg.toLowerCase().indexOf('invalid string length') !== -1;
      if (!isTooLarge) throw e;

      var low = 0;
      var high = images.length;
      var bestCount = 0;
      while (low <= high) {
        var mid = Math.floor((low + high) / 2);
        try {
          blob = tryBuildBlob(images.slice(0, mid));
          bestCount = mid;
          low = mid + 1;
        } catch (innerErr) {
          high = mid - 1;
        }
      }
      exportedImages = images.slice(0, bestCount);
      warnings.push('Image export truncated by browser memory limits: exported ' + bestCount + '/' + images.length + ' images.');
      blob = tryBuildBlob(exportedImages);
    }
    if (progressCallback) progressCallback('Images-only export complete!', 100);
    return { blob: blob, imageCount: exportedImages.length };
  }
  async function importAllData(data, options) {
    if (!data || !data.customers) throw new Error('Invalid backup data');
    var mode = (options && options.mode) || 'merge';
    if (mode === 'replace') {
      await clearAllStores();
    }
    var idMap = {};
    for (var i = 0; i < data.customers.length; i++) {
      var c = data.customers[i];
      var id = await createCustomer(c);
      idMap[c.id] = id;
    }
    if (data.appointments) {
      for (var j = 0; j < data.appointments.length; j++) {
        var a = data.appointments[j];
        a.customerId = idMap[a.customerId] != null ? idMap[a.customerId] : a.customerId;
        await createAppointment(a);
      }
    }
    if (data.images && data.images.length > 0) {
      for (var k = 0; k < data.images.length; k++) {
        var img = data.images[k];
        img.customerId = idMap[img.customerId] != null ? idMap[img.customerId] : img.customerId;
        await supabase.from('images').insert(toSnake(img)).then(check);
      }
    }
    if (data.customerNotes || data.notes) {
      var noteInput = data.customerNotes || data.notes || [];
      var noteList = [];
      if (Array.isArray(noteInput)) {
        noteList = noteInput;
      } else if (noteInput && typeof noteInput === 'object') {
        Object.keys(noteInput).forEach(function (cid) {
          var list = noteInput[cid] || [];
          if (!Array.isArray(list)) return;
          list.forEach(function (note) {
            if (note && typeof note === 'object') {
              if (note.customerId == null) note.customerId = parseInt(cid, 10);
              noteList.push(note);
            }
          });
        });
      }
      for (var n = 0; n < noteList.length; n++) {
        var note = noteList[n];
        var originalCustomerId = parseInt(note.customerId, 10);
        var mappedCustomerId = idMap[originalCustomerId] != null ? idMap[originalCustomerId] : originalCustomerId;
        if (Number.isNaN(mappedCustomerId)) continue;
        note.customerId = mappedCustomerId;
        try {
          await createNote(note);
        } catch (e) {
          if (String((e && e.message) || '').toLowerCase().indexOf('notes_customer_id_fkey') !== -1) {
            console.warn('[dbSupabase] Skipping note import due to missing customer mapping:', note.id || null, originalCustomerId);
            continue;
          }
          throw e;
        }
      }
    }
    if (data.reminders) {
      for (var r = 0; r < data.reminders.length; r++) {
        var rem = data.reminders[r];
        rem.customerId = idMap[rem.customerId] != null ? idMap[rem.customerId] : rem.customerId;
        await createReminder(rem);
      }
    }
  }
  async function clearAllStores() {
    if (window.ALLOW_DESTRUCTIVE_WIPE !== true) {
      throw new Error('Destructive wipe is disabled in this environment.');
    }
    await supabase.from('job_events').delete().gte('id', 0).then(check);
    await supabase.from('reminders').delete().gte('id', 0).then(check);
    await supabase.from('note_versions').delete().gte('id', 0).then(check);
    await supabase.from('notes').delete().gte('id', 0).then(check);
    await supabase.from('images').delete().gte('id', 0).then(check);
    await supabase.from('appointments').delete().gte('id', 0).then(check);
    await supabase.from('customers').delete().gte('id', 0).then(check);
  }

  // ---- Note version history (note_versions table) ----
  async function getNoteById(noteId) {
    var res = check(await supabase.from('notes').select('*').eq('id', parseInt(noteId, 10)).single());
    if (!res.data) return null;
    var n = toCamel(res.data);
    if (n.text == null && n.textValue != null) n.text = n.textValue;
    if (n.content != null && n.text == null) n.text = n.content;
    return n;
  }
  async function getNotePreviousVersion(noteId) {
    var id = parseInt(noteId, 10);
    if (Number.isNaN(id)) return null;
    var res = await supabase.from('note_versions').select('*').eq('note_id', id).order('saved_at', { ascending: false }).limit(1);
    if (res.error || !res.data || res.data.length === 0) return null;
    var row = toCamel(res.data[0]);
    var text = row.text != null ? row.text : (row.textValue != null ? row.textValue : row.content);
    return {
      noteId: row.noteId,
      content: row.content,
      text: text,
      textValue: row.textValue != null ? row.textValue : (text != null ? text : null),
      noteType: row.noteType || inferNoteType(row),
      svg: row.svg,
      editedDate: row.editedDate,
      savedAt: row.savedAt
    };
  }
  async function restoreNoteToPreviousVersion(noteId) {
    var prev = await getNotePreviousVersion(noteId);
    if (!prev) throw new Error('No previous version found for this note');
    var id = parseInt(noteId, 10);
    var supportsTypedColumns = await hasTypedNoteColumns();
    var restoredType = prev.noteType || inferNoteType(prev);
    var restoredText = prev.text != null ? prev.text : (prev.textValue != null ? prev.textValue : prev.content);
    var notesRow = {
      content: restoredText != null ? restoredText : null,
      svg: prev.svg != null ? prev.svg : null,
      updated_at: new Date().toISOString(),
      edited_date: prev.editedDate || null
    };
    if (supportsTypedColumns) {
      notesRow.note_type = restoredType;
      notesRow.text_value = restoredType === 'text' ? (restoredText != null ? restoredText : null) : null;
      if (restoredType === 'text') notesRow.svg = null;
    }
    await supabase.from('notes').update(notesRow).eq('id', id).then(check);
  }

  // ---- Recovery (stubs for compatibility) ----
  async function scanForCorruptedNotes() {
    var notes = await getAllNotes();
    var corrupted = [];
    var healthy = [];
    notes.forEach(function (n) {
      var noteType = inferNoteType(n);
      var hasSvg = n.svg && typeof n.svg === 'string' && n.svg.trim().length > 0;
      var hasText = hasNonEmptyText(n.text) || hasNonEmptyText(n.textValue) || hasNonEmptyText(n.content);
      var hasDate = n.date || n.createdAt;
      var invalid = !hasDate || (noteType === 'svg' ? !hasSvg : !hasText);
      if (invalid) {
        corrupted.push({
          noteId: n.id,
          customerId: n.customerId,
          source: 'supabase',
          corruptedVersion: n,
          healthyVersion: null
        });
      } else {
        healthy.push({ noteId: n.id, customerId: n.customerId, note: n });
      }
    });
    return { corrupted: corrupted, healthy: healthy, localStorageOnly: [], indexeddbOnly: [], conflicts: [] };
  }
  async function recoverCorruptedNotes(dryRun) {
    var shouldDryRun = dryRun !== false;
    var scan = await scanForCorruptedNotes();
    var recoverable = scan.corrupted.filter(function (c) { return !!c.healthyVersion; });
    if (shouldDryRun) return { canRecover: recoverable.length, actions: recoverable, summary: scan };
    var recovered = 0;
    var failed = 0;
    for (var i = 0; i < recoverable.length; i++) {
      try {
        await updateNote(recoverable[i].healthyVersion);
        recovered += 1;
      } catch (e) {
        failed += 1;
      }
    }
    return { recovered: recovered, failed: failed, details: { recovered: recoverable, failed: [] }, summary: scan };
  }
  async function restoreNotesFromBackup(backupData, options) {
    var opts = options || {};
    var mode = opts.mode || 'merge';
    var onlyCustomerId = opts.customerId || null;
    var backupNotes = (backupData && (backupData.customerNotes || backupData.notes)) || {};
    var noteList = [];

    if (Array.isArray(backupNotes)) {
      noteList = backupNotes.slice();
    } else if (backupNotes && typeof backupNotes === 'object') {
      Object.keys(backupNotes).forEach(function (cid) {
        var list = backupNotes[cid] || [];
        if (!Array.isArray(list)) return;
        if (onlyCustomerId != null && String(onlyCustomerId) !== String(cid)) return;
        list.forEach(function (note) {
          if (!note || typeof note !== 'object') return;
          var next = Object.assign({}, note);
          if (next.customerId == null) next.customerId = parseInt(cid, 10);
          noteList.push(next);
        });
      });
    }

    var restored = [];
    var skipped = [];
    var failed = [];
    for (var i = 0; i < noteList.length; i++) {
      var note = noteList[i];
      try {
        var noteType = inferNoteType(note);
        var hasSvg = note.svg && typeof note.svg === 'string' && note.svg.trim().length > 0;
        var hasText = hasNonEmptyText(note.text) || hasNonEmptyText(note.textValue) || hasNonEmptyText(note.content);
        var hasDate = note.date || note.createdAt;
        if (!hasDate || (noteType === 'svg' && !hasSvg) || (noteType === 'text' && !hasText)) {
          skipped.push({ noteId: note.id, customerId: note.customerId, reason: 'Backup note missing essential fields' });
          continue;
        }
        if (mode === 'replace') {
          try {
            await updateNote(note);
            restored.push({ noteId: note.id, customerId: note.customerId, action: 'replaced' });
          } catch (eReplace) {
            await createNote(note);
            restored.push({ noteId: note.id, customerId: note.customerId, action: 'added' });
          }
        } else {
          try {
            await updateNote(note);
            restored.push({ noteId: note.id, customerId: note.customerId, action: 'merged' });
          } catch (eMerge) {
            await createNote(note);
            restored.push({ noteId: note.id, customerId: note.customerId, action: 'added' });
          }
        }
      } catch (err) {
        failed.push({ noteId: note.id, customerId: note.customerId, error: err.message || String(err) });
      }
    }
    return { restored: restored.length, skipped: skipped.length, failed: failed.length, details: { restored: restored, skipped: skipped, failed: failed } };
  }

  // ---- Expose API ----
  var dbAPI = {
    getSession: getSession,
    signInWithPassword: signInWithPassword,
    signOut: signOut,
    onAuthStateChange: onAuthStateChange,
    claimUnownedData: claimUnownedData,
    deleteMyData: deleteMyData,
    dbName: config.dbName || 'tradie-crm-db',
    storagePrefix: STORAGE_PREFIX,
    createCustomer: createCustomer,
    updateCustomer: updateCustomer,
    getCustomerById: getCustomerById,
    getAllCustomers: getAllCustomers,
    getRecentCustomers: getRecentCustomers,
    searchCustomers: searchCustomers,
    deleteCustomer: deleteCustomer,
    createAppointment: createAppointment,
    updateAppointment: updateAppointment,
    deleteAppointment: deleteAppointment,
    getAllAppointments: getAllAppointments,
    getAppointmentsBetween: getAppointmentsBetween,
    getAppointmentsForDate: getAppointmentsForDate,
    getFutureAppointmentsForCustomer: getFutureAppointmentsForCustomer,
    getAppointmentsForCustomer: getAppointmentsForCustomer,
    getAppointmentById: getAppointmentById,
    getAppointmentsByStatus: getAppointmentsByStatus,
    getAppointmentsGroupedByStatus: getAppointmentsGroupedByStatus,
    getUnpaidJobs: getUnpaidJobs,
    getNeedsInvoiceJobs: getNeedsInvoiceJobs,
    computePaymentStatus: computePaymentStatus,
    addImages: addImages,
    addImage: addImage,
    getImagesByCustomerId: getImagesByCustomerId,
    getImagesByAppointmentId: getImagesByAppointmentId,
    deleteImage: deleteImage,
    fileListToEntries: fileListToEntries,
    createNote: createNote,
    getNotesByCustomerId: getNotesByCustomerId,
    updateNote: updateNote,
    deleteNote: deleteNote,
    getAllNotes: getAllNotes,
    createReminder: createReminder,
    getReminderById: getReminderById,
    getRemindersForCustomer: getRemindersForCustomer,
    getRemindersForAppointment: getRemindersForAppointment,
    getAllReminders: getAllReminders,
    getPendingReminders: getPendingReminders,
    getOverdueReminders: getOverdueReminders,
    getTodayReminders: getTodayReminders,
    getUpcomingReminders: getUpcomingReminders,
    updateReminder: updateReminder,
    deleteReminder: deleteReminder,
    createJobEvent: createJobEvent,
    getJobEventById: getJobEventById,
    getEventsForAppointment: getEventsForAppointment,
    getEventsForCustomer: getEventsForCustomer,
    getRecentEventsForCustomer: getRecentEventsForCustomer,
    getAllJobEvents: getAllJobEvents,
    deleteJobEvent: deleteJobEvent,
    getLastContactTime: getLastContactTime,
    JOB_EVENT_TYPES: JOB_EVENT_TYPES,
    exportAllData: exportAllData,
    safeExportAllData: safeExportAllData,
    exportDataWithoutImages: exportDataWithoutImages,
    exportImagesOnly: exportImagesOnly,
    importAllData: importAllData,
    clearAllStores: clearAllStores,
    getStorageStats: getStorageStats,
    scanForCorruptedNotes: scanForCorruptedNotes,
    recoverCorruptedNotes: recoverCorruptedNotes,
    restoreNotesFromBackup: restoreNotesFromBackup,
    getNotePreviousVersion: getNotePreviousVersion,
    restoreNoteToPreviousVersion: restoreNoteToPreviousVersion
  };

  window.CrmDB = dbAPI;
})();
