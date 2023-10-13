import express from 'express';
import {
  createAccount,
  getPendingAccounts,
  approveAccount,
} from '../controllers/accountController';

const router = express.Router();

router.post('/', createAccount);
router.get('/pending', getPendingAccounts);
router.get('/${accountId}/approve', approveAccount);

export default router;
