import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMedicineStockDto } from './dto/update-medicine-stock.dto';

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllFacilities() {
    const facilities = await this.prisma.facility.findMany({
      include: {
        _count: {
          select: { inventory: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return facilities;
  }

  async getFacilityById(id: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        inventory: {
          orderBy: { medicineName: 'asc' },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with ID ${id} not found`);
    }

    return facility;
  }

  async getFacilityInventory(facilityId: string, status?: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with ID ${facilityId} not found`);
    }

    const where: any = { facilityId };
    if (status) {
      where.status = status;
    }

    return this.prisma.medicineStock.findMany({
      where,
      orderBy: { medicineName: 'asc' },
    });
  }

  async searchMedicineAvailability(name: string, district?: string) {
    if (!name || !name.trim()) {
      return [];
    }

    const query = name.trim().toLowerCase();

    // Query all stocks where medicineName contains search term
    const stocks = await this.prisma.medicineStock.findMany({
      where: {
        medicineName: {
          contains: query,
          mode: 'insensitive',
        },
        ...(district ? { facility: { district: { equals: district, mode: 'insensitive' as const } } } : {}),
      },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            type: true,
            district: true,
            village: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // AVAILABLE first
        { quantity: 'desc' },
      ],
    });

    return stocks.map((s) => ({
      id: s.id,
      medicineName: s.medicineName,
      status: s.status, // AVAILABLE, LOW_STOCK, OUT_OF_STOCK
      quantity: s.quantity ?? 0,
      facilityId: s.facilityId,
      facilityName: s.facility.name,
      facilityType: s.facility.type,
      district: s.facility.district,
      village: s.facility.village,
      updatedAt: s.updatedAt,
    }));
  }

  async updateMedicineStock(facilityId: string, medicineId: string, dto: UpdateMedicineStockDto) {
    const stock = await this.prisma.medicineStock.findFirst({
      where: {
        id: medicineId,
        facilityId,
      },
    });

    if (!stock) {
      throw new NotFoundException(`Medicine stock item ${medicineId} not found in facility ${facilityId}`);
    }

    let status = dto.status || stock.status;
    if (dto.quantity !== undefined && !dto.status) {
      if (dto.quantity <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (dto.quantity < 10) {
        status = 'LOW_STOCK';
      } else {
        status = 'AVAILABLE';
      }
    }

    const updated = await this.prisma.medicineStock.update({
      where: { id: medicineId },
      data: {
        quantity: dto.quantity !== undefined ? dto.quantity : stock.quantity,
        status,
      },
    });

    this.logger.log(`Updated stock ${medicineId} in facility ${facilityId}: quantity=${updated.quantity}, status=${updated.status}`);
    return updated;
  }

  async getFacilityDashboardMetrics(facilityId: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with ID ${facilityId} not found`);
    }

    // 1. Total & recent consultations / appointments
    const totalAppointments = await this.prisma.appointment.count();
    const completedAppointments = await this.prisma.appointment.count({
      where: { status: 'COMPLETED' },
    });

    const recentAppointments = await this.prisma.appointment.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            gender: true,
            age: true,
            phone: true,
            village: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hospital: true,
          },
        },
      },
    });

    // 2. Incoming and completed referrals
    const facilityReferrals = await this.prisma.referral.findMany({
      where: {
        OR: [
          { recommendedFacility: { contains: facility.name, mode: 'insensitive' } },
          { recommendedFacility: { contains: facility.district || '', mode: 'insensitive' } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            gender: true,
            phone: true,
            village: true,
          },
        },
        referredByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
    });

    // If no direct matches for this specific facility, include all referrals for regional coordination
    const allReferrals = facilityReferrals.length > 0
      ? facilityReferrals
      : await this.prisma.referral.findMany({
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                gender: true,
                phone: true,
                village: true,
              },
            },
            referredByDoctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
        });

    const incomingReferrals = allReferrals.length;
    const completedReferrals = allReferrals.filter((r) => r.status === 'COMPLETED' || r.status === 'VISITED').length;
    const pendingReferrals = allReferrals.filter((r) => r.status === 'PENDING' || r.status === 'SCHEDULED').length;

    // 3. High-risk cases (urgent triage appointments & overdue MCH)
    const highRiskAppointments = await this.prisma.appointment.findMany({
      where: {
        OR: [
          { priority: { in: ['EMERGENCY', 'HIGH'] } },
          { urgency: { in: ['emergency', 'high', 'today'] } },
          { severity: { in: ['CRITICAL', 'SEVERE', 'critical', 'severe'] } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            gender: true,
            age: true,
            phone: true,
            village: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
    });

    // 4. Diagnostic orders status & list
    const diagnosticOrders = await this.prisma.diagnosticOrder.findMany({
      take: 50,
      orderBy: { orderedAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phone: true,
            village: true,
          },
        },
        orderedByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
    });

    const totalDiagnosticOrders = diagnosticOrders.length;
    const pendingDiagnosticOrders = diagnosticOrders.filter((d) =>
      ['ORDERED', 'SAMPLE_COLLECTED', 'PENDING'].includes(d.status),
    ).length;
    const completedDiagnosticOrders = diagnosticOrders.filter((d) =>
      ['REVIEWED', 'REPORT_UPLOADED', 'COMPLETED'].includes(d.status),
    ).length;

    // 5. Medicine Inventory Shortages
    const allStocks = await this.prisma.medicineStock.findMany({
      where: { facilityId },
      orderBy: { medicineName: 'asc' },
    });

    const outOfStockCount = allStocks.filter(
      (s) => s.status === 'OUT_OF_STOCK' || (s.quantity !== null && s.quantity <= 0),
    ).length;
    const lowStockCount = allStocks.filter(
      (s) => s.status === 'LOW_STOCK' || (s.quantity !== null && s.quantity > 0 && s.quantity < 10),
    ).length;
    const availableCount = allStocks.filter(
      (s) => s.status === 'AVAILABLE' && (s.quantity === null || s.quantity >= 10),
    ).length;

    const medicineShortages = allStocks.filter(
      (s) => s.status === 'OUT_OF_STOCK' || s.status === 'LOW_STOCK' || (s.quantity !== null && s.quantity < 10),
    );

    // 6. Overdue follow-ups
    let overdueMchReminders: any[] = [];
    try {
      if ((this.prisma as any).mchReminder) {
        overdueMchReminders = await (this.prisma as any).mchReminder.findMany({
          where: {
            status: { in: ['FAILED', 'PENDING'] },
            reminderType: { in: ['VACCINATION_OVERDUE', 'ANC_OVERDUE'] },
          },
          take: 50,
          orderBy: { eventDate: 'desc' },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
                phone: true,
                village: true,
              },
            },
            child: {
              select: {
                id: true,
                name: true,
                dateOfBirth: true,
              },
            },
          },
        });
      }
    } catch (e) {
      this.logger.warn('Could not query mchReminders', e);
    }

    return {
      facility: {
        id: facility.id,
        name: facility.name,
        type: facility.type,
        district: facility.district,
        village: facility.village,
      },
      metrics: {
        consultations: {
          total: totalAppointments,
          completed: completedAppointments,
        },
        referrals: {
          total: incomingReferrals,
          pending: pendingReferrals,
          completed: completedReferrals,
        },
        highRiskCases: {
          total: highRiskAppointments.length,
          appointments: highRiskAppointments.length,
          mchHighRiskMothers: 0,
        },
        diagnosticOrders: {
          total: totalDiagnosticOrders,
          pending: pendingDiagnosticOrders,
          completed: completedDiagnosticOrders,
        },
        medicineInventory: {
          totalItems: allStocks.length,
          available: availableCount,
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          shortages: lowStockCount + outOfStockCount,
        },
        overdueFollowUps: {
          total: overdueMchReminders.length,
        },
      },
      inventory: allStocks,
      details: {
        consultations: recentAppointments,
        referrals: allReferrals,
        highRiskCases: highRiskAppointments,
        diagnosticOrders,
        medicineShortages,
        overdueFollowUps: overdueMchReminders,
      },
    };
  }
}
