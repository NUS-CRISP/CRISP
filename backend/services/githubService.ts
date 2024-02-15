import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import TeamModel from '@models/Team';
import TeamDataModel, { TeamData } from '@models/TeamData';
import TeamSetModel from '@models/TeamSet';
import Role from '@shared/types/auth/Role';
import { RequestError } from 'octokit';
import { getGitHubApp } from '../utils/github';
import { NotFoundError } from './errors';

export const fetchAllTeamData = async () => {
  return await TeamDataModel.find({});
};

export const fetchAllTeamDataForOrg = async (gitHubOrgName: string) => {
  const teamDatas = await TeamDataModel.find({
    gitHubOrgName: gitHubOrgName.toLowerCase(),
  });
  if (!teamDatas) {
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
    if (error instanceof RequestError && error.status === 404) {
      throw new NotFoundError(
        'The GitHub App is not installed on the specified organization.'
      );
    } else if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      console.error('Unknown Eerror checking github installation:', error);
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

  const role = account.role;

  if (role === Role.Faculty) {
    // Faculty can view all teams in the course; return all TeamData with same orgName as course
    // TODO: Temp. solution; adjust schema so we have a way to get all teams in a course
    if (!course.gitHubOrgName) {
      throw new NotFoundError('Course GitHub organization not found');
    }
    return await TeamDataModel.find({
      gitHubOrgName: course.gitHubOrgName,
    }).sort('repoName');
  } else if (role === Role.TA) {
    const teamSets = await TeamSetModel.find({ course: courseId });
    if (!teamSets) {
      throw new NotFoundError('No team sets found for course');
    }

    return (
      await TeamModel.find({
        teamSet: { $in: teamSets.map(ts => ts._id) },
        TA: user,
      }).populate<{ teamData: TeamData }>({
        path: 'teamData',
        options: { sort: { repoName: 1 } },
      })
    ).map(team => team.teamData);
  }
};
