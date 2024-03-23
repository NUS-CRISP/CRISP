import { Request, Response } from 'express';
import * as assessmentService from '../../services/assessmentService';
import * as auth from '../../utils/auth';
import {
  getAssessment,
  uploadResults,
  updateResultMarker,
} from '../../controllers/assessmentController';
import {
  MissingAuthorizationError,
  NotFoundError,
} from '../../services/errors';

jest.mock('../../services/assessmentService');
jest.mock('../../utils/auth');

beforeEach(() => {
  jest.clearAllMocks();
});

const mockRequest = (body = {}, params = {}, headers = {}) => {
  const req = {} as Request;
  req.body = body;
  req.params = params;
  req.headers = headers;
  return req;
};

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('assessmentController', () => {
  beforeEach(() => {
    jest.spyOn(auth, 'getAccountId').mockResolvedValue('mockAccountId');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAssessment', () => {
    it('should retrieve an assessment and send a 200 status', async () => {
      const req = mockRequest(
        {},
        { assessmentId: '1' },
        { authorization: 'user-id' }
      );
      const res = mockResponse();
      const mockAssessment = { id: '1', name: 'Test Assessment' };

      jest
        .spyOn(assessmentService, 'getAssessmentById')
        .mockResolvedValue(mockAssessment as any);

      await getAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAssessment);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        {},
        { assessmentId: '1' },
        { authorization: 'user-id' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'getAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await getAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle errors when getting assessment', async () => {
      const req = mockRequest(
        {},
        { assessmentId: '1' },
        { authorization: 'user-id' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'getAssessmentById')
        .mockRejectedValue(new Error('Error retrieving assessment'));

      await getAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve assessment',
      });
    });

    it('should handle missing authorization header', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });
  });

  describe('uploadResults', () => {
    it('should upload assessment results and send a 200 status', async () => {
      const req = mockRequest({ items: [] }, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'uploadAssessmentResultsById')
        .mockResolvedValue(undefined);

      await uploadResults(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Results uploaded successfully',
      });
    });

    it('should handle not found error when uploading results', async () => {
      const req = mockRequest({ items: [] }, { assessmentId: '1' });
      const res = mockResponse();
      const error = new NotFoundError('Assessment not found');

      jest
        .spyOn(assessmentService, 'uploadAssessmentResultsById')
        .mockRejectedValue(error);

      await uploadResults(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle errors when uploading results', async () => {
      const req = mockRequest({ items: [] }, { assessmentId: '1' });
      const res = mockResponse();
      const error = new Error('Upload failed');

      jest
        .spyOn(assessmentService, 'uploadAssessmentResultsById')
        .mockRejectedValue(error);

      await uploadResults(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to upload results',
      });
    });
  });

  describe('updateResultMarker', () => {
    it('should update a result marker and send a 200 status', async () => {
      const req = mockRequest(
        { markerId: 'marker-id' },
        { assessmentId: '1', resultId: 'result-id' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentResultMarkerById')
        .mockResolvedValue(undefined);

      await updateResultMarker(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Marker updated successfully',
      });
    });

    it('should handle NotFoundError when updating a result marker', async () => {
      const req = mockRequest(
        { markerId: 'marker-id' },
        { assessmentId: '1', resultId: 'result-id' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentResultMarkerById')
        .mockRejectedValue(new NotFoundError('Result not found'));

      await updateResultMarker(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Result not found' });
    });

    it('should handle errors when updating result marker', async () => {
      const req = mockRequest(
        { markerId: 'marker-id' },
        { assessmentId: '1', resultId: 'result-id' }
      );
      const res = mockResponse();
      const error = new Error('Update failed');

      jest
        .spyOn(assessmentService, 'updateAssessmentResultMarkerById')
        .mockRejectedValue(error);

      await updateResultMarker(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update result marker',
      });
    });
  });
});
