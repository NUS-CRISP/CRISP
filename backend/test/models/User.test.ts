import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import UserModel, { User } from '../../models/User';


describe('User Model and Schema', () => {
  it('should create a valid user document', async () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const userDoc = new UserModel(validUserData);
    expect(userDoc.name).toBe('John Doe');
    expect(userDoc.email).toBe('john@example.com');
  });


  it('should require name and email fields', async () => {
    const invalidUserData: Partial<User> = {
      name: 'John Doe',
    };

    try {
      await new UserModel(invalidUserData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.email).toBeDefined();
    }
  });
});