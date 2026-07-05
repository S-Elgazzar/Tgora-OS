-- ============================================================
-- Tgora OS — CRM Lead → Contact Relation (Sprint CRM-4.5D)
-- Safe to run multiple times (idempotent).
--
-- Context: CRM-4.5D moves Lead creation to select an existing Company +
-- existing Contact instead of free-text company/contact/phone/whatsapp/
-- email fields. crm_leads already has client_id (added in
-- crm_data_model_completion_migration.sql) but has no contact_id. This
-- migration adds it, mirroring the client_id column it sits next to.
--
-- This migration does NOT:
--   - remove or rename any existing crm_leads column (company_name,
--     contact_person, phone, whatsapp, email remain as legacy/snapshot
--     columns for backward compatibility with old rows and old render code)
--   - migrate/backfill contact_id for any existing row
--   - add any NOT NULL/CHECK constraint or trigger/automation
-- ============================================================

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contact_id bigint NULL REFERENCES crm_contacts(id);
CREATE INDEX IF NOT EXISTS crm_leads_contact_id_idx ON crm_leads(contact_id);

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification (run manually in the Supabase SQL editor after applying):
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'crm_leads' AND column_name = 'contact_id';
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'crm_leads' AND indexname = 'crm_leads_contact_id_idx';
-- ============================================================
