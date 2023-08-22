import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import LecturerModel, { Lecturer } from '../../models/Lecturer';


describe('Lecturer Model and Schema', () => {
  it('should create a valid lecturer document', async () => {
    const validLecturerData = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456',
      course_student: [],
      course_teaching:[],
      isCourseCoordinator: true
    };

    const lecturerDoc = new LecturerModel(validLecturerData);
    expect(lecturerDoc.name).toBe('John Doe');
    expect(lecturerDoc.email).toBe('john@example.com');
    expect(lecturerDoc.id).toBe('e0123456');
  });


  it('should require name, email, id and isCourseCoordinator fields', async () => {
    const invalidLecturerData: Partial<Lecturer> = {
      name: 'John Doe',
      email: 'john@example.com',
      id: 'e0123456'
    };

    try {
      await new LecturerModel(invalidLecturerData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.isCourseCoordinator).toBeDefined();
    }
  });
});