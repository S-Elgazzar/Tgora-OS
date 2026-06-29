-- ============================================================
-- Tgora OS — Finance Safety Controls (Sprint 4.1A)
-- Run AFTER finance_migration_4_1.sql (Sprint 4.1)
-- Adds: soft-delete lifecycle, audit log
-- ============================================================

-- 1. Extend finance_transactions
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS is_deleted   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by   uuid NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS archived_by  uuid NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS finance_transactions_deleted_idx  ON finance_transactions(is_deleted);

-- 2. Extend finance_forecasts
ALTER TABLE finance_forecasts
  ADD COLUMN IF NOT EXISTS is_deleted   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at   timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by   uuid NULL REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS archived_by  uuid NULL REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS finance_forecasts_deleted_idx ON finance_forecasts(is_deleted);

-- 3. Audit log table
CREATE TABLE IF NOT EXISTS finance_audit_log (
  id          bigserial PRIMARY KEY,
  entity_type text        NOT NULL,
  entity_id   bigint      NOT NULL,
  action      text        NOT NULL,
  actor_id    uuid        NULL REFERENCES auth.users(id),
  old_data    jsonb       NULL,
  new_data    jsonb       NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_audit_log_entity_idx  ON finance_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS finance_audit_log_actor_idx   ON finance_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS finance_audit_log_action_idx  ON finance_audit_log(action);
CREATE INDEX IF NOT EXISTS finance_audit_log_created_idx ON finance_audit_log(created_at DESC);
