import express from 'express';
import {
  authorizeJiraAccount,
  callbackJiraAccount,
} from '../controllers/jiraController';

const router = express.Router();

router.get('/authorize', authorizeJiraAccount);
router.get('/callback', callbackJiraAccount);

export default router;
