import { Injectable, Logger } from '@nestjs/common';
import { ChatCard, EmergencyCard } from '../types/chatbot.types';

export interface EmergencyResult {
  cards: ChatCard[];
  message: string;
  suggestedReplies: string[];
}

const EMERGENCY_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'chest pain', pattern: /chest pain/i },
  { label: 'heart attack', pattern: /heart attack/i },
  { label: 'stroke', pattern: /stroke/i },
  { label: 'breathing difficulty', pattern: /difficulty breathing|can't breathe|cannot breathe|shortness of breath|breathless|severe breathing difficulty/i },
  { label: 'severe bleeding', pattern: /severe bleeding|heavy bleeding|bleeding/i },
  { label: 'major trauma', pattern: /major trauma|accident|injury/i },
  { label: 'unconsciousness', pattern: /unconscious|fainted|fainting/i },
  { label: 'seizure', pattern: /seizure|convulsion|epileptic/i },
  { label: 'overdose', pattern: /overdose/i },
  { label: 'allergic reaction', pattern: /allergic reaction|anaphylaxis|swelling of the face|swelling of the throat/i },
  { label: 'pregnancy emergency', pattern: /pregnancy emergency|pregnant|painful contractions/i },
  { label: 'self-harm', pattern: /suicide|kill myself|self harm|self-harm|cut myself|cutting myself/i },
  { label: 'severe headache', pattern: /severe headache.*worst|worst headache/i },
  { label: 'neurological', pattern: /sudden numbness|weakness on one side/i },
];

@Injectable()
export class EmergencyHandlingService {
  private readonly logger = new Logger(EmergencyHandlingService.name);

  detectEmergency(message: string): boolean {
    const normalized = (message || '').toLowerCase().trim();
    if (!normalized) return false;

    for (const { pattern } of EMERGENCY_PATTERNS) {
      if (pattern.test(normalized)) {
        return true;
      }
    }
    return false;
  }

  detectEmergencyEntities(message: string): string[] {
    const normalized = (message || '').toLowerCase().trim();
    if (!normalized) return [];

    const matched: string[] = [];
    for (const { label, pattern } of EMERGENCY_PATTERNS) {
      if (pattern.test(normalized)) {
        matched.push(label);
      }
    }
    return matched;
  }

  buildEmergencyResponse(params: {
    latitude?: number;
    longitude?: number;
  }): EmergencyResult {
    const { latitude, longitude } = params;
    const hasLocation =
      latitude !== undefined &&
      longitude !== undefined &&
      !Number.isNaN(latitude) &&
      !Number.isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    const message =
      'This sounds like a medical emergency. You need urgent in-person medical care right now. Call 108 for an ambulance immediately.';

    const card: EmergencyCard = {
      type: 'emergency',
      message,
      callNumber: '108',
      callAction: 'tel:108',
      locationRequired: !hasLocation,
      findHospitals: hasLocation,
      actions: [
        { label: 'Call 108', value: 'tel:108' },
      ],
    };

    if (hasLocation) {
      card.actions.push({
        label: 'Find nearby emergency hospitals',
        value: 'find_emergency_hospitals',
      });
    } else {
      card.actions.push({
        label: 'Find nearby emergency hospitals',
        value: 'find_emergency_hospitals',
      });
    }

    const suggestedReplies = ['Call 108', 'Nearby emergency hospitals'];

    return {
      cards: [card as unknown as ChatCard],
      message,
      suggestedReplies,
    };
  }
}
