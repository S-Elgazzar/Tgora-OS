-- ============================================================
-- Tgora OS — CRM UAT Fix Pass 1: Contact Operational Fields (PART 6C)
-- Safe to run multiple times (idempotent).
--
-- Context: UAT Fix Pass 1 adds four operational fields to the Contact
-- (crm_contacts) form and Contact Details: Department, Preferred Contact
-- Method, Decision Maker, and LinkedIn URL. Confirmed against
-- crm_base_schema_recovery_migration.sql (the only migration that creates
-- crm_contacts): none of these columns exist today. This migration adds
-- only the four minimal columns needed.
--
-- preferred_contact_method gets a CHECK constraint (mirrors the existing
-- crm_leads_status_check style used elsewhere in this repo) constrained to
-- the three options offered by the Contact form: email, phone, whatsapp.
-- Added directly (not NOT VALID) because this is a brand-new nullable
-- column with no pre-existing rows that could violate it.
--
-- This migration does NOT:
--   - remove/rename any existing column
--   - touch crm_clients, crm_leads, crm_deals, or any other table
--   - add a NOT NULL constraint on any of the four new columns (all remain
--     optional, per PART 6C)
-- ============================================================

ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS department                text NULL;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS preferred_contact_method  text NULL;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_decision_maker         boolean NOT NULL DEFAULT false;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS linkedin_url              text NULL;

ALTER TABLE crm_contacts DROP CONSTRAINT IF EXISTS crm_contacts_preferred_contact_method_check;
ALTER TABLE crm_contacts ADD CONSTRAINT crm_contacts_preferred_contact_method_check
  CHECK (preferred_contact_method IS NULL OR preferred_contact_method IN ('email', 'phone', 'whatsapp'));

NOTIFY pgrst, 'reload schema';
