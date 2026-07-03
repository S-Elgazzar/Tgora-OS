-- ============================================================
-- Tgora OS — CRM Base Schema Recovery (Sprint CRM-0)
-- Safe to run multiple times (idempotent).
--
-- Context: Sprint CRM-2's migration (crm_data_model_completion_migration.sql)
-- failed because crm_deals does not exist in the live database. Investigation
-- of the actual Supabase project found only crm_clients and crm_leads exist
-- — crm_contacts, crm_deals, crm_activities, crm_notes, and crm_proposals
-- were never created, even though app.js has been coded against all seven
-- tables since before this sprint. This migration creates the missing base
-- tables so the existing (pre-CRM-2) CRM code stops hitting "table does not
-- exist" errors, and so Sprint CRM-2's migration can then be (re-)run
-- successfully on top of it.
--
-- Run BEFORE crm_data_model_completion_migration.sql (CRM-2). This migration
-- deliberately does NOT add CRM-2's columns (crm_deals.lead_id/
-- service_type_id/probability, crm_service_types) — those remain CRM-2's
-- job and will apply cleanly once crm_deals exists here.
--
-- Columns/relations below were reverse-engineered directly from app.js and
-- index.html (form field `name` attributes, payload construction, and
-- `.filter()`/property-access usage) — see Sprint CRM-0 report for the exact
-- line references. Nothing here is guessed; every column matches a concrete
-- code reference.
--
-- This migration does NOT:
--   - drop, rename, or remove any column, table, or data
--   - add any NOT NULL/CHECK constraint to an existing (crm_clients/
--     crm_leads) column — those get purely additive, nullable columns only,
--     since we cannot know from code alone whether existing rows would
--     violate a stricter constraint
--   - touch Finance, Projects, Tasks, or Accounting
--   - add any trigger/automation
-- ============================================================

-- ----------------------------------------------------------------
-- 1. crm_clients — table already exists live. Defensive, additive-only
--    column recovery in case the live table was created with a subset of
--    the columns app.js expects. All nullable — never breaks existing rows.
-- ----------------------------------------------------------------
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS client_name  text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS client_type  text NULL;
-- 'type' (distinct from 'client_type') is a discovered inconsistency:
-- convertLeadToClient() in app.js writes `type: 'company'` on lead
-- conversion, while the Client form itself reads/writes `client_type`.
-- Recovering both columns prevents the lead-conversion insert from failing
-- with an unknown-column error; the app-level inconsistency is flagged in
-- the Sprint CRM-0 report for a future cleanup, not fixed here.
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS type         text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS industry     text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS website      text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS phone        text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS whatsapp     text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS email        text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS source       text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS address      text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS owner_id     bigint NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS status       text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS notes        text NULL;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS is_archived  boolean NOT NULL DEFAULT false;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT now();
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS crm_clients_status_idx      ON crm_clients(status);
CREATE INDEX IF NOT EXISTS crm_clients_is_archived_idx ON crm_clients(is_archived);

-- ----------------------------------------------------------------
-- 2. crm_leads — table already exists live. Same defensive recovery.
-- ----------------------------------------------------------------
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS lead_name         text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS company_name      text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS contact_person    text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS phone             text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS whatsapp          text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS email             text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS source            text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS referred_by       text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS service_interest  text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS expected_budget   text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS priority          text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS status            text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS owner_id          bigint NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS next_follow_up    date NULL;
-- client_id is set by convertLeadToClient() after the fact — left nullable,
-- no FK constraint added here (crm_leads already has live rows and we
-- cannot verify from code alone that all existing client_id values, if any,
-- would satisfy a FK; adding one retroactively is deferred to a future,
-- verified cleanup rather than risked here).
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS client_id         bigint NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS notes             text NULL;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS is_archived       boolean NOT NULL DEFAULT false;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS created_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS crm_leads_status_idx      ON crm_leads(status);
CREATE INDEX IF NOT EXISTS crm_leads_client_id_idx   ON crm_leads(client_id);
CREATE INDEX IF NOT EXISTS crm_leads_is_archived_idx ON crm_leads(is_archived);

-- ----------------------------------------------------------------
-- 3. crm_contacts — MISSING. Created fresh (no existing data), so
--    required-in-form fields can safely be NOT NULL and the client_id FK
--    can be added directly at creation time.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_contacts (
  id           bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  client_id    bigint NULL REFERENCES crm_clients(id),
  contact_name text NOT NULL,
  title        text NULL,
  phone        text NULL,
  whatsapp     text NULL,
  email        text NULL,
  notes        text NULL,
  status       text NULL,
  is_archived  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_contacts_client_id_idx   ON crm_contacts(client_id);
CREATE INDEX IF NOT EXISTS crm_contacts_is_archived_idx ON crm_contacts(is_archived);

-- ----------------------------------------------------------------
-- 4. crm_deals — MISSING. Base (pre-CRM-2) columns only. lead_id,
--    service_type_id, probability are intentionally NOT added here — they
--    are Sprint CRM-2's job and its migration will ADD COLUMN them once
--    this table exists.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_deals (
  id                   bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  client_id            bigint NULL REFERENCES crm_clients(id),
  owner_id             bigint NULL,
  deal_name            text NOT NULL,
  stage                text NULL,
  value                numeric(15,2) NULL,
  currency             text NULL,
  expected_close_date  date NULL,
  notes                text NULL,
  is_archived          boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_deals_client_id_idx   ON crm_deals(client_id);
CREATE INDEX IF NOT EXISTS crm_deals_stage_idx       ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS crm_deals_is_archived_idx ON crm_deals(is_archived);

-- ----------------------------------------------------------------
-- 5. crm_activities — MISSING. deal_id/lead_id are read/filtered by app.js
--    (Deal Details modal, Lead timeline) even though no form field sets
--    them yet — included as nullable FKs so the columns exist and those
--    read paths work once populated by a future sprint.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_activities (
  id             bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  client_id      bigint NULL REFERENCES crm_clients(id),
  lead_id        bigint NULL REFERENCES crm_leads(id),
  deal_id        bigint NULL REFERENCES crm_deals(id),
  owner_id       bigint NULL,
  title          text NOT NULL,
  activity_type  text NULL,
  status         text NULL,
  activity_date  date NULL,
  description    text NULL,
  outcome        text NULL,
  is_archived    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_activities_client_id_idx   ON crm_activities(client_id);
CREATE INDEX IF NOT EXISTS crm_activities_lead_id_idx     ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS crm_activities_deal_id_idx     ON crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS crm_activities_is_archived_idx ON crm_activities(is_archived);

-- ----------------------------------------------------------------
-- 6. crm_notes — MISSING. lead_id is read/set by app.js (note-form's
--    hidden lead_id field, Lead timeline); deal_id is NOT referenced
--    anywhere in code, so it is intentionally omitted.
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_notes (
  id           bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  client_id    bigint NULL REFERENCES crm_clients(id),
  lead_id      bigint NULL REFERENCES crm_leads(id),
  body         text NOT NULL,
  created_by   uuid NULL,
  is_archived  boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_notes_client_id_idx   ON crm_notes(client_id);
CREATE INDEX IF NOT EXISTS crm_notes_lead_id_idx     ON crm_notes(lead_id);
CREATE INDEX IF NOT EXISTS crm_notes_is_archived_idx ON crm_notes(is_archived);

-- ----------------------------------------------------------------
-- 7. crm_proposals — MISSING. deal_id is NOT referenced anywhere in code,
--    so it is intentionally omitted (matches investigation findings).
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_proposals (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  client_id       bigint NULL REFERENCES crm_clients(id),
  owner_id        bigint NULL,
  proposal_title  text NOT NULL,
  status          text NULL,
  amount          numeric(15,2) NULL,
  currency        text NULL,
  sent_date       date NULL,
  valid_until     date NULL,
  notes           text NULL,
  is_archived     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_proposals_client_id_idx   ON crm_proposals(client_id);
CREATE INDEX IF NOT EXISTS crm_proposals_status_idx      ON crm_proposals(status);
CREATE INDEX IF NOT EXISTS crm_proposals_is_archived_idx ON crm_proposals(is_archived);

-- Force PostgREST to reload its schema cache immediately.
NOTIFY pgrst, 'reload schema';
