import AssessmentModel from '@models/Assessment';
import TeamSetModel from '@models/TeamSet';
import { User } from '@shared/types/User';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AccountModel from '../../models/Account';
import CourseModel from '../../models/Course';
import {
  JiraBoardModel,
  JiraIssueModel,
  JiraSprintModel,
} from '../../models/JiraData';
import TeamModel from '../../models/Team';
import UserModel from '../../models/User';
import {
  addFacultyToCourse,
  addMilestoneToCourse,
  addRepositoriesToCourse,
  addSprintToCourse,
  addStudentsToCourse,
  addTAsToCourse,
  createNewCourse,
  deleteCourseById,
  editRepository,
  getAssessmentsFromCourse,
  getCourseById,
  getCourseCodeById,
  getCourseJiraRegistrationStatusById,
  getCourseTeachingTeam,
  getCourseTimeline,
  getCoursesForUser,
  getInternalAssessmentsFromCourse,
  getPeopleFromCourse,
  getProjectManagementBoardFromCourse,
  getRepositoriesFromCourse,
  getTeamSetNamesFromCourse,
  getTeamSetsFromCourse,
  removeFacultyFromCourse,
  removeRepositoryFromCourse,
  removeStudentsFromCourse,
  removeTAsFromCourse,
  updateCourseById,
  updateFacultyInCourse,
  updateStudentsInCourse,
  updateTAsInCourse,
} from '../../services/courseService';
import { NotFoundError } from '../../services/errors';
import InternalAssessmentModel from '@models/InternalAssessment';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const mongoUri = await mongo.getUri();
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

async function createInternalAssessment(courseId: string, assessmentData: any) {
  const assessment = new InternalAssessmentModel({
    ...assessmentData,
    course: courseId,
  });
  await assessment.save();
  // Add the assessment to the course's internalAssessments array
  const course = await CourseModel.findById(courseId);
  if (course) {
    course.internalAssessments.push(assessment._id);
    await course.save();
  }
  return assessment;
}

describe('courseService', () => {
  let courseId: string;
  let studentId: string;
  let taId: string;
  let taAccountId: string;
  let facultyId: string;
  let facultyAccountId: string;

  beforeEach(async () => {
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});
    await AccountModel.deleteMany({});

    const course = await createTestCourse(commonCourseDetailsDefault);
    courseId = course._id.toString();

    const studentPair = await createStudentUser(commonStudentDetails);
    const student = studentPair.user;
    studentId = student._id.toString();
    course.students.push(student._id);

    const taPair = await createTAUser(commonTADetails);
    const ta = taPair.user;
    taId = ta._id.toString();
    const taAccount = taPair.account;
    taAccountId = taAccount._id.toString();
    course.TAs.push(ta._id);

    const facultyPair = await createFacultyUser(commonFacultyDetails);
    const faculty = facultyPair.user;
    facultyId = faculty._id.toString();
    const facultyAccount = facultyPair.account;
    facultyAccountId = facultyAccount._id.toString();
    course.faculty.push(faculty._id);

    await course.save();
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
      ).toBe(commonStudentDetails.name.toUpperCase() + ' UPDATED');
    });

    it('should update students in a course, even if name is not provided', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          email: commonStudentDetails.identifier + '@example.com.sg',
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
      ).toBe(commonStudentDetails.name);
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
        updatedCourse?.students.some(student => student._id.equals(taId))
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
      expect(updatedUser?.name).toBe(
        commonStudentDetails.name.toUpperCase() + ' UPDATED'
      );
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
      expect(updatedCourse?.TAs.some(ta => ta._id.equals(studentId))).toBe(
        false
      );
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
      expect(updatedUser?.name).toBe(
        commonTADetails.name.toUpperCase() + ' UPDATED'
      );
    });

    it('should update tas in a course, even if name is not provided', async () => {
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
          email: commonTADetails.identifier + '@example.com.sg',
        },
      ];
      await updateTAsInCourse(courseId, updatedTADataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonTADetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonTADetails.name);
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
    const facultyEmail = commonFacultyDetails.identifier + '@example.com';

    it('should add faculty to a course', async () => {
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
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
        updatedCourse?.faculty.some(faculty => faculty._id.equals(studentId))
      ).toBe(false);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const facultyDataList = [
        {
          identifier: taId,
          name: commonFacultyDetails.name,
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
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
          email: commonFacultyDetails.identifier + '@example.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);

      const updatedFacultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name + ' updated',
          email: commonFacultyDetails.identifier + '@example.com',
        },
      ];
      await updateFacultyInCourse(courseId, updatedFacultyDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonFacultyDetails.identifier,
      });
      expect(updatedUser?.name).toBe(
        commonFacultyDetails.name.toUpperCase() + ' UPDATED'
      );
    });

    it('should update faculty in a course, even if name is not provided', async () => {
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
          email: commonFacultyDetails.identifier + '@example.com',
        },
      ];
      await addFacultyToCourse(courseId, facultyDataList);

      const updatedFacultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          email: commonFacultyDetails.identifier + '@example.com.sg',
        },
      ];
      await updateFacultyInCourse(courseId, updatedFacultyDataList);

      const updatedUser = await UserModel.findOne({
        identifier: commonFacultyDetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonFacultyDetails.name);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
          email: commonFacultyDetails.identifier + '@example.com',
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
        identifier: commonFacultyDetails.identifier,
      });
      expect(updatedUser?.name).toBe(commonFacultyDetails.name);
    });
  });

  describe('removeFacultyFromCourse', () => {
    it('should remove faculty from a course', async () => {
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
          email: commonFacultyDetails.identifier + '@example.com',
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
      student.enrolledCourses.push(course._id);
      ta.enrolledCourses.push(course._id);
      faculty.enrolledCourses.push(course._id);
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

  describe('getRepositoriesFromCourse', () => {
    it('should get repositories from a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }

      const repo1 = 'https://github.com/org/repo1';
      const repo2 = 'https://github.com/org/repo2';

      // Add repository links to the course
      course.gitHubRepoLinks.push(repo1);
      course.gitHubRepoLinks.push(repo2);
      await course.save();

      const repositories = await getRepositoriesFromCourse(courseId);

      // Ensure repositories are returned correctly
      expect(repositories).toBeDefined();
      expect(repositories.repositories.length).toBe(2);
      expect(repositories.repositories).toContain(repo1);
      expect(repositories.repositories).toContain(repo2);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();

      // Ensure the function throws NotFoundError if course is not found
      await expect(getRepositoriesFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('addRepositoriesToCourse', () => {
    const repo1 = 'https://github.com/org/repo1';
    const repo2 = 'https://github.com/org/repo2';

    it('should add repositories to a course', async () => {
      const repositories = [
        { gitHubRepoLink: repo1 },
        { gitHubRepoLink: repo2 },
      ];

      await addRepositoriesToCourse(courseId, repositories);

      const updatedCourse = await CourseModel.findById(courseId);
      expect(updatedCourse?.gitHubRepoLinks).toContain(repo1);
      expect(updatedCourse?.gitHubRepoLinks).toContain(repo2);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const repositories = [{ gitHubRepoLink: repo1 }];

      await expect(
        addRepositoriesToCourse(invalidCourseId, repositories)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('editRepository', () => {
    const initialRepoLink = 'https://github.com/org/repo1';
    const updatedRepoLink = 'https://github.com/org/repo1-updated';
    const invalidRepoLink = 123; // To test invalid repo format

    beforeEach(async () => {
      // Find the course by ID
      const course = await CourseModel.findById(courseId);

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Add a repository directly to the course
      course.gitHubRepoLinks.push(initialRepoLink);

      // Save the updated course
      await course.save();
    });

    it('should update a repository in a course', async () => {
      const repositoryIndex = 0; // Assuming the repo added above is at index 0
      const updateData = { repoLink: updatedRepoLink };

      await editRepository(courseId, repositoryIndex, updateData);

      const updatedCourse = await CourseModel.findById(courseId);
      expect(updatedCourse?.gitHubRepoLinks[repositoryIndex]).toBe(
        updatedRepoLink
      );
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const repositoryIndex = 0;
      const updateData = { repoLink: updatedRepoLink };

      await expect(
        editRepository(invalidCourseId, repositoryIndex, updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid repositoryIndex', async () => {
      const invalidRepositoryIndex = 999; // Out of bounds
      const updateData = { repoLink: updatedRepoLink };

      await expect(
        editRepository(courseId, invalidRepositoryIndex, updateData)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw an error for invalid repository link format', async () => {
      const repositoryIndex = 0; // Valid repository index
      const updateData = { repoLink: invalidRepoLink }; // Invalid repoLink format

      await expect(
        editRepository(courseId, repositoryIndex, updateData)
      ).rejects.toThrow('Invalid repository link format');

      // Ensure the repository was not updated
      const course = await CourseModel.findById(courseId);
      expect(course?.gitHubRepoLinks[repositoryIndex]).toBe(initialRepoLink);
    });
  });

  describe('removeRepositoryFromCourse', () => {
    const initialRepoLink = 'https://github.com/org/repo1';

    beforeEach(async () => {
      // Find the course by ID
      const course = await CourseModel.findById(courseId);

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Add a repository directly to the course
      course.gitHubRepoLinks.push(initialRepoLink);

      // Save the updated course
      await course.save();
    });

    it('should remove a repository from a course', async () => {
      const repositoryIndex = 0; // Assuming the repo added above is at index 0

      await removeRepositoryFromCourse(courseId, repositoryIndex);

      const updatedCourse = await CourseModel.findById(courseId);
      expect(updatedCourse?.gitHubRepoLinks.length).toBe(0);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const repositoryIndex = 0; // Valid index

      await expect(
        removeRepositoryFromCourse(invalidCourseId, repositoryIndex)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid repositoryIndex', async () => {
      const invalidRepositoryIndex = 999; // Out of bounds

      await expect(
        removeRepositoryFromCourse(courseId, invalidRepositoryIndex)
      ).rejects.toThrow(NotFoundError);
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
      await teamSet.save();
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
      await teamSet.save();
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
  describe('getInternalAssessmentsFromCourse', () => {
    it('should retrieve internal assessments for a valid course', async () => {
      // Create internal assessments
      const internalAssessmentData1 = {
        description: 'Description for Internal Assessment 1',
        maximumMarks: 100,
        isReleased: true,
        areSubmissionsEditable: true,
        granularity: 'team',
        startDate: new Date('2000-01-01'),
        assessmentName: 'Internal Assessment 1',
      };

      const internalAssessmentData2 = {
        description: 'Description for Internal Assessment 2',
        maximumMarks: 100,
        isReleased: true,
        areSubmissionsEditable: true,
        granularity: 'team',
        startDate: new Date('2000-01-01'),
        assessmentName: 'Internal Assessment 2',
      };

      await createInternalAssessment(courseId, internalAssessmentData1);
      await createInternalAssessment(courseId, internalAssessmentData2);

      // Invoke the service function
      const assessments = await getInternalAssessmentsFromCourse(courseId);

      // Assertions
      expect(assessments).toBeDefined();
      expect(assessments.length).toBe(2);
      const titles = assessments.map((a: any) => a.assessmentName);
      expect(titles).toContain(internalAssessmentData1.assessmentName);
      expect(titles).toContain(internalAssessmentData2.assessmentName);
    });

    it('should return an empty array if the course has no internal assessments', async () => {
      // Create a new course without internal assessments
      const newCourseData = {
        name: 'Data Structures',
        code: 'CS201',
        semester: 'Spring 2025',
        startDate: new Date('2025-01-10'),
        courseType: 'Normal',
      };
      const newCourse = await createTestCourse(newCourseData);
      const newCourseId = newCourse._id.toString();

      // Invoke the service function
      const assessments = await getInternalAssessmentsFromCourse(newCourseId);

      // Assertions
      expect(assessments).toBeDefined();
      expect(assessments.length).toBe(0);
    });

    it('should throw NotFoundError for an invalid course ID', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getInternalAssessmentsFromCourse(invalidCourseId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getProjectManagementBoardFromCourse', () => {
    it('should get team sets from a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }

      const mockIssue = new JiraIssueModel({
        id: 'ISSUE-1',
        self: 'Mock Issue URL',
        key: 'ISSUE-1',
        storyPoints: 5,
        fields: {
          summary: 'Mock Issue Summary',
          statuscategorychangedate: new Date(),
          issuetype: {
            name: 'Task',
            subtask: false,
          },
          status: {
            name: 'To Do',
          },
          assignee: {
            displayName: 'John Doe',
          },
          resolution: {
            name: 'Unresolved',
          },
        },
      });

      const mockSprint = new JiraSprintModel({
        id: 1,
        self: 'Mock Sprint URL',
        state: 'active',
        name: 'Mock Sprint',
        startDate: new Date(),
        endDate: new Date(),
        createdDate: new Date(),
        originBoardId: 1,
        goal: 'Mock Sprint Goal',
        jiraIssues: [mockIssue._id],
      });

      const mockBoard = new JiraBoardModel({
        id: 1,
        self: 'Mock Board URL',
        name: 'Mock Board',
        type: 'Scrum',
        jiraLocation: {
          projectId: 1,
          displayName: 'Mock Project',
          projectName: 'Mock Project Name',
          projectKey: 'MPN',
          projectTypeKey: 'Software',
          avatarURI: 'Mock Avatar URL',
          name: 'Mock Location',
        },
        columns: [{ name: 'To Do' }],
        jiraSprints: [mockSprint._id], // Assign the mock sprint to the board
        jiraIssues: [mockIssue._id], // Assign the mock issue to the board
        course: course._id,
      });

      const team = new TeamModel({
        number: 1,
        board: mockBoard._id,
      });

      const teamSet = new TeamSetModel({
        course: course._id,
        name: 'Team Set 1',
        teams: [team._id],
      });

      team.teamSet = teamSet._id;

      await mockSprint.save();
      await mockIssue.save();
      await mockBoard.save();
      await team.save();
      await teamSet.save();
      course.teamSets.push(teamSet._id);
      await course.save();

      const teamSets = await getProjectManagementBoardFromCourse(
        taAccountId,
        courseId
      );

      expect(teamSets).toBeDefined();
      expect(teamSets.length).toBe(1);
      expect(teamSets.some(set => set._id.equals(teamSet._id))).toBe(true);

      teamSets.forEach(async teamSet => {
        for (const teamId of teamSet.teams) {
          const team = await TeamModel.findById(teamId);
          expect(team).toBeDefined();

          const boardId = team?.board;
          const board = await JiraBoardModel.findById(boardId);
          expect(board).toBeDefined();

          expect(board?.jiraIssues).toBeDefined();
          expect(board?.jiraIssues.length).toBe(1);

          const jiraIssueId = board?.jiraIssues[0];
          const jiraIssue = await JiraIssueModel.findById(jiraIssueId);
          expect(jiraIssue).toBeDefined();

          expect(board?.jiraSprints).toBeDefined();
          expect(board?.jiraSprints.length).toBe(1);

          const jiraSprintId = board?.jiraSprints[0];
          const jiraSprint = await JiraSprintModel.findById(jiraSprintId);
          expect(jiraSprint).toBeDefined();

          expect(jiraSprint?.jiraIssues).toBeDefined();
          expect(jiraSprint?.jiraIssues.length).toBe(1);

          const jiraIssueId2 = jiraSprint?.jiraIssues[0];
          const jiraIssue2 = await JiraIssueModel.findById(jiraIssueId2);
          expect(jiraIssue2).toBeDefined();
        }
      });
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getProjectManagementBoardFromCourse(taAccountId, invalidCourseId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid account', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(
        getProjectManagementBoardFromCourse(invalidAccountId, courseId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCourseJiraRegistrationStatusById', () => {
    it('should get Jira registration status from a course', async () => {
      const course = await CourseModel.findOne({ _id: courseId });
      if (!course) {
        throw new Error('Course not found');
      }

      course.jira.isRegistered = true;
      await course.save();

      const jiraRegistrationStatus =
        await getCourseJiraRegistrationStatusById(courseId);

      expect(jiraRegistrationStatus).toBe(true);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getCourseJiraRegistrationStatusById(invalidCourseId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
