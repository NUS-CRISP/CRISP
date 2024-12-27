import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentAssignmentSetModel from '../../models/AssessmentAssignmentSet';
import InternalAssessmentModel from '../../models/InternalAssessment';
import TeamModel from '../../models/Team';
import CourseModel from '@models/Course';
import TeamSetModel from '@models/TeamSet';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await TeamModel.deleteMany({});
  await InternalAssessmentModel.deleteMany({});
  await AssessmentAssignmentSetModel.deleteMany({});
  await CourseModel.deleteMany({});
  await TeamSetModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AssessmentAssignmentSet Model', () => {
  it('should create and save an AssessmentAssignmentSet', async () => {
    const course = await CourseModel.create({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal',
    });
    await course.save();
    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: course._id,
      teams: [],
    });
    await teamSet.save();
    const startDate = new Date();
    startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
    const assessment = new InternalAssessmentModel({
      course: course._id,
      assessmentName: 'Midterm Exam',
      description: 'Midterm assessment',
      startDate: startDate,
      maxMarks: 100,
      scaleToMaxMarks: true,
      granularity: 'team',
      teamSet: teamSet._id,
      areSubmissionsEditable: true,
      results: [],
      isReleased: true,
      questions: [],
    });
    assessment.save();

    const team1 = new TeamModel({ number: 1 });
    const team2 = new TeamModel({ number: 2 });
    await team1.save();
    await team2.save();

    const assessmentAssignmentSet = new AssessmentAssignmentSetModel({
      assessment: assessment._id,
      originalTeams: [team1._id, team2._id],
      assignedTeams: [
        { team: team1._id, tas: [] },
        { team: team2._id, tas: [] },
      ],
    });

    const savedSet = await assessmentAssignmentSet.save();

    expect(savedSet._id).toBeDefined();
    expect(savedSet.assessment.toString()).toBe(assessment._id.toString());
    expect(savedSet.originalTeams.length).toBe(2);
  });

  it('should enforce unique assessment per AssessmentAssignmentSet', async () => {
    const course = await CourseModel.create({
      name: 'Introduction to Computer Science',
      code: 'CS101',
      semester: 'Fall 2024',
      startDate: new Date('2024-08-15'),
      courseType: 'Normal',
    });
    await course.save();
    const teamSet = new TeamSetModel({
      name: 'Team Set 1',
      course: course._id,
      teams: [],
    });
    await teamSet.save();

    const startDate = new Date();
    startDate.setUTCFullYear(new Date().getUTCFullYear() - 1);
    const assessment = new InternalAssessmentModel({
      course: course._id,
      assessmentName: 'Final Exam',
      description: 'Final assessment',
      startDate: startDate,
      granularity: 'team',
      areSubmissionsEditable: true,
      maxMarks: 0,
      scaleToMaxMarks: true,
      isReleased: true,
      teamSet: teamSet._id,
      results: [],
      questions: [],
    });
    await assessment.save();

    const assessmentAssignmentSet1 = new AssessmentAssignmentSetModel({
      assessment: assessment._id,
      originalTeams: [],
    });
    await assessmentAssignmentSet1.save();

    const assessmentAssignmentSet2 = new AssessmentAssignmentSetModel({
      assessment: assessment._id,
      originalTeams: [],
    });

    await expect(assessmentAssignmentSet2.save()).rejects.toThrow();
  });
});
