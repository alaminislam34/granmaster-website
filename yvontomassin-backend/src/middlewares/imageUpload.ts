import multer from 'multer';
import { StatusCodes } from 'http-status-codes';
import AppError from '../errors/AppError';

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/jpg',
];

const maxImageUploadSize = Number(process.env.MAX_IMAGE_UPLOAD_SIZE || 5 * 1024 * 1024);

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (allowedImageMimeTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new AppError(StatusCodes.BAD_REQUEST, 'Only image files are allowed'));
};

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: maxImageUploadSize,
  },
});
