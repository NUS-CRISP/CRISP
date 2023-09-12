import express, { Request, Response } from 'express';
import TeamModel, { Team } from '../models/Team';
import TeamSetModel, { TeamSet } from '../models/TeamSet';

export const createTeamSet = async (req: Request, res: Response) => {
  try {
    const { courseID, membersPerTeam, name } = req.body;
    const newTeamSet: TeamSet = new TeamSetModel({
      courseID,
      membersPerTeam,
      name,
      teams: []
    });
    const savedTeamSet = await newTeamSet.save();
    res.status(201).json(savedTeamSet);
  } catch (error) {
    console.error('Error creating team set:', error);
    res.status(500).json({ error: 'Failed to create team set' });
  }
};

export const getAllTeamSets = async (req: Request, res: Response) => {
  try {
    const teamSets = await TeamSetModel.find();
    res.status(200).json(teamSets);
  } catch (error) {
    console.error('Error fetching team sets:', error);
    res.status(500).json({ error: 'Failed to fetch team sets' });
  }
};

export const getTeamSetById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const teamSet = await TeamSetModel.findById(id);
    if (!teamSet) {
      return res.status(404).json({ message: 'Team set not found' });
    }
    res.status(200).json(teamSet);
  } catch (error) {
    console.error('Error fetching team set:', error);
    res.status(500).json({ error: 'Failed to fetch team set' });
  }
};

export const updateTeamSetById = async (req: Request, res: Response) => {
  const teamSetId = req.params.id;
  try {
    const updatedTeamSet = await TeamSetModel.findByIdAndUpdate(
      teamSetId,
      req.body,
      { new: true }
    );
    if (!updatedTeamSet) {
      res.status(404).json({ error: 'Team set not found' });
    } else {
      res.json(updatedTeamSet);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team set' });
  }
};

export const deleteTeamSetById = async (req: Request, res: Response) => {
  const teamSetId = req.params.id;
  try {
    const deletedTeamSet = await TeamSetModel.findByIdAndDelete(teamSetId);
    if (!deletedTeamSet) {
      res.status(404).json({ error: 'Team set not found' });
    } else {
      res.json({ message: 'Team set deleted successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team set' });
  }
};