---
name: Address fields and lookup
overview: Add address fields to the new/edit customer form and Supabase `hairdresser.customers` table, then implement an optional address lookup and autofill layer that can populate those fields from a search.
todos: []
isProject: false
---

# Address fields and address lookup for hairdresser branch

## Current state

- **New customer form**: [js/app.js](js/app.js) `renderAddRecord()` (lines 538–609) builds the form with firstName, lastName, contactNumber, socialMediaName, referralNotes; save handler (629–652) builds a `customer` object and calls `ChikasDB.createCustomer(customer)`.
- **Edit customer form**: [js/app.js](js/app.js) customer edit view (form `#customer-form` around 1354–1410) has the same fields; `setInputValue` (1417–1421) and save via `getInputValue` (1590–1594) read/write those fields.
- **Supabase**: [supabase/migrations/001_hairdresser_schema.sql](supabase/migrations/001_hairdresser_schema.sql) defines `hairdresser.customers` with first_name, last_name, contact_number, social_media_name, referral_notes, referral_type, updated_at. No address columns.
- **Backend mapping**: [js/db-supabase.js](js/db-supabase.js) uses `toSnake` / `toCamel` (41–75) and maps customer fields in `createCustomer` (152–164) and `updateCustomer` (166–179). [js/db.js](js/db.js) stores the customer object as-is in IndexedDB (no fixed schema).

## 1. Database: add address columns (Supabase)

Add a **new migration** (e.g. `002_customers_address.sql`) so existing deployments can apply it without editing the first migration:

- Add nullable `text` columns to `hairdresser.customers`:
  - `address_line1`
  - `address_line2`
  - `suburb`
  - `state`
  - `postcode`
  - `country`
- No new indexes required for typical “view/edit by id” usage. Optionally add a composite index on `(suburb, state)` later if you need address-based search.

Apply the migration in Supabase Dashboard (SQL Editor) or via Supabase CLI.

## 2. Backend: map and persist address fields

- **db-supabase.js**
  - In `toSnake`, add: `addressLine1`, `addressLine2`, `suburb`, `state`, `postcode`, `country` → snake_case.
  - In `toCamel`, add the reverse mapping for the new columns.
  - In `createCustomer`, add the six address fields to the `row` object (from `customer.addressLine1`, etc.).
  - In `updateCustomer`, add the same six address fields to `row`.
  - Optionally in `searchCustomers`, append address fields to the `hay` string so search-by-name also matches address text.
- **db.js**
  - No schema or migration. IndexedDB stores the object as-is; ensure the app passes the new address properties when creating/updating so they persist for non-Supabase mode.

## 3. Form and UI: add address fields

- **Translations** (in `app.js`): Add keys for address labels/placeholders (e.g. `addressLine1`, `suburb`, `state`, `postcode`, `country`, and a single “Address” or “Address lookup” for the autofill input) in both language blocks.
- **New customer form** (`renderAddRecord`):
  - After the Referral block, add an **Address** section:
    - One optional “Address lookup” input (see step 4) that will drive autofill.
    - Fields: Address line 1, Address line 2 (optional), Suburb, State, Postcode, Country (optional), reusing the same `.input-with-button` + handwrite pattern where you want it (e.g. line1 and line2).
  - In the save handler, read these inputs and add `addressLine1`, `addressLine2`, `suburb`, `state`, `postcode`, `country` to the `customer` object.
- **Edit customer form** (`#customer-form`):
  - Add the same Address section and the same input names.
  - In the block where you call `setInputValue` for existing fields, add `setInputValue` for each address field from `customer`.
  - In the edit save path (where you build the object with `getInputValue`), add `getInputValue` for each address field and include them in the payload passed to `updateCustomer`.
- **Customer detail view** (customer view template where Contact, Social media, Referral are shown):
  - Add a single **Address** detail line that formats the address (e.g. line1; line2 if present; suburb, state postcode; country if present), or show “—” when all address fields are empty.
- **Handwrite / accessibility**: In the handler that attaches handwrite to `.input-icon-btn` (and any logic that checks `el.name` for handwrite), include the new address field names so those inputs get the same behavior.

Keep the same patterns (label, `input[name="..."]`, `getInputValue`/`setInputValue`) so address is consistent with the rest of the form.

## 4. Address lookup and autofill “extension”

Implement as an **optional, modular** feature so it can be enabled via config and does not block the rest of the address work:

- **Behaviour**: One “Address lookup” or “Search address” input. On typing (debounced), call an address/places API; on suggestion select, parse the result and fill `addressLine1`, `suburb`, `state`, `postcode`, and optionally `country`. Leave `addressLine2` for manual entry (unit/suite).
- **Options**:
  - **A – Free, no key (recommended default)**: Use **OpenStreetMap Nominatim** (or similar) with a single search input and a dropdown of suggestions; on select, parse the result (e.g. `address` object: road, suburb, state, postcode, country) and map to your fields. No API key; rate limits apply (e.g. 1 req/s); good for international.
  - **B – Google Places**: Use Places Autocomplete (optional), with API key in `config.local.js`; only load the script when the key is set. Better UX and accuracy; requires key and billing.
- **Implementation**:
  - Add a small **js/address-lookup.js** (or similar) that:
    - Exports or exposes a single function, e.g. `attachAddressLookup(searchInputSelector, filledFields)` where `filledFields` is an object of `{ addressLine1, suburb, state, postcode, country }` (DOM elements or getter/setter). On suggestion select, it sets those fields.
    - Uses a config flag (e.g. `window.ADDRESS_LOOKUP_ENABLED` or `window.USE_ADDRESS_LOOKUP`) and optionally `window.GOOGLE_PLACES_API_KEY` in `config.local.js`.
  - In the new/edit form, add the “Address lookup” input and a container for the suggestions dropdown. After the form is rendered, if address lookup is enabled, call `attachAddressLookup(...)` with the new address input and references to the line1, suburb, state, postcode, country inputs (or their names so the helper can resolve them in the current form).
  - Load `address-lookup.js` from `index.html` only when you want the feature (e.g. conditional script tag or always load but only attach when config is set). This keeps it as an “extension” that can be toggled without changing core form logic.
- **Fallback**: If lookup is disabled or fails, users can still type address fields manually. All address fields remain normal inputs.

## 5. Order of implementation (streamlined)

1. **Migration** – Add `002_customers_address.sql` and run it in Supabase.
2. **db-supabase.js** – toSnake/toCamel + createCustomer/updateCustomer (and optional search).
3. **app.js** – Address section (new + edit forms), save/edit payload, detail view, i18n, handwrite list.
4. **address-lookup.js** – Implement Nominatim (or both Nominatim and Google) and `attachAddressLookup`; wire config and script load in `index.html`.
5. **db.js** – No structural change; confirm create/update in app pass address fields so IndexedDB keeps them.

## Summary

- **Database**: One migration adding six nullable address columns to `hairdresser.customers`.
- **Backend**: Supabase layer maps and persists them; IndexedDB gets them via the same customer object.
- **Form**: Same form pattern as existing fields; new + edit + detail view all use the new address fields.
- **Lookup**: Optional script that attaches autocomplete to one input and fills the others, with a free default (e.g. Nominatim) and optional Google Places, config-driven and easy to enable/disable.
