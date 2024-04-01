import AssessmentModel from '@models/Assessment';
import TeamSetModel from '@models/TeamSet';
import { User } from '@shared/types/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import UserModel from '../../models/User';
import {
  addFacultyToCourse,
  addMilestoneToCourse,
  addSprintToCourse,
  addStudentsToCourse,
  addTAsToCourse,
  createNewCourse,
  deleteCourseById,
  getAssessmentsFromCourse,
  getCourseById,
  getCourseCodeById,
  getCourseTeachingTeam,
  getCourseTimeline,
  getPeopleFromCourse,
  getTeamSetNamesFromCourse,
  getTeamSetsFromCourse,
  removeFacultyFromCourse,
  removeStudentsFromCourse,
  removeTAsFromCourse,
  updateFacultyInCourse,
  updateStudentsInCourse,
  updateTAsInCourse,
} from '../../services/courseService';
import { NotFoundError } from '../../services/errors';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri);
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

const commonCourseDetailsDefault = {
  name: 'Software Engineering Project',
  code: 'CS3203',
  semester: 'Sem 2 2023/24',
  startDate: new Date('2024-01-15'),
  courseType: 'Normal',
};

const commonCourseDetails = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  semester: 'Fall 2024',
  startDate: new Date('2024-08-15'),
  courseType: 'Normal',
};

const commonStudentDetails = {
  identifier: 'uniqueuserid',
  name: 'John Doe',
  gitHandle: 'johndoe',
};

const commonTADetails = {
  identifier: 'uniquetaid',
  name: 'John Doe ta',
  gitHandle: 'johndoeta',
};

const commonFacultyDetails = {
  identifier: 'uniquefacultyid',
  name: 'John Doe faculty',
  gitHandle: 'johndoefaculty',
};

async function createTestCourse(courseData: any) {
  const course = new CourseModel(courseData);
  await course.save();
  return course;
}

async function createStudentUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Student',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return { user, account };
}

async function createTAUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Teaching assistant',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return { user, account };
}

async function createFacultyUser(userData: any) {
  const user = new UserModel({
    ...userData,
    enrolledCourses: [],
  });
  await user.save();

  const account = new AccountModel({
    email: `${userData.identifier}@example.com`,
    password: 'hashedpassword',
    role: 'Faculty member',
    user: user._id,
    isApproved: true,
  });
  await account.save();

  return { user, account };
}

describe('courseService', () => {
  let courseId: string;
  let studentId: string;
  let studentAccountId: string;
  let taId: string;
  let taAccountId: string;
  let facultyId: string;
  let facultyAccountId: string;

  beforeEach(async () => {
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});
    await AccountModel.deleteMany({});

    const studentPair = await createStudentUser(commonStudentDetails);
    const student = studentPair.user;
    studentId = student._id.toString();
    const studentAccount = studentPair.account;
    studentAccountId = studentAccount._id.toString();

    const taPair = await createTAUser(commonTADetails);
    const ta = taPair.user;
    taId = ta._id.toString();
    const taAccount = taPair.account;
    taAccountId = taAccount._id.toString();

    const facultyPair = await createFacultyUser(commonFacultyDetails);
    const faculty = facultyPair.user;
    facultyId = faculty._id.toString();
    const facultyAccount = facultyPair.account;
    facultyAccountId = facultyAccount._id.toString();

    const course = await createTestCourse(commonCourseDetailsDefault);
    courseId = course._id.toString();
  });

  describe('createNewCourse', () => {
    it('should create a new course', async () => {
      const newCourse = await createNewCourse(
        commonCourseDetails,
        facultyAccountId
      );
      expect(newCourse).toBeDefined();
      expect(newCourse.name).toBe(commonCourseDetails.name);
    });

    it('should throw NotFoundError for an invalid account', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(
        createNewCourse(commonCourseDetails, invalidAccountId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for an invalid user', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce(null);
      await expect(
        createNewCourse(commonCourseDetails, facultyAccountId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCoursesForUser', () => {
    it('should retrieve courses for a user', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      const faculty = await UserModel.findOne({ _id: facultyId });
      if (!course || !faculty) {
        throw new Error('Course or faculty not found');
      }
      course.faculty.push(faculty._id);
      faculty.enrolledCourses.push(course._id);
      course.save();
      faculty.save();

      const courses = await getCoursesForUser(facultyAccountId);
      expect(courses).toBeDefined();
      expect(courses.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundError for an invalid account', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(getCoursesForUser(invalidAccountId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getCourseById', () => {
    it('should retrieve a course by id', async () => {
      const retrievedCourse = await getCourseById(courseId, facultyAccountId);
      expect(retrievedCourse).toBeDefined();
      expect(retrievedCourse._id.toString()).toEqual(courseId);
    });

    it('should throw NotFoundError for invalid accountId', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(getCourseById(courseId, invalidAccountId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getCourseById(invalidCourseId, facultyAccountId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStudentsInCourse', () => {
    it('should update students in a course', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name + ' updated',
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await updateStudentsInCourse(courseId, studentDataList);
      const updatedCourse = await CourseModel.findById(courseId).populate<{
        students: User[];
      }>('students');

      // Check if the student details have been updated
      expect(
        updatedCourse?.students.find(
          student => student.identifier === commonStudentDetails.identifier
        )?.name
      ).toBe(commonStudentDetails.name + ' updated');
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await expect(
        updateStudentsInCourse(invalidCourseId, studentDataList)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeStudentsFromCourse', () => {
    it('should remove students from a course', async () => {
      await removeStudentsFromCourse(courseId, studentId);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      expect(updatedCourse?.students.length).toBe(0);
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(updateStudentsInCourse(invalidCourseId, [])).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateCourseById', () => {
    it('should update a course', async () => {
      const updateData = {
        semester: 'Sem 1 2023/24',
      };
      await updateCourseById(courseId, updateData);
      const updatedCourse = await CourseModel.findById(courseId);
      expect(updatedCourse).toBeDefined();
      expect(updatedCourse?.semester).toBe(updateData.semester);
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const updateData = {
        semester: 'Sem 1 2023/24',
      };
      await expect(
        updateCourseById(invalidCourseId, updateData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteCourseById', () => {
    it('should delete a course', async () => {
      await deleteCourseById(courseId);
      const course = await CourseModel.findById(courseId);
      expect(course).toBeNull();
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(deleteCourseById(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getCourseCodeById', () => {
    it('should retrieve a course code by id', async () => {
      const courseCode = await getCourseCodeById(courseId);
      expect(courseCode).toBeDefined();
      expect(courseCode).toBe(commonCourseDetailsDefault.code);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getCourseCodeById(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('addStudentsToCourse', () => {
    const studentEmail = commonStudentDetails.identifier + '@example.com';

    it('should add students to a course', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: studentEmail,
        },
      ];
      await addStudentsToCourse(courseId, studentDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      expect(
        updatedCourse?.students.some(student => student._id.equals(studentId))
      ).toBe(true);
    });

    it('should add new students to a course', async () => {
      const studentDataList = [
        {
          identifier: 'newstudent',
          name: 'New Student',
          email: 'newstudent@gmail.com',
        },
      ];
      await addStudentsToCourse(courseId, studentDataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      expect(
        (updatedCourse?.students as unknown as User[]).some(
          student => student.identifier === studentDataList[0].identifier
        )
      ).toBe(true);
    });

    it('should not update if student is not a student', async () => {
      const studentDataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await addStudentsToCourse(courseId, studentDataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      expect(
        updatedCourse?.students.some(student => student._id.equals(studentId))
      ).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: studentEmail,
        },
      ];
      await expect(
        addStudentsToCourse(invalidCourseId, studentDataList)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStudentsInCourse', () => {
    it('should update students in a course', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await addStudentsToCourse(courseId, studentDataList);

      const updatedStudentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name + ' updated',
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await updateStudentsInCourse(courseId, updatedStudentDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonStudentDetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonStudentDetails.name + ' updated');
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await expect(
        updateStudentsInCourse(invalidCourseId, studentDataList)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not update is student is not a student', async () => {
      const updatedStudentDataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name + ' updated',
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await updateStudentsInCourse(courseId, updatedStudentDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonTADetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonTADetails.name);
    });
  });

  describe('removeStudentsFromCourse', () => {
    it('should remove students from a course', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await addStudentsToCourse(courseId, studentDataList);

      await removeStudentsFromCourse(courseId, studentId);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      expect(
        updatedCourse?.students.some(student => student._id.equals(studentId))
      ).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        removeStudentsFromCourse(invalidCourseId, studentId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if student is not found', async () => {
      expect(
        removeStudentsFromCourse(
          courseId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addTAsToCourse', () => {
    const TAEmail = commonTADetails.identifier + '@example.com';

    it('should add TAs to a course', async () => {
      const TADataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: TAEmail,
        },
      ];
      await addTAsToCourse(courseId, TADataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('TAs');
      expect(updatedCourse?.TAs.some(ta => ta._id.equals(taId))).toBe(true);
    });

    it('should add new TA to a course', async () => {
      const TADataList = [
        {
          identifier: 'newTA',
          name: 'New TA',
          email: 'newta@gmail.com',
        },
      ];
      await addTAsToCourse(courseId, TADataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('TAs');
      expect(
        (updatedCourse?.TAs as unknown as User[]).some(
          ta => ta.identifier === TADataList[0].identifier
        )
      ).toBe(true);
    });

    it('should not update if TA is not a TA', async () => {
      const TADataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await addTAsToCourse(courseId, TADataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('TAs');
      expect(updatedCourse?.TAs.some(ta => ta._id.equals(taId))).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const TADataList = [
        { identifier: taId, name: commonTADetails.name, email: TAEmail },
      ];
      await expect(addTAsToCourse(invalidCourseId, TADataList)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateTAsInCourse ', () => {
    it('should update tas in a course', async () => {
      const taDataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await addTAsToCourse(courseId, taDataList);

      const updatedTADataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name + ' updated',
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await updateTAsInCourse(courseId, updatedTADataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonTADetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonTADetails.name + ' updated');
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const taDataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await expect(
        updateTAsInCourse(invalidCourseId, taDataList)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not update is ta is not a ta', async () => {
      const updatedTaDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name + ' updated',
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await updateTAsInCourse(courseId, updatedTaDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonTADetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonTADetails.name);
    });
  });

  describe('getCourseTeachingTeam', () => {
    it('should retrieve the teaching team for a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      const faculty = await UserModel.findOne({ _id: facultyId });
      if (!course || !faculty) {
        throw new Error('Course or faculty not found');
      }
      course.faculty.push(faculty._id);
      faculty.enrolledCourses.push(course._id);
      course.save();
      faculty.save();
      const teachingTeam = await getCourseTeachingTeam(courseId);
      expect(teachingTeam).toBeDefined();
      expect(teachingTeam.some(member => member._id.equals(facultyId))).toBe(
        true
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getCourseTeachingTeam(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('removeTAsFromCourse ', () => {
    it('should remove tas from a course', async () => {
      const taDataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await addTAsToCourse(courseId, taDataList);

      await removeTAsFromCourse(courseId, taId);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('TAs');
      expect(updatedCourse?.TAs.some(student => student._id.equals(taId))).toBe(
        false
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(removeTAsFromCourse(invalidCourseId, taId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw error if ta is not found', async () => {
      expect(
        removeTAsFromCourse(courseId, new mongoose.Types.ObjectId().toString())
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addFacultyToCourse', () => {
    const facultyEmail = commonfacultyDetails.identifier + '@example.com';

    it('should add faculty to a course', async () => {
      const facultyDataList = [
        {
          identifier: commonfacultyDetails.identifier,
          name: commonfacultyDetails.name,
          email: facultyEmail,
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');
      expect(
        updatedCourse?.faculty.some(faculty => faculty._id.equals(facultyId))
      ).toBe(true);
    });

    it('should add new faculty to a course', async () => {
      const facultyDataList = [
        {
          identifier: 'newFaculty',
          name: 'New Faculty',
          email: 'newfac@gmail.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');
      expect(
        (updatedCourse?.faculty as unknown as User[]).some(
          faculty => faculty.identifier === facultyDataList[0].identifier
        )
      ).toBe(true);
    });

    it('should not update if faculty is not a faculty', async () => {
      const facultyDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);
      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');
      expect(
        updatedCourse?.faculty.some(faculty => faculty._id.equals(facultyId))
      ).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const facultyDataList = [
        {
          identifier: taId,
          name: commonfacultyDetails.name,
          email: facultyEmail,
        },
      ];
      await expect(
        addFacultyToCourse(invalidCourseId, facultyDataList)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateFacultyInCourse', () => {
    it('should update faculty in a course', async () => {
      const facultyDataList = [
        {
          identifier: commonfacultyDetails.identifier,
          name: commonfacultyDetails.name,
          email: commonfacultyDetails.identifier + '@example.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);

      const updatedFacultyDataList = [
        {
          identifier: commonfacultyDetails.identifier,
          name: commonfacultyDetails.name + ' updated',
          email: commonfacultyDetails.identifier + '@example.com',
        },
      ];
      await updateFacultyInCourse(courseId, updatedFacultyDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonfacultyDetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonfacultyDetails.name + ' updated');
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const facultyDataList = [
        {
          identifier: commonfacultyDetails.identifier,
          name: commonfacultyDetails.name,
          email: commonfacultyDetails.identifier + '@example.com',
        },
      ];
      await expect(
        updateFacultyInCourse(invalidCourseId, facultyDataList)
      ).rejects.toThrow(NotFoundError);
    });

    it('should not update is faculty is not a faculty', async () => {
      const updatedFacultyDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name + ' updated',
          email: commonStudentDetails.identifier + '@example.com',
        },
      ];
      await updateFacultyInCourse(courseId, updatedFacultyDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonfacultyDetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonfacultyDetails.name);
    });
  });

  describe('removeFacultyFromCourse', () => {
    it('should remove faculty from a course', async () => {
      const facultyDataList = [
        {
          identifier: commonfacultyDetails.identifier,
          name: commonfacultyDetails.name,
          email: commonfacultyDetails.identifier + '@example.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);

      await removeFacultyFromCourse(courseId, facultyId);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');
      expect(
        updatedCourse?.faculty.some(faculty => faculty._id.equals(facultyId))
      ).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        removeFacultyFromCourse(invalidCourseId, facultyId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if faculty is not found', async () => {
      expect(
        removeFacultyFromCourse(
          courseId,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPeopleFromCourse', () => {
    it('should get people from a course', async () => {
      const student = await UserModel.findOne({ _id: studentId });
      const ta = await UserModel.findOne({ _id: taId });
      const faculty = await UserModel.findOne({ _id: facultyId });
      if (!student || !ta || !faculty) {
        throw new Error('Student, TA, or faculty not found');
      }
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }
      course.students.push(student._id);
      course.TAs.push(ta._id);
      course.faculty.push(faculty._id);
      student.enrolledCourses.push(course._id);
      ta.enrolledCourses.push(course._id);
      faculty.enrolledCourses.push(course._id);
      await course.save();
      await student.save();
      await ta.save();
      await faculty.save();

      const people = await getPeopleFromCourse(courseId);
      expect(people).toBeDefined();
      expect(people.students.length).toBe(1);
      expect(people.students.some(person => person._id.equals(studentId))).toBe(
        true
      );
      expect(people.TAs.length).toBe(1);
      expect(people.TAs.some(person => person._id.equals(taId))).toBe(true);
      expect(people.faculty.length).toBe(1);
      expect(people.faculty.some(person => person._id.equals(facultyId))).toBe(
        true
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getPeopleFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getTeamSetsFromCourse', () => {
    it('should get team sets from a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }
      const teamSet = new TeamSetModel({
        course: course._id,
        name: 'Team Set 1',
      });
      teamSet.save();
      course.teamSets.push(teamSet._id);
      await course.save();

      const teamSets = await getTeamSetsFromCourse(taAccountId, courseId);
      expect(teamSets).toBeDefined();
      expect(teamSets.length).toBe(1);
      expect(teamSets.some(set => set._id.equals(teamSet._id))).toBe(true);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getTeamSetsFromCourse(taAccountId, invalidCourseId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid account', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(
        getTeamSetsFromCourse(invalidAccountId, courseId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTeamSetNamesFromCourse', () => {
    it('should get team set names from a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }
      const teamSet = new TeamSetModel({
        course: course._id,
        name: 'Team Set 1',
      });
      teamSet.save();
      course.teamSets.push(teamSet._id);
      await course.save();

      const teamSetNames = await getTeamSetNamesFromCourse(courseId);

      expect(teamSetNames.length).toBe(1);
      expect(teamSetNames[0]).toBe('Team Set 1');
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getTeamSetNamesFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('addMilestoneToCourse', () => {
    it('should add a milestone to a course', async () => {
      const milestoneData = {
        number: 1,
        dateline: new Date(),
        description: 'Milestone 1',
      };
      await addMilestoneToCourse(courseId, milestoneData);

      const updatedCourse = await CourseModel.findById(courseId);
      expect(
        updatedCourse?.milestones.some(
          milestone => milestone.number === milestoneData.number
        )
      ).toBe(true);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const milestoneData = {
        number: 1,
        dateline: new Date(),
        description: 'Milestone 1',
      };
      await expect(
        addMilestoneToCourse(invalidCourseId, milestoneData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('addSprintToCourse', () => {
    it('should add a sprint to a course', async () => {
      const sprintData = {
        number: 1,
        startDate: new Date(),
        endDate: new Date(),
        description: 'Sprint 1',
      };
      await addSprintToCourse(courseId, sprintData);

      const updatedCourse = await CourseModel.findById(courseId);
      expect(
        updatedCourse?.sprints.some(
          sprint => sprint.number === sprintData.number
        )
      ).toBe(true);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const sprintData = {
        number: 1,
        startDate: new Date(),
        endDate: new Date(),
        description: 'Sprint 1',
      };
      await expect(
        addSprintToCourse(invalidCourseId, sprintData)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCourseTimeline', () => {
    it('should get the timeline for a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }
      const sprint = {
        number: 1111,
        startDate: new Date(),
        endDate: new Date(),
        description: 'Sprint 1',
      };

      const milestone = {
        number: 222,
        dateline: new Date(),
        description: 'Milestone 1',
      };
      course.sprints.push(sprint);
      course.milestones.push(milestone);
      await course.save();

      const timeline = await getCourseTimeline(courseId);
      expect(timeline.sprints.length).toBe(1);
      expect(timeline.milestones.length).toBe(1);
      expect(timeline.sprints[0].number).toBe(sprint.number);
      expect(timeline.milestones[0].number).toBe(milestone.number);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      expect(getCourseTimeline(invalidCourseId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAssessmentsFromCourse', () => {
    it('should get the assessments for a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }
      const teamAssessment = new AssessmentModel({
        course: courseId,
        assessmentType: 'Exam',
        markType: 'Percentage',
        results: [],
        frequency: 'Once',
        granularity: 'team',
      });
      teamAssessment.save();
      course.assessments.push(teamAssessment._id);
      await course.save();

      const assessments = await getAssessmentsFromCourse(courseId);
      expect(assessments.length).toBe(1);
      expect(assessments[0]._id.equals(teamAssessment._id)).toBe(true);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      expect(getAssessmentsFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
