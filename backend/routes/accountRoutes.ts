import express from 'express';
import {
  approveAccounts,
  createAccount,
  getPendingAccounts,
} from '../controllers/accountController';

const router = express.Router();

router.post('/', createAccount);
router.get('/pending', getPendingAccounts);
router.post('/approve', approveAccounts);

export default router;
