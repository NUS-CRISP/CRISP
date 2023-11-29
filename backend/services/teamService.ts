// teamService.ts
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';
import { NotFoundError } from './errors';

export const deleteTeamById = async (teamId: string) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new NotFoundError('Team not found');
  }
  const teamSet = await TeamSet.findById(team.teamSet);
  if (teamSet && teamSet.teams) {
    const index = teamSet.teams.indexOf(team._id);
    if (index !== -1) {
      teamSet.teams.splice(index, 1);
    }
    await teamSet.save();
  }
  await Team.findByIdAndDelete(teamId);
};

export const updateTeamById = async (teamId: string, updateData: any) => {
  const updatedTeam = await Team.findByIdAndUpdate(teamId, updateData, {
    new: true,
  });
  if (!updatedTeam) {
    throw new NotFoundError('Team not found');
  }
};
