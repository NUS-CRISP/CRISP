import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamModel from '../../models/Team';
import TeamDataModel from '../../models/TeamData';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';

import {
  getPeerReviewAssignmentById,
  assignPeerReviews,
  addManualAssignment,
  removeManualAssignment,
  initialiseAssignments as initialiseAssignmentsSvc,
  deleteAssignmentsByPeerReviewId as deleteAssignmentsByPeerReviewIdSvc,
} from '../../services/peerReviewAssignmentService';

import { COURSE_ROLE } from '@shared/types/auth/CourseRole';
import {
  BadRequestError,
  MissingAuthorizationError,
  NotFoundError,
} from '../../services/errors';

import {
  getPeerReviewById,
  getTeamDataById,
} from '../../services/peerReviewService';
import { resolveTeamRepo } from '../../services/teamService';

jest.mock('../../services/peerReviewService', () => ({
  __esModule: true,
  getPeerReviewById: jest.fn(),
  getTeamDataById: jest.fn(),
}));

jest.mock('../../services/teamService', () => ({
  __esModule: true,
  resolveTeamRepo: jest.fn(),
}));

let mongoServer: MongoMemoryServer;

const oid = () => new Types.ObjectId();
const oidStr = () => new Types.ObjectId().toString();

let testCourseId: Types.ObjectId;

const makeCourse = async () =>
  new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
  }).save();

const makeTeam = async (overrides: Partial<any> = {}) =>
  new TeamModel({
    teamSet: overrides.teamSet ?? oid(),
    number: overrides.number ?? Math.floor(Math.random() * 1000) + 1,
    members: overrides.members ?? [],
    TA: overrides.TA,
    ...overrides,
  }).save();

const makeTeamData = async (
  teamIdNum: number,
  overrides: Partial<any> = {}
) => {
  // TeamData schema has many required fields; create minimal valid doc.
  return new TeamDataModel({
    teamId: teamIdNum,
    course: testCourseId,
    gitHubOrgName: 'OrgFromDB',
    repoName: `Repo-${teamIdNum}`,
    commits: 0,
    weeklyCommits: [[0]],
    issues: 0,
    pullRequests: 0,
    updatedIssues: [],
    teamContributions: new Map([
      [
        'alice',
        {
          commits: 0,
          createdIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          pullRequests: 0,
          codeReviews: 0,
          comments: 0,
        },
      ],
    ]),
    teamPRs: [],
    milestones: [],
    ...overrides,
  }).save();
};

const makeAssignment = async (
  peerReviewId: Types.ObjectId,
  revieweeTeamId: Types.ObjectId,
  overrides: Partial<any> = {}
) =>
  new PeerReviewAssignmentModel({
    peerReviewId,
    reviewee: revieweeTeamId,
    repoName: overrides.repoName ?? 'Repo',
    repoUrl: overrides.repoUrl ?? 'http://example.com/repo.git',
    deadline: overrides.deadline ?? null,
    ...overrides,
  }).save();

const makeSubmission = async (
  prId: Types.ObjectId,
  assignmentId: Types.ObjectId,
  overrides: Partial<any> = {}
) => {
  const reviewerKind = overrides.reviewerKind ?? 'Student';
  const base: any = {
    peerReviewId: prId,
    peerReviewAssignmentId: assignmentId,
    reviewerKind,
    status: overrides.status ?? 'NotStarted',
    scores: {},
  };

  if (reviewerKind === 'Student' || reviewerKind === 'TA') {
    base.reviewerUserId = overrides.reviewerUserId ?? oid();
  } else {
    base.reviewerTeamId = overrides.reviewerTeamId ?? oid();
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
  await TeamDataModel.deleteMany({});
  await TeamModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await makeCourse();
  testCourseId = course._id;

  // default mocks
  (resolveTeamRepo as jest.Mock).mockResolvedValue({
    repoName: 'TeamRepo',
    repoUrl: 'http://example.com/example.git',
    gitHubOrgName: 'org',
  });

  (getTeamDataById as jest.Mock).mockResolvedValue(new Map());

  (getPeerReviewById as jest.Mock).mockImplementation(
    async (peerReviewId: string) => {
      // you will override per-test; default safe stub
      return {
        _id: peerReviewId,
        reviewerType: 'Individual',
        taAssignments: false,
        teamSetId: oid(),
        maxReviewsPerReviewer: 99,
      };
    }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('peerReviewAssignmentService', () => {
  describe('getPeerReviewAssignmentById', () => {
    it('throws NotFound when assignment missing', async () => {
      await expect(
        getPeerReviewAssignmentById(COURSE_ROLE.Faculty, oidStr(), oidStr())
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('faculty can access any assignment', async () => {
      const prId = oid();
      const reviewee = await makeTeam();
      const a = await makeAssignment(prId, reviewee._id);

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.Faculty,
        oidStr(),
        a._id.toString()
      );

      expect(got._id.toString()).toBe(a._id.toString());
    });

    it('direct reviewer (Student) can access via submissions exists', async () => {
      const prId = oid();
      const reviewee = await makeTeam();
      const reviewerUserId = oid();

      const a = await makeAssignment(prId, reviewee._id);

      await makeSubmission(prId, a._id, {
        reviewerKind: 'Student',
        reviewerUserId,
      });

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.Student,
        reviewerUserId.toString(),
        a._id.toString()
      );

      expect(got._id.toString()).toBe(a._id.toString());
    });

    it('direct reviewer (TA) can access via submissions exists', async () => {
      const prId = oid();
      const reviewee = await makeTeam();
      const reviewerUserId = oid();

      const a = await makeAssignment(prId, reviewee._id);

      await makeSubmission(prId, a._id, {
        reviewerKind: 'TA',
        reviewerUserId,
      });

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.TA,
        reviewerUserId.toString(),
        a._id.toString()
      );

      expect(got._id.toString()).toBe(a._id.toString());
    });

    it('TA can access when supervising reviewee team', async () => {
      const prId = oid();
      const taId = oid();

      const reviewee = await makeTeam({ TA: taId });
      const a = await makeAssignment(prId, reviewee._id);

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.TA,
        taId.toString(),
        a._id.toString()
      );

      expect(got._id.toString()).toBe(a._id.toString());
    });

    it('throws MissingAuthorization when not faculty, not direct reviewer, not TA supervisor', async () => {
      const prId = oid();
      const reviewee = await makeTeam({ TA: oid() });
      const a = await makeAssignment(prId, reviewee._id);

      await expect(
        getPeerReviewAssignmentById(
          COURSE_ROLE.Student,
          oidStr(),
          a._id.toString()
        )
      ).rejects.toBeInstanceOf(MissingAuthorizationError);
    });
  });

  describe('assignPeerReviews input validation', () => {
    it('throws when reviewsPerReviewer is not positive integer', async () => {
      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          oidStr(),
          oidStr(),
          0,
          true,
          ['default']
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when groupsToAssign is empty', async () => {
      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          oidStr(),
          oidStr(),
          1,
          true,
          []
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when not enough teams (<2)', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        taAssignments: false,
        teamSetId,
      });

      // only 1 team in set
      await makeTeam({ teamSet: teamSetId, members: [oid()] });

      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          prId.toString(),
          oidStr(),
          1,
          true,
          ['default']
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe('assignPeerReviews eligibility failures', () => {
    it('throws when reviewerType=Team and not enough eligible reviewees (same TA constraint)', async () => {
      const prId = oid();
      const teamSetId = oid();
      const sameTA = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        taAssignments: false,
        teamSetId,
      });

      // 3 teams, same TA => if allowSameTA=false, each team eligible list becomes []
      await makeTeam({ teamSet: teamSetId, TA: sameTA, members: [oid()] });
      await makeTeam({ teamSet: teamSetId, TA: sameTA, members: [oid()] });
      await makeTeam({ teamSet: teamSetId, TA: sameTA, members: [oid()] });

      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          prId.toString(),
          oidStr(),
          1,
          false, // allowSameTA=false => blocks all
          ['default']
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when reviewerType=Individual and not enough eligible reviewees for students', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        taAssignments: false,
        teamSetId,
      });

      const taA = oid();

      // 2 teams => each student can only review 1 other team
      const s1 = oid();
      const s2 = oid();
      await makeTeam({ teamSet: teamSetId, TA: taA, members: [s1], number: 1 });
      await makeTeam({ teamSet: teamSetId, TA: taA, members: [s2], number: 2 });

      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          prId.toString(),
          oidStr(),
          2, // reviewsPerReviewer > eligibleReviewees (1)
          true, // allowSameTA irrelevant here
          ['default']
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when TA assignments enabled but not enough eligible reviewees for TAs (TA supervises all teams)', async () => {
      const prId = oid();
      const teamSetId = oid();
      const ta = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        taAssignments: true,
        teamSetId,
      });

      // TA supervises ALL teams; allowSameTA=false => eligible becomes []
      await makeTeam({ teamSet: teamSetId, TA: ta, members: [oid()] });
      await makeTeam({ teamSet: teamSetId, TA: ta, members: [oid()] });
      await makeTeam({ teamSet: teamSetId, TA: ta, members: [oid()] });

      await expect(
        assignPeerReviews(
          testCourseId.toString(),
          prId.toString(),
          oidStr(),
          1,
          false, // disallow TA reviewing supervised teams
          ['assignTAs']
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });
  });

  describe('assignPeerReviews: loadExistingSubmissions collects Team/TA + applySubmissionDiffs deletes Team/TA extras', () => {
    it('resets old Team/TA submissions and recreates fresh submissions', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        taAssignments: true,
        teamSetId,
      });

      const ta1 = oid();
      const t1 = await makeTeam({
        teamSet: teamSetId,
        TA: ta1,
        members: [oid()],
      });
      const t2 = await makeTeam({
        teamSet: teamSetId,
        TA: oid(),
        members: [oid()],
      });

      // ensure repo map entries exist (used by upsertAndLoadAssignments)
      (getTeamDataById as jest.Mock).mockResolvedValue(
        new Map([
          [
            t1._id.toString(),
            { repoName: 'R1', repoUrl: 'U1', gitHubOrgName: '' },
          ],
          [
            t2._id.toString(),
            { repoName: 'R2', repoUrl: 'U2', gitHubOrgName: '' },
          ],
        ])
      );

      // Pre-create assignments (optional; upsert will also ensure)
      const a1 = await makeAssignment(prId, t1._id, {
        repoName: 'R1',
        repoUrl: 'U1',
      });
      const a2 = await makeAssignment(prId, t2._id, {
        repoName: 'R2',
        repoUrl: 'U2',
      });

      // Existing "outsider" Team submission -> should be deleted by diffs (have.Team not in want.Team)
      const outsiderTeamId = oid();
      const oldTeamSub = await makeSubmission(prId, a1._id, {
        reviewerKind: 'Team',
        reviewerTeamId: outsiderTeamId,
      });

      // Existing "outsider" TA submission -> should be deleted
      const outsiderTAId = oid();
      const oldTaSub = await makeSubmission(prId, a2._id, {
        reviewerKind: 'TA',
        reviewerUserId: outsiderTAId,
      });

      await assignPeerReviews(
        testCourseId.toString(),
        prId.toString(),
        oidStr(),
        1,
        true,
        ['default', 'assignTAs']
      );

      const oldTeamStillExists = await PeerReviewSubmissionModel.findById(
        oldTeamSub._id
      ).lean();
      const oldTaStillExists = await PeerReviewSubmissionModel.findById(
        oldTaSub._id
      ).lean();
      expect(oldTeamStillExists).toBeNull();
      expect(oldTaStillExists).toBeNull();

      const allSubs = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(allSubs.length).toBeGreaterThan(0);
      expect(
        allSubs.some(
          s =>
            s.reviewerKind === 'Team' &&
            s.reviewerTeamId?.toString() === outsiderTeamId.toString()
        )
      ).toBe(false);
      expect(
        allSubs.some(
          s =>
            s.reviewerKind === 'TA' &&
            s.reviewerUserId?.toString() === outsiderTAId.toString()
        )
      ).toBe(false);
    });

    it('resets old Student submissions and recreates fresh submissions', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        taAssignments: false,
        teamSetId,
      });

      // Deterministic random so shuffleInPlace order is stable
      const randSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

      const s1 = oid();
      const s2 = oid();

      const t1 = await makeTeam({
        teamSet: teamSetId,
        members: [s1],
        number: 1,
        TA: oid(),
      });
      const t2 = await makeTeam({
        teamSet: teamSetId,
        members: [s2],
        number: 2,
        TA: oid(),
      });

      (getTeamDataById as jest.Mock).mockResolvedValue(
        new Map([
          [
            t1._id.toString(),
            { repoName: 'R1', repoUrl: 'U1', gitHubOrgName: '' },
          ],
          [
            t2._id.toString(),
            { repoName: 'R2', repoUrl: 'U2', gitHubOrgName: '' },
          ],
        ])
      );

      // Pre-create assignments
      const a1 = await makeAssignment(prId, t1._id, {
        repoName: 'R1',
        repoUrl: 'U1',
      });
      await makeAssignment(prId, t2._id, { repoName: 'R2', repoUrl: 'U2' });

      // Existing WRONG student submission: s1 reviewing team1 (should be deleted after assignment)
      const wrongSub = await makeSubmission(prId, a1._id, {
        reviewerKind: 'Student',
        reviewerUserId: s1,
      });

      await assignPeerReviews(
        testCourseId.toString(),
        prId.toString(),
        oidStr(),
        1,
        true,
        ['default']
      );

      const wrongSubStillExists = await PeerReviewSubmissionModel.findById(
        wrongSub._id
      ).lean();
      expect(wrongSubStillExists).toBeNull();

      const subsAfter = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(subsAfter.length).toBeGreaterThan(0);

      randSpy.mockRestore();
    });

    it('deletes stale assignments and their submissions when teams are removed from prTeamIds', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        taAssignments: false,
        teamSetId,
      });

      const tKeep1 = await makeTeam({ teamSet: teamSetId, members: [oid()] });
      const tKeep2 = await makeTeam({ teamSet: teamSetId, members: [oid()] });
      const tStale = await makeTeam({ teamSet: teamSetId, members: [oid()] });

      (getTeamDataById as jest.Mock).mockResolvedValue(
        new Map([
          [
            tKeep1._id.toString(),
            { repoName: 'R1', repoUrl: 'U1', gitHubOrgName: '' },
          ],
          [
            tKeep2._id.toString(),
            { repoName: 'R2', repoUrl: 'U2', gitHubOrgName: '' },
          ],
        ])
      );

      // Create an assignment for stale team with a submission
      const staleA = await makeAssignment(prId, tStale._id);
      await makeSubmission(prId, staleA._id, {
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      // Make it "stale": remove team from the peer review team set
      await TeamModel.deleteOne({ _id: tStale._id });

      // Now run assignPeerReviews with only keep teams (stale should be removed)
      await assignPeerReviews(
        testCourseId.toString(),
        prId.toString(),
        oidStr(),
        1,
        true,
        ['default']
      );

      // Stale assignment should be deleted because reviewee not in prTeamIds
      const stillThere = await PeerReviewAssignmentModel.findOne({
        peerReviewId: prId,
        reviewee: tStale._id,
      }).lean();
      expect(stillThere).toBeNull();

      // And submissions for stale assignment should be deleted
      const subs = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
        peerReviewAssignmentId: staleA._id,
      }).lean();
      expect(subs).toHaveLength(0);
    });
  });

  describe('addManualAssignment', () => {
    it('throws NotFound if reviewee team not in peer review team set', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          oidStr(), // reviewee not exists
          oidStr(),
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('isTA=true: throws NotFound when reviewer not a TA of any team in team set', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const reviewee = await makeTeam({ teamSet: teamSetId, number: 1 });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          reviewee._id.toString(),
          oidStr(), // reviewerId not TA anywhere
          oidStr(),
          true
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('reviewerType=Individual: throws NotFound when reviewer not a member in team set', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const reviewee = await makeTeam({ teamSet: teamSetId, number: 1 });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          reviewee._id.toString(),
          oidStr(), // reviewer user not in any team
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('reviewerType=Individual: throws BadRequest when reviewer is in same team as reviewee', async () => {
      const prId = oid();
      const teamSetId = oid();
      const reviewerUserId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 1,
        members: [reviewerUserId],
      });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerUserId.toString(),
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('reviewerType=Team: throws NotFound when reviewer team not in team set', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({ teamSet: teamSetId, number: 1 });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          oidStr(), // not a team id in set
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('reviewerType=Team: throws BadRequest when reviewer team is the same as reviewee', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({ teamSet: teamSetId, number: 1 });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          revieweeTeam._id.toString(), // same
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('throws when Individual reviewer has reached max reviews (submission-count based)', async () => {
      const prId = oid();
      const teamSetId = oid();

      const reviewerUserId = oid();

      // peer review config with max=1
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 1,
        teamSetId,
      });

      // Reviewee team in set
      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 101,
        members: [oid()],
      });

      // Reviewer must be a member of some OTHER team in set
      await makeTeam({
        teamSet: teamSetId,
        number: 102,
        members: [reviewerUserId],
      });

      // Ensure assignment exists for the reviewee (so addManualAssignment won't create duplicate logic weirdness)
      const existingAssignment = await makeAssignment(prId, revieweeTeam._id);

      // Seed ONE existing submission for this reviewer in this peerReview => already at max=1
      await makeSubmission(prId, existingAssignment._id, {
        reviewerKind: 'Student',
        reviewerUserId,
        status: 'NotStarted',
      });

      // Now trying to add another assignment should fail due to max reached
      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerUserId.toString(),
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(BadRequestError);

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerUserId.toString(),
          oidStr(),
          false
        )
      ).rejects.toThrow(
        'Reviewer has reached the maximum number of assigned reviews'
      );
    });

    it('throws when Team reviewer has reached max reviews (submission-count based)', async () => {
      const prId = oid();
      const teamSetId = oid();

      // peer review config: Team reviewer mode with max=1
      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        maxReviewsPerReviewer: 1,
        teamSetId,
      });

      // Reviewee + reviewer teams both in set
      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 201,
        members: [oid()],
      });
      const reviewerTeam = await makeTeam({
        teamSet: teamSetId,
        number: 202,
        members: [oid()],
      });

      // Ensure assignment exists for the reviewee
      const existingAssignment = await makeAssignment(prId, revieweeTeam._id);

      // Seed ONE existing Team submission for this reviewerTeamId => already at max=1
      await makeSubmission(prId, existingAssignment._id, {
        reviewerKind: 'Team',
        reviewerTeamId: reviewerTeam._id,
        status: 'NotStarted',
      });

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerTeam._id.toString(),
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(BadRequestError);

      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerTeam._id.toString(),
          oidStr(),
          false
        )
      ).rejects.toThrow(
        'Reviewer team has reached the maximum number of assigned reviews'
      );
    });

    it('throws BadRequest when duplicate submission already exists', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 5,
        members: [oid()],
      });

      // reviewer is a member of some other team
      const reviewerUserId = oid();
      await makeTeam({
        teamSet: teamSetId,
        number: 6,
        members: [reviewerUserId],
      });

      // create TeamData (optional; service does findOne but doesn't require it for assignment creation)
      await makeTeamData(revieweeTeam.number);

      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'X',
        repoUrl: 'Y',
      });

      // First manual assignment creates assignment+submission
      await addManualAssignment(
        testCourseId.toString(),
        prId.toString(),
        revieweeTeam._id.toString(),
        reviewerUserId.toString(),
        oidStr(),
        false
      );

      // Second time should throw duplicate
      await expect(
        addManualAssignment(
          testCourseId.toString(),
          prId.toString(),
          revieweeTeam._id.toString(),
          reviewerUserId.toString(),
          oidStr(),
          false
        )
      ).rejects.toBeInstanceOf(BadRequestError);
    });

    it('creates Student submission when reviewerType=Individual and isTA=false (covers createSubmission Student branch)', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 5,
        members: [oid()],
      });

      const reviewerUserId = oid();
      await makeTeam({
        teamSet: teamSetId,
        number: 6,
        members: [reviewerUserId],
      });

      await makeTeamData(revieweeTeam.number);

      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'X',
        repoUrl: 'Y',
      });

      await addManualAssignment(
        testCourseId.toString(),
        prId.toString(),
        revieweeTeam._id.toString(),
        reviewerUserId.toString(),
        oidStr(),
        false
      );

      const subs = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(
        subs.some(
          s =>
            s.reviewerKind === 'Student' &&
            s.reviewerUserId?.toString() === reviewerUserId.toString()
        )
      ).toBe(true);
    });

    it('creates TA submission when isTA=true (covers createSubmission TA branch)', async () => {
      const prId = oid();
      const teamSetId = oid();
      const taId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      // reviewee in set
      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 7,
        members: [oid()],
      });

      // TA must be TA of some team in set
      await makeTeam({
        teamSet: teamSetId,
        number: 8,
        TA: taId,
        members: [oid()],
      });

      await makeTeamData(revieweeTeam.number);

      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'X',
        repoUrl: 'Y',
      });

      await addManualAssignment(
        testCourseId.toString(),
        prId.toString(),
        revieweeTeam._id.toString(),
        taId.toString(),
        oidStr(),
        true
      );

      const subs = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(
        subs.some(
          s =>
            s.reviewerKind === 'TA' &&
            s.reviewerUserId?.toString() === taId.toString()
        )
      ).toBe(true);
    });

    it('creates Team submission when reviewerType=Team and isTA=false (covers createSubmission Team branch)', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Team',
        maxReviewsPerReviewer: 10,
        teamSetId,
      });

      const revieweeTeam = await makeTeam({
        teamSet: teamSetId,
        number: 9,
        members: [oid()],
      });
      const reviewerTeam = await makeTeam({
        teamSet: teamSetId,
        number: 10,
        members: [oid()],
      });

      await makeTeamData(revieweeTeam.number);

      (resolveTeamRepo as jest.Mock).mockResolvedValue({
        repoName: 'X',
        repoUrl: 'Y',
      });

      await addManualAssignment(
        testCourseId.toString(),
        prId.toString(),
        revieweeTeam._id.toString(),
        reviewerTeam._id.toString(),
        oidStr(),
        false
      );

      const subs = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(
        subs.some(
          s =>
            s.reviewerKind === 'Team' &&
            s.reviewerTeamId?.toString() === reviewerTeam._id.toString()
        )
      ).toBe(true);
    });
  });

  describe('removeManualAssignment', () => {
    it('returns early when assignment does not exist', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        teamSetId,
      });

      await expect(
        removeManualAssignment(prId.toString(), oidStr(), oidStr(), false)
      ).resolves.toBeUndefined();
    });

    it('deletes the matching submission when assignment exists', async () => {
      const prId = oid();
      const teamSetId = oid();

      (getPeerReviewById as jest.Mock).mockResolvedValue({
        _id: prId,
        reviewerType: 'Individual',
        teamSetId,
      });

      const revieweeTeam = await makeTeam({ teamSet: teamSetId });
      const assignment = await makeAssignment(prId, revieweeTeam._id);

      const reviewerUserId = oid();
      await makeSubmission(prId, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId,
      });

      await removeManualAssignment(
        prId.toString(),
        revieweeTeam._id.toString(),
        reviewerUserId.toString(),
        false
      );

      const left = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
        peerReviewAssignmentId: assignment._id,
        reviewerKind: 'Student',
        reviewerUserId,
      }).lean();

      expect(left).toHaveLength(0);
    });
  });

  describe('initialiseAssignments + deleteAssignmentsByPeerReviewId', () => {
    it('initialiseAssignments creates one assignment per team with repo info from getTeamDataById', async () => {
      const prId = oid();
      const teamSetId = oid();

      const t1 = await makeTeam({
        teamSet: teamSetId,
        number: 1,
        members: [oid()],
      });
      const t2 = await makeTeam({
        teamSet: teamSetId,
        number: 2,
        members: [oid()],
      });

      (getTeamDataById as jest.Mock).mockResolvedValue(
        new Map([
          [
            t1._id.toString(),
            { repoName: 'Repo1', repoUrl: 'Url1', gitHubOrgName: 'Org1' },
          ],
          [
            t2._id.toString(),
            { repoName: 'Repo2', repoUrl: 'Url2', gitHubOrgName: 'Org2' },
          ],
        ])
      );

      await initialiseAssignmentsSvc(
        testCourseId.toString(),
        prId.toString(),
        teamSetId.toString(),
        null
      );

      const assignments = await PeerReviewAssignmentModel.find({
        peerReviewId: prId,
      }).lean();
      expect(assignments).toHaveLength(2);

      const a1 = assignments.find(
        a => a.reviewee.toString() === t1._id.toString()
      );
      const a2 = assignments.find(
        a => a.reviewee.toString() === t2._id.toString()
      );

      expect(a1?.repoName).toBe('Repo1');
      expect(a1?.repoUrl).toBe('Url1');
      expect(a2?.repoName).toBe('Repo2');
      expect(a2?.repoUrl).toBe('Url2');
    });

    it('deleteAssignmentsByPeerReviewId deletes submissions then assignments', async () => {
      const prId = oid();
      const reviewee = await makeTeam();
      const assignment = await makeAssignment(prId, reviewee._id);

      await makeSubmission(prId, assignment._id, {
        reviewerKind: 'Student',
        reviewerUserId: oid(),
      });

      const delRes = await deleteAssignmentsByPeerReviewIdSvc(prId.toString());

      const subsLeft = await PeerReviewSubmissionModel.find({
        peerReviewId: prId,
      }).lean();
      expect(subsLeft).toHaveLength(0);

      const assignmentsLeft = await PeerReviewAssignmentModel.find({
        peerReviewId: prId,
      }).lean();
      expect(assignmentsLeft).toHaveLength(0);

      expect(delRes.deletedCount).toBeDefined();
    });
  });

  describe('getPeerReviewAssignmentById - additional coverage', () => {
    it('skips backfill when repoUrl and repoName already present', async () => {
      const prId = oid();
      const revieweeTeam = await makeTeam();
      
      const assignment = await makeAssignment(prId, revieweeTeam._id, {
        repoName: 'ExistingRepo',
        repoUrl: 'http://existing.git',
      });

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.Faculty,
        testCourseId.toString(),
        assignment._id.toString()
      );

      expect(got.repoName).toBe('ExistingRepo');
      expect(got.repoUrl).toBe('http://existing.git');
    });

    it('Student can access assignment when part of reviewee team', async () => {
      const prId = oid();
      const studentId = oid();
      const revieweeTeam = await makeTeam({ members: [studentId] });
      const assignment = await makeAssignment(prId, revieweeTeam._id);

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.Student,
        studentId.toString(),
        assignment._id.toString()
      );

      expect(got._id.toString()).toBe(assignment._id.toString());
    });

    it('Student can access assignment when their team is assigned as Team reviewer', async () => {
      const prId = oid();
      const studentId = oid();
      const teamSetId = oid();

      const revieweeTeam = await makeTeam({ teamSet: teamSetId });
      const studentTeam = await makeTeam({ teamSet: teamSetId, members: [studentId] });

      const assignment = await makeAssignment(prId, revieweeTeam._id);

      // Student's team is a team reviewer for this assignment
      await makeSubmission(prId, assignment._id, {
        reviewerKind: 'Team',
        reviewerTeamId: studentTeam._id,
      });

      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.Student,
        studentId.toString(),
        assignment._id.toString()
      );

      expect(got._id.toString()).toBe(assignment._id.toString());
    });
  });

  describe('Additional assignment service coverage', () => {
    it('getPeerReviewAssignmentById checks permission context: isReviewee and isSupervisorTA flags', async () => {
      const prId = oid();
      const taId = oid();
      
      const revieweeTeam = await makeTeam({ TA: taId, members: [oid()] });
      const assignment = await makeAssignment(prId, revieweeTeam._id);

      // TA accessing their own supervised team
      const got = await getPeerReviewAssignmentById(
        COURSE_ROLE.TA,
        taId.toString(),
        assignment._id.toString()
      );

      expect(got._id.toString()).toBe(assignment._id.toString());
    });
  });
});
