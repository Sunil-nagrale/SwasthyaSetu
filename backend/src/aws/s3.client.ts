import { BadRequestError } from '../utils/errors.js';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../validators/record.validator.js';
import { env } from '../config/env.js';

export interface IS3Service {
  generatePresignedUploadUrl(
    bucket: string,
    key: string,
    mimeType: string,
    fileSize: number,
    expiresInSeconds?: number
  ): Promise<string>;

  generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresInSeconds?: number
  ): Promise<string>;
}

export class MockS3Service implements IS3Service {
  async generatePresignedUploadUrl(
    bucket: string,
    key: string,
    mimeType: string,
    fileSize: number,
    expiresInSeconds = 300 // Max 5 min TTL as required by contract Section 10
  ): Promise<string> {
    if (expiresInSeconds > 300) {
      throw new BadRequestError('Presigned URL expiration cannot exceed 300 seconds (5 minutes)', 'ERR_BAD_REQUEST');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType as typeof ALLOWED_MIME_TYPES[number])) {
      throw new BadRequestError(`Disallowed MIME type: ${mimeType}`, 'ERR_BAD_REQUEST');
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError('File size exceeds maximum permitted limit', 'ERR_BAD_REQUEST');
    }

    return `https://${bucket}.s3.mock-region.amazonaws.com/${key}?mock-signature=true&expiresIn=${expiresInSeconds}`;
  }

  async generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 300
  ): Promise<string> {
    if (expiresInSeconds > 300) {
      throw new BadRequestError('Presigned URL expiration cannot exceed 300 seconds (5 minutes)', 'ERR_BAD_REQUEST');
    }
    return `https://${bucket}.s3.mock-region.amazonaws.com/${key}?mock-download-signature=true&expiresIn=${expiresInSeconds}`;
  }
}

export class AwsS3Service implements IS3Service {
  async generatePresignedUploadUrl(
    bucket: string,
    key: string,
    mimeType: string,
    fileSize: number,
    expiresInSeconds = 300
  ): Promise<string> {
    if (expiresInSeconds > 300) {
      throw new BadRequestError(
        'Presigned URL expiration cannot exceed 300 seconds (5 minutes)',
        'ERR_BAD_REQUEST'
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestError(`Disallowed MIME type: ${mimeType}`, 'ERR_BAD_REQUEST');
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError('File size exceeds maximum permitted limit', 'ERR_BAD_REQUEST');
    }

    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = new S3Client({ region: env.AWS_REGION });
    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: mimeType,
      }),
      { expiresIn: expiresInSeconds }
    );
  }

  async generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 300
  ): Promise<string> {
    if (expiresInSeconds > 300) {
      throw new BadRequestError(
        'Presigned URL expiration cannot exceed 300 seconds (5 minutes)',
        'ERR_BAD_REQUEST'
      );
    }
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const client = new S3Client({ region: env.AWS_REGION });
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds }
    );
  }
}

export const s3Service: IS3Service = env.USE_MOCK_AWS ? new MockS3Service() : new AwsS3Service();
