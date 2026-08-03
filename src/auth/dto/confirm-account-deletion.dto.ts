import { IsIn, Matches } from 'class-validator';

export class ConfirmAccountDeletionDto {
  @Matches(/^\d{6}$/, { message: 'Enter the six-digit verification code' })
  otp!: string;

  @IsIn(['DELETE'], { message: 'Type DELETE exactly to confirm account deletion' })
  confirmation!: string;
}
