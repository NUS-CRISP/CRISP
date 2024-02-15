import express from 'express';
import {
  checkInstallation,
  getAllTeamData,
  getAllTeamDataByCourse,
  getAllTeamDataByOrg,
} from '../controllers/githubController';

const router = express.Router();

router.get('/', getAllTeamData);
router.get('/:gitHubOrgName', getAllTeamDataByOrg);
router.get('/course/:id', getAllTeamDataByCourse);
router.post('/check-installation', checkInstallation);

export default router;
