import express from 'express';
import {
  getUserByHandle,
  getUserNotificationSettings,
  updateUser,
} from '../controllers/userController';

const router = express.Router();

router.patch('/:userId', updateUser);
router.get('/profile', getUserByHandle);
router.get('/notificationSettings', getUserNotificationSettings);

export default router;
