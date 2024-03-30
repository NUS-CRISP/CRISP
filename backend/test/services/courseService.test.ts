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
  getCourseById,
  getCourseTeachingTeam,
  getCourseTimeline,
  getCoursesForUser,
  getPeopleFromCourse,
  getTeamSetNamesFromCourse,
  getTeamSetsFromCourse,
  removeFacultyFromCourse,
  removeStudentsFromCourse,
  removeTAsFromCourse,
  updateCourseById,
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
  let studentAccountId: string;
  let taId: string;
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

    const ta = await createTAUser(commonTADetails);
    taId = ta._id.toString();

    const facultyPair = await createFacultyUser(commonFacultyDetails);
    const faculty = facultyPair.user;
    facultyId = faculty._id.toString();
    const facultyAccount = facultyPair.account;
    facultyAccountId = facultyAccount._id.toString();

    const course = await createTestCourse(commonCourseDetailsDefault);
    courseId = course._id.toString();
    course.faculty.push(faculty._id);
    course.TAs.push(ta._id);
    course.students.push(student._id);
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
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce(null);
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
      const updatedCourse = await CourseModel.findById(courseId).populate<{ students: User[] }>('students');

      // Check if the student details have been updated
      expect(updatedCourse?.students.find(student => student.identifier === commonStudentDetails.identifier)?.name).toBe(
        commonStudentDetails.name + ' updated'
      )
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
      const updatedCourse = await CourseModel.findById(courseId).populate(
        'students'
      );
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

    it('should create a new user if the student does not exist', async () => {
      const studentDataList = [
        {
          identifier: 'newstudent',
          name: 'New Student',
          email: 'newstudent@example.com'
        }
      ];

      await addStudentsToCourse(courseId, studentDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');
      const newStudent = await UserModel
        .findOne({ identifier: 'newstudent' });

      expect(newStudent).toBeDefined();
      expect(
        updatedCourse?.students.some(student => student._id.equals(newStudent!._id))
      ).toBe(true);
    });

    it('should not add if student user exists, but account does not exist', async () => {
      const deleted = await AccountModel.deleteOne({ email: `${commonStudentDetails.identifier}@example.com` });
      expect(deleted.deletedCount).toBe(1);

      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name,
          email: `${commonStudentDetails.identifier}@example.com`,
        },
      ];

      await addStudentsToCourse(courseId, studentDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');

      // expect the student to not be added
      expect(updatedCourse?.students.length).toBe(1);

      const account = new AccountModel({
        email: `${commonStudentDetails.identifier}@example.com`,
        password: 'hashedpassword',
        role: 'Student',
        user: studentId,
        isApproved: true,
      });
      account._id = studentAccountId;
      await account.save();
      expect(await AccountModel.findOne({ email: `${commonStudentDetails.identifier}@example.com` }))
        .toEqual(await AccountModel.findById(studentAccountId));
    });

    it('should not add if student data does not match', async () => {
      const studentDataList = [
        {
          identifier: commonStudentDetails.identifier,
          name: commonStudentDetails.name + 'A',
          email: commonStudentDetails.identifier + '@example.com'
        },
      ];

      await addStudentsToCourse(courseId, studentDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('students');

      // expect the student to not be added
      expect(updatedCourse?.students.length).toBe(1);
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

  describe('updateTAsInCourse', () => {
    it('should update TAs in a course', async () => {
      const TADataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name + ' updated',
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await updateTAsInCourse(courseId, TADataList);
      const updatedCourse = await CourseModel.findById(courseId).populate<{ TAs: User[] }>('TAs');
      console.log(updatedCourse?.TAs);

      expect(updatedCourse?.TAs.find(ta => ta.identifier === commonTADetails.identifier)?.name).toBe(
        commonTADetails.name + ' updated'
      );
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const TADataList = [
        {
          identifier: commonTADetails.identifier,
          name: commonTADetails.name,
          email: commonTADetails.identifier + '@example.com',
        },
      ];
      await expect(
        updateTAsInCourse(invalidCourseId, TADataList)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeTAsFromCourse', () => {
    it('should remove TAs from a course', async () => {
      await removeTAsFromCourse(courseId, taId);
      const updatedCourse = await CourseModel.findById(courseId).populate(
        'TAs'
      );
      expect(updatedCourse?.TAs.length).toBe(0);
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(removeTAsFromCourse(invalidCourseId, taId)).rejects.toThrow(
        NotFoundError
      );
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
      expect(updatedCourse?.faculty.some(faculty => faculty._id.equals(facultyId))).toBe(true);
    });

    it('should create a new user if the faculty does not exist', async () => {
      const facultyDataList = [
        {
          identifier: 'newfaculty',
          name: 'New Faculty',
          email: 'newfaculty@example.com'
        }
      ];

      await addFacultyToCourse(courseId, facultyDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');

      const newFaculty = await UserModel
        .findOne({ identifier: 'newfaculty' });

      expect(newFaculty).toBeDefined();
      expect(
        updatedCourse?.faculty.some(faculty => faculty._id.equals(newFaculty!._id))
      ).toBe(true);
    });

    it('should not add if faculty user exists, but account does not exist', async () => {
      const deleted = await AccountModel.deleteOne({ email: `${commonFacultyDetails.identifier}@example.com` });
      expect(deleted.deletedCount).toBe(1);

      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name,
          email: `${commonFacultyDetails.identifier}@example.com`,
        },
      ];

      await addFacultyToCourse(courseId, facultyDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');

      // expect the faculty to not be added
      expect(updatedCourse?.faculty.length).toBe(1);

      // add the faculty account back
      const account = new AccountModel({
        email: `${commonFacultyDetails.identifier}@example.com`,
        password: 'hashedpassword',
        role: 'Faculty member',
        user: facultyId,
        isApproved: true,
      });
      account._id = facultyAccountId;
      await account.save();
      expect(await AccountModel.findOne({
        email: `${commonFacultyDetails.identifier}@example.com`
      })).toEqual(
        await AccountModel.findById(facultyAccountId));
    });

    it('should not add if faculty data does not match', async () => {
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name + 'A',
          email: commonFacultyDetails.identifier + '@example.com'
        },
      ];

      await addFacultyToCourse(courseId, facultyDataList);

      const updatedCourse =
        await CourseModel.findById(courseId).populate('faculty');

      // expect the faculty to not be added
      expect(updatedCourse?.faculty.length).toBe(1);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      const facultyDataList = [
        { identifier: facultyId, name: commonFacultyDetails.name, email: facultyEmail },
      ];
      await expect(addFacultyToCourse(invalidCourseId, facultyDataList)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateFacultyInCourse', () => {
    it('should update faculty in a course', async () => {
      const facultyDataList = [
        {
          identifier: commonFacultyDetails.identifier,
          name: commonFacultyDetails.name + ' updated',
          email: commonFacultyDetails.identifier + '@example.com',
        },
      ];
      await updateFacultyInCourse(courseId, facultyDataList);
      const updatedCourse = await CourseModel.findById(courseId).populate<{ faculty: User[] }>('faculty');
      console.log(updatedCourse?.faculty);

      expect(updatedCourse?.faculty.find(faculty => faculty.identifier === commonFacultyDetails.identifier)?.name).toBe(
        commonFacultyDetails.name + ' updated'
      );
    });

    it('should throw NotFoundError for an invalid course', async () => {
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
  });

  describe('removeFacultyFromCourse', () => {
    it('should remove faculty from a course', async () => {
      await removeFacultyFromCourse(courseId, facultyId);
      const updatedCourse = await CourseModel.findById(courseId).populate(
        'faculty'
      );
      expect(updatedCourse?.faculty.length).toBe(0);
    });

    it('should throw NotFoundError for an invalid course', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(removeFacultyFromCourse(invalidCourseId, facultyId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getPeopleFromCourse', () => {
    it('should retrieve people from a course', async () => {
      const people = await getPeopleFromCourse(courseId);
      expect(people).toBeDefined();
      expect(people.students.length).toBe(1);
      expect(people.TAs.length).toBe(1);
      expect(people.faculty.length).toBe(1);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getPeopleFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getCourseTimeline', () => {
    it('should retrieve the timeline for a course', async () => {
      const timeline = await getCourseTimeline(courseId);
      expect(timeline).toBeDefined();
      expect(timeline.milestones.length).toBe(0);
      expect(timeline.sprints.length).toBe(0);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getCourseTimeline(invalidCourseId)).rejects.toThrow(
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

  describe('getTeamSetsFromCourse', () => {
    it('should retrieve team sets from a course', async () => {
      const teamSets = await getTeamSetsFromCourse(facultyAccountId, courseId);
      expect(teamSets).toBeDefined();
      expect(teamSets.length).toBe(0);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getTeamSetsFromCourse(invalidCourseId, facultyAccountId)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw NotFoundError for invalid accountId', async () => {
      const invalidAccountId = new mongoose.Types.ObjectId().toString();
      await expect(getTeamSetsFromCourse(courseId, invalidAccountId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getTeamSetNamesFromCourse', () => {
    it('should retrieve team set names from a course', async () => {
      const teamSetNames = await getTeamSetNamesFromCourse(courseId);
      expect(teamSetNames).toBeDefined();
      expect(teamSetNames.length).toBe(0);
    });

    it('should throw NotFoundError for invalid courseId', async () => {
      const invalidCourseId = new mongoose.Types.ObjectId().toString();
      await expect(getTeamSetNamesFromCourse(invalidCourseId)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
