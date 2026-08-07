import { Body, Controller, Post, Req } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { ChatbotResponseDto } from './dto/chatbot-response.dto';
import { ChatbotResponse } from './types/chatbot.types';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  async sendMessage(
    @Body() dto: ChatbotMessageDto,
    @Req() req: any,
  ): Promise<ChatbotResponseDto> {
    const response: ChatbotResponse = await this.chatbotService.processMessage(dto, req.user);
    return ChatbotResponseDto.fromResponse(response);
  }
}
