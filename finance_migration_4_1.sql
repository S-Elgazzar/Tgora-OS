-- ============================================================
-- Tgora OS — Finance Controls & Forecasting (Sprint 4.1)
-- Run AFTER finance_migration.sql (Sprint 4.0)
-- ============================================================

-- 1. Extend finance_transactions
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS transaction_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS status             text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS due_date           date,
  ADD COLUMN IF NOT EXISTS internal_notes     text,
  ADD COLUMN IF NOT EXISTS tags               text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attachment_url     text,
  ADD COLUMN IF NOT EXISTS created_by         uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS project_ref_id     bigint,
  ADD COLUMN IF NOT EXISTS project_name       text,
  ADD COLUMN IF NOT EXISTS client_name        text;

CREATE INDEX IF NOT EXISTS finance_transactions_status_idx  ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS finance_transactions_project_idx ON finance_transactions(project_name);

-- 2. Finance Forecasts
CREATE TABLE IF NOT EXISTS finance_forecasts (
  id                    bigserial PRIMARY KEY,
  forecast_date         date NOT NULL DEFAULT CURRENT_DATE,
  expected_date         date NOT NULL,
  forecast_type         text NOT NULL,
  client_id             bigint NULL REFERENCES crm_clients(id),
  client_name           text NULL,
  project_ref_id        bigint NULL,
  project_name          text NULL,
  category_id           bigint NULL REFERENCES finance_categories(id),
  account_id            bigint NULL REFERENCES finance_accounts(id),
  amount                numeric(15,2) NOT NULL,
  currency              text NOT NULL DEFAULT 'EGP',
  probability           numeric(5,2) NOT NULL DEFAULT 100,
  status                text NOT NULL DEFAULT 'expected',
  description           text NULL,
  internal_notes        text NULL,
  tags                  text[] DEFAULT '{}',
  linked_transaction_id bigint NULL REFERENCES finance_transactions(id),
  created_by            uuid NULL REFERENCES auth.users(id),
  is_archived           boolean NOT NULL DEFAULT false,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_forecasts_type_idx          ON finance_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS finance_forecasts_expected_date_idx ON finance_forecasts(expected_date DESC);
CREATE INDEX IF NOT EXISTS finance_forecasts_status_idx        ON finance_forecasts(status);
CREATE INDEX IF NOT EXISTS finance_forecasts_client_idx        ON finance_forecasts(client_id);
CREATE INDEX IF NOT EXISTS finance_forecasts_project_idx       ON finance_forecasts(project_name);
CREATE INDEX IF NOT EXISTS finance_forecasts_archived_idx      ON finance_forecasts(is_archived);
