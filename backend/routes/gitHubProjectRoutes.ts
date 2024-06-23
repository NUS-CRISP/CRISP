import express from 'express';
import { getAllGitHubProjectNamesByCourse } from '../controllers/gitHubProjectController';

const router = express.Router();

router.get('/course/:id/names', getAllGitHubProjectNamesByCourse);

export default router;
