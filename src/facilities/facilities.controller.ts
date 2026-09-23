import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FacilitiesService } from './facilities.service';
import { UpdateMedicineStockDto } from './dto/update-medicine-stock.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Get()
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getAllFacilities() {
    return this.facilitiesService.getAllFacilities();
  }

  @Get('medicine-search')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async searchMedicine(
    @Query('name') name: string,
    @Query('district') district?: string,
  ) {
    return this.facilitiesService.searchMedicineAvailability(name, district);
  }

  @Get(':id')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getFacilityById(@Param('id') id: string) {
    return this.facilitiesService.getFacilityById(id);
  }

  @Get(':id/inventory')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getFacilityInventory(
    @Param('id') id: string,
    @Query('status') status?: string,
  ) {
    return this.facilitiesService.getFacilityInventory(id, status);
  }

  @Get(':id/dashboard')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getFacilityDashboard(@Param('id') id: string) {
    return this.facilitiesService.getFacilityDashboardMetrics(id);
  }

  @Patch(':id/inventory/:medicineId')
  @Roles('FACILITY_ADMIN', 'DOCTOR')
  async updateMedicineStock(
    @Param('id') facilityId: string,
    @Param('medicineId') medicineId: string,
    @Body() dto: UpdateMedicineStockDto,
  ) {
    return this.facilitiesService.updateMedicineStock(facilityId, medicineId, dto);
  }
}
