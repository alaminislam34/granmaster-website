import { IUser } from './user.interface';
import { User } from './user.model';
import { s3Service } from '../../services/s3.service';

const getUser = async () => {
  const result = await User.find();
  return result;
};

const getSingleUser = async (id: string) => {
  //   const result = await User.findOne({name:"habi jabi"})
  const result = await User.findById(id);
  return result;
};

const updateUser = async (
  id: string,
  data: Partial<IUser>,
  imageFile?: Express.Multer.File
) => {
  const existing = await User.findById(id);
  if (!existing) return null;

  let uploadedImageUrl: string | null = null;

  if (imageFile) {
    const uploaded = await s3Service.uploadImage(imageFile, 'profiles');
    uploadedImageUrl = uploaded.url;
    data.profileImage = uploaded.url;
  }

  let result;
  try {
    result = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  } catch (error) {
    await s3Service.deleteImageBestEffort(uploadedImageUrl);
    throw error;
  }

  if (
    uploadedImageUrl &&
    existing.profileImage &&
    existing.profileImage !== uploadedImageUrl
  ) {
    await s3Service.deleteImageBestEffort(existing.profileImage);
  }

  return result;
};

const deleteUser = async (id: string) => {
  const result = await User.findByIdAndDelete(id);
  if (result) {
    await s3Service.deleteImageBestEffort(result.profileImage);
  }
  return result;
};

const getMe = async (email: string, role?: string) => {
  return await User.findOne({ email });
};

const changeStatus = async (id: string, payload: { status: string }) => {
  const result = await User.findByIdAndUpdate(id, payload, {
    new: true,
  });
  return result;
};

export const userService = {
  getUser,
  getSingleUser,
  updateUser,
  deleteUser,
  changeStatus,
  getMe,
};
