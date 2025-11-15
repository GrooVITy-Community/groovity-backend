// server/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const S3_BUCKET = process.env.S3_BUCKET || "";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload buffer to S3 in event-specific folder:
 * key => events/<eventId>/payments/<uuid>.<ext>
 *
 * If eventId is falsy, falls back to 'unknown'.
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  eventId?: string | null
): Promise<UploadResult> {
  try {
    if (!S3_BUCKET || !CLOUDFRONT_DOMAIN) {
      return {
        success: false,
        error: "S3 or CloudFront configuration missing",
      };
    }

    const fileExtension = (originalName.split(".").pop() || "jpg").replace(/\?.*$/, "");
    const safeEvent = (eventId && String(eventId)) || "unknown";
    const key = `events/${safeEvent}/payments/${randomUUID()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ACL: "private", // you can change to "public-read" if required by your CloudFront setup
    });

    await s3Client.send(command);

    const cloudfrontUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;

    return {
      success: true,
      url: cloudfrontUrl,
    };
  } catch (error) {
    console.error("S3 upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
