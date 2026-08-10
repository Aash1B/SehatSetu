import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LabTestGuidanceService } from '../services/lab-test-guidance.service';

describe('LabTestGuidanceService', () => {
  const service = new LabTestGuidanceService();

  test('should provide diabetes guidance', () => {
    const result = service.getGuidance('I am concerned about diabetes');
    assert.ok(result.message.toLowerCase().includes('hba1c'));
    assert.ok(result.message.toLowerCase().includes('glucose'));
  });

  test('should provide thyroid guidance', () => {
    const result = service.getGuidance('I have a thyroid concern');
    assert.ok(result.message.toLowerCase().includes('tsh'));
    assert.ok(result.message.toLowerCase().includes('thyroid'));
  });

  test('should provide anaemia guidance', () => {
    const result = service.getGuidance('I am worried about anaemia');
    assert.ok(result.message.toLowerCase().includes('cbc'));
    assert.ok(result.message.toLowerCase().includes('ferritin'));
  });

  test('should provide anemia guidance (American spelling)', () => {
    const result = service.getGuidance('I think I have anemia');
    assert.ok(result.message.toLowerCase().includes('cbc'));
  });

  test('should provide fracture/X-ray guidance', () => {
    const result = service.getGuidance('I may have a fracture');
    assert.ok(result.message.toLowerCase().includes('x-ray'));
  });

  test('should provide fever guidance', () => {
    const result = service.getGuidance('I have persistent fever');
    assert.ok(result.message.toLowerCase().includes('cbc'));
  });

  test('should include cautious wording about consulting a doctor', () => {
    const result = service.getGuidance('I have diabetes');
    assert.ok(result.message.includes('doctor'));
  });

  test('should say tests may commonly be discussed', () => {
    const result = service.getGuidance('thyroid concern');
    assert.ok(
      result.message.includes('may consider') ||
        result.message.includes('commonly discussed'),
    );
  });

  test('should not contain phrases that diagnose', () => {
    const result = service.getGuidance('I have diabetes');
    assert.equal(result.message.includes('you have diabetes'), false);
    assert.equal(result.message.includes('you need a biopsy'), false);
  });

  test('should not prescribe medicines', () => {
    const result = service.getGuidance('I have diabetes');
    assert.equal(result.message.toLowerCase().includes('take this medicine'), false);
    assert.equal(result.message.toLowerCase().includes('prescribed'), false);
  });

  test('should return cautious message for unknown concern', () => {
    const result = service.getGuidance('I need guidance about random things');
    assert.ok(result.message.includes('doctor'));
    assert.ok(result.message.includes('confirm'));
  });

  test('should not say a test is mandatory', () => {
    const result = service.getGuidance('I have diabetes');
    assert.equal(result.message.includes('must'), false);
    assert.equal(result.message.includes('mandatory'), false);
  });

  test('should provide neurological/MRI guidance', () => {
    const result = service.getGuidance('I have neurological concerns');
    assert.ok(
      result.message.includes('MRI') || result.message.includes('CT scan'),
    );
  });

  test('should provide headache guidance', () => {
    const result = service.getGuidance('I have a persistent headache');
    assert.ok(
      result.message.includes('MRI') || result.message.includes('CT scan'),
    );
  });

  test('should handle empty message', () => {
    const result = service.getGuidance('');
    assert.ok(result.message.length > 0);
  });

  test('should return suggested replies', () => {
    const result = service.getGuidance('diabetes');
    assert.ok(result.suggestedReplies.length > 0);
  });
});
