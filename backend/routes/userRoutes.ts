import express from 'express';
import { updateUser } from '../controllers/userController';

const router = express.Router();

router.patch('/:userId', updateUser);

export default router;
