import { ChatIntent, ChatCard, ChatbotResponse } from '../types/chatbot.types';

export class ChatCardDto {
  type!: string;
  title!: string;
  subtitle?: string;
  imageUrl?: string;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  slots?: { startTime: string; endTime: string; displayTime: string; mode: string }[];
  actions?: { type: string; label: string; value?: string }[];
  appointmentId?: string;
  status?: string;
  consultationMode?: string;
  mode?: string;
  fee?: string;
  actionType?: string;
  message?: string;
  hospitalId?: string;
  labId?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  phone?: string;
}

export class ChatbotResponseDto {
  conversationId!: string;
  intent!: ChatIntent;
  message!: string;
  cards: ChatCardDto[] = [];
  suggestedReplies: string[] = [];

  static fromResponse(response: ChatbotResponse): ChatbotResponseDto {
    const dto = new ChatbotResponseDto();
    dto.conversationId = response.conversationId;
    dto.intent = response.intent;
    dto.message = response.message;
    dto.cards = (response.cards ?? []).map((card: ChatCard) => ({
      type: card.type,
      title: card.title,
      subtitle: card.subtitle,
      imageUrl: card.imageUrl,
      doctorId: card.doctorId,
      doctorName: card.doctorName,
      specialty: card.specialty,
      date: card.date,
      time: card.time,
      slots: card.slots,
      actions: card.actions,
      appointmentId: card.appointmentId,
      status: card.status,
      consultationMode: card.consultationMode,
      mode: card.mode,
      fee: card.fee,
      actionType: card.actionType,
      message: card.message,
      hospitalId: card.hospitalId,
      labId: card.labId,
      latitude: card.latitude,
      longitude: card.longitude,
      distance: card.distance,
      phone: card.phone,
    }));
    dto.suggestedReplies = response.suggestedReplies ?? [];
    return dto;
  }
}
