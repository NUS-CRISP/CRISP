import express from 'express';
import {
  approveAccounts,
  createAccount,
  getPendingAccounts,
  rejectAccounts,
} from '../controllers/accountController';

const router = express.Router();

router.post('/', createAccount);
router.get('/pending', getPendingAccounts);
router.post('/approve', approveAccounts);
router.post('/reject', rejectAccounts);

export default router;
