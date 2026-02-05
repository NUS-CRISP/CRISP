import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewSubmissionModel from '../../models/PeerReviewSubmission';

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;
let testPeerReviewId: Types.ObjectId;
let testAssignmentId: Types.ObjectId;

let studentUserId: Types.ObjectId;
let taUserId: Types.ObjectId;
let teamReviewerId: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewSubmissionModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await TeamModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await UserModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2023',
    startDate: new Date('2024-08-15'),
    courseType: 'Normal',
  }).save();
  testCourseId = course._id;

  const teamSet = await new TeamSetModel({
    name: 'Test TeamSet',
    course: course._id,
  }).save();
  testTeamSetId = teamSet._id;

  const reviewee = await new TeamModel({
    teamSet: testTeamSetId,
    number: 1,
  }).save();

  const now = Date.now();
  const peerReview = await new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    title: 'PR Title',
    startDate: new Date(now + 60000),
    endDate: new Date(now + 120000),
    taAssignments: false,
    reviewerType: 'Individual',
    minReviewsPerReviewer: 1,
    maxReviewsPerReviewer: 2,
  }).save();
  testPeerReviewId = peerReview._id;

  const assignment = await new PeerReviewAssignmentModel({
    peerReviewId: testPeerReviewId,
    reviewee: reviewee._id,
    repoName: 'team-repo',
    repoUrl: 'https://github.com/org/team-repo',
    deadline: null,
  }).save();
  testAssignmentId = assignment._id;

  const student = await new UserModel({
    name: 'Student',
    identifier: 'S001',
  }).save();
  studentUserId = student._id;

  const ta = await new UserModel({ name: 'TA', identifier: 'TA001' }).save();
  taUserId = ta._id;

  const team = await new TeamModel({
    teamSet: testTeamSetId,
    number: 2,
  }).save();
  teamReviewerId = team._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewSubmissionModel', () => {
  const makeBase = (overrides: Partial<Record<string, any>> = {}) => {
    return {
      peerReviewId: testPeerReviewId,
      peerReviewAssignmentId: testAssignmentId,
      reviewerKind: 'Student',
      reviewerUserId: studentUserId,
      // reviewerTeamId omitted by default
      // status omitted to test default unless overridden
      ...overrides,
    };
  };

  it('should create and save a valid Student submission', async () => {
    const s = new PeerReviewSubmissionModel(makeBase());
    const saved = await s.save();

    expect(saved.peerReviewId.toString()).toBe(testPeerReviewId.toString());
    expect(saved.peerReviewAssignmentId.toString()).toBe(
      testAssignmentId.toString()
    );
    expect(saved.reviewerKind).toBe('Student');
    expect(saved.reviewerUserId!.toString()).toBe(studentUserId.toString());
    expect(saved.status).toBe('NotStarted');
    expect(saved.overallComment).toBe('');
    expect(saved.scores).toEqual({});
  });

  it('should create and save a valid TA submission', async () => {
    const s = await new PeerReviewSubmissionModel(
      makeBase({ reviewerKind: 'TA', reviewerUserId: taUserId })
    ).save();

    expect(s.reviewerKind).toBe('TA');
    expect(s.reviewerUserId!.toString()).toBe(taUserId.toString());
    expect(s.status).toBe('NotStarted');
  });

  it('should create and save a valid Team submission (requires reviewerTeamId)', async () => {
    const s = await new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Team',
        reviewerUserId: undefined,
        reviewerTeamId: teamReviewerId,
      })
    ).save();

    expect(s.reviewerKind).toBe('Team');
    expect(s.reviewerTeamId!.toString()).toBe(teamReviewerId.toString());
    expect(s.reviewerUserId).toBeUndefined();
  });

  it('should reject if both reviewerUserId and reviewerTeamId are set', async () => {
    const s = new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Student',
        reviewerUserId: studentUserId,
        reviewerTeamId: teamReviewerId,
      })
    );

    await expect(s.save()).rejects.toThrow(
      /Only either reviewerUserId or reviewerTeamId may be set/i
    );
  });

  it('should reject Team kind if reviewerTeamId missing', async () => {
    const s = new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Team',
        reviewerUserId: undefined,
        reviewerTeamId: undefined,
      })
    );

    await expect(s.save()).rejects.toThrow(/reviewerTeamId is required/i);
  });

  it('should reject Student kind if reviewerUserId missing', async () => {
    const s = new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Student',
        reviewerUserId: undefined,
      })
    );

    await expect(s.save()).rejects.toThrow(/reviewerUserId is required/i);
  });

  it('should reject TA kind if reviewerUserId missing', async () => {
    const s = new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'TA',
        reviewerUserId: undefined,
      })
    );

    await expect(s.save()).rejects.toThrow(/reviewerUserId is required/i);
  });

  it('should enforce reviewerKind enum', async () => {
    const s = new PeerReviewSubmissionModel(makeBase({ reviewerKind: 'Nope' }));
    await expect(s.save()).rejects.toThrow(/reviewerKind/);
  });

  it('should enforce status enum', async () => {
    const s = new PeerReviewSubmissionModel(makeBase({ status: 'Nope' }));
    await expect(s.save()).rejects.toThrow(/status/);
  });

  it('should allow updating status + timestamps fields', async () => {
    const s = await new PeerReviewSubmissionModel(makeBase()).save();

    const now = new Date();
    const updated = await PeerReviewSubmissionModel.findByIdAndUpdate(
      s._id,
      {
        status: 'Draft',
        startedAt: now,
        lastEditedAt: now,
        overallComment: 'hello',
      },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('Draft');
    expect(updated!.startedAt).toBeInstanceOf(Date);
    expect(updated!.lastEditedAt).toBeInstanceOf(Date);
    expect(updated!.overallComment).toBe('hello');
  });

  it('should enforce unique (assignment, reviewerKind, reviewerUserId) for user submissions', async () => {
    await new PeerReviewSubmissionModel(
      makeBase({ reviewerKind: 'Student', reviewerUserId: studentUserId })
    ).save();

    const dup = new PeerReviewSubmissionModel(
      makeBase({ reviewerKind: 'Student', reviewerUserId: studentUserId })
    );

    await expect(dup.save()).rejects.toThrow(/duplicate key/i);
  });

  it('should enforce unique (assignment, reviewerKind, reviewerTeamId) for team submissions', async () => {
    await new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Team',
        reviewerUserId: undefined,
        reviewerTeamId: teamReviewerId,
      })
    ).save();

    const dup = new PeerReviewSubmissionModel(
      makeBase({
        reviewerKind: 'Team',
        reviewerUserId: undefined,
        reviewerTeamId: teamReviewerId,
      })
    );

    await expect(dup.save()).rejects.toThrow(/duplicate key/i);
  });

  it('should allow same reviewerUserId across different assignments', async () => {
    const reviewee2 = await new TeamModel({
      teamSet: testTeamSetId,
      number: 3,
    }).save();

    const assignment2 = await new PeerReviewAssignmentModel({
      peerReviewId: testPeerReviewId,
      reviewee: reviewee2._id,
      repoName: 'team-repo-2',
      repoUrl: 'https://github.com/org/team-repo-2',
      deadline: null,
    }).save();

    await new PeerReviewSubmissionModel(
      makeBase({ reviewerKind: 'Student', reviewerUserId: studentUserId })
    ).save();

    const ok = await new PeerReviewSubmissionModel(
      makeBase({
        peerReviewAssignmentId: assignment2._id,
        reviewerKind: 'Student',
        reviewerUserId: studentUserId,
      })
    ).save();

    expect(ok.peerReviewAssignmentId.toString()).toBe(
      assignment2._id.toString()
    );
  });

  it('should delete an existing submission', async () => {
    const s = await new PeerReviewSubmissionModel(makeBase()).save();

    await PeerReviewSubmissionModel.deleteOne({ _id: s._id });
    const found = await PeerReviewSubmissionModel.findById(s._id);

    expect(found).toBeNull();
  });
});
