-- ============================================================
-- Tgora OS — Projects Archive (Sprint 3.1A)
-- Adds: is_archived flag on projects, backfilled for terminal statuses
-- (completed, cancelled). Safe to run multiple times (idempotent).
--
-- Run this in full (Supabase SQL Editor or psql) and confirm it completes
-- BEFORE deploying the updated app.js/index.html — handleProjectSubmit()
-- writes is_archived on every project create/update with no fallback, so
-- the column must exist and be visible to PostgREST first.
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS projects_is_archived_idx ON projects(is_archived);

-- Backfill: completed and cancelled projects are archived.
UPDATE projects
SET is_archived = true
WHERE is_archived = false
  AND lower(status) IN ('completed', 'cancelled');

-- Force PostgREST to reload its schema cache immediately. Without this,
-- Supabase's automatic cache reload can lag behind the DDL above, causing
-- "Could not find the 'is_archived' column of 'projects' in the schema
-- cache" errors on requests that land before the async reload completes.
NOTIFY pgrst, 'reload schema';
