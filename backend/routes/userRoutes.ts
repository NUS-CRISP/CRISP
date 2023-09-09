import express, { Router } from 'express';
import { 
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  deleteUser } from '../controllers/userController';

const router: Router = express.Router();

router.post('/', createUser);
router.get('/', getAllUsers);
router.get('/:id', getOneUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;