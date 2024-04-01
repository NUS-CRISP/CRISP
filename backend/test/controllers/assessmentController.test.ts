import { Request, Response } from 'express';
import * as assessmentService from '../../services/assessmentService';
import * as googleService from '../../services/googleService';
import * as auth from '../../utils/auth';
import {
  getAssessment,
  uploadResults,
  updateResultMarker,
  updateAssessment,
  deleteAssessment,
  getSheetData,
  fetchNewSheetData,
} from '../../controllers/assessmentController';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../../services/errors';
import { SheetData } from '@models/SheetData';

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

  describe('updateAssessment', () => {
    it('should update an assessment and send a 200 status', async () => {
      const req = mockRequest(
        { name: 'Test Assessment' },
        { assessmentId: '1' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentById')
        .mockResolvedValue(undefined);

      await updateAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest(
        { name: 'Test Assessment' },
        { assessmentId: '1' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await updateAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle BadRequestError and send a 400 status', async () => {
      const req = mockRequest(
        { name: 'Test Assessment' },
        { assessmentId: '1' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentById')
        .mockRejectedValue(new BadRequestError('Invalid data'));

      await updateAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid data' });
    });

    it('should handle missing authorization header', async () => {
      const req = mockRequest(
        { name: 'Test Assessment' },
        { assessmentId: '1' }
      );
      const res = mockResponse();

      jest
        .spyOn(auth, 'getAccountId')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await updateAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle errors when updating assessment', async () => {
      const req = mockRequest(
        { name: 'Test Assessment' },
        { assessmentId: '1' }
      );
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'updateAssessmentById')
        .mockRejectedValue(new Error('Error updating assessment'));

      await updateAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to update assessment',
      });
    });
  });

  describe('deleteAssessment', () => {
    it('should delete an assessment and send a 200 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'deleteAssessmentById')
        .mockResolvedValue(undefined);

      await deleteAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Assessment deleted successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'deleteAssessmentById')
        .mockRejectedValue(new NotFoundError('Assessment not found'));

      await deleteAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });

    it('should handle errors when deleting assessment', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(assessmentService, 'deleteAssessmentById')
        .mockRejectedValue(new Error('Error deleting assessment'));

      await deleteAssessment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to delete Assessment',
      });
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

  describe('getSheetData', () => {
    it('should get sheet data and send a 200 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();
      const mockSheetData = { data: 'sheet data' };

      jest
        .spyOn(googleService, 'getAssessmentSheetData')
        .mockResolvedValue(mockSheetData as unknown as SheetData);

      await getSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSheetData);
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'getAssessmentSheetData')
        .mockRejectedValue(new NotFoundError('Sheet data not found'));

      await getSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Sheet data not found' });
    });

    it('should handle MissingAuthorizationError and send a 400 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'getAssessmentSheetData')
        .mockRejectedValue(
          new MissingAuthorizationError('Missing authorization')
        );

      await getSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization' });
    });

    it('should handle errors when getting sheet data', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'getAssessmentSheetData')
        .mockRejectedValue(new Error('Failed to get sheets data'));

      await getSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to get sheets data',
      });
    });
  });

  describe('fetchNewSheetData', () => {
    it('should fetch new sheet data and send a 201 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'fetchAndSaveSheetData')
        .mockResolvedValue(undefined);

      await fetchNewSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sheets Updated successfully',
      });
    });

    it('should handle NotFoundError and send a 404 status', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'fetchAndSaveSheetData')
        .mockRejectedValue(new NotFoundError('Sheet data not found'));

      await fetchNewSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Sheet data not found' });
    });

    it('should handle errors when fetching new sheet data', async () => {
      const req = mockRequest({}, { assessmentId: '1' });
      const res = mockResponse();

      jest
        .spyOn(googleService, 'fetchAndSaveSheetData')
        .mockRejectedValue(new Error('Failed to fetch new sheets data'));

      await fetchNewSheetData(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to fetch new sheets data',
      });
    });
  });
});
