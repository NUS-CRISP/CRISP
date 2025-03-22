// Use this file to run checks on various data relationships and check for errors.
// First devised to rectify existing role errors.
/**
 * Data checked by this file (UPDATE IF YOU ADD TO THIS FILE)
 * CrispRole
 * CourseRole and course.faculty/course.TAs/course.students
 */
import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import CourseRole from '@shared/types/auth/CourseRole';
import CrispRole from '@shared/types/auth/CrispRole';
import cron from 'node-cron';

// Check functions (and if errors are found, repair if possible)
async function checkCrispRoles() {
  const allAccounts: any = await AccountModel.find();
  for (const account of allAccounts) {
    if (account.role && !account.crispRole) {
      console.warn(
        `Account ${account._id} has the old .role field. Mapping to the new .crispRole field...`
      );
      switch (account.role) {
        case 'Student':
        case 'Teaching assistant':
          account.crispRole = CrispRole.Normal;
          break;
        case 'admin':
          account.crispRole = CrispRole.Admin;
          break;
        case 'Faculty member':
          account.crispRole = CrispRole.Faculty;
          break;
        case 'Trial User':
          account.crispRole = CrispRole.TrialUser;
          break;
        default:
          break;
      }
      await account.save();
    }
  }
  return;
}

async function checkCourseRoles() {
  const allCourses = await CourseModel.find();
  for (const course of allCourses) {
    const courseStudents = course.students;
    const courseTAs = course.TAs;
    const courseFaculty = course.faculty;
    for (const studentId of courseStudents) {
      const studentAccount = await AccountModel.findOne({
        user: studentId,
      });
      if (!studentAccount) {
        console.warn(`Student account with user id ${studentId} missing`);
        continue; // Not fixing it here cuz this is indicative of a larger issue at hand
      }
      const courseRoleTuple = studentAccount.courseRoles.filter(
        r => r.course === course._id.toString()
      );
      if (courseRoleTuple.length === 0) {
        console.warn(
          `Student account with id ${studentAccount._id} does not have course role for course ${course._id}. Fixing...`
        );
        studentAccount.courseRoles.push({
          course: course._id.toString(),
          courseRole: CourseRole.Student,
        });
        await studentAccount.save();
      }
      if (courseRoleTuple[0].courseRole !== CourseRole.Student) {
        console.warn(
          `Student account with id ${studentAccount._id} does not have correct course role for course ${course._id}. Fixing...`
        );
        courseRoleTuple[0].courseRole = CourseRole.Student;
        await studentAccount.save();
      }
    }

    for (const TAId of courseTAs) {
      const TAAccount = await AccountModel.findOne({
        user: TAId,
      });
      if (!TAAccount) {
        console.warn(`TA account with user id ${TAId} missing`);
        continue; // Not fixing it here cuz this is indicative of a larger issue at hand
      }
      const courseRoleTuple = TAAccount.courseRoles.filter(
        r => r.course === course._id.toString()
      );
      if (courseRoleTuple.length === 0) {
        console.warn(
          `TA account with id ${TAAccount._id} does not have course role for course ${course._id}. Fixing...`
        );
        TAAccount.courseRoles.push({
          course: course._id.toString(),
          courseRole: CourseRole.TA
        });
        await TAAccount.save();
      }
      if (courseRoleTuple[0].courseRole !== CourseRole.TA) {
        console.warn(
          `TA account with id ${TAAccount._id} does not have correct course role for course ${course._id}. Fixing...`
        );
        courseRoleTuple[0].courseRole = CourseRole.TA;
        await TAAccount.save();
      }
    }

    for (const facultyId of courseFaculty) {
      const facultyAccount = await AccountModel.findOne({
        user: facultyId,
      });
      if (!facultyAccount) {
        console.warn(`Faculty account with user id ${facultyId} missing`);
        continue; // Not fixing it here cuz this is indicative of a larger issue at hand
      }
      const courseRoleTuple = facultyAccount.courseRoles.filter(
        r => r.course === course._id.toString()
      );
      if (courseRoleTuple.length === 0) {
        console.warn(
          `Faculty account with id ${facultyAccount._id} does not have course role for course ${course._id}. Fixing...`
        );
        facultyAccount.courseRoles.push({
          course: course._id.toString(),
          courseRole: CourseRole.Faculty,
        });
        await facultyAccount.save();
      }
      if (courseRoleTuple[0].courseRole !== CourseRole.Faculty) {
        console.warn(
          `Faculty account with id ${facultyAccount._id} does not have correct course role for course ${course._id}. Fixing...`
        );
        courseRoleTuple[0].courseRole = CourseRole.Faculty;
        await facultyAccount.save();
      }
    }
  }
  return;
}

// Starter functions
async function runDataIntegrityCheck() {
  await checkCrispRoles();
  await checkCourseRoles();
  return;
}

async function notifyOnStartup() {
  await checkCrispRoles();
  await checkCourseRoles();
  return;
}

export function setupDataIntegrityJob() {
  cron.schedule('0 3 * * *', async () => {
    try {
      await runDataIntegrityCheck();
    } catch (err) {
      console.error('Integrity job error:', err);
    }
  });

  if (process.env.RUN_JOB_NOW === 'true') {
    console.log('Running data integrity check now...');
    notifyOnStartup();
  }
}

export default setupDataIntegrityJob;
