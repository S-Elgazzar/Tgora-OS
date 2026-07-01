-- ============================================================
-- Tgora OS — Finance Settings Foundation (Sprint 4.1A)
-- Run AFTER finance_migration_4_1a.sql (Sprint 4.1A Safety Controls)
-- Safe to run multiple times (idempotent).
--
-- Purpose: move hardcoded Finance business values out of app.js and
-- into a settings table so they become configurable and reusable by
-- a future Finance Engine. This migration only creates the table and
-- seeds the values that are CURRENTLY hardcoded in app.js — it does
-- not add new business rules.
-- ============================================================

CREATE TABLE IF NOT EXISTS finance_settings (
  id            bigserial PRIMARY KEY,
  setting_key   text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  setting_type  text NULL,
  description   text NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_settings_key_idx    ON finance_settings(setting_key);
CREATE INDEX IF NOT EXISTS finance_settings_active_idx ON finance_settings(is_active);

-- Seed: cash safety threshold (previously CASH_THRESHOLD = 100000 in app.js)
INSERT INTO finance_settings (setting_key, setting_value, setting_type, description)
VALUES (
  'cash_safety_threshold',
  '100000',
  'number',
  'Minimum cash across accounts before the Business Health / Executive Insights widgets flag a safety warning.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Seed: monthly fixed costs list (previously FINANCE_FIXED_COSTS in app.js)
INSERT INTO finance_settings (setting_key, setting_value, setting_type, description)
VALUES (
  'fixed_costs',
  '[
    {"label": "Salaries", "amount": 52000},
    {"label": "Adobe", "amount": 1600},
    {"label": "Google Workspace", "amount": 1100},
    {"label": "ChatGPT", "amount": 1400},
    {"label": "Internet / Utilities", "amount": 1200},
    {"label": "Miscellaneous", "amount": 3000}
  ]',
  'array',
  'Monthly fixed cost line items used for break-even, safe/stretch targets, burn rate, and cash runway in Business Health.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Force PostgREST to reload its schema cache immediately, matching the
-- pattern used in projects_archive_migration.sql — otherwise requests
-- issued right after this migration can 404 on the new table.
NOTIFY pgrst, 'reload schema';
