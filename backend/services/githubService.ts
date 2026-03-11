import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamDataModel, { TeamData } from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import { CRISP_ROLE } from '@shared/types/auth/CrispRole';
import { getGitHubApp } from '../utils/github';
import { GitHubError, NotFoundError } from './errors';

export const fetchAllTeamData = async () => {
  return await TeamDataModel.find({});
};

export const fetchAllTeamDataForOrg = async (gitHubOrgName: string) => {
  const teamDatas = await TeamDataModel.find({
    gitHubOrgName: gitHubOrgName.toLowerCase(),
  });
  if (teamDatas.length === 0) {
    throw new NotFoundError('Team datas not found');
  }
  return teamDatas;
};

export const checkGitHubInstallation = async (orgName: string) => {
  const octokit = getGitHubApp().octokit;
  try {
    const response = await octokit.rest.apps.getOrgInstallation({
      org: orgName,
    });
    return response.data.id;
  } catch (error) {
    if (
      error instanceof GitHubError &&
      error.name === 'RequestError' &&
      error.message === 'Not Found'
    ) {
      throw new NotFoundError(
        'The GitHub App is not installed on the specified organization.'
      );
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error checking GitHub installation.');
    }
  }
};

/**
 * Get all the team data for a course, that the account is authorized to view
 * @param accountId account id
 * @param courseId course id
 */
export const getAuthorizedTeamDataByCourse = async (
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

  const role = account.crispRole;

  if (
    role === CRISP_ROLE.Faculty ||
    role === CRISP_ROLE.Admin ||
    role === CRISP_ROLE.TrialUser
  ) {
    if (
      !course.gitHubOrgName &&
      (!course.gitHubRepoLinks || course.gitHubRepoLinks.length === 0)
    ) {
      console.log('Course GitHub organization or repository links not found');
      throw new NotFoundError(
        'Course GitHub organization or repository links not found'
      );
    }
    if (!(await CourseModel.exists({ _id: courseId, faculty: user._id }))) {
      console.log('User is not authorized to view course');
      throw new NotFoundError('User is not authorized to view course');
    }

    const teamDatas = await TeamDataModel.find({
      course: courseId,
    });

    if (teamDatas.length == 0) {
      console.log('No team data found for course');
      throw new NotFoundError('No team data found for course');
    }
    const sortedDatas = teamDatas.sort((a, b) => {
      if (a.repoName < b.repoName) return -1;
      if (a.repoName > b.repoName) return 1;
      return 0;
    });
    return sortedDatas;
  } else if (role === CRISP_ROLE.Normal) {
    const teamSets = await TeamSetModel.find({ course: courseId });
    if (teamSets.length === 0) {
      console.log('No team sets found for course');
      throw new NotFoundError('No team sets found for course');
    }
    const teams = await TeamModel.find({
      teamSet: { $in: teamSets.map(ts => ts._id) },
      $or: [{ TA: user }, { members: user._id }],
    }).populate<{ teamData: TeamData }>({
      path: 'teamData',
      options: { sort: { repoName: 1 } },
    });
    if (teams.length == 0) {
      console.log('No teams found for course');
      throw new NotFoundError('No teams found for course');
    }
    const sortedDatas = teams
      .map(team => team.teamData)
      .filter(
        (teamData): teamData is TeamData =>
          teamData !== null && teamData !== undefined
      )
      .sort((a, b) => {
        if (a.repoName < b.repoName) return -1;
        if (a.repoName > b.repoName) return 1;
        return 0;
      });
    return sortedDatas;
  }
};

export const getAuthorizedTeamDataNamesByCourse = async (
  accountId: string,
  courseId: string
) => {
  const teamDatas = await getAuthorizedTeamDataByCourse(accountId, courseId);
  if (!teamDatas) {
    throw new NotFoundError('No team datas found for course');
  }
  const teamDataNames = teamDatas.map(teamData => ({
    _id: teamData._id,
    repoName: teamData.repoName,
  }));
  return teamDataNames;
};
