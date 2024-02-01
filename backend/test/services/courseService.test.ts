import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import CourseModel from '../../models/Course';
import UserModel from '../../models/User';
import AccountModel from '../../models/Account';
import {
  createNewCourse,
  getCoursesForUser,
  getCourseById,
  updateCourseById,
  deleteCourseById,
  addStudentsToCourse,
  addTAsToCourse,
  getCourseTeachingTeam,
  addMilestoneToCourse,
  addSprintToCourse,
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
  courseType: 'Normal',
};

const commonCourseDetails = {
  name: 'Introduction to Computer Science',
  code: 'CS101',
  semester: 'Fall 2024',
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

const commonfacultyDetails = {
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

  return user;
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

  return user;
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
  let taId: string;
  let facultyId: string;
  let facultyAccountId: string;

  beforeEach(async () => {
    await CourseModel.deleteMany({});
    await UserModel.deleteMany({});
    await AccountModel.deleteMany({});

    const student = await createStudentUser(commonStudentDetails);
    studentId = student._id.toString();

    const ta = await createTAUser(commonTADetails);
    taId = ta._id.toString();

    const facultyPair = await createFacultyUser(commonfacultyDetails);
    const faculty = facultyPair.user;
    facultyId = faculty._id.toString();
    const facultyAccount = facultyPair.account;
    facultyAccountId = facultyAccount._id.toString();

    const course = await createTestCourse(commonCourseDetailsDefault);
    courseId = course._id.toString();
    course.faculty.push(faculty._id);
    await course.save();
    faculty.enrolledCourses.push(course._id);
    await faculty.save();
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
      jest.spyOn(UserModel, 'findById').mockResolvedValue(null);
      await expect(
        createNewCourse(commonCourseDetails, facultyAccountId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCoursesForUser', () => {
    it('should retrieve courses for a user', async () => {
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
      await expect(
        getCourseById(courseId, invalidAccountId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(
        getCourseById(invalidCourseId, facultyAccountId)
      ).rejects.toThrow(NotFoundError);
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

  describe('getCourseTeachingTeam', () => {
    it('should retrieve the teaching team for a course', async () => {
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
});
