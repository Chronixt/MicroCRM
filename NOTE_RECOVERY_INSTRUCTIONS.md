# 🔧 Note Recovery Instructions

If you've lost note data due to the editing bug, you can recover it using these methods:

## Option 1: Automatic Recovery from localStorage/IndexedDB

Your notes are stored in **both** localStorage and IndexedDB. If one got corrupted, the other likely has the original data.

### Step 1: Scan for Corrupted Notes

Open your browser's Developer Console (F12) and run:

```javascript
// Scan for corrupted notes (this won't change anything)
const scanResults = await ChikasDB.scanForCorruptedNotes();
console.log('Corrupted notes:', scanResults.corrupted.length);
console.log('Healthy notes:', scanResults.healthy.length);
console.log('Notes only in localStorage:', scanResults.localStorageOnly.length);
console.log('Notes only in IndexedDB:', scanResults.indexeddbOnly.length);
console.log('Conflicts (different versions):', scanResults.conflicts.length);

// View detailed results
console.log('Detailed scan:', scanResults);
```

### Step 2: Preview Recovery (Dry Run)

See what would be recovered without actually doing it:

```javascript
// Preview what will be recovered
const preview = await ChikasDB.recoverCorruptedNotes(true); // dryRun = true
console.log('Notes that can be recovered:', preview.canRecover);
console.log('Recovery actions:', preview.actions);
console.log('Summary:', preview.summary);
```

### Step 3: Actually Recover the Notes

If the preview looks good, run the actual recovery:

```javascript
// Actually recover the notes
const recovery = await ChikasDB.recoverCorruptedNotes(false); // dryRun = false
console.log('Recovered:', recovery.recovered, 'notes');
console.log('Failed:', recovery.failed, 'notes');
console.log('Details:', recovery.details);
```

## Option 2: Restore from Backup File

If you have a backup file (like `chikas-backup-2025-09-08T05-01-16.136Z.json`), you can restore notes from it.

### Step 1: Load Your Backup File

1. In your app, go to the Backup menu
2. Click "Load" and select your backup file
3. The file will be loaded into memory

### Step 2: Restore Notes from Backup

In the browser console:

```javascript
// First, load your backup file manually (if not already loaded)
// You'll need to load it via the file input, then access it

// After loading, restore notes (merge mode - only replaces corrupted notes)
const restoreResult = await ChikasDB.restoreNotesFromBackup(loadedBackupData, {
  mode: 'merge' // Options: 'merge' (smart) or 'replace' (force replace all)
});

console.log('Restored:', restoreResult.restored);
console.log('Skipped:', restoreResult.skipped);
console.log('Failed:', restoreResult.failed);
console.log('Details:', restoreResult.details);
```

### Restore Notes for a Specific Customer

If you only want to restore notes for one customer:

```javascript
// Replace 123 with your customer ID
const restoreResult = await ChikasDB.restoreNotesFromBackup(loadedBackupData, {
  mode: 'merge',
  customerId: 123
});
```

## Option 3: Manual Recovery via Browser Console

If you want more control, you can manually inspect and restore notes:

### View Notes in localStorage

```javascript
const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
console.log('Customer notes in localStorage:', customerNotes);

// View notes for a specific customer (replace 123 with customer ID)
console.log('Notes for customer 123:', customerNotes['123']);
```

### View Notes in IndexedDB

```javascript
const allNotes = await ChikasDB.getAllNotes();
console.log('All notes in IndexedDB:', allNotes);

// Find notes for a specific customer
const customerNotes = await ChikasDB.getNotesByCustomerId(123);
console.log('Notes for customer 123:', customerNotes);
```

### Manually Restore a Specific Note

```javascript
// If you found a good version of a note, restore it
const goodNote = {
  id: 12345,
  customerId: 123,
  svg: '<svg>...</svg>', // Your SVG data
  date: '9/8/2025',
  noteNumber: 1
};

// Restore it
await ChikasDB.updateNote(goodNote);
console.log('Note restored!');
```

## Understanding the Scan Results

The scan will categorize notes into:

- **corrupted**: Notes missing essential fields (svg or date)
  - Contains `healthyVersion` if found in the other storage
  - Contains `corruptedVersion` showing what's wrong
- **healthy**: Notes that appear complete
- **localStorageOnly**: Notes that only exist in localStorage
- **indexeddbOnly**: Notes that only exist in IndexedDB
- **conflicts**: Notes that exist in both but have different content

## Tips

1. **Always preview first**: Use `dryRun = true` to see what will happen before actually recovering
2. **Check backup files**: Your backup files likely contain the original, uncorrupted notes
3. **localStorage is often safer**: If a note was corrupted in IndexedDB, check localStorage - it often has the original
4. **Save a new backup**: After recovering, create a new backup to preserve the recovered data

## Need Help?

If you're not comfortable with the console, you can also:
1. Export your current data (to preserve what you have)
2. Check if you have older backup files
3. Look for notes in localStorage - they're stored under the key `customerNotes`

The recovery functions will automatically:
- Compare notes between localStorage and IndexedDB
- Identify which version is healthier (more complete data)
- Restore from the better version
- Preserve all note fields (not just svg and date)

