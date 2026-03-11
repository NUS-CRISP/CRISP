import type { Request, Response } from 'express';
import {
  getPeerReviewByAssessment,
  createPeerReviewAssessment,
  updatePeerReviewAssessment,
  deletePeerReviewAssessment,
  getPeerReviewSubmissionsForAssessment,
  getPeerReviewResultsForAssessment,
  getPeerReviewSubmissionForGrading,
  getPeerReviewGradingTaskForSubmission,
  startGradingTaskForFaculty,
  updatePeerReviewGradingTask,
  submitPeerReviewGradingTask,
  bulkAssignGraders,
  manualAssignGrader,
  manualUnassignGrader,
} from '../../controllers/peerReviewAssessmentController';
import {
  getPeerReviewByAssessmentId,
  getPeerReviewSubmissionsForAssessmentById,
  getPeerReviewResultsForAssessmentById,
  updatePeerReviewAssessmentById,
  deletePeerReviewAssessmentById,
  createPeerReviewAssessmentForCourse,
  getPeerReviewGradingDTO,
} from '../../services/peerReviewAssessmentService';
import {
  getGradingTaskForSubmissionById,
  startGradingTaskForFacultyById,
  submitGradingTaskById,
  updateGradingTaskById,
  bulkAssignGradersByAssessmentId,
  manualAssignGraderToSubmission,
  manualUnassignGraderFromSubmission,
} from '../../services/peerReviewGradingTaskService';
import { verifyRequestPermission, verifyRequestUser } from '../../utils/auth';
import { handleError } from '../../utils/error';

jest.mock('../../services/peerReviewAssessmentService', () => ({
  getPeerReviewByAssessmentId: jest.fn(),
  getPeerReviewSubmissionsForAssessmentById: jest.fn(),
  getPeerReviewResultsForAssessmentById: jest.fn(),
  updatePeerReviewAssessmentById: jest.fn(),
  deletePeerReviewAssessmentById: jest.fn(),
  createPeerReviewAssessmentForCourse: jest.fn(),
  getPeerReviewGradingDTO: jest.fn(),
}));

jest.mock('../../services/peerReviewGradingTaskService', () => ({
  getGradingTaskForSubmissionById: jest.fn(),
  startGradingTaskForFacultyById: jest.fn(),
  submitGradingTaskById: jest.fn(),
  updateGradingTaskById: jest.fn(),
  bulkAssignGradersByAssessmentId: jest.fn(),
  manualAssignGraderToSubmission: jest.fn(),
  manualUnassignGraderFromSubmission: jest.fn(),
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

const mockVerifiedUser = (role: string = 'Faculty') => {
  (verifyRequestUser as jest.Mock).mockResolvedValue({
    account: { _id: 'acc1' },
    userCourseRole: role,
  });
  (verifyRequestPermission as jest.Mock).mockResolvedValue('u1');
};

describe('peerReviewAssessmentController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets peer review by assessment', async () => {
    mockVerifiedUser('TA');
    (getPeerReviewByAssessmentId as jest.Mock).mockResolvedValue({ _id: 'pr1' });

    const req = makeReq({ params: { assessmentId: 'a1' } as any });
    const res = makeRes();

    await getPeerReviewByAssessment(req, res);

    expect(verifyRequestPermission).toHaveBeenCalledWith('acc1', 'TA', expect.any(Array));
    expect(getPeerReviewByAssessmentId).toHaveBeenCalledWith('a1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 'pr1' });
  });

  it('creates peer review assessment', async () => {
    mockVerifiedUser('Faculty');
    (createPeerReviewAssessmentForCourse as jest.Mock).mockResolvedValue({ _id: 'pr1' });

    const req = makeReq({
      params: { courseId: 'c1' } as any,
      body: { assessmentName: 'PRA' },
    });
    const res = makeRes();

    await createPeerReviewAssessment(req, res);

    expect(createPeerReviewAssessmentForCourse).toHaveBeenCalledWith('c1', { assessmentName: 'PRA' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: 'pr1' });
  });

  it('updates peer review assessment', async () => {
    mockVerifiedUser('Faculty');
    (updatePeerReviewAssessmentById as jest.Mock).mockResolvedValue(undefined);

    const req = makeReq({
      params: { assessmentId: 'a1' } as any,
      body: { assessmentName: 'Updated' },
    });
    const res = makeRes();

    await updatePeerReviewAssessment(req, res);

    expect(updatePeerReviewAssessmentById).toHaveBeenCalledWith('a1', { assessmentName: 'Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Peer review assessment updated successfully' });
  });

  it('deletes peer review assessment', async () => {
    mockVerifiedUser('Faculty');
    (deletePeerReviewAssessmentById as jest.Mock).mockResolvedValue({ deletedPeerReviewTitle: 'PR 1' });

    const req = makeReq({ params: { assessmentId: 'a1' } as any });
    const res = makeRes();

    await deletePeerReviewAssessment(req, res);

    expect(deletePeerReviewAssessmentById).toHaveBeenCalledWith('a1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'PR 1 deleted successfully' });
  });

  it('gets assessment submissions with explicit pagination', async () => {
    mockVerifiedUser('TA');
    (getPeerReviewSubmissionsForAssessmentById as jest.Mock).mockResolvedValue({ items: [] });

    const req = makeReq({
      params: { assessmentId: 'a1' } as any,
      query: { page: '2', limit: '50' } as any,
    });
    const res = makeRes();

    await getPeerReviewSubmissionsForAssessment(req, res);

    expect(getPeerReviewSubmissionsForAssessmentById).toHaveBeenCalledWith('a1', 'u1', 'TA', 2, 50);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it('gets assessment submissions with defaults', async () => {
    mockVerifiedUser('TA');
    (getPeerReviewSubmissionsForAssessmentById as jest.Mock).mockResolvedValue({ items: [] });

    const req = makeReq({
      params: { assessmentId: 'a1' } as any,
      query: {} as any,
    });
    const res = makeRes();

    await getPeerReviewSubmissionsForAssessment(req, res);

    expect(getPeerReviewSubmissionsForAssessmentById).toHaveBeenCalledWith('a1', 'u1', 'TA', 1, 20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it('gets assessment results with defaults', async () => {
    mockVerifiedUser('Faculty');
    (getPeerReviewResultsForAssessmentById as jest.Mock).mockResolvedValue({ items: [] });

    const req = makeReq({
      params: { assessmentId: 'a1' } as any,
      query: {} as any,
    });
    const res = makeRes();

    await getPeerReviewResultsForAssessment(req, res);

    expect(getPeerReviewResultsForAssessmentById).toHaveBeenCalledWith('a1', 'perStudent', 1, 20);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it('gets peer review submission grading dto', async () => {
    mockVerifiedUser('TA');
    (getPeerReviewGradingDTO as jest.Mock).mockResolvedValue({ submission: { _id: 's1' } });

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1' } as any,
    });
    const res = makeRes();

    await getPeerReviewSubmissionForGrading(req, res);

    expect(getPeerReviewGradingDTO).toHaveBeenCalledWith('u1', 'TA', 'a1', 's1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ submission: { _id: 's1' } });
  });

  it('gets grading task for submission', async () => {
    mockVerifiedUser('TA');
    (getGradingTaskForSubmissionById as jest.Mock).mockResolvedValue({ _id: 't1' });

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1' } as any,
    });
    const res = makeRes();

    await getPeerReviewGradingTaskForSubmission(req, res);

    expect(getGradingTaskForSubmissionById).toHaveBeenCalledWith('u1', 'TA', 'a1', 's1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 't1' });
  });

  it('starts grading task for faculty', async () => {
    mockVerifiedUser('Faculty');
    (startGradingTaskForFacultyById as jest.Mock).mockResolvedValue({ _id: 't1' });

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1' } as any,
    });
    const res = makeRes();

    await startGradingTaskForFaculty(req, res);

    expect(startGradingTaskForFacultyById).toHaveBeenCalledWith('u1', 'a1', 's1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 't1' });
  });

  it('updates grading task', async () => {
    mockVerifiedUser('TA');
    (updateGradingTaskById as jest.Mock).mockResolvedValue({ _id: 't1', score: 9 });

    const req = makeReq({
      params: { taskId: 't1' } as any,
      body: { score: 9 },
    });
    const res = makeRes();

    await updatePeerReviewGradingTask(req, res);

    expect(updateGradingTaskById).toHaveBeenCalledWith('u1', 't1', { score: 9 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 't1', score: 9 });
  });

  it('submits grading task', async () => {
    mockVerifiedUser('TA');
    (submitGradingTaskById as jest.Mock).mockResolvedValue({ _id: 't1', status: 'Completed' });

    const req = makeReq({
      params: { taskId: 't1' } as any,
    });
    const res = makeRes();

    await submitPeerReviewGradingTask(req, res);

    expect(submitGradingTaskById).toHaveBeenCalledWith('u1', 't1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ _id: 't1', status: 'Completed' });
  });

  it('bulk assigns graders', async () => {
    mockVerifiedUser('Faculty');
    (bulkAssignGradersByAssessmentId as jest.Mock).mockResolvedValue({ assignedCount: 3 });

    const req = makeReq({
      params: { courseId: 'c1', assessmentId: 'a1' } as any,
      body: { numGradersPerSubmission: 2, allowSupervisingTAs: true },
    });
    const res = makeRes();

    await bulkAssignGraders(req, res);

    expect(bulkAssignGradersByAssessmentId).toHaveBeenCalledWith('c1', 'a1', 2, true);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ assignedCount: 3 });
  });

  it('rejects invalid bulk grader count', async () => {
    mockVerifiedUser('Faculty');

    const req = makeReq({
      params: { courseId: 'c1', assessmentId: 'a1' } as any,
      body: { numGradersPerSubmission: 0, allowSupervisingTAs: false },
    });
    const res = makeRes();

    await bulkAssignGraders(req, res);

    expect(bulkAssignGradersByAssessmentId).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'numGradersPerSubmission must be >= 1' });
  });

  it('manually assigns grader', async () => {
    mockVerifiedUser('Faculty');
    (manualAssignGraderToSubmission as jest.Mock).mockResolvedValue({ _id: 't1' });

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1' } as any,
      body: { graderId: 'g1' },
    });
    const res = makeRes();

    await manualAssignGrader(req, res);

    expect(manualAssignGraderToSubmission).toHaveBeenCalledWith('a1', 's1', 'g1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: 't1' });
  });

  it('rejects missing grader id on manual assign', async () => {
    mockVerifiedUser('Faculty');

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1' } as any,
      body: {},
    });
    const res = makeRes();

    await manualAssignGrader(req, res);

    expect(manualAssignGraderToSubmission).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'graderId is required' });
  });

  it('manually unassigns grader', async () => {
    mockVerifiedUser('Faculty');
    (manualUnassignGraderFromSubmission as jest.Mock).mockResolvedValue({ deleted: true });

    const req = makeReq({
      params: { assessmentId: 'a1', submissionId: 's1', graderId: 'g1' } as any,
    });
    const res = makeRes();

    await manualUnassignGrader(req, res);

    expect(manualUnassignGraderFromSubmission).toHaveBeenCalledWith('a1', 's1', 'g1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('routes controller errors through handleError', async () => {
    const err = new Error('boom');
    (verifyRequestUser as jest.Mock).mockRejectedValue(err);

    const req = makeReq({ params: { assessmentId: 'a1' } as any });
    const res = makeRes();

    await getPeerReviewByAssessment(req, res);
    await createPeerReviewAssessment(req, res);
    await updatePeerReviewAssessment(req, res);
    await deletePeerReviewAssessment(req, res);
    await getPeerReviewSubmissionsForAssessment(req, res);
    await getPeerReviewResultsForAssessment(req, res);
    await getPeerReviewSubmissionForGrading(req, res);
    await getPeerReviewGradingTaskForSubmission(req, res);
    await startGradingTaskForFaculty(req, res);
    await updatePeerReviewGradingTask(req, res);
    await submitPeerReviewGradingTask(req, res);
    await bulkAssignGraders(req, res);
    await manualAssignGrader(req, res);
    await manualUnassignGrader(req, res);

    expect(handleError).toHaveBeenNthCalledWith(1, res, err, 'Failed to get peer review assignment');
    expect(handleError).toHaveBeenNthCalledWith(2, res, err, 'Failed to create peer review');
    expect(handleError).toHaveBeenNthCalledWith(3, res, err, 'Failed to update peer review: ');
    expect(handleError).toHaveBeenNthCalledWith(4, res, err, 'Failed to delete peer review: ');
    expect(handleError).toHaveBeenNthCalledWith(5, res, err, 'Failed to get peer review submissions for assessment');
    expect(handleError).toHaveBeenNthCalledWith(6, res, err, 'Failed to get peer review results for assessment');
    expect(handleError).toHaveBeenNthCalledWith(7, res, err, 'Failed to get peer review submission for grading');
    expect(handleError).toHaveBeenNthCalledWith(8, res, err, 'Failed to get grading task for submission');
    expect(handleError).toHaveBeenNthCalledWith(9, res, err, 'Failed to start grading task for faculty');
    expect(handleError).toHaveBeenNthCalledWith(10, res, err, 'Failed to update peer review grading task');
    expect(handleError).toHaveBeenNthCalledWith(11, res, err, 'Failed to submit peer review grading task');
    expect(handleError).toHaveBeenNthCalledWith(12, res, err, 'Failed to bulk assign graders');
    expect(handleError).toHaveBeenNthCalledWith(13, res, err, 'Failed to manually assign grader');
    expect(handleError).toHaveBeenNthCalledWith(14, res, err, 'Failed to manually unassign grader');
  });
});
