export type MessageRole = 'user' | 'assistant';

export interface ChatSlot {
  startTime: string;
  endTime: string;
  displayTime: string;
  mode: string;
}

export interface ChatCardAction {
  type: string;
  label: string;
  value?: string;
}

export interface ChatCard {
  type: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  slots?: ChatSlot[];
  actions?: ChatCardAction[];
  appointmentId?: string;
  status?: string;
  consultationMode?: string;
  mode?: string;
  fee?: string;
  actionType?: 'BOOK_APPOINTMENT' | 'CANCEL_APPOINTMENT' | 'RESCHEDULE_APPOINTMENT';
  message?: string;
  hospitalId?: string;
  labId?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  phone?: string;
  openStatus?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  rating?: number;
  experience?: string;
  consultationFee?: string;
  homeCollection?: boolean;
  availableToday?: boolean;
  languages?: string[];
}

export interface ChatbotResponse {
  conversationId: string;
  intent: string;
  message: string;
  cards?: ChatCard[];
  suggestedReplies?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  cards?: ChatCard[];
  suggestedReplies?: string[];
  isTyping?: boolean;
  isError?: boolean;
  conversationId?: string;
}

export interface ChatError {
  type: 'offline' | 'timeout' | 'backend_unavailable' | 'ai_unavailable' | 'location_denied' | 'auth_required' | 'unknown';
  message: string;
  canRetry: boolean;
}
