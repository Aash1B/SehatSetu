import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LabChatService } from '../services/lab-chat.service';
import { LabProvider } from '../providers/lab-provider.interface';

const mockLabProvider = (): LabProvider => ({
  findNearby: () => Promise.resolve([]),
});

describe('LabChatService', () => {
  let service: LabChatService;

  beforeEach(() => {
    service = new LabChatService();
  });

  test('should return real provider results converted to lab cards', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () =>
      Promise.resolve([
        {
          labId: 'lab1',
          name: 'City Diagnostics',
          address: '456 Lab Street',
          latitude: 28.61,
          longitude: 77.21,
          phone: '+91-11-98765432',
          openingHours: '8:00 AM - 8:00 PM',
          homeCollection: true,
          availableTests: ['CBC', 'HbA1c'],
        },
      ]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 1);
    const card = result.cards[0];
    assert.equal(card.type, 'lab');
    assert.equal(card.labId, 'lab1');
    assert.equal(card.title, 'City Diagnostics');
  });

  test('should return missing provider returns honest unavailable response', async () => {
    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('not currently configured'));
  });

  test('should not return any fake labs when provider returns empty', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () => Promise.resolve([]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('No diagnostic labs'));
  });

  test('should not invent test availability', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () =>
      Promise.resolve([
        {
          labId: 'lab1',
          name: 'City Diagnostics',
          address: '456 Lab Street',
          latitude: 28.61,
          longitude: 77.21,
          phone: '+91-11-98765432',
        },
      ]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    const card = result.cards[0];
    assert.equal(card.actions && card.actions.some((a) => a.label === 'Call lab'), true);
  });

  test('should return location-required when coordinates are missing', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);

    const result = await service.searchNearbyLabs({});

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('location'));
  });

  test('should reject invalid coordinates', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);

    const result = await service.searchNearbyLabs({
      latitude: 999,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('location'));
  });

  test('should sort labs by distance', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () =>
      Promise.resolve([
        {
          labId: 'lab-far',
          name: 'Far Lab',
          address: 'Far',
          latitude: 28.7,
          longitude: 77.3,
        },
        {
          labId: 'lab-near',
          name: 'Near Lab',
          address: 'Near',
          latitude: 28.614,
          longitude: 77.21,
        },
      ]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 2);
    const dist1 = result.cards[0].distance;
    const dist2 = result.cards[1].distance;
    assert.ok(dist1 !== undefined && dist2 !== undefined);
    assert.ok(dist1! <= dist2!);
  });

  test('should handle provider throwing an error', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () => {
      throw new Error('Provider down');
    };

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 0);
    assert.ok(result.message.includes('Unable to retrieve'));
  });

  test('should filter out labs beyond max distance', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () =>
      Promise.resolve([
        {
          labId: 'lab1',
          name: 'Nearby Lab',
          address: 'Near',
          latitude: 28.614,
          longitude: 77.21,
        },
        {
          labId: 'lab2',
          name: 'Very Far Lab',
          address: 'Far',
          latitude: 1.2,
          longitude: 1.2,
        },
      ]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].labId, 'lab1');
  });

  test('should include directions URL for labs with coordinates', async () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    provider.findNearby = () =>
      Promise.resolve([
        {
          labId: 'lab1',
          name: 'City Lab',
          address: '456 Lab Street',
          latitude: 28.61,
          longitude: 77.21,
          phone: '+91-11-98765432',
        },
      ]);

    const result = await service.searchNearbyLabs({
      latitude: 28.6139,
      longitude: 77.209,
    });

    const card = result.cards[0];
    assert.ok(
      card.actions?.some((a) => a.label === 'Get directions'),
    );
  });

  test('should getProviderInfo returns configured status', () => {
    const provider = mockLabProvider();
    service = new LabChatService(provider);
    const info = service.getProviderInfo();
    assert.equal(info.configured, true);
  });

  test('should getProviderInfo returns not configured when no provider', () => {
    service = new LabChatService();
    const info = service.getProviderInfo();
    assert.equal(info.configured, false);
  });
});
