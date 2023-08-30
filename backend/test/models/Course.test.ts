import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import CourseModel, { Course } from '../../models/Course';

describe('Course Model and Schema', () => {
  it('should create a valid course document', async () => {
    const validCourseData = {
      name: 'Software Engineering Project',
      code: 'CS3203',
      semester: '23/24/1',
      lecturers: [],
      assistants: [],
      students: [],
      teams: []
    };

    const courseDoc = new CourseModel(validCourseData);
    expect(courseDoc.name).toBe('Software Engineering Project');
    expect(courseDoc.code).toBe('CS3203');
    expect(courseDoc.semester).toBe('23/24/1');
  });

  it('should require courseName and courseCode fields', async () => {
    const invalidCourseData: Partial<Course> = {
      name: 'Software Engineering Project'
    };

    try {
      await new CourseModel(invalidCourseData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.courseCode).toBeDefined();
      expect(validationError.errors.semester).toBeDefined();
    }
  });
});