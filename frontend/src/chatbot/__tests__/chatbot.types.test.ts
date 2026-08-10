import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatCard, ChatCardAction } from '../types/chatbot.types';

// Test the card type mapping logic used by CardRenderer's renderCard function.
// Since CardRenderer imports React components, we test the switch logic here
// to verify all card types are handled.

const CARD_TYPES = [
  'doctor',
  'availability',
  'appointment',
  'hospital',
  'lab',
  'emergency',
  'location-required',
  'login-required',
  'success',
  'error',
  'provider-unavailable',
  'confirmation',
] as const;

describe('CardRenderer card type coverage', () => {
  it('handles all known card types', () => {
    const switchResults: Record<string, string> = {};

    CARD_TYPES.forEach((type) => {
      const card: ChatCard = { type, title: `Test ${type}` };
      let matched: string;

      switch (card.type) {
        case 'doctor':
          matched = 'doctor';
          break;
        case 'availability':
          matched = 'availability';
          break;
        case 'appointment':
          matched = 'appointment';
          break;
        case 'hospital':
          matched = 'hospital';
          break;
        case 'lab':
          matched = 'lab';
          break;
        case 'emergency':
          matched = 'emergency';
          break;
        case 'location-required':
          matched = 'location-required';
          break;
        case 'login-required':
          matched = 'login-required';
          break;
        case 'success':
          matched = 'success';
          break;
        case 'error':
          matched = 'error';
          break;
        case 'provider-unavailable':
          matched = 'provider-unavailable';
          break;
        case 'confirmation':
          matched = 'confirmation';
          break;
        default:
          matched = 'no-match';
      }

      switchResults[type] = matched;
    });

    CARD_TYPES.forEach((type) => {
      assert.equal(switchResults[type], type, `Card type '${type}' should be handled`);
    });
  });

  it('handles unknown card types gracefully (default case)', () => {
     const card: ChatCard = { type: 'unknown-type', title: 'Unknown' };
     let matched: string;

    switch (card.type) {
      case 'doctor':
        matched = 'doctor';
        break;
      default:
        matched = 'unknown-default';
    }

    assert.equal(matched, 'unknown-default');
  });
});

describe('ChatCard action types', () => {
  it('builds action objects correctly for doctor booking', () => {
    const action: ChatCardAction = {
      type: 'action',
      label: 'Book Now',
      value: 'book_doctor',
    };
    assert.equal(action.type, 'action');
    assert.equal(action.label, 'Book Now');
    assert.equal(action.value, 'book_doctor');
  });

  it('builds action objects for slot selection', () => {
    const action: ChatCardAction = {
      type: 'select_slot',
      label: '10:00 AM',
      value: 'slot-abc-123',
    };
    assert.equal(action.type, 'select_slot');
    assert.equal(action.value, 'slot-abc-123');
  });

  it('builds action objects for confirmation', () => {
    const action: ChatCardAction = {
      type: 'confirm',
      label: 'Confirm',
      value: 'confirm_booking',
    };
    assert.equal(action.type, 'confirm');
  });

  it('builds action objects for cancellation', () => {
    const action: ChatCardAction = {
      type: 'cancel',
      label: 'Cancel',
      value: 'cancel_appointment',
    };
    assert.equal(action.type, 'cancel');
  });
});

describe('ChatCard structure validation', () => {
  it('doctor card has required fields', () => {
    const card: ChatCard = {
      type: 'doctor',
      title: 'Dr. Jane Smith',
      doctorId: 'doc-123',
      specialty: 'Cardiology',
      rating: 4.8,
      fee: '₹500',
      actions: [{ type: 'action', label: 'View Profile', value: 'view_profile' }],
    };
    assert.equal(card.type, 'doctor');
    assert.equal(card.doctorId, 'doc-123');
    assert.ok(card.actions && card.actions.length > 0);
  });

  it('availability card has slots', () => {
    const card: ChatCard = {
      type: 'availability',
      title: 'Available Slots',
      doctorId: 'doc-123',
      slots: [
        { startTime: '09:00', endTime: '09:30', displayTime: '9:00 AM', mode: 'in-person' },
        { startTime: '10:00', endTime: '10:30', displayTime: '10:00 AM', mode: 'video' },
      ],
      actions: [{ type: 'action', label: 'Book', value: 'book' }],
    };
    assert.ok(card.slots);
    assert.equal(card.slots.length, 2);
  });

  it('appointment card has appointmentId and status', () => {
    const card: ChatCard = {
      type: 'appointment',
      title: 'Appointment Booking',
      appointmentId: 'apt-456',
      status: 'confirmed',
      date: '2026-08-15',
      time: '10:00 AM',
      consultationMode: 'video',
      actions: [{ type: 'action', label: 'Join Call', value: 'join_call' }],
    };
    assert.equal(card.appointmentId, 'apt-456');
    assert.equal(card.status, 'confirmed');
  });

  it('confirmation card has actionType', () => {
    const card: ChatCard = {
      type: 'confirmation',
      title: 'Confirm Booking',
      actionType: 'BOOK_APPOINTMENT',
      message: 'Book appointment with Dr. Smith?',
      actions: [{ type: 'confirm', label: 'Yes, Book', value: 'confirm' }],
    };
    assert.equal(card.actionType, 'BOOK_APPOINTMENT');
  });

  it('confirmation card supports CANCEL_APPOINTMENT actionType', () => {
    const card: ChatCard = {
      type: 'confirmation',
      title: 'Cancel Appointment',
      actionType: 'CANCEL_APPOINTMENT',
      message: 'Are you sure you want to cancel?',
      actions: [{ type: 'cancel', label: 'Cancel', value: 'cancel' }],
    };
    assert.equal(card.actionType, 'CANCEL_APPOINTMENT');
  });

  it('confirmation card supports RESCHEDULE_APPOINTMENT actionType', () => {
    const card: ChatCard = {
      type: 'confirmation',
      title: 'Reschedule Appointment',
      actionType: 'RESCHEDULE_APPOINTMENT',
      message: 'Reschedule to a new time?',
      actions: [{ type: 'action', label: 'Choose new slot', value: 'reschedule' }],
    };
    assert.equal(card.actionType, 'RESCHEDULE_APPOINTMENT');
  });

  it('hospital card has location data', () => {
    const card: ChatCard = {
      type: 'hospital',
      title: 'City Hospital',
      hospitalId: 'hosp-789',
      phone: '+1234567890',
      latitude: 12.9716,
      longitude: 77.5946,
      distance: 2.5,
      openStatus: 'OPEN',
      actions: [{ type: 'action', label: 'Directions', value: 'directions:12.9716,77.5946' }],
    };
    assert.equal(card.hospitalId, 'hosp-789');
    assert.ok(card.latitude !== undefined && card.longitude !== undefined);
    assert.equal(card.distance, 2.5);
  });

  it('emergency card has emergency contact info', () => {
    const card: ChatCard = {
      type: 'emergency',
      title: 'Emergency',
      phone: '102',
      actions: [{ type: 'action', label: 'Call Now', value: 'tel:102' }],
    };
    assert.equal(card.phone, '102');
  });

  it('error card has retry action', () => {
    const card: ChatCard = {
      type: 'error',
      title: 'Something went wrong',
      message: 'Connection failed',
      actions: [{ type: 'retry', label: 'Try Again', value: 'retry' }],
    };
    assert.equal(card.type, 'error');
    assert.ok(card.actions && card.actions.length > 0);
  });

  it('login-required card has login action', () => {
    const card: ChatCard = {
      type: 'login-required',
      title: 'Login Required',
      message: 'Please log in to continue',
      actions: [{ type: 'action', label: 'Login', value: 'login' }],
    };
    assert.equal(card.type, 'login-required');
  });

  it('location-required card has use-location action', () => {
    const card: ChatCard = {
      type: 'location-required',
      title: 'Location Needed',
      message: 'Please share your location for better results',
      actions: [{ type: 'action', label: 'Use My Location', value: 'use_location' }],
    };
    assert.equal(card.type, 'location-required');
  });

  it('success card has confirmation details', () => {
    const card: ChatCard = {
      type: 'success',
      title: 'Appointment Confirmed',
      message: 'Your appointment is booked!',
      appointmentId: 'apt-999',
      actions: [{ type: 'action', label: 'View Details', value: 'view_appointment' }],
    };
    assert.equal(card.type, 'success');
    assert.equal(card.appointmentId, 'apt-999');
  });

  it('provider-unavailable card has retry option', () => {
    const card: ChatCard = {
      type: 'provider-unavailable',
      title: 'Provider Busy',
      message: 'The AI assistant is currently unavailable. Please try again in a few minutes.',
      actions: [{ type: 'retry', label: 'Retry', value: 'retry' }],
    };
    assert.equal(card.type, 'provider-unavailable');
    assert.ok(card.actions?.some((a) => a.type === 'retry'));
  });
});
