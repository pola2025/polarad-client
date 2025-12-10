import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  uploadToR2,
  compressToWebP,
  isImageFile,
  isSensitiveFile,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/r2";
import { uploadSensitiveFileToSlack } from "@/lib/slack";
import { prisma } from "@/lib/prisma";

/**
 * POST: 파일 업로드
 * - 이미지: WebP로 압축 후 R2 저장
 * - 민감정보(신분증, 통장, 사업자등록증): R2 저장 없이 슬랙으로만 전송
 * - 일반 파일: R2 저장 + 슬랙 알림
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = formData.get("fileType") as string | null; // businessLicense, idCard, bankBook, profilePhoto 등
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "파일이 필요합니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 초과할 수 없습니다" },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식입니다 (jpg, png, webp, pdf만 가능)" },
        { status: 400 }
      );
    }

    // 파일을 버퍼로 변환
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let contentType = file.type;

    // 이미지 파일이면 WebP로 압축
    if (isImageFile(file.type) && file.type !== "image/webp") {
      try {
        buffer = await compressToWebP(buffer, 80);
        contentType = "image/webp";
        console.log(`✅ WebP 압축 완료: ${file.name} (${file.size} → ${buffer.length} bytes)`);
      } catch (compressError) {
        console.error("WebP 압축 실패, 원본 사용:", compressError);
        // 압축 실패 시 원본 사용
      }
    }

    // 민감정보 파일인 경우: 슬랙으로만 전송, R2 저장 안함
    if (fileType && isSensitiveFile(fileType)) {
      // 사용자의 슬랙 채널 ID 조회
      const submission = await prisma.submission.findUnique({
        where: { userId: user.userId },
        select: { slackChannelId: true },
      });

      if (!submission?.slackChannelId) {
        return NextResponse.json(
          { error: "슬랙 채널이 생성되지 않았습니다. 먼저 자료를 제출해주세요." },
          { status: 400 }
        );
      }

      // 슬랙으로 파일 전송
      const success = await uploadSensitiveFileToSlack({
        channelId: submission.slackChannelId,
        buffer,
        fileName: file.name,
        title: title || fileType,
        userName: user.name,
      });

      if (!success) {
        return NextResponse.json(
          { error: "민감정보 파일 전송에 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        isSensitive: true,
        message: "민감정보 파일이 안전하게 전송되었습니다 (서버에 저장되지 않음)",
      });
    }

    // 일반 파일: R2에 업로드
    const { publicUrl, key } = await uploadToR2(
      buffer,
      user.userId,
      file.name,
      contentType
    );

    return NextResponse.json({
      success: true,
      publicUrl,
      key,
      isSensitive: false,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "파일 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
