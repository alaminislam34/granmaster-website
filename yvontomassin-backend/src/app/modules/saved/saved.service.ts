import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { SavedContentModel } from './saved.model';
import { ISavedSnapshot, SavedContentType } from './saved.interface';
import { buildSavedPdf } from './savedPdf.service';

const createSaved = async (payload: {
  userId: string;
  type: SavedContentType;
  title: string;
  snapshot: ISavedSnapshot;
}) => {
  if (!Types.ObjectId.isValid(payload.userId)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid userId');
  }

  return SavedContentModel.create({
    user: new Types.ObjectId(payload.userId),
    type: payload.type,
    title: payload.title,
    snapshot: payload.snapshot,
  });
};

const listSavedByUser = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid userId');
  }

  return SavedContentModel.find({ user: new Types.ObjectId(userId) }).sort({
    createdAt: -1,
  });
};

const getSavedById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid id');
  }

  const saved = await SavedContentModel.findById(id);
  if (!saved) throw new AppError(StatusCodes.NOT_FOUND, 'Saved content not found');
  return saved;
};

const deleteSaved = async (id: string) => {
  const saved = await SavedContentModel.findByIdAndDelete(id);
  if (!saved) throw new AppError(StatusCodes.NOT_FOUND, 'Saved content not found');
  return saved;
};

const getSavedPdf = async (id: string) => {
  const saved = await getSavedById(id);
  const buffer = await buildSavedPdf(saved as any);
  const filename = `${saved.type}-${saved._id}.pdf`;
  return { buffer, filename, title: saved.title };
};

export const savedService = {
  createSaved,
  listSavedByUser,
  getSavedById,
  deleteSaved,
  getSavedPdf,
};
