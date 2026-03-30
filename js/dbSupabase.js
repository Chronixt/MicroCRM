/**
 * Supabase-backed database layer for TradieCRM
 * Same API as db.js (CrmDB). Maps snake_case (Supabase) <-> camelCase (app).
 * Requires: window.SupabaseClient, window.ProductConfig
 */
(function () {
  'use strict';

  var supabase = window.SupabaseClient;
  var config = window.ProductConfig || {};
  var STORAGE_PREFIX = config.storagePrefix || 'tradie_';
  var APP_SLUG = config.appSlug || 'tradie-crm';

  if (!supabase) {
    console.error('[dbSupabase] SupabaseClient not found. Load supabaseClient.js first.');
    window.CrmDB = {};
    return;
  }

  console.log('[dbSupabase] Using Supabase backend');

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

  function check(res) {
    if (res.error) throw new Error(res.error.message || 'Supabase error');
    return res;
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
    return (res.data || []).map(toCamel);
  }
  async function getImagesByAppointmentId(appointmentId) {
    var res = check(await supabase.from('images').select('*').eq('appointment_id', parseInt(appointmentId)).order('created_at'));
    return (res.data || []).map(toCamel);
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
  var NOTES_COLUMNS = ['customer_id', 'content', 'svg', 'date', 'note_number', 'created_at', 'updated_at', 'edited_date'];
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
    var res = check(await supabase.from('notes').insert(row).select('id').single());
    return res.data.id;
  }
  async function getNotesByCustomerId(customerId) {
    var id = parseInt(customerId, 10);
    if (Number.isNaN(id)) return []; // e.g. 'temp-new-customer' during add flow
    var res = check(await supabase.from('notes').select('*').eq('customer_id', id).order('created_at', { ascending: false }));
    var list = (res.data || []).map(toCamel);
    list.forEach(function (n) { if (n.content != null && n.text == null) n.text = n.content; });
    return list;
  }
  async function updateNote(updated) {
    var noteId = parseInt(updated.id, 10);
    var raw = toSnake(updated);
    var row = {};
    NOTES_COLUMNS.forEach(function (k) { if (raw[k] !== undefined) row[k] = raw[k]; });
    row.updated_at = new Date().toISOString();
    row.content = updated.text != null ? updated.text : (updated.content != null ? updated.content : raw.content);

    // Save previous version (current state before this update) to note_versions
    var prevContent = updated.content != null ? String(updated.content) : (raw.content != null ? String(raw.content) : null);
    var prevSvg = updated.svg != null && updated.svg !== '' ? updated.svg : null;
    if (prevContent != null && prevContent !== '' || prevSvg != null) {
      try {
        await supabase.from('note_versions').delete().eq('note_id', noteId).then(check);
        await supabase.from('note_versions').insert({
          note_id: noteId,
          content: prevContent || null,
          svg: prevSvg,
          edited_date: updated.editedDate || updated.updatedAt || new Date().toISOString(),
          saved_at: new Date().toISOString()
        }).then(check);
      } catch (e) {
        console.warn('Failed to save note version:', e);
      }
    }

    return supabase.from('notes').update(row).eq('id', noteId).then(check);
  }
  function deleteNote(noteId) {
    return supabase.from('notes').delete().eq('id', parseInt(noteId)).then(check);
  }
  async function getAllNotes() {
    var res = check(await supabase.from('notes').select('*').order('created_at', { ascending: false }));
    var list = (res.data || []).map(toCamel);
    list.forEach(function (n) { if (n.content != null && n.text == null) n.text = n.content; });
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
    var imgRes = await supabase.from('images').select('*');
    var images = (imgRes.data || []).map(toCamel);
    var reminders = await getAllReminders();
    var jobEvents = await getAllJobEvents();
    return {
      __meta: { app: APP_SLUG, version: 4, exportedAt: new Date().toISOString() },
      customers: customers,
      appointments: appointments,
      customerNotes: notes,
      images: images,
      reminders: reminders,
      jobEvents: jobEvents
    };
  }
  async function safeExportAllData() {
    return exportAllData();
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
      var noteList = data.customerNotes || data.notes || [];
      for (var n = 0; n < noteList.length; n++) {
        var note = noteList[n];
        note.customerId = idMap[note.customerId] != null ? idMap[note.customerId] : note.customerId;
        await createNote(note);
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
    if (n.content != null && n.text == null) n.text = n.content;
    return n;
  }
  async function getNotePreviousVersion(noteId) {
    var id = parseInt(noteId, 10);
    if (Number.isNaN(id)) return null;
    var res = await supabase.from('note_versions').select('*').eq('note_id', id).order('saved_at', { ascending: false }).limit(1);
    if (res.error || !res.data || res.data.length === 0) return null;
    var row = res.data[0];
    return {
      noteId: row.note_id,
      content: row.content,
      text: row.content,
      svg: row.svg,
      editedDate: row.edited_date,
      savedAt: row.saved_at
    };
  }
  async function restoreNoteToPreviousVersion(noteId) {
    var prev = await getNotePreviousVersion(noteId);
    if (!prev) throw new Error('No previous version found for this note');
    var id = parseInt(noteId, 10);
    var notesRow = {
      content: prev.content != null ? prev.content : null,
      svg: prev.svg != null ? prev.svg : null,
      updated_at: new Date().toISOString(),
      edited_date: prev.editedDate || null
    };
    await supabase.from('notes').update(notesRow).eq('id', id).then(check);
  }

  // ---- Recovery (stubs for compatibility) ----
  async function scanForCorruptedNotes() {
    return { corrupted: [], healthy: [], localStorageOnly: [], indexeddbOnly: [], conflicts: [] };
  }
  async function recoverCorruptedNotes() {
    return { recovered: [], failed: [] };
  }
  async function restoreNotesFromBackup() {
    return { restored: [], skipped: [], failed: [] };
  }

  // ---- Expose API ----
  var dbAPI = {
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
