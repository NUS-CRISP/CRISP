import { Request, Response } from 'express';
import Course from '../models/Course';
import Team from '../models/Team';
import TeamSet from '../models/TeamSet';

export const deleteTeamSet = async (req: Request, res: Response) => {
  const teamSetId = req.params.id;

  try {
    const teamSet = await TeamSet.findById(teamSetId);

    if (!teamSet) {
      return res.status(404).json({ message: 'TeamSet not found' });
    }

    await Team.deleteMany({ teamSet: teamSetId });

    const course = await Course.findById(teamSet.course);
    if (course) {
      const index = course.teamSets.indexOf(teamSet._id);
      if (index !== -1) {
        course.teamSets.splice(index, 1);
        await course.save();
      }
    }

    await TeamSet.findByIdAndDelete(teamSetId);

    return res.status(200).json({ message: 'TeamSet deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete the TeamSet' });
  }
};
