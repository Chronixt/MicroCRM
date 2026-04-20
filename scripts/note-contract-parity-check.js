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
  adapterHairdresser: 'js/db-supabase.js',
  adapterTradie: 'js/dbSupabase.js',
  app: 'js/app.js'
};

const content = {
  hairdresser: read(files.adapterHairdresser),
  tradie: read(files.adapterTradie),
  app: read(files.app)
};

const checks = [
  {
    id: 'api.createNote',
    desc: 'createNote exists in both adapters',
    test: () => has(content.hairdresser, /function\s+createNote\s*\(/) && has(content.tradie, /function\s+createNote\s*\(/)
  },
  {
    id: 'api.updateNote',
    desc: 'updateNote exists in both adapters',
    test: () => has(content.hairdresser, /function\s+updateNote\s*\(/) && has(content.tradie, /function\s+updateNote\s*\(/)
  },
  {
    id: 'api.restoreNoteToPreviousVersion',
    desc: 'restoreNoteToPreviousVersion exists in both adapters',
    test: () => has(content.hairdresser, /function\s+restoreNoteToPreviousVersion\s*\(/) && has(content.tradie, /function\s+restoreNoteToPreviousVersion\s*\(/)
  },
  {
    id: 'api.importAllData',
    desc: 'importAllData exists in both adapters',
    test: () => has(content.hairdresser, /function\s+importAllData\s*\(/) && has(content.tradie, /function\s+importAllData\s*\(/)
  },
  {
    id: 'api.recovery',
    desc: 'recoverCorruptedNotes and restoreNotesFromBackup exist in both adapters',
    test: () => has(content.hairdresser, /function\s+recoverCorruptedNotes\s*\(/) && has(content.tradie, /function\s+recoverCorruptedNotes\s*\(/) && has(content.hairdresser, /function\s+restoreNotesFromBackup\s*\(/) && has(content.tradie, /function\s+restoreNotesFromBackup\s*\(/)
  },
  {
    id: 'contract.noteType.textValue.hairdresser',
    desc: 'hairdresser adapter handles note_type and text_value',
    test: () => has(content.hairdresser, /note_type/) && has(content.hairdresser, /text_value/)
  },
  {
    id: 'contract.noteType.textValue.tradie',
    desc: 'tradie adapter handles note_type and text_value',
    test: () => has(content.tradie, /note_type/) && has(content.tradie, /text_value/)
  },
  {
    id: 'contract.noteTypeInference',
    desc: 'both adapters infer note type',
    test: () => has(content.hairdresser, /inferNoteType/) && has(content.tradie, /inferNoteType/)
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
