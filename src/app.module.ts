import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EhrModule } from './ehr/ehr.module';

@Module({
  imports: [PrismaModule, AuthModule, EhrModule],
})
export class AppModule {}