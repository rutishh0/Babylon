import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint: string;
}

export function createS3Client(config: S3Config) {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return {
    async getStreamUrl(key: string, expiresIn = 14400): Promise<string> {
      const command = new GetObjectCommand({ Bucket: config.bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn });
    },

    async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    async deleteObject(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },

    async listObjects(prefix: string): Promise<string[]> {
      const result = await client.send(
        new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix })
      );
      return (result.Contents || []).map((obj) => obj.Key!).filter(Boolean);
    },

    buildKey(
      type: 'movie' | 'series' | 'anime',
      mediaId: string,
      parts: {
        seasonNumber?: number;
        episodeNumber?: number;
        filename: string;
      }
    ): string {
      const base = type === 'movie' ? 'movies' : type === 'anime' ? 'anime' : 'series';
      if (parts.seasonNumber != null && parts.episodeNumber != null) {
        return `${base}/${mediaId}/s${parts.seasonNumber}/e${parts.episodeNumber}/${parts.filename}`;
      }
      return `${base}/${mediaId}/${parts.filename}`;
    },

    buildSubtitleKey(parentId: string, language: string, format: string): string {
      return `subtitles/${parentId}/${language}.${format}`;
    },
  };
}

export type S3 = ReturnType<typeof createS3Client>;
