-- ============================================================
-- Tgora OS — CRM Kanban Sprint: Atomic Deal -> Project Conversion
-- Safe to re-run (idempotent): CREATE OR REPLACE FUNCTION.
--
-- Context: a Deal could be manually saved with stage = 'won' while no
-- Project existed (two independent client-side writes, never atomic —
-- "NovaBuild Launch Campaign" is a live example of this in UAT data). This
-- migration adds a single RPC that creates the Project and flips the Deal
-- to 'won' in one function invocation, mirroring
-- convert_crm_lead_to_deal() (crm_uat_fix_pass2_lead_to_deal_conversion_migration.sql)
-- exactly: a plpgsql function body runs inside the calling statement's
-- transaction, so an unhandled exception anywhere in the body rolls back
-- everything the function already did — no explicit BEGIN/COMMIT needed
-- or possible here.
--
-- deal_id is always forced server-side from p_deal_id — never taken from
-- the caller's payload — so the created Project is guaranteed to be linked
-- to the actual Deal being converted, the same rule convert_crm_lead_to_deal
-- already applies to client_id/lead_id.
--
-- Multi-project-per-Deal (approved business rule — see
-- crm_deal_project_multi_project_fix_migration.sql, which deliberately
-- dropped the one-Project-per-Deal unique index for retainer-style Deals
-- that produce more than one Project): this RPC does NOT reintroduce that
-- constraint. p_force_new distinguishes the two calling contexts:
--   - p_force_new = false (the normal Won-transition / legacy-repair path):
--     if a Project already exists for this Deal, it is returned unchanged
--     (duplicate: true, no insert) — this only guards a double-fire of the
--     SAME click (e.g. a network retry or double form submit), not a
--     deliberately later second Project.
--   - p_force_new = true (the explicit "Create Additional Project" action,
--     only offered in the UI once a Deal already has >=1 linked Project):
--     always inserts a new Project, skipping the existing-Project check
--     entirely, and requires the Deal to already be 'won'.
--
-- Stage eligibility (business-rule correction applied during planning):
-- only discovery/proposal/negotiation Deals may enter the Won/Project flow
-- for the first time. 'lost' is explicitly rejected — a Lost Deal must be
-- moved back to an active stage and saved before it can become Won. The
-- one exception is the legacy-repair case: a Deal already sitting at
-- stage = 'won' with zero linked Projects may still be repaired (this is
-- NOT a "first-time Won transition", so it is not blocked by the
-- discovery/proposal/negotiation check).
--
-- This migration does NOT:
--   - add RLS policies — permission is enforced client-side (isAdmin()),
--     same as every other CRM write in app.js and the same choice already
--     made in crm_uat_fix_pass2_lead_to_deal_conversion_migration.sql.
--   - reintroduce the one-Project-per-Deal unique index.
--   - create Finance Forecasts, Finance Transactions, Accounting Journal
--     entries, Tasks, or Commercial Terms.
--   - touch crm_deals.stage values, projects columns, or any existing
--     column/constraint beyond what crm_deal_project_conversion_migration.sql
--     already added (projects.deal_id).
-- ============================================================

CREATE OR REPLACE FUNCTION convert_crm_deal_to_project(
  p_deal_id   bigint,
  p_project   jsonb,
  p_force_new boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_deal             crm_deals%ROWTYPE;
  v_existing_project projects%ROWTYPE;
  v_new_project      projects%ROWTYPE;
  v_project_name     text;
  v_client_name      text;
BEGIN
  SELECT * INTO v_deal FROM crm_deals WHERE id = p_deal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deal not found';
  END IF;

  IF v_deal.is_archived THEN
    RAISE EXCEPTION 'Cannot convert an archived deal';
  END IF;

  IF v_deal.client_id IS NULL THEN
    RAISE EXCEPTION 'Deal has no linked company';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM crm_clients WHERE id = v_deal.client_id AND is_archived = false) THEN
    RAISE EXCEPTION 'Linked company not found or archived';
  END IF;

  IF p_force_new THEN
    -- "Create Additional Project" — only ever offered once the Deal is
    -- already Won with at least one Project, so the Deal itself is not
    -- transitioning stage here; just require it's already Won.
    IF v_deal.stage IS DISTINCT FROM 'won' THEN
      RAISE EXCEPTION 'Deal must already be Won to create an additional project';
    END IF;
  ELSE
    -- Normal first-time Won transition, or legacy repair (Won + zero
    -- Projects). 'lost' is explicitly rejected even though a stray Project
    -- could theoretically exist for it — the eligibility check runs before
    -- the duplicate-guard, same ordering convert_crm_lead_to_deal() uses
    -- for its own status-eligibility check.
    IF v_deal.stage = 'lost' THEN
      RAISE EXCEPTION 'Move this deal to an active stage (Discovery/Proposal/Negotiation) before marking it Won';
    END IF;

    IF v_deal.stage NOT IN ('discovery', 'proposal', 'negotiation', 'won') THEN
      RAISE EXCEPTION 'Deal stage is not eligible for Project conversion';
    END IF;

    IF v_deal.stage = 'won' THEN
      -- Legacy repair is only valid when no Project is linked yet; a Won
      -- Deal that already has one must go through p_force_new instead.
      SELECT * INTO v_existing_project FROM projects WHERE deal_id = p_deal_id LIMIT 1;
      IF FOUND THEN
        RETURN jsonb_build_object(
          'deal', to_jsonb(v_deal),
          'project', to_jsonb(v_existing_project),
          'duplicate', true
        );
      END IF;
    ELSE
      -- Double-submit guard for the normal (not-yet-won) path only.
      SELECT * INTO v_existing_project FROM projects WHERE deal_id = p_deal_id LIMIT 1;
      IF FOUND THEN
        UPDATE crm_deals SET stage = 'won', updated_at = now() WHERE id = p_deal_id RETURNING * INTO v_deal;
        RETURN jsonb_build_object(
          'deal', to_jsonb(v_deal),
          'project', to_jsonb(v_existing_project),
          'duplicate', true
        );
      END IF;
    END IF;
  END IF;

  v_project_name := NULLIF(TRIM(BOTH FROM (p_project->>'project_name')), '');
  IF v_project_name IS NULL THEN
    RAISE EXCEPTION 'Project name is required';
  END IF;

  v_client_name := NULLIF(TRIM(BOTH FROM (p_project->>'client')), '');
  IF v_client_name IS NULL THEN
    RAISE EXCEPTION 'Client is required';
  END IF;

  INSERT INTO projects (
    project_name, client, project_link, status, priority,
    start_date, deadline, project_code, is_archived, deal_id
  ) VALUES (
    v_project_name,
    v_client_name,
    NULLIF(p_project->>'project_link', ''),
    COALESCE(NULLIF(p_project->>'status', ''), 'active'),
    COALESCE(NULLIF(p_project->>'priority', ''), 'medium'),
    NULLIF(p_project->>'start_date', '')::date,
    NULLIF(p_project->>'deadline', '')::date,
    NULLIF(p_project->>'project_code', ''),
    COALESCE((p_project->>'is_archived')::boolean, false),
    p_deal_id
  )
  RETURNING * INTO v_new_project;

  IF v_deal.stage IS DISTINCT FROM 'won' THEN
    UPDATE crm_deals SET stage = 'won', updated_at = now() WHERE id = p_deal_id RETURNING * INTO v_deal;
  END IF;

  RETURN jsonb_build_object(
    'deal', to_jsonb(v_deal),
    'project', to_jsonb(v_new_project),
    'duplicate', false
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification
-- ============================================================

-- 1. Confirm the function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'convert_crm_deal_to_project';

-- 2. Convert an eligible Deal (Company must already be linked, stage one of
--    discovery/proposal/negotiation):
-- SELECT convert_crm_deal_to_project(
--   <some_deal_id>,
--   '{"project_name": "Test Conversion Project", "client": "Acme Corp"}'::jsonb
-- );

-- 3. Re-run the same call — should return duplicate: true with the same
--    project id, not a second Project row, and the Deal should already be
--    'won' from step 2:
-- SELECT convert_crm_deal_to_project(
--   <same_deal_id>,
--   '{"project_name": "Test Conversion Project", "client": "Acme Corp"}'::jsonb
-- );

-- 4. A Lost Deal is rejected outright (raises "Move this deal to an active
--    stage..."), even if it happens to have no Project:
-- SELECT convert_crm_deal_to_project(
--   <a_lost_deal_id>,
--   '{"project_name": "Should Not Be Created", "client": "Acme Corp"}'::jsonb
-- );

-- 5. A legacy Won Deal with no Project (e.g. "NovaBuild Launch Campaign")
--    repairs successfully:
-- SELECT convert_crm_deal_to_project(
--   <a_legacy_won_no_project_deal_id>,
--   '{"project_name": "Repair Project", "client": "Acme Corp"}'::jsonb
-- );

-- 6. "Create Additional Project" on an already-Won Deal that has a Project:
-- SELECT convert_crm_deal_to_project(
--   <a_won_deal_id_with_a_project>,
--   '{"project_name": "Second Project", "client": "Acme Corp"}'::jsonb,
--   true
-- );
-- ============================================================
