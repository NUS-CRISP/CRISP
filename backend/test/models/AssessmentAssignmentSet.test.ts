import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AssessmentAssignmentSetModel from '../../models/AssessmentAssignmentSet';
import InternalAssessmentModel from '../../models/InternalAssessment';
import TeamModel from '../../models/Team';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('AssessmentAssignmentSet Model', () => {
  it('should create and save an AssessmentAssignmentSet', async () => {
    const assessment = new InternalAssessmentModel({
      assessmentName: 'Midterm Exam',
      description: 'Midterm assessment',
      startDate: new Date(),
      granularity: 'team',
      areSubmissionsEditable: true,
      isReleased: false,
    });
    await assessment.save();

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
    const assessment = new InternalAssessmentModel({
      assessmentName: 'Final Exam',
      description: 'Final assessment',
      startDate: new Date(),
      granularity: 'team',
      areSubmissionsEditable: true,
      isReleased: false,
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
