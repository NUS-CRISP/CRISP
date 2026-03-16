import type { Request, Response } from 'express';
import {
  getPeerReviewAssignment,
  postAssignPeerReviews,
  postAddManualAssignment,
  deleteManualAssignment,
} from '../../controllers/peerReviewAssignmentController';
import {
  getPeerReviewAssignmentWithViewContext,
  assignPeerReviews,
  addManualAssignment,
  removeManualAssignment,
} from '../../services/peerReviewAssignmentService';
import { verifyRequestUser, verifyRequestPermission } from '../../utils/auth';
import { handleError } from '../../utils/error';

jest.mock('../../services/peerReviewAssignmentService', () => ({
  getPeerReviewAssignmentById: jest.fn(),
  getPeerReviewAssignmentWithViewContext: jest.fn(),
  assignPeerReviews: jest.fn(),
  addManualAssignment: jest.fn(),
  removeManualAssignment: jest.fn(),
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

describe('peerReviewAssignmentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeerReviewAssignment', () => {
    it('returns 200 with assignment', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getPeerReviewAssignmentWithViewContext as jest.Mock).mockResolvedValue({
        assignment: {
          _id: 'a1',
          toObject: () => ({ _id: 'a1' }),
        },
        viewContext: { canEdit: false },
      });

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getPeerReviewAssignment(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Student',
        []
      );
      expect(getPeerReviewAssignmentWithViewContext).toHaveBeenCalledWith(
        'Student',
        'u1',
        'a1',
        'c1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ _id: 'a1', viewContext: { canEdit: false } });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getPeerReviewAssignment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get peer review assignment'
      );
    });
  });

  describe('postAssignPeerReviews', () => {
    it('returns 200 on success', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (assignPeerReviews as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
        body: {
          reviewsPerReviewer: 2,
          allowSameTA: true,
          groupsToAssign: ['t1'],
        },
      });
      const res = makeRes();

      await postAssignPeerReviews(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );

      expect(assignPeerReviews).toHaveBeenCalledWith(
        'c1',
        'pr1',
        'u1',
        2,
        true,
        ['t1']
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer reviews assigned successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await postAssignPeerReviews(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to assign peer reviews'
      );
    });
  });

  describe('postAddManualAssignment', () => {
    it('returns 200 on success', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (addManualAssignment as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
        body: { revieweeId: 't1', reviewerId: 'r1', isTA: true },
      });
      const res = makeRes();

      await postAddManualAssignment(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );

      expect(addManualAssignment).toHaveBeenCalledWith(
        'c1',
        'pr1',
        't1',
        'r1',
        'u1',
        true
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reviewer assigned to reviewee successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await postAddManualAssignment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to add reviewer to reviewee'
      );
    });
  });

  describe('deleteManualAssignment', () => {
    it('returns 200 on success (isTA=true)', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (removeManualAssignment as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: {
          courseId: 'c1',
          peerReviewId: 'pr1',
          revieweeId: 't1',
          reviewerId: 'r1',
        } as any,
        query: { isTA: 'true' } as any,
      });
      const res = makeRes();

      await deleteManualAssignment(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );

      expect(removeManualAssignment).toHaveBeenCalledWith(
        'pr1',
        't1',
        'r1',
        true
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reviewer removed from reviewee successfully',
      });
    });

    it('returns 200 on success (isTA=false when query missing)', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (removeManualAssignment as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: {
          courseId: 'c1',
          peerReviewId: 'pr1',
          revieweeId: 't1',
          reviewerId: 'r1',
        } as any,
        query: {} as any,
      });
      const res = makeRes();

      await deleteManualAssignment(req, res);

      expect(removeManualAssignment).toHaveBeenCalledWith(
        'pr1',
        't1',
        'r1',
        false
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: {
          courseId: 'c1',
          peerReviewId: 'pr1',
          revieweeId: 't1',
          reviewerId: 'r1',
        } as any,
        query: { isTA: 'false' } as any,
      });
      const res = makeRes();

      await deleteManualAssignment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to remove reviewer from reviewee'
      );
    });
  });
});
