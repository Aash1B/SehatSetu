/**
 * MCH Clinical Safety Rules Configuration
 *
 * IMPORTANT: These thresholds are provided as configurable starting points
 * and MUST be validated by a qualified medical professional before
 * clinical deployment. They do NOT constitute medical advice or diagnosis.
 *
 * Rules produce "needs clinical review" flags — they do NOT diagnose conditions.
 */

export interface AncVitalRules {
  /** Systolic BP (mmHg) above which WARNING flag is raised — REQUIRES CLINICAL VALIDATION */
  systolicBpWarning: number;
  /** Systolic BP (mmHg) above which CRITICAL flag is raised — REQUIRES CLINICAL VALIDATION */
  systolicBpCritical: number;
  /** Diastolic BP (mmHg) above which WARNING flag is raised — REQUIRES CLINICAL VALIDATION */
  diastolicBpWarning: number;
  /** Diastolic BP (mmHg) above which CRITICAL flag is raised — REQUIRES CLINICAL VALIDATION */
  diastolicBpCritical: number;
  /** Hemoglobin (g/dL) below which WARNING flag is raised — REQUIRES CLINICAL VALIDATION */
  hemoglobinLowWarning: number;
  /** Hemoglobin (g/dL) below which CRITICAL flag is raised — REQUIRES CLINICAL VALIDATION */
  hemoglobinLowCritical: number;
  /** Weight gain per week (kg) above which INFO flag is raised — REQUIRES CLINICAL VALIDATION */
  weeklyWeightGainWarning: number;
}

export interface GrowthRules {
  /**
   * Percentage below the WHO median weight-for-age at which INFO flag is raised.
   * REQUIRES CLINICAL VALIDATION — do not use as diagnostic criteria.
   */
  weightBelowMedianWarningPct: number;
  weightBelowMedianCriticalPct: number;
}

export interface MchClinicalRulesConfig {
  anc: AncVitalRules;
  growth: GrowthRules;
}

/**
 * Default configurable rules.
 * Override via environment or a future database-backed config table.
 * ALL VALUES REQUIRE CLINICAL VALIDATION BEFORE PRODUCTION USE.
 */
export const MCH_CLINICAL_RULES: MchClinicalRulesConfig = {
  anc: {
    systolicBpWarning: Number(process.env.MCH_SYSTOLIC_BP_WARN ?? 140),
    systolicBpCritical: Number(process.env.MCH_SYSTOLIC_BP_CRIT ?? 160),
    diastolicBpWarning: Number(process.env.MCH_DIASTOLIC_BP_WARN ?? 90),
    diastolicBpCritical: Number(process.env.MCH_DIASTOLIC_BP_CRIT ?? 110),
    hemoglobinLowWarning: Number(process.env.MCH_HB_LOW_WARN ?? 10.0),
    hemoglobinLowCritical: Number(process.env.MCH_HB_LOW_CRIT ?? 7.0),
    weeklyWeightGainWarning: Number(process.env.MCH_WEEKLY_WEIGHT_GAIN_WARN ?? 0.7),
  },
  growth: {
    weightBelowMedianWarningPct: Number(process.env.MCH_GROWTH_WARN_PCT ?? 20),
    weightBelowMedianCriticalPct: Number(process.env.MCH_GROWTH_CRIT_PCT ?? 40),
  },
};
