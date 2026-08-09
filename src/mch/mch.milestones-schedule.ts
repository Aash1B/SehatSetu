/**
 * MCH Developmental Milestones Configuration
 *
 * IMPORTANT: These milestones are provided as configurable starting points
 * based on general developmental guidance. They MUST be validated by a
 * qualified paediatrician/developmental specialist before clinical deployment.
 * They do NOT constitute diagnostic criteria for developmental disorders.
 */

export interface MilestoneDefinition {
  category: 'GROSS_MOTOR' | 'FINE_MOTOR' | 'LANGUAGE' | 'SOCIAL_EMOTIONAL' | 'COGNITIVE';
  milestoneName: string;
  /** Expected achievement age in months (lower bound) */
  expectedAgeMonths: number;
  /** Expected achievement age in months (upper bound — if null, use expectedAgeMonths + 2) */
  expectedAgeMaxMonths: number | null;
}

/**
 * Standard developmental milestones (indicative — REQUIRES CLINICAL VALIDATION).
 */
export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // ── Gross Motor ─────────────────────────────────────────────────
  { category: 'GROSS_MOTOR', milestoneName: 'Lifts head when prone', expectedAgeMonths: 1, expectedAgeMaxMonths: 3 },
  { category: 'GROSS_MOTOR', milestoneName: 'Rolls over (front to back)', expectedAgeMonths: 4, expectedAgeMaxMonths: 5 },
  { category: 'GROSS_MOTOR', milestoneName: 'Sits without support', expectedAgeMonths: 6, expectedAgeMaxMonths: 8 },
  { category: 'GROSS_MOTOR', milestoneName: 'Stands with support', expectedAgeMonths: 8, expectedAgeMaxMonths: 10 },
  { category: 'GROSS_MOTOR', milestoneName: 'Walks independently', expectedAgeMonths: 12, expectedAgeMaxMonths: 15 },
  { category: 'GROSS_MOTOR', milestoneName: 'Runs steadily', expectedAgeMonths: 18, expectedAgeMaxMonths: 24 },
  { category: 'GROSS_MOTOR', milestoneName: 'Jumps with both feet', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },
  { category: 'GROSS_MOTOR', milestoneName: 'Climbs stairs alternating feet', expectedAgeMonths: 30, expectedAgeMaxMonths: 36 },

  // ── Fine Motor ──────────────────────────────────────────────────
  { category: 'FINE_MOTOR', milestoneName: 'Follows objects with eyes', expectedAgeMonths: 1, expectedAgeMaxMonths: 2 },
  { category: 'FINE_MOTOR', milestoneName: 'Grasps rattle voluntarily', expectedAgeMonths: 4, expectedAgeMaxMonths: 5 },
  { category: 'FINE_MOTOR', milestoneName: 'Transfers object hand to hand', expectedAgeMonths: 6, expectedAgeMaxMonths: 7 },
  { category: 'FINE_MOTOR', milestoneName: 'Pincer grasp (finger-thumb)', expectedAgeMonths: 9, expectedAgeMaxMonths: 11 },
  { category: 'FINE_MOTOR', milestoneName: 'Scribbles with crayon', expectedAgeMonths: 15, expectedAgeMaxMonths: 18 },
  { category: 'FINE_MOTOR', milestoneName: 'Turns pages of book', expectedAgeMonths: 18, expectedAgeMaxMonths: 24 },
  { category: 'FINE_MOTOR', milestoneName: 'Draws a vertical line', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },
  { category: 'FINE_MOTOR', milestoneName: 'Copies a circle', expectedAgeMonths: 30, expectedAgeMaxMonths: 36 },

  // ── Language ────────────────────────────────────────────────────
  { category: 'LANGUAGE', milestoneName: 'Coos and vocalises', expectedAgeMonths: 2, expectedAgeMaxMonths: 3 },
  { category: 'LANGUAGE', milestoneName: 'Babbles (consonant sounds)', expectedAgeMonths: 6, expectedAgeMaxMonths: 8 },
  { category: 'LANGUAGE', milestoneName: 'Says mama/dada (non-specific)', expectedAgeMonths: 8, expectedAgeMaxMonths: 10 },
  { category: 'LANGUAGE', milestoneName: 'First meaningful words (2+)', expectedAgeMonths: 12, expectedAgeMaxMonths: 15 },
  { category: 'LANGUAGE', milestoneName: 'Vocabulary of 10+ words', expectedAgeMonths: 18, expectedAgeMaxMonths: 20 },
  { category: 'LANGUAGE', milestoneName: 'Two-word combinations', expectedAgeMonths: 18, expectedAgeMaxMonths: 24 },
  { category: 'LANGUAGE', milestoneName: 'Short sentences (3 words)', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },
  { category: 'LANGUAGE', milestoneName: 'Understandable to strangers', expectedAgeMonths: 36, expectedAgeMaxMonths: null },

  // ── Social / Emotional ──────────────────────────────────────────
  { category: 'SOCIAL_EMOTIONAL', milestoneName: 'Social smile', expectedAgeMonths: 2, expectedAgeMaxMonths: 3 },
  { category: 'SOCIAL_EMOTIONAL', milestoneName: 'Stranger anxiety', expectedAgeMonths: 8, expectedAgeMaxMonths: 10 },
  { category: 'SOCIAL_EMOTIONAL', milestoneName: 'Wave bye-bye', expectedAgeMonths: 9, expectedAgeMaxMonths: 12 },
  { category: 'SOCIAL_EMOTIONAL', milestoneName: 'Symbolic play (pretend)', expectedAgeMonths: 18, expectedAgeMaxMonths: 24 },
  { category: 'SOCIAL_EMOTIONAL', milestoneName: 'Parallel play with peers', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },

  // ── Cognitive ───────────────────────────────────────────────────
  { category: 'COGNITIVE', milestoneName: 'Tracks moving objects', expectedAgeMonths: 2, expectedAgeMaxMonths: 3 },
  { category: 'COGNITIVE', milestoneName: 'Object permanence (peek-a-boo)', expectedAgeMonths: 8, expectedAgeMaxMonths: 10 },
  { category: 'COGNITIVE', milestoneName: 'Points to named objects', expectedAgeMonths: 12, expectedAgeMaxMonths: 15 },
  { category: 'COGNITIVE', milestoneName: 'Sorts shapes/colours', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },
  { category: 'COGNITIVE', milestoneName: 'Understands 2-step instructions', expectedAgeMonths: 24, expectedAgeMaxMonths: 30 },
];
