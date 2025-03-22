import AccountModel from '@models/Account';
import { Assessment } from '@models/Assessment';
import CourseModel from '@models/Course';
import TeamModel, { Team } from '@models/Team';
import TeamSetModel, { TeamSet } from '@models/TeamSet';
import UserModel, { User } from '@models/User';
import CrispRole from '@shared/types/auth/CrispRole';
import { Types } from 'mongoose';
import { BadRequestError, NotFoundError } from './errors';
import { InternalAssessment } from '@shared/types/InternalAssessment';
import CourseRole from '@shared/types/auth/CourseRole';

/*----------------------------------------Course----------------------------------------*/
export const createNewCourse = async (courseData: any, accountId: string) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  const user = await UserModel.findById(account.user);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  const {
    name,
    code,
    semester,
    startDate,
    duration,
    courseType,
    gitHubOrgName,
    repoNameFilter,
    installationId,
    isOn,
    provider,
    model,
    apiKey,
    frequency,
    aiStartDate,
  } = courseData;

  const courseFields = {
    name,
    code,
    semester,
    startDate,
    durationWeeks: duration,
    courseType,
    ...(gitHubOrgName && { gitHubOrgName }),
    ...(repoNameFilter && { repoNameFilter }),
    ...(installationId && { installationId }),
    aiInsights: {
      isOn: isOn,
      ...(provider && { provider }),
      ...(model && { model }),
      ...(apiKey && { apiKey }),
      ...(frequency && { frequency }),
      ...(aiStartDate && { startDate: aiStartDate }),
    },
  };

  const course = await CourseModel.create(courseFields);
  course.faculty.push(user._id);
  account.courseRoles.push({
    course: course._id.toString(),
    courseRole: CourseRole.Faculty,
  });
  await account.save();
  if (account.crispRole !== CrispRole.Admin) {
    const adminAccount = await AccountModel.findOne({
      crispRole: CrispRole.Admin,
    });
    if (!adminAccount) console.warn('Admin account missing!');
    else {
      const adminUser = await UserModel.findById(adminAccount.user);
      course.faculty.push(adminUser!._id);
    }
  }
  await course.save();
  return course;
};

export const getCoursesForUser = async (accountId: string) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  const userId = account?.user;
  const courses = await CourseModel.find({
    $or: [{ students: userId }, { TAs: userId }, { faculty: userId }],
  });
  return courses;
};

export const getCourseById = async (courseId: string, accountId?: string) => {
  if (accountId) {
    const account = await AccountModel.findById(accountId);
    if (!account) {
      throw new NotFoundError('Account not found');
    }
  }
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course;
};

export const updateCourseById = async (courseId: string, updateData: any) => {
  const updatedCourse = await CourseModel.findByIdAndUpdate(
    courseId,
    updateData,
    {
      new: true,
    }
  );
  if (!updatedCourse) {
    throw new NotFoundError('Course not found');
  }
};

export const deleteCourseById = async (courseId: string) => {
  const deletedCourse = await CourseModel.findByIdAndDelete(courseId, {
    new: false,
  });
  if (!deletedCourse) {
    throw new NotFoundError('Course not found');
  }
  await TeamModel.deleteMany({ teamSet: { $in: deletedCourse.teamSets } });
  await TeamSetModel.deleteMany({ _id: { $in: deletedCourse.teamSets } });
  await UserModel.updateMany(
    { enrolledCourses: courseId },
    { $pull: { enrolledCourses: courseId } }
  );
};

export const getCourseCodeById = async (courseId: string) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course.code;
};

/*----------------------------------------Student----------------------------------------*/
export const addStudentsToCourse = async (
  courseId: string,
  studentDataList: any[]
) => {
  const course = await CourseModel.findById(courseId).populate<{
    students: User[];
  }>('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const studentData of studentDataList) {
    const studentId = studentData.identifier;
    let student = await UserModel.findOne({ identifier: studentId });
    let studentAccount = null;
    if (!student) {
      student = new UserModel({
        identifier: studentId,
        name: studentData.name.toUpperCase(), // Save name as all caps
        enrolledCourses: [],
        gitHandle: studentData.gitHandle ?? null, // Keep githandle as case-sensitive
      });
      await student.save();
      const newAccount = new AccountModel({
        email: studentData.email, // Email is saved as case-sensitive (depends on organisation)
        crispRole: CrispRole.Normal,
        isApproved: false,
        user: student._id,
      });
      await newAccount.save();
      studentAccount = newAccount;
    } else {
      studentAccount = await AccountModel.findOne({ user: student._id });
      if (!studentAccount) {
        continue;
      }
      const courseRoleTuple = studentAccount.courseRoles.filter(
        r => r.course === courseId
      );
      if (
        ((courseRoleTuple.length !== 0) &&
          studentAccount.crispRole !== CrispRole.TrialUser) ||
        studentData.name.toUpperCase() !== student.name.toUpperCase() ||
        studentData.email.toLowerCase() !== studentAccount.email.toLowerCase() // Check is case-insensitive to handle email case-insensitivity cases
      ) {
        continue;
      }
      student.gitHandle = studentData.gitHandle ?? student.gitHandle;
    }
    if (!student.enrolledCourses.includes(course._id)) {
      student.enrolledCourses.push(course._id);
      studentAccount.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.Student,
      });
    }
    await student.save();
    await studentAccount.save();
    if (!course.students.some(s => s.identifier === student?.identifier)) {
      course.students.push(student);
    }
  }
  await course.save();
};

export const updateStudentsInCourse = async (
  courseId: string,
  studentDataList: any[]
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const studentData of studentDataList) {
    const studentId = studentData.identifier;
    const student = await UserModel.findOne({ identifier: studentId });
    if (!student) {
      continue;
    }
    const studentAccount = await AccountModel.findOne({ user: student._id });
    if (!studentAccount) {
      continue;
    }
    const courseRoleTuple = studentAccount.courseRoles.filter(
      r => r.course === courseId
    );
    if (
      courseRoleTuple.length === 0 ||
      courseRoleTuple[0].courseRole !== CourseRole.Student
    ) {
      continue;
    }
    if (!course.students.includes(student._id)) {
      continue;
    }
    student.name = studentData.name
      ? studentData.name.toUpperCase()
      : student.name; // Update to given name in caps if needed.
    student.gitHandle = studentData.gitHandle ?? student.gitHandle;
    await student.save();
  }
};

export const removeStudentsFromCourse = async (
  courseId: string,
  studentId: string
) => {
  const course = await CourseModel.findById(courseId).populate('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const student = await UserModel.findOne({ _id: studentId });
  if (!student) {
    throw new NotFoundError('Student not found');
  }
  await student.populate('enrolledCourses');

  (course.students as Types.Array<Types.ObjectId>).pull(student._id);
  await course.save();

  (student.enrolledCourses as Types.Array<Types.ObjectId>).pull(course._id);
  await student.save();
};

/*----------------------------------------TA----------------------------------------*/
export const addTAsToCourse = async (courseId: string, TADataList: any[]) => {
  const course = await CourseModel.findById(courseId).populate<{ TAs: User[] }>(
    'TAs'
  );
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const TAData of TADataList) {
    const TAId = TAData.identifier;
    let TA = await UserModel.findOne({ identifier: TAId });
    let TAAccount = null;
    if (!TA) {
      TA = new UserModel({
        identifier: TAId,
        name: TAData.name.toUpperCase(),
        enrolledCourses: [],
        gitHandle: TAData.gitHandle ?? null,
      });
      await TA.save();
      const newAccount = new AccountModel({
        email: TAData.email,
        crispRole: CrispRole.Normal,
        isApproved: false,
        user: TA._id,
      });
      await newAccount.save();
      TAAccount = newAccount;
    } else {
      TAAccount = await AccountModel.findOne({ user: TA._id });
      if (!TAAccount) {
        continue;
      }
      const courseRoleTuple = TAAccount.courseRoles.filter(
        r => r.course === courseId
      );
      if (
        ((courseRoleTuple.length !== 0) &&
          TAAccount.crispRole !== CrispRole.TrialUser) ||
        TAData.name.toUpperCase() !== TA.name.toUpperCase() ||
        TAData.email.toLowerCase() !== TAAccount.email.toLowerCase()
      ) {
        continue;
      }
      TA.gitHandle = TAData.gitHandle ?? TA.gitHandle;
    }
    if (!TA.enrolledCourses.includes(course._id)) {
      TA.enrolledCourses.push(course._id);
      TAAccount?.courseRoles.push({
        course: course._id.toString(),
        courseRole: CourseRole.TA,
      });
    }
    await TA.save();
    await TAAccount.save();
    if (!course.TAs.some(ta => ta.identifier === TA?.identifier)) {
      course.TAs.push(TA);
    }
  }
  await course.save();
};

export const updateTAsInCourse = async (
  courseId: string,
  TADataList: any[]
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const TAData of TADataList) {
    const TAId = TAData.identifier;
    const TA = await UserModel.findOne({ identifier: TAId });
    if (!TA) {
      continue;
    }
    const TAAccount = await AccountModel.findOne({ user: TA._id });
    if (!TAAccount) {
      continue;
    }
    const courseRoleTuple = TAAccount.courseRoles.filter(
      r => r.course === courseId
    );
    if (
      courseRoleTuple.length === 0 ||
      courseRoleTuple[0].courseRole !== CourseRole.TA
    ) {
      continue;
    }
    if (!course.TAs.includes(TA._id)) {
      continue;
    }
    TA.name = TAData.name ? TAData.name.toUpperCase() : TA.name;
    TA.gitHandle = TAData.gitHandle ?? TA.gitHandle;
    await TA.save();
  }
};

export const getCourseTeachingTeam = async (courseId: string) => {
  const course = await CourseModel.findById(courseId)
    .populate<{ faculty: User[] }>('faculty')
    .populate<{ TAs: User[] }>('TAs');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  course.faculty.sort((a, b) => a.name.localeCompare(b.name));
  course.TAs.sort((a, b) => a.name.localeCompare(b.name));
  return [...course.faculty, ...course.TAs];
};

export const removeTAsFromCourse = async (courseId: string, taId: string) => {
  const course = await CourseModel.findById(courseId).populate('TAs');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const ta = await UserModel.findOne({ _id: taId });
  if (!ta) {
    throw new NotFoundError('Student not found');
  }
  await ta.populate('enrolledCourses');

  (course.TAs as Types.Array<Types.ObjectId>).pull(ta._id);
  await course.save();

  (ta.enrolledCourses as Types.Array<Types.ObjectId>).pull(course._id);
  await ta.save();
};

/*----------------------------------------Faculty----------------------------------------*/
export const addFacultyToCourse = async (
  courseId: string,
  facultyDataList: any[]
) => {
  const course = await CourseModel.findById(courseId).populate<{
    faculty: User[];
  }>('faculty');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const facultyData of facultyDataList) {
    const facultyId = facultyData.identifier;
    let facultyMember = await UserModel.findOne({ identifier: facultyId });
    let facultyAccount = null;
    if (!facultyMember) {
      facultyMember = new UserModel({
        identifier: facultyId,
        name: facultyData.name.toUpperCase(),
        enrolledCourses: [],
        gitHandle: facultyData.gitHandle ?? null,
      });
      await facultyMember.save();
      const newAccount = new AccountModel({
        email: facultyData.email,
        role: CrispRole.Faculty,
        isApproved: false,
        user: facultyMember._id,
      });
      await newAccount.save();
      facultyAccount = newAccount;
    } else {
      facultyAccount = await AccountModel.findOne({
        user: facultyMember._id,
      });
      if (!facultyAccount) {
        continue;
      }
      const courseRoleTuple = facultyAccount.courseRoles.filter(
        r => r.course === courseId
      );
      if (
        ((courseRoleTuple.length !== 0) &&
          facultyAccount.crispRole !== CrispRole.TrialUser) ||
        facultyData.name.toUpperCase() !== facultyMember.name.toUpperCase() ||
        facultyData.email.toLowerCase() !== facultyAccount.email.toLowerCase()
      ) {
        continue;
      }
      facultyMember.gitHandle =
        facultyData.gitHandle ?? facultyMember.gitHandle;
    }
    if (!facultyMember.enrolledCourses.includes(course._id)) {
      facultyMember.enrolledCourses.push(course._id);
      facultyAccount.courseRoles.push({
        course: courseId,
        courseRole: CourseRole.Faculty,
      });
    }
    await facultyMember.save();
    await facultyAccount.save();
    if (
      !course.faculty.some(
        faculty => faculty.identifier === facultyMember?.identifier
      )
    ) {
      course.faculty.push(facultyMember);
    }
  }
  await course.save();
};

export const updateFacultyInCourse = async (
  courseId: string,
  facultyDataList: any[]
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  for (const facultyData of facultyDataList) {
    const facultyId = facultyData.identifier;
    const faculty = await UserModel.findOne({ identifier: facultyId });
    if (!faculty) {
      continue;
    }
    const facultyAccount = await AccountModel.findOne({ user: faculty._id });
    if (!facultyAccount) {
      continue;
    }
    const courseRoleTuple = facultyAccount.courseRoles.filter(
      r => r.course === courseId
    );
    if (
      (courseRoleTuple.length === 0 ||
        courseRoleTuple[0].courseRole !== CourseRole.Faculty) &&
      facultyAccount.crispRole !== CrispRole.Faculty &&
      facultyAccount.crispRole !== CrispRole.Admin
    ) {
      continue;
    }
    if (!course.faculty.includes(faculty._id)) {
      continue;
    }
    faculty.name = facultyData.name
      ? facultyData.name.toUpperCase()
      : faculty.name;
    faculty.gitHandle = facultyData.gitHandle ?? faculty.gitHandle;
    await faculty.save();
  }
};

export const removeFacultyFromCourse = async (
  courseId: string,
  facultyId: string
) => {
  const course = await CourseModel.findById(courseId).populate('faculty');
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const facultyMember = await UserModel.findOne({ _id: facultyId });
  if (!facultyMember) {
    throw new NotFoundError('Student not found');
  }
  await facultyMember.populate('enrolledCourses');

  (course.faculty as Types.Array<Types.ObjectId>).pull(facultyMember._id);
  await course.save();

  (facultyMember.enrolledCourses as Types.Array<Types.ObjectId>).pull(
    course._id
  );
  await facultyMember.save();
};

/*----------------------------------------People----------------------------------------*/
export const getPeopleFromCourse = async (courseId: string) => {
  const course = await CourseModel.findById(courseId)
    .populate<{ faculty: User[] }>('faculty')
    .populate<{ TAs: User[] }>('TAs')
    .populate<{ students: User[] }>('students');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  course.faculty
    .filter(f => f.identifier !== 'admin')
    .sort((a, b) => a.name.localeCompare(b.name));
  course.TAs.sort((a, b) => a.name.localeCompare(b.name));
  course.students.sort((a, b) => a.name.localeCompare(b.name));
  return {
    faculty: course.faculty,
    TAs: course.TAs,
    students: course.students,
  };
};

/*-------------------------------------Repositories-------------------------------------*/
export const getRepositoriesFromCourse = async (courseId: string) => {
  const course = await CourseModel.findById(courseId);

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  return {
    repositories: course.gitHubRepoLinks,
  };
};

export const addRepositoriesToCourse = async (
  courseId: string,
  repositories: { gitHubRepoLink: string }[]
) => {
  const course = await CourseModel.findById(courseId);

  if (!course) {
    throw new NotFoundError('Course not found');
  }

  for (const repository of repositories) {
    course.gitHubRepoLinks.push(repository.gitHubRepoLink);
  }

  await course.save();
};

export const editRepository = async (
  courseId: string,
  repositoryIndex: number,
  updateData: Record<string, unknown>
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if the repositoryIndex is valid
  if (repositoryIndex < 0 || repositoryIndex >= course.gitHubRepoLinks.length) {
    throw new NotFoundError('Repository not found');
  }

  // Make sure you're only updating the repoLink (a string) instead of an object
  if (typeof updateData.repoLink === 'string') {
    course.gitHubRepoLinks[repositoryIndex] = updateData.repoLink; // Directly set the new repo link
  } else {
    throw new Error('Invalid repository link format');
  }

  // Save the updated course
  await course.save();
};

export const removeRepositoryFromCourse = async (
  courseId: string,
  repositoryIndex: number
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  // Check if the repositoryIndex is valid
  if (repositoryIndex < 0 || repositoryIndex >= course.gitHubRepoLinks.length) {
    throw new NotFoundError('Repository not found');
  }

  // Remove the repository from the array
  course.gitHubRepoLinks.splice(repositoryIndex, 1);

  // Save the updated course
  await course.save();
};

/*----------------------------------------TeamSet----------------------------------------*/
export const getTeamSetsFromCourse = async (
  accountId: string,
  courseId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  const course = await CourseModel.findById(courseId).populate<{
    teamSets: TeamSet[];
  }>({
    path: 'teamSets',
    populate: {
      path: 'teams',
      model: 'Team',
      populate: ['members', 'TA', 'teamData', 'board'],
    },
  });
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const courseRoleTuple = account.courseRoles.filter(
    r => r.course === courseId
  );
  if (courseRoleTuple.length === 0) throw new BadRequestError('Unauthorized');
  const role = courseRoleTuple[0].courseRole;
  if (role === CourseRole.TA) {
    const userId = account.user;
    course.teamSets.forEach(
      teamSet =>
        (teamSet.teams = teamSet.teams.filter(team =>
          (team as unknown as Team).TA?.equals(userId)
        ))
    );
  }
  course.teamSets.forEach((teamSet: TeamSet) => {
    teamSet.teams.sort(
      (a: unknown, b: unknown) => (a as Team).number - (b as Team).number
    );
  });
  return course.teamSets;
};

export const getTeamSetNamesFromCourse = async (courseId: string) => {
  const course = await CourseModel.findById(courseId).populate<{
    teamSets: TeamSet[];
  }>('teamSets');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course.teamSets.map((teamSet: TeamSet) => teamSet.name);
};

/*----------------------------------------Milestone----------------------------------------*/
export const addMilestoneToCourse = async (
  courseId: string,
  milestoneData: { number: number; dateline: Date; description: string }
) => {
  const course = await CourseModel.findById(courseId);
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
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  course.sprints.push(sprintData);
  await course.save();
};

/*----------------------------------------Timeline----------------------------------------*/
export const getCourseTimeline = async (courseId: string) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  if (Array.isArray(course.milestones)) {
    course.milestones.sort((a, b) => a.number - b.number);
  }
  if (Array.isArray(course.sprints)) {
    course.sprints.sort((a, b) => a.number - b.number);
  }
  return { milestones: course.milestones, sprints: course.sprints };
};

/*----------------------------------------Assessments----------------------------------------*/
export const getAssessmentsFromCourse = async (courseId: string) => {
  const course = await CourseModel.findById(courseId).populate<{
    assessments: Assessment[];
  }>({
    path: 'assessments',
    populate: [
      {
        path: 'teamSet',
        model: 'TeamSet',
      },
    ],
  });
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course.assessments;
};

/*----------------------------------------Internal Assessments----------------------------------------*/
export const getInternalAssessmentsFromCourse = async (courseId: string) => {
  const course = await CourseModel.findById(courseId).populate<{
    assessments: InternalAssessment[];
  }>({
    path: 'internalAssessments',
    populate: [
      {
        path: 'teamSet',
        model: 'TeamSet',
      },
    ],
  });
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course.internalAssessments;
};

/*------------------------------------Project Management------------------------------------*/
export const getProjectManagementBoardFromCourse = async (
  accountId: string,
  courseId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const course = await CourseModel.findById(courseId).populate<{
    teamSets: TeamSet[];
  }>({
    path: 'teamSets',
    populate: {
      path: 'teams',
      model: 'Team',
      populate: [
        {
          path: 'members TA',
          model: 'User',
        },
        {
          path: 'teamData',
          model: 'TeamData',
        },
        {
          path: 'board',
          model: 'JiraBoard',
          populate: [
            {
              path: 'jiraIssues',
              model: 'JiraIssue',
            },
            {
              path: 'jiraSprints',
              model: 'JiraSprint',
              populate: {
                path: 'jiraIssues',
                model: 'JiraIssue',
              },
            },
          ],
        },
      ],
    },
  });
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const courseRoleTuple = account.courseRoles.filter(
    r => r.course === courseId
  );
  if (courseRoleTuple.length === 0) throw new BadRequestError('Unauthorized');
  const role = courseRoleTuple[0].courseRole;
  if (role === CourseRole.TA) {
    const userId = account.user;
    course.teamSets.forEach(
      teamSet =>
        (teamSet.teams = teamSet.teams.filter(team =>
          (team as unknown as Team).TA?.equals(userId)
        ))
    );
  }
  course.teamSets.forEach((teamSet: TeamSet) => {
    teamSet.teams.sort(
      (a: unknown, b: unknown) => (a as Team).number - (b as Team).number
    );
  });
  return course.teamSets;
};

export const getCourseJiraRegistrationStatusById = async (courseId: string) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  return course.jira.isRegistered;
};
