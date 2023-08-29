import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import StudentModel, { Student } from '../../models/Student';


describe('Student Model and Schema', () => {
  it('should create a valid lecturer document', async () => {
    const validStudentData = {
      _id: 'e0123456',
      name: 'John Doe',
      email: 'john@example.com',
      gitHandle: 'johndoe123'
    };

    const studentDoc = new StudentModel(validStudentData);
    expect(studentDoc._id).toBe('e0123456');
    expect(studentDoc.name).toBe('John Doe');
    expect(studentDoc.email).toBe('john@example.com');
    expect(studentDoc.gitHandle).toBe('johndoe123');
  });


  it('should require name, email, id and gitHandle fields', async () => {
    const invalidStudentData: Partial<Student> = {
      _id: 'e0123456',
      name: 'John Doe',
      email: 'john@example.com',
    };

    try {
      await new StudentModel(invalidStudentData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.gitHandle).toBeDefined();
    }
  });
});