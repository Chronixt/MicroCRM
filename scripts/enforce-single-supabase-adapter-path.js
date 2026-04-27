#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const runtimeFiles = [
  'index.html',
  'js/app.js',
  'js/config.js',
  'js/config.local.js',
  'js/supabaseClient.js',
  'js/storageDriver.js'
];

const jsDir = path.join(root, 'js');
for (const entry of fs.readdirSync(jsDir)) {
  if (!entry.endsWith('.js')) continue;
  const rel = `js/${entry}`;
  if (!runtimeFiles.includes(rel)) runtimeFiles.push(rel);
}

const forbidden = /dbSupabase\.js|\bdbSupabase\b/;
const violations = [];

for (const relPath of runtimeFiles) {
  const absPath = path.join(root, relPath);
  if (!fs.existsSync(absPath)) continue;
  if (relPath === 'js/dbSupabase.js') continue;

  const content = read(relPath);
  if (forbidden.test(content)) {
    violations.push(relPath);
  }
}

if (violations.length > 0) {
  console.error('FAIL: legacy dbSupabase reference found in runtime files:');
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

console.log('PASS: runtime files use canonical Supabase adapter path only.');
