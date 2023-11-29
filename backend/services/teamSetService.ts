// teamSetService.ts
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
