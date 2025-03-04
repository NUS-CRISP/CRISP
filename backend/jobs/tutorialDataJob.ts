import AccountModel from '@models/Account';
// import CourseModel from '@models/Course';
import UserModel from '@models/User';
// import Role from '@shared/types/auth/Role';

export const setupTutorialDataJob = async () => {
  /*
   * 1) Ensure the trial user + account exist.
   * 2) Ensure the three 'trial' courses exist (only create them if absent).
   * 3) Make sure the trial user is properly attached to those courses (as faculty or TA).
   * 4) Create bogus student accounts only if they don't already exist and enroll them in the courses.
   */

  // -----------------------------------------------------------------------------
  // 1) Ensure the trial user + account exist
  // -----------------------------------------------------------------------------
  let trialUser = await UserModel.findOne({ identifier: 'trial' });
  let trialAccount = trialUser
    ? await AccountModel.findOne({
        email: 'trial@example.com',
        user: trialUser._id,
      })
    : null;

  if (!trialUser) {
    const trialUserDoc = new UserModel({
      identifier: 'trial',
      name: 'Trial User',
      enrolledCourses: [],
      gitHandle: '',
    });
    trialUser = await trialUserDoc.save();
  }

  if (!trialAccount) {
    const trialAccountDoc = new AccountModel({
      email: 'trial@example.com',
      password: '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6',
      role: 'Trial User',
      isApproved: true,
      wantsEmailNotifications: false,
      wantsTelegramNotifications: false,
      user: trialUser._id,
    });
    trialAccount = await trialAccountDoc.save();
  }
  /*
  // The code below will add bogus courses, but we won't use this, this is just for local testing.
  // -----------------------------------------------------------------------------
  // 2) Ensure we have an admin user (assumed to exist at all times)
  // -----------------------------------------------------------------------------
  const adminAccount = await AccountModel.findOne({ role: Role.Admin }).populate('user');
  if (!adminAccount || !adminAccount.user) {
    throw new Error('Admin user does not exist, but is required by this script.');
  }
  const adminUser = adminAccount.user;

  // -----------------------------------------------------------------------------
  // 3) Ensure the three 'trial' courses exist (only create if absent)
  // -----------------------------------------------------------------------------
  // Course #1: 'Trial as Faculty Member'
  let course1 = await CourseModel.findOne({ code: 'TRIAL-F' });
  if (!course1) {
    course1 = new CourseModel({
      name: 'Trial as Faculty Member',
      code: 'TRIAL-F',
      semester: 'AY2323 S2',
      startDate: new Date(),
      durationWeeks: 13,
      courseType: 'Normal',
      sprints: [],
      milestones: [],
    });
    await course1.save();
  }

  // Course #2: 'Trial as Teaching Assistant'
  let course2 = await CourseModel.findOne({ code: 'TRIAL-TA' });
  if (!course2) {
    course2 = new CourseModel({
      name: 'Trial as Teaching Assistant',
      code: 'TRIAL-TA',
      semester: 'AY2323 S2',
      startDate: new Date(),
      durationWeeks: 13,
      courseType: 'Normal',
      sprints: [],
      milestones: [],
    });
    await course2.save();
  }

  // Course #3: 'Trial Extra Course'
  let course3 = await CourseModel.findOne({ code: 'TRIAL-EXTRA' });
  if (!course3) {
    course3 = new CourseModel({
      name: 'Trial Extra Course',
      code: 'TRIAL-EXTRA',
      semester: 'AY2323 S2',
      startDate: new Date(),
      durationWeeks: 13,
      courseType: 'Normal',
      sprints: [],
      milestones: [],
    });
    await course3.save();
  }

  // -----------------------------------------------------------------------------
  // 4) Attach trial user + admin user to the new courses as needed
  // -----------------------------------------------------------------------------
  // Course #1: trial user as faculty, also ensure admin is faculty
  if (!course1.faculty.includes(trialUser._id)) {
    course1.faculty.push(trialUser._id);
  }
  if (!course1.faculty.includes(adminUser._id)) {
    course1.faculty.push(adminUser._id);
  }
  await course1.save();

  // Course #2: admin user as faculty, trial user as TA
  if (!course2.faculty.includes(adminUser._id)) {
    course2.faculty.push(adminUser._id);
  }
  if (!course2.TAs.includes(trialUser._id)) {
    course2.TAs.push(trialUser._id);
  }
  await course2.save();

  // For good measure, course #3 can remain empty or purely used for other testing as needed.

  // -----------------------------------------------------------------------------
  // 5) Enroll the trial user in course1 and course2 (only if not enrolled yet)
  // -----------------------------------------------------------------------------
  const courseIdsToEnroll = [course1._id, course2._id];
  trialUser.enrolledCourses = [
    ...new Set([...trialUser.enrolledCourses, ...courseIdsToEnroll]),
  ];
  await trialUser.save();

  // -----------------------------------------------------------------------------
  // 6) Create bogus student accounts only if absent, and enroll them in the courses
  // -----------------------------------------------------------------------------
  // Helper function
  const createAndEnrollStudent = async (
    { identifier, name }: { identifier: string; name: string },
    course: typeof course1
  ) => {
    // Check if student user already exists
    let studentUser = await UserModel.findOne({ identifier });
    if (!studentUser) {
      // Create user doc
      studentUser = new UserModel({
        identifier,
        name,
        enrolledCourses: [course._id],
        gitHandle: '',
      });
      await studentUser.save();

      // Create account doc
      const studentAccount = new AccountModel({
        email: `${identifier}@example.com`, // Fake email
        password: '$2b$10$UslurkMG9ujw5vqMWqvxheF4zLmWE78XZ9QAeEW637GiyLvXk3EG6', // same hashed password
        role: Role.Student,
        isApproved: true,
        wantsEmailNotifications: false,
        wantsTelegramNotifications: false,
        user: studentUser._id,
      });
      await studentAccount.save();
    } else {
      // If user exists, ensure they're enrolled in this course
      if (!studentUser.enrolledCourses.includes(course._id)) {
        studentUser.enrolledCourses.push(course._id);
        await studentUser.save();
      }
    }

    // Also ensure this user is in the course's `students` array
    if (!course.students.includes(studentUser._id)) {
      course.students.push(studentUser._id);
      await course.save();
    }
  };

  // Bogus students for course1
  await createAndEnrollStudent({ identifier: 'john-doe', name: 'John Doe' }, course1);
  await createAndEnrollStudent({ identifier: 'johnny-smith', name: 'Johnny Smith' }, course1);
  await createAndEnrollStudent(
    { identifier: 'hoshimachi-suisei', name: 'Hoshimachi Suisei' },
    course1
  );

  // Bogus students for course2
  await createAndEnrollStudent({ identifier: 'tanaka-tanaka', name: 'Tanaka Tanaka' }, course2);
  await createAndEnrollStudent({ identifier: 'tan-xiao-ming', name: 'Tan Xiao Ming' }, course2);
  await createAndEnrollStudent(
    { identifier: 'sakura-miko', name: 'Sakura Miko' },
    course2
  );
  */
  console.log('Trial data setup complete!');
};

export default setupTutorialDataJob;
