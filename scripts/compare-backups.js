#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Usage: node scripts/compare-backups.js <source.json> <target.json> [--strict]');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const strict = args.includes('--strict');
  const positional = args.filter((a) => a !== '--strict');
  if (positional.length < 2) {
    usage();
    process.exit(1);
  }
  return { sourcePath: positional[0], targetPath: positional[1], strict };
}

function loadJson(filePath) {
  const absolute = path.resolve(filePath);
  const text = fs.readFileSync(absolute, 'utf8');
  return JSON.parse(text);
}

function normalizeBackup(raw) {
  const customers = Array.isArray(raw?.customers) ? raw.customers : [];
  const appointments = Array.isArray(raw?.appointments) ? raw.appointments : [];
  const images = Array.isArray(raw?.images) ? raw.images : [];
  const customerNotes = raw?.customerNotes && typeof raw.customerNotes === 'object' ? raw.customerNotes : {};
  return { customers, appointments, images, customerNotes };
}

function countNotes(customerNotes) {
  return Object.values(customerNotes).reduce((sum, list) => {
    if (!Array.isArray(list)) return sum;
    return sum + list.length;
  }, 0);
}

function buildPerCustomerCount(items, customerIdKey) {
  const counts = new Map();
  items.forEach((item) => {
    const key = String(item?.[customerIdKey]);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function buildPerCustomerNoteCount(customerNotes) {
  const counts = new Map();
  Object.keys(customerNotes).forEach((customerId) => {
    const notes = customerNotes[customerId];
    counts.set(String(customerId), Array.isArray(notes) ? notes.length : 0);
  });
  return counts;
}

function compareMaps(label, sourceMap, targetMap) {
  const mismatches = [];
  const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);
  allKeys.forEach((key) => {
    const s = sourceMap.get(key) || 0;
    const t = targetMap.get(key) || 0;
    if (s !== t) mismatches.push(`${label} customerId=${key}: source=${s}, target=${t}`);
  });
  return mismatches;
}

function validateImages(images, backupLabel) {
  const issues = [];
  images.forEach((img, idx) => {
    const prefix = `${backupLabel} images[${idx}]`;
    if (img == null || typeof img !== 'object') {
      issues.push(`${prefix}: not an object`);
      return;
    }
    if (img.customerId === undefined || img.customerId === null) issues.push(`${prefix}: missing customerId`);
    if (!img.name) issues.push(`${prefix}: missing name`);
    if (!img.type) issues.push(`${prefix}: missing type`);
    if (!img.createdAt) issues.push(`${prefix}: missing createdAt`);
    if (!img.dataUrl || typeof img.dataUrl !== 'string' || img.dataUrl.length < 30) issues.push(`${prefix}: missing/invalid dataUrl`);
  });
  return issues;
}

function main() {
  const { sourcePath, targetPath, strict } = parseArgs(process.argv);

  const sourceRaw = loadJson(sourcePath);
  const targetRaw = loadJson(targetPath);
  const source = normalizeBackup(sourceRaw);
  const target = normalizeBackup(targetRaw);

  const failures = [];
  const warnings = [];

  const sourceCounts = {
    customers: source.customers.length,
    appointments: source.appointments.length,
    images: source.images.length,
    notes: countNotes(source.customerNotes)
  };
  const targetCounts = {
    customers: target.customers.length,
    appointments: target.appointments.length,
    images: target.images.length,
    notes: countNotes(target.customerNotes)
  };

  ['customers', 'appointments', 'images', 'notes'].forEach((k) => {
    if (sourceCounts[k] !== targetCounts[k]) {
      failures.push(`Count mismatch (${k}): source=${sourceCounts[k]}, target=${targetCounts[k]}`);
    }
  });

  const sourceImagesByCustomer = buildPerCustomerCount(source.images, 'customerId');
  const targetImagesByCustomer = buildPerCustomerCount(target.images, 'customerId');
  failures.push(...compareMaps('Image count mismatch for', sourceImagesByCustomer, targetImagesByCustomer));

  const sourceNotesByCustomer = buildPerCustomerNoteCount(source.customerNotes);
  const targetNotesByCustomer = buildPerCustomerNoteCount(target.customerNotes);
  failures.push(...compareMaps('Note count mismatch for', sourceNotesByCustomer, targetNotesByCustomer));

  const sourceImageIssues = validateImages(source.images, 'source');
  const targetImageIssues = validateImages(target.images, 'target');
  if (sourceImageIssues.length) warnings.push(...sourceImageIssues);
  if (targetImageIssues.length) failures.push(...targetImageIssues);

  if (strict) {
    const sourceCustomerIds = new Set(source.customers.map((c) => String(c?.id)));
    const targetCustomerIds = new Set(target.customers.map((c) => String(c?.id)));
    const allIds = new Set([...sourceCustomerIds, ...targetCustomerIds]);
    allIds.forEach((id) => {
      if (!sourceCustomerIds.has(id) || !targetCustomerIds.has(id)) {
        failures.push(`Customer ID set mismatch: id=${id}`);
      }
    });
  }

  console.log('--- Backup Compare Summary ---');
  console.log(`Source: ${path.resolve(sourcePath)}`);
  console.log(`Target: ${path.resolve(targetPath)}`);
  console.log(`Counts source: ${JSON.stringify(sourceCounts)}`);
  console.log(`Counts target: ${JSON.stringify(targetCounts)}`);

  if (warnings.length) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.slice(0, 30).forEach((w) => console.log(`- ${w}`));
    if (warnings.length > 30) console.log(`- ... ${warnings.length - 30} more`);
  }

  if (failures.length) {
    console.log(`FAIL (${failures.length} issue(s))`);
    failures.slice(0, 50).forEach((f) => console.log(`- ${f}`));
    if (failures.length > 50) console.log(`- ... ${failures.length - 50} more`);
    process.exit(2);
  }

  console.log('PASS (strict parity checks succeeded)');
}

main();
