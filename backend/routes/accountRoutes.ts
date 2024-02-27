import express from 'express';
import {
  approveAccounts,
  createAccount,
  getPendingAccounts,
  rejectAccounts,
  getAccountStatuses,
} from '../controllers/accountController';

const router = express.Router();

router.post('/register', createAccount);
router.get('/pending', getPendingAccounts);
router.post('/approve', approveAccounts);
router.post('/reject', rejectAccounts);
router.get('/status', getAccountStatuses);

export default router;
