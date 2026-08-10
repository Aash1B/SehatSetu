import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { IntentRouterService } from './services/intent-router.service';
import { ConversationService } from './services/conversation.service';
import { DoctorChatService } from './services/doctor-chat.service';
import { AppointmentChatService } from './services/appointment-chat.service';
import { HospitalChatService } from './services/hospital-chat.service';
import { LabChatService } from './services/lab-chat.service';
import { EmergencyHandlingService } from './services/emergency-handling.service';
import { LabTestGuidanceService } from './services/lab-test-guidance.service';
import { AiChatService } from './services/ai-chat.service';
import { MedicalConditionService } from './services/medical-condition.service';
import { AiModule } from '../ai/ai.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { DoctorModule } from '../doctor/doctor.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { HospitalsModule } from '../hospitals/hospitals.module';

@Module({
  imports: [DoctorsModule, DoctorModule, AppointmentsModule, HospitalsModule, AiModule],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    IntentRouterService,
    ConversationService,
    DoctorChatService,
    AppointmentChatService,
    HospitalChatService,
    LabChatService,
    EmergencyHandlingService,
    LabTestGuidanceService,
    AiChatService,
    MedicalConditionService,
  ],
  exports: [ChatbotService],
})
export class ChatbotModule {}
