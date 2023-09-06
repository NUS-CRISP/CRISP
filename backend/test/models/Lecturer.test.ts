import mongoose, { Types } from 'mongoose';
import { describe, expect, it} from 'vitest'
import LecturerModel, { Lecturer } from '../../models/Lecturer';


describe('Lecturer Model and Schema', () => {
  it('should create a valid lecturer document', async () => {
    const validLecturerData = {
      id: 'e0123456',
      name: 'John Doe',
      email: 'john@example.com',
      isCourseCoordinator: true
    };

    const lecturerDoc = new LecturerModel(validLecturerData);
    expect(lecturerDoc.id).toBe('e0123456');
    expect(lecturerDoc.name).toBe('John Doe');
    expect(lecturerDoc.email).toBe('john@example.com');
  });


  it('should require name, email, id and isCourseCoordinator fields', async () => {
    const invalidLecturerData: Partial<Lecturer> = {
      id: 'e0123456',
      name: 'John Doe',
      email: 'john@example.com'
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