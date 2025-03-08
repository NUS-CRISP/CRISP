// notificationRoutes.ts
import express from 'express';
import {
  sendTestEmailController,
  sendTestTelegramMessageController,
  sendTestTelegramNotificationToAdminsController,
} from './../controllers/notificationController';

const router = express.Router();

router.post('/testEmail', sendTestEmailController);

router.post('/testTelegram', sendTestTelegramMessageController);
router.post(
  '/testTelegramToAdmins',
  sendTestTelegramNotificationToAdminsController
);

export default router;
