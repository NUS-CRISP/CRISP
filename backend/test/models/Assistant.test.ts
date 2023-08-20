import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import AssistantModel, { Assistant } from '../../models/Assistant';


describe('Assistant Model and Schema', () => {
  it('should create a valid assistant document', async () => {
    const validAssistantData = {
      name: 'John Doe',
      email: 'john@example.com',
      isHeadAssistant: true
    };

    const assistantDoc = new AssistantModel(validAssistantData);
    expect(assistantDoc.name).toBe('John Doe');
    expect(assistantDoc.email).toBe('john@example.com');
  });


  it('should require name, email and isHeadAssistant fields', async () => {
    const invalidAssistantData: Partial<Assistant> = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    try {
      await new AssistantModel(invalidAssistantData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.isHeadAssistant).toBeDefined();
    }
  });
});