import { Assessment } from '@models/Assessment';
import { TeamSet } from '@models/TeamSet';
import { Request, Response } from 'express';
import {
  addAssessments,
  addFaculty,
  addMilestone,
  addSprint,
  addStudents,
  addStudentsToTeams,
  addTAs,
  addTAsToTeams,
  getAssessments,
  getCourseCode,
  getCourseJiraRegistrationStatus,
  getPeople,
  getProjectManagementBoard,
  getTeamSets,
  getTeamSetsNames,
  getTimeline,
  removeFaculty,
  removeStudents,
  removeTAs,
  updateFaculty,
  updateStudents,
  updateTAs,
} from '../../controllers/courseController';
import * as assessmentService from '../../services/assessmentService';
import * as courseService from '../../services/courseService';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../../services/errors';

jest.mock('../../services/courseService');
jest.mock('../../services/assessmentService');
jest.mock('../../services/teamSetService');
jest.mock('../../services/teamService');
jest.mock('../../utils/auth');

const mockRequest = (body = {}, params = {}, headers = {}) => {
  const req = {} as Request;
  req.body = body;
  req.params = params;
  req.headers = headers;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('courseController', () => {
  beforeEach(() => {
    jest.spyOn(auth, 'getAccountId').mockResolvedValue('mockAccountId');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();

      jest.spyOn(courseService, 'createNewCourse').mockResolvedValue({
        _id: 'courseId',
      } as any);

      await createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Course created successfully',
        _id: 'courseId',
      });
    });

    it('should handle missing authorization send a 400 status', async () => {
      const req = mockRequest();
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'createNewCourse')
        .mockRejectedValue(new NotFoundError('Account not found'));

      await createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle errors when creating course', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'createNewCourse')
        .mockRejectedValue(new Error('Error creating course'));

      await createCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create course',
      });
    });
  });

  describe('getCourses', () => {
    it('should return a list of courses for a user', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();
      const mockCourses = [{ _id: 'courseId1' }, { _id: 'courseId2' }];

      jest
        .spyOn(courseService, 'getCoursesForUser')
        .mockResolvedValue(mockCourses as any);

      await getCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCourses);
    });

    it('should handle missing authorization send a 400 status', async () => {
      const req = mockRequest();
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCoursesForUser')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting courses', async () => {
      const req = mockRequest({}, {}, { authorization: 'accountId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCoursesForUser')
        .mockRejectedValue(new Error('Error retrieving courses'));

      await getCourses(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch courses',
      });
    });
  });

  describe('getCourse', () => {
    it('should return a specific course', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();
      const mockCourse = { _id: 'courseId', name: 'Course Name' };

      jest
        .spyOn(courseService, 'getCourseById')
        .mockResolvedValue(mockCourse as any);

      await getCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCourse);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseById')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting course', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseById')
        .mockRejectedValue(new Error('Error getting course'));

      await getCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch course',
      });
    });

    it('should handle missing authorization send a 400 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });
  });

  describe('updateCourse', () => {
    it('should update a specific course', async () => {
      const req = mockRequest(
        { name: 'New Course Name' },
        { id: 'courseId' },
        {}
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateCourseById')
        .mockResolvedValue(undefined);

      await updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Course updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateCourseById')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when updating course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateCourseById')
        .mockRejectedValue(new Error('Error updating course'));

      await updateCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update course',
      });
    });
  });

  describe('deleteCourse', () => {
    it('should update a specific course', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'deleteCourseById')
        .mockResolvedValue(undefined);

      await deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Course deleted successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' }, {});
      const res = mockResponse();

      jest
        .spyOn(courseService, 'deleteCourseById')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when updating course', async () => {
      const req = mockRequest({}, { id: 'courseId' }, {});
      const res = mockResponse();

      jest
        .spyOn(courseService, 'deleteCourseById')
        .mockRejectedValue(new Error('Error updating course'));

      await deleteCourse(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete course',
      });
    });
  });

  describe('getCourseCode', () => {
    it('should get course code with id', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockCourseCode = 'CZ3003';

      jest
        .spyOn(courseService, 'getCourseCodeById')
        .mockResolvedValue(mockCourseCode);

      await getCourseCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCourseCode);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseCodeById')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getCourseCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting course code', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseCodeById')
        .mockRejectedValue(new Error('Failed to get course code'));

      await getCourseCode(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get course code',
      });
    });
  });

  describe('addStudents', () => {
    it('should add students to a course', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addStudentsToCourse')
        .mockResolvedValue(undefined);

      await addStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Students added to the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addStudentsToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding students', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addStudentsToCourse')
        .mockRejectedValue(new Error('Error adding students'));

      await addStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add students',
      });
    });
  });

  describe('updateStudents', () => {
    it('should update students in a course', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateStudentsInCourse')
        .mockResolvedValue(undefined);

      await updateStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Students updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateStudentsInCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await updateStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when updating students', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateStudentsInCourse')
        .mockRejectedValue(new Error('Error updating students'));

      await updateStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update students',
      });
    });
  });

  describe('removeStudents', () => {
    it('should remove students from a course', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeStudentsFromCourse')
        .mockResolvedValue(undefined);

      await removeStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Students removed from the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeStudentsFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await removeStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when removing students', async () => {
      const req = mockRequest(
        { items: ['student1', 'student2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeStudentsFromCourse')
        .mockRejectedValue(new Error('Failed to remove students'));

      await removeStudents(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to remove students',
      });
    });
  });

  describe('addTAs', () => {
    it('should add students to a course', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest.spyOn(courseService, 'addTAsToCourse').mockResolvedValue(undefined);

      await addTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'TAs added to the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addTAsToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding students', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addTAsToCourse')
        .mockRejectedValue(new Error('Error adding TAs'));

      await addTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add TAs',
      });
    });
  });

  describe('updateTAs', () => {
    it('should update TAs in a course', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateTAsInCourse')
        .mockResolvedValue(undefined);

      await updateTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'TAs updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateTAsInCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await updateTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when updating TAs', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateTAsInCourse')
        .mockRejectedValue(new Error('Error updating TAs'));

      await updateTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update TAs',
      });
    });
  });

  describe('getTeachingTeam', () => {
    it('should get teaching team', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTeachingTeam = ['ta1', 'ta2'];

      jest
        .spyOn(courseService, 'getCourseTeachingTeam')
        .mockResolvedValue(mockTeachingTeam as any);

      await getTeachingTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeachingTeam);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseTeachingTeam')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getTeachingTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding students', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseTeachingTeam')
        .mockRejectedValue(new Error('Error retrieving teaching team'));

      await getTeachingTeam(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve Teaching Team',
      });
    });
  });

  describe('removeTAs', () => {
    it('should remove TAs from a course', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeTAsFromCourse')
        .mockResolvedValue(undefined);

      await removeTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'TAs removed from the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeTAsFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await removeTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when removing TAs', async () => {
      const req = mockRequest({ items: ['ta1', 'ta2'] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeTAsFromCourse')
        .mockRejectedValue(new Error('Failed to remove TAs'));

      await removeTAs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to remove TAs',
      });
    });
  });

  describe('addFaculty', () => {
    it('should add faculty to a course', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addFacultyToCourse')
        .mockResolvedValue(undefined);

      await addFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Faculty added to the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addFacultyToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding faculty', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addFacultyToCourse')
        .mockRejectedValue(new Error('Failed to add faculty'));

      await addFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add Faculty',
      });
    });
  });

  describe('updateFaculty', () => {
    it('should update faculty in a course', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateFacultyInCourse')
        .mockResolvedValue(undefined);

      await updateFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Faculty updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateFacultyInCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await updateFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when updating faculty', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'updateFacultyInCourse')
        .mockRejectedValue(new Error('Failed to update Faculty'));

      await updateFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update Faculty',
      });
    });
  });

  describe('removeFaculty', () => {
    it('should remove faculty from a course', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeFacultyFromCourse')
        .mockResolvedValue(undefined);

      await removeFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Faculty removed from the course successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeFacultyFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await removeFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when removing faculty', async () => {
      const req = mockRequest(
        { items: ['faculty1', 'faculty2'] },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'removeFacultyFromCourse')
        .mockRejectedValue(new Error('Failed to remove faculty'));

      await removeFaculty(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to remove Faculty',
      });
    });
  });

  describe('getPeople', () => {
    it('should get people in a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockPeople = {
        faculty: ['faculty1', 'faculty2'],
        students: ['student1', 'student2'],
        tas: ['ta1', 'ta2'],
      };

      jest
        .spyOn(courseService, 'getPeopleFromCourse')
        .mockResolvedValue(mockPeople as any);

      await getPeople(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockPeople);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getPeopleFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getPeople(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting people', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getPeopleFromCourse')
        .mockRejectedValue(new Error('Failed to retrieve people'));

      await getPeople(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve people',
      });
    });
  });

  describe('addTeamSet', () => {
    it('should create a team set', async () => {
      const req = mockRequest({ name: 'TeamSet 1' }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(teamSetService, 'createTeamSet')
        .mockResolvedValue({ _id: 'teamSetId' } as any);

      await addTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Team set created successfully',
      });
    });

    it('should handle bad request and send a 400 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      jest
        .spyOn(teamSetService, 'createTeamSet')
        .mockRejectedValue(
          new BadRequestError(
            'A team set with the same name already exists in this course'
          )
        );

      await addTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'A team set with the same name already exists in this course',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamSetService, 'createTeamSet')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when creating team set', async () => {
      const req = mockRequest(
        {},
        { id: 'courseId' },
        { authorization: 'accountId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamSetService, 'createTeamSet')
        .mockRejectedValue(new Error('Error creating team set'));

      await addTeamSet(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create team set',
      });
    });
  });

  describe('getTeamSets', () => {
    it('should get team sets for a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTeamSets = [{ _id: 'teamSetId1' }, { _id: 'teamSetId2' }];

      jest
        .spyOn(courseService, 'getTeamSetsFromCourse')
        .mockResolvedValue(mockTeamSets as unknown as TeamSet[]);

      await getTeamSets(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeamSets);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getTeamSetsFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getTeamSets(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle missing authorization send a 400 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getTeamSets(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle errors when getting team sets', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getTeamSetsFromCourse')
        .mockRejectedValue(new Error('Failed to retrieve team sets'));

      await getTeamSets(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get team sets',
      });
    });
  });

  describe('getTeamSetsNames', () => {
    it('should get team sets names for a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTeamSets = ['Team Set 1', 'Team Set 2'];

      jest
        .spyOn(courseService, 'getTeamSetNamesFromCourse')
        .mockResolvedValue(mockTeamSets);

      await getTeamSetsNames(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTeamSets);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getTeamSetNamesFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getTeamSetsNames(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting team sets names', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getTeamSetNamesFromCourse')
        .mockRejectedValue(new Error('Failed to get team set names'));

      await getTeamSetsNames(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get team set names',
      });
    });
  });

  describe('addStudentsToTeams', () => {
    it('should add students to team', async () => {
      const req = mockRequest(
        [
          { identifier: 'student1', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'student2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest.spyOn(teamService, 'addStudentsToTeam').mockResolvedValue(undefined);

      await addStudentsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Students added to teams successfully',
      });
    });

    it('should handle bad request and send a 400 status', async () => {
      const req = mockRequest(
        [
          { identifier: 'student1' },
          { identifier: 'student2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      jest
        .spyOn(teamService, 'addStudentsToTeam')
        .mockRejectedValue(new BadRequestError('Invalid Student'));

      await addStudentsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid Student',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        [
          { identifier: 'student9090', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'student2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamService, 'addStudentsToTeam')
        .mockRejectedValue(new NotFoundError('Student not found'));

      await addStudentsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Student not found' });
    });

    it('should handle errors when adding students to team', async () => {
      const req = mockRequest(
        [
          { identifier: 'student1', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'student2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamService, 'addStudentsToTeam')
        .mockRejectedValue(new Error('Error adding students to team'));

      await addStudentsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add students to teams',
      });
    });
  });

  describe('addTAsToTeams', () => {
    it('should add TAs to team', async () => {
      const req = mockRequest(
        [
          { identifier: 'ta1', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'ta2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest.spyOn(teamService, 'addTAsToTeam').mockResolvedValue(undefined);

      await addTAsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'TAs added to teams successfully',
      });
    });

    it('should handle bad request and send a 400 status', async () => {
      const req = mockRequest(
        [
          { identifier: 'ta1' },
          { identifier: 'ta2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      jest
        .spyOn(teamService, 'addTAsToTeam')
        .mockRejectedValue(new BadRequestError('Invalid TA'));

      await addTAsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid TA',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        [
          { identifier: 'ta9090', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'ta2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamService, 'addTAsToTeam')
        .mockRejectedValue(new NotFoundError('TA not found'));

      await addTAsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'TA not found' });
    });

    it('should handle errors when adding students to team', async () => {
      const req = mockRequest(
        [
          { identifier: 'ta1', teamSet: 'teamSet1', teamNumber: 1 },
          { identifier: 'ta2', teamSet: 'teamSet1', teamNumber: 2 },
        ],
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(teamService, 'addTAsToTeam')
        .mockRejectedValue(new Error('Error adding TAs to team'));

      await addTAsToTeams(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add TAs to teams',
      });
    });
  });

  describe('addMilestone', () => {
    it('should successfully add a milestone to a course', async () => {
      const req = mockRequest(
        { number: 1, dateline: new Date(), description: 'Milestone 1' },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addMilestoneToCourse')
        .mockResolvedValue(undefined);

      await addMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Milestone added successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { number: 1, dateline: new Date(), description: 'Milestone 1' },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addMilestoneToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding sprints', async () => {
      const req = mockRequest(
        { number: 1, dateline: new Date(), description: 'Milestone 1' },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addMilestoneToCourse')
        .mockRejectedValue(new Error('Error adding milestone'));

      await addMilestone(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add milestone',
      });
    });
  });

  describe('addSprint', () => {
    it('should successfully add a sprint to a course', async () => {
      const req = mockRequest(
        {
          number: 1,
          startDate: new Date(),
          endDate: new Date(),
          description: 'Sprint 1',
        },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addSprintToCourse')
        .mockResolvedValue(undefined);

      await addSprint(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sprint added successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        {
          number: 1,
          startDate: new Date(),
          endDate: new Date(),
          description: 'Sprint 1',
        },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addSprintToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addSprint(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding sprint', async () => {
      const req = mockRequest(
        {
          number: 1,
          startDate: new Date(),
          endDate: new Date(),
          description: 'Sprint 1',
        },
        { id: 'courseId' }
      );
      const res = mockResponse();

      jest
        .spyOn(courseService, 'addSprintToCourse')
        .mockRejectedValue(new Error('Error adding sprint'));

      await addSprint(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add sprint',
      });
    });
  });

  describe('getTimeline', () => {
    it('should get timeline for a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockTimeline = {
        milestones: ['milestone1', 'milestone2'],
        sprints: ['sprint1', 'sprint2'],
      };

      jest
        .spyOn(courseService, 'getCourseTimeline')
        .mockResolvedValue(mockTimeline as any);

      await getTimeline(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTimeline);
    });
    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseTimeline')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getTimeline(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });
    it('should handle errors when getting timeline', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseTimeline')
        .mockRejectedValue(new Error('Failed to retrieve timeline'));

      await getTimeline(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve timeline',
      });
    });
  });

  describe('addAssessments', () => {
    it('should successfully add assessments to a course', async () => {
      const req = mockRequest({ items: [{}] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'addAssessmentsToCourse')
        .mockResolvedValue(undefined);

      await addAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessments added successfully',
      });
    });

    it('should return an error if assessments data is invalid', async () => {
      const req = mockRequest({ items: [{}] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'addAssessmentsToCourse')
        .mockRejectedValue(
          new BadRequestError('Invalid or empty assessments data')
        );

      await addAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid or empty assessments data',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({ items: [{}] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'addAssessmentsToCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await addAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when adding assessments', async () => {
      const req = mockRequest({ items: [{}] }, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'addAssessmentsToCourse')
        .mockRejectedValue(new Error('Error adding assessments'));

      await addAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to add assessments',
      });
    });
  });

  describe('getAssessments', () => {
    it('should get assessments for a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockAssessments = ['assessment1', 'assessment2'];

      jest
        .spyOn(courseService, 'getAssessmentsFromCourse')
        .mockResolvedValue(mockAssessments as unknown as Assessment[]);

      await getAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAssessments);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getAssessmentsFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting assessments', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getAssessmentsFromCourse')
        .mockRejectedValue(new Error('Failed to retrieve assessments'));

      await getAssessments(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get assessments',
      });
    });
  });

  describe('getProjectManagementBoard ', () => {
    it('should get project management board for a course', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockProjectManagementBoard = {
        columns: ['column1', 'column2'],
        tasks: ['task1', 'task2'],
      };

      jest
        .spyOn(courseService, 'getProjectManagementBoardFromCourse')
        .mockResolvedValue(mockProjectManagementBoard as any);

      await getProjectManagementBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockProjectManagementBoard);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getProjectManagementBoardFromCourse')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getProjectManagementBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle missing authorization send a 400 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getProjectManagementBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle errors when getting project management board', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getProjectManagementBoardFromCourse')
        .mockRejectedValue(
          new Error('Failed to get project management boards')
        );

      await getProjectManagementBoard(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get project management boards',
      });
    });
  });

  describe('getCourseJiraRegistrationStatus ', () => {
    it('should get course Jira registration status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();
      const mockJiraRegistrationStatus = {
        registered: true,
        jiraProjectKey: 'JIRA_PROJECT_KEY',
      };

      jest
        .spyOn(courseService, 'getCourseJiraRegistrationStatusById')
        .mockResolvedValue(mockJiraRegistrationStatus as any);

      await getCourseJiraRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockJiraRegistrationStatus);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseJiraRegistrationStatusById')
        .mockRejectedValue(new NotFoundError('Course not found'));

      await getCourseJiraRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });

    it('should handle errors when getting course Jira registration status', async () => {
      const req = mockRequest({}, { id: 'courseId' });
      const res = mockResponse();

      jest
        .spyOn(courseService, 'getCourseJiraRegistrationStatusById')
        .mockRejectedValue(new Error('Failed to get Jira registration status'));

      await getCourseJiraRegistrationStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get Jira registration status',
      });
    });
  });
});
