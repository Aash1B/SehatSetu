import { IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^[A-Za-z0-9@#]+$/, {
    message: 'Password can only contain letters, numbers, and the symbols @ or #',
  })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[@#]/, {
    message: 'Password must contain at least one symbol (@ or #)',
  })
  @Matches(/(?:.*[A-Za-z]){3,}/, {
    message: 'Password must contain at least 3 letters',
  })
  newPassword: string;
}