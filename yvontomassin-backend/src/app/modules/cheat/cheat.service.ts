import { ICheat } from './cheat.interface';
import { CheatModel } from './cheat.model';
import { s3Service } from '../../services/s3.service';

const createCheat = async (data: ICheat, imageFile?: Express.Multer.File) => {
  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'cheats');
    uploadedImageUrl = uploaded.url;
    data.image = uploaded.url;
  }

  let result;
  try {
    result = await CheatModel.create(data);
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  return result;
};

const getAllCheats = async () => {
  const result = await CheatModel.find().sort({ createdAt: -1 });
  return result;
};

const getSingleCheat = async (id: string) => {
  const result = await CheatModel.findById(id);
  return result;
};

const updateCheat = async (
  id: string,
  payload: Partial<ICheat>,
  imageFile?: Express.Multer.File
) => {
  const existing = await CheatModel.findById(id);
  if (!existing) return null;

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'cheats');
    uploadedImageUrl = uploaded.url;
    payload.image = uploaded.url;
  }

  let result;
  try {
    result = await CheatModel.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  if (uploadedImageUrl && existing.image && existing.image !== uploadedImageUrl) {
    await s3Service.deleteImageBestEffort(existing.image);
  }

  return result;
};

const deleteCheat = async (id: string) => {
  const result = await CheatModel.findByIdAndDelete(id);
  if (result) {
    await s3Service.deleteImageBestEffort(result.image);
  }
  return result;
};

export const cheatService = {
  createCheat,
  getAllCheats,
  getSingleCheat,
  updateCheat,
  deleteCheat,
};
