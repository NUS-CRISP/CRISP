import { NextFunction, Request, Response } from 'express';

export const noCache = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');

  next();
};
