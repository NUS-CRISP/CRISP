import express from 'express';
import { getReposByOrg } from '../controllers/teamDataController';

const router = express.Router();

router.post('/:org', getReposByOrg);

export default router;
