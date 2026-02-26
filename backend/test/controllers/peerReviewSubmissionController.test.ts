import type { Request, Response } from 'express';
import {
  getSubmissionsForAssignment,
  getMySubmission,
  putMySubmissionDraft,
  postSubmitMySubmission,
} from '../../controllers/peerReviewSubmissionController';
import {
  getSubmissionsByAssignmentId,
  getMySubmissionForAssignmentId,
  updateMySubmissionDraft,
  submitMySubmission,
} from '../../services/peerReviewSubmissionService';
import { verifyRequestUser, verifyRequestPermission } from '../../utils/auth';
import { handleError } from '../../utils/error';

jest.mock('../../services/peerReviewSubmissionService', () => ({
  getSubmissionsByAssignmentId: jest.fn(),
  getMySubmissionForAssignmentId: jest.fn(),
  updateMySubmissionDraft: jest.fn(),
  submitMySubmission: jest.fn(),
}));

jest.mock('../../utils/auth', () => ({
  verifyRequestUser: jest.fn(),
  verifyRequestPermission: jest.fn(),
}));

jest.mock('../../utils/error', () => ({
  handleError: jest.fn(),
}));

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const makeReq = (overrides: Partial<Request> = {}) =>
  ({
    params: {},
    body: {},
    query: {},
    ...overrides,
  }) as unknown as Request;

describe('peerReviewSubmissionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubmissionsForAssignment', () => {
    it('returns 200 with submissions', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getSubmissionsByAssignmentId as jest.Mock).mockResolvedValue([
        { _id: 's1' },
      ]);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getSubmissionsForAssignment(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Student',
        []
      );
      expect(getSubmissionsByAssignmentId).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: 's1' }]);
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getSubmissionsForAssignment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get submissions for assignment'
      );
    });
  });

  describe('getMySubmission', () => {
    it('returns 200 with my submission', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getMySubmissionForAssignmentId as jest.Mock).mockResolvedValue({
        _id: 's1',
      });

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getMySubmission(req, res);

      expect(getMySubmissionForAssignmentId).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: 's1' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getMySubmission(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get my submission'
      );
    });
  });

  describe('putMySubmissionDraft', () => {
    it('returns 200 with updated submission', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (updateMySubmissionDraft as jest.Mock).mockResolvedValue({
        _id: 's1',
        status: 'Draft',
      });

      const req = makeReq({
        params: { courseId: 'c1', assignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await putMySubmissionDraft(req, res);

      expect(updateMySubmissionDraft).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: 's1', status: 'Draft' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', assignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await putMySubmissionDraft(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to save submission draft'
      );
    });
  });

  describe('postSubmitMySubmission', () => {
    it('returns 200 with submitted submission', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (submitMySubmission as jest.Mock).mockResolvedValue({
        _id: 's1',
        status: 'Submitted',
      });

      const req = makeReq({
        params: { courseId: 'c1', assignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await postSubmitMySubmission(req, res);

      expect(submitMySubmission).toHaveBeenCalledWith('u1', 'Student', 'a1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: 's1', status: 'Submitted' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', assignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await postSubmitMySubmission(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to submit submission'
      );
    });
  });
});
