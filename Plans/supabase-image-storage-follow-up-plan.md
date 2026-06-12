# Supabase Image Storage Follow-Up Plan

## Goal
Move note scans, profile images, and other large image payloads out of Postgres row storage (`images.data_url`) and into Supabase Storage, while preserving backup/import behavior and keeping existing customer profile workflows intact.

## Why This Is Deferred
The current live patch focuses on low-risk Disk IO reductions in application query patterns. Moving image payloads to Supabase Storage is likely the biggest long-term IO win, but it carries migration, backup, and restore complexity that should be handled as a dedicated phase after we measure the impact of the lighter query changes.

## Proposed Target Shape

### Database
Keep the `images` table for metadata only:
- `id`
- `customer_id`
- `appointment_id`
- `name`
- `type`
- `created_at`
- `rotation_degrees`
- `storage_path`
- `storage_bucket`
- optional compatibility fields for migration status

Deprecate `data_url` as the primary runtime source once migration is complete.

### Storage
Store actual image bytes in Supabase Storage:
- bucket per product or shared bucket with product-prefixed paths
- path pattern should be deterministic and backup-friendly, for example:
  - `customers/{customerId}/{imageId}-{filename}`
  - `appointments/{appointmentId}/{imageId}-{filename}`

### Runtime Reads
- list/grid/gallery views fetch metadata only
- explicit image display/edit flows fetch signed/public URLs or file bytes on demand
- backup/export paths remain the only places where full payload export is expected to be heavy

## Migration Phases

### Phase 1: Compatibility Prep
1. Add metadata columns:
   - `storage_bucket`
   - `storage_path`
   - optional `storage_migrated_at`
2. Update app code so image reads can resolve from either:
   - legacy `data_url`
   - or storage path
3. Keep writes dual-compatible during rollout.

### Phase 2: New Writes to Storage
1. Upload newly added images to Supabase Storage
2. Save only metadata/path in `images`
3. Keep legacy fallback support for old rows still using `data_url`

### Phase 3: Backfill Existing Rows
1. Scan legacy `images` rows with `data_url`
2. Upload each payload into Storage
3. Write `storage_bucket` + `storage_path`
4. Verify fetch/render parity
5. Only then consider nulling or trimming `data_url`

### Phase 4: Backup/Restore Compatibility
1. Decide whether app backups should:
   - embed image payloads as today, or
   - export metadata + downloaded binary payloads at backup time
2. Ensure restore works for:
   - old backups containing `data_url`
   - new backups containing storage-aware image records
3. Keep import tolerant of both formats during transition

### Phase 5: Cleanup
1. Stop runtime dependence on `data_url`
2. Remove legacy fallback paths only after all existing rows are migrated and verified
3. Consider dropping or archiving the `data_url` column in a later controlled migration

## Safety Checks
- rehearse first on:
  - `hairdresser_sandbox_admin`
  - `hairdresser`
  - `tradie`
  - then production
- verify customer profile image galleries before and after migration
- verify backup/export and restore round-trips
- verify note scans still load in all note/profile flows
- confirm no product branch regressions in image rotation and delete behavior

## Open Decisions
1. Storage bucket naming:
   - per product bucket vs shared bucket with prefixes
2. Backup format:
   - keep embedded payloads vs export a storage-aware package
3. Cleanup policy:
   - retain `data_url` for rollback period or remove immediately after verified backfill

## Success Criteria
- normal image list/profile flows stop reading base64 blobs from Postgres rows
- routine UI usage no longer depends on `images.data_url`
- backup/import compatibility is preserved
- production Disk IO pressure materially drops after rollout
