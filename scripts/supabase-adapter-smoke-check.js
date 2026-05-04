#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

function has(content, regex) {
  return regex.test(content);
}

const files = {
  index: 'index.html',
  adapter: 'js/db-supabase.js',
  hairdresserProfile: 'js/products/hairdresser/profile.js',
  tradieProfile: 'js/products/tradie/profile.js'
};

const src = {
  index: read(files.index),
  adapter: read(files.adapter),
  hairdresserProfile: read(files.hairdresserProfile),
  tradieProfile: read(files.tradieProfile)
};

const checks = [
  {
    id: 'loader.single_adapter_path',
    desc: 'index.html loads only db-supabase.js in Supabase mode',
    test: () => has(src.index, /moduleName\s*=\s*'db-supabase'/) && !has(src.index, /dbSupabase/)
  },
  {
    id: 'config.schema.hairdresser',
    desc: 'hairdresser profile config sets supabaseSchema',
    test: () => has(src.hairdresserProfile, /supabaseSchema:\s*'hairdresser'/)
  },
  {
    id: 'config.schema.tradie',
    desc: 'tradie profile config sets supabaseSchema',
    test: () => has(src.tradieProfile, /supabaseSchema:\s*'tradie'/)
  },
  {
    id: 'api.notes_and_import',
    desc: 'adapter exposes create/update/restore note and import',
    test: () => [
      /function\s+createNote\s*\(/,
      /function\s+updateNote\s*\(/,
      /function\s+restoreNoteToPreviousVersion\s*\(/,
      /function\s+importAllData\s*\(/,
      /function\s+deleteCustomer\s*\(/
    ].every((rx) => has(src.adapter, rx))
  },
  {
    id: 'api.export_surface',
    desc: 'adapter exposes export and clear surfaces used in operational flows',
    test: () => [
      /function\s+exportAllData\s*\(/,
      /function\s+safeExportAllData\s*\(/,
      /function\s+exportDataWithoutImages\s*\(/,
      /function\s+clearAllStores\s*\(/
    ].every((rx) => has(src.adapter, rx))
  },
  {
    id: 'api.tradie_pipeline_surface',
    desc: 'adapter includes tradie pipeline methods behind feature gating',
    test: () => [
      /function\s+assertJobPipelineFeature\s*\(/,
      /function\s+createReminder\s*\(/,
      /function\s+getPendingReminders\s*\(/,
      /function\s+createJobEvent\s*\(/,
      /function\s+getEventsForAppointment\s*\(/
    ].every((rx) => has(src.adapter, rx))
  },
  {
    id: 'api.runtime_preflight',
    desc: 'adapter exposes runtime preflight and schema mismatch guard',
    test: () => [
      /function\s+runRuntimePreflight\s*\(/,
      /SCHEMA_MISMATCH_APPOINTMENTS/,
      /appointmentProbeColumns/
    ].every((rx) => has(src.adapter, rx))
  },
  {
    id: 'api.dbapi_exports',
    desc: 'dbAPI exports notes/import/delete and tradie pipeline methods',
    test: () => [
      /const\s+dbAPI\s*=\s*\{/,
      /runRuntimePreflight,\s*/,
      /createNote,\s*/,
      /importAllData,\s*/,
      /deleteCustomer,\s*/,
      /createReminder,\s*/,
      /createJobEvent,\s*/
    ].every((rx) => has(src.adapter, rx))
  }
];

console.log('--- Supabase Adapter Smoke Check ---');
const failures = [];
for (const check of checks) {
  const pass = !!check.test();
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${check.id}  - ${check.desc}`);
  if (!pass) failures.push(check.id);
}

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} gate(s) failed.`);
  process.exit(1);
}

console.log('\nPASS: supabase adapter smoke checks satisfied.');
