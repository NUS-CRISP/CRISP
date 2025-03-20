import codeAnalysisDataModel from '@models/CodeAnalysisData';
import { NotFoundError } from './errors';
import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import Role from '@shared/types/auth/CrispRole';
import TeamSetModel from '@models/TeamSet';
import TeamModel from '@models/Team';
import { TeamData } from '@models/TeamData';
import CourseRole from '@shared/types/auth/CourseRole';

export const fetchAllCodeAnalysisData = async () => {
  return await codeAnalysisDataModel.find({});
};

export const fetchAllCodeAnalysisDataForOrg = async (gitHubOrgName: string) => {
  const codeAnalysisDatas = await codeAnalysisDataModel.find({
    gitHubOrgName: gitHubOrgName.toLowerCase(),
  });
  if (codeAnalysisDatas.length === 0) {
    throw new NotFoundError('Code analysis datas not found');
  }
  return codeAnalysisDatas;
};

/**
 * Get all the code analysis data for a course, that the account is authorized to view
 * @param accountId account id
 * @param courseId course id
 */
export const getAuthorizedCodeAnalysisDataByCourse = async (
  accountId: string,
  courseId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }
  const user = account.user;
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const crispRole = account.crispRole;
  const courseRoleTuple = account.courseRoles.filter(r => r[0] === courseId);

  if (crispRole === Role.Faculty || crispRole === Role.Admin || crispRole === Role.TrialUser) {
    if (!course.gitHubOrgName) {
      throw new NotFoundError('Course GitHub organization not found');
    }
    if (!(await CourseModel.exists({ _id: courseId, faculty: user._id }))) {
      throw new NotFoundError('User is not authorized to view course');
    }
    const codeAnalysisDatas = await codeAnalysisDataModel.find({
      gitHubOrgName: course.gitHubOrgName,
    });
    if (codeAnalysisDatas.length === 0) {
      throw new NotFoundError('No code analysis data found for course');
    }
    const sortedDatas = codeAnalysisDatas.sort((a, b) => {
      if (a.repoName < b.repoName) return -1;
      if (a.repoName > b.repoName) return 1;
      return 0;
    });
    return sortedDatas;
  } else if (crispRole === Role.Normal && courseRoleTuple.length > 0 && courseRoleTuple[0][1] === CourseRole.TA) {
    const teamSets = await TeamSetModel.find({ course: courseId });
    if (!teamSets || teamSets.length === 0) {
      throw new NotFoundError('No team sets found for course');
    }
    const teams = await TeamModel.find({
      teamSet: { $in: teamSets.map(ts => ts._id) },
      TA: user,
    }).populate<{ teamData: TeamData }>({
      path: 'teamData',
      options: { sort: { repoName: 1 } },
    });

    if (!teams || teams.length === 0) {
      throw new NotFoundError('No teams found for course');
    }

    const teamIds = teams
      .filter(team => team.teamData)
      .map(team => team.teamData.teamId);

    const codeAnalysisDatas = await codeAnalysisDataModel.find({
      teamId: { $in: teamIds },
    });

    if (!codeAnalysisDatas || codeAnalysisDatas.length === 0) {
      throw new NotFoundError('No code analysis data found for course');
    }
    const sortedDatas = codeAnalysisDatas.sort((a, b) => {
      if (a.repoName < b.repoName) return -1;
      if (a.repoName > b.repoName) return 1;
      return 0;
    });
    return sortedDatas;
  }
};
