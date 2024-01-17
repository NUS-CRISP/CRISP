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
      .spyOn(courseService, 'createNewCourse')
      .mockRejectedValue(new Error('Missing authorization'));

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
      .spyOn(courseService, 'getCoursesForUser')
      .mockRejectedValue(new Error('Missing authorization'));

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

  it('should handle missing authorization send a 400 status', async () => {
    const req = mockRequest({}, { id: 'courseId' });
    const res = mockResponse();

    jest
      .spyOn(courseService, 'getCourseById')
      .mockRejectedValue(new Error('Missing authorization'));

    await getCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
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
});

describe('updateCourse', () => {
  it('should update a specific course', async () => {
    const req = mockRequest(
      { name: 'New Course Name' },
      { id: 'courseId' },
      {}
    );
    const res = mockResponse();

    jest.spyOn(courseService, 'updateCourseById').mockResolvedValue(undefined);

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

    jest.spyOn(courseService, 'deleteCourseById').mockResolvedValue(undefined);

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

// addMilestone Tests
// Test for adding a milestone to a course

// addSprint Tests
// Test for adding a sprint to a course

// addAssessments Tests
// Test for adding assessments to a course
