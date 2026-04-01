import type { Request, Response } from 'express';
import {
  getAllPeerReviews,
  getPeerReviewInfo,
  getPeerReviewProgressOverview,
  deletePeerReview,
  updatePeerReview,
  getUnassignedReviewersInfo,
  startPeerReview,
} from '../../controllers/peerReviewController';
import {
  getAllPeerReviewsyId,
  getPeerReviewInfoById,
  getPeerReviewProgressOverviewById,
  deletePeerReviewById,
  updatePeerReviewById,
  getUnassignedReviewers,
  startPeerReviewNow,
} from '../../services/peerReviewService';
import { verifyRequestUser, verifyRequestPermission } from '../../utils/auth';
import { handleError } from '../../utils/error';

jest.mock('../../services/peerReviewService', () => ({
  getAllPeerReviewsyId: jest.fn(),
  getPeerReviewInfoById: jest.fn(),
  getPeerReviewProgressOverviewById: jest.fn(),
  deletePeerReviewById: jest.fn(),
  updatePeerReviewById: jest.fn(),
  getUnassignedReviewers: jest.fn(),
  startPeerReviewNow: jest.fn(),
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
    ...overrides,
  }) as unknown as Request;

describe('peerReviewController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllPeerReviews', () => {
    it('returns 200 with peer reviews', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });

      (getAllPeerReviewsyId as jest.Mock).mockResolvedValue([{ _id: 'pr1' }]);

      const req = makeReq({ params: { courseId: 'c1' } as any });
      const res = makeRes();

      await getAllPeerReviews(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(getAllPeerReviewsyId).toHaveBeenCalledWith('c1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: 'pr1' }]);
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { courseId: 'c1' } as any });
      const res = makeRes();

      await getAllPeerReviews(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get peer reviews'
      );
    });
  });

  describe('getPeerReviewInfo', () => {
    it('returns 200 with peer review info', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getPeerReviewInfoById as jest.Mock).mockResolvedValue({ title: 'PR' });

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await getPeerReviewInfo(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Student',
        []
      );
      expect(getPeerReviewInfoById).toHaveBeenCalledWith(
        'u1',
        'Student',
        'c1',
        'pr1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ title: 'PR' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await getPeerReviewInfo(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get peer review info'
      );
    });
  });

  describe('deletePeerReview', () => {
    it('returns 200 with success message', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (deletePeerReviewById as jest.Mock).mockResolvedValue({
        deletedPeerReviewTitle: 'PR Title',
      });

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await deletePeerReview(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(deletePeerReviewById).toHaveBeenCalledWith('pr1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'PR Title deleted successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await deletePeerReview(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to delete peer review'
      );
    });
  });

  describe('updatePeerReview', () => {
    it('returns 200 with success message', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (updatePeerReviewById as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { peerReviewId: 'pr1' } as any,
        body: { title: 'Updated' },
      });
      const res = makeRes();

      await updatePeerReview(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(updatePeerReviewById).toHaveBeenCalledWith('pr1', {
        title: 'Updated',
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer review settings updated successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await updatePeerReview(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to update peer review'
      );
    });
  });

  describe('getPeerReviewProgressOverview', () => {
    it('returns 200 with progress overview for Faculty', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getPeerReviewProgressOverviewById as jest.Mock).mockResolvedValue({
        peerReviewId: 'pr1',
        scope: 'course',
        submissions: { total: 5, notStarted: 2, draft: 1, submitted: 2, started: 3 },
        grading: { total: 5, graded: 1, inProgress: 1, notYetGraded: 2, toBeAssigned: 1 },
      });

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await getPeerReviewProgressOverview(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(getPeerReviewProgressOverviewById).toHaveBeenCalledWith(
        'u1',
        'Faculty',
        'c1',
        'pr1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ peerReviewId: 'pr1', scope: 'course' })
      );
    });

    it('returns 200 with supervisingTeams scope for TA', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc2' },
        userCourseRole: 'TA',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u2');
      (getPeerReviewProgressOverviewById as jest.Mock).mockResolvedValue({
        peerReviewId: 'pr1',
        scope: 'supervisingTeams',
        submissions: { total: 2, notStarted: 1, draft: 0, submitted: 1, started: 1 },
        grading: { total: 2, graded: 0, inProgress: 0, notYetGraded: 2, toBeAssigned: 0 },
      });

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await getPeerReviewProgressOverview(req, res);

      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc2',
        'TA',
        expect.any(Array)
      );
      expect(getPeerReviewProgressOverviewById).toHaveBeenCalledWith(
        'u2',
        'TA',
        'c1',
        'pr1'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'supervisingTeams' })
      );
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { courseId: 'c1', peerReviewId: 'pr1' } as any,
      });
      const res = makeRes();

      await getPeerReviewProgressOverview(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get peer review progress overview'
      );
    });
  });

  describe('getUnassignedReviewersInfo', () => {
    it('returns 200 with unassigned reviewers info', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getUnassignedReviewers as jest.Mock).mockResolvedValue({
        peerReviewId: 'pr1',
        unassignedReviewers: [{ _id: 'u2', name: 'John' }],
      });

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await getUnassignedReviewersInfo(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(getUnassignedReviewers).toHaveBeenCalledWith('pr1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ peerReviewId: 'pr1' })
      );
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await getUnassignedReviewersInfo(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get unassigned reviewers info'
      );
    });
  });

  describe('startPeerReview', () => {
    it('returns 200 with success message', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (startPeerReviewNow as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await startPeerReview(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(startPeerReviewNow).toHaveBeenCalledWith('pr1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer review started successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { peerReviewId: 'pr1' } as any });
      const res = makeRes();

      await startPeerReview(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to start peer review'
      );
    });
  });
});
