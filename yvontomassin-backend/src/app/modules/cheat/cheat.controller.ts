import { StatusCodes } from 'http-status-codes';
import { Request, Response } from 'express';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';
import { cheatService } from './cheat.service';

// POST /api/cheat/create
const createCheat = catchAsync(async (req: Request, res: Response) => {
  // support multipart/form-data with JSON "data" field
  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field');
    }
  }

  const result = await cheatService.createCheat(
    req.body,
    req.file as Express.Multer.File | undefined
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Cheat meal created successfully',
    data: result,
  });
});

// GET /api/cheat
const getAllCheats = catchAsync(async (_req: Request, res: Response) => {
  const result = await cheatService.getAllCheats();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meals retrieved successfully',
    data: result,
  });
});

// GET /api/cheat/:id
const getSingleCheat = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cheatService.getSingleCheat(id);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Cheat meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meal retrieved successfully',
    data: result,
  });
});

// PATCH /api/cheat/:id
const updateCheat = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (typeof req.body?.data === 'string') {
    try {
      req.body = JSON.parse(req.body.data);
    } catch {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON in data field');
    }
  }

  const result = await cheatService.updateCheat(
    id,
    req.body,
    req.file as Express.Multer.File | undefined
  );

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Cheat meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meal updated successfully',
    data: result,
  });
});

// DELETE /api/cheat/:id
const deleteCheat = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await cheatService.deleteCheat(id);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Cheat meal not found');
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Cheat meal deleted successfully',
    data: result,
  });
});

export const cheatController = {
  createCheat,
  getAllCheats,
  getSingleCheat,
  updateCheat,
  deleteCheat,
};
