# 🚨 Emergency Backup Instructions for iPad Safari

## The Problem
When you push updates to your app, iPad Safari may not load the new version due to aggressive caching. Clearing Safari's cache will delete your local database, causing data loss.

## The Solution
This app now includes an **Emergency Backup** feature that allows you to:
1. **Backup your database** before clearing cache
2. **Force the app to update** without losing data

## How to Use Emergency Backup

### Step 1: Access Emergency Backup
1. Open your app in Safari on iPad
2. Look for the red "🚨 Emergency Backup" button in the main menu
3. Tap it to open the emergency backup page

### Step 2: Backup Your Data
1. On the emergency backup page, tap **"Download Backup Now"**
2. This will download a JSON file containing all your data:
   - Customer records
   - Appointments
   - Images
3. **IMPORTANT**: Save this file somewhere safe (iCloud, email, etc.)

### Step 3: Force App Update
1. After backing up, tap **"Clear Cache & Reload App"**
2. This will:
   - Clear all caches
   - Unregister the service worker
   - Force reload the app with the latest version
3. The app will automatically reload with the new version

### Step 4: Restore Data (if needed)
1. If you need to restore your data, go to the regular "Backup" menu
2. Use the "Load" button to import your backup file
3. Select "Replace (wipe then import)" mode
4. Tap "Import Selected"

## Technical Details

### What the Emergency Backup Does
- **Exports all data** from IndexedDB to a JSON file
- **Clears all caches** including service worker cache
- **Forces a hard reload** with cache busting
- **Preserves language preference** during cache clear

### Cache Busting Strategy
The app now uses a "network-first" strategy for JavaScript and CSS files:
- Always tries to fetch the latest version from the server
- Falls back to cache only if network fails
- Automatically updates cache when new versions are found

### Service Worker Updates
- Version number incremented to force cache invalidation
- Automatic update checking on app load
- User prompt when new version is available

## Prevention
To avoid this issue in the future:
1. **Always backup before major updates**
2. **Test updates on a non-production device first**
3. **Consider implementing automatic backup scheduling**

## Troubleshooting

### If Emergency Backup Doesn't Work
1. Try the manual method:
   - Go to Safari Settings > Advanced > Website Data
   - Find your app's domain and tap "Remove"
   - Reload the app

### If Data is Lost
1. Check if you have any backup files
2. Look for files named `chikas-emergency-backup-YYYY-MM-DD.json`
3. Use the regular backup/restore feature to import them

### If App Still Doesn't Update
1. Try adding `?v=timestamp` to the URL
2. Force close Safari and reopen
3. Check if you're connected to the internet

## Files Modified
- `js/app.js` - Added emergency backup functionality
- `sw.js` - Updated cache strategy and version
- `emergency-backup-test.html` - Test page for functionality

## Support
If you encounter any issues:
1. Check the browser console for error messages
2. Try the test page (`emergency-backup-test.html`) first
3. Ensure you have a stable internet connection
4. Make sure you're using a recent version of Safari on iPad
