import CourseModel from '../models/Course';
import TeamModel, { Team } from '../models/Team';
import TeamSetModel, { TeamSet } from '../models/TeamSet';
import { BadRequestError, NotFoundError } from './errors';

export const getTeamSetsByCourseId = async (courseId: string) =>
  await TeamSetModel.find({ course: courseId }).populate<{ teams: Team[] }>({
    path: 'teams',
    populate: {
      path: 'members',
    },
  });

export const deleteTeamSetById = async (teamSetId: string) => {
  const teamSet = await TeamSetModel.findById(teamSetId);
  if (!teamSet) {
    throw new NotFoundError('TeamSet not found');
  }
  await TeamModel.deleteMany({ teamSet: teamSetId });
  const course = await CourseModel.findById(teamSet.course);
  if (course && course.teamSets) {
    const index = course.teamSets.indexOf(teamSet._id);
    if (index !== -1) {
      course.teamSets.splice(index, 1);
      await course.save();
    }
  }
  await TeamSetModel.findByIdAndDelete(teamSetId);
};

export const createTeamSet = async (courseId: string, name: string) => {
  const course = await CourseModel.findById(courseId).populate<{
    teamSets: TeamSet[];
  }>('teamSets');
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const existingTeamSet = await TeamSetModel.findOne({
    course: courseId,
    name: name,
  });
  if (existingTeamSet) {
    throw new BadRequestError(
      'A team set with the same name already exists in this course'
    );
  }
  const teamSet = new TeamSetModel({ name, course: courseId });
  course.teamSets.push(teamSet);
  await teamSet.save();
  await course.save();
};
