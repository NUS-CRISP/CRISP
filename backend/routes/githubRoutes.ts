import express from 'express';
import {
  checkInstallation,
  getAllTeamData,
  getAllTeamDataByCourse,
  getAllTeamDataByOrg,
  getAllTeamDataNamesByCourse,
} from '../controllers/githubController';

const router = express.Router();

router.get('/', getAllTeamData);
router.get('/:gitHubOrgName', getAllTeamDataByOrg);
router.get('/course/:id', getAllTeamDataByCourse);
router.get('/course/:id/names', getAllTeamDataNamesByCourse);
router.post('/check-installation', checkInstallation);

export default router;
