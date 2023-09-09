import { Request, Response } from 'express';
import UserModel from '../models/User';
import CourseModel from '../models/Course';
import TeamModel from '../models/Team';

export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.create(req.body);
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Error creating user' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find();
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching users' });
  }
};

export const getOneUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Error fetching user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(userId, req.body, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Promise.all([
      CourseModel.updateMany({ students: userId }, { $pull: { students: userId } }),
      TeamModel.updateMany({ students: userId }, { $pull: { students: userId } }),
    ]);

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ error: 'Error updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const userId = req.params.id;
  try {
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Promise.all([
      CourseModel.updateMany({ students: userId }, { $pull: { students: userId } }),
      TeamModel.updateMany({ students: userId }, { $pull: { students: userId } }),
    ]);

    return res.status(204).json();
  } catch (error) {
    return res.status(500).json({ error: 'Error deleting user' });
  }
};