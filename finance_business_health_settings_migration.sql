-- ============================================================
-- Tgora OS — Business Health Engine Settings (Sprint 4.1C)
-- Run AFTER finance_fixed_costs_migration.sql (Sprint 4.1B)
-- Safe to run multiple times (idempotent).
--
-- Purpose: move Business Health's hardcoded thresholds, target multipliers,
-- score weights, and recommendation thresholds out of app.js and into
-- finance_settings, using the same table Sprint 4.1A introduced. This
-- migration only seeds the values CURRENTLY hardcoded in app.js — it does
-- not change any business rule or scoring behavior.
-- ============================================================

-- Seed: Business Health config (previously hardcoded across
-- getBusinessHealthMetrics / getBusinessHealthScore / getRunwayMeterColor /
-- getBusinessHealthRecommendations in app.js)
INSERT INTO finance_settings (setting_key, setting_value, setting_type, description)
VALUES (
  'business_health_config',
  '{
    "targetMultipliers": {
      "safe": 1.5,
      "stretch": 2.25
    },
    "runwayThresholds": {
      "critical": 2,
      "warning": 4,
      "healthy": 6
    },
    "scoreWeights": {
      "breakEven": 35,
      "safeTarget": 25,
      "netProfit": 15,
      "cashRunway": 15,
      "clientFunds": 10
    },
    "recommendationThresholds": {
      "runwayCriticalMonths": 3,
      "clientFundsWarningAmount": 0
    }
  }',
  'object',
  'Business Health Engine config: revenue target multipliers, cash runway thresholds, score weights, and recommendation thresholds used by the Business Health widget/modal.'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Force PostgREST to reload its schema cache immediately, matching the
-- pattern used in finance_settings_migration.sql.
NOTIFY pgrst, 'reload schema';
