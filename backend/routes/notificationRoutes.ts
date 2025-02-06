import { sendTestEmailController } from './../controllers/notificationController';
import express from 'express';

const router = express.Router();

router.post('/testEmail', sendTestEmailController);

export default router;
