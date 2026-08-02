import { Module } from '@nestjs/common';
import { MedicalReportsController } from './medical-reports.controller';
import { MedicalReportsService } from './medical-reports.service';
import { MedicalReportsRepository } from './medical-reports.repository';
import { STORAGE_SERVICE } from './storage/storage.service';
import { SupabaseStorageService } from './storage/supabase-storage.service';
import { OCR_CLIENT } from './ocr/ocr-client';
import { FastApiOcrClient } from './ocr/fastapi-ocr.client';

@Module({
  controllers: [MedicalReportsController],
  providers: [
    MedicalReportsService,
    MedicalReportsRepository,
    { provide: STORAGE_SERVICE, useClass: SupabaseStorageService },
    { provide: OCR_CLIENT, useClass: FastApiOcrClient },
  ],
})
export class MedicalReportsModule {}
