-- ============================================================
-- Tgora OS — Deal → Project Conversion (Sprint CRM-5)
-- Safe to run multiple times (idempotent).
--
-- Context: CRM-5 introduces an explicit, user-triggered Deal → Project
-- conversion flow. A Won Deal may become a Project only when the user
-- clicks "Create Project" on that Deal — stage changing to 'won' never
-- creates a Project on its own. One Deal may produce at most one Project;
-- the unique index below enforces that at the database level as the
-- final backstop behind the UI and application-handler guards.
--
-- This migration does NOT:
--   - add projects.client_id. Company remains reachable for Deal-linked
--     projects transitively via projects.deal_id -> crm_deals.client_id
--     -> crm_clients. projects.client stays the single free-text field
--     for ALL projects, standalone or Deal-originated — see the CRM-5
--     report for the full rationale (adding a relational client_id to
--     every project, including standalone ones with no company picker
--     UI today, is a larger change than "Deal → Project Conversion" and
--     is deliberately deferred to a future sprint).
--   - backfill deal_id for any existing project row (no deterministic
--     mapping exists from legacy free-text projects.client back to a
--     specific crm_deals row).
--   - create Finance Forecasts, Finance Transactions, or Accounting
--     Journal entries, or touch any existing finance_* / accounting
--     table or function.
--   - create Tasks automatically.
--   - rename or remove any existing column on projects or crm_deals.
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS deal_id bigint NULL REFERENCES crm_deals(id);

CREATE INDEX IF NOT EXISTS projects_deal_id_idx ON projects(deal_id);

-- One Deal -> at most one Project. Partial index so multiple projects
-- with deal_id IS NULL (every standalone project, past and future)
-- remain unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_deal_id_unique
ON projects(deal_id)
WHERE deal_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification (run manually in the Supabase SQL editor after applying):
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'projects' AND column_name = 'deal_id';
--
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'projects'
--   AND indexname IN ('projects_deal_id_idx', 'idx_projects_deal_id_unique');
--
-- -- Confirm the FK is live:
-- SELECT conname, confrelid::regclass
-- FROM pg_constraint
-- WHERE conrelid = 'projects'::regclass AND contype = 'f';
-- ============================================================
