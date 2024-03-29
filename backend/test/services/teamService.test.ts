import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';
import UserModel from '../../models/User';
import { NotFoundError } from '../../services/errors';
import {
  addStudentsToTeam,
  addTAsToTeam,
  deleteTeamById,
  updateTeamById,
} from '../../services/teamService';

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
  startDate: new Date('2024-08-15'),
  courseType: 'Normal',
};

const commonTeamDetails = {
  number: 1,
};

const commonUserDetails = {
  identifier: 'uniqueuserid',
  name: 'John Doe',
  gitHandle: 'johndoe',
};

const commonTeamSetDetails = {
  name: 'Team Set Name',
};

async function createTestCourse(courseData: any) {
  const course = new CourseModel(courseData);
  await course.save();
  return course;
}

async function createTestTeam(teamData: any) {
  const team = new TeamModel(teamData);
  await team.save();
  return team;
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

  return user;
}

async function createTestTeamSet(
  teamSetData: any,
  course: Types.ObjectId,
  teams: Types.ObjectId[]
) {
  const teamSet = new TeamSetModel({
    ...teamSetData,
    course: course,
    teams: teams,
  });
  await teamSet.save();
  return teamSet;
}

describe('teamService', () => {
  describe('deleteTeamById', () => {
    it('should delete a team by id', async () => {
      const team = await createTestTeam(commonTeamDetails);
      await deleteTeamById(team._id.toHexString());
      const foundTeam = await TeamModel.findById(team._id);
      expect(foundTeam).toBeNull();
    });

    it('should delete a team by id and delete team from teamset', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const team = await createTestTeam(commonTeamDetails);
      const teamSet = await createTestTeamSet(
        commonTeamSetDetails,
        course._id,
        [team._id]
      );
      team.teamSet = teamSet._id;
      await team.save();

      await deleteTeamById(team._id.toHexString());
      const foundTeam = await TeamModel.findById(team._id);
      expect(foundTeam).toBeNull();
      const foundTeamSet = await TeamSetModel.findById(teamSet._id);
      expect(foundTeamSet?.teams.indexOf(team._id)).toBe(-1);
    });

    it('should throw NotFoundError if team does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await expect(deleteTeamById(nonExistentId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateTeamById', () => {
    it('should update a team by id', async () => {
      const team = await createTestTeam(commonTeamDetails);
      const updateData = { number: 2 };
      await updateTeamById(team._id.toHexString(), updateData);

      const updatedTeam = await TeamModel.findById(team._id);
      expect(updatedTeam).toBeDefined();
      expect(updatedTeam?.number).toBe(updateData.number);
    });

    it('should throw NotFoundError if team does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      const updateData = { number: 2 };

      await expect(updateTeamById(nonExistentId, updateData)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('addStudentsToTeam', () => {
    it('should add students to a team in a course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const student = await createStudentUser(commonUserDetails);
      const teamSet = new TeamSetModel({
        name: 'Team Set 1',
        course: course._id,
      });
      await teamSet.save();

      student.enrolledCourses.push(course._id);
      await student.save();
      course.students.push(student._id);
      await course.save();

      await addStudentsToTeam(course._id.toHexString(), [
        {
          identifier: student.identifier,
          teamSet: teamSet.name,
          teamNumber: 1,
        },
      ]);

      const team = await TeamModel.findOne({ teamSet: teamSet._id });
      expect(team).toBeDefined();
      expect(team?.members).toContainEqual(student._id);
    });
  });

  describe('addTAsToTeam', () => {
    it('should assign TAs to a team in a course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const ta = await createTAUser({
        identifier: 'ta1',
        name: 'ta1',
        gitHandle: 'ta1',
      });
      const teamSet = new TeamSetModel({
        name: 'Team Set 1',
        course: course._id,
      });
      await teamSet.save();

      ta.enrolledCourses.push(course._id);
      await ta.save();
      course.TAs.push(ta._id);
      await course.save();

      await addTAsToTeam(course._id.toHexString(), [
        { identifier: ta.identifier, teamSet: teamSet.name, teamNumber: 1 },
      ]);

      const team = await TeamModel.findOne({
        teamSet: teamSet._id,
        TA: ta._id,
      });
      expect(team).toBeDefined();
      expect(team?.TA).toEqual(ta._id);
    });
  });
});
