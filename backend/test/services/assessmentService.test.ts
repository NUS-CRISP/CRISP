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
import AccountModel from '../../models/Account';
import { NotFoundError } from '../../services/errors';

jest.mock('../../models/Assessment', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  __esModule: true,
  default: function () {
    return {
      save: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
    };
  },
}));

jest.mock('../../models/Result', () => ({
  __esModule: true,
  default: function () {
    return {
      save: jest.fn().mockResolvedValue({ _id: new mongoose.Types.ObjectId() }),
    };
  },
}));

jest.mock('../../models/Course', () => ({
  findById: jest.fn(),
}));

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
      AccountModel.findById = jest.fn().mockResolvedValue(mockFaculty);

      const assessment = await getAssessmentById(
        mockIndividualAssessment._id.toString(),
        mockFaculty._id.toString()
      );

      expect(assessment).toEqual(mockIndividualAssessment);
      expect(AssessmentModel.findById).toHaveBeenCalledWith(
        mockIndividualAssessment._id.toString()
      );
    });

    it('should filter results for teaching assistant', async () => {
      // Mock a TA-specific assessment result...
      const assessmentWithTA = {
        ...mockTeamAssessment,
        results: [
          {
            team: {
              TA: mockTA.user,
            },
            marks: [{ mark: 80 }],
          },
          {
            team: {
              TA: new mongoose.Types.ObjectId(),
            },
            marks: [{ mark: 90 }],
          },
        ],
      };

      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(assessmentWithTA),
      });
      AccountModel.findById = jest.fn().mockResolvedValue(mockTA);

      const assessment = await getAssessmentById(
        mockTeamAssessment._id.toString(),
        mockTA._id.toString()
      );

      // Expect to only see results for teams associated with this TA
      expect(assessment.results.length).toBe(1);
      expect(assessment.results[0].marks[0].mark).toBe(80);
    });
  });

  describe('uploadAssessmentResultsById', () => {
    const assessmentId = new mongoose.Types.ObjectId().toString();
    const mockResults = [
      { teamNumber: 1, studentId: 'student1', mark: 85 },
      { teamNumber: 1, studentId: 'student2', mark: 86 },
      { teamNumber: 2, studentId: 'student3', mark: 87 },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should upload results for an individual assessment successfully', async () => {
      // Setup the mock implementation
      const mockAssessment = {
        _id: assessmentId,
        granularity: 'individual',
        results: mockResults.map((result, index) => ({
          marks: [{ user: result.studentId, mark: 0 }],
          save: jest.fn().mockResolvedValue({ ...result, mark: result.mark }),
        })),
      };

      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAssessment),
      });

      // Call the function under test
      await uploadAssessmentResultsById(assessmentId, mockResults);

      // Verify that save was called for each result
      for (const result of mockAssessment.results) {
        expect(result.save).toHaveBeenCalledTimes(1);
      }
    });

    it('should throw NotFoundError if the assessment does not exist', async () => {
      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      // Assert that a NotFoundError is thrown
      await expect(
        uploadAssessmentResultsById(assessmentId, mockResults)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle errors during result saving', async () => {
      const mockAssessment = {
        _id: assessmentId,
        granularity: 'individual',
        results: mockResults.map((result, index) => ({
          marks: [{ user: result.studentId, mark: 0 }],
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        })),
      };

      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAssessment),
      });

      // Assert that an error is thrown when save fails
      await expect(
        uploadAssessmentResultsById(assessmentId, mockResults)
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateAssessmentResultMarkerById', () => {
    it('should update the marker for a result', async () => {
      // Mock a result that will be updated...
      const mockResult = {
        _id: new mongoose.Types.ObjectId(),
        assessment: mockIndividualAssessment._id,
        marker: mockTA._id,
        save: jest.fn().mockImplementation(() => Promise.resolve()),
      };

      // Setup the mocks...
      AssessmentModel.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockIndividualAssessment),
      });
      ResultModel.findById = jest.fn().mockResolvedValue(mockResult);

      // Perform the update...
      await updateAssessmentResultMarkerById(
        mockIndividualAssessment._id.toString(),
        mockResult._id.toString(),
        mockTA._id.toString()
      );

      // Expect the marker to be updated and the result to be saved...
      expect(mockResult.marker.toString()).toEqual(mockTA._id.toString());
      expect(mockResult.save).toHaveBeenCalled();
    });
  });

  describe('addAssessmentsToCourse', () => {});
});
