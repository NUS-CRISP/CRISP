import type { Request, Response } from 'express';
import {
  getAllPeerReviews,
  getPeerReviewInfo,
  createPeerReview,
  deletePeerReview,
  updatePeerReview,
} from '../../controllers/peerReviewController';
import {
  getAllPeerReviewsyId,
  getPeerReviewInfoById,
  createPeerReviewById,
  deletePeerReviewById,
  updatePeerReviewById,
} from '../../services/peerReviewService';
import { verifyRequestUser, verifyRequestPermission } from '../../utils/auth';
import { handleError } from '../../utils/error';

jest.mock('../../services/peerReviewService', () => ({
  getAllPeerReviewsyId: jest.fn(),
  getPeerReviewInfoById: jest.fn(),
  createPeerReviewById: jest.fn(),
  deletePeerReviewById: jest.fn(),
  updatePeerReviewById: jest.fn(),
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

  describe('createPeerReview', () => {
    it('returns 201 with created peer review', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Faculty',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (createPeerReviewById as jest.Mock).mockResolvedValue({ _id: 'pr1' });

      const req = makeReq({
        params: { courseId: 'c1' } as any,
        body: { title: 'New PR' },
      });
      const res = makeRes();

      await createPeerReview(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      // just ensure it enforces faculty gating via verifyRequestPermission call
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Faculty',
        expect.any(Array)
      );
      expect(createPeerReviewById).toHaveBeenCalledWith('c1', {
        title: 'New PR',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'pr1' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { courseId: 'c1' } as any });
      const res = makeRes();

      await createPeerReview(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to create peer review'
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
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
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
      expect(updatePeerReviewById).toHaveBeenCalledWith('pr1', 'u1', {
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
});
