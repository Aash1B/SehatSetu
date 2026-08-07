import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DoctorChatService } from '../services/doctor-chat.service';
import { ChatIntent } from '../types/chatbot.types';

const mockDoctorsService = () => ({
  findAll: () => Promise.resolve([]),
});

describe('DoctorChatService', () => {
  let service: DoctorChatService;
  let doctorsService: ReturnType<typeof mockDoctorsService>;

  beforeEach(() => {
    doctorsService = mockDoctorsService();
    service = new DoctorChatService(doctorsService as any);
  });

  test('should be defined', () => {
    assert.ok(service);
  });

  test('should map fever to General Physician', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd1',
          name: 'Dr. Test',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.5,
          priorityScore: 100,
          fee: '₹500',
          consultationFee: 500,
          imageUrl: 'https://example.com/img.jpg',
          tags: ['English', 'Hindi'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('I have fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.specialty, 'General Physician');
    assert.ok(result.message.includes('General Physician'));
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].doctorId, 'd1');
    assert.equal(result.cards[0].name, 'Dr. Test');
  });

  test('should map migraine to Neurologist', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd2',
          name: 'Dr. Neuro',
          specialty: 'Neurologist',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '10+ Years Experience',
          rating: 4.8,
          priorityScore: 120,
          fee: '₹1200',
          consultationFee: 1200,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('I have migraines', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.specialty, 'Neurologist');
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].doctorId, 'd2');
  });

  test('should map rash to Dermatologist', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd3',
          name: 'Dr. Skin',
          specialty: 'Dermatologist',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '8+ Years Experience',
          rating: 4.6,
          priorityScore: 110,
          fee: '₹800',
          consultationFee: 800,
          imageUrl: '',
          tags: ['English', 'Hindi'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('I have a skin rash', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.specialty, 'Dermatologist');
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].doctorId, 'd3');
  });

  test('should map chest pain to Cardiologist via intent routing (emergency detection is handled by IntentRouterService)', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd-cardio',
          name: 'Dr. Heart',
          specialty: 'Cardiologist',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '12+ Years Experience',
          rating: 4.9,
          priorityScore: 130,
          fee: '₹1500',
          consultationFee: 1500,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('chest pain', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.specialty, 'Cardiologist');
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].doctorId, 'd-cardio');
  });

  test('should search explicit cardiologist', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd4',
          name: 'Dr. Heart',
          specialty: 'Cardiologist',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '12+ Years Experience',
          rating: 4.9,
          priorityScore: 130,
          fee: '₹1500',
          consultationFee: 1500,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('find a cardiologist', ChatIntent.DOCTOR_SEARCH);
    assert.equal(result.specialty, 'Cardiologist');
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].doctorId, 'd4');
  });

  test('should convert real DoctorService results to doctor cards', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd5',
          name: 'Dr. Real',
          specialty: 'Pediatrician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '7+ Years Experience',
          rating: 4.7,
          priorityScore: 115,
          fee: '₹600',
          consultationFee: 600,
          imageUrl: 'https://example.com/pediatrician.jpg',
          tags: ['English', 'Hindi', 'Marathi'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('child specialist', ChatIntent.DOCTOR_SEARCH);
    assert.equal(result.specialty, 'Pediatrician');
    assert.equal(result.cards.length, 1);
    const card = result.cards[0];
    assert.equal(card.type, 'doctor');
    assert.equal(card.doctorId, 'd5');
    assert.equal(card.name, 'Dr. Real');
    assert.equal(card.specialty, 'Pediatrician');
    assert.equal(card.profileImage, 'https://example.com/pediatrician.jpg');
    assert.equal(card.experience, '7+ Years Experience');
    assert.deepEqual(card.languages, ['English', 'Hindi', 'Marathi']);
    assert.equal(card.rating, 4.7);
    assert.equal(card.consultationFee, '₹600');
    assert.equal(card.consultationMode, 'Available');
    assert.ok(card.actions.some((a) => a.label === 'View profile'));
    assert.ok(card.actions.some((a) => a.label === 'Check availability'));
  });

  test('should exclude inactive doctors', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd6',
          name: 'Dr. Inactive',
          specialty: 'General Physician',
          isActive: false,
          isVerified: true,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.0,
          priorityScore: 50,
          fee: '₹400',
          consultationFee: 400,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 0);
  });

  test('should exclude unverified doctors', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd7',
          name: 'Dr. Unverified',
          specialty: 'General Physician',
          isActive: true,
          isVerified: false,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.0,
          priorityScore: 50,
          fee: '₹400',
          consultationFee: 400,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 0);
  });

  test('should return at most 5 results', async () => {
    const manyDoctors = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i}`,
      name: `Dr. ${i}`,
      specialty: 'General Physician',
      isActive: true,
      isVerified: true,
      profileCompleted: true,
      experience: '5+ Years Experience',
      rating: 4.0 + i * 0.1,
      priorityScore: 100 - i,
      fee: `₹${500 + i * 100}`,
      consultationFee: 500 + i * 100,
      imageUrl: '',
      tags: ['English'],
      availability: { status: 'Available' },
    }));

    doctorsService.findAll = () => Promise.resolve(manyDoctors);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.ok(result.cards.length <= 5);
  });

  test('should not fabricate doctors when no results found', async () => {
    doctorsService.findAll = () => Promise.resolve([]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('directory'));
    assert.ok(result.suggestedReplies.includes('Try another specialty'));
    assert.ok(result.suggestedReplies.includes('Search all doctors'));
  });

  test('should handle missing optional doctor fields safely', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd8',
          name: '',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: false,
          experience: '',
          rating: undefined,
          priorityScore: undefined,
          fee: '',
          consultationFee: undefined,
          imageUrl: '',
          tags: [],
          availability: {},
        },
      ]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].name, 'Dr. Doctor');
    assert.equal(result.cards[0].specialty, 'General Physician');
    assert.equal(result.cards[0].profileImage, undefined);
    assert.equal(result.cards[0].rating, undefined);
    assert.equal(result.cards[0].consultationFee, undefined);
  });

  test('should accept fallback specialty for follow-up context', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd9',
          name: 'Dr. Follow',
          specialty: 'Neurologist',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '6+ Years Experience',
          rating: 4.5,
          priorityScore: 100,
          fee: '₹900',
          consultationFee: 900,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const first = await service.searchDoctors('I have migraines', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(first.specialty, 'Neurologist');

    const second = await service.searchDoctors('show doctors', ChatIntent.DOCTOR_SEARCH, first.specialty);
    assert.equal(second.specialty, 'Neurologist');
    assert.equal(second.cards.length, 1);
  });

  test('should rank doctors with higher experience first when other factors equal', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd10',
          name: 'Dr. Junior',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.5,
          priorityScore: 100,
          fee: '₹500',
          consultationFee: 500,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
        {
          id: 'd11',
          name: 'Dr. Senior',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '20+ Years Experience',
          rating: 4.0,
          priorityScore: 100,
          fee: '₹2000',
          consultationFee: 2000,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 2);
    assert.equal(result.cards[0].doctorId, 'd11');
    assert.equal(result.cards[1].doctorId, 'd10');
  });

  test('should rank doctors with higher rating first when other factors equal', async () => {
    doctorsService.findAll = () =>
      Promise.resolve([
        {
          id: 'd14',
          name: 'Dr. LowRating',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.0,
          priorityScore: 100,
          fee: '₹500',
          consultationFee: 500,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
        {
          id: 'd15',
          name: 'Dr. HighRating',
          specialty: 'General Physician',
          isActive: true,
          isVerified: true,
          profileCompleted: true,
          experience: '5+ Years Experience',
          rating: 4.8,
          priorityScore: 100,
          fee: '₹500',
          consultationFee: 500,
          imageUrl: '',
          tags: ['English'],
          availability: { status: 'Available' },
        },
      ]);

    const result = await service.searchDoctors('fever', ChatIntent.DOCTOR_RECOMMENDATION);
    assert.equal(result.cards.length, 2);
    assert.equal(result.cards[0].doctorId, 'd15');
    assert.equal(result.cards[1].doctorId, 'd14');
  });
});
