import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';

import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import InternalAssessmentModel from '../../models/InternalAssessment';
import PeerReviewModel from '../../models/PeerReview';
import PeerReviewAssignmentModel from '../../models/PeerReviewAssignment';
import PeerReviewCommentModel from '../../models/PeerReviewComment';

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;
let testAssessmentId: Types.ObjectId;
let testPeerReviewId: Types.ObjectId;
let testAssignmentId: Types.ObjectId;
let testAuthorId: Types.ObjectId;
let testFlaggerId: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewCommentModel.deleteMany({});
  await PeerReviewAssignmentModel.deleteMany({});
  await PeerReviewModel.deleteMany({});
  await InternalAssessmentModel.deleteMany({});
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

  const assessment = await new InternalAssessmentModel({
    course: course._id,
    assessmentType: 'peer_review',
    assessmentName: 'Peer Review Assessment',
    description: 'desc',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    maxMarks: 10,
    scaleToMaxMarks: true,
    granularity: 'individual',
    teamSet: teamSet._id,
    areSubmissionsEditable: false,
    isReleased: false,
    questions: [],
    results: [],
  }).save();
  testAssessmentId = assessment._id;

  const reviewee = await new TeamModel({
    teamSet: testTeamSetId,
    number: 1,
  }).save();

  const now = Date.now();
  const peerReview = await new PeerReviewModel({
    course: testCourseId,
    teamSetId: testTeamSetId,
    internalAssessmentId: testAssessmentId,
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

  const author = await new UserModel({
    name: 'Student One',
    identifier: 'S001',
  }).save();
  testAuthorId = author._id;

  const flagger = await new UserModel({
    name: 'TA One',
    identifier: 'TA001',
  }).save();
  testFlaggerId = flagger._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewCommentModel', () => {
  const makeValidComment = (overrides: Partial<Record<string, any>> = {}) => {
    return {
      peerReviewId: testPeerReviewId,
      peerReviewAssignmentId: testAssignmentId,
      peerReviewSubmissionId: new Types.ObjectId(), // comment schema does not require it but we usually have it
      filePath: 'src/index.ts',
      startLine: 1,
      endLine: 1,
      comment: 'Looks good',
      author: testAuthorId,
      authorCourseRole: 'Student', // must be in COURSE_ROLE enum
      // moderation fields omitted to test defaults
      ...overrides,
    };
  };

  it('should create and save a valid comment', async () => {
    const c = new PeerReviewCommentModel(makeValidComment());
    const saved = await c.save();

    expect(saved.peerReviewId.toString()).toBe(testPeerReviewId.toString());
    expect(saved.peerReviewAssignmentId.toString()).toBe(
      testAssignmentId.toString()
    );
    expect(saved.author.toString()).toBe(testAuthorId.toString());
    expect(saved.filePath).toBe('src/index.ts');
    expect(saved.startLine).toBe(1);
    expect(saved.endLine).toBe(1);
    expect(saved.comment).toBe('Looks good');
  });

  it('should default moderation fields correctly', async () => {
    const c = await new PeerReviewCommentModel(
      makeValidComment({
        isFlagged: undefined,
        flagReason: undefined,
        flaggedAt: undefined,
        flaggedBy: undefined,
      })
    ).save();

    expect(c.isFlagged).toBe(false);
    expect(c.flagReason).toBe('');
    expect(c.flaggedAt).toBeUndefined();
    expect(c.flaggedBy).toBeUndefined();
  });

  it('should not save without required fields', async () => {
    const c = new PeerReviewCommentModel({
      // missing peerReviewId, peerReviewAssignmentId, filePath, startLine, endLine, comment, author, authorCourseRole
    });

    await expect(c.save()).rejects.toThrow();
  });

  it('should enforce required peerReviewId', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ peerReviewId: undefined })
    );
    await expect(c.save()).rejects.toThrow(/peerReviewId/);
  });

  it('should enforce required peerReviewAssignmentId', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ peerReviewAssignmentId: undefined })
    );
    await expect(c.save()).rejects.toThrow(/peerReviewAssignmentId/);
  });

  it('should enforce required filePath', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ filePath: undefined })
    );
    await expect(c.save()).rejects.toThrow(/filePath/);
  });

  it('should enforce startLine >= 1', async () => {
    const c = new PeerReviewCommentModel(makeValidComment({ startLine: 0 }));
    await expect(c.save()).rejects.toThrow(/startLine/);
  });

  it('should enforce endLine >= 1', async () => {
    const c = new PeerReviewCommentModel(makeValidComment({ endLine: 0 }));
    await expect(c.save()).rejects.toThrow(/endLine/);
  });

  it('should enforce endLine >= startLine', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ startLine: 5, endLine: 3 })
    );
    await expect(c.save()).rejects.toThrow(
      /endLine must be greater than or equal to startLine/i
    );
  });

  it('should enforce required comment text', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ comment: undefined })
    );
    await expect(c.save()).rejects.toThrow(/comment/);
  });

  it('should enforce required author', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ author: undefined })
    );
    await expect(c.save()).rejects.toThrow(/author/);
  });

  it('should enforce authorCourseRole enum', async () => {
    const c = new PeerReviewCommentModel(
      makeValidComment({ authorCourseRole: 'NotARole' })
    );
    await expect(c.save()).rejects.toThrow(/authorCourseRole/);
  });

  it('should allow peerReviewSubmissionId to be omitted (not required)', async () => {
    const c = await new PeerReviewCommentModel(
      makeValidComment({ peerReviewSubmissionId: undefined })
    ).save();
    expect(c.peerReviewSubmissionId).toBeUndefined();
  });

  it('should update an existing comment', async () => {
    const c = await new PeerReviewCommentModel(makeValidComment()).save();

    const updated = await PeerReviewCommentModel.findByIdAndUpdate(
      c._id,
      { comment: 'Updated comment' },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated!.comment).toBe('Updated comment');
  });

  it('should delete an existing comment', async () => {
    const c = await new PeerReviewCommentModel(makeValidComment()).save();

    await PeerReviewCommentModel.deleteOne({ _id: c._id });
    const found = await PeerReviewCommentModel.findById(c._id);

    expect(found).toBeNull();
  });

  it('should set moderation fields when flagged', async () => {
    const c = await new PeerReviewCommentModel(makeValidComment()).save();

    const updated = await PeerReviewCommentModel.findByIdAndUpdate(
      c._id,
      {
        isFlagged: true,
        flagReason: 'Inappropriate',
        flaggedAt: new Date(),
        flaggedBy: testFlaggerId,
      },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated!.isFlagged).toBe(true);
    expect(updated!.flagReason).toBe('Inappropriate');
    expect(updated!.flaggedAt).toBeInstanceOf(Date);
    expect(updated!.flaggedBy!.toString()).toBe(testFlaggerId.toString());
  });
});
