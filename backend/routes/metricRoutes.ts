import express from 'express';
import { logLoginEvent, logTabSession } from '../controllers/metricController';

const router = express.Router();

router.post('/login', logLoginEvent);
router.post('/tab-session', logTabSession);

export default router;
