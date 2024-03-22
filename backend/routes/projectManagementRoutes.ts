import express from 'express';
import {
  authorizeJiraAccount,
  callbackJiraAccount,
  getAllJiraBoardNamesByCourse,
} from '../controllers/projectManagementController';

const router = express.Router();

router.get('/authorize', authorizeJiraAccount);
router.get('/callback', callbackJiraAccount);
router.get('/course/:id/names', getAllJiraBoardNamesByCourse);

export default router;
