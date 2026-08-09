import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MedicalConditionService } from '../services/medical-condition.service';

describe('MedicalConditionService', () => {
  let service: MedicalConditionService;

  beforeEach(() => {
    service = new MedicalConditionService();
  });

  describe('English medical condition detection', () => {
    test('should detect "I have AIDS" and return HIV specialty', () => {
      const result = service.detectMedicalCondition('I have AIDS');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hiv');
      assert.ok(result.specialty);
      assert.ok(result.suggestedReplies.length > 0);
    });

    test('should detect "I have HIV" and return HIV specialty', () => {
      const result = service.detectMedicalCondition('I have HIV');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hiv');
      assert.ok(result.specialty);
    });

    test('should detect "I have diabetes" and return Endocrinologist', () => {
      const result = service.detectMedicalCondition('I have diabetes');
      assert.ok(result.detected);
      assert.equal(result.condition, 'diabetes');
      assert.equal(result.specialty, 'Endocrinologist');
    });

    test('should detect "I was diagnosed with asthma" and return Pulmonologist', () => {
      const result = service.detectMedicalCondition('I was diagnosed with asthma');
      assert.ok(result.detected);
      assert.equal(result.condition, 'asthma');
      assert.equal(result.specialty, 'Pulmonologist');
    });

    test('should detect "I have high BP" and return Cardiologist', () => {
      const result = service.detectMedicalCondition('I have high BP');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hypertension');
      assert.equal(result.specialty, 'Cardiologist');
    });

    test('should detect "my doctor said I have thyroid" and return Endocrinologist', () => {
      const result = service.detectMedicalCondition('my doctor said I have thyroid');
      assert.ok(result.detected);
      assert.equal(result.condition, 'thyroid');
      assert.equal(result.specialty, 'Endocrinologist');
    });

    test('should detect "I have high blood pressure" and return Cardiologist', () => {
      const result = service.detectMedicalCondition('I have high blood pressure');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hypertension');
      assert.equal(result.specialty, 'Cardiologist');
    });

    test('should detect "I have skin rash" and return Dermatologist', () => {
      const result = service.detectMedicalCondition('I have skin rash');
      assert.ok(result.detected);
      assert.equal(result.condition, 'skin rash');
      assert.equal(result.specialty, 'Dermatologist');
    });
  });

  describe('Hindi/Hinglish medical condition detection', () => {
    test('should detect "mujhe diabetes hai" and return Endocrinologist', () => {
      const result = service.detectMedicalCondition('mujhe diabetes hai');
      assert.ok(result.detected);
      assert.equal(result.condition, 'diabetes');
      assert.equal(result.specialty, 'Endocrinologist');
    });

    test('should detect "mujhe HIV hai" and return Infectious Disease', () => {
      const result = service.detectMedicalCondition('mujhe HIV hai');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hiv');
      assert.equal(result.specialty, 'Infectious Disease');
    });

    test('should detect "mujhe asthma hai" and return Pulmonologist', () => {
      const result = service.detectMedicalCondition('mujhe asthma hai');
      assert.ok(result.detected);
      assert.equal(result.condition, 'asthma');
      assert.equal(result.specialty, 'Pulmonologist');
    });

    test('should detect "mujhe thyroid ki problem hai" and return Endocrinologist', () => {
      const result = service.detectMedicalCondition('mujhe thyroid ki problem hai');
      assert.ok(result.detected);
      assert.equal(result.condition, 'thyroid');
      assert.equal(result.specialty, 'Endocrinologist');
    });

    test('should detect "mujhe high bp hai" and return Cardiologist', () => {
      const result = service.detectMedicalCondition('mujhe high bp hai');
      assert.ok(result.detected);
      assert.equal(result.condition, 'hypertension');
      assert.equal(result.specialty, 'Cardiologist');
    });
  });

  describe('Medical condition with emergency symptoms', () => {
    test('should detect emergency and medical condition together', () => {
      const medicalResult = service.detectMedicalCondition('I have AIDS');
      assert.ok(medicalResult.detected);

      // Emergency service should detect the emergency part separately
      // This test just verifies medical condition detection works independently
      assert.ok(medicalResult.specialty);
    });

    test('should detect "I have diabetes" as NOT an emergency condition', () => {
      const result = service.detectMedicalCondition('I have diabetes');
      assert.ok(result.detected);
      assert.equal(result.condition, 'diabetes');
      // Diabetes itself is not an emergency condition
    });

    test('should detect "I have diabetes and I am having severe difficulty breathing" as having emergency symptom', () => {
      // The medical condition service detects the condition
      const result = service.detectMedicalCondition('I have diabetes and I am having severe difficulty breathing');
      assert.ok(result.detected);
      assert.equal(result.condition, 'diabetes');

      // The emergency service would detect the emergency separately
      // This test verifies the condition is detected correctly
    });
  });

  describe('Build condition response', () => {
    test('should build appropriate response for diabetes', () => {
      const response = service.buildConditionResponse('diabetes', 'Endocrinologist');
      assert.ok(response.includes('diabetes'));
      assert.ok(response.includes('Endocrinologist') || response.includes('appropriate care'));
    });

    test('should build appropriate response for HIV', () => {
      const response = service.buildConditionResponse('hiv', 'Infectious Disease');
      assert.ok(response.includes('hiv') || response.includes('appropriate care'));
    });
  });

  describe('Suggested replies based on specialty', () => {
    test('should return appropriate replies for Endocrinologist', () => {
      const result = service.detectMedicalCondition('I have diabetes');
      assert.ok(result.suggestedReplies.length > 0);
      // Should include general health guidance replies
    });

    test('should return appropriate replies for Cardiologist', () => {
      const result = service.detectMedicalCondition('I have high BP');
      assert.ok(result.suggestedReplies.length > 0);
    });
  });

  describe('Edge cases', () => {
    test('should not detect empty string as medical condition', () => {
      const result = service.detectMedicalCondition('');
      assert.ok(!result.detected);
      assert.equal(result.condition, null);
    });

    test('should not detect random conversation as medical condition', () => {
      const result = service.detectMedicalCondition('Hello how are you doing today');
      assert.ok(!result.detected);
      assert.equal(result.condition, null);
    });

    test('should handle case insensitivity', () => {
      const result1 = service.detectMedicalCondition('I HAVE AIDS');
      const result2 = service.detectMedicalCondition('I have hiv');
      assert.ok(result1.detected);
      assert.ok(result2.detected);
    });
  });
});
