import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import BasePersonModel, { BasePerson } from '../../models/BasePerson';


describe('BasePerson Model and Schema', () => {
  it('should create a valid basePerson document', async () => {
    const validPersonData = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const basePersonDoc = new BasePersonModel(validPersonData);
    expect(basePersonDoc.name).toBe('John Doe');
    expect(basePersonDoc.email).toBe('john@example.com');
  });


  it('should require name and email fields', async () => {
    const invalidPersonData: Partial<BasePerson> = {
      name: 'John Doe',
    };

    try {
      await new BasePersonModel(invalidPersonData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.email).toBeDefined();
    }
  });
});