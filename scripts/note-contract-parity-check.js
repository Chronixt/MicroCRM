#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function has(content, pattern) {
  return pattern.test(content);
}

const files = {
  adapter: 'js/db-supabase.js',
  app: 'js/app.js',
  index: 'index.html',
  hairdresserProfile: 'js/products/hairdresser/profile.js',
  tradieProfile: 'js/products/tradie/profile.js'
};

const content = {
  adapter: read(files.adapter),
  app: read(files.app),
  index: read(files.index),
  hairdresserProfile: read(files.hairdresserProfile),
  tradieProfile: read(files.tradieProfile)
};

const checks = [
  {
    id: 'api.createNote',
    desc: 'createNote exists in canonical adapter',
    test: () => has(content.adapter, /function\s+createNote\s*\(/)
  },
  {
    id: 'api.updateNote',
    desc: 'updateNote exists in canonical adapter',
    test: () => has(content.adapter, /function\s+updateNote\s*\(/)
  },
  {
    id: 'api.restoreNoteToPreviousVersion',
    desc: 'restoreNoteToPreviousVersion exists in canonical adapter',
    test: () => has(content.adapter, /function\s+restoreNoteToPreviousVersion\s*\(/)
  },
  {
    id: 'api.importAllData',
    desc: 'importAllData exists in canonical adapter',
    test: () => has(content.adapter, /function\s+importAllData\s*\(/)
  },
  {
    id: 'api.recovery',
    desc: 'recoverCorruptedNotes and restoreNotesFromBackup exist in canonical adapter',
    test: () => has(content.adapter, /function\s+recoverCorruptedNotes\s*\(/) && has(content.adapter, /function\s+restoreNotesFromBackup\s*\(/)
  },
  {
    id: 'contract.noteType.textValue',
    desc: 'canonical adapter handles note_type and text_value',
    test: () => has(content.adapter, /note_type/) && has(content.adapter, /text_value/)
  },
  {
    id: 'contract.noteTypeInference',
    desc: 'canonical adapter infers note type',
    test: () => has(content.adapter, /inferNoteType/)
  },
  {
    id: 'contract.singleSupabaseAdapterPath',
    desc: 'index.html uses a single Supabase adapter path (db-supabase)',
    test: () => has(content.index, /moduleName\s*=\s*'db-supabase'/) && !has(content.index, /dbSupabase/)
  },
  {
    id: 'contract.productSchemaConfig',
    desc: 'both product profiles define supabase schema config',
    test: () => has(content.hairdresserProfile, /supabaseSchema:\s*'hairdresser'/) && has(content.tradieProfile, /supabaseSchema:\s*'tradie'/)
  },
  {
    id: 'guardrail.appBoundaryMarker',
    desc: 'app.js includes note boundary guardrail marker',
    test: () => has(content.app, /NOTE_CONTRACT_GUARDRAIL/)
  }
];

const failures = [];
console.log('--- Notes Contract Parity Check ---');
for (const check of checks) {
  const pass = !!check.test();
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${check.id}  - ${check.desc}`);
  if (!pass) failures.push(check.id);
}

if (failures.length > 0) {
  console.error(`\nFAILED: ${failures.length} gate(s) failed.`);
  process.exit(1);
}

console.log('\nPASS: all note parity gates satisfied.');
