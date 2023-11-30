import Course from '../models/Course';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';
import User, { User as IUser } from '../models/User';
import Account from '../models/Account';
import Role from '../../shared/types/auth/Role';
import { NotFoundError } from './errors';

/*----------------------------------------Course----------------------------------------*/
export const createNewCourse = async (courseData: any) => {
  await Course.create(courseData);
};

export const getAllCourses = async () => {
  return await Course.find();
};

export const getCourseById = async (courseId: string) => {
  const course = await Course.findById(courseId)
    .populate('faculty')
    .populate('TAs')
    .populate('students')
    .populate({
      path: 'teamSets',
      populate: {
        path: 'teams',
        populate: ['members', 'TA'],
      },
    })
    .populate({
      path: 'assessments',
      populate: {
        path: 'teamSet',
      },
    });
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course;
};

export const updateCourseById = async (courseId: string, updateData: any) => {
  const updatedCourse = await Course.findByIdAndUpdate(courseId, updateData, {
    new: true,
  });
  if (!updatedCourse) {
    throw new NotFoundError('Course not found');
  }
};

export const deleteCourseById = async (courseId: string) => {
  const deletedCourse = await Course.findByIdAndDelete(courseId);
  if (!deletedCourse) {
    throw new NotFoundError('Course not found');
  }
  await Team.deleteMany({ teamSet: { $in: deletedCourse.teamSets } });
  await TeamSet.deleteMany({ _id: { $in: deletedCourse.teamSets } });
  await User.updateMany(
    { enrolledCourses: courseId },
    { $pull: { enrolledCourses: courseId } }
  );
};

/*----------------------------------------Student----------------------------------------*/
export const addStudentsToCourse = async (
  courseId: string,
  studentDataList: any[]
) => {
  const course = await Course.findById(courseId).populate<{
    students: IUser[];
  }>('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const studentData of studentDataList) {
    const studentId = studentData.identifier;
    let student = await User.findOne({ identifier: studentId });
    if (!student) {
      student = new User({
        identifier: studentId,
        name: studentData.name,
        enrolledCourses: [],
        gitHandle: studentData.gitHandle ?? null,
      });
      await student.save();
      const newAccount = new Account({
        email: studentData.email,
        role: Role.Student,
        isApproved: false,
        user: student._id,
      });
      await newAccount.save();
    } else {
      const studentAccount = await Account.findOne({ user: student._id });
      if (studentAccount && studentAccount.role !== Role.Student) {
        continue;
      }
    }
    if (!student.enrolledCourses.includes(course._id)) {
      student.enrolledCourses.push(course._id);
    }
    await student.save();
    if (!course.students.some(s => s.identifier === student?.identifier)) {
      course.students.push(student);
    }
  }
  await course.save();
};

/*----------------------------------------TA----------------------------------------*/
export const addTAsToCourse = async (courseId: string, TADataList: any[]) => {
  const course = await Course.findById(courseId).populate<{ TAs: IUser[] }>(
    'TAs'
  );
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const TAData of TADataList) {
    const TAId = TAData.identifier;
    let TA = await User.findOne({ identifier: TAId });
    if (!TA) {
      TA = new User({
        identifier: TAId,
        name: TAData.name,
        enrolledCourses: [],
        gitHandle: TAData.gitHandle ?? null,
      });
      await TA.save();
      const newAccount = new Account({
        email: TAData.email,
        role: Role.TA,
        isApproved: false,
        user: TA._id,
      });
      newAccount.save();
    } else {
      const TAAccount = await Account.findOne({ user: TA._id });
      if (TAAccount && TAAccount.role !== 'Teaching assistant') {
        continue;
      }
    }
    if (!TA.enrolledCourses.includes(course._id)) {
      TA.enrolledCourses.push(course._id);
    }
    await TA.save();
    if (!course.TAs.some(ta => ta.identifier === TA?.identifier)) {
      course.TAs.push(TA);
    }
  }
  await course.save();
};

export const getCourseTeachingTeam = async (courseId: string) => {
  const course = await Course.findById(courseId)
    .populate('faculty')
    .populate('TAs');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return [...course.faculty, ...course.TAs];
};

/*----------------------------------------Milestone----------------------------------------*/
export const addMilestoneToCourse = async (
  courseId: string,
  milestoneData: { number: number; dateline: Date; description: string }
) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  course.milestones.push(milestoneData);
  await course.save();
};

/*----------------------------------------Sprint----------------------------------------*/
export const addSprintToCourse = async (
  courseId: string,
  sprintData: {
    number: number;
    startDate: Date;
    endDate: Date;
    description: string;
  }
) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  course.sprints.push(sprintData);
  await course.save();
};
