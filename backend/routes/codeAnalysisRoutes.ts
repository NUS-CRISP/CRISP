import {
  getAllCodeAnalysisData,
  getAllCodeAnalysisDataByOrg,
  getAllCodeAnalysisDataByCourse,
} from '../controllers/codeAnalysisController';
import express from 'express';

const router = express.Router();

router.get('/', getAllCodeAnalysisData);
router.get('/:gitHubOrgName', getAllCodeAnalysisDataByOrg);
router.get('/course/:id', getAllCodeAnalysisDataByCourse);

export default router;
