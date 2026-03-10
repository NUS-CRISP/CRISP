import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';
import PeerReviewGradingTaskModel from '../../models/PeerReviewGradingTask';

import {
  startGradingTaskForFacultyById,
  getGradingTaskForSubmissionById,
  updateGradingTaskById,
  submitGradingTaskById,
  bulkAssignGradersByAssessmentId,
  manualAssignGraderToSubmission,
  manualUnassignGraderFromSubmission,
} from '../../services/peerReviewGradingTaskService';

import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../../services/errors';

let mongoServer: MongoMemoryServer;

const oid = () => new Types.ObjectId();

const makeCourse = async (overrides: Partial<any> = {}) =>
  new CourseModel({
    name: 'Course',
    code: 'CS1000',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
    ...overrides,
  }).save();

const makeTeamSet = async (courseId: Types.ObjectId) =>
  new TeamSetModel({ name: 'TS', course: courseId }).save();

const makeUser = async (name: string) =>
  new UserModel({ name, identifier: `id-${name}-${Date.now()}-${Math.random()}` }).save();

const makeAssessment = async (
  courseId: Types.ObjectId,
  teamSetId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new InternalAssessmentModel({
    course: courseId,
    assessmentType: 'peer_review',
    assessmentName: 'PRA',
    description: 'desc',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSetId,
    areSubmissionsEditable: false,
    isReleased: false,
    questions: [],
    results: [],
    ...overrides,
  }).save();

const makePeerReview = async (
  courseId: Types.ObjectId,
  teamSetId: Types.ObjectId,
  assessmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const now = Date.now();
  const desired = overrides.status as 'Active' | 'Closed' | 'Upcoming' | undefined;
  const startDate =
    desired === 'Closed'
      ? new Date(now - 120_000)
      : desired === 'Upcoming'
        ? new Date(now + 60_000)
        : new Date(now - 60_000);
  const endDate =
    desired === 'Closed'
      ? new Date(now - 60_000)
      : desired === 'Upcoming'
        ? new Date(now + 120_000)
        : new Date(now + 60_000);

  return new PeerReviewModel({
    course: courseId,
    internalAssessmentId: assessmentId,
    teamSetId,
    title: 'PR',
    description: 'desc',
    startDate,
    endDate,
    reviewerType: 'Individual',
    taAssignments: true,
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 3,
    ...overrides,
  }).save();
};

const makeTeam = async (teamSetId: Types.ObjectId, overrides: Partial<any> = {}) =>
  new TeamModel({
    teamSet: teamSetId,
    number: overrides.number ?? Math.floor(Math.random() * 1000) + 1,
    members: overrides.members ?? [],
    TA: overrides.TA,
    ...overrides,
  }).save();

const makeAssignment = async (
  peerReviewId: Types.ObjectId,
  revieweeTeamId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new PeerReviewAssignmentModel({
    peerReviewId,
    reviewee: revieweeTeamId,
    repoName: 'Repo',
    repoUrl: 'http://example.com/repo.git',
    ...overrides,
  }).save();

const makeSubmission = async (
  peerReviewId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const reviewerKind = overrides.reviewerKind ?? 'Student';
  const base: any = {
    peerReviewId,
    peerReviewAssignmentId: assignmentId,
    reviewerKind,
    status: overrides.status ?? 'Draft',
  };
  if (reviewerKind === 'Team') base.reviewerTeamId = overrides.reviewerTeamId ?? oid();
  else base.reviewerUserId = overrides.reviewerUserId ?? oid();

  return new PeerReviewSubmissionModel({ ...base, ...overrides }).save();
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewGradingTaskModel.deleteMany({});
  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await InternalAssessmentModel.deleteMany({});
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewGradingTaskService', () => {
  it('startGradingTaskForFacultyById creates task and returns existing on second call', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    const faculty = await makeUser('faculty');

    const t1 = await startGradingTaskForFacultyById(
      faculty._id.toString(),
      assessment._id.toString(),
      submission._id.toString()
    );
    const t2 = await startGradingTaskForFacultyById(
      faculty._id.toString(),
      assessment._id.toString(),
      submission._id.toString()
    );

    expect(t1._id.toString()).toBe(t2._id.toString());
  });

  it('startGradingTaskForFacultyById rejects unsubmitted review', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Draft' });

    await expect(
      startGradingTaskForFacultyById(oid().toString(), assessment._id.toString(), submission._id.toString())
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('getGradingTaskForSubmissionById enforces TA assignment', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    const ta = await makeUser('ta');

    await expect(
      getGradingTaskForSubmissionById(
        ta._id.toString(),
        COURSE_ROLE.TA,
        assessment._id.toString(),
        submission._id.toString()
      )
    ).rejects.toBeInstanceOf(MissingAuthorizationError);
  });

  it('updateGradingTaskById validates grader + score and transitions Assigned -> InProgress', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    const grader = await makeUser('grader');
    const other = await makeUser('other');

    const task = await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: grader._id,
      status: 'Assigned',
    }).save();

    await expect(
      updateGradingTaskById(other._id.toString(), task._id.toString(), { score: 5 })
    ).rejects.toBeInstanceOf(MissingAuthorizationError);

    await expect(
      updateGradingTaskById(grader._id.toString(), task._id.toString(), { score: -1 })
    ).rejects.toBeInstanceOf(BadRequestError);

    const updated = await updateGradingTaskById(grader._id.toString(), task._id.toString(), {
      score: 7,
      feedback: 'good',
    });

    expect(updated.status).toBe('InProgress');
    expect(updated.score).toBe(7);
  });

  it('submitGradingTaskById requires score and marks Completed', async () => {
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    const grader = await makeUser('grader');
    const task = await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: grader._id,
      status: 'InProgress',
    }).save();

    await expect(
      submitGradingTaskById(grader._id.toString(), task._id.toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    task.score = 8;
    await task.save();

    const done = await submitGradingTaskById(grader._id.toString(), task._id.toString());
    expect(done.status).toBe('Completed');
    expect(done.gradedAt).toBeTruthy();
  });

  it('bulkAssignGradersByAssessmentId assigns tasks and avoids TA self-grading', async () => {
    const ta1 = await makeUser('ta1');
    const ta2 = await makeUser('ta2');
    const course = await makeCourse({ TAs: [ta1._id, ta2._id] });
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);

    const studentSub = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: oid(),
    });

    await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: ta1._id,
    });

    const res = await bulkAssignGradersByAssessmentId(
      course._id.toString(),
      assessment._id.toString(),
      1,
      true
    );

    expect(res.submissionsCount).toBe(2);
    expect(res.assignedCount).toBe(2);

    const tasks = await PeerReviewGradingTaskModel.find({
      peerReviewSubmissionId: studentSub._id,
    }).lean();
    expect(tasks.length).toBe(1);
  });

  it('manual assign/unassign validates duplicate + completed deletion support', async () => {
    const grader = await makeUser('grader');
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      status: 'Submitted',
    });

    const created = await manualAssignGraderToSubmission(
      assessment._id.toString(),
      submission._id.toString(),
      grader._id.toString()
    );
    expect(created.status).toBe('Assigned');

    await expect(
      manualAssignGraderToSubmission(
        assessment._id.toString(),
        submission._id.toString(),
        grader._id.toString()
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    await PeerReviewGradingTaskModel.updateOne({ _id: created._id }, { $set: { status: 'Completed' } });

    const unassigned = await manualUnassignGraderFromSubmission(
      assessment._id.toString(),
      submission._id.toString(),
      grader._id.toString()
    );
    expect(unassigned.deleted).toBe(true);

    await expect(
      manualUnassignGraderFromSubmission(
        assessment._id.toString(),
        submission._id.toString(),
        grader._id.toString()
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('covers resolve/start validation branches and faculty null task path', async () => {
    const user = await makeUser('start-user');

    await expect(
      startGradingTaskForFacultyById(user._id.toString(), oid().toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const nonPrAssessment = await makeAssessment(course._id, ts._id, { assessmentType: 'standard' });

    await expect(
      startGradingTaskForFacultyById(user._id.toString(), nonPrAssessment._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    const assessment = await makeAssessment(course._id, ts._id);
    await expect(
      startGradingTaskForFacultyById(user._id.toString(), assessment._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    const pr = await makePeerReview(course._id, ts._id, assessment._id, { status: 'Closed' });
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    await expect(
      startGradingTaskForFacultyById(user._id.toString(), assessment._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      startGradingTaskForFacultyById(user._id.toString(), assessment._id.toString(), submission._id.toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    const assessment2 = await makeAssessment(course._id, ts._id);
    await makePeerReview(course._id, ts._id, assessment2._id);
    await expect(
      startGradingTaskForFacultyById(user._id.toString(), assessment2._id.toString(), submission._id.toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    const activeAssessment = await makeAssessment(course._id, ts._id);
    const activePr = await makePeerReview(course._id, ts._id, activeAssessment._id);
    const activeAssignment = await makeAssignment(activePr._id, reviewee._id);
    const activeSubmission = await makeSubmission(activePr._id, activeAssignment._id, { status: 'Submitted' });

    const originalFindById = PeerReviewSubmissionModel.findById.bind(PeerReviewSubmissionModel);
    let callCount = 0;
    const findByIdSpy = jest
      .spyOn(PeerReviewSubmissionModel, 'findById')
      .mockImplementation(((id: any) => {
        callCount += 1;
        if (callCount === 2) {
          return {
            select: () => ({ lean: async () => null }),
          } as any;
        }
        return originalFindById(id) as any;
      }) as any);

    await expect(
      startGradingTaskForFacultyById(
        user._id.toString(),
        activeAssessment._id.toString(),
        activeSubmission._id.toString()
      )
    ).rejects.toBeInstanceOf(NotFoundError);
    findByIdSpy.mockRestore();

    const facultyNoTask = await getGradingTaskForSubmissionById(
      user._id.toString(),
      COURSE_ROLE.Faculty,
      activeAssessment._id.toString(),
      activeSubmission._id.toString()
    );
    expect(facultyNoTask).toBeNull();
  });

  it('covers update/submit validation branches', async () => {
    const grader = await makeUser('grader-update-extra');
    const other = await makeUser('other-update-extra');

    await expect(updateGradingTaskById(grader._id.toString(), oid().toString(), {})).rejects.toBeInstanceOf(
      NotFoundError
    );
    await expect(submitGradingTaskById(grader._id.toString(), oid().toString())).rejects.toBeInstanceOf(
      NotFoundError
    );

    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id, { status: 'Closed' });
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, { status: 'Submitted' });

    const closedTask = await new PeerReviewGradingTaskModel({
      peerReviewId: pr._id,
      peerReviewSubmissionId: submission._id,
      grader: grader._id,
      status: 'Assigned',
    }).save();

    await expect(
      updateGradingTaskById(grader._id.toString(), closedTask._id.toString(), { score: 1 })
    ).rejects.toBeInstanceOf(BadRequestError);
    await expect(
      submitGradingTaskById(grader._id.toString(), closedTask._id.toString())
    ).rejects.toBeInstanceOf(BadRequestError);

    const assessment2 = await makeAssessment(course._id, ts._id);
    const pr2 = await makePeerReview(course._id, ts._id, assessment2._id);
    const assignment2 = await makeAssignment(pr2._id, reviewee._id);
    const submission2 = await makeSubmission(pr2._id, assignment2._id, { status: 'Submitted' });

    const task = await new PeerReviewGradingTaskModel({
      peerReviewId: pr2._id,
      peerReviewSubmissionId: submission2._id,
      grader: grader._id,
      status: 'InProgress',
      score: 5,
      feedback: 'f',
    }).save();

    await expect(
      updateGradingTaskById(grader._id.toString(), task._id.toString(), { score: Number.NaN })
    ).rejects.toBeInstanceOf(BadRequestError);

    const cleared = await updateGradingTaskById(grader._id.toString(), task._id.toString(), {
      score: null,
      feedback: null,
    });
    expect(cleared.score).toBeUndefined();
    expect(cleared.feedback).toBe('');
    expect(cleared.status).toBe('InProgress');

    await expect(submitGradingTaskById(other._id.toString(), task._id.toString())).rejects.toBeInstanceOf(
      MissingAuthorizationError
    );
  });

  it('covers bulk assignment error branches and conflict handling', async () => {
    await expect(
      bulkAssignGradersByAssessmentId(oid().toString(), oid().toString(), 1, true)
    ).rejects.toBeInstanceOf(NotFoundError);

    const ta1 = await makeUser('bulk-ta1');
    const ta2 = await makeUser('bulk-ta2');
    const course = await makeCourse({ TAs: [ta1._id, ta2._id] });
    const ts = await makeTeamSet(course._id);
    const nonPr = await makeAssessment(course._id, ts._id, { assessmentType: 'standard' });

    await expect(
      bulkAssignGradersByAssessmentId(course._id.toString(), nonPr._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(BadRequestError);

    const assessment = await makeAssessment(course._id, ts._id);
    await expect(
      bulkAssignGradersByAssessmentId(oid().toString(), assessment._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(BadRequestError);

    await expect(
      bulkAssignGradersByAssessmentId(course._id.toString(), assessment._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(NotFoundError);

    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    await expect(
      bulkAssignGradersByAssessmentId(course._id.toString(), assessment._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(BadRequestError);

    const emptyTaCourse = await makeCourse({ TAs: [] });
    const emptyTaSet = await makeTeamSet(emptyTaCourse._id);
    const emptyTaAssessment = await makeAssessment(emptyTaCourse._id, emptyTaSet._id);
    await makePeerReview(emptyTaCourse._id, emptyTaSet._id, emptyTaAssessment._id);
    await expect(
      bulkAssignGradersByAssessmentId(emptyTaCourse._id.toString(), emptyTaAssessment._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(BadRequestError);

    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    await makeSubmission(pr._id, assignment._id, { reviewerKind: 'Student', reviewerUserId: oid() });

    await expect(
      bulkAssignGradersByAssessmentId(course._id.toString(), assessment._id.toString(), 3, true)
    ).rejects.toBeInstanceOf(BadRequestError);

    await TeamModel.create({ teamSet: ts._id, number: 99, members: [] });
    await TeamModel.create({ teamSet: ts._id, number: 100, members: [], TA: ta1._id });

    await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: ta1._id,
      status: 'Submitted',
    });

    const constrained = await bulkAssignGradersByAssessmentId(
      course._id.toString(),
      assessment._id.toString(),
      1,
      false
    );
    expect(constrained.assignedCount).toBeGreaterThan(0);

    const soloCourse = await makeCourse({ TAs: [ta1._id] });
    const soloSet = await makeTeamSet(soloCourse._id);
    const soloAssessment = await makeAssessment(soloCourse._id, soloSet._id);
    const soloPr = await makePeerReview(soloCourse._id, soloSet._id, soloAssessment._id);
    const soloTeam = await makeTeam(soloSet._id, { TA: ta1._id });
    const soloAssignment = await makeAssignment(soloPr._id, soloTeam._id);
    await makeSubmission(soloPr._id, soloAssignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: ta1._id,
      status: 'Submitted',
    });

    await expect(
      bulkAssignGradersByAssessmentId(soloCourse._id.toString(), soloAssessment._id.toString(), 1, false)
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('covers manual assignment edge branches', async () => {
    const grader = await makeUser('grader-manual-edge');
    const course = await makeCourse();
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);
    const reviewee = await makeTeam(ts._id);
    const assignment = await makeAssignment(pr._id, reviewee._id);
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: grader._id,
      status: 'Submitted',
    });

    await expect(
      manualAssignGraderToSubmission(
        assessment._id.toString(),
        submission._id.toString(),
        grader._id.toString()
      )
    ).rejects.toBeInstanceOf(BadRequestError);

    const originalFindById = PeerReviewSubmissionModel.findById.bind(PeerReviewSubmissionModel);
    let calls = 0;
    const findByIdSpy = jest
      .spyOn(PeerReviewSubmissionModel, 'findById')
      .mockImplementation(((id: any) => {
        calls += 1;
        if (calls === 2) {
          return {
            select: () => ({ lean: async () => null }),
          } as any;
        }
        return originalFindById(id) as any;
      }) as any);

    await expect(
      manualAssignGraderToSubmission(assessment._id.toString(), submission._id.toString(), oid().toString())
    ).rejects.toBeInstanceOf(NotFoundError);
    findByIdSpy.mockRestore();
  });

  it('covers remaining branch edges in assert active and bulk mapping', async () => {
    const grader = await makeUser('grader-remaining-branches');
    const danglingTask = await new PeerReviewGradingTaskModel({
      peerReviewId: oid(),
      peerReviewSubmissionId: oid(),
      grader: grader._id,
      status: 'Assigned',
    }).save();

    await expect(
      updateGradingTaskById(grader._id.toString(), danglingTask._id.toString(), { score: 1 })
    ).rejects.toBeInstanceOf(NotFoundError);

    const ta1 = await makeUser('remaining-ta1');
    const ta2 = await makeUser('remaining-ta2');
    const ta3 = await makeUser('remaining-ta3');

    const course = await makeCourse({ TAs: [ta1._id, ta2._id, ta3._id] });
    const ts = await makeTeamSet(course._id);
    const assessment = await makeAssessment(course._id, ts._id);
    const pr = await makePeerReview(course._id, ts._id, assessment._id);

    const reviewee = await makeTeam(ts._id, { TA: ta3._id });
    const assignment = await makeAssignment(pr._id, reviewee._id);
    await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: ta2._id,
      status: 'Submitted',
    });

    const teamFindSpy = jest.spyOn(TeamModel, 'find').mockImplementationOnce(
      (() =>
        ({
          select: () => ({
            lean: async () => [{ _id: oid() }, { _id: reviewee._id, TA: ta3._id }],
          }),
        }) as any) as any
    );

    await expect(
      bulkAssignGradersByAssessmentId(course._id.toString(), assessment._id.toString(), 2, false)
    ).rejects.toBeInstanceOf(BadRequestError);
    teamFindSpy.mockRestore();

    const courseDeleted = await makeCourse({ TAs: [ta1._id] });
    const tsDeleted = await makeTeamSet(courseDeleted._id);
    const assessmentDeleted = await makeAssessment(courseDeleted._id, tsDeleted._id);
    const prDeleted = await makePeerReview(courseDeleted._id, tsDeleted._id, assessmentDeleted._id);
    const revieweeDeleted = await makeTeam(tsDeleted._id);
    const assignmentDeleted = await makeAssignment(prDeleted._id, revieweeDeleted._id);
    await makeSubmission(prDeleted._id, assignmentDeleted._id, {
      reviewerKind: 'Student',
      reviewerUserId: oid(),
      status: 'Submitted',
    });
    await CourseModel.deleteOne({ _id: courseDeleted._id });

    await expect(
      bulkAssignGradersByAssessmentId(courseDeleted._id.toString(), assessmentDeleted._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(NotFoundError);

    const courseUnset = await makeCourse({ TAs: [ta1._id] });
    const tsUnset = await makeTeamSet(courseUnset._id);
    const assessmentUnset = await makeAssessment(courseUnset._id, tsUnset._id);
    const prUnset = await makePeerReview(courseUnset._id, tsUnset._id, assessmentUnset._id);
    const revieweeUnset = await makeTeam(tsUnset._id);
    const assignmentUnset = await makeAssignment(prUnset._id, revieweeUnset._id);
    await makeSubmission(prUnset._id, assignmentUnset._id, {
      reviewerKind: 'Student',
      reviewerUserId: oid(),
      status: 'Submitted',
    });
    await CourseModel.updateOne({ _id: courseUnset._id }, { $unset: { TAs: 1 } });

    await expect(
      bulkAssignGradersByAssessmentId(courseUnset._id.toString(), assessmentUnset._id.toString(), 1, true)
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});
