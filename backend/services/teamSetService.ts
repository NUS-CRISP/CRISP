import Course from '../models/Course';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';
import { NotFoundError } from './errors';

export const deleteTeamSetById = async (teamSetId: string) => {
  const teamSet = await TeamSet.findById(teamSetId);
  if (!teamSet) {
    throw new NotFoundError('TeamSet not found');
  }
  await Team.deleteMany({ teamSet: teamSetId });
  const course = await Course.findById(teamSet.course);
  if (course && course.teamSets) {
    const index = course.teamSets.indexOf(teamSet._id);
    if (index !== -1) {
      course.teamSets.splice(index, 1);
      await course.save();
    }
  }
  await TeamSet.findByIdAndDelete(teamSetId);
};

export const createTeamSet = async (courseId: string, name: string) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const teamSet = new TeamSet({ name, course: courseId });
  course.teamSets.push(teamSet._id);
  await teamSet.save();
  await course.save();
};
