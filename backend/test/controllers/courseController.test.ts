import { Request, Response } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
import {
  createCourse,
  deleteCourse,
  getCourses,
  getCourse,
  updateCourse,
} from '../../controllers/courseController';
import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';
import UserModel from '../../models/User';

describe('Course Controller', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  beforeEach(async () => {
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});
    await TeamSetModel.deleteMany({});
    await TeamModel.deleteMany({});
  });

  describe('createCourse', () => {
    it('should create a new course', async () => {
      const req: Partial<Request> = {
        body: { name: 'Test Course', code: 'TEST101', semester: 'Spring' },
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCourse(req as Request, res as Response);

      const createdCourse = await CourseModel.findOne({ name: 'Test Course' });
      expect(createdCourse).not.toBeNull();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Course',
          code: 'TEST101',
          semester: 'Spring',
        })
      );
    });

    it('should handle errors when creating a course', async () => {
      const req: Partial<Request> = { body: {} };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create course',
      });
    });
  });

  describe('getAllCourses', () => {
    it('should get all courses', async () => {
      // Mock the CourseModel.find() function to return an array of courses
      const mockCourses = [
        { name: 'Course 1', code: 'COURSE101', semester: 'Spring' },
        { name: 'Course 2', code: 'COURSE202', semester: 'Fall' },
      ];
      CourseModel.find = jest.fn().mockResolvedValue(mockCourses);

      const req: Partial<Request> = {};
      const res: Partial<Response> = {
        json: jest.fn(),
      };

      await getCourses(req as Request, res as Response);

      // Expect that the response JSON contains the array of courses
      expect(res.json).toHaveBeenCalledWith(mockCourses);
    });

    it('should handle errors when fetching courses', async () => {
      // Mock the CourseModel.find() function to throw an error
      CourseModel.find = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const req: Partial<Request> = {};
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCourses(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch courses',
      });
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getCourseById', () => {
    it('should get a single course by ID', async () => {
      const courseData = {
        name: 'Course 1',
        code: 'COURSE101',
        semester: 'Spring',
      };
      const newCourse = await CourseModel.create(courseData);

      const req: Partial<Request> = {
        params: { id: newCourse._id.toString() },
      };
      const res: Partial<Response> = {
        json: jest.fn(),
      };

      await getCourse(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining(courseData)
      );
    });

    it('should handle errors when fetching a course by ID', async () => {
      const req: Partial<Request> = { params: { id: 'invalid-id' } };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch course',
      });
    });

    it('should handle not found when fetching a non-existent course by ID', async () => {
      const req: Partial<Request> = {
        params: { id: 'nonexistentid1234567890' },
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });
  });

  describe('updateCourseById', () => {
    it('should update a course by ID', async () => {
      const courseData = {
        name: 'Course 1',
        code: 'COURSE101',
        semester: 'Spring',
      };
      const newCourse = await CourseModel.create(courseData);

      const updatedData = {
        name: 'Updated Course',
        code: 'UPDATED101',
        semester: 'Fall',
      };

      const req: Partial<Request> = {
        params: { id: newCourse._id.toString() },
        body: updatedData,
      };
      const res: Partial<Response> = {
        json: jest.fn(),
      };

      await updateCourse(req as Request, res as Response);

      const updatedCourse = await CourseModel.findById(newCourse._id);

      expect(updatedCourse).toMatchObject(updatedData);
      expect(res.json).toHaveBeenCalledWith(updatedCourse);
    });

    it('should handle errors when updating a course by ID', async () => {
      const req: Partial<Request> = {
        params: { id: 'invalid-id' },
        body: {},
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update course',
      });
    });

    it('should handle not found when updating a non-existent course by ID', async () => {
      const req: Partial<Request> = {
        params: { id: 'nonexistentid1234567890' },
        body: {},
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });
  });

  describe('deleteCourseById', () => {
    it('should delete a course by ID', async () => {
      const courseData = {
        name: 'Course 1',
        code: 'COURSE101',
        semester: 'Spring',
      };
      const newCourse = await CourseModel.create(courseData);

      const req: Partial<Request> = {
        params: { id: newCourse._id.toString() },
      };
      const res: Partial<Response> = {
        json: jest.fn(),
      };

      await deleteCourse(req as Request, res as Response);

      const deletedCourse = await CourseModel.findById(newCourse._id);

      expect(deletedCourse).toBeNull();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Course deleted successfully',
      });
    });

    it('should handle errors when deleting a course by ID', async () => {
      const req: Partial<Request> = {
        params: { id: 'invalid-id' },
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete course',
      });
    });

    it('should handle not found when deleting a non-existent course by ID', async () => {
      const req: Partial<Request> = {
        params: { id: 'nonexistentid1234567890' },
        body: {},
      };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteCourse(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });
  });
});
