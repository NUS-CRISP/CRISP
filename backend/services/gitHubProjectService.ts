import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import GitHubProjectModel from '@models/GitHubProjectData';
import { NotFoundError } from './errors';

/**
 * Get all the GitHub Project data for a course
 * @param accountId account id
 * @param courseId course id
 */
export const getGitHubProjectNamesByCourse = async (
  accountId: string,
  courseId: string
) => {
  const account = await AccountModel.findById(accountId);
  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const gitHubProjectDatas = await GitHubProjectModel.find({
    gitHubOrgName: course.gitHubOrgName,
  });

  if (!gitHubProjectDatas) {
    throw new NotFoundError('No team data found for course');
  }

  return gitHubProjectDatas;
};
