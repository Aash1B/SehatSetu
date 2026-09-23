import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DiagnosticsService } from './diagnostics.service';
import { CreateDiagnosticOrderDto } from './dto/create-diagnostic-order.dto';
import { UploadDiagnosticReportDto } from './dto/upload-diagnostic-report.dto';
import { ReviewDiagnosticOrderDto } from './dto/review-diagnostic-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/diagnostics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Post('orders')
  @Roles('DOCTOR', 'FACILITY_ADMIN')
  async createOrder(@Req() req: any, @Body() dto: CreateDiagnosticOrderDto) {
    return this.diagnosticsService.createOrder(dto, req.user?.userId);
  }

  @Get('orders/patient/:patientId')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getPatientOrders(@Param('patientId') patientId: string) {
    return this.diagnosticsService.getPatientOrders(patientId);
  }

  @Get('orders/:id')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getOrderById(@Param('id') id: string) {
    return this.diagnosticsService.getOrderById(id);
  }

  @Post('orders/:id/upload-report')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async uploadReport(
    @Param('id') id: string,
    @Body() dto: UploadDiagnosticReportDto,
  ) {
    return this.diagnosticsService.uploadReport(id, dto);
  }

  @Patch('orders/:id/review')
  @Roles('DOCTOR', 'FACILITY_ADMIN')
  async reviewOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewDiagnosticOrderDto,
  ) {
    return this.diagnosticsService.reviewOrder(id, dto, req.user?.userId);
  }

  @Get('orders')
  @Roles('DOCTOR', 'FACILITY_ADMIN', 'ASHA')
  async getAllOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.diagnosticsService.getAllOrders(status, limit);
  }
}
