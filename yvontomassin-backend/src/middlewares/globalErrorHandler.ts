import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import jwt, { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync';
import AppError from '../errors/AppError';
import { IUserRole } from '../app/modules/user/user.interface';
import config from '../app/config';
import { User } from '../app/modules/user/user.model';

const auth = (...requiredRoles: IUserRole[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    // checking if the token is missing
    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    // checking if the given token is valid
    const decoded = jwt.verify(
      token,
      config.jwt_access_secret as string
    ) as JwtPayload;

    const { role, email } = decoded;

    // checking if the user is exist in appropriate collection based on role
    let user: any;

    user = await User.findOne({ email });

    if (!user) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        'Login required. Please sign in again.'
      );
    }

    if (user.status === 'blocked') {
      throw new AppError(httpStatus.FORBIDDEN, 'This user is blocked !');
    }

    if (user.status === 'in-progress') {
      throw new AppError(httpStatus.FORBIDDEN, 'Please verify your email!');
    }


    // Authorize using the resolved user's role from DB
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'You are not authorized!');
    }

    req.user = user;
    next();
  });
};

export default auth;
