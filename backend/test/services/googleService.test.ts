import CourseModel from '@models/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AccountModel from '../../models/Account';
import AssessmentModel from '../../models/Assessment';
import SheetDataModel from '../../models/SheetData';
import { NotFoundError } from '../../services/errors';
import {
  fetchAndSaveSheetData,
  getAssessmentSheetData,
} from '../../services/googleService';
import CrispRole from '@shared/types/auth/CrispRole';

jest.mock('../../utils/google');

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

afterEach(async () => {
  jest.resetAllMocks();
});

describe('googleService', () => {
  let assessmentId: string;
  let assessmentTeamId: string;

  beforeEach(async () => {
    const course = new CourseModel({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-01-15'),
      courseType: 'Normal',
    });
    await course.save();

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
    course.assessments.push(assessment._id);
    await course.save();

    const sheetData = new SheetDataModel({
      headers: ['Student ID', 'Name', 'Grade'],
      rows: [
        ['1123', 'hello', '3'],
        ['2222', 'world', '4'],
      ],
      fetchedAt: new Date(),
    });
    await sheetData.save();
    assessment.sheetData = sheetData._id;
    await assessment.save();

    const assessmentTeam = new AssessmentModel({
      course: course._id,
      assessmentType: 'Exam',
      markType: 'Percentage',
      results: [],
      frequency: 'Once',
      granularity: 'team',
    });
    await assessmentTeam.save();
    assessmentTeamId = assessmentTeam._id.toHexString();
    course.assessments.push(assessmentTeam._id);
    await course.save();
    assessmentTeam.sheetData = sheetData._id;
    await assessmentTeam.save();
  });

  describe('getAssessmentSheetData', () => {
    it('should retrieve sheet data for an assessment', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Normal,
        isApproved: true,
      });
      await account.save();
      const sheetData = await getAssessmentSheetData(assessmentId, account._id);

      expect(sheetData).toBeDefined();
    });

    it('should retrieve sheet data for an assessment team', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Normal,
        isApproved: true,
      });
      await account.save();
      const sheetData = await getAssessmentSheetData(
        assessmentTeamId,
        account._id
      );
      expect(sheetData).toBeDefined();
    });

    it('should retrieve sheet data for an assessment team', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Faculty,
        isApproved: true,
      });
      await account.save();
      const sheetData = await getAssessmentSheetData(
        assessmentTeamId,
        account._id
      );
      expect(sheetData).toBeDefined();
    });

    it('should throw error for invalid account', async () => {
      expect(
        getAssessmentSheetData(
          assessmentId,
          new mongoose.Types.ObjectId().toHexString()
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid sheet data id', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Normal,
        isApproved: true,
      });
      await account.save();
      const assessment = await AssessmentModel.findById(assessmentId);
      assessment!.sheetData = new mongoose.Types.ObjectId();
      await assessment!.save();

      expect(getAssessmentSheetData(assessmentId, account._id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw error for invalid assessment', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Normal,
        isApproved: true,
      });
      await account.save();
      expect(
        getAssessmentSheetData(
          new mongoose.Types.ObjectId().toHexString(),
          account._id
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error for invalid sheetdata', async () => {
      const account = new AccountModel({
        email: 'ta1@example.com',
        password: 'hashedpassword',
        crispRole: CrispRole.Normal,
        isApproved: true,
      });
      await account.save();
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }
      assessment.sheetData = new mongoose.Types.ObjectId();
      await assessment.save();
      expect(getAssessmentSheetData(assessmentId, account._id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('fetchAndSaveSheetData', () => {
    it('fetches and saves new sheet data for an assessment', async () => {
      const rows = [
        ['1123', 'hello', '3'],
        ['2222', 'world', '4'],
        ['3333', 'next', '5'],
        ['4444', 'please', '6'],
      ];
      const mockFetchDataFromSheet = jest.fn().mockResolvedValue([
        ['Student ID', 'Name', 'Grade'],
        ['1123', 'hello', '3'],
        ['2222', 'world', '4'],
        ['3333', 'next', '5'],
        ['4444', 'please', '6'],
      ]);
      jest
        .spyOn(require('../../utils/google'), 'fetchDataFromSheet')
        .mockImplementation(mockFetchDataFromSheet);

      await fetchAndSaveSheetData(assessmentId, true);
      const assessment = await AssessmentModel.findById(assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment not found');
      }
      const newSheetData = await SheetDataModel.findById(assessment.sheetData);
      expect(newSheetData).toBeDefined();
      expect(newSheetData?.rows).toEqual(rows);
      expect(newSheetData?.headers).toEqual(['Student ID', 'Name', 'Grade']);
    });

    it('should throw NotFoundError for invalid assessment id', async () => {
      expect(
        fetchAndSaveSheetData(new mongoose.Types.ObjectId().toHexString(), true)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
