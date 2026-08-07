/**
 * SehatSetu System-Wide Consultation Time Window Utility
 * Enforces that patients (and doctors) can only join video calls 
 * within the scheduled appointment time window using local laptop time.
 */

export interface AppointmentTimeStatus {
  isJoinable: boolean;
  status: 'UPCOMING' | 'JOIN_NOW' | 'COMPLETED' | 'EXPIRED';
  label: string;
  sublabel: string;
  minutesUntilStart: number;
  scheduledDateTime: Date | null;
}

// Temporary QA switch: keep appointment-specific rooms and authorization,
// but allow the assigned doctor and patient to join outside the scheduled window.
export const TEMP_DISABLE_CONSULTATION_TIME_WINDOW = true;

/**
 * Parses appointment date and time strings or ISO timestamps into a JavaScript Date object (Laptop System Time)
 */
export function parseAppointmentDateTime(dateStr?: string, timeSlotStr?: string, scheduledAtStr?: string): Date | null {
  if (scheduledAtStr) {
    const parsed = new Date(scheduledAtStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  if (!dateStr) return null;

  const now = new Date();
  const targetDate = new Date();

  const lowerDate = dateStr.toLowerCase().trim();
  if (lowerDate.includes('today')) {
    // Keep today's date
  } else if (lowerDate.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      targetDate.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }

  // Parse time slot (e.g. "10:00 AM", "04:30 PM", "14:00")
  if (timeSlotStr && typeof timeSlotStr === 'string') {
    const timeMatch = timeSlotStr.match(/(\d+):?(\d*)\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      targetDate.setHours(hours, minutes, 0, 0);
    }
  }

  return targetDate;
}

/**
 * Evaluates whether an appointment is joinable using laptop system time.
 * Policy: Joinable 10 minutes before scheduled start time up to 30 minutes after start time.
 */
export function getAppointmentTimeStatus(
  scheduledAtInput?: string | Date,
  dateStr?: string,
  timeSlotStr?: string,
  durationMinutes: number = 30
): AppointmentTimeStatus {
  if (TEMP_DISABLE_CONSULTATION_TIME_WINDOW) {
    return {
      isJoinable: true,
      status: 'JOIN_NOW',
      label: 'Join Consultation Now',
      sublabel: 'Available for testing',
      minutesUntilStart: 0,
      scheduledDateTime: null,
    };
  }

  let apptDate: Date | null = null;

  if (scheduledAtInput instanceof Date) {
    apptDate = scheduledAtInput;
  } else if (typeof scheduledAtInput === 'string' && scheduledAtInput.trim()) {
    apptDate = parseAppointmentDateTime(undefined, undefined, scheduledAtInput);
  }

  if (!apptDate) {
    apptDate = parseAppointmentDateTime(dateStr, timeSlotStr);
  }

  if (!apptDate || isNaN(apptDate.getTime())) {
    // Fallback if date is indeterminate
    return {
      isJoinable: true,
      status: 'JOIN_NOW',
      label: 'Join Consultation',
      sublabel: 'Available',
      minutesUntilStart: 0,
      scheduledDateTime: null,
    };
  }

  const now = new Date(); // Uses laptop system time
  const nowMs = now.getTime();
  const apptMs = apptDate.getTime();

  // Allow joining 10 minutes prior to appointment start time
  const joinWindowStartMs = apptMs - (10 * 60 * 1000);
  // Allow joining up to (scheduledAt + durationMinutes + 15 mins buffer)
  const joinWindowEndMs = apptMs + ((durationMinutes + 15) * 60 * 1000);

  const minutesUntilStart = Math.ceil((apptMs - nowMs) / (1000 * 60));

  const timeFormatted = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (nowMs < joinWindowStartMs) {
    // Too early
    let timeSublabel = `Opens 10 mins before ${timeFormatted}`;
    if (minutesUntilStart > 60) {
      const hours = Math.floor(minutesUntilStart / 60);
      timeSublabel = `Starts in ${hours}h ${minutesUntilStart % 60}m`;
    } else if (minutesUntilStart > 0) {
      timeSublabel = `Opens in ${minutesUntilStart - 10} mins`;
    }

    return {
      isJoinable: false,
      status: 'UPCOMING',
      label: `Scheduled for ${timeFormatted}`,
      sublabel: timeSublabel,
      minutesUntilStart,
      scheduledDateTime: apptDate,
    };
  } else if (nowMs >= joinWindowStartMs && nowMs <= joinWindowEndMs) {
    // Within join window
    return {
      isJoinable: true,
      status: 'JOIN_NOW',
      label: 'Join Consultation Now',
      sublabel: 'Live Room Active',
      minutesUntilStart: 0,
      scheduledDateTime: apptDate,
    };
  } else {
    // Past join window
    return {
      isJoinable: false,
      status: 'EXPIRED',
      label: 'Consultation Ended',
      sublabel: `Scheduled time passed (${timeFormatted})`,
      minutesUntilStart: 0,
      scheduledDateTime: apptDate,
    };
  }
}
