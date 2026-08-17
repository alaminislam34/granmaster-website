import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../errors/AppError';

const parseBodyData = (req: Request, _res: Response, next: NextFunction) => {
  if (typeof req.body?.data !== 'string') {
    next();
    return;
  }

  try {
    req.body = JSON.parse(req.body.data);
    next();
  } catch {
    next(new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field'));
  }
};

export default parseBodyData;
