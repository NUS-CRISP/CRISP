import { Response } from 'express';
import {
  NotFoundError,
  BadRequestError,
  MissingAuthorizationError,
} from '../services/errors';

export const handleError = (
  res: Response,
  error: unknown,
  fallbackMsg: string
) => {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ message: error.message + "Not found" });
  }
  if (error instanceof BadRequestError) {
    return res.status(400).json({ message: error.message + "Bad request" });
  }
  if (error instanceof MissingAuthorizationError) {
    return res.status(403).json({ message: error.message + "Unauthorized" });
  }

  console.error(fallbackMsg, error);
  return res.status(500).json({ message: fallbackMsg + "Internal server error" });
};
