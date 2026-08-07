import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TIME_SLOTS = [
  { startTime: '09:00 AM', endTime: '09:15 AM' },
  { startTime: '09:15 AM', endTime: '09:30 AM' },
  { startTime: '09:30 AM', endTime: '09:45 AM' },
  { startTime: '09:45 AM', endTime: '10:00 AM' },
  { startTime: '10:00 AM', endTime: '10:15 AM' },
  { startTime: '10:15 AM', endTime: '10:30 AM' },
  { startTime: '10:30 AM', endTime: '10:45 AM' },
  { startTime: '10:45 AM', endTime: '11:00 AM' },
  { startTime: '11:00 AM', endTime: '11:15 AM' },
  { startTime: '11:15 AM', endTime: '11:30 AM' },
  { startTime: '11:30 AM', endTime: '11:45 AM' },
  { startTime: '11:45 AM', endTime: '12:00 PM' },
  { startTime: '12:00 PM', endTime: '12:15 PM' },
  { startTime: '12:15 PM', endTime: '12:30 PM' },
  { startTime: '12:30 PM', endTime: '12:45 PM' },
  { startTime: '12:45 PM', endTime: '01:00 PM' },
  { startTime: '02:00 PM', endTime: '02:15 PM' },
  { startTime: '02:15 PM', endTime: '02:30 PM' },
  { startTime: '02:30 PM', endTime: '02:45 PM' },
  { startTime: '02:45 PM', endTime: '03:00 PM' },
  { startTime: '03:00 PM', endTime: '03:15 PM' },
  { startTime: '03:15 PM', endTime: '03:30 PM' },
  { startTime: '03:30 PM', endTime: '03:45 PM' },
  { startTime: '03:45 PM', endTime: '04:00 PM' },
  { startTime: '04:00 PM', endTime: '04:15 PM' },
  { startTime: '04:15 PM', endTime: '04:30 PM' },
  { startTime: '04:30 PM', endTime: '04:45 PM' },
  { startTime: '04:45 PM', endTime: '05:00 PM' },
  { startTime: '05:00 PM', endTime: '05:15 PM' },
  { startTime: '05:15 PM', endTime: '05:30 PM' },
  { startTime: '05:30 PM', endTime: '05:45 PM' },
  { startTime: '05:45 PM', endTime: '06:00 PM' },
  { startTime: '06:00 PM', endTime: '06:15 PM' },
  { startTime: '06:15 PM', endTime: '06:30 PM' },
  { startTime: '06:30 PM', endTime: '06:45 PM' },
  { startTime: '06:45 PM', endTime: '07:00 PM' },
  { startTime: '07:00 PM', endTime: '07:15 PM' },
  { startTime: '07:15 PM', endTime: '07:30 PM' },
];

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetch available 15-minute time slots for a specific doctor and date.
   * If no slots exist in Supabase for that date yet, pre-generates explicit 15-minute slot rows.
   */
  async getSlotsByDoctorAndDate(doctorId: string, date: string) {
    // 1. Fetch existing slots from Supabase
    let slots = await this.prisma.slot.findMany({
      where: {
        doctorId,
        date,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 2. If no pre-generated slots exist for this date, insert standard 15-min slots
    if (!slots || slots.length === 0) {
      await this.prisma.slot.createMany({
        data: DEFAULT_TIME_SLOTS.map((s) => ({
          doctorId,
          date,
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'AVAILABLE' as const,
        })),
        skipDuplicates: true,
      });

      slots = await this.prisma.slot.findMany({
        where: {
          doctorId,
          date,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    return slots;
  }

  /**
   * Book a specific slot by slot ID
   */
  async bookSlot(slotId: string, appointmentId?: string) {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    return this.prisma.slot.update({
      where: { id: slotId },
      data: {
        status: 'BOOKED',
        appointmentId,
      },
    });
  }
}
