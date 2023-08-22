import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import AssistantModel, { Assistant } from '../../models/Assistant';


describe('Assistant Model and Schema', () => {
  it('should create a valid assistant document', async () => {
    const validAssistantData = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456',
      course_student: [],
      course_teaching:[],
      isHeadAssistant: true
    };

    const assistantDoc = new AssistantModel(validAssistantData);
    expect(assistantDoc.name).toBe('John Doe');
    expect(assistantDoc.email).toBe('john@example.com');
    expect(assistantDoc.id).toBe('e0123456');
  });


  it('should require name, email, id and isHeadAssistant fields', async () => {
    const invalidAssistantData: Partial<Assistant> = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456'
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