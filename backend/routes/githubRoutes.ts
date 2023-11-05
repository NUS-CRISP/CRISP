import express from 'express';
import { checkInstallation, getAllTeamData, getAllTeamDataForOrg } from '../controllers/githubController';

const router = express.Router();

router.get('/', getAllTeamData);
router.get('/:gitHubOrgName', getAllTeamDataForOrg);
router.post('/check-installation', checkInstallation);

export default router;
