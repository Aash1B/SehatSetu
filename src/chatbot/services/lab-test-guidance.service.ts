import { Injectable, Logger } from '@nestjs/common';

export interface LabTestGuidanceResult {
  message: string;
  suggestedReplies: string[];
}

interface ConditionGuidance {
  title: string;
  tests: string[];
}

const CONDITION_GUIDANCE: Record<string, ConditionGuidance> = {
  diabetes: {
    title: 'Diabetes',
    tests: ['HbA1c', 'Fasting blood glucose', 'Post-prandial glucose', 'Fasting lipid profile'],
  },
  thyroid: {
    title: 'Thyroid concern',
    tests: ['TSH (Thyroid Stimulating Hormone)', 'Free T4', 'Free T3', 'Thyroid peroxidase antibodies (TPO)'],
  },
  anaemia: {
    title: 'Anaemia concern',
    tests: ['Complete Blood Count (CBC)', 'Ferritin', 'Serum iron', 'Total Iron Binding Capacity (TIBC)', 'Vitamin B12', 'Folate'],
  },
  anemia: {
    title: 'Anemia concern',
    tests: ['Complete Blood Count (CBC)', 'Ferritin', 'Serum iron', 'Total Iron Binding Capacity (TIBC)', 'Vitamin B12', 'Folate'],
  },
  fever: {
    title: 'Persistent fever',
    tests: ['Complete Blood Count (CBC)', 'ESR (Erythrocyte Sedimentation Rate)', 'CRP (C-reactive protein)', 'Blood culture if indicated'],
  },
  fracture: {
    title: 'Suspected fracture',
    tests: ['X-ray of the affected area', 'Full body survey if multiple trauma suspected'],
  },
  fracture_injury: {
    title: 'Suspected fracture or injury',
    tests: ['X-ray of the affected area', 'Full body survey if multiple trauma suspected'],
  },
  neurological: {
    title: 'Neurological concern',
    tests: ['MRI or CT scan (as advised by a doctor)', 'Complete Blood Count if infection suspected'],
  },
  headache: {
    title: 'Persistent headache',
    tests: ['CT scan or MRI (as advised by a doctor)', 'Complete Blood Count if infection suspected'],
  },
  cancer: {
    title: 'Cancer screening concern',
    tests: ['Depends on symptoms - please consult a doctor for appropriate tests'],
  },
};

const FALLBACK_GUIDANCE: LabTestGuidanceResult = {
  message:
    'I can provide general information about commonly discussed tests for specific concerns, but I cannot determine which tests you need. Please confirm the final tests with a qualified doctor who can assess your full medical history.',
  suggestedReplies: ['Diabetes tests', 'Thyroid tests', 'Anaemia tests', 'Find a doctor'],
};

@Injectable()
export class LabTestGuidanceService {
  private readonly logger = new Logger(LabTestGuidanceService.name);

  detectConcern(message: string): string | null {
    const normalized = (message || '').toLowerCase().trim();
    if (!normalized) return null;

    const keys = Object.keys(CONDITION_GUIDANCE);
    for (const key of keys) {
      const alias = CONDITION_GUIDANCE[key].title.toLowerCase();
      if (normalized.includes(key) || alias.includes(key) && normalized.includes(key)) {
        return key;
      }
    }

    if (/an?emia|anaemia/.test(normalized)) return 'anaemia';
    if (/diabet/i.test(normalized)) return 'diabetes';
    if (/thyr/i.test(normalized)) return 'thyroid';
    if (/fever|temperature/i.test(normalized)) return 'fever';
    if (/fracture|broken bone|fractured/.test(normalized)) return 'fracture';
    if (/neuro|brain|mri|ct scan/.test(normalized)) return 'neurological';
    if (/headache|head.*ache|migraine/.test(normalized)) return 'headache';
    if (/cancer|tumour|tumor/.test(normalized)) return 'cancer';

    return null;
  }

  getGuidance(message: string): LabTestGuidanceResult {
    const concern = this.detectConcern(message);

    if (!concern) {
      return FALLBACK_GUIDANCE;
    }

    const guidance = CONDITION_GUIDANCE[concern];
    const testsList = guidance.tests
      .map((t) => `\u2022 ${t}`)
      .join('\n');

    const result: LabTestGuidanceResult = {
      message:
        `For your concern about ${guidance.title.toLowerCase()}, a doctor may consider the following tests:\n` +
        `${testsList}\n\n` +
        `These are commonly discussed tests only. A doctor may consider additional or different tests based on your specific situation. ` +
        `Please confirm the final tests with a doctor. I am not providing a diagnosis or recommending prescription medicines.`,
      suggestedReplies: [
        'Lab test guidance',
        'Nearby labs',
        'Find a doctor',
        'More guidance',
      ],
    };

    return result;
  }
}
