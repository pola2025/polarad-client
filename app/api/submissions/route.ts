import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 텔레그램 관리자 알림 발송
async function sendAdminNotification(userName: string, clientName: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.log("[Telegram] 관리자 알림 설정 없음");
    return;
  }

  try {
    const message = `📥 <b>새 자료 제출</b>\n\n${userName}님(${clientName})이 자료를 제출했습니다.\n관리자 페이지에서 확인해주세요.`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    console.log("[Telegram] 관리자 알림 발송 성공");
  } catch (error) {
    console.error("[Telegram] 관리자 알림 발송 실패:", error);
  }
}

// GET: 현재 사용자의 자료 제출 정보 조회
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 기존 submission 조회 또는 빈 객체 반환
    const submission = await prisma.submission.findUnique({
      where: { userId: user.userId },
    });

    return NextResponse.json({
      success: true,
      submission: submission || null,
    });
  } catch (error) {
    console.error("Get submission error:", error);
    return NextResponse.json(
      { error: "자료 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PUT: 자료 제출 저장/수정
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      businessLicense,
      profilePhoto,
      brandName,
      contactEmail,
      contactPhone,
      bankAccount,
      deliveryAddress,
      websiteStyle,
      websiteColor,
      blogDesignNote,
      additionalNote,
    } = body;

    // 필수 필드 모두 채워졌는지 확인
    const isComplete = !!(
      businessLicense &&
      profilePhoto &&
      brandName &&
      contactEmail &&
      contactPhone &&
      bankAccount
    );

    // 기존 submission 조회 (제출 여부 확인)
    const existingSubmission = await prisma.submission.findUnique({
      where: { userId: user.userId },
    });

    const wasNotSubmitted = !existingSubmission || existingSubmission.status === "DRAFT";
    const isNewSubmission = isComplete && wasNotSubmitted;

    // upsert: 없으면 생성, 있으면 업데이트
    const submission = await prisma.submission.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        businessLicense,
        profilePhoto,
        brandName,
        contactEmail,
        contactPhone,
        bankAccount,
        deliveryAddress,
        websiteStyle,
        websiteColor,
        blogDesignNote,
        additionalNote,
        isComplete,
        status: isComplete ? "SUBMITTED" : "DRAFT",
        completedAt: isComplete ? new Date() : null,
        submittedAt: isComplete ? new Date() : null,
      },
      update: {
        businessLicense,
        profilePhoto,
        brandName,
        contactEmail,
        contactPhone,
        bankAccount,
        deliveryAddress,
        websiteStyle,
        websiteColor,
        blogDesignNote,
        additionalNote,
        isComplete,
        // 이미 승인/반려된 경우 상태 유지, 아니면 업데이트
        ...(existingSubmission?.status === "APPROVED" || existingSubmission?.status === "REJECTED"
          ? {}
          : {
              status: isComplete ? "SUBMITTED" : "DRAFT",
              submittedAt: isComplete && wasNotSubmitted ? new Date() : existingSubmission?.submittedAt,
            }),
        completedAt: isComplete ? new Date() : null,
      },
    });

    // 새로 제출된 경우 관리자에게 알림
    if (isNewSubmission) {
      // 사용자 정보 조회
      const userInfo = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true, clientName: true },
      });

      if (userInfo) {
        sendAdminNotification(userInfo.name, userInfo.clientName);
      }
    }

    return NextResponse.json({
      success: true,
      submission,
      message: isComplete ? "자료가 제출되었습니다" : "임시 저장되었습니다",
    });
  } catch (error) {
    console.error("Save submission error:", error);
    return NextResponse.json(
      { error: "자료 저장 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
