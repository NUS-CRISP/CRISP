import { Request, Response } from 'express';
import CourseModel from '../models/Course'
import TeamSetModel from '../models/TeamSet'
import TeamModel from '../models/Team'

export const deleteTeamSet = async (req: Request, res: Response) => {
    const teamSetId = req.params.id;
  
    try {
      const teamSet = await TeamSetModel.findById(teamSetId);
  
      if (!teamSet) {
        return res.status(404).json({ message: 'TeamSet not found' });
      }

      await TeamModel.deleteMany({ teamSet: teamSetId });
  
      const course = await CourseModel.findById(teamSet.course);
      if (course) {
        const index = course.teamSets.indexOf(teamSet._id);
        if (index !== -1) {
          course.teamSets.splice(index, 1);
          await course.save();
        }
      }
  
      await TeamSetModel.findByIdAndDelete(teamSetId);
  
      return res.status(200).json({ message: 'TeamSet deleted successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete the TeamSet' });
    }
  };