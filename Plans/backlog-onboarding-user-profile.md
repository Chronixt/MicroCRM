# Backlog: Onboarding + User Profile (First Name)

## Goal

Replace the temporary welcome-name source (login email) with real user profile data captured during onboarding, starting with `firstName`.

## Why

- Current welcome message uses email as a temporary identity label.
- Product UX needs a human-friendly greeting and profile foundation for future personalization.
- This creates the base for account settings and safer multi-user testing visibility later.

## Scope (Phase 1)

1. Add profile storage for authenticated users:
   - `first_name` (required)
   - `last_name` (optional for now)
2. Add a first-run onboarding flow after sign-in when profile is missing.
3. Save/update profile with owner-safe access controls.
4. Update welcome message to use `firstName` from profile.
5. Keep email fallback only if profile load fails.

## Acceptance Criteria

1. New user signs in and is prompted to complete onboarding before normal app flow.
2. Returning user with profile is not prompted again.
3. Welcome message shows `firstName` (not email) after onboarding is complete.
4. Profile data is isolated by authenticated user and cannot be read across users.
5. Existing user accounts can complete onboarding without data loss.
6. If profile read fails, app remains usable and welcome message falls back safely.

## Out of Scope (for this backlog item)

- Full account settings screen.
- Avatar/photo profile.
- Team/role management.
- Cross-product shared profile unification (can be addressed later).

## Suggested Implementation Notes

- Add product-scoped profile table in Supabase schema(s) with RLS by `owner_user_id = auth.uid()`.
- Create adapter methods in `db-supabase.js` for:
  - `getCurrentUserProfile()`
  - `upsertCurrentUserProfile(profile)`
- Add lightweight onboarding UI route/modal in `app.js`.
- Replace welcome message substitution source from `RUNTIME_INFO.email` to profile `firstName`.

## Rollout Safety

1. Ship behind a feature flag (recommended): `ENABLE_USER_ONBOARDING`.
2. Test with admin/test1/test2 accounts in both products.
3. Verify no impact to customer/job/appointment CRUD.
4. Keep email fallback until two successful release cycles.

## Ready-To-Start Checklist

- [ ] SQL migration drafted for profile table + RLS.
- [ ] JS adapter methods added.
- [ ] Onboarding UI implemented.
- [ ] Welcome message switched to profile firstName.
- [ ] Smoke test script/runbook updated.
