import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentModel from '../../models/Assessment';
import ResultModel, { Result } from '../../models/Result';
import CourseModel from '../../models/Course';
import AccountModel from '../../models/Account';
import UserModel from '../../models/User';
import {
  getAssessmentById,
  uploadAssessmentResultsById,
  updateAssessmentResultMarkerById,
  addAssessmentsToCourse,
  updateAssessmentById,
  deleteAssessmentById,
} from '../../services/assessmentService';
import { NotFoundError, BadRequestError } from '../../services/errors';
import TeamSetModel from '@models/TeamSet';
import TeamModel from '@models/Team';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

const commonCourseDetails = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  semester: 'Fall 2024',
  courseType: 'Normal',
};

const commonStudentDetails = {
  identifier: 'uniqueuserid',
  name: 'John Doe',
  gitHandle: 'johndoe',
};

const commonTADetails = {
  identifier: 'uniquetaid',
  name: 'John Doe ta',
  gitHandle: 'johndoeta',
};

const commonFacultyDetails = {
  identifier: 'uniquefacultyid',
  name: 'John Doe faculty',
  gitHandle: 'johndoefaculty',
};

async function createTestCourse(courseData: any) {
  const course = new CourseModel(courseData);
  await course.save();
  return course;
}

async function createStudentUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Student',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return user;
}

async function createTAUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Teaching assistant',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return { user, account };
}

async function createFacultyUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Faculty member',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return { user, account };
}

describe('assessmentService', () => {
  let courseId: string;
  let assessmentId: string;
  let teamAssessmentId: string;
  let facultyAccountId: string;
  let taId: string;
  let taAccountId: string;
  let studentId: string;
  let resultId: string;
  let teamSetName: string;

  beforeEach(async () => {
    const course = await createTestCourse(commonCourseDetails);
    courseId = course._id.toHexString();

    const teamSet = new TeamSetModel({
      course: courseId,
      name: 'TeamSet1',
    });
    await teamSet.save();
    teamSetName = teamSet.name;
    course.teamSets.push(teamSet._id);
    await course.save();

    const team = new TeamModel({
      teamSet: teamSet._id,
      number: 1,
      members: [studentId],
    });
    await team.save();
    teamSet.teams.push(team._id);
    await teamSet.save();

    const student = await createStudentUser(commonStudentDetails);
    studentId = student._id.toHexString();
    student.enrolledCourses.push(course._id);
    await student.save();
    course.students.push(student._id);
    const student2 = await createStudentUser({
      identifier: 'uniqueuserid2',
      name: 'Jane Doe',
      gitHandle: 'janedoe',
      enrolledCourses: [course._id],
    });
    course.students.push(student2._id);
    await student2.save();
    await course.save();

    const pair = await createTAUser(commonTADetails);
    const ta = pair.user;
    const account = pair.account;
    taId = ta._id.toHexString();
    taAccountId = account._id;

    const faculty_pair = await createFacultyUser(commonFacultyDetails);
    facultyAccountId = faculty_pair.account._id;

    const assessment = new AssessmentModel({
      course: course._id,
      assessmentType: 'Exam',
      markType: 'Percentage',
      results: [],
      frequency: 'Once',
      granularity: 'individual',
    });
    await assessment.save();
    assessmentId = assessment._id.toHexString();

    const result = new ResultModel({
      assessment: assessment._id,
      marker: null,
      marks: [
        {
          user: student._id,
          name: student.name,
          mark: 0,
        },
      ],
    });
    await result.save();
    resultId = result._id.toHexString();
    assessment.results.push(result._id);

    const result2 = new ResultModel({
      assessment: assessment._id,
      marker: null,
      marks: [
        {
          user: student._id,
          name: student.name,
          mark: 0,
        },
      ],
    });
    await result2.save();
    assessment.results.push(result2._id);
    await assessment.save();

    const teamAssessment = new AssessmentModel({
      course: courseId,
      assessmentType: 'Exam',
      markType: 'Percentage',
      results: [],
      frequency: 'Once',
      granularity: 'team',
    });
    await teamAssessment.save();
    teamAssessmentId = teamAssessment._id.toHexString();

    const teamResult = new ResultModel({
      assessment: teamAssessment._id,
      marker: null,
      marks: [
        {
          user: studentId,
          name: 'John Doe',
          mark: 0,
        },
      ],
    });
    await teamResult.save();
    teamAssessment.results.push(teamResult._id);

    const teamResult2 = new ResultModel({
      assessment: teamAssessment._id,
      marker: null,
      marks: [
        {
          user: studentId,
          name: 'John Doe',
          mark: 0,
        },
      ],
    });
    await teamResult2.save();
    teamAssessment.results.push(teamResult2._id);
    await teamAssessment.save();
  });

  describe('getAssessmentById', () => {
    it('should retrieve an assessment by id', async () => {
      const retrievedAssessment = await getAssessmentById(
        assessmentId,
        taAccountId
      );
      expect(retrievedAssessment).toBeDefined();
      expect(retrievedAssessment._id.toString()).toEqual(assessmentId);
    });

    it('should retrieve an assessment by id for team', async () => {
      const retrievedAssessment = await getAssessmentById(
        teamAssessmentId,
        taAccountId
      );
      expect(retrievedAssessment).toBeDefined();
      expect(retrievedAssessment._id.toString()).toEqual(teamAssessmentId);
    });

    it('should throw NotFoundError for invalid assessmentId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      await expect(getAssessmentById(invalidId, taAccountId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateAssessmentById', () => {
    it('should update an assessment by id', async () => {
      const updatedAssessmentData = {
        assessmentType: 'Exam1',
        markType: 'Percentage',
        frequency: 'Once',
        granularity: 'individual',
      };
      await updateAssessmentById(
        assessmentId,
        facultyAccountId,
        updatedAssessmentData
      );

      const updatedAssessment = await AssessmentModel.findById(assessmentId);
      expect(updatedAssessment?.assessmentType).toEqual('Exam1');
    });

    it('should throw error for invalid account', async () => {
      const updatedAssessmentData = {
        assessmentType: 'Exam1',
        markType: 'Percentage',
        frequency: 'Once',
        granularity: 'individual',
      };
      expect(
        updateAssessmentById(
          assessmentId,
          new mongoose.Types.ObjectId().toHexString(),
          updatedAssessmentData
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error for TA account', async () => {
      const updatedAssessmentData = {
        assessmentType: 'Exam1',
        markType: 'Percentage',
        frequency: 'Once',
        granularity: 'individual',
      };
      expect(
        updateAssessmentById(assessmentId, taAccountId, updatedAssessmentData)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw error for invalid assessmentId', async () => {
      const updatedAssessmentData = {
        assessmentType: 'Exam1',
        markType: 'Percentage',
        frequency: 'Once',
        granularity: 'individual',
      };
      expect(
        updateAssessmentById(
          new mongoose.Types.ObjectId().toHexString(),
          facultyAccountId,
          updatedAssessmentData
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteAssessmentById', () => {
    it('should delete an assessment by id', async () => {
      await expect(deleteAssessmentById(assessmentId)).resolves.not.toThrow();
      const deletedAssessment = await AssessmentModel.findById(assessmentId);
      expect(deletedAssessment).toBeNull();
    });

    it('should throw NotFoundError for invalid assessmentId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      await expect(deleteAssessmentById(invalidId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('uploadAssessmentResultsById', () => {
    it('should upload assessment results', async () => {
      const mockResults = [
        { teamNumber: 1, studentId: studentId, mark: 90 },
        { teamNumber: 2, studentId: studentId, mark: 90 },
      ];
      await uploadAssessmentResultsById(assessmentId, mockResults);

      const updatedAssessment = await AssessmentModel.findById(
        assessmentId
      ).populate({
        path: 'results',
        populate: {
          path: 'marks',
        },
      });
      const updatedResults = updatedAssessment?.results;
      let isResultUploaded = false;

      expect(updatedResults?.length).toBe(2);
      for (const result of updatedResults as unknown as Result[]) {
        const marks = result.marks;
        if (!marks || marks.length < 1) {
          continue;
        }
        if (marks[0].mark === 90 && marks[0].user === studentId) {
          isResultUploaded = true;
        }
      }
      expect(isResultUploaded).toBe(true);
    });

    it('should upload assessment results for team', async () => {
      const mockResults = [
        { teamNumber: 1, studentId: studentId, mark: 90 },
        { teamNumber: 2, studentId: studentId, mark: 90 },
      ];
      await uploadAssessmentResultsById(teamAssessmentId, mockResults);

      const updatedAssessment = await AssessmentModel.findById(
        teamAssessmentId
      ).populate({
        path: 'results',
        populate: {
          path: 'marks',
        },
      });
      const updatedResults = updatedAssessment?.results;

      expect(updatedResults?.length).toBe(2);
    });

    it('should throw NotFoundError for invalid assessmentId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      const mockResults = [{ teamNumber: 1, studentId: studentId, mark: 85 }];
      await expect(
        uploadAssessmentResultsById(invalidId, mockResults)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid accountId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      await expect(getAssessmentById(assessmentId, invalidId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateAssessmentResultMarkerById', () => {
    it('should update the marker for a result', async () => {
      const ta = await UserModel.findOne({
        identifier: commonTADetails.identifier,
      });
      if (!ta) {
        throw new Error('Student not found');
      }
      const newMarkerId = ta._id.toHexString();
      await updateAssessmentResultMarkerById(
        assessmentId,
        resultId,
        newMarkerId
      );

      const updatedResult = await ResultModel.findById(resultId);
      expect(updatedResult).toBeDefined();
      expect(updatedResult?.marker?.toString()).toEqual(taId);
    });

    it('should throw NotFoundError for invalid assignmentId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      const newMarkerId = new mongoose.Types.ObjectId().toHexString();
      await expect(
        updateAssessmentResultMarkerById(invalidId, resultId, newMarkerId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid resultId', async () => {
      const invalidId = new mongoose.Types.ObjectId().toHexString();
      const newMarkerId = new mongoose.Types.ObjectId().toHexString();
      await expect(
        updateAssessmentResultMarkerById(assessmentId, invalidId, newMarkerId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addAssessmentsToCourse', () => {
    it('should add assessments to a course without teamset', async () => {
      const assessmentsData = [
        {
          assessmentType: 'Exam2',
          markType: 'Percentage',
          frequency: 'Once',
          granularity: 'individual',
        },
      ];
      await addAssessmentsToCourse(courseId, assessmentsData);

      const createdAssessment = await AssessmentModel.findOne({
        assessmentType: 'Exam2',
      });
      const updatedCourse = await CourseModel.findById(courseId);

      expect(createdAssessment).toBeDefined();
      expect(updatedCourse?.assessments).toContainEqual(createdAssessment?._id);
    });

    it('should add assessments to a course with teamset', async () => {
      const assessmentsData = [
        {
          assessmentType: 'Exam2',
          markType: 'Percentage',
          frequency: 'Once',
          granularity: 'individual',
          teamSetName: teamSetName,
        },
      ];
      await addAssessmentsToCourse(courseId, assessmentsData);

      const createdAssessment = await AssessmentModel.findOne({
        assessmentType: 'Exam2',
      });
      const updatedCourse = await CourseModel.findById(courseId);

      expect(createdAssessment).toBeDefined();
      expect(updatedCourse?.assessments).toContainEqual(createdAssessment?._id);
    });

    it('should add team assessments to a course', async () => {
      const assessmentsData = [
        {
          assessmentType: 'Exam3',
          markType: 'Percentage',
          frequency: 'Once',
          granularity: 'team',
          teamSetName: teamSetName,
        },
      ];
      await addAssessmentsToCourse(courseId, assessmentsData);

      const createdAssessment = await AssessmentModel.findOne({
        assessmentType: 'Exam3',
      });
      const updatedCourse = await CourseModel.findById(courseId);

      expect(createdAssessment).toBeDefined();
      expect(updatedCourse?.assessments).toContainEqual(createdAssessment?._id);
    });

    it('should throw BadRequestError for invalid assessmentsData', async () => {
      await expect(addAssessmentsToCourse(courseId, [])).rejects.toThrow(
        BadRequestError
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toHexString();
      const assessmentsData = [
        {
          assessmentType: 'Exam2',
          markType: 'Percentage',
          frequency: 'Once',
          granularity: 'individual',
        },
      ];

      await expect(
        addAssessmentsToCourse(invalidCourseId, assessmentsData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not add duplicate assessments to the course', async () => {
      const assessmentsData = [
        {
          assessmentType: 'Exam',
          markType: 'Percentage',
          results: [],
          frequency: 'Once',
          granularity: 'individual',
        },
      ];

      await expect(
        addAssessmentsToCourse(courseId, assessmentsData)
      ).rejects.toThrow(BadRequestError);
    });
  });
});
