import mongoose, { ConnectOptions } from 'mongoose';
import CourseModel from '../../models/Course';
import { Course } from '../../../shared/types/Course';
import { MongoMemoryServer } from 'mongodb-memory-server';

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
  await CourseModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('CourseModel', () => {
  it('should create and save a new course', async () => {
    const courseData: Course = {
      name: 'Test Course',
      code: 'COURSE101',
      semester: 'Spring 2023',
      faculty: [],
      TAs: [],
      students: [],
      teamSets: [],
      sprints: [],
      milestones: [],
      assessments: [],
      courseType: 'Normal',
    };

    const course = new CourseModel(courseData);

    const savedCourse = await course.save();

    expect(savedCourse.name).toEqual(courseData.name);
    expect(savedCourse.code).toEqual(courseData.code);
    expect(savedCourse.semester).toEqual(courseData.semester);
  });

  it('should update an existing course', async () => {
    const existingCourse = new CourseModel({
      name: 'Existing Course',
      code: 'EXIST101',
      semester: 'Fall 2022',
      faculty: [],
      TAs: [],
      students: [],
      teamSets: [],
      sprints: [],
      milestones: [],
      assessments: [],
    });

    await existingCourse.save();

    const updatedCourseData: Partial<Course> = {
      name: 'Updated Course',
      semester: 'Spring 2023',
    };

    const updatedCourse = await CourseModel.findByIdAndUpdate(
      existingCourse._id,
      updatedCourseData,
      { new: true }
    );

    expect(updatedCourse?.name).toEqual(updatedCourseData.name);
    expect(updatedCourse?.semester).toEqual(updatedCourseData.semester);
    expect(updatedCourse?.code).toEqual(existingCourse.code);
  });

  it('should delete an existing course', async () => {
    const courseToDelete = new CourseModel({
      name: 'Course to Delete',
      code: 'DELETE101',
      semester: 'Fall 2022',
      faculty: [],
      TAs: [],
      students: [],
      teamSets: [],
      sprints: [],
      milestones: [],
      assessments: [],
    });

    await courseToDelete.save();

    const deletedCourse = await CourseModel.findByIdAndDelete(
      courseToDelete._id
    );

    expect(deletedCourse?._id).toStrictEqual(courseToDelete._id);
  });

  it('should not save a course without required fields', async () => {
    const courseData = {
      code: 'COURSE101',
      semester: 'Spring 2023',
    };

    const course = new CourseModel(courseData);

    await expect(course.save()).rejects.toThrow();
  });

  it('should add a sprint to an existing course', async () => {
    const existingCourse = new CourseModel({
      name: 'Course with Sprints',
      code: 'SPRINTS101',
      semester: 'Fall 2022',
      faculty: [],
      TAs: [],
      students: [],
      teamSets: [],
      sprints: [],
      milestones: [],
      assessments: [],
    });

    await existingCourse.save();

    const newSprint = {
      number: 1,
      description: 'First Sprint',
      startDate: new Date('2022-10-01'),
      endDate: new Date('2022-10-15'),
    };

    existingCourse.sprints.push(newSprint);

    const updatedCourse = await existingCourse.save();

    expect(updatedCourse.sprints).toHaveLength(1);
    expect(updatedCourse.sprints[0].number).toEqual(newSprint.number);
    expect(updatedCourse.sprints[0].description).toEqual(newSprint.description);
    expect(updatedCourse.sprints[0].startDate).toEqual(newSprint.startDate);
    expect(updatedCourse.sprints[0].endDate).toEqual(newSprint.endDate);
  });

  it('should add a milestone to an existing course', async () => {
    const existingCourse = new CourseModel({
      name: 'Course with Milestones',
      code: 'MILESTONES101',
      semester: 'Fall 2022',
      faculty: [],
      TAs: [],
      students: [],
      teamSets: [],
      sprints: [],
      milestones: [],
      assessments: [],
    });

    await existingCourse.save();

    const newMilestone = {
      number: 1,
      dateline: new Date('2022-11-15'),
      description: 'First Milestone',
    };

    existingCourse.milestones.push(newMilestone);

    const updatedCourse = await existingCourse.save();

    expect(updatedCourse.milestones).toHaveLength(1);
    expect(updatedCourse.milestones[0].number).toEqual(newMilestone.number);
    expect(updatedCourse.milestones[0].dateline).toEqual(newMilestone.dateline);
    expect(updatedCourse.milestones[0].description).toEqual(
      newMilestone.description
    );
  });
});
