// tests/services/assessmentAssignmentSetService.test.ts

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import InternalAssessmentModel, {
  InternalAssessment,
} from '../../models/InternalAssessment';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import CourseModel from '@models/Course';

import {
  createAssignmentSet,
  getAssignmentSetByAssessmentId,
  updateAssignmentSet,
  getAssignmentsByTAId,
  getUnmarkedAssignmentsByTAId,
} from '../../services/assessmentAssignmentSetService';

import { NotFoundError, BadRequestError } from '../../services/errors';
import * as submissionService from '../../services/submissionService';
import * as assessmentAssignmentSetService from '../../services/assessmentAssignmentSetService';
import AccountModel from '@models/Account';
import CrispRole from '@shared/types/auth/CrispRole';
import CourseRole from '@shared/types/auth/CourseRole';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  // Clean all collections before each test to ensure isolation
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) await mongo.stop();
  await mongoose.connection.close();
});

describe('assessmentAssignmentSetService (team granularity)', () => {
  let assessmentId: Types.ObjectId;
  let userAssessmentId: Types.ObjectId;
  let assessment: InternalAssessment;
  let teamSetId: Types.ObjectId;
  let teamId: Types.ObjectId;
  let studentId: Types.ObjectId;
  let taId: Types.ObjectId;
  let accountId: string;

  beforeEach(async () => {
    const faculty = new UserModel({
      identifier: 'faculty@example.com',
      name: 'Test Faculty',
    });
    const facultyAccount = new AccountModel({
      email: 'faculty@example.com',
      password: 'password',
      crispRole: CrispRole.Faculty,
      user: faculty._id,
      isApproved: true,
    });

    const course = await CourseModel.create({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal',
    });
    await course.save();
    facultyAccount.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.Faculty,
    });
    await facultyAccount.save();
    accountId = facultyAccount._id;

    const internalAssessment = await InternalAssessmentModel.create({
      course: course._id,
      assessmentName: 'Team Assessment',
      description: 'A test assessment for unit tests (team).',
      granularity: 'team',
      maxMarks: 0,
      scaleToMaxMarks: true,
      isReleased: false,
      areSubmissionsEditable: true,
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
    });
    assessmentId = internalAssessment._id;
    assessment = internalAssessment;
    await internalAssessment.save();
    const userInternalAssessment = await InternalAssessmentModel.create({
      course: course._id,
      assessmentName: 'Individual Assessment',
      description: 'A test assessment for unit tests (individual).',
      granularity: 'individual',
      maxMarks: 0,
      scaleToMaxMarks: true,
      isReleased: false,
      areSubmissionsEditable: true,
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
    });
    userAssessmentId = userInternalAssessment._id;
    await userInternalAssessment.save();

    const teamSet = await TeamSetModel.create({
      course: course._id,
      name: 'Test Team Set',
    });
    teamSetId = teamSet._id;
    internalAssessment.teamSet = teamSet._id;
    await internalAssessment.save();
    userInternalAssessment.teamSet = teamSet._id;
    await userInternalAssessment.save();

    const student = await UserModel.create({
      identifier: 'e012',
      name: 'hello',
    });
    studentId = student._id;
    const studentAccount = new AccountModel({
      email: 'student@example.com',
      password: 'password',
      crispRole: CrispRole.Normal,
      user: student._id,
      isApproved: true,
    });
    studentAccount.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.Student,
    });
    await studentAccount.save();

    const ta = await UserModel.create({
      identifier: 'taUser',
      name: 'Test TA',
    });
    taId = ta._id;
    const taAccount = new AccountModel({
      email: 'ta@example.com',
      password: 'password',
      crispRole: CrispRole.Normal,
      user: ta._id,
      isApproved: true,
    });
    taAccount.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.TA,
    });
    await taAccount.save();

    const team = await TeamModel.create({
      teamSet: teamSetId,
      number: 1,
      members: [student._id],
      TA: ta._id,
    });
    teamId = team._id;

    teamSet.teams.push(teamId);
    const teamWithNoTa = await TeamModel.create({
      teamSet: teamSetId,
      number: 2,
      members: [student._id],
    });

    teamSet.teams.push(teamWithNoTa._id);
    await teamSet.save();
  });

  describe('createAssignmentSet', () => {
    it('should create an assignment set', async () => {
      const assignmentSet = await createAssignmentSet(
        assessmentId.toString(),
        teamSetId.toString()
      );

      expect(assignmentSet).toBeDefined();
      expect(assignmentSet.assessment.toString()).toEqual(
        assessmentId.toString()
      );
      expect(assignmentSet.originalTeams).toContainEqual(teamId);
    });

    it('should assign a random TA if a team has no TAs but another team provides a TA pool', async () => {
      const teamNoTA = await TeamModel.create({
        teamSet: teamSetId,
        number: 2,
        members: [],
      });
      const existingTeamSet = await TeamSetModel.findById(teamSetId);
      existingTeamSet!.teams.push(teamNoTA._id);
      await existingTeamSet!.save();

      const assignmentSet = await createAssignmentSet(
        assessmentId.toString(),
        teamSetId.toString()
      );

      const assignedTeamNoTA = assignmentSet.assignedTeams!.find(
        at => at.team.toString() === teamNoTA._id.toString()
      );
      expect(assignedTeamNoTA).toBeDefined();
      expect(assignedTeamNoTA!.tas).toHaveLength(1);
      const assignedTeamWithTA = assignmentSet.assignedTeams!.find(
        at => at.team.toString() === teamId.toString()
      );
      expect(assignedTeamWithTA).toBeDefined();
      const existingTAId = assignedTeamWithTA!.tas[0].toString();

      expect(assignedTeamNoTA!.tas[0].toString()).toBe(existingTAId);
    });

    it('should throw NotFoundError if original TeamSet does not exist', async () => {
      const invalidTeamSetId = new mongoose.Types.ObjectId().toString();

      await expect(
        createAssignmentSet(assessmentId.toString(), invalidTeamSetId)
      ).rejects.toThrowError(NotFoundError);
    });

    it('should throw NotFoundError if assessment is not found', async () => {
      await expect(
        createAssignmentSet(
          new mongoose.Types.ObjectId().toString(),
          teamSetId.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if assignment set already exists', async () => {
      // Create once
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());
      // Creating again for same assessment should fail
      await expect(
        createAssignmentSet(assessmentId.toString(), teamSetId.toString())
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAssignmentSetByAssessmentId', () => {
    it('should retrieve an existing assignment set', async () => {
      const createdSet = await createAssignmentSet(
        assessmentId.toString(),
        teamSetId.toString()
      );

      const retrievedSet = await getAssignmentSetByAssessmentId(
        assessmentId.toString()
      );
      expect(retrievedSet._id.toString()).toEqual(createdSet._id.toString());
    });

    it('should throw NotFoundError if no assignment set is found', async () => {
      await expect(
        getAssignmentSetByAssessmentId(new mongoose.Types.ObjectId().toString())
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateAssignmentSet', () => {
    it('should update assigned teams in an assignment set', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      const assignedTeams = [{ team: teamId, tas: [taId] }];

      const updatedSet = await updateAssignmentSet(
        accountId,
        assessmentId.toString(),
        assignedTeams
      );

      expect(updatedSet.assignedTeams).toHaveLength(1);
      expect(updatedSet.assignedTeams![0].team.toString()).toEqual(
        teamId.toString()
      );
      expect(updatedSet.assignedTeams![0].tas[0].toString()).toEqual(
        taId.toString()
      );
    });

    it('should throw NotFoundError if team is not found', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      const assignedTeams = [
        { team: new mongoose.Types.ObjectId(), tas: [taId] },
      ];

      await expect(
        updateAssignmentSet(accountId, assessmentId.toString(), assignedTeams)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if a team is left without a TA', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      const assignedTeams = [{ team: teamId, tas: [] }]; // empty TAs

      await expect(
        updateAssignmentSet(accountId, assessmentId.toString(), assignedTeams)
      ).rejects.toThrow(BadRequestError);
    });

    it('should create a new assignment set if none exists when calling updateAssignmentSet', async () => {
      const updated = await updateAssignmentSet(
        accountId,
        assessmentId.toString(),
        [{ team: teamId, tas: [taId] }],
        undefined
      );

      expect(updated).toBeDefined();
      expect(updated.assignedTeams).toHaveLength(1);
    });

    it('should throw NotFoundError if createAssignmentSet fails to create one in updateAssignmentSet', async () => {
      jest
        .spyOn(assessmentAssignmentSetService, 'createAssignmentSet')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockResolvedValueOnce(null as any);
      await expect(
        updateAssignmentSet(accountId, assessmentId.toString(), [], [])
      ).rejects.toThrow();

      jest.restoreAllMocks();
    });

    it('should throw NotFoundError if a TA does not exist when updating assignedTeams', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());
      const nonExistentTAId = new mongoose.Types.ObjectId();
      const assignedTeams = [{ team: teamId, tas: [nonExistentTAId] }];
      await expect(
        updateAssignmentSet(accountId, assessmentId.toString(), assignedTeams)
      ).rejects.toThrow(`TA with ID ${nonExistentTAId} not found`);
    });

    it('should throw NotFoundError if a TA does not exist when updating assignedUsers', async () => {
      await createAssignmentSet(
        userAssessmentId.toString(),
        teamSetId.toString()
      );
      const nonExistentTAId = new mongoose.Types.ObjectId();
      const assignedUsers = [{ user: studentId, tas: [nonExistentTAId] }];
      await expect(
        updateAssignmentSet(
          accountId,
          assessmentId.toString(),
          undefined,
          assignedUsers
        )
      ).rejects.toThrow(`TA with ID ${nonExistentTAId} not found`);
    });

    it('should throw BadRequestError if assesmsent is already released', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());
      assessment.isReleased = true;
      await assessment.save();

      const assignedTeams = [{ team: teamId, tas: [taId] }];

      await expect(
        updateAssignmentSet(accountId, assessmentId.toString(), assignedTeams)
      ).rejects.toThrow(BadRequestError);
      assessment.isReleased = false;
      await assessment.save();
    });
  });

  describe('getAssignmentsByTAId', () => {
    it('should retrieve assignments by TA ID', async () => {
      // Create the assignment set
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      const teams = await getAssignmentsByTAId(
        taId.toString(),
        assessmentId.toString()
      );

      expect(teams).toHaveLength(2);
      expect(teams[0]!._id.toString()).toEqual(teamId.toString());
    });

    it('should throw NotFoundError if no assignment set is found', async () => {
      await expect(
        getAssignmentsByTAId(
          taId.toString(),
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUnmarkedAssignmentsByTAId', () => {
    beforeEach(() => {
      jest.spyOn(submissionService, 'getSubmissionsByAssessmentAndUser');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should retrieve unmarked teams if no submissions exist', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      // Mock getSubmissionsByAssessmentAndUser to return an empty array
      (
        submissionService.getSubmissionsByAssessmentAndUser as jest.Mock
      ).mockResolvedValue([]);

      const unmarked = await getUnmarkedAssignmentsByTAId(
        taId.toString(),
        assessmentId.toString()
      );

      // Because there are no submissions, the single assigned team is still unmarked
      expect(unmarked).toHaveLength(2);
      expect(unmarked[0]!._id.toString()).toEqual(teamId.toString());
    });

    it('should return empty array if the team has submitted (simulate partial TeamMemberSelectionAnswer)', async () => {
      const assignmentSet = await createAssignmentSet(
        assessmentId.toString(),
        teamSetId.toString()
      );
      expect(assignmentSet).toBeDefined();
      expect(assignmentSet.assignedTeams).toBeDefined();
      expect(assignmentSet.assignedUsers).toBe(null);
      // Mock the submission with a "Team Member Selection Answer" that includes the team's member
      (
        submissionService.getSubmissionsByAssessmentAndUser as jest.Mock
      ).mockResolvedValue([
        {
          answers: [
            {
              type: 'Team Member Selection Answer',
              selectedUserIds: [studentId.toString()],
              toObject: () => ({
                type: 'Team Member Selection Answer',
                selectedUserIds: [studentId.toString()],
              }),
            },
          ],
        },
      ]);

      const unmarked = await getUnmarkedAssignmentsByTAId(
        taId.toString(),
        assessmentId.toString()
      );

      // Because we simulated that all members have 'submitted',
      // the function should see it as "marked" => unmarked is empty
      expect(unmarked).toHaveLength(0);
      // Note: The same student is in both teams.
    });

    it('should throw NotFoundError if assignment set does not exist', async () => {
      await expect(
        getUnmarkedAssignmentsByTAId(
          taId.toString(),
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});

/**
 * --------------------------------------------------------------------
 * Additional suite for "individual" granularity
 * --------------------------------------------------------------------
 */
describe('assessmentAssignmentSetService (individual granularity)', () => {
  let individualAssessmentId: Types.ObjectId;
  let teamSetId: Types.ObjectId;
  let user1Id: Types.ObjectId;
  let user2Id: Types.ObjectId;
  let taId: Types.ObjectId;
  let accountId: string;

  beforeEach(async () => {
    const facultyAccount = new AccountModel({
      email: 'faculty@example.com',
      password: 'password',
      crispRole: CrispRole.Faculty,
      user: new mongoose.Types.ObjectId(),
      isApproved: true,
    });
    await facultyAccount.save();
    accountId = facultyAccount._id;

    const course = await CourseModel.create({
      name: 'Advanced Computer Science',
      code: 'CS201',
      semester: 'Spring 2025',
      startDate: new Date('2025-01-10'),
      courseType: 'Normal',
    });
    await course.save();
    facultyAccount.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.Faculty,
    });
    await facultyAccount.save();

    const individualAssessment = await InternalAssessmentModel.create({
      course: course._id,
      assessmentName: 'Individual Assessment',
      description: 'A test assessment for unit tests (individual).',
      granularity: 'individual',
      maxMarks: 100,
      scaleToMaxMarks: true,
      isReleased: false,
      areSubmissionsEditable: true,
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
    });
    individualAssessmentId = individualAssessment._id;
    await individualAssessment.save();

    const ts = await TeamSetModel.create({
      course: course._id,
      name: 'Individual Team Set',
    });
    teamSetId = ts._id;

    const user1 = await UserModel.create({
      identifier: 'u001',
      name: 'User One',
    });
    const studentAccount1 = new AccountModel({
      email: 'student1@example.com',
      password: 'password',
      crispRole: CrispRole.Normal,
      user: user1._id,
      isApproved: true,
    });
    studentAccount1.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.Student,
    });
    await studentAccount1.save();
    const user2 = await UserModel.create({
      identifier: 'u002',
      name: 'User Two',
    });
    const studentAccount2 = new AccountModel({
      email: 'student2@example.com',
      password: 'password',
      crispRole: CrispRole.Normal,
      user: user2._id,
      isApproved: true,
    });
    studentAccount2.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.Student,
    });
    await studentAccount2.save();
    user1Id = user1._id;
    user2Id = user2._id;

    const team = await TeamModel.create({
      teamSet: teamSetId,
      number: 100,
      members: [user1Id, user2Id],
    });
    ts.teams.push(team._id);
    await ts.save();

    const ta = await UserModel.create({
      identifier: 'TA-123',
      name: 'Individual Granularity TA',
    });
    taId = ta._id;
    const taAccount = new AccountModel({
      email: 'ta@example.com',
      password: 'password',
      crispRole: CrispRole.Normal,
      user: ta._id,
      isApproved: true,
    });
    taAccount.courseRoles.push({
      course: course._id.toString(),
      courseRole: CourseRole.TA,
    });
    await taAccount.save();

    // For an "individual" scenario, we typically do not store a single TA on the team object
    // But let's do it anyway to test assignedUsers
    team.TA = taId;
    await team.save();
  });

  describe('createAssignmentSet (individual)', () => {
    it('should create an assignment set with assignedUsers', async () => {
      const assignmentSet = await createAssignmentSet(
        individualAssessmentId.toString(),
        teamSetId.toString()
      );

      expect(assignmentSet).toBeDefined();
      expect(assignmentSet.assessment.toString()).toEqual(
        individualAssessmentId.toString()
      );
      // The originalTeams array has 1 "team"
      expect(assignmentSet.originalTeams).toHaveLength(1);

      // For individual granularity, assignedUsers should exist
      expect(assignmentSet.assignedUsers).toBeDefined();
      expect(assignmentSet.assignedTeams).toBe(null);

      // assignedUsers should have user1Id and user2Id, each with the TA
      const assignedUsers = assignmentSet.assignedUsers!;
      expect(assignedUsers.length).toBe(2);
      const userIds = assignedUsers.map(u => u.user.toString());
      expect(userIds).toContain(user1Id.toString());
      expect(userIds).toContain(user2Id.toString());
    });

    it('should throw BadRequestError if assignment set already exists (individual)', async () => {
      await createAssignmentSet(
        individualAssessmentId.toString(),
        teamSetId.toString()
      );
      await expect(
        createAssignmentSet(
          individualAssessmentId.toString(),
          teamSetId.toString()
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('updateAssignmentSet (individual)', () => {
    beforeEach(async () => {
      // Create the assignment set for this assessment
      await createAssignmentSet(
        individualAssessmentId.toString(),
        teamSetId.toString()
      );
    });

    it('should update assigned users in an assignment set', async () => {
      // New assignedUsers: each user has the same TA
      const assignedUsers = [
        { user: user1Id, tas: [taId] },
        { user: user2Id, tas: [taId] },
      ];

      const updatedSet = await updateAssignmentSet(
        accountId,
        individualAssessmentId.toString(),
        undefined, // assignedTeams
        assignedUsers
      );

      expect(updatedSet.assignedUsers).toHaveLength(2);
      // user1
      expect(
        updatedSet.assignedUsers!.find(
          au => au.user.toString() === user1Id.toString()
        )
      ).toBeTruthy();
      // user2
      expect(
        updatedSet.assignedUsers!.find(
          au => au.user.toString() === user2Id.toString()
        )
      ).toBeTruthy();
    });

    it('should throw NotFoundError if user is not found', async () => {
      const assignedUsers = [
        { user: new mongoose.Types.ObjectId(), tas: [taId] },
      ];

      await expect(
        updateAssignmentSet(
          accountId,
          individualAssessmentId.toString(),
          undefined,
          assignedUsers
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if a accountId is invalid', async () => {
      const assignedUsers = [
        { user: user1Id, tas: [taId] },
        { user: user2Id, tas: [taId] },
      ];

      await expect(
        updateAssignmentSet(
          'invalidAccId',
          individualAssessmentId.toString(),
          undefined,
          assignedUsers
        )
      ).rejects.toThrow();
    });

    it('should throw BadRequestError if a user is left without a TA', async () => {
      const assignedUsers = [
        { user: user1Id, tas: [] }, // empty TAs
      ];

      await expect(
        updateAssignmentSet(
          accountId,
          individualAssessmentId.toString(),
          undefined,
          assignedUsers
        )
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAssignmentsByTAId (individual)', () => {
    beforeEach(async () => {
      // Create assignment set; by default it assigns the single team's TA to both users
      await createAssignmentSet(
        individualAssessmentId.toString(),
        teamSetId.toString()
      );
    });

    it('should retrieve assigned users for a TA', async () => {
      const assignedUsersOrTeams = await getAssignmentsByTAId(
        taId.toString(),
        individualAssessmentId.toString()
      );

      // For 'individual', we expect an array of Users
      expect(Array.isArray(assignedUsersOrTeams)).toBe(true);
      expect(assignedUsersOrTeams).toHaveLength(2);
      // user1 / user2
      const foundIds = assignedUsersOrTeams.map(u => u._id.toString());
      expect(foundIds).toContain(user1Id.toString());
      expect(foundIds).toContain(user2Id.toString());
    });

    it('should throw NotFoundError if no assignment set is found for this assessment', async () => {
      const randomAssessmentId = new mongoose.Types.ObjectId().toString();
      await expect(
        getAssignmentsByTAId(taId.toString(), randomAssessmentId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUnmarkedAssignmentsByTAId (individual)', () => {
    beforeEach(async () => {
      jest.spyOn(submissionService, 'getSubmissionsByAssessmentAndUser');
      // Create assignment set
      await createAssignmentSet(
        individualAssessmentId.toString(),
        teamSetId.toString()
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should retrieve unmarked users if no submissions exist', async () => {
      (
        submissionService.getSubmissionsByAssessmentAndUser as jest.Mock
      ).mockResolvedValue([]);

      const unmarked = await getUnmarkedAssignmentsByTAId(
        taId.toString(),
        individualAssessmentId.toString()
      );

      // Should contain both user1 and user2
      expect(unmarked).toHaveLength(2);
      const foundIds = unmarked.map(u => u._id.toString());
      expect(foundIds).toContain(user1Id.toString());
      expect(foundIds).toContain(user2Id.toString());
    });

    it('should return empty array if both assigned users have submitted', async () => {
      // Mock submission with "Team Member Selection Answer" referencing both user1 and user2
      (
        submissionService.getSubmissionsByAssessmentAndUser as jest.Mock
      ).mockResolvedValue([
        {
          answers: [
            {
              type: 'Team Member Selection Answer',
              selectedUserIds: [user1Id.toString(), user2Id.toString()],
              toObject: () => ({
                type: 'Team Member Selection Answer',
                selectedUserIds: [user1Id.toString(), user2Id.toString()],
              }),
            },
          ],
        },
      ]);

      const unmarked = await getUnmarkedAssignmentsByTAId(
        taId.toString(),
        individualAssessmentId.toString()
      );

      expect(unmarked).toHaveLength(0);
    });

    it('should throw NotFoundError if assignment set does not exist', async () => {
      // Clear out the assignment set from the DB
      await mongoose.connection.db
        .collection('assessmentassignmentsets')
        .deleteMany({});

      await expect(
        getUnmarkedAssignmentsByTAId(
          taId.toString(),
          individualAssessmentId.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });
});
