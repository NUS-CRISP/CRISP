import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Types } from 'mongoose';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';
import InternalAssessmentModel from '../../models/InternalAssessment';
import PeerReviewModel from '../../models/PeerReview';

let mongoServer: MongoMemoryServer;

let testCourseId: Types.ObjectId;
let testTeamSetId: Types.ObjectId;
let testAssessmentId: Types.ObjectId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await PeerReviewModel.deleteMany({});
  await InternalAssessmentModel.deleteMany({});
  await TeamSetModel.deleteMany({});
  await CourseModel.deleteMany({});

  const course = await new CourseModel({
    name: 'Test Course',
    code: 'TEST1234',
    semester: 'Spring 2026',
    startDate: new Date('2026-01-01'),
    courseType: 'Normal',
  }).save();

  const teamSet = await new TeamSetModel({
    name: 'Test TeamSet',
    course: course._id,
  }).save();

  testCourseId = course._id;
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
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('PeerReviewModel', () => {
  const makeValidPeerReview = (
    overrides: Partial<Record<string, any>> = {}
  ) => {
    const now = Date.now();
    const startDate = new Date(now + 60000); // 1 min future
    const endDate = new Date(now + 120000); // 2 min future

    return {
      course: testCourseId,
      teamSetId: testTeamSetId,
      internalAssessmentId: testAssessmentId,
      title: 'PR Title',
      description: 'PR Desc',
      startDate,
      endDate,
      reviewerType: 'Individual',
      taAssignments: false,
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
      // status omitted to test default unless overridden
      ...overrides,
    };
  };

  it('should create and save a valid peer review', async () => {
    const pr = new PeerReviewModel(makeValidPeerReview());
    const saved = await pr.save();

    expect(saved.course.toString()).toBe(testCourseId.toString());
    expect(saved.teamSetId.toString()).toBe(testTeamSetId.toString());
    expect(saved.title).toBe('PR Title');
    expect(saved.reviewerType).toBe('Individual');
  });

  it('should default status to Upcoming', async () => {
    const pr = new PeerReviewModel(makeValidPeerReview({ status: undefined }));
    const saved = await pr.save();
    expect(saved.status).toBe('Upcoming');
  });

  it('should default reviewerType to Individual', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ reviewerType: undefined })
    );
    const saved = await pr.save();
    expect(saved.reviewerType).toBe('Individual');
  });

  it('should not save without required fields', async () => {
    const pr = new PeerReviewModel({
      // missing course, title, startDate, endDate, teamSetId, etc.
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
      taAssignments: false,
    });

    await expect(pr.save()).rejects.toThrow();
  });

  it('should reject when endDate exists but startDate is missing', async () => {
    const pr = new PeerReviewModel({
      course: testCourseId,
      teamSetId: testTeamSetId,
      internalAssessmentId: testAssessmentId,
      title: 'PR Title',
      endDate: new Date(Date.now() + 60000),
      reviewerType: 'Individual',
      taAssignments: false,
      minReviewsPerReviewer: 1,
      maxReviewsPerReviewer: 2,
    });

    await expect(pr.save()).rejects.toThrow();
  });

  it('should enforce endDate after startDate', async () => {
    const now = Date.now();
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date(now + 120000),
        endDate: new Date(now + 60000),
      })
    );

    await expect(pr.save()).rejects.toThrow(
      /end date must be after start date/i
    );
  });

  it('should allow past endDate for already closed peer reviews', async () => {
    const now = Date.now();
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date(now - 120000),
        endDate: new Date(now - 60000),
      })
    );

    const saved = await pr.save();
    expect(saved.computedStatus).toBe('Closed');
  });

  it('should allow gradingEndDate without gradingStartDate', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: null,
        gradingEndDate: new Date(Date.now() + 300000),
      })
    );

    const saved = await pr.save();
    expect(saved.gradingEndDate).toBeInstanceOf(Date);
  });

  it('should enforce gradingEndDate after gradingStartDate', async () => {
    const now = Date.now();
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date(now + 300000),
        gradingEndDate: new Date(now + 240000),
      })
    );

    await expect(pr.save()).rejects.toThrow(/gradingEndDate must be after gradingStartDate/i);
  });

  it('should enforce minReviewsPerReviewer >= 0', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ minReviewsPerReviewer: -1 })
    );
    await expect(pr.save()).rejects.toThrow(/minReviewsPerReviewer/i);
  });

  it('should enforce maxReviewsPerReviewer >= 1', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({ maxReviewsPerReviewer: 0 })
    );
    await expect(pr.save()).rejects.toThrow(/maxReviewsPerReviewer/i);
  });

  it('should enforce maxReviewsPerReviewer >= minReviewsPerReviewer', async () => {
    const pr = new PeerReviewModel(
      makeValidPeerReview({
        minReviewsPerReviewer: 3,
        maxReviewsPerReviewer: 2,
      })
    );

    await expect(pr.save()).rejects.toThrow(
      /maxReviewsPerReviewer must be greater than or equal to minReviewsPerReviewer/i
    );
  });

  it('should compute computedStatus = Upcoming when now < startDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Upcoming');
    jest.useRealTimers();
  });

  it('should compute computedStatus = Active when startDate <= now <= endDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Active');
    jest.useRealTimers();
  });

  it('should compute computedStatus = Closed when now > endDate', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-04T00:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    expect(pr.computedStatus).toBe('Closed');
    jest.useRealTimers();
  });

  it('should include computedStatus in JSON (virtuals enabled)', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const pr = await new PeerReviewModel(
      makeValidPeerReview({
        startDate: new Date('2030-01-02T00:00:00.000Z'),
        endDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );

    const json = pr.toJSON() as any;
    expect(json.computedStatus).toBe('Active');

    jest.useRealTimers();
  });

  it('should compute computedGradingStatus = NotStarted when no grading dates exist', () => {
    const pr = new PeerReviewModel(makeValidPeerReview());
    expect(pr.computedGradingStatus).toBe('NotStarted');
  });

  it('should compute computedGradingStatus from gradingStartDate only', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const beforeStart = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date('2030-01-03T00:00:00.000Z'),
        gradingEndDate: null,
      })
    );
    expect(beforeStart.computedGradingStatus).toBe('NotStarted');

    const afterStart = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date('2030-01-02T00:00:00.000Z'),
        gradingEndDate: null,
      })
    );
    expect(afterStart.computedGradingStatus).toBe('InProgress');

    jest.useRealTimers();
  });

  it('should compute computedGradingStatus from gradingEndDate only', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));

    const beforeEnd = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: null,
        gradingEndDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );
    expect(beforeEnd.computedGradingStatus).toBe('InProgress');

    const afterEnd = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: null,
        gradingEndDate: new Date('2030-01-02T00:00:00.000Z'),
      })
    );
    expect(afterEnd.computedGradingStatus).toBe('Completed');

    jest.useRealTimers();
  });

  it('should compute computedGradingStatus when gradingStartDate and gradingEndDate both exist', () => {
    jest.useFakeTimers();

    jest.setSystemTime(new Date('2030-01-01T12:00:00.000Z'));
    const beforeWindow = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date('2030-01-02T00:00:00.000Z'),
        gradingEndDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );
    expect(beforeWindow.computedGradingStatus).toBe('NotStarted');

    jest.setSystemTime(new Date('2030-01-02T12:00:00.000Z'));
    const inWindow = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date('2030-01-02T00:00:00.000Z'),
        gradingEndDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );
    expect(inWindow.computedGradingStatus).toBe('InProgress');

    jest.setSystemTime(new Date('2030-01-04T00:00:00.000Z'));
    const afterWindow = new PeerReviewModel(
      makeValidPeerReview({
        gradingStartDate: new Date('2030-01-02T00:00:00.000Z'),
        gradingEndDate: new Date('2030-01-03T00:00:00.000Z'),
      })
    );
    expect(afterWindow.computedGradingStatus).toBe('Completed');

    jest.useRealTimers();
  });

  it('should update an existing peer review', async () => {
    const pr = await new PeerReviewModel(makeValidPeerReview()).save();

    const updated = await PeerReviewModel.findByIdAndUpdate(
      pr._id,
      { title: 'Updated Title' },
      { new: true }
    );

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('Updated Title');
  });

  it('should delete an existing peer review', async () => {
    const pr = await new PeerReviewModel(makeValidPeerReview()).save();

    await PeerReviewModel.deleteOne({ _id: pr._id });
    const found = await PeerReviewModel.findById(pr._id);

    expect(found).toBeNull();
  });
});
