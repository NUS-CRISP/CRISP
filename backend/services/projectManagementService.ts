import AccountModel from '@models/Account';
import CourseModel from '@models/Course';
import { JiraBoardModel } from '@models/JiraData';
import { NotFoundError } from './errors';

export const getJiraBoardNamesByCourse = async (
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

  const jiraBoards = await JiraBoardModel.find({
    course: course._id,
  });

  if (!jiraBoards) {
    throw new NotFoundError('No Jira boards found for course');
  }

  return jiraBoards;
};
