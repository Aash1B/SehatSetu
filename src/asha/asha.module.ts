import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { AshaController } from './asha.controller';
import { AshaService } from './asha.service';

@Module({
  imports: [PrismaModule, ChatbotModule],
  controllers: [AshaController],
  providers: [AshaService],
  exports: [AshaService],
})
export class AshaModule {}
