import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs } from "fs";
import path from "path";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
const MAX_TITLE_LENGTH = 60;
const R2_CONFIGURED = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.warn(
    "[ingestion] Cloudflare R2 n'est pas totalement configuré. Vérifiez les variables d'environnement."
  );
}

const s3Client =
  R2_CONFIGURED
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : null;

export const uploadToR2 = async (
  filePath: string,
  key: string,
  metadata: Record<string, string> = {}
) => {
  if (!R2_CONFIGURED || !s3Client) {
    throw new Error("Cloudflare R2 est mal configuré.");
  }

  const body = await fs.readFile(filePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "audio/mpeg",
    ContentLength: body.length,
    Metadata: metadata,
  });

  await s3Client.send(command);

  const baseUrl =
    (publicBaseUrl && publicBaseUrl.replace(/\/$/, "")) ||
    `https://${bucket}.${accountId}.r2.cloudflarestorage.com`;

  return {
    key,
    url: `${baseUrl}/${key}`,
  };
};

export const buildObjectKey = (workId: string, videoId: string, title: string) => {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, MAX_TITLE_LENGTH);

  const fileName = `${safeTitle || videoId}.mp3`;
  return path.posix.join(workId, fileName);
};
