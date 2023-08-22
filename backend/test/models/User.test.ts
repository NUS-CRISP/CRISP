import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import UserModel, { User } from '../../models/User';


describe('User Model and Schema', () => {
  it('should create a valid user document', async () => {
    const validUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456',
      course_student: [],
      course_teaching:[]
    };

    const userDoc = new UserModel(validUserData);
    expect(userDoc.name).toBe('John Doe');
    expect(userDoc.email).toBe('john@example.com');
    expect(userDoc.id).toBe('e0123456');
  });


  it('should require name, email and id fields', async () => {
    const invalidUserData: Partial<User> = {
      name: 'John Doe',
    };

    try {
      await new UserModel(invalidUserData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.id).toBeDefined();
    }
  });
});