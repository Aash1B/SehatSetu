import { Injectable, Logger } from '@nestjs/common';

export interface MedicalConditionResult {
  detected: boolean;
  condition: string | null;
  specialty: string | null;
  message: string | null;
  suggestedReplies: string[];
}

@Injectable()
export class MedicalConditionService {
  private readonly logger = new Logger(MedicalConditionService.name);

  // Common medical conditions mapped to specialties
  // Using existing specialty names from database
  private readonly conditionToSpecialty: Record<string, string> = {
    // HIV/AIDS
    'hiv': 'Infectious Disease',
    'aids': 'Infectious Disease',
    'hiv positive': 'Infectious Disease',
    'aids positive': 'Infectious Disease',

    // Diabetes
    'diabetes': 'Endocrinologist',
    'diabetic': 'Endocrinologist',
    'diabetes type 1': 'Endocrinologist',
    'diabetes type 2': 'Endocrinologist',
    'type 1 diabetes': 'Endocrinologist',
    'type 2 diabetes': 'Endocrinologist',

    // Asthma
    'asthma': 'Pulmonologist',
    'chronic obstructive pulmonary disease': 'Pulmonologist',
    'copd': 'Pulmonologist',

    // Thyroid
    'thyroid': 'Endocrinologist',
    'hypothyroidism': 'Endocrinologist',
    'hyperthyroidism': 'Endocrinologist',
    'goiter': 'Endocrinologist',

    // Hypertension (High BP)
    'high bp': 'Cardiologist',
    'hypertension': 'Cardiologist',
    'high blood pressure': 'Cardiologist',

    // Skin conditions
    'skin rash': 'Dermatologist',
    'acne': 'Dermatologist',
    'eczema': 'Dermatologist',
    'psoriasis': 'Dermatologist',
    'dermatitis': 'Dermatologist',
    'skin infection': 'Dermatologist',

    // Heart conditions
    'heart disease': 'Cardiologist',
    'cardiac': 'Cardiologist',
    'heart problem': 'Cardiologist',
    'arrhythmia': 'Cardiologist',

    // Mental health
    'depression': 'Psychiatrist',
    'anxiety': 'Psychiatrist',
    'panic attack': 'Psychiatrist',
    'mental health': 'Psychiatrist',

    // Other conditions
    'cancer': 'Oncologist',
    'tuberculosis': 'Infectious Disease',
    'tb': 'Infectious Disease',
    'malaria': 'Infectious Disease',
    'dengue': 'Infectious Disease',
    'chickenpox': 'General Physician',
    'measles': 'General Physician',
    'flu': 'General Physician',
    'influenza': 'General Physician',
    'cold': 'General Physician',
    'fever': 'General Physician',
  };

  // Hindi/Hinglish condition keywords
  private readonly hinglishConditions: Record<string, string> = {
    'mujhe diabetes hai': 'diabetes',
    'mujhe hiv hai': 'hiv',
    'mujhe aids hai': 'aids',
    'mujhe asthma hai': 'asthma',
    'mujhe thyroid hai': 'thyroid',
    'mujhe high bp hai': 'hypertension',
    'mujhe heart problem hai': 'heart disease',
    'mujhe skin problem hai': 'skin rash',
    'mujhe depression hai': 'depression',
    'mujhe anxiety hai': 'anxiety',
    'mujhe cancer hai': 'cancer',
    'mujhe tb hai': 'tuberculosis',
    'mujhe malaria hai': 'malaria',
    'mujhe dengue hai': 'dengue',
    'mujhe flu hai': 'flu',
    'mujhe fever hai': 'fever',
    'mujhe cold hai': 'cold',
    'mujhe diabetes ki problem hai': 'diabetes',
    'mujhe hiv ki problem hai': 'hiv',
    'mujhe aids ki problem hai': 'aids',
    'mujhe asthma ki problem hai': 'asthma',
    'mujhe thyroid ki problem hai': 'thyroid',
    'mujhe high bp ki problem hai': 'hypertension',
    'mujhe heart problem ki problem hai': 'heart disease',
    'mujhe skin problem ki problem hai': 'skin rash',
    'mujhe depression ki problem hai': 'depression',
    'mujhe anxiety ki problem hai': 'anxiety',
  };

  // Patterns for medical condition detection
  // These patterns capture statements indicating a diagnosed condition
  private readonly conditionPatterns: { pattern: RegExp; condition: string }[] = [
    // English patterns with "I have..."
    { pattern: /i\s+have\s+(aids|hiv)\b/i, condition: 'hiv' },
    { pattern: /i\s+have\s+diabetes\b/i, condition: 'diabetes' },
    { pattern: /i\s+have\s+asthma\b/i, condition: 'asthma' },
    { pattern: /i\s+have\s+thyroid\b/i, condition: 'thyroid' },
    { pattern: /i\s+have\s+(high\s+bp|hypertension|high\s+blood\s+pressure)\b/i, condition: 'hypertension' },
    { pattern: /i\s+have\s+(heart\s+problem|cardiac\s+problem|heart\s+disease)\b/i, condition: 'heart disease' },
    { pattern: /i\s+have\s+(skin\s+rash|eczema|psoriasis|acne|dermatitis)\b/i, condition: 'skin rash' },
    { pattern: /i\s+have\s+(depression|anxiety|mental\s+health)\b/i, condition: 'depression' },
    { pattern: /i\s+have\s+(cancer|tumor)\b/i, condition: 'cancer' },
    { pattern: /i\s+have\s+(tb|tuberculosis|malaria|dengue|flu|influenza|chickenpox|measles)\b/i, condition: 'tuberculosis' },
    { pattern: /i\s+have\s+(fever|cold|headache)\b/i, condition: 'fever' },

    // English patterns with "I was diagnosed with..."
    { pattern: /i\s+was\s+diagnosed\s+with\s+(aids|hiv)\b/i, condition: 'hiv' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+diabetes\b/i, condition: 'diabetes' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+asthma\b/i, condition: 'asthma' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+thyroid\b/i, condition: 'thyroid' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+(high\s+bp|hypertension)\b/i, condition: 'hypertension' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+(heart\s+problem|cardiac)\b/i, condition: 'heart disease' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+(depression|anxiety)\b/i, condition: 'depression' },
    { pattern: /i\s+was\s+diagnosed\s+with\s+(cancer|tumor)\b/i, condition: 'cancer' },

    // English patterns with "I suffer from..."
    { pattern: /i\s+suffer\s+from\s+(aids|hiv)\b/i, condition: 'hiv' },
    { pattern: /i\s+suffer\s+from\s+diabetes\b/i, condition: 'diabetes' },
    { pattern: /i\s+suffer\s+from\s+asthma\b/i, condition: 'asthma' },
    { pattern: /i\s+suffer\s+from\s+thyroid\b/i, condition: 'thyroid' },
    { pattern: /i\s+suffer\s+from\s+(high\s+bp|hypertension)\b/i, condition: 'hypertension' },
    { pattern: /i\s+suffer\s+from\s+(heart\s+problem)\b/i, condition: 'heart disease' },
    { pattern: /i\s+suffer\s+from\s+(depression|anxiety)\b/i, condition: 'depression' },

    // English patterns with "I've been diagnosed with..."
    { pattern: /i've\s+been\s+diagnosed\s+with\s+(aids|hiv)\b/i, condition: 'hiv' },
    { pattern: /i've\s+been\s+diagnosed\s+with\s+diabetes\b/i, condition: 'diabetes' },
    { pattern: /i've\s+been\s+diagnosed\s+with\s+asthma\b/i, condition: 'asthma' },
    { pattern: /i've\s+been\s+diagnosed\s+with\s+thyroid\b/i, condition: 'thyroid' },

    // English patterns with "I am..."
    { pattern: /i\s+am\s+(aids|hiv)\b/i, condition: 'hiv' },
    { pattern: /i\s+am\s+a\s+diabetic\b/i, condition: 'diabetes' },
    { pattern: /i\s+am\s+(asthmatic|have\s+asthma)\b/i, condition: 'asthma' },

    // Hindi/Hinglish patterns
    { pattern: /mujhe\s+(aids|hiv)\s+hai\b/i, condition: 'hiv' },
    { pattern: /mujhe\s+diabetes\s+hai\b/i, condition: 'diabetes' },
    { pattern: /mujhe\s+asthma\s+hai\b/i, condition: 'asthma' },
    { pattern: /mujhe\s+thyroid\s+hai\b/i, condition: 'thyroid' },
    { pattern: /mujhe\s+(high\s+bp|hypertension)\s+hai\b/i, condition: 'hypertension' },
    { pattern: /mujhe\s+(heart\s+problem|dil\s+ki\s+problem)\s+hai\b/i, condition: 'heart disease' },
    { pattern: /mujhe\s+(skin\s+problem|tada\s+ki\s+problem)\s+hai\b/i, condition: 'skin rash' },
    { pattern: /mujhe\s+(depression|anxiety)\s+hai\b/i, condition: 'depression' },
    { pattern: /mujhe\s+cancer\s+hai\b/i, condition: 'cancer' },
    { pattern: /mujhe\s+(tb|tuberculosis|malaria|dengue)\s+hai\b/i, condition: 'tuberculosis' },
    { pattern: /mujhe\s+diabetes\s+ki\s+problem\s+hai\b/i, condition: 'diabetes' },
    { pattern: /mujhe\s+hiv\s+ki\s+problem\s+hai\b/i, condition: 'hiv' },
    { pattern: /mujhe\s+aids\s+ki\s+problem\s+hai\b/i, condition: 'aids' },
    { pattern: /mujhe\s+asthma\s+ki\s+problem\s+hai\b/i, condition: 'asthma' },
    { pattern: /mujhe\s+thyroid\s+ki\s+problem\s+hai\b/i, condition: 'thyroid' },
    { pattern: /mujhe\s+(high\s+bp|hypertension)\s+ki\s+problem\s+hai\b/i, condition: 'hypertension' },
    { pattern: /mujhe\s+(heart\s+problem)\s+ki\s+problem\s+hai\b/i, condition: 'heart disease' },
    { pattern: /mujhe\s+(skin\s+problem)\s+ki\s+problem\s+hai\b/i, condition: 'skin rash' },
    { pattern: /mujhe\s+(depression|anxiety)\s+ki\s+problem\s+hai\b/i, condition: 'depression' },

    // More general patterns that match various conditions
    { pattern: /(aids|hiv|aids positive|hiv positive)\b/i, condition: 'hiv' },
    { pattern: /(diabetes|diabetic)\b/i, condition: 'diabetes' },
    { pattern: /asthma\b/i, condition: 'asthma' },
    { pattern: /(thyroid|hypothyroidism|hyperthyroidism|goiter)\b/i, condition: 'thyroid' },
    { pattern: /(hypertension|high\s+bp|high\s+blood\s+pressure)\b/i, condition: 'hypertension' },
    { pattern: /(heart\s+disease|cardiac|heart\s+problem|arrhythmia)\b/i, condition: 'heart disease' },
    { pattern: /(depression|anxiety|panic\s+attack)\b/i, condition: 'depression' },
    { pattern: /cancer\b/i, condition: 'cancer' },
    { pattern: /(tb|tuberculosis)\b/i, condition: 'tuberculosis' },
    { pattern: /(skin\s+rash|eczema|psoriasis|acne|dermatitis)\b/i, condition: 'skin rash' },
  ];

  /**
   * Detect if the message contains a medical condition statement
   * and return the condition and recommended specialty.
   */
  detectMedicalCondition(message: string): MedicalConditionResult {
    const normalized = (message || '').toLowerCase().trim();

    if (!normalized) {
      return {
        detected: false,
        condition: null,
        specialty: null,
        message: null,
        suggestedReplies: [],
      };
    }

    // Check for exact Hindi/Hinglish condition matches first
    for (const [hinglish, condition] of Object.entries(this.hinglishConditions)) {
      if (normalized.includes(hinglish)) {
        const specialty = this.conditionToSpecialty[condition] || 'General Physician';
        return {
          detected: true,
          condition,
          specialty,
          message: null,
          suggestedReplies: this.getSuggestedReplies(specialty),
        };
      }
    }

    // Check for pattern-based matches
    for (const { pattern, condition } of this.conditionPatterns) {
      if (pattern.test(normalized)) {
        const specialty = this.conditionToSpecialty[condition] || 'General Physician';
        return {
          detected: true,
          condition,
          specialty,
          message: null,
          suggestedReplies: this.getSuggestedReplies(specialty),
        };
      }
    }

    // Check if any condition keyword appears in the message
    // This catches cases like "my doctor said I have thyroid"
    for (const [condition, specialty] of Object.entries(this.conditionToSpecialty)) {
      if (normalized.includes(condition)) {
        return {
          detected: true,
          condition,
          specialty,
          message: null,
          suggestedReplies: this.getSuggestedReplies(specialty),
        };
      }
    }

    return {
      detected: false,
      condition: null,
      specialty: null,
      message: null,
      suggestedReplies: [],
    };
  }

  /**
   * Get suggested replies based on the specialty.
   */
  private getSuggestedReplies(specialty: string): string[] {
    const replies: string[] = [];

    switch (specialty.toLowerCase()) {
      case 'cardiologist':
      case 'cardiology':
        replies.push('Find a cardiologist', 'Book appointment with specialist', 'Nearby hospitals');
        break;
      case 'dermatologist':
      case 'dermatology':
        replies.push('Find a skin specialist', 'Book appointment with dermatologist', 'Skin care tips');
        break;
      case 'neurologist':
      case 'neurology':
        replies.push('Find a neurologist', 'Book appointment with specialist', 'Headache specialist');
        break;
      case 'orthopedist':
      case 'orthopedics':
        replies.push('Find an orthopedist', 'Book appointment with specialist', 'Bone specialist');
        break;
      case 'pediatrician':
      case 'pediatrics':
        replies.push('Find a pediatrician', 'Book appointment with child specialist', 'Child care');
        break;
      case 'gynecologist':
      case 'gynecology':
        replies.push('Find a gynecologist', 'Book appointment with specialist', 'Women health');
        break;
      case 'psychiatrist':
      case 'psychiatry':
        replies.push('Find a psychiatrist', 'Book appointment with specialist', 'Mental health support');
        break;
      case 'orthopedist':
      case 'orthopedics':
        replies.push('Find an orthopedist', 'Book appointment with specialist', 'Bone specialist');
        break;
      case 'ophthalmologist':
      case 'ophthalmology':
        replies.push('Find an eye specialist', 'Book appointment with ophthalmologist', 'Eye care');
        break;
      case 'ent specialist':
      case 'ent':
        replies.push('Find an ENT specialist', 'Book appointment with specialist', 'Ear nose throat care');
        break;
      case 'pulmonologist':
      case 'pulmonology':
        replies.push('Find a pulmonologist', 'Book appointment with specialist', 'Lung specialist');
        break;
      case 'gastroenterologist':
      case 'gastroenterology':
        replies.push('Find a gastroenterologist', 'Book appointment with specialist', 'Stomach specialist');
        break;
      case 'endocrinologist':
      case 'endocrinology':
        replies.push('Find an endocrinologist', 'Book appointment with specialist', 'Diabetes specialist');
        break;
      case 'urologist':
      case 'urology':
        replies.push('Find a urologist', 'Book appointment with specialist', 'Kidney specialist');
        break;
      case 'dentist':
      case 'dentistry':
        replies.push('Find a dentist', 'Book appointment with specialist', 'Dental care');
        break;
      case 'oncologist':
      case 'oncology':
        replies.push('Find an oncologist', 'Book appointment with specialist', 'Cancer care');
        break;
      case 'infectious disease':
      case 'infectious disease specialist':
        replies.push('Find an infectious disease specialist', 'Book appointment with specialist', 'Infection treatment');
        break;
      case 'general physician':
      case 'general physician':
      case 'general':
      default:
        replies.push('Find a general physician', 'Book appointment with doctor', 'General health checkup');
        break;
    }

    return replies;
  }

  /**
   * Build the response message for a detected medical condition.
   */
  buildConditionResponse(condition: string, specialty: string): string {
    return `I understand you're managing ${condition}. I can help you find appropriate care.`;
  }
}
