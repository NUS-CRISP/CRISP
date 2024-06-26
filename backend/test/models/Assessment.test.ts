import { CourseType } from '@shared/types/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions } from 'mongoose';
import AssessmentModel from '../../models/Assessment';
import CourseModel from '../../models/Course';
import TeamSetModel from '../../models/TeamSet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await AssessmentModel.deleteMany({});
  await CourseModel.deleteMany({});
  await TeamSetModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AssessmentModel', () => {
  it('should create and save a new assessment', async () => {
    const course = new CourseModel({
      name: 'Test Course',
      code: 'TC101',
      semester: 'Spring 2023',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    });
    await course.save();

    const assessmentData: any = {
      course: course._id,
      assessmentType: 'Quiz',
      markType: 'Percentage',
      results: [],
      frequency: 'Weekly',
      granularity: 'individual',
    };

    const assessment = new AssessmentModel(assessmentData);
    const savedAssessment = await assessment.save();

    expect(savedAssessment.assessmentType).toEqual(
      assessmentData.assessmentType
    );
    expect(savedAssessment.markType).toEqual(assessmentData.markType);
    expect(savedAssessment.granularity).toEqual(assessmentData.granularity);
  });

  it('should update an existing assessment', async () => {
    const course = new CourseModel({
      name: 'Existing Course',
      code: 'EC101',
      semester: 'Fall 2022',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    });
    await course.save();

    const assessment = new AssessmentModel({
      course: course._id,
      assessmentType: 'Assignment',
      markType: 'Points',
      results: [],
      frequency: 'Monthly',
      granularity: 'team',
    });
    await assessment.save();

    const updatedAssessmentData = { frequency: 'Bi-Weekly' };
    const updatedAssessment = await AssessmentModel.findByIdAndUpdate(
      assessment._id,
      updatedAssessmentData,
      { new: true }
    );

    expect(updatedAssessment?.frequency).toEqual(
      updatedAssessmentData.frequency
    );
  });

  it('should delete an existing assessment', async () => {
    const course = new CourseModel({
      name: 'Course to Delete',
      code: 'CD101',
      semester: 'Spring 2022',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    });
    await course.save();

    const assessment = new AssessmentModel({
      course: course._id,
      assessmentType: 'Final Exam',
      markType: 'Grade',
      results: [],
      frequency: 'Once',
      granularity: 'individual',
    });
    await assessment.save();

    await AssessmentModel.deleteOne({ _id: assessment._id });
    const deletedAssessment = await AssessmentModel.findById(assessment._id);

    expect(deletedAssessment).toBeNull();
  });

  it('should not save an assessment without required fields', async () => {
    const assessmentData = {
      // Missing course, assessmentType, and other required fields
      results: [],
    };

    const assessment = new AssessmentModel(assessmentData);
    await expect(assessment.save()).rejects.toThrow();
  });

  it('should link an assessment to a team set', async () => {
    const course = new CourseModel({
      name: 'Course with TeamSet',
      code: 'CTS101',
      semester: 'Fall 2023',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal' as CourseType,
    });
    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: course._id,
    });
    await course.save();
    await teamSet.save();

    const assessment = new AssessmentModel({
      course: course._id,
      assessmentType: 'Project',
      markType: 'Completion',
      results: [],
      frequency: 'End of Semester',
      granularity: 'team',
      teamSet: teamSet._id,
    });
    const savedAssessment = await assessment.save();

    expect(savedAssessment.teamSet).toEqual(teamSet._id);
  });
});
