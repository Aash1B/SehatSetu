import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AccountDeletionService } from './account-deletion.service';
import { ConfirmAccountDeletionDto } from './dto/confirm-account-deletion.dto';

@Controller('account/deletion')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Post('request-otp')
  requestOtp(@Req() request: { user: { userId: string } }) {
    return this.deletion.requestOtp(request.user.userId);
  }

  @Post('confirm')
  confirm(@Req() request: { user: { userId: string } }, @Body() body: ConfirmAccountDeletionDto) {
    return this.deletion.confirm(request.user.userId, body.otp, body.confirmation);
  }
}
