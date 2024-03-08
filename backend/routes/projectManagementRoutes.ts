import express from 'express';
import {
  authorizeJiraAccount,
  callbackJiraAccount,
} from '../controllers/projectManagementController';

const router = express.Router();

router.get('/authorize', authorizeJiraAccount);
router.get('/callback', callbackJiraAccount);

export default router;
