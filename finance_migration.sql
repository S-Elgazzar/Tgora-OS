-- ============================================================
-- Tgora OS — Finance Module Migration (Sprint 4.0)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Finance Accounts
CREATE TABLE IF NOT EXISTS finance_accounts (
  id              bigserial PRIMARY KEY,
  account_name    text NOT NULL,
  account_type    text NOT NULL DEFAULT 'business_bank',
  owner_name      text NULL,
  currency        text NOT NULL DEFAULT 'EGP',
  opening_balance numeric(15,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. Finance Categories
CREATE TABLE IF NOT EXISTS finance_categories (
  id            bigserial PRIMARY KEY,
  category_name text NOT NULL,
  category_type text NOT NULL,
  parent_id     bigint NULL REFERENCES finance_categories(id),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Finance Transactions (main ledger)
CREATE TABLE IF NOT EXISTS finance_transactions (
  id                     bigserial PRIMARY KEY,
  transaction_date       date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type       text NOT NULL,
  account_id             bigint NULL REFERENCES finance_accounts(id),
  from_account_id        bigint NULL REFERENCES finance_accounts(id),
  to_account_id          bigint NULL REFERENCES finance_accounts(id),
  client_id              bigint NULL REFERENCES crm_clients(id),
  project_id             bigint NULL,
  category_id            bigint NULL REFERENCES finance_categories(id),
  amount                 numeric(15,2) NOT NULL,
  currency               text NOT NULL DEFAULT 'EGP',
  description            text NULL,
  payment_method         text NULL,
  reference              text NULL,
  related_transaction_id bigint NULL REFERENCES finance_transactions(id),
  is_archived            boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_transactions_date_idx     ON finance_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS finance_transactions_type_idx     ON finance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS finance_transactions_account_idx  ON finance_transactions(account_id);
CREATE INDEX IF NOT EXISTS finance_transactions_archived_idx ON finance_transactions(is_archived);

-- 4. Seed Accounts
INSERT INTO finance_accounts (account_name, account_type, owner_name, currency, opening_balance) VALUES
  ('CIB Business',              'business_bank',    NULL,                'EGP', 0),
  ('Sameh Personal',            'personal_account', 'Sameh',             'EGP', 0),
  ('Ahmed Abu ElKhair Account', 'partner_account',  'Ahmed Abu ElKhair', 'EGP', 0),
  ('Cash',                      'cash',             NULL,                'EGP', 0)
ON CONFLICT DO NOTHING;

-- 5. Seed Categories
INSERT INTO finance_categories (category_name, category_type) VALUES
  ('Salaries',                    'expense'),
  ('Project Costs',               'expense'),
  ('Office/General',              'expense'),
  ('Software Resources',          'expense'),
  ('Equipments',                  'expense'),
  ('Legal',                       'expense'),
  ('Customer Acquisition',        'expense'),
  ('R&D',                         'expense'),
  ('Donations',                   'expense'),
  ('Other',                       'expense'),
  ('Sales',                       'income'),
  ('Branding',                    'income'),
  ('Social Media Management',     'income'),
  ('Media Buying',                'income'),
  ('Website/UI',                  'income'),
  ('Consulting',                  'income'),
  ('Client Ads Budget',           'pass_through'),
  ('Client Media Buying Spend',   'pass_through'),
  ('Government/Third-party Fees', 'pass_through'),
  ('Partner Capital',             'capital'),
  ('Owner Injection',             'capital')
ON CONFLICT DO NOTHING;

-- 6. Seed initial capital (500,000 EGP — idempotent)
INSERT INTO finance_transactions (
  transaction_date, transaction_type, account_id, category_id, amount, currency, description
)
SELECT
  '2024-01-01'::date,
  'capital_injection',
  (SELECT id FROM finance_accounts WHERE account_name = 'CIB Business' LIMIT 1),
  (SELECT id FROM finance_categories WHERE category_name = 'Partner Capital' LIMIT 1),
  500000,
  'EGP',
  'Initial partner capital injection'
WHERE
  EXISTS (SELECT 1 FROM finance_accounts WHERE account_name = 'CIB Business')
  AND NOT EXISTS (SELECT 1 FROM finance_transactions WHERE transaction_type = 'capital_injection');
