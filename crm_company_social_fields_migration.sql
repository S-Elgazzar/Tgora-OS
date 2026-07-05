-- ============================================================
-- Tgora OS — CRM Company Social Fields (Sprint CRM-4.5B)
-- Safe to run multiple times (idempotent).
--
-- Context: CRM-4.5B adds Social Media links and a free-text Referred By
-- field to the Company (crm_clients) form and Company Details. Neither
-- column exists on crm_clients today (confirmed against
-- crm_base_schema_recovery_migration.sql, which lists every crm_clients
-- column and has none of these). This migration adds the minimum columns
-- needed, as simple text columns rather than JSON, matching every other
-- crm_clients field and requiring no parsing on the Vanilla JS side.
--
-- This migration does NOT:
--   - remove/rename any existing column
--   - touch crm_contacts, crm_leads, crm_deals, or any other table's social
--     fields (none exist there and none are added here)
--   - add any NOT NULL/CHECK constraint or trigger/automation
-- ============================================================

ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS facebook_url     text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS instagram_url    text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS linkedin_url     text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS tiktok_url       text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS snapchat_url     text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS other_social_url text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS referred_by      text NULL;

-- No indexes added — these are freeform URLs/text, never filtered or sorted
-- on, so an index would only add write overhead with no read benefit.

NOTIFY pgrst, 'reload schema';
