-- ============================================================
-- Tgora OS — Deal → Project Conversion Fix (Multi-Project per Deal)
-- Safe to run multiple times (idempotent).
--
-- Context: CRM-5 originally enforced one-Project-per-Deal via a unique
-- partial index. Business review determined this is too restrictive:
-- one Deal may produce multiple Projects (e.g. a monthly retainer Deal
-- producing one Project per month, or a Deal producing several
-- workstream Projects). This migration removes that constraint.
--
-- This migration does NOT:
--   - drop projects.deal_id or its foreign key to crm_deals.
--   - backfill anything.
--   - create Finance Forecasts, Finance Transactions, or Accounting
--     Journal entries, or touch any existing finance_* / accounting
--     table or function.
--   - create Tasks automatically.
--   - redesign Projects or start Project Commercial Terms.
-- ============================================================

DROP INDEX IF EXISTS idx_projects_deal_id_unique;

-- Non-unique index remains so multiple Projects per Deal are still
-- indexed for lookups (projects.deal_id -> crm_deals.id).
CREATE INDEX IF NOT EXISTS projects_deal_id_idx ON projects(deal_id);

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification (run manually in the Supabase SQL editor after applying):
--
-- -- Confirm the unique index is gone and the non-unique index remains:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'projects'
--   AND indexname IN ('projects_deal_id_idx', 'idx_projects_deal_id_unique');
--
-- -- Confirm the FK is still live:
-- SELECT conname, confrelid::regclass
-- FROM pg_constraint
-- WHERE conrelid = 'projects'::regclass AND contype = 'f';
--
-- -- Confirm deal_id column still exists:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'projects' AND column_name = 'deal_id';
-- ============================================================
