import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPresignedUploadUrl, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/r2";

// POST: presigned URL 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileName, contentType, fileSize } = body;

    // 필수 필드 검증
    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: "파일 정보가 필요합니다" },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB를 초과할 수 없습니다" },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!Object.keys(ALLOWED_TYPES).includes(contentType)) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식입니다 (jpg, png, pdf만 가능)" },
        { status: 400 }
      );
    }

    const { uploadUrl, publicUrl, key } = await getPresignedUploadUrl(
      user.userId,
      fileName,
      contentType
    );

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error("Upload URL generation error:", error);
    return NextResponse.json(
      { error: "업로드 URL 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
