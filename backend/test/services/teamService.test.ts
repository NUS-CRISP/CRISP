import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Types } from 'mongoose';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import TeamSetModel from '../../models/TeamSet';
import UserModel from '../../models/User';
import { BadRequestError, NotFoundError } from '../../services/errors';
import {
  addStudentsToTeam,
  addTAsToTeam,
  deleteTeamById,
  getTeamsByCourseId,
  removeMembersById,
  updateTeamById,
} from '../../services/teamService';

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
  describe('getTeamsByCourseId', () => {
    it('should get teams by course id', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const team = await createTestTeam(commonTeamDetails);
      const team2 = await createTestTeam({ number: 2 });
      const teamSet = await createTestTeamSet(
        commonTeamSetDetails,
        course._id,
        [team._id, team2._id]
      );
      team.teamSet = teamSet._id;
      team2.teamSet = teamSet._id;
      await team.save();

      const teams = await getTeamsByCourseId(course._id.toHexString());
      expect(teams).toHaveLength(2);
      expect(teams[0].number).toBe(team.number);
      expect(teams[1].number).toBe(team2.number);
    });
  });

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

    it('should throw error if invalid courseId', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const courseId = course._id.toHexString();
      await CourseModel.deleteOne({ _id: course._id });

      await expect(addStudentsToTeam(courseId, [])).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw error if invalid studentId', async () => {
      const course = await createTestCourse(commonCourseDetails);

      await expect(
        addStudentsToTeam(course._id.toHexString(), [
          {
            identifier: 'invalidStudentId',
            teamSet: 'Team Set 1',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if student not enrolled in course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const student = await createStudentUser(commonUserDetails);
      await expect(
        addStudentsToTeam(course._id.toHexString(), [
          {
            identifier: student.identifier,
            teamSet: 'Team Set 1',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw error if invalid teamSet', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const student = await createStudentUser(commonUserDetails);
      student.enrolledCourses.push(course._id);
      await student.save();
      course.students.push(student._id);
      await course.save();
      await expect(
        addStudentsToTeam(course._id.toHexString(), [
          {
            identifier: student.identifier,
            teamSet: 'invalidTeamSet',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(NotFoundError);
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

    it('should throw error if invalid courseId', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const courseId = course._id.toHexString();
      await CourseModel.deleteOne({ _id: course._id });

      await expect(addTAsToTeam(courseId, [])).rejects.toThrow(NotFoundError);
    });

    it('should throw error if invalid TAId', async () => {
      const course = await createTestCourse(commonCourseDetails);

      await expect(
        addTAsToTeam(course._id.toHexString(), [
          {
            identifier: 'invalidStudentId',
            teamSet: 'Team Set 1',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if TA not enrolled in course', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const ta = await createTAUser(commonUserDetails);
      await expect(
        addTAsToTeam(course._id.toHexString(), [
          {
            identifier: ta.identifier,
            teamSet: 'Team Set 1',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw error if invalid teamSet', async () => {
      const course = await createTestCourse(commonCourseDetails);
      const ta = await createTAUser(commonUserDetails);
      ta.enrolledCourses.push(course._id);
      await ta.save();
      course.TAs.push(ta._id);
      await course.save();
      await expect(
        addTAsToTeam(course._id.toHexString(), [
          {
            identifier: ta.identifier,
            teamSet: 'invalidTeamSet',
            teamNumber: 1,
          },
        ])
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeMembersById', () => {
    it('should remove member by id', async () => {
      const team = await createTestTeam(commonTeamDetails);
      const user = await createStudentUser(commonUserDetails);
      if (!team || !user) {
        throw new Error('Test team or user could not be created');
      }
      team.members?.push(user._id);
      await team.save();

      await removeMembersById(team._id.toHexString(), user._id.toHexString());
      const updatedTeam = await TeamModel.findById(team._id).populate(
        'members'
      );
      expect(updatedTeam?.members).toHaveLength(0);
    });

    it('should throw error if invalid team', async () => {
      const user = await createStudentUser(commonUserDetails);
      const team = await createTestTeam(commonTeamDetails);
      const teamId = team._id.toHexString();
      await TeamModel.deleteOne({ _id: team._id });
      await expect(
        removeMembersById(teamId, user._id.toHexString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if invalid user', async () => {
      const user = await createStudentUser(commonUserDetails);
      const userId = user._id.toHexString();
      await UserModel.deleteOne({ _id: user._id });
      const team = await createTestTeam(commonTeamDetails);
      await expect(
        removeMembersById(team._id.toHexString(), userId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
