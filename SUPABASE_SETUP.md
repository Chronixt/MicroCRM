# Supabase Setup for TradieCRM

## What’s in place

1. **Supabase script** – Loaded from CDN in `index.html`.
2. **`js/supabaseClient.js`** – Creates the client with your Project URL and anon key.
3. **Global client** – After load, use `window.SupabaseClient` in the app (or in the console to test).

## Check it works

1. Open the app in the browser.
2. Open DevTools → Console.
3. You should see: `Supabase client initialized`.
4. Run: `window.SupabaseClient`  
   You should see the client object (not `null`).

If you see “Supabase JS not loaded”, the CDN script may not expose a global. Try this script instead of the current one:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

## Important: app still uses IndexedDB

The app still reads and writes data via **IndexedDB** (`db.js`). Supabase is only **connected**; no data is sent to Supabase until you change the app to use it.

## Next steps (when you want to use Supabase)

1. **Create tables in Supabase**  
   In Supabase Dashboard → SQL Editor, create tables that match your app (e.g. `customers`, `appointments`, `images`, `notes`, `reminders`, `job_events`).

2. **Turn on Row Level Security (RLS)**  
   Define policies so the anon key can only access the rows you intend (e.g. by user/session).

3. **Switch the app to Supabase**  
   In `db.js`, replace IndexedDB calls with `window.SupabaseClient.from('table_name').select()`, `.insert()`, `.update()`, `.delete()`, etc., or add a thin “Supabase adapter” and keep the same API.

4. **Optional: move keys out of the repo**  
   You can move the URL and anon key into a small config file and add it to `.gitignore`, or use a build step with env vars. The anon key is safe in the browser as long as RLS is set up correctly.

## Security note

The **anon key** is meant to be used in the browser. Security is enforced by **Row Level Security (RLS)** in Supabase. Do not put the **service_role** key in front-end code.
