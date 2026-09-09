import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../utils/catchAsync';
import sendResponse from '../../../utils/sendResponse';
import AppError from '../../../errors/AppError';
import { savedService } from './saved.service';

const createSaved = catchAsync(async (req: Request, res: Response) => {
  const result = await savedService.createSaved(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Content saved successfully',
    data: result,
  });
});

const listSaved = catchAsync(async (req: Request, res: Response) => {
  const userId = String(req.query.userId || '');
  if (!userId) throw new AppError(StatusCodes.BAD_REQUEST, 'userId is required');
  const result = await savedService.listSavedByUser(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Saved content retrieved successfully',
    data: result,
  });
});

const getSaved = catchAsync(async (req: Request, res: Response) => {
  const result = await savedService.getSavedById(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Saved content retrieved successfully',
    data: result,
  });
});

const deleteSaved = catchAsync(async (req: Request, res: Response) => {
  await savedService.deleteSaved(req.params.id as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Saved content deleted successfully',
    data: null,
  });
});

const downloadPdf = catchAsync(async (req: Request, res: Response) => {
  const { buffer, filename } = await savedService.getSavedPdf(req.params.id as string);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.status(StatusCodes.OK).end(buffer);
});

export const savedController = {
  createSaved,
  listSaved,
  getSaved,
  deleteSaved,
  downloadPdf,
};
