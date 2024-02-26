import express from 'express';
import { logLoginEvent } from '../controllers/metricController';

const router = express.Router();

router.post('/login', logLoginEvent);

export default router;
