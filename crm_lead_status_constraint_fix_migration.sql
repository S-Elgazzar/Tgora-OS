-- ============================================================
-- Tgora OS — CRM Lead Status Constraint Fix (Sprint CRM-4.5D Fix Pass)
-- Safe to re-run (idempotent): DROP CONSTRAINT IF EXISTS + re-ADD.
--
-- Bug: editing a Lead and setting Status to "Converted" fails with:
--   new row for relation "crm_leads" violates check constraint
--   "crm_leads_status_check"
--
-- Root cause: crm_leads_status_check exists live in Supabase but was never
-- captured by any migration in this repo (confirmed — no tracked migration
-- creates it; crm_base_schema_recovery_migration.sql's header explicitly
-- says it deliberately added NO CHECK constraints to crm_leads for exactly
-- this reason: "we cannot know from code alone whether existing rows would
-- violate a stricter constraint"). The Lead status UI was changed in Sprint
-- CRM-3A to offer 'converted'/'disqualified' instead of 'won'/'lost' (see
-- the architecture comment above normalizeCrmLeadStatusForDisplay() in
-- app.js), but the live DB constraint was apparently never updated to
-- match, and still only allows the older value set. That mismatch is what
-- rejects 'converted'/'disqualified' today.
--
-- Canonical Lead Status contract (matches the actual Lead form options,
-- header filter options, and badge logic in index.html/app.js today):
--   new, contacted, qualified, proposal_sent, converted, disqualified
-- Plus legacy values that existing rows may still carry and that the app
-- explicitly maps for display (normalizeCrmLeadStatusForDisplay: won ->
-- converted, lost -> disqualified) without rewriting the stored value:
--   won, lost
--
-- This migration does NOT:
--   - change which statuses the Lead form/filters offer (still just the six
--     current values — 'won'/'lost' are accepted for backward compatibility
--     only, never re-added to the UI)
--   - rewrite/backfill any existing row's status
--   - touch is_archived (archival is a separate boolean column, unrelated
--     to status)
--   - touch crm_deals, Finance, Projects, Tasks, or any other module
--
-- Uses NOT VALID so this ALTER TABLE cannot fail even if some existing row
-- holds a status value outside this list (we have no direct DB access to
-- confirm distinct values from this environment). NOT VALID still enforces
-- the constraint on every future INSERT/UPDATE — it only skips validating
-- pre-existing rows at apply time. Run the verification query below first;
-- if it returns zero rows, it is safe to also run the VALIDATE CONSTRAINT
-- statement at the bottom (optional, not required for the fix to work).
-- ============================================================

ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;

ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check
  CHECK (
    status IS NULL OR status IN (
      'new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'disqualified',
      'won', 'lost'
    )
  ) NOT VALID;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification
-- ============================================================

-- 1. Confirm the constraint now exists with the expected definition:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'crm_leads'::regclass AND conname = 'crm_leads_status_check';

-- 2. Find any existing row that would NOT satisfy the new constraint
--    (should be empty; if not empty, those are legacy values not covered
--    above and must be reviewed before validating):
-- SELECT id, lead_name, status FROM crm_leads
-- WHERE status IS NOT NULL
--   AND status NOT IN ('new','contacted','qualified','proposal_sent','converted','disqualified','won','lost');

-- 3. Confirm the previously-blocked update now succeeds:
-- UPDATE crm_leads SET status = 'converted' WHERE id = <some_lead_id>;

-- 4. Optional — only run after step 2 returns zero rows. This makes
--    Postgres validate all existing rows and mark the constraint VALID
--    (no behavior change for future writes either way):
-- ALTER TABLE crm_leads VALIDATE CONSTRAINT crm_leads_status_check;
-- ============================================================
