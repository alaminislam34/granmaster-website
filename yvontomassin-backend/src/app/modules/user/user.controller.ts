import { StatusCodes } from 'http-status-codes';
import { userService } from './user.service';
import { Request, Response } from 'express';
import { User } from './user.model';
import mongoose from 'mongoose';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';

const getUser = catchAsync(async (req, res) => {
  const result = await userService.getUser();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Users getting successfully',
    data: result,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  // console.log(req.params);
  const userId = req.params.userId as string;

  const result = await userService.getSingleUser(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User getting successfully',
    data: result,
  });
});

const updateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const file =
    (((req as any).files as any)?.file?.[0] ||
      ((req as any).files as any)?.profileImage?.[0] ||
      (req as any).file) as Express.Multer.File | undefined;

  const result = await userService.updateUser(id as string, body, file);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const sanitizedResult = result?.toObject ? result.toObject() : result;

  if (sanitizedResult && 'profileImg' in sanitizedResult) {
    delete sanitizedResult.profileImg;
  }

  if (sanitizedResult && 'firstName' in sanitizedResult) {
    delete sanitizedResult.firstName;
  }

  if (sanitizedResult && 'lastName' in sanitizedResult) {
    delete sanitizedResult.lastName;
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User updated successfully',
    data: sanitizedResult,
  });
});

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const deletedUser = await userService.deleteUser(id as string);

  if (!deletedUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Already deleted');
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully',
    data: deletedUser,
  });
});

export const changeStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid user ID');
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status }, // Update the status
    { new: true } // Return the updated document
  );

  if (!updatedUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'User not found');
  }

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Status updated successfully',
    data: updatedUser,
  });
});

const getMe = catchAsync(async (req, res) => {
  const email = (req.user as any)?.email;
  const role = (req.user as any)?.role;

  const result = await userService.getMe(email, role);
  const sanitizedResult = result?.toObject ? result.toObject() : result;

  if (sanitizedResult && 'firstName' in sanitizedResult) {
    delete sanitizedResult.firstName;
  }

  if (sanitizedResult && 'lastName' in sanitizedResult) {
    delete sanitizedResult.lastName;
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User is retrieved successfully',
    data: sanitizedResult,
  });
});

export const userController = {
  getUser,
  getSingleUser,
  updateUser,
  deleteUser,
  changeStatus,
  getMe,
};
