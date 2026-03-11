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

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;
let testAssessmentId: Types.ObjectId;
let testPeerReviewId: Types.ObjectId;
let testAssignmentId: Types.ObjectId;
let testSubmissionId: Types.ObjectId;
let testSubmission2Id: Types.ObjectId;
let testGraderId: Types.ObjectId;
let testGrader2Id: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
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
  await UserModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
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
    description: 'PR Desc',
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

  const reviewer = await new UserModel({
    name: 'Reviewer',
    identifier: 'S001',
  }).save();

  const submission = await new PeerReviewSubmissionModel({
    peerReviewId: testPeerReviewId,
    peerReviewAssignmentId: testAssignmentId,
    reviewerKind: 'Student',
    reviewerUserId: reviewer._id,
    status: 'Submitted',
  }).save();
  testSubmissionId = submission._id;

  const reviewer2 = await new UserModel({
    name: 'Reviewer Two',
    identifier: 'S002',
  }).save();

  const submission2 = await new PeerReviewSubmissionModel({
    peerReviewId: testPeerReviewId,
    peerReviewAssignmentId: testAssignmentId,
    reviewerKind: 'Student',
    reviewerUserId: reviewer2._id,
    status: 'Submitted',
  }).save();
  testSubmission2Id = submission2._id;

  const grader = await new UserModel({
    name: 'Grader One',
    identifier: 'TA001',
  }).save();
  testGraderId = grader._id;

  const grader2 = await new UserModel({
    name: 'Grader Two',
    identifier: 'TA002',
  }).save();
  testGrader2Id = grader2._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewGradingTaskModel', () => {
  const makeValidTask = (overrides: Partial<Record<string, any>> = {}) => ({
    peerReviewId: testPeerReviewId,
    peerReviewSubmissionId: testSubmissionId,
    grader: testGraderId,
    ...overrides,
  });

  it('should create and save a valid grading task', async () => {
    const task = new PeerReviewGradingTaskModel(makeValidTask());
    const saved = await task.save();

    expect(saved.peerReviewId.toString()).toBe(testPeerReviewId.toString());
    expect(saved.peerReviewSubmissionId!.toString()).toBe(testSubmissionId.toString());
    expect(saved.grader.toString()).toBe(testGraderId.toString());
    expect(saved.status).toBe('Assigned');
    expect(saved.score).toBeUndefined();
    expect(saved.feedback).toBeUndefined();
    expect(saved.gradedAt).toBeUndefined();
    expect(saved.assessmentSubmissionId).toBeUndefined();
  });

  it('should allow explicit grading fields to be saved', async () => {
    const gradedAt = new Date();
    const assessmentSubmissionId = new Types.ObjectId();

    const saved = await new PeerReviewGradingTaskModel(
      makeValidTask({
        status: 'Completed',
        score: 8,
        feedback: 'Well done',
        gradedAt,
        assessmentSubmissionId,
      })
    ).save();

    expect(saved.status).toBe('Completed');
    expect(saved.score).toBe(8);
    expect(saved.feedback).toBe('Well done');
    expect(saved.gradedAt).toBeInstanceOf(Date);
    expect(saved.assessmentSubmissionId!.toString()).toBe(assessmentSubmissionId.toString());
  });

  it('should not save without required fields', async () => {
    const task = new PeerReviewGradingTaskModel({});
    await expect(task.save()).rejects.toThrow();
  });

  it('should enforce required peerReviewId', async () => {
    const task = new PeerReviewGradingTaskModel(
      makeValidTask({ peerReviewId: undefined })
    );
    await expect(task.save()).rejects.toThrow(/peerReviewId/);
  });

  it('should enforce required peerReviewSubmissionId', async () => {
    const task = new PeerReviewGradingTaskModel(
      makeValidTask({ peerReviewSubmissionId: undefined })
    );
    await expect(task.save()).rejects.toThrow(/peerReviewSubmissionId/);
  });

  it('should enforce required grader', async () => {
    const task = new PeerReviewGradingTaskModel(
      makeValidTask({ grader: undefined })
    );
    await expect(task.save()).rejects.toThrow(/grader/);
  });

  it('should enforce status enum', async () => {
    const task = new PeerReviewGradingTaskModel(
      makeValidTask({ status: 'Nope' })
    );
    await expect(task.save()).rejects.toThrow(/status/);
  });

  it('should enforce unique (peerReviewId, peerReviewSubmissionId, grader) index', async () => {
    await new PeerReviewGradingTaskModel(makeValidTask()).save();

    const dup = new PeerReviewGradingTaskModel(makeValidTask());
    await expect(dup.save()).rejects.toThrow(/duplicate key/i);
  });

  it('should allow same grader across different submissions', async () => {
    await new PeerReviewGradingTaskModel(makeValidTask()).save();

    const saved = await new PeerReviewGradingTaskModel(
      makeValidTask({ peerReviewSubmissionId: testSubmission2Id })
    ).save();

    expect(saved.peerReviewSubmissionId!.toString()).toBe(testSubmission2Id.toString());
  });

  it('should allow same submission across different graders', async () => {
    await new PeerReviewGradingTaskModel(makeValidTask()).save();

    const saved = await new PeerReviewGradingTaskModel(
      makeValidTask({ grader: testGrader2Id })
    ).save();

    expect(saved.grader.toString()).toBe(testGrader2Id.toString());
  });

  it('should update an existing grading task', async () => {
    const task = await new PeerReviewGradingTaskModel(makeValidTask()).save();
    const gradedAt = new Date();

    const updated = await PeerReviewGradingTaskModel.findByIdAndUpdate(
      task._id,
      {
        status: 'InProgress',
        score: 7,
        feedback: 'Good effort',
        gradedAt,
      },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('InProgress');
    expect(updated!.score).toBe(7);
    expect(updated!.feedback).toBe('Good effort');
    expect(updated!.gradedAt).toBeInstanceOf(Date);
  });

  it('should delete an existing grading task', async () => {
    const task = await new PeerReviewGradingTaskModel(makeValidTask()).save();

    await PeerReviewGradingTaskModel.deleteOne({ _id: task._id });
    const found = await PeerReviewGradingTaskModel.findById(task._id);

    expect(found).toBeNull();
  });
});
