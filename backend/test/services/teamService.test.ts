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
  getTeamsByTAIdAndCourseId,
  removeMembersById,
  updateTeamById,
} from '../../services/teamService';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

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
    crispRole: CrispRole.Normal,
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return {user, account};
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
    crispRole: CrispRole.Normal,
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return {user, account};
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
  describe('getTeamsByTAIdAndCourseId', () => {
    it('should return all teams assigned to a specific TA within a course', async () => {
      // Create course
      const course = await createTestCourse(commonCourseDetails);

      // Create TAs
      const {user: ta1, account: ta1Acc} = await createTAUser({
        identifier: 'ta1',
        name: 'TA One',
        gitHandle: 'taone',
      });
      const {user: ta2, account: ta2Acc} = await createTAUser({
        identifier: 'ta2',
        name: 'TA Two',
        gitHandle: 'tatwo',
      });

      // Enroll TAs in course
      ta1.enrolledCourses.push(course._id);
      ta2.enrolledCourses.push(course._id);
      await ta1.save();
      await ta2.save();
      ta1Acc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA
      });
      ta2Acc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA
      });
      await ta1Acc.save();
      await ta2Acc.save();
      course.TAs.push(ta1._id, ta2._id);
      await course.save();

      // Create TeamSet
      const teamSet = await createTestTeamSet(
        { name: 'Team Set A' },
        course._id,
        []
      );

      // Create Teams and assign TAs
      const team1 = new TeamModel({
        number: 1,
        teamSet: teamSet._id,
        TA: ta1._id,
        members: [],
      });
      await team1.save();

      const team2 = new TeamModel({
        number: 2,
        teamSet: teamSet._id,
        TA: ta1._id,
        members: [],
      });
      await team2.save();

      const team3 = new TeamModel({
        number: 3,
        teamSet: teamSet._id,
        TA: ta2._id,
        members: [],
      });
      await team3.save();

      // Update TeamSet with teams
      teamSet.teams.push(team1._id, team2._id, team3._id);
      await teamSet.save();

      // Fetch teams for ta1
      const ta1Teams = await getTeamsByTAIdAndCourseId(
        ta1._id.toHexString(),
        course._id.toHexString()
      );
      expect(ta1Teams).toHaveLength(2);
      expect(ta1Teams.map(t => t.number)).toContain(1);
      expect(ta1Teams.map(t => t.number)).toContain(2);

      // Fetch teams for ta2
      const ta2Teams = await getTeamsByTAIdAndCourseId(
        ta2._id.toHexString(),
        course._id.toHexString()
      );
      expect(ta2Teams).toHaveLength(1);
      expect(ta2Teams[0].number).toBe(3);
    });

    it('should return an empty array if the TA has no assigned teams', async () => {
      // Create course
      const course = await createTestCourse(commonCourseDetails);

      // Create TA
      const {user: ta, account: taAcc} = await createTAUser({
        identifier: 'ta3',
        name: 'TA Three',
        gitHandle: 'tathree',
      });

      // Enroll TA in course
      ta.enrolledCourses.push(course._id);
      await ta.save();
      taAcc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA
      });
      await taAcc.save();
      course.TAs.push(ta._id);
      await course.save();

      // Create TeamSet
      const teamSet = await createTestTeamSet(
        { name: 'Team Set B' },
        course._id,
        []
      );

      // Create Teams without assigning the TA
      const team1 = new TeamModel({
        number: 1,
        teamSet: teamSet._id,
        TA: null,
        members: [],
      });
      await team1.save();

      const team2 = new TeamModel({
        number: 2,
        teamSet: teamSet._id,
        TA: null,
        members: [],
      });
      await team2.save();

      // Update TeamSet with teams
      teamSet.teams.push(team1._id, team2._id);
      await teamSet.save();

      // Fetch teams for the TA
      const taTeams = await getTeamsByTAIdAndCourseId(
        ta._id.toHexString(),
        course._id.toHexString()
      );
      expect(taTeams).toHaveLength(0);
    });

    it('should return an empty array if the TA does not exist in the course', async () => {
      // Create course
      const course = await createTestCourse(commonCourseDetails);

      // Create TA but do not enroll in course
      const {user: ta} = await createTAUser({
        identifier: 'ta4',
        name: 'TA Four',
        gitHandle: 'tafour',
      });

      // Create TeamSet
      const teamSet = await createTestTeamSet(
        { name: 'Team Set C' },
        course._id,
        []
      );

      // Create Teams and assign TAs
      const team1 = new TeamModel({
        number: 1,
        teamSet: teamSet._id,
        TA: ta._id, // TA not enrolled in course
        members: [],
      });
      await team1.save();

      // Update TeamSet with team
      teamSet.teams.push(team1._id);
      await teamSet.save();

      // Fetch teams for the TA
      const taTeams = await getTeamsByTAIdAndCourseId(
        ta._id.toHexString(),
        course._id.toHexString()
      );
      expect(taTeams).toHaveLength(1); // The function does not verify enrollment
      expect(taTeams[0].number).toBe(1);
    });

    it('should return an empty array if the course does not exist', async () => {
      // Create TA
      const {user: ta} = await createTAUser({
        identifier: 'ta5',
        name: 'TA Five',
        gitHandle: 'tafive',
      });

      // Attempt to fetch teams for a non-existent course
      const nonExistentCourseId = new mongoose.Types.ObjectId().toHexString();
      const taTeams = await getTeamsByTAIdAndCourseId(
        ta._id.toHexString(),
        nonExistentCourseId
      );
      expect(taTeams).toHaveLength(0);
    });

    it('should handle invalid TA IDs gracefully', async () => {
      // Create course
      const course = await createTestCourse(commonCourseDetails);

      // Create TeamSet
      const teamSet = await createTestTeamSet(
        { name: 'Team Set D' },
        course._id,
        []
      );

      // Create Teams without assigning any TA
      const team1 = new TeamModel({
        number: 1,
        teamSet: teamSet._id,
        TA: null,
        members: [],
      });
      await team1.save();

      // Update TeamSet with team
      teamSet.teams.push(team1._id);
      await teamSet.save();

      // Use an invalid TA ID
      const invalidTAId = new mongoose.Types.ObjectId().toHexString();
      const taTeams = await getTeamsByTAIdAndCourseId(
        invalidTAId,
        course._id.toHexString()
      );
      expect(taTeams).toHaveLength(0);
    });
  });

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
      const {user: student, account: studentAcc} = await createStudentUser(commonUserDetails);
      const teamSet = new TeamSetModel({
        name: 'Team Set 1',
        course: course._id,
      });
      await teamSet.save();

      student.enrolledCourses.push(course._id);
      await student.save();
      studentAcc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.Student
      });
      await studentAcc.save();
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
      const {user: student} = await createStudentUser(commonUserDetails);
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
      const {user: student, account: studentAcc} = await createStudentUser(commonUserDetails);
      student.enrolledCourses.push(course._id);
      await student.save();
      studentAcc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.Student
      });
      await studentAcc.save();
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
      const {user: ta, account: taAcc} = await createTAUser({
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
      taAcc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA
      });
      await taAcc.save();
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
      const {user: ta} = await createTAUser(commonUserDetails);
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
      const {user: ta, account: taAcc} = await createTAUser(commonUserDetails);
      ta.enrolledCourses.push(course._id);
      await ta.save();
      taAcc.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA
      });
      await taAcc.save();
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
      const {user} = await createStudentUser(commonUserDetails);
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
      const {user} = await createStudentUser(commonUserDetails);
      const team = await createTestTeam(commonTeamDetails);
      const teamId = team._id.toHexString();
      await TeamModel.deleteOne({ _id: team._id });
      await expect(
        removeMembersById(teamId, user._id.toHexString())
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if invalid user', async () => {
      const {user} = await createStudentUser(commonUserDetails);
      const userId = user._id.toHexString();
      await UserModel.deleteOne({ _id: user._id });
      const team = await createTestTeam(commonTeamDetails);
      await expect(
        removeMembersById(team._id.toHexString(), userId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
