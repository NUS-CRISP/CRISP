import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import PeerReviewModel from '../../models/PeerReview';
import TeamModel from '../../models/Team';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';
import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import {
  getSubmissionsByAssignmentId,
  getMySubmissionForAssignmentId,
  updateMySubmissionDraft,
  submitMySubmission,
  fetchSubmissionForAssignment,
  assertSubmissionWritableByCaller,
} from '../../services/peerReviewSubmissionService';
import { getPeerReviewById } from '../../services/peerReviewService';
import {
  BadRequestError,
  NotFoundError,
  MissingAuthorizationError,
} from '../../services/errors';

jest.mock('../../services/peerReviewService', () => ({
  __esModule: true,
  getPeerReviewById: jest.fn(),
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

const makePeerReviewDoc = async (overrides: Partial<any> = {}) => {
  const now = Date.now();
  return new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    title: 'PR',
    description: 'desc',
    startDate: new Date(now - 60_000),
    endDate: new Date(now + 60_000),
    reviewerType: 'Individual',
    taAssignments: false,
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 2,
    status: 'Active',
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
    repoName: 'Repo',
    repoUrl: 'http://example.com/repo.git',
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
    status: overrides.status ?? 'NotStarted',
    reviewerKind,
    startedAt: overrides.startedAt,
    lastEditedAt: overrides.lastEditedAt,
    submittedAt: overrides.submittedAt,
  };

  if (reviewerKind === 'Student' || reviewerKind === 'TA') {
    base.reviewerUserId = overrides.reviewerUserId ?? oid().toString();
  }

  if (reviewerKind === 'Team') {
    base.reviewerTeamId = overrides.reviewerTeamId ?? oid().toString();
  }

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
  jest.clearAllMocks();

  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await TeamModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await makeCourse();
  const teamSet = await makeTeamSet(course._id);
  testCourseId = course._id;
  testTeamSetId = teamSet._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewSubmissionService', () => {
  describe('getSubmissionsByAssignmentId', () => {
    it('throws NotFound when assignment not found (fetchAssignment)', async () => {
      await expect(
        getSubmissionsByAssignmentId(oidStr(), COURSE_ROLE.Student, oidStr())
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('Student (Individual): returns only my submission', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const mine = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Draft',
      });

      // another user's submission
      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });

      const res = await getSubmissionsByAssignmentId(
        userId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(res).toHaveLength(1);
      expect(res[0]._id.toString()).toBe(mine._id.toString());
    });

    it('Student (Individual): throws NotFound when my submission missing', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getSubmissionsByAssignmentId(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('Student (Team): resolves my team and returns my team submission', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Team' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Team',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const myTeam = await makeTeam({ members: [userId] });
      const mine = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Team',
        reviewerTeamId: myTeam._id.toString(),
        status: 'Draft',
      });

      const res = await getSubmissionsByAssignmentId(
        userId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(res).toHaveLength(1);
      expect(res[0]._id.toString()).toBe(mine._id.toString());
    });

    it('Student (Team): throws MissingAuthorizationError when user has no team', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Team' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Team',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getSubmissionsByAssignmentId(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA supervising: returns all submissions, throws if none', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam({ TA: taId });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      // none => NotFound
      await expect(
        getSubmissionsByAssignmentId(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      // create some submissions => return all
      const s1 = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });
      const s2 = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });

      const res = await getSubmissionsByAssignmentId(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString()
      );

      expect(res.length).toBeGreaterThanOrEqual(2);
      const ids = res.map((x: any) => x._id.toString());
      expect(ids).toEqual(
        expect.arrayContaining([s1._id.toString(), s2._id.toString()])
      );
    });

    it('TA not supervising: returns own TA submission, throws if none', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam({ TA: oid() }); // different TA
      const assignment = await makeAssignment(pr._id, reviewee._id);

      // none => NotFound
      await expect(
        getSubmissionsByAssignmentId(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      const mine = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: taId.toString(),
        status: 'Draft',
      });

      const res = await getSubmissionsByAssignmentId(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString()
      );

      expect(res).toHaveLength(1);
      expect(res[0]._id.toString()).toBe(mine._id.toString());
    });

    it('Faculty: returns all submissions, throws if none', async () => {
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getSubmissionsByAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      const s1 = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });

      const res = await getSubmissionsByAssignmentId(
        oidStr(),
        COURSE_ROLE.Faculty,
        assignment._id.toString()
      );

      expect(res.length).toBeGreaterThanOrEqual(1);
      expect(res.map((x: any) => x._id.toString())).toContain(
        s1._id.toString()
      );
    });

    it('Unknown role: throws MissingAuthorizationError', async () => {
      const pr = await makePeerReviewDoc();
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getSubmissionsByAssignmentId(
          oidStr(),
          'RandomRole',
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA assignment missing in isTAForAssignmentReviewee -> NotFoundError', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const missingAssignmentId = oidStr();

      await expect(
        getSubmissionsByAssignmentId(
          taId.toString(),
          COURSE_ROLE.TA,
          missingAssignmentId
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getMySubmissionForAssignmentId', () => {
    it('Student (Individual): returns my submission, throws if missing', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getMySubmissionForAssignmentId(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);

      const mine = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Draft',
      });

      const found = await getMySubmissionForAssignmentId(
        userId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(found._id.toString()).toBe(mine._id.toString());
    });

    it('Faculty: resolveReviewerRefForUser rejects (cannot have “my submission”)', async () => {
      const pr = await makePeerReviewDoc();
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      await expect(
        getMySubmissionForAssignmentId(
          oidStr(),
          COURSE_ROLE.Faculty,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA path resolves reviewerRef (reviewerKind TA) and returns my TA submission', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const reviewee = await makeTeam({ TA: oid() });
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const myTaSub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'TA',
        reviewerUserId: taId.toString(),
        status: 'Draft',
      });

      const found = await getMySubmissionForAssignmentId(
        taId.toString(),
        COURSE_ROLE.TA,
        assignment._id.toString()
      );

      expect(found._id.toString()).toBe(myTaSub._id.toString());
    });
  });

  describe('updateMySubmissionDraft', () => {
    it('nextStatus maps NotStarted -> Draft', async () => {
      const studentId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const sub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
        status: 'NotStarted',
        startedAt: undefined,
      });

      const updated = await updateMySubmissionDraft(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(updated._id.toString()).toBe(sub._id.toString());
      expect(updated.status).toBe('Draft'); // <-- covers NotStarted ? Draft
    });

    it('nextStatus keeps Draft as Draft', async () => {
      const studentId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const sub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: studentId.toString(),
        status: 'Draft',
        startedAt: new Date(),
      });

      const updated = await updateMySubmissionDraft(
        studentId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(updated._id.toString()).toBe(sub._id.toString());
      expect(updated.status).toBe('Draft'); // <-- covers ": submission.status" branch
    });

    it('throws BadRequest when peer review is Upcoming or Closed (assertPeerReviewActive)', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc();
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Upcoming',
      });

      await expect(
        updateMySubmissionDraft(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Closed',
      });

      await expect(
        updateMySubmissionDraft(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws NotFound when submission missing', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc();
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await expect(
        updateMySubmissionDraft(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects edits on Submitted submission', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Submitted',
      });

      await expect(
        updateMySubmissionDraft(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('transitions NotStarted -> Draft and sets timestamps', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      const sub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'NotStarted',
        startedAt: undefined,
        lastEditedAt: undefined,
      });

      const updated = await updateMySubmissionDraft(
        userId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(updated._id.toString()).toBe(sub._id.toString());
      expect(updated.status).toBe('Draft');
      expect(updated.startedAt).toBeTruthy();
      expect(updated.lastEditedAt).toBeTruthy();
      expect(updated.updatedAt).toBeTruthy();
    });

    it('Faculty cannot edit (assertIsOwnerOfSubmission)', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Draft',
      });

      await expect(
        updateMySubmissionDraft(
          userId.toString(),
          COURSE_ROLE.Faculty,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('updateMySubmissionDraft: Student not in team cannot edit team submission (MissingAuthorizationError)', async () => {
      const studentId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Team' });
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Team',
        computedStatus: 'Active',
      });

      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      // Create a "myTeam" so resolveReviewerRefForUser succeeds for this student
      const myTeam = await makeTeam({ members: [studentId] });

      // Create the Team submission for that team
      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Team',
        reviewerTeamId: myTeam._id.toString(),
        status: 'Draft',
      });

      // Now remove student from team AFTER submission exists,
      await TeamModel.updateOne({ _id: myTeam._id }, { $set: { members: [] } });

      await expect(
        updateMySubmissionDraft(
          studentId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('submitMySubmission', () => {
    it('throws BadRequest when peer review is not Active', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc();
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Closed',
      });

      await expect(
        submitMySubmission(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws NotFound when submission missing', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await expect(
        submitMySubmission(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws BadRequest when already submitted', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Submitted',
        submittedAt: new Date(),
      });

      await expect(
        submitMySubmission(
          userId.toString(),
          COURSE_ROLE.Student,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('submits successfully and sets timestamps', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      const sub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Draft',
        startedAt: undefined,
      });

      const submitted = await submitMySubmission(
        userId.toString(),
        COURSE_ROLE.Student,
        assignment._id.toString()
      );

      expect(submitted._id.toString()).toBe(sub._id.toString());
      expect(submitted.status).toBe('Submitted');
      expect(submitted.startedAt).toBeTruthy(); // set if missing
      expect(submitted.lastEditedAt).toBeTruthy();
      expect(submitted.submittedAt).toBeTruthy();
      expect(submitted.updatedAt).toBeTruthy();
    });

    it('Faculty cannot submit (assertIsOwnerOfSubmission)', async () => {
      const userId = oid();
      const pr = await makePeerReviewDoc({ reviewerType: 'Individual' });
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
        computedStatus: 'Active',
      });

      await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: userId.toString(),
        status: 'Draft',
      });

      await expect(
        submitMySubmission(
          userId.toString(),
          COURSE_ROLE.Faculty,
          assignment._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('fetchSubmissionForAssignment', () => {
    it('rejects invalid objectId', async () => {
      await expect(
        fetchSubmissionForAssignment('not-an-oid', oidStr())
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws NotFound when submission missing', async () => {
      await expect(
        fetchSubmissionForAssignment(oidStr(), oidStr())
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('fetchSubmissionForAssignment: rejects when submission does not belong to assignment', async () => {
      const pr = await makePeerReviewDoc();
      const revieweeA = await makeTeam();
      const revieweeB = await makeTeam();

      const assignmentA = await makeAssignment(pr._id, revieweeA._id);
      const assignmentB = await makeAssignment(pr._id, revieweeB._id); // different reviewee => no dup

      const sub = await makeSubmission(pr._id, assignmentA._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });

      await expect(
        fetchSubmissionForAssignment(
          sub._id.toString(),
          assignmentB._id.toString()
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('returns submission when valid and belongs to assignment', async () => {
      const pr = await makePeerReviewDoc();
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(pr._id, reviewee._id);

      const sub = await makeSubmission(pr._id, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oidStr(),
        status: 'Draft',
      });

      const found = await fetchSubmissionForAssignment(
        sub._id.toString(),
        assignment._id.toString()
      );
      expect(found._id.toString()).toBe(sub._id.toString());
    });
  });

  describe('assertSubmissionWritableByCaller', () => {
    it('Faculty cannot write', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(
          oidStr(),
          COURSE_ROLE.Faculty,
          submission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('locks after submitted', async () => {
      const submission: any = {
        status: 'Submitted',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(
          oidStr(),
          COURSE_ROLE.Student,
          submission
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('TA: rejects non-TA submission', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(oidStr(), COURSE_ROLE.TA, submission)
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA: rejects if reviewerUserId mismatch', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'TA',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(oidStr(), COURSE_ROLE.TA, submission)
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('TA: allows own TA submission', async () => {
      const taId = oid();
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'TA',
        reviewerUserId: taId,
      };
      await expect(
        assertSubmissionWritableByCaller(
          taId.toString(),
          COURSE_ROLE.TA,
          submission
        )
      ).resolves.toBeUndefined();
    });

    it('Student: allows own Student-kind submission; rejects mismatch', async () => {
      const studentId = oid();
      const submissionOk: any = {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: studentId,
      };
      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          submissionOk
        )
      ).resolves.toBeUndefined();

      const submissionBad: any = {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          submissionBad
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('Student Team: rejects if reviewerTeamId missing', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: undefined,
      };
      await expect(
        assertSubmissionWritableByCaller(
          oidStr(),
          COURSE_ROLE.Student,
          submission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('Student Team: rejects if team not found; rejects if not member; allows if member', async () => {
      const studentId = oid();

      const missingTeamSubmission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: oid(),
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          missingTeamSubmission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);

      const team = await makeTeam({ members: [oid()] }); // not studentId
      const notMemberSubmission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: team._id,
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          notMemberSubmission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);

      // now make student a member
      await TeamModel.updateOne(
        { _id: team._id },
        { $addToSet: { members: studentId } }
      );

      const memberSubmission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: team._id,
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          memberSubmission
        )
      ).resolves.toBeUndefined();
    });

    it('members missing => treated as [] => throws', async () => {
      const studentId = new Types.ObjectId();

      const team = await new TeamModel({
        teamSet: testTeamSetId,
        name: 'NoMembersField',
        number: 1,
        // intentionally no members
      } as any).save();

      // ensure field is truly absent in Mongo
      await TeamModel.updateOne({ _id: team._id }, { $unset: { members: 1 } });

      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: team._id,
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          submission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('members present but not including user => throws', async () => {
      const studentId = new Types.ObjectId();

      const team = await new TeamModel({
        teamSet: testTeamSetId,
        name: 'NotMemberTeam',
        number: 2,
        members: [new Types.ObjectId()], // different user
      } as any).save();

      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: team._id,
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          submission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('members includes user => passes', async () => {
      const studentId = new Types.ObjectId();

      const team = await new TeamModel({
        teamSet: testTeamSetId,
        name: 'MemberTeam',
        number: 3,
        members: [studentId],
      } as any).save();

      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Team',
        reviewerTeamId: team._id,
      };

      await expect(
        assertSubmissionWritableByCaller(
          studentId.toString(),
          COURSE_ROLE.Student,
          submission
        )
      ).resolves.toBeUndefined();
    });

    it('Student should not write TA submissions (falls through to final throw)', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'TA',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(
          oidStr(),
          COURSE_ROLE.Student,
          submission
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });

    it('Unknown role: throws MissingAuthorizationError', async () => {
      const submission: any = {
        status: 'Draft',
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      };
      await expect(
        assertSubmissionWritableByCaller(oidStr(), 'RandomRole', submission)
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('isTAForAssignmentReviewee error branches via getSubmissionsByAssignmentId', () => {
    it('TA path: throws ASSIGNMENT_NOT_FOUND if assignment missing in TA-supervision check', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc();
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      await expect(
        getSubmissionsByAssignmentId(taId.toString(), COURSE_ROLE.TA, oidStr())
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('TA path: throws if reviewee team not found in TA-supervision check', async () => {
      const taId = oid();
      const pr = await makePeerReviewDoc();
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: pr._id,
        teamSetId: pr.teamSetId,
        reviewerType: 'Individual',
      });

      const assignment = await new PeerReviewAssignmentModel({
        peerReviewId: pr._id,
        reviewee: oid(), // not created
        repoName: 'Repo',
        repoUrl: 'http://example.com/repo.git',
      }).save();

      await expect(
        getSubmissionsByAssignmentId(
          taId.toString(),
          COURSE_ROLE.TA,
          assignment._id.toString()
        )
      ).rejects.toThrow(/Reviewee team not found for this assignment/i);
    });
  });
});
