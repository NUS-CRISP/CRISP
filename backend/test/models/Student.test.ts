import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import StudentModel, { Student } from '../../models/Student';


describe('Student Model and Schema', () => {
  it('should create a valid lecturer document', async () => {
    const validStudentData = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456',
      course_student: [],
      course_teaching:[],
      githubUsername: 'johndoe123'
    };

    const studentDoc = new StudentModel(validStudentData);
    expect(studentDoc.name).toBe('John Doe');
    expect(studentDoc.email).toBe('john@example.com');
    expect(studentDoc.id).toBe('e0123456');
    expect(studentDoc.githubUsername).toBe('johndoe123');
  });


  it('should require name, email, id and githubUsername fields', async () => {
    const invalidStudentData: Partial<Student> = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456'
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