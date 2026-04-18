# Supabase schema for TradieCRM

## Using Supabase as the database

1. Run the schema (see below).
2. In **js/productConfig.js**, under the `tradie` product, set **`useSupabase: true`**.
3. Reload the app. The loader in `index.html` will load **dbSupabase.js** instead of **db.js**, so the app uses Supabase with the same API.

To switch back to IndexedDB, set **`useSupabase: false`** and reload.

## Run the schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Paste the contents of `schema.sql`.
4. Click **Run**.

All tables, indexes, RLS, and triggers will be created.

## Table ↔ app mapping

| Supabase table   | App (IndexedDB) | Notes |
|------------------|------------------|--------|
| `customers`      | `customers`      | Columns are `snake_case` (e.g. `first_name`). App uses `camelCase` (`firstName`) – map in code when you integrate. |
| `appointments`   | `appointments`   | Same. `end` is quoted in SQL because it’s a reserved word. |
| `images`         | `images`         | `data_url` stores base64 image data (can be large). |
| `notes`          | `notes`          | Typed payload: `note_type` (`text`/`svg`) with exactly one payload field populated (`text_value` or `svg`). |
| `note_versions`  | `noteVersions`   | Version snapshots use the same typed payload model as `notes` (`note_type` + `text_value`/`svg`). |
| `reminders`      | `reminders`      | Follow-ups. |
| `job_events`     | `jobEvents`      | Timeline / activity log. |

## Column name mapping (snake_case → camelCase)

When you switch the app to Supabase, convert keys when reading/writing:

- `first_name` ↔ `firstName`
- `last_name` ↔ `lastName`
- `contact_number` ↔ `contactNumber`
- `social_media_name` ↔ `socialMediaName` (hairdresser: SNS; tradie: not used for address)
- `referral_notes` ↔ `referralNotes`
- `address_line1` ↔ `addressLine1` (tradie: street address)
- `suburb` ↔ `suburb`
- `state` ↔ `state`
- `postcode` ↔ `postcode`
- `preferred_contact_method` ↔ `preferredContactMethod`
- `notes_image_data` ↔ `notesImageData`
- `created_at` ↔ `createdAt`
- `updated_at` ↔ `updatedAt`
- `customer_id` ↔ `customerId`
- `appointment_id` ↔ `appointmentId`
- `quoted_amount` ↔ `quotedAmount`
- `invoice_amount` ↔ `invoiceAmount`
- `paid_amount` ↔ `paidAmount`
- `data_url` ↔ `dataUrl`
- `edited_date` ↔ `editedDate`
- `note_number` ↔ `noteNumber`
- `text_value` ↔ `textValue`
- `note_type` ↔ `noteType`
- `note_id` ↔ `noteId`
- `saved_at` ↔ `savedAt`
- `due_at` ↔ `dueAt`
- `snoozed_until` ↔ `snoozedUntil`

## Address data (tradie)

For the tradie product, address is stored in **`address_line1`**, **`suburb`**, **`state`**, and **`postcode`**, not in `social_media_name`. The add/edit customer forms now use these fields.

If you previously saved address text into `social_media_name`, you can move it in SQL, for example:

```sql
-- One-time: copy social_media_name into address_line1 for rows that look like addresses
UPDATE customers
SET address_line1 = social_media_name, social_media_name = ''
WHERE social_media_name IS NOT NULL AND social_media_name <> ''
  AND (address_line1 IS NULL OR address_line1 = '');
```

Run this only if you want to migrate existing “address in social_media_name” data; new data is already saved to the address columns.

## RLS (Row Level Security)

Policies are set to allow all operations for `anon`. That’s fine for a single-user app with one anon key. When you add Supabase Auth (e.g. login), you can add policies that use `auth.uid()` so each user only sees their own data.

## If you get “EXECUTE FUNCTION” errors

Older Postgres may not support `EXECUTE FUNCTION`. Replace it with `EXECUTE PROCEDURE` in the trigger definitions in `schema.sql` and run again.
