/**
 * TEMPORARY DEVICE-TO-DEVICE MEETING TEST MODE.
 *
 * Set this to false after LiveKit verification. That single change restores
 * scheduled-time enforcement and appointment-specific room IDs.
 */
export const TEMP_CONSULTATION_TEST_MODE = false;

const TEMP_TEST_ROOM_ID = 'sehatsetu-device-test-room';

export function getConsultationRoomId(appointmentId: string): string {
  return TEMP_CONSULTATION_TEST_MODE ? TEMP_TEST_ROOM_ID : appointmentId;
}
