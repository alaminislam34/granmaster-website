import path from 'path';
import { randomUUID } from 'crypto';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { StatusCodes } from 'http-status-codes';
import config from '../config';
import AppError from '../../errors/AppError';

type S3Config = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  keyPrefix?: string;
};

type UploadedS3Image = {
  key: string;
  url: string;
};

type S3ImageObject = {
  body: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
  cacheControl?: string;
  etag?: string;
};

const mimeExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

let s3Client: S3Client | null = null;

const getRequiredConfig = (): S3Config => {
  const { accessKeyId, secretAccessKey, region, bucket, keyPrefix } = config.s3;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'S3 is not configured. Set S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION, and S3_BUCKET.'
    );
  }

  return { accessKeyId, secretAccessKey, region, bucket, keyPrefix };
};

const getClient = () => {
  const s3Config = getRequiredConfig();

  if (!s3Client) {
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  return s3Client;
};

const sanitizeKeyPart = (value: string) =>
  value
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');

const buildPublicUrl = (key: string) => {
  const { bucket, region } = getRequiredConfig();
  const baseUrl = `https://${bucket}.s3.${region}.amazonaws.com`;

  return `${baseUrl}/${encodeKey(key)}`;
};

const buildObjectKey = (file: Express.Multer.File, folder: string) => {
  const { keyPrefix } = getRequiredConfig();
  const prefix = keyPrefix ? sanitizeKeyPart(keyPrefix) : '';
  const safeFolder = sanitizeKeyPart(folder) || 'images';
  const extension =
    path.extname(file.originalname).toLowerCase() || mimeExtensions[file.mimetype] || '';
  const filename = `${Date.now()}-${randomUUID()}${extension}`;

  return [prefix, safeFolder, filename].filter(Boolean).join('/');
};

const uploadImage = async (
  file: Express.Multer.File,
  folder = 'images'
): Promise<UploadedS3Image> => {
  const s3Config = getRequiredConfig();
  const key = buildObjectKey(file, folder);

  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    return {
      key,
      url: buildPublicUrl(key),
    };
  } catch (error) {
    console.error('S3 image upload failed:', error);
    throw new AppError(StatusCodes.BAD_GATEWAY, 'Image upload failed');
  }
};

const getObjectKeyFromUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;

  const s3Config = getRequiredConfig();

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  const host = parsed.hostname;
  const pathKey = parsed.pathname.replace(/^\/+/, '');
  const virtualHosted = host === `${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com`;
  const globalVirtualHosted = host === `${s3Config.bucket}.s3.amazonaws.com`;
  const pathStyle =
    host === `s3.${s3Config.region}.amazonaws.com` || host === 's3.amazonaws.com';

  if (virtualHosted || globalVirtualHosted) {
    return decodeURIComponent(pathKey);
  }

  if (pathStyle && pathKey.startsWith(`${s3Config.bucket}/`)) {
    return decodeURIComponent(pathKey.slice(s3Config.bucket.length + 1));
  }

  return null;
};

const deleteImageByUrl = async (imageUrl?: string | null) => {
  const s3Config = getRequiredConfig();
  const key = getObjectKeyFromUrl(imageUrl);

  if (!key) return;

  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      })
    );
  } catch (error) {
    console.error('S3 image deletion failed:', error);
    throw new AppError(StatusCodes.BAD_GATEWAY, 'Image deletion failed');
  }
};

const deleteImageBestEffort = async (imageUrl?: string | null) => {
  try {
    await deleteImageByUrl(imageUrl);
  } catch (error) {
    console.error('S3 image cleanup failed:', error);
  }
};

const getImageObjectByUrl = async (imageUrl?: string | null): Promise<S3ImageObject | null> => {
  const s3Config = getRequiredConfig();
  const key = getObjectKeyFromUrl(imageUrl);

  if (!key) return null;

  let result;
  try {
    result = await getClient().send(
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      })
    );
  } catch (error: any) {
    const statusCode = error?.$metadata?.httpStatusCode;

    if (error?.name === 'NoSuchKey' || statusCode === 404) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Image file not found in S3');
    }

    if (error?.name === 'AccessDenied' || statusCode === 403) {
      throw new AppError(StatusCodes.FORBIDDEN, 'Image file is not accessible from S3');
    }

    console.error('S3 image read failed:', error);
    throw new AppError(StatusCodes.BAD_GATEWAY, 'Image retrieval failed');
  }

  if (!result.Body) return null;

  return {
    body: result.Body as NodeJS.ReadableStream,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
    cacheControl: result.CacheControl,
    etag: result.ETag,
  };
};

export const s3Service = {
  uploadImage,
  deleteImageByUrl,
  deleteImageBestEffort,
  getImageObjectByUrl,
  getObjectKeyFromUrl,
};
