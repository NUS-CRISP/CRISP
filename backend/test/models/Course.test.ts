import mongoose, { ConnectOptions, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseModel from '../../models/Course';
import UserModel from '../../models/User';
import TeamSetModel from '../../models/TeamSet';
import { Course, CourseType } from '@shared/types/Course';

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
  await UserModel.deleteMany({});
  await TeamSetModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('CourseModel', () => {
  it('should create and save a new course', async () => {
    const courseData: any = {
      name: 'Test Course',
      code: 'COURSE101',
      semester: 'Spring 2023',
      courseType: 'Normal' as CourseType,
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
      courseType: 'Normal' as CourseType,
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
      courseType: 'Normal' as CourseType,
    });

    await courseToDelete.save();

    await CourseModel.deleteOne({ _id: courseToDelete._id });
    const deletedCourse = await CourseModel.findById(courseToDelete._id);

    expect(deletedCourse).toBeNull();
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
      courseType: 'Normal' as CourseType,
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
      courseType: 'Normal' as CourseType,
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

  it('should add faculty members to an existing course', async () => {
    const faculty1 = new UserModel({ name: 'Faculty One', identifier: 'F001' });
    const faculty2 = new UserModel({ name: 'Faculty Two', identifier: 'F002' });
    await faculty1.save();
    await faculty2.save();

    const courseData: any = {
      name: 'Test Course',
      code: 'TC101',
      semester: 'Spring 2023',
      faculty: [faculty1._id, faculty2._id],
      courseType: 'Normal' as CourseType,
    };

    const course = new CourseModel(courseData);
    const savedCourse = await course.save();

    expect(savedCourse.faculty).toEqual(
      expect.arrayContaining([faculty1._id, faculty2._id])
    );
  });

  it('should remove a student from an existing course', async () => {
    const student = new UserModel({ name: 'Student One', identifier: 'S001' });
    await student.save();

    const course = new CourseModel({
      name: 'Test Course',
      code: 'TC102',
      semester: 'Fall 2023',
      students: [student._id],
      courseType: 'Normal' as CourseType,
    });
    await course.save();

    course.students = course.students.filter(id => !id.equals(student._id));
    const updatedCourse = await course.save();

    expect(updatedCourse.students).not.toContainEqual(student._id);
  });

  it('should fetch courses for a specific semester', async () => {
    const course1 = new CourseModel({
      name: 'Spring Course',
      code: 'SC101',
      semester: 'Spring 2023',
      courseType: 'Normal' as CourseType,
    });
    const course2 = new CourseModel({
      name: 'Fall Course',
      code: 'FC101',
      semester: 'Fall 2023',
      courseType: 'Normal' as CourseType,
    });
    await Promise.all([course1.save(), course2.save()]);

    const springCourses = await CourseModel.find({ semester: 'Spring 2023' });

    expect(springCourses).toHaveLength(1);
    expect(springCourses[0].name).toEqual('Spring Course');
  });
});
