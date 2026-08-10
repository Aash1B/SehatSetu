import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HospitalChatService } from '../services/hospital-chat.service';
import { BadGatewayException } from '@nestjs/common';

const mockHospitalsService = (): any => ({
  findNearby: () => Promise.resolve([]),
});

describe('HospitalChatService', () => {
  let service: HospitalChatService;
  let hospitalsService: any;

  beforeEach(() => {
    hospitalsService = mockHospitalsService();
    service = new HospitalChatService(hospitalsService);
  });

  test('should return hospital cards for valid coordinates', async () => {
    hospitalsService.findNearby = () =>
      Promise.resolve([
        {
          id: 'h1',
          name: 'City Hospital',
          address: '123 Main St',
          latitude: 28.6139,
          longitude: 77.209,
          phone: '+91-11-12345678',
          openNow: true,
        },
      ]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 1);
    const card = result.cards[0];
    assert.equal(card.type, 'hospital');
    assert.equal(card.hospitalId, 'h1');
    assert.equal(card.title, 'City Hospital');
    assert.equal(card.subtitle, '123 Main St');
  });

  test('should reject invalid coordinates', async () => {
    const result = await service.searchNearbyHospitals({
      latitude: 999,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].type, 'location-required');
    assert.ok(result.message.includes('location'));
  });

  test('should reject NaN coordinates', async () => {
    const result = await service.searchNearbyHospitals({
      latitude: NaN,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].type, 'location-required');
  });

  test('should return location-required response when location is missing', async () => {
    const result = await service.searchNearbyHospitals({});

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].type, 'location-required');
    assert.ok(
      result.cards[0].actions?.some(
        (a) => a.value === 'use_browser_location',
      ),
    );
  });

  test('should return location-required when only latitude is provided', async () => {
    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
    });

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].type, 'location-required');
  });

  test('should sort results by distance', async () => {
    hospitalsService.findNearby = () =>
      Promise.resolve([
        {
          id: 'h1',
          name: 'Far Hospital',
          address: 'Far away',
          latitude: 28.7,
          longitude: 77.3,
          phone: '+91-11-111',
          openNow: true,
        },
        {
          id: 'h2',
          name: 'Near Hospital',
          address: 'Close by',
          latitude: 28.614,
          longitude: 77.21,
          phone: '+91-11-222',
          openNow: true,
        },
      ]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 2);
    const dist1 = result.cards[0].distance;
    const dist2 = result.cards[1].distance;
    assert.ok(dist1 !== undefined && dist2 !== undefined);
    assert.ok(dist1! <= dist2!);
  });

  test('should enforce result limit', async () => {
    const manyHospitals = Array.from({ length: 15 }, (_, i) => ({
      id: `h${i}`,
      name: `Hospital ${i}`,
      address: `Address ${i}`,
      latitude: 28.6139 + i * 0.001,
      longitude: 77.209 + i * 0.001,
      phone: `+91-11-${i}`,
      openNow: true,
    }));

    hospitalsService.findNearby = () => Promise.resolve(manyHospitals);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.ok(result.cards.length <= 10);
  });

  test('should handle unavailable provider safely', async () => {
    hospitalsService.findNearby = () => {
      throw new BadGatewayException('Google Places API error: quota exceeded');
    };

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('unavailable'));
  });

  test('should handle no hospitals found', async () => {
    hospitalsService.findNearby = () => Promise.resolve([]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('No hospitals'));
  });

  test('should not invent Government or Private type', async () => {
    hospitalsService.findNearby = () =>
      Promise.resolve([
        {
          id: 'h1',
          name: 'Test Hospital',
          address: 'Test Address',
          latitude: 28.6139,
          longitude: 77.209,
          phone: '+91-11-12345678',
          openNow: true,
        },
      ]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    const card = result.cards[0];
    assert.equal(card.hospitalType, undefined);
  });

  test('should include directions URL and call actions', async () => {
    hospitalsService.findNearby = () =>
      Promise.resolve([
        {
          id: 'h1',
          name: 'Test Hospital',
          address: 'Test Address',
          latitude: 28.6139,
          longitude: 77.209,
          phone: '+91-11-12345678',
          openNow: true,
        },
      ]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    const card = result.cards[0];
    assert.ok(
      card.actions?.some((a) => a.label === 'Get directions'),
    );
    assert.ok(
      card.actions?.some((a) => a.label === 'Call hospital'),
    );
  });

  test('should handle provider throwing generic error', async () => {
    hospitalsService.findNearby = () => {
      throw new Error('Connection timeout');
    };

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('Unable to retrieve'));
  });

  test('should set openStatus correctly based on openNow field', async () => {
    hospitalsService.findNearby = () =>
      Promise.resolve([
        {
          id: 'h-open',
          name: 'Open Hospital',
          address: 'Address',
          latitude: 28.61,
          longitude: 77.2,
          phone: '+91-11-1',
          openNow: true,
        },
        {
          id: 'h-closed',
          name: 'Closed Hospital',
          address: 'Address',
          latitude: 28.62,
          longitude: 77.21,
          phone: '+91-11-2',
          openNow: false,
        },
        {
          id: 'h-unknown',
          name: 'Unknown Hospital',
          address: 'Address',
          latitude: 28.63,
          longitude: 77.22,
        },
      ]);

    const result = await service.searchNearbyHospitals({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 3);
    const statuses = result.cards.map((c) => c.status).sort();
    assert.deepEqual(statuses, ['CLOSED', 'OPEN', 'UNKNOWN']);
  });
});
