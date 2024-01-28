import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';
import UserModel from '../../models/User';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import {
  deleteTeamById,
  updateTeamById,
  addStudentsToTeam,
  addTAsToTeam,
} from '../../services/teamService';
import { NotFoundError } from '../../services/errors';

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

// Common Course Details
const commonCourseDetails = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  semester: 'Fall 2024',
  courseType: 'Normal',
};

// Common Team Details
const commonTeamDetails = {
  number: 1,
};

// Common User Details
const commonUserDetails = {
  identifier: 'uniqueuserid',
  name: 'John Doe',
  gitHandle: 'johndoe',
};

// Util function to create a test course
async function createTestCourse(courseData: any) {
  const course = new CourseModel(courseData);
  await course.save();
  return course;
}

// Util function to create a test team
async function createTestTeam(teamData: any) {
  const team = new TeamModel(teamData);
  await team.save();
  return team;
}

// Utility function to create a test student user and an associated account
async function createStudentUser(userData: any) {
  // Create and save the user
  const user = new UserModel({
    ...userData, // Correctly spread the user data
    enrolledCourses: [], // Initialize with no enrolled courses
  });
  await user.save();

  // Create and save the associated account
  const account = new AccountModel({
    email: `${userData.identifier}@example.com`, // Example email generation
    password: 'hashedpassword', // Assume the password is hashed
    role: 'Student',
    user: user._id, // Link the account to the user
    isApproved: true, // Set account approval status
  });
  await account.save();

  return user;
}

// Utility function to create a test TA user and an associated account
async function createTAUser(userData: any) {
  // Create and save the user
  const user = new UserModel({
    ...userData, // Correctly spread the user data
    enrolledCourses: [], // Initialize with no enrolled courses
  });
  await user.save();

  // Create and save the associated account
  const account = new AccountModel({
    email: `${userData.identifier}@example.com`, // Example email generation
    password: 'hashedpassword', // Assume the password is hashed
    role: 'Teaching assistant',
    user: user._id, // Link the account to the user
    isApproved: true, // Set account approval status
  });
  await account.save();

  return user;
}

describe('teamService', () => {
  // Test cases for deleteTeamById
  describe('deleteTeamById', () => {
    it('should delete a team by id', async () => {
      const team = await createTestTeam(commonTeamDetails);
      await deleteTeamById(team._id.toHexString());
      const foundTeam = await TeamModel.findById(team._id);
      expect(foundTeam).toBeNull();
    });

    it('should throw NotFoundError if team does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toHexString();
      await expect(deleteTeamById(nonExistentId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // Test cases for updateTeamById
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

  // Test cases for addStudentsToTeam
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

  // Test cases for addTAsToTeam
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
