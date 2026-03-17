import type { Request, Response } from 'express';
import {
  getPeerReviewCommentsById,
  addPeerReviewComment,
  updatePeerReviewComment,
  deletePeerReviewComment,
  flagPeerReviewComment,
} from '../../controllers/peerReviewCommentsController';
import {
  getPeerReviewCommentsByAssignmentId,
  addPeerReviewCommentByAssignmentId,
  updatePeerReviewCommentById,
  deletePeerReviewCommentById,
  flagPeerReviewCommentById,
} from '../../services/peerReviewCommentsService';
import { verifyRequestPermission, verifyRequestUser } from '../../utils/auth';
import { handleError } from '../../utils/error';
import { MissingAuthorizationError } from '../../services/errors';

jest.mock('../../services/peerReviewCommentsService', () => ({
  getPeerReviewCommentsByAssignmentId: jest.fn(),
  addPeerReviewCommentByAssignmentId: jest.fn(),
  updatePeerReviewCommentById: jest.fn(),
  deletePeerReviewCommentById: jest.fn(),
  flagPeerReviewCommentById: jest.fn(),
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

describe('peerReviewCommentsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPeerReviewCommentsById', () => {
    it('returns 200 with comments', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (getPeerReviewCommentsByAssignmentId as jest.Mock).mockResolvedValue([
        { _id: 'c1' },
      ]);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await getPeerReviewCommentsById(req, res);

      expect(verifyRequestUser).toHaveBeenCalledWith(req);
      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Student',
        []
      );
      expect(getPeerReviewCommentsByAssignmentId).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ _id: 'c1' }]);
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({ params: { peerReviewAssignmentId: 'a1' } as any });
      const res = makeRes();

      await getPeerReviewCommentsById(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to get peer review comments'
      );
    });
  });

  describe('addPeerReviewComment', () => {
    it('returns 201 with created comment', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (addPeerReviewCommentByAssignmentId as jest.Mock).mockResolvedValue({
        _id: 'c1',
      });

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1' } as any,
        body: {
          comment: {
            filePath: 'x.ts',
            startLine: 1,
            endLine: 1,
            comment: 'hi',
          },
          submissionId: 's1',
        },
      });
      const res = makeRes();

      await addPeerReviewComment(req, res);

      expect(addPeerReviewCommentByAssignmentId).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1',
        's1',
        { filePath: 'x.ts', startLine: 1, endLine: 1, comment: 'hi' }
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'c1' });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1' } as any,
      });
      const res = makeRes();

      await addPeerReviewComment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to add peer review comment'
      );
    });
  });

  describe('updatePeerReviewComment', () => {
    it('returns 200 on success', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (updatePeerReviewCommentById as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1', commentId: 'c1' } as any,
        body: { comment: 'updated', submissionId: 's1' },
      });
      const res = makeRes();

      await updatePeerReviewComment(req, res);

      expect(updatePeerReviewCommentById).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1',
        'c1',
        'updated',
        's1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer review comment updated successfully',
      });
    });

    it('returns 400 if comment text missing/invalid (does not call service)', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1', commentId: 'c1' } as any,
        body: { comment: null, submissionId: 's1' },
      });
      const res = makeRes();

      await updatePeerReviewComment(req, res);

      expect(updatePeerReviewCommentById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Comment text is required',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (updatePeerReviewCommentById as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1', commentId: 'c1' } as any,
        body: { comment: 'updated', submissionId: 's1' },
      });
      const res = makeRes();

      await updatePeerReviewComment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to update peer review comment'
      );
    });
  });

  describe('deletePeerReviewComment', () => {
    it('returns 200 on success', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (deletePeerReviewCommentById as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1', commentId: 'c1' } as any,
        body: { submissionId: 's1' },
      });
      const res = makeRes();

      await deletePeerReviewComment(req, res);

      expect(deletePeerReviewCommentById).toHaveBeenCalledWith(
        'u1',
        'Student',
        'a1',
        'c1',
        's1'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer review comment deleted successfully',
      });
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { peerReviewAssignmentId: 'a1', commentId: 'c1' } as any,
        body: { submissionId: 's1' },
      });
      const res = makeRes();

      await deletePeerReviewComment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to delete peer review comment'
      );
    });
  });

  describe('flagPeerReviewComment', () => {
    it('returns 200 on success', async () => {
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'TA',
      });
      (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
      (flagPeerReviewCommentById as jest.Mock).mockResolvedValue(undefined);

      const req = makeReq({
        params: { commentId: 'c1' } as any,
        body: { flagStatus: true, flagReason: 'spam' },
      });
      const res = makeRes();

      await flagPeerReviewComment(req, res);

      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'TA',
        expect.any(Array)
      );

      expect(flagPeerReviewCommentById).toHaveBeenCalledWith(
        'u1',
        'TA',
        'c1',
        true,
        'spam'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Peer review comment flagged successfully',
      });
    });

    it('rejects students before calling the service', async () => {
      const err = new MissingAuthorizationError(
        'Access denied, insufficient permissions'
      );
      (verifyRequestUser as jest.Mock).mockResolvedValue({
        account: { _id: 'acc1' },
        userCourseRole: 'Student',
      });
      (verifyRequestPermission as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { commentId: 'c1' } as any,
        body: { flagStatus: true, flagReason: 'spam' },
      });
      const res = makeRes();

      await flagPeerReviewComment(req, res);

      expect(verifyRequestPermission).toHaveBeenCalledWith(
        'acc1',
        'Student',
        expect.arrayContaining(['Faculty member', 'Teaching assistant'])
      );
      expect(flagPeerReviewCommentById).not.toHaveBeenCalled();
      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to flag peer review comment'
      );
    });

    it('calls handleError on failure', async () => {
      const err = new Error('boom');
      (verifyRequestUser as jest.Mock).mockRejectedValue(err);

      const req = makeReq({
        params: { commentId: 'c1' } as any,
        body: { flagStatus: true, flagReason: 'spam' },
      });
      const res = makeRes();

      await flagPeerReviewComment(req, res);

      expect(handleError).toHaveBeenCalledWith(
        res,
        err,
        'Failed to flag peer review comment'
      );
    });
  });
});
