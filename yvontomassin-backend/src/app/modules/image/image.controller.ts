import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../utils/catchAsync';
import { s3Service } from '../../services/s3.service';

const getImage = catchAsync(async (req: Request, res: Response) => {
  const imageUrl = typeof req.query.url === 'string' ? req.query.url : null;

  if (!imageUrl) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Image url query parameter is required');
  }

  const image = await s3Service.getImageObjectByUrl(imageUrl);

  if (!image) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Image not found');
  }

  res.setHeader('Content-Type', image.contentType || 'application/octet-stream');
  res.setHeader('Cache-Control', image.cacheControl || 'public, max-age=3600');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (image.contentLength !== undefined) {
    res.setHeader('Content-Length', image.contentLength.toString());
  }

  if (image.etag) {
    res.setHeader('ETag', image.etag);
  }

  image.body.on('error', (error) => {
    console.error('S3 image stream failed:', error);
    if (!res.headersSent) {
      res.status(StatusCodes.BAD_GATEWAY).end();
    } else {
      res.destroy(error);
    }
  });

  image.body.pipe(res);
});

export const imageController = {
  getImage,
};
