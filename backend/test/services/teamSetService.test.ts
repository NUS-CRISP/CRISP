import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import { BadRequestError, NotFoundError } from '../../services/errors';
import {
  createTeamSet,
  deleteTeamSetById,
} from '../../services/teamSetService';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});

const commonCourseDetails = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  semester: 'Fall 2024',
  startDate: new Date('2024-08-15'),
  courseType: 'Normal',
};

async function createTestCourse(courseData: any) {
  const course = new CourseModel(courseData);
  await course.save();
  return course;
}

describe('teamSetService', () => {
  describe('deleteTeamSetById', () => {
    it('should delete a team set by id', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const teamSet = new TeamSetModel({
        name: 'Team Set 1',
        course: course._id,
      });
      await teamSet.save();
      course.teamSets.push(teamSet._id);
      await course.save();

      await deleteTeamSetById(teamSet._id.toHexString());

      const foundTeamSet = await TeamSetModel.findById(teamSet._id);
      const updatedCourse = await CourseModel.findById(course._id);

      expect(foundTeamSet).toBeNull();
      expect(updatedCourse?.teamSets).not.toContain(teamSet._id);
    });

    it('should throw NotFoundError if team set does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await expect(deleteTeamSetById(nonExistentId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('createTeamSet', () => {
    it('should create a new team set for a course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const teamSetName = 'New TeamSet';

      await createTeamSet(course._id.toHexString(), teamSetName);

      const createdTeamSet = await TeamSetModel.findOne({ name: teamSetName });
      const updatedCourse = await CourseModel.findById(course._id);

      expect(createdTeamSet).toBeDefined();
      expect(updatedCourse?.teamSets).toContainEqual(createdTeamSet?._id);
    });

    it('should throw NotFoundError if team set does not exists in the course', async () => {
      const teamSetName = 'This TeamSet does not exist';
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(createTeamSet(invalidCourseId, teamSetName)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw BadRequestError if team set name already exists in the course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const teamSetName = 'Existing TeamSet';

      await createTeamSet(course._id.toHexString(), teamSetName);

      await expect(
        createTeamSet(course._id.toHexString(), teamSetName)
      ).rejects.toThrow(BadRequestError);
    });
  });
});
