import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import PeerReviewModel from '../../models/PeerReview';
import TeamSetModel from '../../models/TeamSet';
import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';
import PeerReviewCommentModel from '../../models/PeerReviewComment';
import { PeerReviewGradingTaskModel } from '../../models/PeerReviewGradingTask';

import { COURSE_ROLE } from '@shared/types/auth/CourseRole';

import {
  getPeerReviewCommentsByAssignmentId,
  addPeerReviewCommentByAssignmentId,
  updatePeerReviewCommentById,
  deletePeerReviewCommentById,
  flagPeerReviewCommentById,
  getPeerReviewCommentsBySubmissionId,
} from '../../services/peerReviewCommentsService';

// Dependent services are mocked
import { getPeerReviewById } from '../../services/peerReviewService';
import {
  fetchSubmissionForAssignment,
  assertSubmissionWritableByCaller,
} from '../../services/peerReviewSubmissionService';

import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from '../../services/errors';

jest.mock('../../services/peerReviewService', () => ({
  __esModule: true,
  getPeerReviewById: jest.fn(),
}));

jest.mock('../../services/peerReviewSubmissionService', () => ({
  __esModule: true,
  fetchSubmissionForAssignment: jest.fn(),
  assertSubmissionWritableByCaller: jest.fn(),
}));

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;

const oid = () => new Types.ObjectId();
const oidStr = () => new Types.ObjectId().toString();

const makeCourse = async () =>
  new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
  }).save();

const makeTeamSet = async (courseId: Types.ObjectId) =>
  new TeamSetModel({ name: 'Test TeamSet', course: courseId }).save();

const makePeerReview = async (overrides: Partial<any> = {}) => {
  const now = Date.now();
  const desiredStatus = overrides.status as
    | 'Upcoming'
    | 'Active'
    | 'Closed'
    | undefined;

  const startDate =
    desiredStatus === 'Closed'
      ? new Date(now - 120_000)
      : desiredStatus === 'Upcoming'
        ? new Date(now + 60_000)
        : new Date(now - 60_000);
  const endDate =
    desiredStatus === 'Closed'
      ? new Date(now - 60_000)
      : desiredStatus === 'Upcoming'
        ? new Date(now + 120_000)
        : new Date(now + 60_000);

  return new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    internalAssessmentId: oid(),
    title: 'PR',
    description: 'desc',
    startDate,
    endDate,
    reviewerType: 'Individual',
    taAssignments: false,
    maxReviewsPerReviewer: 2,
    status: undefined,
    ...overrides,
  }).save();
};

const makeTeam = async (overrides: Partial<any> = {}) =>
  new TeamModel({
    teamSet: testTeamSetId,
    name: `T-${oidStr().slice(-6)}`,
    number: 123,
    members: [],
    ...overrides,
  }).save();

const makeAssignment = async (
  peerReviewId: Types.ObjectId,
  revieweeTeamId: Types.ObjectId
) =>
  new PeerReviewAssignmentModel({
    peerReviewId,
    reviewee: revieweeTeamId,
    repoName: 'Test',
    repoUrl: 'http://example.com/repo.git',
  }).save();

const makeSubmission = async (
  peerReviewId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const reviewerKind = overrides.reviewerKind ?? 'Student';

  // Ensure schema-required fields are present depending on reviewerKind
  const base: any = {
    peerReviewId,
    peerReviewAssignmentId: assignmentId,
    status: 'Draft',
    reviewerKind,
  };

  if (reviewerKind === 'Student' || reviewerKind === 'TA') {
    base.reviewerUserId = overrides.reviewerUserId ?? oid().toString();
  }

  if (reviewerKind === 'Team') {
    base.reviewerTeamId = overrides.reviewerTeamId ?? oid().toString();
  }

  return new PeerReviewSubmissionModel({
    ...base,
    ...overrides,
  }).save();
};

const makeComment = async (
  peerReviewId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const authorId =
    overrides.author instanceof Types.ObjectId
      ? overrides.author
      : overrides.author
        ? new Types.ObjectId(overrides.author)
        : new Types.ObjectId();

  await ensureUser(authorId, `User-${authorId.toString().slice(-4)}`);

  return new PeerReviewCommentModel({
    peerReviewId,
    peerReviewAssignmentId: assignmentId,
    peerReviewSubmissionId: new Types.ObjectId(),
    createdAt: new Date(),
    filePath: 'src/a.ts',
    startLine: 1,
    endLine: 2,
    comment: 'hello',
    author: authorId,
    authorCourseRole: COURSE_ROLE.Student,
    ...overrides,
  }).save();
};

const ensureUser = async (id: Types.ObjectId, name = 'Test User') => {
  await UserModel.updateOne(
    { _id: id },
    { $setOnInsert: { _id: id, name, identifier: `id-${id.toString()}` } },
    { upsert: true }
  );
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  jest.clearAllMocks();

  await PeerReviewCommentModel.deleteMany({});
  await PeerReviewGradingTaskModel.deleteMany({});
  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await TeamModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});
  await UserModel.deleteMany({});

  const course = await makeCourse();
  const teamSet = await makeTeamSet(course._id);

  testCourseId = course._id;
  testTeamSetId = teamSet._id;

  // default: writable OK
  (assertSubmissionWritableByCaller as jest.Mock).mockResolvedValue(undefined);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewCommentsService', () => {
  describe('getPeerReviewCommentsByAssignmentId', () => {
    it('Faculty: returns visible comments', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      // create comment
      await makeComment(pr._id, assignment._id);

      const res = await getPeerReviewCommentsByAssignmentId(
        oidStr(),
        COURSE_ROLE.Faculty,
        assignment._id.toString()
      );

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
    });

    it('Student (reviewee): returns anonymous comments (no author field)', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [studentId] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const c = await makeComment(pr._id, assignment._id, { author: oid() });

      const res = await getPeerReviewCommentsByAssignmentId(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(res.length).toBe(1);
      // anonymous select excludes author + flaggedBy (author should be missing)
      expect((res[0] as any).author).toBeUndefined();
      // comment still present
      expect((res[0] as any).comment).toBe(c.comment);
    });

    it('Student (reviewee): hides flagged comments', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [studentId] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await makeComment(pr._id, assignment._id, {
        comment: 'visible comment',
        isFlagged: false,
      });
      await makeComment(pr._id, assignment._id, {
        comment: 'hidden flagged comment',
        isFlagged: true,
        flagReason: 'Inappropriate language',
      });

      const res = await getPeerReviewCommentsByAssignmentId(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(res).toHaveLength(1);
      expect((res[0] as any).comment).toBe('visible comment');
    });

    it('TA supervising: returns visible comments', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId, members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await makeComment(pr._id, assignment._id);

      const res = await getPeerReviewCommentsByAssignmentId(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString()
      );

      expect(res.length).toBe(1);
    });

    it('TA supervising + reviewer: returns only comments from own TA submission', async () => {
      const taId = oid();
      const pr = await makePeerReview({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId, members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const myTaSubmission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: taId.toString(),
      });
      const otherSubmission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      const myComment = await makeComment(pr._id, assignment._id, {
        author: taId,
        peerReviewSubmissionId: myTaSubmission._id,
      });
      await makeComment(pr._id, assignment._id, {
        author: oid(),
        peerReviewSubmissionId: otherSubmission._id,
      });

      const res = await getPeerReviewCommentsByAssignmentId(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString()
      );

      expect(res).toHaveLength(1);
      expect(res[0]._id.toString()).toBe(myComment._id.toString());
    });

    it('TA not supervising + no submission: throws MissingAuthorizationError', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: oid(), members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getPeerReviewCommentsByAssignmentId(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('throws if reviewee team not found (fetchReviewee branch)', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      // assignment points to a non-existent teamId
      const assignment = await new PeerReviewAssignmentModel({
        peerReviewId: pr._id,
        reviewee: new Types.ObjectId(), // not created
        repoName: 'repo',
        repoUrl: 'http://example.com/repo',
      }).save();

      await expect(
        getPeerReviewCommentsByAssignmentId(
          new Types.ObjectId().toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toThrow(/Reviewee team not found for this assignment/i);
    });

    it('throws NotFound when assignment not found (fetchAssignment branch)', async () => {
      const missingAssignmentId = new Types.ObjectId().toString();

      await expect(
        getPeerReviewCommentsByAssignmentId(
          new Types.ObjectId().toString(),
          COURSE_ROLE.Student,
          missingAssignmentId
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      await expect(
        getPeerReviewCommentsByAssignmentId(
          new Types.ObjectId().toString(),
          COURSE_ROLE.Student,
          missingAssignmentId
        )
      ).rejects.toThrow(/Peer review assignment not found/i);
    });
  });

  describe('addPeerReviewCommentByAssignmentId', () => {
    it('throws when peer review is Closed', async () => {
      const pr = await makePeerReview({ status: 'Closed' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        addPeerReviewCommentByAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          '',
          { filePath: 'a', startLine: 1, endLine: 1, comment: 'ok' }
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('validates empty comment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        addPeerReviewCommentByAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          '',
          { filePath: 'a', startLine: 1, endLine: 1, comment: '   ' }
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('validates line numbers >= 1', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        addPeerReviewCommentByAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          '',
          { filePath: 'a', startLine: 0, endLine: 1, comment: 'ok' }
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('validates startLine <= endLine', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        addPeerReviewCommentByAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          '',
          { filePath: 'a', startLine: 5, endLine: 2, comment: 'ok' }
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('non-Faculty requires submissionId', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        addPeerReviewCommentByAssignmentId(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          '',
          { filePath: 'a', startLine: 1, endLine: 1, comment: 'ok' }
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('non-Faculty fetches submission + asserts writable, then saves', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockImplementation(
        async (subId: string) => {
          if (subId !== submission._id.toString())
            throw new Error('wrong sub id');
          return PeerReviewSubmissionModel.findById(subId);
        }
      );

      const created = await addPeerReviewCommentByAssignmentId(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString(),
        submission._id.toString(),
        { filePath: 'a', startLine: 1, endLine: 2, comment: 'hello' }
      );

      expect(created._id).toBeDefined();
      expect(fetchSubmissionForAssignment).toHaveBeenCalled();
      expect(assertSubmissionWritableByCaller).toHaveBeenCalled();
    });

    it('Faculty bypasses submission checks and saves', async () => {
      const facultyId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const created = await addPeerReviewCommentByAssignmentId(
        facultyId.toString(),
        COURSE_ROLE.Faculty,
        assignment._id.toString(),
        '',
        { filePath: 'a', startLine: 1, endLine: 1, comment: 'hello' }
      );

      expect(created._id).toBeDefined();
      expect(fetchSubmissionForAssignment).not.toHaveBeenCalled();
      expect(assertSubmissionWritableByCaller).not.toHaveBeenCalled();
    });
  });

  describe('updatePeerReviewCommentById', () => {
    it('non-Faculty requires submissionId', async () => {
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const comment = await makeComment(pr._id, assignment._id, {
        author: oid(),
      });

      await expect(
        updatePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'x',
          ''
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('non-Faculty rejects Submitted submission', async () => {
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const comment = await makeComment(pr._id, assignment._id, {
        author: oid(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Submitted',
      });

      await expect(
        updatePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'x',
          oidStr()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws NotFound when comment missing', async () => {
      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      await expect(
        updatePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          oidStr(),
          oidStr(),
          'x',
          oidStr()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('non-Faculty rejects if comment not in provided submission', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submissionA = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });
      const submissionB = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockImplementation(
        async (subId: string) => {
          const doc = await PeerReviewSubmissionModel.findById(subId);
          return { ...(doc?.toObject?.() ?? doc), status: 'Draft' };
        }
      );

      const author = oid();
      const comment = await makeComment(pr._id, assignment._id, {
        author,
        peerReviewSubmissionId: submissionA._id,
      });

      await expect(
        updatePeerReviewCommentById(
          author.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'new',
          submissionB._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when peer review is Closed', async () => {
      const pr = await makePeerReview({ status: 'Closed' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      const author = oid();
      const comment = await makeComment(pr._id, assignment._id, {
        author,
        peerReviewSubmissionId: submission._id,
      });

      await expect(
        updatePeerReviewCommentById(
          author.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'new',
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('Faculty can update any comment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id, {
        author: oid(),
      });

      await expect(
        updatePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          comment._id.toString(),
          'new',
          ''
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.comment).toBe('new');
    });

    it('rejects empty updatedComment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const author = oid();
      const comment = await makeComment(pr._id, assignment._id, { author });

      await expect(
        updatePeerReviewCommentById(
          author.toString(),
          COURSE_ROLE.Faculty,
          assignment._id.toString(),
          comment._id.toString(),
          '   ',
          ''
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('successfully updates and saves', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      const author = oid();
      const comment = await makeComment(pr._id, assignment._id, {
        author,
        peerReviewSubmissionId: submission._id,
      });

      await expect(
        updatePeerReviewCommentById(
          author.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'updated text',
          submission._id.toString()
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.comment).toBe('updated text');
      expect(updated?.updatedAt).toBeTruthy();
    });

    it('non-team reviewer cannot update another author\'s comment', async () => {
      const studentId = oid();
      const otherAuthorId = oid();
      const pr = await makePeerReview({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
      });

      const comment = await makeComment(pr._id, assignment._id, {
        author: otherAuthorId,
        peerReviewSubmissionId: submission._id,
      });

      await expect(
        updatePeerReviewCommentById(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'should fail',
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('deletePeerReviewCommentById', () => {
    it('throws NotFound when comment missing', async () => {
      await expect(
        deletePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          oidStr(),
          oidStr(),
          oidStr()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('Faculty can delete any comment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      const res = await deletePeerReviewCommentById(
        oidStr(),
        COURSE_ROLE.Faculty,
        assignment._id.toString(),
        comment._id.toString(),
        ''
      );

      expect((res as any).deletedCount).toBe(1);
      expect(await PeerReviewCommentModel.findById(comment._id)).toBeNull();
    });

    it('TA supervising can delete any comment for supervised team', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      const res = await deletePeerReviewCommentById(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString(),
        comment._id.toString(),
        ''
      );

      expect((res as any).deletedCount).toBe(1);
    });

    it('TA deletes own comment', async () => {
      const taId = new Types.ObjectId();

      // Peer review must be open (not Closed)
      const pr = await makePeerReview({ status: 'Active' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      // Make reviewee team whose TA is NOT taId (so TA is NOT supervising -> no early delete)
      const reviewee = await makeTeam({
        TA: new Types.ObjectId(),
        members: [new Types.ObjectId()],
      });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      // Submission for TA reviewer
      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: taId.toString(),
        status: 'Draft',
      });

      // Service fetches submission via fetchSubmissionForAssignment(submissionId, assignmentId)
      // We can mock it to return a minimal object with status.
      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      // Comment authored by TA and belonging to same submission
      const comment = await makeComment(pr._id, assignment._id, {
        author: taId,
        peerReviewSubmissionId: submission._id,
      });

      const res = await deletePeerReviewCommentById(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString(),
        comment._id.toString(),
        submission._id.toString()
      );

      expect((res as any).deletedCount).toBe(1);
      expect(await PeerReviewCommentModel.findById(comment._id)).toBeNull();
      expect(assertSubmissionWritableByCaller).toHaveBeenCalled();
    });

    it('non-supervising TA goes through normal checks; Closed peer review blocks', async () => {
      const taId = oid();
      const pr = await makePeerReview({ status: 'Closed' });
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: oid() }); // not supervising
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: taId.toString(),
      });

      const comment = await makeComment(pr._id, assignment._id, {
        author: taId,
        peerReviewSubmissionId: submission._id,
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      await expect(
        deletePeerReviewCommentById(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString(),
          comment._id.toString(),
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('requires submissionId for non-moderation delete', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      await expect(
        deletePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          ''
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('rejects delete on Submitted submission', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id);
      const comment = await makeComment(pr._id, assignment._id, {
        peerReviewSubmissionId: submission._id,
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Submitted',
      });

      await expect(
        deletePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('rejects if comment not in provided submission', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submissionA = await makeSubmission(pr._id, assignment._id);
      const submissionB = await makeSubmission(pr._id, assignment._id);

      const comment = await makeComment(pr._id, assignment._id, {
        peerReviewSubmissionId: submissionA._id,
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      await expect(
        deletePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          submissionB._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('student/TA can delete own comment after writable checks', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
      });

      const comment = await makeComment(pr._id, assignment._id, {
        author: studentId,
        peerReviewSubmissionId: submission._id,
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      const res = await deletePeerReviewCommentById(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString(),
        comment._id.toString(),
        submission._id.toString()
      );

      expect((res as any).deletedCount).toBe(1);
      expect(assertSubmissionWritableByCaller).toHaveBeenCalled();
    });

    it('throws MissingAuthorizationError if not allowed to delete', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const submission = await makeSubmission(pr._id, assignment._id);
      const comment = await makeComment(pr._id, assignment._id, {
        author: oid(), // someone else
        peerReviewSubmissionId: submission._id,
      });

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
      });

      await expect(
        deletePeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('flagPeerReviewCommentById', () => {
    it('throws NotFound when comment missing', async () => {
      await expect(
        flagPeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Faculty,
          oidStr(),
          true,
          'r'
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFound when assignment missing for comment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      // delete assignment to trigger branch
      await PeerReviewAssignmentModel.deleteOne({ _id: assignment._id });

      await expect(
        flagPeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Faculty,
          comment._id.toString(),
          true,
          'r'
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('TA supervising can flag comment', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      await expect(
        flagPeerReviewCommentById(
          taId.toString(),
          COURSE_ROLE.TA,
          comment._id.toString(),
          true,
          'spam'
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.isFlagged).toBe(true);
      expect(updated?.flagReason).toBe('spam');
      expect(updated?.flaggedAt).toBeTruthy();
      expect(updated?.flaggedBy).toBeTruthy();
    });

    it('Faculty can flag any comment', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: oid() });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      await expect(
        flagPeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Faculty,
          comment._id.toString(),
          false
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.isFlagged).toBe(false);
    });

    it('Unauthorized user cannot flag', async () => {
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: oid() }); // not supervising for student
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const comment = await makeComment(pr._id, assignment._id);

      await expect(
        flagPeerReviewCommentById(
          oidStr(),
          COURSE_ROLE.Student,
          comment._id.toString(),
          true,
          'x'
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA not supervising cannot flag comment', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: oid(), members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const comment = await makeComment(pr._id, assignment._id);

      await expect(
        flagPeerReviewCommentById(
          taId.toString(),
          COURSE_ROLE.TA,
          comment._id.toString(),
          true,
          'not allowed'
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });
});

describe('peerReviewCommentsService edge cases', () => {
  it('Student + Individual reviewerType: uses reviewerUserId-based submission lookup and returns my comments', async () => {
    const studentId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Individual' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    // reviewee team does NOT contain studentId (so it won't short-circuit to anonymous)
    const reviewee = await makeTeam({ members: [new Types.ObjectId()] });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    // Create submission for this student as individual reviewer
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: studentId.toString(),
    });

    // Create two comments in the same submission, only one by studentId
    await makeComment(pr._id, assignment._id, {
      author: studentId,
      peerReviewSubmissionId: submission._id,
    });
    await makeComment(pr._id, assignment._id, {
      author: new Types.ObjectId(),
      peerReviewSubmissionId: submission._id,
    });

    const res = await getPeerReviewCommentsByAssignmentId(
      studentId.toString(),
      COURSE_ROLE.Student,
      assignment._id.toString()
    );

    expect(res).toHaveLength(2);
    const hasMyComment = res.some(c => {
      const author = (c as any).author?._id ?? (c as any).author;
      return author?.toString() === studentId.toString();
    });
    expect(hasMyComment).toBe(true);
  });

  it('Student + Individual reviewerType: hides flagged comments in submission view', async () => {
    const studentId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Individual' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    const reviewee = await makeTeam({ members: [new Types.ObjectId()] });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Student',
      reviewerUserId: studentId.toString(),
    });

    await makeComment(pr._id, assignment._id, {
      author: studentId,
      peerReviewSubmissionId: submission._id,
      comment: 'visible comment',
      isFlagged: false,
    });
    await makeComment(pr._id, assignment._id, {
      author: new Types.ObjectId(),
      peerReviewSubmissionId: submission._id,
      comment: 'flagged comment',
      isFlagged: true,
      flagReason: 'Needs moderation',
    });

    const res = await getPeerReviewCommentsByAssignmentId(
      studentId.toString(),
      COURSE_ROLE.Student,
      assignment._id.toString()
    );

    expect(res).toHaveLength(1);
    expect(res[0].comment).toBe('visible comment');
    expect(res[0].isFlagged).toBe(false);
  });

  it('Student + Team reviewerType: returns null when homeTeam not found (homeTeam branch)', async () => {
    const studentId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Team' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    // reviewee does not contain studentId
    const reviewee = await makeTeam({ members: [new Types.ObjectId()] });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    // no "home team" created that contains studentId
    await expect(
      getPeerReviewCommentsByAssignmentId(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      )
    ).rejects.toBeInstanceOf(MissingAuthorizationError);
  });

  it('Student + Team reviewerType: finds homeTeam then finds Team submission and returns my comments', async () => {
    const studentId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Team' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    // reviewee does not contain studentId
    const reviewee = await makeTeam({ members: [new Types.ObjectId()] });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    // Create home team containing studentId in same teamSet
    const homeTeam = await makeTeam({ members: [studentId] });

    // Create Team submission tied to homeTeam
    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: homeTeam._id.toString(),
    });

    // Create two comments in the same team submission, only one by studentId
    await makeComment(pr._id, assignment._id, {
      author: studentId,
      peerReviewSubmissionId: submission._id,
    });
    await makeComment(pr._id, assignment._id, {
      author: new Types.ObjectId(),
      peerReviewSubmissionId: submission._id,
    });

    const res = await getPeerReviewCommentsByAssignmentId(
      studentId.toString(),
      COURSE_ROLE.Student,
      assignment._id.toString()
    );

    expect(res).toHaveLength(2);
    const hasMyComment = res.some(c => {
      const author = (c as any).author?._id ?? (c as any).author;
      return author?.toString() === studentId.toString();
    });
    expect(hasMyComment).toBe(true);
  });

  it('Student + Team reviewerType: uses reviewer team name when author name is unavailable', async () => {
    const studentId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Team' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    // reviewee does not contain studentId
    const reviewee = await makeTeam({ members: [new Types.ObjectId()] });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    // Home team (reviewer team)
    const homeTeam = await makeTeam({ number: 42, members: [studentId] });

    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'Team',
      reviewerTeamId: homeTeam._id.toString(),
    });

    // Intentionally do not create author user, so populate('author') has no name
    await new PeerReviewCommentModel({
      peerReviewId: pr._id,
      peerReviewAssignmentId: assignment._id,
      peerReviewSubmissionId: submission._id,
      filePath: 'src/a.ts',
      startLine: 1,
      endLine: 2,
      comment: 'system generated',
      author: new Types.ObjectId(),
      authorCourseRole: COURSE_ROLE.Student,
    }).save();

    const res = await getPeerReviewCommentsByAssignmentId(
      studentId.toString(),
      COURSE_ROLE.Student,
      assignment._id.toString()
    );

    expect(res).toHaveLength(1);
    expect((res[0] as any).displayAuthorName).toBe('Team 42');
  });

  it('TA (not supervising): uses TA submission lookup and returns my comments', async () => {
    const taId = new Types.ObjectId();
    const pr = await makePeerReview({ reviewerType: 'Individual' });
    (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

    // reviewee TA is someone else so taId is NOT supervising
    const reviewee = await makeTeam({
      TA: new Types.ObjectId(),
      members: [new Types.ObjectId()],
    });
    const assignment = await makeAssignment(pr._id, reviewee._id);

    const submission = await makeSubmission(pr._id, assignment._id, {
      reviewerKind: 'TA',
      reviewerUserId: taId.toString(),
    });

    await makeComment(pr._id, assignment._id, {
      author: taId,
      peerReviewSubmissionId: submission._id,
    });
    await makeComment(pr._id, assignment._id, {
      author: new Types.ObjectId(),
      peerReviewSubmissionId: submission._id,
    });

    const res = await getPeerReviewCommentsByAssignmentId(
      taId.toString(),
      COURSE_ROLE.TA,
      assignment._id.toString()
    );

    expect(res).toHaveLength(2);
    const hasMyComment = res.some(c => {
      const author = (c as any).author?._id ?? (c as any).author;
      return author?.toString() === taId.toString();
    });
    expect(hasMyComment).toBe(true);
  });
});

  describe('getPeerReviewCommentsBySubmissionId', () => {
    it('throws NotFound when peer review not found for assessment', async () => {
      await expect(
        getPeerReviewCommentsBySubmissionId(
          oidStr(),
          COURSE_ROLE.Faculty,
          oidStr(), // non-existent assessmentId
          oidStr()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFound when submission not found', async () => {
      const pr = await makePeerReview();
      await expect(
        getPeerReviewCommentsBySubmissionId(
          oidStr(),
          COURSE_ROLE.Faculty,
          pr.internalAssessmentId.toString(),
          oidStr() // non-existent submission
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws BadRequest when submission does not belong to peer review', async () => {
      const pr1 = await makePeerReview();
      const pr2 = await makePeerReview();

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr2._id, reviewee._id);
      const submission = await makeSubmission(pr2._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      await expect(
        getPeerReviewCommentsBySubmissionId(
          oidStr(),
          COURSE_ROLE.Faculty,
          pr1.internalAssessmentId.toString(), // belongs to pr1, not pr2
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws MissingAuthorizationError when TA has no grading task', async () => {
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      await expect(
        getPeerReviewCommentsBySubmissionId(
          oidStr(),
          COURSE_ROLE.TA,
          pr.internalAssessmentId.toString(),
          submission._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('returns comments for TA with grading task assigned', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      await PeerReviewGradingTaskModel.create({
        peerReviewId: pr._id,
        peerReviewSubmissionId: submission._id,
        grader: taId,
        status: 'Assigned',
      });

      await makeComment(pr._id, assignment._id, {
        peerReviewSubmissionId: submission._id,
        isFlagged: true,
        flagReason: 'Spam',
      });

      const res = await getPeerReviewCommentsBySubmissionId(
        taId.toString(),
        COURSE_ROLE.TA,
        pr.internalAssessmentId.toString(),
        submission._id.toString()
      );

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
      expect(res[0].isFlagged).toBe(true);
      expect(res[0].flagReason).toBe('Spam');
    });

    it('returns comments for Faculty', async () => {
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
      });

      await makeComment(pr._id, assignment._id, {
        peerReviewSubmissionId: submission._id,
      });

      const res = await getPeerReviewCommentsBySubmissionId(
        oidStr(),
        COURSE_ROLE.Faculty,
        pr.internalAssessmentId.toString(),
        submission._id.toString()
      );

      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
    });

    it('returns empty array for student when all submission comments are flagged', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const submission = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
      });

      await makeComment(pr._id, assignment._id, {
        peerReviewSubmissionId: submission._id,
        author: oid(),
        isFlagged: true,
        flagReason: 'Spam',
      });

      const res = await getPeerReviewCommentsBySubmissionId(
        studentId.toString(),
        COURSE_ROLE.Student,
        pr.internalAssessmentId.toString(),
        submission._id.toString()
      );

      expect(res).toEqual([]);
    });
  });

  describe('updatePeerReviewCommentById additional coverage', () => {
    it('TA supervising can update any comment successfully', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId, members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const comment = await makeComment(pr._id, assignment._id, { author: oid() });

      await expect(
        updatePeerReviewCommentById(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString(),
          comment._id.toString(),
          'updated by supervising TA',
          ''
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.comment).toBe('updated by supervising TA');
    });

    it('TA supervising rejects empty comment', async () => {
      const taId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ TA: taId, members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);
      const comment = await makeComment(pr._id, assignment._id, { author: oid() });

      await expect(
        updatePeerReviewCommentById(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString(),
          comment._id.toString(),
          '   ',
          ''
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('Student + Team reviewer + no reviewerTeamId: throws MissingAuthorizationError', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const fakeSubmissionId = new Types.ObjectId();
      const comment = await new PeerReviewCommentModel({
        peerReviewId: pr._id,
        peerReviewAssignmentId: assignment._id,
        peerReviewSubmissionId: fakeSubmissionId,
        filePath: 'a.ts',
        startLine: 1,
        endLine: 1,
        comment: 'original',
        author: oid(),
        authorCourseRole: COURSE_ROLE.Student,
      }).save();

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: undefined,
      });

      await expect(
        updatePeerReviewCommentById(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'new text',
          fakeSubmissionId.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('Student + Team reviewer + reviewerTeamId: rejects empty comment', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const fakeSubmissionId = new Types.ObjectId();
      const comment = await new PeerReviewCommentModel({
        peerReviewId: pr._id,
        peerReviewAssignmentId: assignment._id,
        peerReviewSubmissionId: fakeSubmissionId,
        filePath: 'a.ts',
        startLine: 1,
        endLine: 1,
        comment: 'original',
        author: oid(),
        authorCourseRole: COURSE_ROLE.Student,
      }).save();

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: oidStr(),
      });

      await expect(
        updatePeerReviewCommentById(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          '   ',
          fakeSubmissionId.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('Student + Team reviewer + reviewerTeamId: updates successfully', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const fakeSubmissionId = new Types.ObjectId();
      const comment = await new PeerReviewCommentModel({
        peerReviewId: pr._id,
        peerReviewAssignmentId: assignment._id,
        peerReviewSubmissionId: fakeSubmissionId,
        filePath: 'a.ts',
        startLine: 1,
        endLine: 1,
        comment: 'original',
        author: oid(),
        authorCourseRole: COURSE_ROLE.Student,
      }).save();

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: oidStr(),
      });

      await expect(
        updatePeerReviewCommentById(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          'team updated text',
          fakeSubmissionId.toString()
        )
      ).resolves.toBeUndefined();

      const updated = await PeerReviewCommentModel.findById(comment._id);
      expect(updated?.comment).toBe('team updated text');
    });
  });

  describe('deletePeerReviewCommentById additional coverage', () => {
    it('Student + Team reviewer + no reviewerTeamId: throws MissingAuthorizationError', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const fakeSubmissionId = new Types.ObjectId();
      const comment = await new PeerReviewCommentModel({
        peerReviewId: pr._id,
        peerReviewAssignmentId: assignment._id,
        peerReviewSubmissionId: fakeSubmissionId,
        filePath: 'a.ts',
        startLine: 1,
        endLine: 1,
        comment: 'hello',
        author: oid(),
        authorCourseRole: COURSE_ROLE.Student,
      }).save();

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: undefined,
      });

      await expect(
        deletePeerReviewCommentById(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString(),
          comment._id.toString(),
          fakeSubmissionId.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('Student + Team reviewer + reviewerTeamId: deletes successfully', async () => {
      const studentId = oid();
      const pr = await makePeerReview();
      (getPeerReviewById as jest.Mock).mockResolvedValue(pr);

      const reviewee = await makeTeam({ members: [oid()] });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const fakeSubmissionId = new Types.ObjectId();
      const comment = await new PeerReviewCommentModel({
        peerReviewId: pr._id,
        peerReviewAssignmentId: assignment._id,
        peerReviewSubmissionId: fakeSubmissionId,
        filePath: 'a.ts',
        startLine: 1,
        endLine: 1,
        comment: 'hello',
        author: oid(),
        authorCourseRole: COURSE_ROLE.Student,
      }).save();

      (fetchSubmissionForAssignment as jest.Mock).mockResolvedValue({
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: oidStr(),
      });

      const res = await deletePeerReviewCommentById(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString(),
        comment._id.toString(),
        fakeSubmissionId.toString()
      );

      expect((res as any).deletedCount).toBe(1);
      expect(await PeerReviewCommentModel.findById(comment._id)).toBeNull();
    });
  });
