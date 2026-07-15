-- ============================================================
-- Tgora OS — CRM UAT Fix Pass 1: Company Country (PART 5B)
-- Safe to run multiple times (idempotent).
--
-- Context: UAT Fix Pass 1 adds a dedicated Company Country field
-- (Egypt / Saudi Arabia / United Arab Emirates / Oman, controlled via the
-- app-side select — no DB-level CHECK constraint, matching how other
-- controlled-list text columns like crm_clients.status are handled today).
-- Confirmed against crm_base_schema_recovery_migration.sql: no country
-- column exists on crm_clients today (only a single free-text `address`
-- column). This migration adds the minimum column needed.
--
-- This migration does NOT:
--   - remove/rename any existing column
--   - touch crm_contacts, crm_leads, crm_deals, or any other table
--   - add any NOT NULL/CHECK constraint or trigger/automation
-- ============================================================

ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS country text NULL;

NOTIFY pgrst, 'reload schema';
