-- ============================================================
-- Tgora OS — CRM UAT Fix Pass 2: Atomic Lead -> Deal Conversion
-- Safe to re-run (idempotent): CREATE OR REPLACE FUNCTION.
--
-- Context: UAT found a Lead could be saved with status = 'converted' while
-- no Deal existed (two independent client-side writes, never atomic). This
-- migration adds a single RPC that creates the Deal and flips the Lead to
-- 'converted' in one function invocation, so the two writes either both
-- happen or neither does — a plpgsql function body runs inside the calling
-- statement's transaction; an unhandled exception anywhere in the body
-- rolls back everything the function did (including an already-executed
-- INSERT), so no explicit BEGIN/COMMIT is needed or possible here.
--
-- client_id and lead_id are always derived server-side from the Lead row —
-- never taken from the caller's payload — so the created Deal is
-- guaranteed to be linked to the same Company as the Lead.
--
-- Duplicate-conversion guard: if an active (non-archived) Deal is already
-- linked to this Lead, no new Deal is created — the existing one is
-- returned instead (duplicate: true). This also covers the legacy-repair
-- case (a Lead already marked 'converted' with no Deal): the function does
-- NOT block on status = 'converted', only on an existing linked Deal, so
-- calling this RPC again for a legacy orphaned-converted Lead safely
-- creates the missing Deal.
--
-- Status eligibility (blocking-workflow correction — Fix Pass 2 follow-up):
-- only new/contacted/qualified/proposal_sent Leads, or a legacy Converted
-- Lead with no linked Deal (the repair case above), may be converted.
-- 'disqualified' (and legacy 'lost', which normalizeCrmLeadStatusForDisplay
-- in app.js displays as 'disqualified') is explicitly rejected — matches
-- the same normalization app.js already applies, so a legacy 'won' row is
-- treated as 'converted' here too. This check runs before the
-- duplicate-conversion guard, so a Disqualified Lead is always rejected
-- outright rather than silently returning some stray existing Deal.
--
-- This migration does NOT:
--   - add RLS policies — no table in this codebase has a verified, working
--     RLS policy to model from (see project_commercial_terms_schema_migration.sql
--     and project_commercial_forecast_linkage_migration.sql); permission is
--     enforced client-side (isAdmin()) the same way every other CRM write
--     already is in app.js.
--   - touch crm_leads.status values, crm_deals.stage values, or any
--     existing column/constraint.
--   - touch Finance, Projects, Tasks, or Accounting.
-- ============================================================

CREATE OR REPLACE FUNCTION convert_crm_lead_to_deal(p_lead_id bigint, p_deal jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_lead          crm_leads%ROWTYPE;
  v_existing_deal crm_deals%ROWTYPE;
  v_new_deal      crm_deals%ROWTYPE;
  v_deal_name     text;
  v_status        text;
BEGIN
  SELECT * INTO v_lead FROM crm_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF v_lead.is_archived THEN
    RAISE EXCEPTION 'Cannot convert an archived lead';
  END IF;

  IF v_lead.client_id IS NULL THEN
    RAISE EXCEPTION 'Lead has no linked company';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM crm_clients WHERE id = v_lead.client_id) THEN
    RAISE EXCEPTION 'Linked company not found';
  END IF;

  -- Mirrors normalizeCrmLeadStatusForDisplay() in app.js: won -> converted,
  -- lost -> disqualified, else as-is. Only new/contacted/qualified/
  -- proposal_sent are convertible from scratch; 'converted' is allowed only
  -- so the legacy no-Deal repair case below can proceed. Everything else
  -- (disqualified, and legacy 'lost') is rejected outright.
  v_status := CASE lower(COALESCE(v_lead.status, 'new'))
    WHEN 'won' THEN 'converted'
    WHEN 'lost' THEN 'disqualified'
    ELSE lower(COALESCE(v_lead.status, 'new'))
  END;

  IF v_status NOT IN ('new', 'contacted', 'qualified', 'proposal_sent', 'converted') THEN
    RAISE EXCEPTION 'Lead status is not eligible for conversion';
  END IF;

  -- Duplicate-conversion guard (also covers a race between two admins).
  SELECT * INTO v_existing_deal
    FROM crm_deals
    WHERE lead_id = p_lead_id AND is_archived = false
    ORDER BY created_at DESC
    LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'deal', to_jsonb(v_existing_deal),
      'lead', to_jsonb(v_lead),
      'duplicate', true
    );
  END IF;

  v_deal_name := NULLIF(TRIM(BOTH FROM (p_deal->>'deal_name')), '');
  IF v_deal_name IS NULL THEN
    RAISE EXCEPTION 'Deal name is required';
  END IF;

  INSERT INTO crm_deals (
    client_id, lead_id, owner_id, deal_name, stage, value, currency,
    expected_close_date, notes, service_type_id, probability
  ) VALUES (
    v_lead.client_id,
    p_lead_id,
    NULLIF(p_deal->>'owner_id', '')::bigint,
    v_deal_name,
    COALESCE(NULLIF(p_deal->>'stage', ''), 'discovery'),
    NULLIF(p_deal->>'value', '')::numeric,
    COALESCE(NULLIF(p_deal->>'currency', ''), 'EGP'),
    NULLIF(p_deal->>'expected_close_date', '')::date,
    NULLIF(p_deal->>'notes', ''),
    NULLIF(p_deal->>'service_type_id', '')::bigint,
    NULLIF(p_deal->>'probability', '')::integer
  )
  RETURNING * INTO v_new_deal;

  UPDATE crm_leads
    SET status = 'converted', updated_at = now()
    WHERE id = p_lead_id
    RETURNING * INTO v_lead;

  RETURN jsonb_build_object(
    'deal', to_jsonb(v_new_deal),
    'lead', to_jsonb(v_lead),
    'duplicate', false
  );
END;
$$;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verification
-- ============================================================

-- 1. Confirm the function exists:
-- SELECT proname FROM pg_proc WHERE proname = 'convert_crm_lead_to_deal';

-- 2. Convert an eligible Lead (Company must already be linked):
-- SELECT convert_crm_lead_to_deal(
--   <some_lead_id>,
--   '{"deal_name": "Test Conversion Deal", "stage": "discovery", "currency": "EGP"}'::jsonb
-- );

-- 3. Re-run the same call — should return duplicate: true with the same deal id,
--    not a second Deal row:
-- SELECT convert_crm_lead_to_deal(
--   <same_lead_id>,
--   '{"deal_name": "Test Conversion Deal"}'::jsonb
-- );

-- 4. A Disqualified Lead is rejected outright (raises "Lead status is not
--    eligible for conversion"), even if it happens to have a stray Deal:
-- SELECT convert_crm_lead_to_deal(
--   <a_disqualified_lead_id>,
--   '{"deal_name": "Should Not Be Created"}'::jsonb
-- );

-- 5. A legacy Converted Lead with no Deal still repairs successfully:
-- SELECT convert_crm_lead_to_deal(
--   <a_legacy_converted_no_deal_lead_id>,
--   '{"deal_name": "Repair Deal"}'::jsonb
-- );
-- ============================================================
