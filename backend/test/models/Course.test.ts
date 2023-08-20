import mongoose from 'mongoose';
import { describe, expect, it} from 'vitest'
import CourseModel, { Course } from '../../models/Course';

describe('Course Model and Schema', () => {
  it('should create a valid course document', async () => {
    const validCourseData = {
      courseName: 'Software Engineering Project',
      courseCode: 'CS3203',
      lecturers: [],
      assistants: [],
      students: [],
    };

    const courseDoc = new CourseModel(validCourseData);
    expect(courseDoc.courseName).toBe('Software Engineering Project');
    expect(courseDoc.courseCode).toBe('CS3203');
  });

  it('should require courseName and courseCode fields', async () => {
    const invalidCourseData: Partial<Course> = {
      courseName: 'Software Engineering Project'
    };

    try {
      await new CourseModel(invalidCourseData).validate();
    } catch (error) {
      expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
      const validationError = error as mongoose.Error.ValidationError;
      expect(validationError.errors.courseCode).toBeDefined();
    }
  });
});