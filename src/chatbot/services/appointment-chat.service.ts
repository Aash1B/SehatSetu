import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { ChatIntent, ChatCard, PendingAction, SlotInfo, CardAction } from '../types/chatbot.types';
import { ConversationService } from './conversation.service';
import { DoctorsService } from '../../doctors/doctors.service';
import { DoctorService } from '../../doctor/doctor.service';
import { AppointmentsService } from '../../appointments/appointments.service';

const MAX_SLOTS = 8;
const PENDING_ACTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface AvailabilityResult {
  cards: ChatCard[];
  suggestedReplies: string[];
  message: string;
}

interface AppointmentActionResult {
  cards: ChatCard[];
  suggestedReplies: string[];
  message: string;
}

interface BookingResult {
  pendingConfirmation: boolean;
  cards: ChatCard[];
  suggestedReplies: string[];
  message: string;
}

interface CancellationResult {
  pendingConfirmation: boolean;
  cards: ChatCard[];
  suggestedReplies: string[];
  message: string;
}

interface RescheduleResult {
  pendingConfirmation: boolean;
  cards: ChatCard[];
  suggestedReplies: string[];
  message: string;
}

@Injectable()
export class AppointmentChatService {
  private readonly logger = new Logger(AppointmentChatService.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly doctorsService: DoctorsService,
    private readonly doctorService: DoctorService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  private formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseTimeStr(timeStr: string): Date {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) {
      throw new Error(`Unable to parse time: ${timeStr}`);
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    const d = new Date();
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  private formatTime12(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }

  private parseWorkingHours(workingHours: string): { start: Date; end: Date } {
    const parts = workingHours.split(' - ');
    if (parts.length !== 2) {
      throw new Error(`Unable to parse working hours: ${workingHours}`);
    }
    return { start: this.parseTimeStr(parts[0]), end: this.parseTimeStr(parts[1]) };
  }

  private generateSlotsForDate(
    availability: any,
    targetDate: Date,
    bookedSlots: Record<string, string[]>,
  ): SlotInfo[] {
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySlot = (availability.slots || []).find((s: any) => s.day === dayOfWeek);
    if (!daySlot || !daySlot.isWorking) {
      return [];
    }

    const slotDuration = availability.slotDurationMinutes || 30;
    const { start: workStart, end: workEnd } = this.parseWorkingHours(daySlot.workingHours);

    let breakStart: Date | null = null;
    let breakEnd: Date | null = null;
    if (daySlot.breakTime && daySlot.breakTime !== 'None' && daySlot.breakTime !== '-') {
      try {
        const bp = daySlot.breakTime.split(' - ');
        if (bp.length === 2) {
          breakStart = this.parseTimeStr(bp[0]);
          breakEnd = this.parseTimeStr(bp[1]);
        }
      } catch {
        // ignore malformed break time
      }
    }

    const dateKey = this.formatDateKey(targetDate);
    const booked = bookedSlots[dateKey] || [];

    const slots: SlotInfo[] = [];
    const current = new Date(targetDate);
    current.setHours(workStart.getHours(), workStart.getMinutes(), 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(workEnd.getHours(), workEnd.getMinutes(), 0, 0);

    const now = new Date();

    while (current.getTime() + slotDuration * 60 * 1000 <= endDate.getTime()) {
      const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

      const inBreak =
        breakStart && breakEnd &&
        current.getHours() === breakStart.getHours() &&
        current.getMinutes() === breakStart.getMinutes() &&
        slotEnd.getHours() === breakEnd.getHours() &&
        slotEnd.getMinutes() === breakEnd.getMinutes();

      if (!inBreak) {
        const timeStr = this.formatTime12(current);

        if (!booked.includes(timeStr)) {
          const isPast =
            dateKey === this.formatDateKey(now) &&
            slotEnd.getTime() <= now.getTime();

          if (!isPast) {
            slots.push({
              startTime: timeStr,
              endTime: this.formatTime12(slotEnd),
              displayTime: timeStr,
              mode: 'ONLINE',
            });
          }
        }
      }

      current.setTime(current.getTime() + slotDuration * 60 * 1000);
    }

    return slots;
  }

  private filterByTimeOfDay(slots: SlotInfo[], preference: string | undefined): SlotInfo[] {
    if (!preference) return slots;
    const pref = preference.toLowerCase();

    return slots.filter((s) => {
      const match = s.displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return true;
      let h = parseInt(match[1], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;

      if (['morning', 'am'].includes(pref)) return h < 12;
      if (['afternoon', 'pm', 'day'].includes(pref)) return h >= 12 && h < 17;
      if (['evening', 'night', 'late'].includes(pref)) return h >= 17;
      return true;
    });
  }

  async getAvailability(params: {
    doctorId?: string;
    specialty?: string;
    datePreference?: string;
    timePreference?: string;
    conversationId?: string;
  }): Promise<AvailabilityResult> {
    const { doctorId, specialty, datePreference, timePreference, conversationId } = params;
    const suggestedReplies: string[] = [];

    let effectiveSpecialty = specialty;
    let effectiveDoctorId = doctorId;

    if (!effectiveDoctorId && !effectiveSpecialty) {
      return {
        cards: [],
        suggestedReplies: ['General Physician', 'Cardiologist', 'Neurologist'],
        message: 'Which doctor or specialty would you like to check availability for?',
      };
    }

    let doctorIds: string[] = [];

    if (effectiveDoctorId) {
      doctorIds = [effectiveDoctorId];
    } else if (effectiveSpecialty) {
      const allDoctors = await this.doctorsService.findAll();
      const filtered = allDoctors.filter((d: any) => {
        const matchesSpecialty = (d.specialty || '').toLowerCase().includes(effectiveSpecialty!.toLowerCase());
        const isActive = d.isActive !== false;
        const isVerified = d.isVerified !== false;
        return matchesSpecialty && isActive && isVerified;
      });

      if (filtered.length === 0) {
        return {
          cards: [],
          suggestedReplies: ['Try another specialty', 'Search all doctors', 'Nearby hospitals'],
          message: `No ${effectiveSpecialty} doctors are currently available in the directory.`,
        };
      }

      doctorIds = filtered.slice(0, 3).map((d: any) => d.doctorId || d.id);
    }

    const targetDate = this.resolveTargetDate(datePreference);
    if (!targetDate) {
      return {
        cards: [],
        suggestedReplies: ['Today', 'Tomorrow', 'Next available slot'],
        message: 'I could not understand that date. Please try: today, tomorrow, or a specific date.',
      };
    }

    const cards: ChatCard[] = [];
    const dateStr = this.formatDateKey(targetDate);

    for (const dId of doctorIds) {
      try {
        const doctor = await this.doctorService.getProfile(dId);
        if (!doctor.isActive || !doctor.isVerified) {
          continue;
        }

        const availability = await this.doctorService.getAvailability(dId);
        const slots = this.generateSlotsForDate(availability, targetDate, availability.bookedSlots || {});

        const filtered = this.filterByTimeOfDay(slots, timePreference);
        const limited = filtered.slice(0, MAX_SLOTS);

        if (limited.length === 0) {
          continue;
        }

        const doctorName = doctor.name || doctor.user?.fullName || 'Doctor';
        const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

        cards.push({
          type: 'availability',
          title: displayName,
          subtitle: [doctor.specialty, doctor.fee || `₹${doctor.consultationFee || 500}`].filter(Boolean).join(' • '),
          doctorId: dId,
          doctorName: displayName,
          specialty: doctor.specialty || 'General Physician',
          date: dateStr,
          slots: limited,
          actions: [
            { type: 'SELECT_SLOT', label: 'Choose a slot', value: dId },
            { type: 'VIEW_SLOTS', label: 'View all slots', value: dId },
          ],
        });
      } catch (e) {
        this.logger.warn(`Could not get availability for doctor ${dId}: ${e}`);
        continue;
      }
    }

    if (cards.length === 0) {
      suggestedReplies.push('Check next available date', 'Show similar doctors', 'Search another specialty');
      if (effectiveSpecialty) {
        suggestedReplies.push(`Find ${effectiveSpecialty}`);
      }
      return {
        cards: [],
        suggestedReplies,
        message: `No available slots found for ${effectiveSpecialty || 'the selected doctor'} on ${dateStr}. Would you like to check another date or specialty?`,
      };
    }

    suggestedReplies.push('Book appointment', 'My appointments', 'Find a doctor');

    return {
      cards,
      suggestedReplies,
      message: `Here are available slots for ${dateStr}:`,
    };
  }

  private resolveTargetDate(datePreference?: string): Date | null {
    if (!datePreference) {
      return new Date();
    }

    const normalized = datePreference.toLowerCase().trim();

    if (normalized === 'today') {
      return new Date();
    }
    if (normalized === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (normalized === 'next available' || normalized === 'next') {
      return new Date();
    }

    const parsed = Date.parse(datePreference);
    if (!isNaN(parsed)) {
      const d = new Date(parsed);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const dateMatch = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dateMatch) {
      const d = new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[1], 10) - 1, parseInt(dateMatch[2], 10));
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  }

  async getAppointmentsForCurrentUser(
    userId: string,
    role: string,
    filter?: 'upcoming' | 'today' | 'completed' | 'cancelled',
  ): Promise<AppointmentActionResult> {
    if (!userId || role !== 'PATIENT') {
      return {
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to view your appointments.',
      };
    }

    try {
      const appointments = await this.appointmentsService.getAppointmentsForUser(userId, role);
      const now = new Date();
      const todayKey = this.formatDateKey(now);

      const filtered = appointments.filter((app: any) => {
        const status = (app.status || '').toUpperCase();
        const scheduledAt = app.scheduledAt ? new Date(app.scheduledAt) : null;
        const appDateKey = scheduledAt ? this.formatDateKey(scheduledAt) : '';

        if (filter === 'upcoming') {
          return scheduledAt && scheduledAt > now && status !== 'CANCELLED' && status !== 'COMPLETED';
        }
        if (filter === 'today') {
          return appDateKey === todayKey;
        }
        if (filter === 'completed') {
          return status === 'COMPLETED';
        }
        if (filter === 'cancelled') {
          return status === 'CANCELLED';
        }
        return true;
      });

      if (filtered.length === 0) {
        const messages: Record<string, string> = {
          upcoming: 'You have no upcoming appointments.',
          today: 'You have no appointments scheduled for today.',
          completed: 'You have no completed appointments.',
          cancelled: 'You have no cancelled appointments.',
        };
        return {
          cards: [],
          suggestedReplies: ['Upcoming appointments', 'Book appointment', 'Find a doctor'],
          message: messages[filter || ''] || 'You have no appointments.',
        };
      }

      const cards: ChatCard[] = filtered.map((app: any) => {
        const scheduledAt = app.scheduledAt ? new Date(app.scheduledAt) : null;
        const dateStr = scheduledAt ? this.formatDateKey(scheduledAt) : app.date || '';
        const timeStr = app.timeSlot || (scheduledAt ? this.formatTime12(scheduledAt) : '');
        const doctorName = app.doctor?.name || app.doctor?.user?.fullName || 'Doctor';
        const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
        const status = app.status || 'SCHEDULED';

        const actions: CardAction[] = [
          { type: 'VIEW_DETAILS', label: 'View details', value: app.id },
        ];

        const statusUpper = status.toUpperCase();
        if (statusUpper === 'SCHEDULED' || statusUpper === 'WAITING') {
          actions.push(
            { type: 'CANCEL_APPOINTMENT', label: 'Cancel appointment', value: app.id },
            { type: 'RESCHEDULE_APPOINTMENT', label: 'Reschedule', value: app.id },
          );
        }
        if (statusUpper === 'SCHEDULED' || statusUpper === 'WAITING' || statusUpper === 'IN_PROGRESS') {
          actions.push({ type: 'JOIN_CONSULTATION', label: 'Join consultation', value: app.id });
        }

        return {
          type: 'appointment',
          title: `${displayName} • ${app.doctor?.specialty || 'Consultation'}`,
          subtitle: `${dateStr} at ${timeStr} • ${statusUpper}`,
          appointmentId: app.id,
          doctorId: app.doctor?.id,
          doctorName: displayName,
          specialty: app.doctor?.specialty || 'General Physician',
          date: dateStr,
          time: timeStr,
          status: statusUpper,
          consultationMode: app.consultMode || undefined,
          actions,
        };
      });

      return {
        cards,
        suggestedReplies: ['Upcoming appointments', 'Book appointment', 'My appointments'],
        message: `You have ${filtered.length} appointment${filtered.length > 1 ? 's' : ''}.`,
      };
    } catch (e) {
      this.logger.error(`Error fetching appointments: ${e}`);
      return {
        cards: [],
        suggestedReplies: ['My appointments', 'Book appointment'],
        message: 'Unable to retrieve your appointments at this time.',
      };
    }
  }

  async prepareBooking(params: {
    doctorId?: string;
    date?: string;
    timeSlot?: string;
    userId?: string;
    role?: string;
    conversationId: string;
  }): Promise<BookingResult> {
    const { doctorId, date, timeSlot, userId, role, conversationId } = params;
    const suggestedReplies: string[] = ['My appointments', 'Cancel', 'Find a doctor'];

    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to book an appointment.',
      };
    }

    if (!doctorId || !date || !timeSlot) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['Available tomorrow morning', 'Book with Dr. Sharma', 'Next available slot'],
        message: 'To book an appointment, I need a doctor, date, and time. Please select a time slot first.',
      };
    }

    try {
      const doctor = await this.doctorService.getProfile(doctorId);
      if (!doctor) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['Find a doctor', 'Available doctors'],
          message: 'Doctor not found. Please select a different doctor.',
        };
      }

      const doctorName = doctor.name || doctor.user?.fullName || 'Doctor';
      const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

      const availability = await this.doctorService.getAvailability(doctorId);
      const targetDate = this.resolveTargetDate(date);
      if (!targetDate) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['Today', 'Tomorrow'],
          message: 'Please provide a valid date (e.g., today, tomorrow, or a specific date).',
        };
      }

      const slots = this.generateSlotsForDate(availability, targetDate, availability.bookedSlots || {});
      const timeSlotMatch = slots.find((s) => s.startTime === timeSlot || s.displayTime === timeSlot);
      if (!timeSlotMatch) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['Available tomorrow morning', 'Next available slot'],
          message: 'That time slot is no longer available. Please choose another time.',
        };
      }

      const fee = doctor.fee || `₹${doctor.consultationFee || 500}`;

      const pendingAction: PendingAction = {
        type: 'BOOK_APPOINTMENT',
        doctorId,
        slot: timeSlotMatch,
        date,
        expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
      };

      await this.conversationService.setPendingAction(conversationId, pendingAction);

      suggestedReplies.push('Confirm booking', 'Cancel');

      return {
        pendingConfirmation: true,
        cards: [
          {
            type: 'confirmation',
            title: `Confirm booking with ${displayName}`,
            subtitle: `${this.formatDateKey(targetDate)} at ${timeSlotMatch.displayTime} • ${fee}`,
            doctorId,
            doctorName: displayName,
            specialty: doctor.specialty || 'General Physician',
            date: this.formatDateKey(targetDate),
            time: timeSlotMatch.displayTime,
            mode: 'ONLINE',
            fee,
            actionType: 'BOOK_APPOINTMENT',
            actions: [
              { type: 'CONFIRM', label: 'Confirm booking', value: 'confirm' },
              { type: 'CANCEL_ACTION', label: 'Cancel', value: 'cancel' },
            ],
          },
        ],
        suggestedReplies,
        message: `Booking with ${displayName} on ${this.formatDateKey(targetDate)} at ${timeSlotMatch.displayTime}. Please confirm to proceed.`,
      };
    } catch (e) {
      this.logger.error(`Error preparing booking: ${e}`);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies,
        message: 'Unable to prepare booking at this time. Please try again.',
      };
    }
  }

  async confirmBooking(
    pendingAction: PendingAction | null,
    userId: string,
    role: string,
    conversationId: string,
  ): Promise<BookingResult> {
    if (!pendingAction || pendingAction.type !== 'BOOK_APPOINTMENT') {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['Book appointment', 'Find a doctor'],
        message: 'No pending booking found. Please select a doctor and time slot to book an appointment.',
      };
    }

    if (pendingAction.expiresAt && pendingAction.expiresAt.getTime() < Date.now()) {
      await this.conversationService.clearPendingAction(conversationId);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['Book appointment', 'Check availability'],
        message: 'Your booking session expired. Please select a time slot again.',
      };
    }

    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to book an appointment.',
      };
    }

    const { doctorId, slot, date } = pendingAction;
    if (!doctorId || !slot || !date) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['Book appointment', 'Check availability'],
        message: 'Booking information is incomplete. Please select a time slot again.',
      };
    }

    try {
      const availability = await this.doctorService.getAvailability(doctorId);
      const targetDate = this.resolveTargetDate(date);
      if (!targetDate) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['Book appointment', 'Check availability'],
          message: 'Invalid date for booking. Please try again.',
        };
      }

      const slots = this.generateSlotsForDate(availability, targetDate, availability.bookedSlots || {});
      const slotStillAvailable = slots.some(
        (s) => s.startTime === slot.startTime && s.displayTime === slot.displayTime,
      );

      if (!slotStillAvailable) {
        await this.conversationService.clearPendingAction(conversationId);
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['Check availability', 'Available tomorrow', 'Find a doctor'],
          message: 'The selected time slot is no longer available. Please choose another time.',
        };
      }

      const result = await this.appointmentsService.createAppointment(
        {
          doctorId,
          date: this.formatDateKey(targetDate),
          timeSlot: slot.startTime,
          consultMode: 'VIDEO',
          urgency: 'ROUTINE',
          emailRemindersEnabled: true,
        },
        userId,
      );

      await this.conversationService.clearPendingAction(conversationId);

      let displayName = 'the doctor';
      let specialty = '';
      try {
        const doctor = await this.doctorService.getProfile(result.doctorId);
        const doctorName = doctor.name || doctor.user?.fullName || 'Doctor';
        displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
        specialty = doctor.specialty || '';
      } catch {
        this.logger.warn(`Could not resolve doctor name for ${result.doctorId}`);
      }

      const dateStr = result.date || this.formatDateKey(targetDate);
      const timeStr = result.timeSlot || slot.displayTime;

      return {
        pendingConfirmation: false,
        cards: [
          {
            type: 'success',
            title: 'Appointment booked successfully!',
            subtitle: `${displayName} on ${dateStr} at ${timeStr}`,
            appointmentId: result.id,
            doctorId: result.doctorId,
            doctorName: displayName,
            specialty: specialty || undefined,
            date: dateStr,
            time: timeStr,
            status: result.status,
            consultationMode: result.consultMode || undefined,
            actions: [
              { type: 'VIEW_DETAILS', label: 'View appointment', value: result.id },
              { type: 'VIEW_APPOINTMENTS', label: 'View all appointments', value: 'all' },
            ],
          },
        ],
        suggestedReplies: ['My appointments', 'Book another', 'Find a doctor'],
        message: `Your appointment with ${displayName} is confirmed for ${dateStr} at ${timeStr}.`,
      };
    } catch (e) {
      await this.conversationService.clearPendingAction(conversationId);
      this.logger.error(`Error confirming booking: ${e}`);

      let message = 'Failed to book appointment. Please try again.';
      let suggested = ['Check availability', 'Find a doctor'];

      if (e instanceof ConflictException) {
        message = 'This time slot was just booked by someone else. Please select another available time.';
        suggested = ['Check availability', 'Available tomorrow', 'Find a doctor'];
      } else if (e instanceof BadRequestException) {
        message = 'Unable to complete booking: invalid request. Please check your details and try again.';
      } else if (e instanceof NotFoundException) {
        message = 'Doctor not found. Please select a different doctor.';
      }

      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: suggested,
        message,
      };
    }
  }

  async prepareCancellation(
    appointmentId: string | undefined,
    userId: string | undefined,
    role: string | undefined,
    conversationId: string,
  ): Promise<CancellationResult> {
    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to manage appointments.',
      };
    }

    if (!appointmentId) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments', 'Upcoming appointments'],
        message: 'Please specify which appointment you would like to cancel.',
      };
    }

    try {
      const appointment = await this.appointmentsService.getAppointmentForUser(appointmentId, userId, role!);
      const status = (appointment.status || '').toUpperCase();

      const scheduledAt = appointment.scheduledAt ? new Date(appointment.scheduledAt) : null;
      const dateStr = scheduledAt ? this.formatDateKey(scheduledAt) : appointment.date || '';
      const timeStr = appointment.timeSlot || (scheduledAt ? this.formatTime12(scheduledAt) : '');
      const doctorName = appointment.doctor?.name || appointment.doctor?.user?.fullName || 'Doctor';
      const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

      if (status === 'COMPLETED' || status === 'CANCELLED') {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['My appointments', 'Upcoming appointments'],
          message: 'This appointment has already been completed or cancelled and cannot be changed.',
        };
      }

      const pendingAction: PendingAction = {
        type: 'CANCEL_APPOINTMENT',
        appointmentId,
        expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
      };

      await this.conversationService.setPendingAction(conversationId, pendingAction);

      return {
        pendingConfirmation: true,
        cards: [
          {
            type: 'confirmation',
            title: `Cancel appointment with ${displayName}?`,
            subtitle: `${dateStr} at ${timeStr} • ${status}`,
            appointmentId,
            actionType: 'CANCEL_APPOINTMENT',
            actions: [
              { type: 'CONFIRM', label: 'Yes, cancel', value: 'confirm' },
              { type: 'CANCEL_ACTION', label: 'No, keep it', value: 'cancel' },
            ],
          },
        ],
        suggestedReplies: ['Confirm', 'Yes, cancel', 'No, keep it'],
        message: `Are you sure you want to cancel your appointment with ${displayName} on ${dateStr} at ${timeStr}?`,
      };
    } catch (e) {
      if (e instanceof NotFoundException) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['My appointments', 'Upcoming appointments'],
          message: 'Appointment not found. Please check the appointment ID and try again.',
        };
      }
      this.logger.error(`Error preparing cancellation: ${e}`);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Unable to process cancellation at this time.',
      };
    }
  }

  async confirmCancellation(
    pendingAction: PendingAction | null,
    userId: string,
    role: string,
    conversationId: string,
  ): Promise<CancellationResult> {
    if (!pendingAction || pendingAction.type !== 'CANCEL_APPOINTMENT') {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments', 'Upcoming appointments'],
        message: 'No pending cancellation. Please select an appointment to cancel.',
      };
    }

    if (pendingAction.expiresAt && pendingAction.expiresAt.getTime() < Date.now()) {
      await this.conversationService.clearPendingAction(conversationId);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Your cancellation session expired. Please try again.',
      };
    }

    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to cancel an appointment.',
      };
    }

    const { appointmentId } = pendingAction;
    if (!appointmentId) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Appointment information is incomplete. Please try again.',
      };
    }

    try {
      await this.appointmentsService.cancelAppointment(appointmentId, userId, role);
      await this.conversationService.clearPendingAction(conversationId);

      return {
        pendingConfirmation: false,
        cards: [
          {
            type: 'success',
            title: 'Appointment cancelled',
            subtitle: 'You will receive a confirmation email shortly.',
            appointmentId,
            actions: [
              { type: 'VIEW_DETAILS', label: 'View my appointments', value: 'all' },
              { type: 'BOOK_APPOINTMENT', label: 'Book another', value: 'book' },
            ],
          },
        ],
        suggestedReplies: ['My appointments', 'Book another', 'Find a doctor'],
        message: 'Your appointment has been successfully cancelled.',
      };
    } catch (e) {
      await this.conversationService.clearPendingAction(conversationId);
      this.logger.error(`Error confirming cancellation: ${e}`);

      let message = 'Unable to cancel appointment. Please try again.';
      if (e instanceof NotFoundException) {
        message = 'Appointment not found.';
      } else if (e instanceof BadRequestException) {
        message = 'This appointment cannot be cancelled (already completed or cancelled).';
      }

      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments', 'Upcoming appointments'],
        message,
      };
    }
  }

  async prepareReschedule(
    appointmentId: string | undefined,
    userId: string | undefined,
    role: string | undefined,
  ): Promise<RescheduleResult> {
    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to reschedule an appointment.',
      };
    }

    if (!appointmentId) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments', 'Upcoming appointments'],
        message: 'Please specify which appointment you would like to reschedule.',
      };
    }

    try {
      const appointment = await this.appointmentsService.getAppointmentForUser(appointmentId, userId, role);
      const status = (appointment.status || '').toUpperCase();

      if (status === 'COMPLETED' || status === 'CANCELLED') {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['My appointments', 'Upcoming appointments'],
          message: 'Completed or cancelled appointments cannot be rescheduled.',
        };
      }

      const doctorId = appointment.doctorId;
      const availability = await this.doctorService.getAvailability(doctorId);
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = this.formatDateKey(tomorrow);

      const slots = this.generateSlotsForDate(availability, tomorrow, availability.bookedSlots || {});
      const limited = slots.slice(0, MAX_SLOTS);

      const doctorName = appointment.doctor?.name || appointment.doctor?.user?.fullName || 'Doctor';
      const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;

      const suggestedReplies: string[] = [];
      if (limited.length > 0) {
        suggestedReplies.push(...limited.slice(0, 3).map((s) => `${dateStr} at ${s.displayTime}`));
      }
      suggestedReplies.push('Cancel', 'My appointments');

      return {
        pendingConfirmation: false,
        cards: [
          {
            type: 'availability',
            title: `${displayName} — Available tomorrow`,
            subtitle: dateStr,
            doctorId,
            doctorName: displayName,
            specialty: appointment.doctor?.specialty || 'General Physician',
            date: dateStr,
            slots: limited,
            actions: [
              { type: 'SELECT_SLOT', label: 'Choose a slot', value: `${appointmentId}` },
              { type: 'VIEW_SLOTS', label: 'View all slots', value: `${appointmentId}` },
            ],
          },
        ],
        suggestedReplies,
        message: `Please select a new time slot for your rescheduled appointment with ${displayName}:`,
      };
    } catch (e) {
      if (e instanceof NotFoundException) {
        return {
          pendingConfirmation: false,
          cards: [],
          suggestedReplies: ['My appointments', 'Upcoming appointments'],
          message: 'Appointment not found. Please check the appointment ID and try again.',
        };
      }
      this.logger.error(`Error preparing reschedule: ${e}`);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Unable to process reschedule at this time.',
      };
    }
  }

  async confirmReschedule(
    pendingAction: PendingAction | null,
    userId: string,
    role: string,
    conversationId: string,
    newDate?: string,
    newTimeSlot?: string,
  ): Promise<BookingResult> {
    if (!pendingAction || pendingAction.type !== 'RESCHEDULE_APPOINTMENT') {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments', 'Upcoming appointments'],
        message: 'No pending reschedule found. Please select an appointment and time slot to reschedule.',
      };
    }

    if (pendingAction.expiresAt && pendingAction.expiresAt.getTime() < Date.now()) {
      await this.conversationService.clearPendingAction(conversationId);
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Your reschedule session expired. Please try again.',
      };
    }

    if (!userId || role !== 'PATIENT') {
      return {
        pendingConfirmation: false,
        cards: [this.createLoginRequiredCard()],
        suggestedReplies: ['Sign in', 'Create account', 'Continue browsing doctors'],
        message: 'You need to sign in to reschedule an appointment.',
      };
    }

    const { appointmentId, doctorId } = pendingAction;
    if (!appointmentId || !doctorId) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Reschedule information is incomplete. Please try again.',
      };
    }

    const effectiveDate = newDate || pendingAction.date;
    const effectiveSlot = newTimeSlot || pendingAction.slot?.startTime;

    if (!effectiveDate || !effectiveSlot) {
      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: ['My appointments'],
        message: 'Please provide a new date and time to reschedule.',
      };
    }

    try {
      const result = await this.appointmentsService.rescheduleAppointment(
        appointmentId,
        {
          doctorId,
          date: effectiveDate,
          timeSlot: effectiveSlot,
        },
        userId,
        role,
      );

      await this.conversationService.clearPendingAction(conversationId);

      const doctorName = result.doctor?.name || result.doctor?.user?.fullName || 'Doctor';
      const displayName = doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`;
      const dateStr = result.date || '';
      const timeStr = result.timeSlot || effectiveSlot;

      return {
        pendingConfirmation: false,
        cards: [
          {
            type: 'success',
            title: 'Appointment rescheduled!',
            subtitle: `${displayName} on ${dateStr} at ${timeStr}`,
            appointmentId: result.id,
            doctorId: result.doctorId,
            doctorName: displayName,
            specialty: result.doctor?.specialty || undefined,
            date: dateStr,
            time: timeStr,
            status: result.status,
            consultationMode: result.consultMode || undefined,
            actions: [
              { type: 'VIEW_DETAILS', label: 'View appointment', value: result.id },
              { type: 'VIEW_APPOINTMENTS', label: 'View all appointments', value: 'all' },
            ],
          },
        ],
        suggestedReplies: ['My appointments', 'Book another', 'Find a doctor'],
        message: `Your appointment with ${displayName} has been rescheduled to ${dateStr} at ${timeStr}.`,
      };
    } catch (e) {
      await this.conversationService.clearPendingAction(conversationId);
      this.logger.error(`Error confirming reschedule: ${e}`);

      let message = 'Failed to reschedule appointment. Please try again.';
      let suggested = ['My appointments', 'Check availability'];

      if (e instanceof ConflictException) {
        message = 'The requested time slot is already taken. Please choose another available time.';
        suggested = ['Check availability', 'Available tomorrow', 'My appointments'];
      } else if (e instanceof BadRequestException) {
        message = 'Unable to reschedule: this appointment may already be completed or cancelled.';
      } else if (e instanceof NotFoundException) {
        message = 'Appointment not found.';
      }

      return {
        pendingConfirmation: false,
        cards: [],
        suggestedReplies: suggested,
        message,
      };
    }
  }

  private createLoginRequiredCard(): ChatCard {
    return {
      type: 'login-required',
      title: 'Login required',
      subtitle: 'You need to sign in to access this feature',
      message: 'Sign in to your account to book, check, cancel, or reschedule appointments.',
      actions: [
        { type: 'SIGN_IN', label: 'Sign in', value: 'sign_in' },
        { type: 'CREATE_ACCOUNT', label: 'Create account', value: 'create_account' },
        { type: 'CONTINUE_BROWSING', label: 'Continue browsing doctors', value: 'browse_doctors' },
      ],
    };
  }
}
