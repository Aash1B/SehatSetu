import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ChatIntent } from '../types/chatbot.types';

export interface IntentResponse {
  intent: ChatIntent;
  message: string;
  suggestedReplies: string[];
  locationRequired?: boolean;
}

export interface EntityExtraction {
  symptoms?: string[];
  disease?: string;
  specialty?: string;
  doctorName?: string;
  timePreference?: string;
  doctorId?: string;
  appointmentId?: string;
  consultationMode?: string;
  date?: string;
  timeSlot?: string;
  confirmation?: boolean;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class IntentRouterService {
  private readonly logger = new Logger(IntentRouterService.name);

  private readonly keywords: Record<ChatIntent, RegExp[]>;
  private readonly templates: Record<
    ChatIntent,
    { message: string; suggestedReplies: string[] }
  >;

  constructor() {
    this.keywords = {
      [ChatIntent.EMERGENCY]: [
        /chest pain/i,
        /heart attack/i,
        /stroke/i,
        /can'?t breathe/i,
        /difficulty breathing/i,
        /severe breathing difficulty/i,
        /shortness of breath/i,
        /breathless/i,
        /bleeding/i,
        /severe bleeding/i,
        /heavy bleeding/i,
        /nosebleed/i,
        /accident/i,
        /major trauma/i,
        /unconscious/i,
        /fainted/i,
        /fainting/i,
        /suicide/i,
        /kill myself/i,
        /self harm/i,
        /self-harm/i,
        /cut myself/i,
        /overdose/i,
        /seizure/i,
        /convulsion/i,
        /epileptic/i,
        /allergic reaction/i,
        /anaphylaxis/i,
        /swelling of the face/i,
        /swelling of the throat/i,
        /pregnancy emergency/i,
        /pregnant/i,
        /painful contractions/i,
        /severe headache.*worst/i,
        /sudden numbness/i,
        /weakness on one side/i,
      ],
      [ChatIntent.GREETING]: [
        /hello/i,
        /hi/i,
        /hey/i,
        /good morning/i,
        /good evening/i,
        /good afternoon/i,
      ],
      [ChatIntent.DOCTOR_SEARCH]: [
        /\bdoctor\b/i,
        /\bphysician\b/i,
        /\bspecialist\b/i,
        /cardiologist/i,
        /dermatologist/i,
        /neurologist/i,
        /orthopedist/i,
        /pediatrician/i,
      ],
      [ChatIntent.DOCTOR_AVAILABILITY]: [
        /available/i,
        /availability/i,
        /slot/i,
        /\btoday\b/i,
        /\btomorrow\b/i,
        /\btime\b/i,
      ],
      [ChatIntent.APPOINTMENT_BOOKING]: [
        /\bbook\b/i,
        /\bappointment\b/i,
        /\bschedule\b/i,
        /\bcancel\b/i,
        /\breschedule\b/i,
      ],
      [ChatIntent.APPOINTMENT_STATUS]: [
        /status of appointment/i,
        /appointment details/i,
        /my appointment/i,
      ],
      [ChatIntent.NEARBY_HOSPITALS]: [
        /\bhospitals?\b/i,
        /emergency room/i,
        /\bclinics?\b/i,
        /\bnearby hospitals?\b/i,
      ],
      [ChatIntent.NEARBY_LABS]: [
        /\blab\b/i,
        /blood test/i,
        /diagnostic/i,
        /cbc/i,
        /\bthyroid\b/i,
        /xray/i,
        /mri/i,
        /\bct scan\b/i,
      ],
      [ChatIntent.LAB_TEST_GUIDANCE]: [
        /what tests/i,
        /need testing/i,
        /lab test guidance/i,
      ],
      [ChatIntent.HEALTH_RECORDS]: [
        /health record/i,
        /medical history/i,
        /\bear\b/i,
        /ehr/i,
        /\breport\b/i,
      ],
      [ChatIntent.PRESCRIPTIONS]: [
        /prescription/i,
        /\bmedicine\b/i,
        /\bdrugs\b/i,
      ],
      [ChatIntent.HELP]: [/help/i, /what can you do/i, /features/i],
      [ChatIntent.GENERAL_CHAT]: [/how are you/i, /thank you/i, /bye/i],
      [ChatIntent.DOCTOR_RECOMMENDATION]: [
        /recommend/i,
        /suggest/i,
        /which doctor/i,
        /right doctor/i,
      ],
      [ChatIntent.UNKNOWN]: [],
    };

    this.templates = {
      [ChatIntent.GREETING]: {
        message: "Hello! I'm your SehatSetu Health Assistant.",
        suggestedReplies: ['Find a doctor', 'Book appointment', 'Nearby hospitals'],
      },
      [ChatIntent.HELP]: {
        message: 'I can help with doctor searches, appointments, hospitals, labs, and health records.',
        suggestedReplies: ['Find a doctor', 'Where is the nearest hospital?', 'Book appointment'],
      },
      [ChatIntent.GENERAL_CHAT]: {
        message: "I'm here to help with your health needs. How can I assist you today?",
        suggestedReplies: ['Find a doctor', 'Nearby hospitals', 'Lab tests'],
      },
      [ChatIntent.DOCTOR_SEARCH]: {
        message: 'I can help you find the right doctor.',
        suggestedReplies: ['Show doctors', 'Find specialist', 'Check availability'],
      },
      [ChatIntent.DOCTOR_RECOMMENDATION]: {
        message: 'Let me help you find a recommended doctor.',
        suggestedReplies: ['Cardiologist', 'Dermatologist', 'Nearest doctor'],
      },
      [ChatIntent.DOCTOR_AVAILABILITY]: {
        message: 'I can check doctor availability.',
        suggestedReplies: ['Available today', 'Available tomorrow', 'Show slots'],
      },
      [ChatIntent.APPOINTMENT_BOOKING]: {
        message: 'I can help you book an appointment.',
        suggestedReplies: ['Book with a doctor', 'Book for today', 'Cancel an appointment'],
      },
      [ChatIntent.APPOINTMENT_STATUS]: {
        message: 'Please provide the appointment ID or date to check your appointment status.',
        suggestedReplies: ['Upcoming appointments', 'Appointment details'],
      },
      [ChatIntent.NEARBY_HOSPITALS]: {
        message: 'I can help locate nearby hospitals.',
        suggestedReplies: ['Nearby hospitals', 'Emergency room', 'Nearest clinic'],
      },
      [ChatIntent.NEARBY_LABS]: {
        message: 'I can help locate diagnostic laboratories.',
        suggestedReplies: ['Blood test labs', 'Xray centers', 'Nearby diagnostics'],
      },
      [ChatIntent.LAB_TEST_GUIDANCE]: {
        message: 'I can provide guidance on recommended lab tests.',
        suggestedReplies: ['Common blood tests', 'Thyroid panel', 'Diabetes tests'],
      },
      [ChatIntent.HEALTH_RECORDS]: {
        message: 'I can help access your health records after login.',
        suggestedReplies: ['My EHR', 'Medical history', 'Lab reports'],
      },
      [ChatIntent.PRESCRIPTIONS]: {
        message: 'I can help you view prescriptions.',
        suggestedReplies: ['My prescriptions', 'Medicine list', 'Repeat prescription'],
      },
      [ChatIntent.EMERGENCY]: {
        message:
          'Your message may describe a medical emergency. Please seek immediate medical assistance.',
        suggestedReplies: ['Call 108', 'Nearby hospitals', 'Emergency room'],
      },
      [ChatIntent.UNKNOWN]: {
        message: "I'm not sure I understood that. Could you rephrase?",
        suggestedReplies: ['Find a doctor', 'Book appointment', 'Help'],
      },
    };
  }

  detect(message: string): ChatIntent {
    const normalized = (message || '').toLowerCase().trim();

    if (!normalized) {
      return ChatIntent.UNKNOWN;
    }

    // Emergency always wins
    for (const pattern of this.keywords[ChatIntent.EMERGENCY]) {
      if (pattern.test(normalized)) {
        this.logger.warn(`Emergency intent detected for message: ${message}`);
        return ChatIntent.EMERGENCY;
      }
    }

    const priorityOrder: ChatIntent[] = [
      ChatIntent.EMERGENCY,
      ChatIntent.GREETING,
      ChatIntent.APPOINTMENT_STATUS,
      ChatIntent.DOCTOR_RECOMMENDATION,
      ChatIntent.DOCTOR_AVAILABILITY,
      ChatIntent.APPOINTMENT_BOOKING,
      ChatIntent.DOCTOR_SEARCH,
      ChatIntent.NEARBY_HOSPITALS,
      ChatIntent.NEARBY_LABS,
      ChatIntent.LAB_TEST_GUIDANCE,
      ChatIntent.HEALTH_RECORDS,
      ChatIntent.PRESCRIPTIONS,
      ChatIntent.HELP,
      ChatIntent.GENERAL_CHAT,
    ];

    for (const intent of priorityOrder) {
      if (intent === ChatIntent.UNKNOWN) continue;
      const patterns = this.keywords[intent];
      for (const pattern of patterns) {
        if (pattern.test(normalized)) {
          return intent;
        }
      }
    }

    return ChatIntent.UNKNOWN;
  }

  extractEntities(message: string): EntityExtraction {
    const normalized = (message || '').toLowerCase();
    const entities: EntityExtraction = {};

    const symptomMap = {
      fever: 'fever',
      cough: 'cough',
      cold: 'cold',
      headache: 'headache',
      fatigue: 'fatigue',
      nausea: 'nausea',
    };

    for (const [key, value] of Object.entries(symptomMap)) {
      if (normalized.includes(key)) {
        if (!entities.symptoms) {
          entities.symptoms = [];
        }
        entities.symptoms.push(value);
      }
    }

    if (/cardiology|heart/i.test(normalized)) {
      entities.specialty = 'Cardiology';
    } else if (/neurology|brain/i.test(normalized)) {
      entities.specialty = 'Neurology';
    } else if (/dermatology|skin/i.test(normalized)) {
      entities.specialty = 'Dermatology';
    }

    const doctorNameMatch = normalized.match(/dr\.?\s+([a-z\s]+)/i);
    if (doctorNameMatch && doctorNameMatch[1]) {
      entities.doctorName = doctorNameMatch[1].trim();
    }

    if (/today/i.test(normalized)) {
      entities.timePreference = 'today';
    } else if (/tomorrow/i.test(normalized)) {
      entities.timePreference = 'tomorrow';
    }

    const morningMatch = normalized.match(/\bmorning\b/i);
    if (morningMatch) {
      entities.timePreference = entities.timePreference || 'morning';
    }
    const afternoonMatch = normalized.match(/\bafternoon\b/i);
    if (afternoonMatch) {
      entities.timePreference = entities.timePreference || 'afternoon';
    }
    const eveningMatch = normalized.match(/\bevening\b/i);
    if (eveningMatch) {
      entities.timePreference = entities.timePreference || 'evening';
    }

    const timeSlotMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (timeSlotMatch) {
      entities.timeSlot = `${timeSlotMatch[1].padStart(2, '0')}:${timeSlotMatch[2]} ${timeSlotMatch[3].toUpperCase()}`;
    }

    const confirmMatch = normalized.match(/\b(confirm|yes|ok|okay|yep|sure)\b/i);
    if (confirmMatch) {
      entities.confirmation = true;
    }

    return entities;
  }

  route(message: string): IntentResponse {
    const intent = this.detect(message);
    const template = this.templates[intent] || this.templates[ChatIntent.UNKNOWN];

    return {
      intent,
      message: template.message,
      suggestedReplies: template.suggestedReplies,
    };
  }
}
