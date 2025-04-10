import express from 'express';
import {
  approveAccounts,
  createAccount,
  getPendingAccounts,
  rejectAccounts,
  getAccountStatuses,
  changeTelegramNotificationSettings,
  changeEmailNotificationSettings,
  retrieveTrialAccounts,
} from '../controllers/accountController';

const router = express.Router();

router.post('/register', createAccount);
router.get('/pending', getPendingAccounts);
router.post('/approve', approveAccounts);
router.post('/reject', rejectAccounts);
router.get('/status', getAccountStatuses);
router.get('/trial', retrieveTrialAccounts);
router.patch('/notifications/email', changeEmailNotificationSettings);
router.patch('/notifications/telegram', changeTelegramNotificationSettings);

export default router;
