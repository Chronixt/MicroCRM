# Step 9 Native Setup Checklist (Capacitor + SQLite)

This branch now includes Capacitor scaffolding so native migration work can proceed in small steps.

## What is in place
- `capacitor.config.js` with:
  - `appId`: `com.crmicro.tradie`
  - `appName`: `TradieCRM`
  - `webDir`: `www`
- NPM scripts in `package.json`:
  - `native:web`
  - `native:sync`
  - `native:add:android`
  - `native:add:ios`
  - `native:open:android`
  - `native:open:ios`
  - `native:doctor`
- `scripts/prepare-native-web.js` to generate `www/` from runtime app files.

## Run order (first time)
1. `npm install`
2. `npm run native:web`
3. `npm run native:add:android`
4. `npm run native:sync`
5. `npm run native:open:android`

## Next implementation slice
- Wire real SQLite operations into `SQLiteDriver` using Capacitor SQLite plugin.
- Keep web/PWA path unchanged (`IndexedDB` + existing API adapter).

