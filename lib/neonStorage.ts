import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

export const BUCKET_NAME = process.env.S3_BUCKET || "assets";

export const s3Client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: true, // Required for Neon Object Storage
});

export async function uploadObject(
  key: string,
  body: string | Uint8Array | Buffer,
  contentType: string = "application/octet-stream"
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: typeof body === "string" ? Buffer.from(body) : body,
    ContentType: contentType,
  });

  return await s3Client.send(command);
}

export async function getObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  const byteArray = await response.Body?.transformToByteArray();
  return {
    contentType: response.ContentType,
    data: byteArray ? Buffer.from(byteArray) : null,
  };
}

export async function listObjects(prefix?: string) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}
