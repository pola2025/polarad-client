/**
 * Cloudflare R2 스토리지 유틸리티
 * - WebP 이미지 압축 지원
 * - 민감정보 파일은 R2에 저장하지 않음 (슬랙으로만 전송)
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 허용된 파일 타입
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// 최대 파일 크기 (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 민감정보 파일 타입 (R2에 저장하지 않음)
export const SENSITIVE_FILE_TYPES = [
  "idCard",           // 신분증
  "bankBook",         // 통장사본
  "businessLicense",  // 사업자등록증
];

// R2 클라이언트 설정
const getR2Client = () => {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
};

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "polarad-uploads";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Presigned Upload URL 생성
 */
export async function getPresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const extension = ALLOWED_TYPES[contentType] || "bin";
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `uploads/${userId}/${timestamp}-${sanitizedFileName}.${extension}`;

  const r2Client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * 파일을 직접 R2에 업로드 (서버 사이드)
 */
export async function uploadToR2(
  buffer: Buffer,
  userId: string,
  fileName: string,
  contentType: string
): Promise<{ publicUrl: string; key: string }> {
  const extension = ALLOWED_TYPES[contentType] || "bin";
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `uploads/${userId}/${timestamp}-${sanitizedFileName}.${extension}`;

  const r2Client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  const publicUrl = `${PUBLIC_URL}/${key}`;
  return { publicUrl, key };
}

/**
 * 이미지를 WebP로 압축
 */
export async function compressToWebP(
  buffer: Buffer,
  quality: number = 80
): Promise<Buffer> {
  // sharp는 동적 import (서버 사이드에서만 사용)
  const sharp = (await import("sharp")).default;

  return sharp(buffer)
    .webp({ quality })
    .toBuffer();
}

/**
 * 이미지 파일인지 확인
 */
export function isImageFile(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/**
 * 민감정보 파일인지 확인
 */
export function isSensitiveFile(fileType: string): boolean {
  return SENSITIVE_FILE_TYPES.includes(fileType);
}
