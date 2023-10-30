import express from 'express';
import {
  approveAccount,
  createAccount,
  getPendingAccounts,
} from '../controllers/accountController';

const router = express.Router();

router.post('/', createAccount);
router.get('/pending', getPendingAccounts);
router.post('/:accountId/approve', approveAccount);

export default router;
