-- ============================================================
-- Tgora OS — Collections Foundation: Finance Transaction Linkage
-- (Finance Completion Sprint, Work Package 1)
-- Run AFTER project_commercial_forecast_linkage_migration.sql (Project
-- Commercial C1) and finance_migration_4_1a.sql (Finance 4.1A).
-- Safe to run multiple times (idempotent).
--
-- Locked architecture: Payment Schedule Item -> Finance Transactions (1..N).
-- No payment_collections entity. Finance Transactions are the collection
-- source of truth. Collected/Outstanding are always derived by summing
-- valid finance_transactions rows against this column — never stored.
--
-- This is the ENTIRE schema delta this architecture requires: one nullable,
-- additive column. Component (Revenue vs. Client Funds) is deliberately NOT
-- stored anywhere — it is derived from the existing transaction_type at read
-- time (income -> revenue, pass_through_received -> client_funds), since
-- FINANCE_RULES already classifies both unambiguously and no rule entry has
-- both revenueImpact and clientFundsImpact non-zero. See the Architecture
-- Lock report for the full reasoning.
-- ============================================================

ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS payment_schedule_item_id bigint NULL REFERENCES project_payment_schedule_items(id);

CREATE INDEX IF NOT EXISTS finance_transactions_payment_schedule_item_idx
  ON finance_transactions(payment_schedule_item_id);

-- Force PostgREST to reload its schema cache immediately.
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification (run manually in the Supabase SQL editor after applying):
--
-- -- 1. Confirm the new column exists with the expected type/nullability:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'finance_transactions' AND column_name = 'payment_schedule_item_id';
--
-- -- 2. Confirm the FK is live:
-- SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS references_table
-- FROM pg_constraint
-- WHERE conrelid = 'finance_transactions'::regclass AND contype = 'f'
--   AND conname LIKE '%payment_schedule_item%';
--
-- -- 3. Confirm the index exists:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'finance_transactions' AND indexname = 'finance_transactions_payment_schedule_item_idx';
--
-- -- 4. Confirm every existing transaction is untouched (should return the
-- --    full existing row count, all with the column NULL):
-- SELECT count(*) AS total, count(*) FILTER (WHERE payment_schedule_item_id IS NULL) AS null_link
-- FROM finance_transactions;
-- -- Expect null_link = total.
-- ============================================================
