import { Request, Response } from 'express';
import * as courseService from '../../services/courseService';
import * as assessmentService from '../../services/assessmentService';
import * as teamSetService from '../../services/teamSetService';
import * as teamService from '../../services/teamService';
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  addStudents,
  addTAs,
  getTeachingTeam,
  addTeamSet,
  addStudentsToTeams,
  addTAsToTeams,
  addMilestone,
  addSprint,
  addAssessments,
} from '../../controllers/courseController';
import { NotFoundError, BadRequestError } from '../../services/errors';

jest.mock('../../services/courseService');
jest.mock('../../services/assessmentService');
jest.mock('../../services/teamSetService');
jest.mock('../../services/teamService');

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

describe('createCourse', () => {
  it('should create a course successfully', async () => {
    const req = mockRequest({}, {}, { authorization: 'accountId' });
    const res = mockResponse();

    jest.spyOn(courseService, 'createNewCourse').mockResolvedValue({
      _id: 'courseId',
    } as any);

    await createCourse(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Course created successfully',
      _id: 'courseId',
    });
  });

  // More test cases for error handling, e.g., missing authorization, service throwing errors
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

  // More test cases like handling missing authorization, service throwing errors
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

  // Additional test cases
});

// updateCourse Tests
// Similar to getCourse, but test for updating a course

// deleteCourse Tests
// Similar to getCourse, but test for deleting a course

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

  // Additional test cases
});

// addTAs Tests
// Similar to addStudents, but for TAs

// getTeachingTeam Tests
// Test fetching the teaching team of a course

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

  // Additional test cases
});

// addStudentsToTeams Tests
// Similar to addStudents, but for adding students to teams

// addTAsToTeams Tests
// Similar to addTAs, but for adding TAs to teams

// addMilestone Tests
// Test for adding a milestone to a course

// addSprint Tests
// Test for adding a sprint to a course

// addAssessments Tests
// Test for adding assessments to a course
