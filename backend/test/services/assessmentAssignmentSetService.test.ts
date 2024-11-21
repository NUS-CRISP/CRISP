// tests/services/assessmentAssignmentSetService.test.ts

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import InternalAssessmentModel from '../../models/InternalAssessment';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import {
  createAssignmentSet,
  getAssignmentSetByAssessmentId,
  updateAssignmentSet,
  getAssignmentsByTAId,
} from '../../services/assessmentAssignmentSetService';
import { NotFoundError, BadRequestError } from '../../services/errors';
import CourseModel from '@models/Course';

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
  if (mongo) await mongo.stop();
  await mongoose.connection.close();
});

describe('assessmentAssignmentSetService', () => {
  let assessmentId: Types.ObjectId;
  let teamSetId: Types.ObjectId;
  let teamId: Types.ObjectId;
  let taId: Types.ObjectId;

  beforeEach(async () => {
    // Create mock data

    const course = await CourseModel.create({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal',
    });
    await course.save();
    const internalAssessment = await InternalAssessmentModel.create({
      course: course._id,
      assessmentName: 'Test Assessment',
      description: 'A test assessment for unit tests.',
      granularity: 'team',
      isReleased: true,
      areSubmissionsEditable: true,
      startDate: new Date().setUTCFullYear(new Date().getUTCFullYear() - 1),
    });
    assessmentId = internalAssessment._id;
    internalAssessment.save();

    const teamSet = await TeamSetModel.create({
      course: new mongoose.Types.ObjectId(),
      name: 'Test Team Set',
    });
    teamSetId = teamSet._id;

    const team = await TeamModel.create({
      teamSet: teamSetId,
      number: 1,
      members: [],
    });
    teamId = team._id;
    teamSet.teams.push(teamId);
    await teamSet.save();

    const ta = await UserModel.create({
      identifier: 'taUser',
      name: 'Test TA',
    });
    taId = ta._id;

    // Update mock team to have a TA
    team.TA = taId;
    await team.save();
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

    it('should throw NotFoundError if assessment is not found', async () => {
      await expect(
        createAssignmentSet(
          new mongoose.Types.ObjectId().toString(),
          teamSetId.toString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if assignment set already exists', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

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
        updateAssignmentSet(assessmentId.toString(), assignedTeams)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAssignmentsByTAId', () => {
    it('should retrieve assignments by TA ID', async () => {
      await createAssignmentSet(assessmentId.toString(), teamSetId.toString());

      const teams = await getAssignmentsByTAId(
        taId.toString(),
        assessmentId.toString()
      );

      expect(teams).toHaveLength(1);
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
});
