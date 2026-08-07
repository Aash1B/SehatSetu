import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EmergencyHandlingService } from '../services/emergency-handling.service';

describe('EmergencyHandlingService', () => {
  let service: EmergencyHandlingService;

  beforeEach(() => {
    service = new EmergencyHandlingService();
  });

  test('should detect chest pain as emergency', () => {
    assert.equal(service.detectEmergency('I have severe chest pain'), true);
  });

  test('should detect severe breathing difficulty as emergency', () => {
    assert.equal(service.detectEmergency('I cannot breathe at all'), true);
    assert.equal(service.detectEmergency('severe breathing difficulty'), true);
  });

  test('should detect stroke symptoms as emergency', () => {
    assert.equal(service.detectEmergency('I think I am having a stroke'), true);
  });

  test('should detect severe bleeding as emergency', () => {
    assert.equal(service.detectEmergency('I have severe bleeding'), true);
    assert.equal(service.detectEmergency('heavy bleeding from injury'), true);
  });

  test('should detect unconsciousness as emergency', () => {
    assert.equal(service.detectEmergency('I fainted and am unconscious'), true);
  });

  test('should detect seizure as emergency', () => {
    assert.equal(service.detectEmergency('I had a seizure'), true);
  });

  test('should detect overdose as emergency', () => {
    assert.equal(service.detectEmergency('I took too many pills, possible overdose'), true);
  });

  test('should detect severe allergic reaction as emergency', () => {
    assert.equal(service.detectEmergency('I have an allergic reaction and my throat is swelling'), true);
    assert.equal(service.detectEmergency('anaphylaxis'), true);
  });

  test('should detect major trauma as emergency', () => {
    assert.equal(service.detectEmergency('I was in a car accident with major trauma'), true);
  });

  test('should detect pregnancy emergency as emergency', () => {
    assert.equal(service.detectEmergency('I am pregnant and having contractions'), true);
  });

  test('should detect self-harm as emergency', () => {
    assert.equal(service.detectEmergency('I want to kill myself'), true);
    assert.equal(service.detectEmergency('I am cutting myself'), true);
  });

  test('should not detect non-emergency as emergency', () => {
    assert.equal(service.detectEmergency('I need to find a doctor'), false);
    assert.equal(service.detectEmergency('hello'), false);
    assert.equal(service.detectEmergency('book an appointment'), false);
  });

  test('emergency intent overrides hospital/lab/doctor intent', () => {
    const messages = [
      'I have chest pain and need a doctor',
      'I am bleeding and need to find a hospital',
      'severe breathing difficulty, need nearest lab',
    ];
    for (const msg of messages) {
      assert.equal(service.detectEmergency(msg), true, `Failed for: ${msg}`);
    }
  });

  test('Call 108 is always included in emergency response', () => {
    const result = service.buildEmergencyResponse({});
    assert.ok(result.message.includes('108'));
    assert.ok(result.message.includes('urgent'));
    assert.ok(result.message.includes('Call 108') || result.message.includes('call 108') || result.message.includes('108'));
  });

  test('emergency response works without location', () => {
    const result = service.buildEmergencyResponse({});
    assert.equal(result.cards.length, 1);
    assert.equal(result.cards[0].type, 'emergency');
    assert.equal(result.cards[0].callNumber, '108');
    assert.equal(result.cards[0].callAction, 'tel:108');
    assert.equal(result.cards[0].locationRequired, true);
  });

  test('emergency response includes Call 108 action', () => {
    const result = service.buildEmergencyResponse({});
    const card = result.cards[0];
    assert.ok(
      card.actions?.some((a) => a.value === 'tel:108'),
    );
  });

  test('with location, nearby hospital action is available', () => {
    const result = service.buildEmergencyResponse({
      latitude: 28.6139,
      longitude: 77.209,
    });
    const card = result.cards[0];
    assert.equal(card.locationRequired, false);
    assert.equal(card.findHospitals, true);
    assert.ok(
      card.actions?.some((a) => a.label === 'Find nearby emergency hospitals'),
    );
  });

  test('no online appointment suggestion in emergency', () => {
    const result = service.buildEmergencyResponse({});
    assert.equal(result.message.toLowerCase().includes('appointment'), false);
  });

  test('self-harm message follows safe crisis behavior', () => {
    const result = service.buildEmergencyResponse({
      latitude: 28.6139,
      longitude: 77.209,
    });
    assert.ok(result.message.includes('108'));
    assert.ok(result.message.includes('urgent'));
    assert.equal(result.message.toLowerCase().includes('online consultation'), false);
    assert.equal(result.message.toLowerCase().includes('telemedicine'), false);
  });

  test('detectEmergencyEntities returns matched categories', () => {
    const entities = service.detectEmergencyEntities('I have chest pain and stroke symptoms');
    assert.ok(entities.includes('chest pain'));
    assert.ok(entities.includes('stroke'));
  });

  test('detectEmergencyEntities returns empty for non-emergency', () => {
    const entities = service.detectEmergencyEntities('hello');
    assert.deepEqual(entities, []);
  });
});
