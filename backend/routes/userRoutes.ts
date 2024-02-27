import express from 'express';
import { updateUser } from '../controllers/userController';

const router = express.Router();

router.patch('/:id', updateUser);

export default router;
