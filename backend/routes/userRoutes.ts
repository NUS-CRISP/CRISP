import express from 'express';
import { getUserByHandle, updateUser } from '../controllers/userController';

const router = express.Router();

router.patch('/:userId', updateUser);
router.get('/profile', getUserByHandle);

export default router;
