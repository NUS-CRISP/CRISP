// assessmentService.test.ts
import mongoose from 'mongoose';
import {
  getAssessmentById,
  uploadAssessmentResultsById,
  updateAssessmentResultMarkerById,
  addAssessmentsToCourse,
} from '../../services/assessmentService';
import AssessmentModel from '../../models/Assessment';
import ResultModel from '../../models/Result';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import AccountModel from '../../models/Account';
import { BadRequestError, NotFoundError } from '../../services/errors';

jest.mock('../../models/Assessment', () => ({
  findById: jest.fn(),
}));
jest.mock('../../models/Result', () => jest.fn());
jest.mock('../../models/Course', () => ({
  findById: jest.fn(),
}));
jest.mock('../../models/TeamSet', () => jest.fn());
jest.mock('../../models/Account', () => ({
  findById: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('accountService', () => {
  const mockTA = {
    _id: new mongoose.Types.ObjectId(),
    role: 'Teaching assistant',
    user: new mongoose.Types.ObjectId(),
  };
  const mockFaculty = {
    _id: new mongoose.Types.ObjectId(),
    role: 'Faculty',
    user: new mongoose.Types.ObjectId(),
  };
  const mockIndividualAssessment = {
    _id: new mongoose.Types.ObjectId(),
    results: [],
    granularity: 'individual',
  };
  const mockTeamAssessment = {
    _id: new mongoose.Types.ObjectId(),
    results: [],
    granularity: 'team',
  };

  describe('getAssessmentById', () => {
    it('should retrieve the assessment if it exists', async () => {
      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockIndividualAssessment),
      });
      AccountModel.findById = jest.fn().mockResolvedValue(mockTA);

      const assessment = await getAssessmentById(
        mockIndividualAssessment._id.toString(),
        mockTA._id.toString()
      );

      expect(assessment).toEqual(mockIndividualAssessment);
      expect(AssessmentModel.findById).toHaveBeenCalledWith(
        mockIndividualAssessment._id.toString()
      );
    });

    // ... Other test cases ...
  });

  describe('uploadAssessmentResultsById', () => {
    // ... Sample test case ...
  });

  describe('updateAssessmentResultMarkerById', () => {
    // ... Sample test case ...
  });

  describe('addAssessmentsToCourse', () => {
    // ... Other test cases ...
  });
});
