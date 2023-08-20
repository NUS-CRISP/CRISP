import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import StudentModel, { Student } from '../../models/Student';


describe('Student Model and Schema', () => {
  it('should create a valid lecturer document', async () => {
    const validStudentData = {
      name: 'John Doe',
      email: 'john@example.com',
      githubUsername: "johndoe123"
    };

    const studentDoc = new StudentModel(validStudentData);
    expect(studentDoc.name).toBe('John Doe');
    expect(studentDoc.email).toBe('john@example.com');
  });


  it('should require name, email and githubUsername fields', async () => {
    const invalidStudentData: Partial<Student> = {
      name: 'John Doe',
      email: 'john@example.com'
    };

    try {
      await new StudentModel(invalidStudentData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.githubUsername).toBeDefined();
    }
  });
});