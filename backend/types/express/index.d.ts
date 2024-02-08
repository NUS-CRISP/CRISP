import SessionUser from '../../../shared/types/auth/SessionUser';

declare global {
  namespace Express {
    interface Request {
      user: SessionUser;
    }
  }
}
