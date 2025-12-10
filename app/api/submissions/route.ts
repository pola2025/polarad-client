import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createSubmissionChannel,
  pushSubmissionToSlack,
  uploadFileToSlackFromUrl,
} from "@/lib/slack";

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
      // 파일 URL (R2에 저장된 일반 파일들)
      profilePhoto,
      // 텍스트 정보
      brandName,
      contactEmail,
      contactPhone,
      bankAccount,
      deliveryAddress,
      websiteStyle,
      websiteColor,
      blogDesignNote,
      additionalNote,
      // 민감정보는 별도 API로 처리되어 여기서는 플래그만 받음
      sensitiveFilesUploaded,
    } = body;

    // 필수 필드 모두 채워졌는지 확인
    // 민감정보(사업자등록증, 신분증, 통장)는 별도 업로드 완료 여부 확인
    const isComplete = !!(
      profilePhoto &&
      brandName &&
      contactEmail &&
      contactPhone &&
      bankAccount &&
      sensitiveFilesUploaded // 민감정보 파일들이 슬랙으로 전송 완료됨
    );

    // 기존 submission 조회 (제출 여부 확인)
    const existingSubmission = await prisma.submission.findUnique({
      where: { userId: user.userId },
    });

    const wasNotSubmitted = !existingSubmission || existingSubmission.status === "DRAFT";
    const isNewSubmission = isComplete && wasNotSubmitted;

    // 사용자 정보 조회
    const userInfo = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true, clientName: true, email: true, phone: true },
    });

    // 새로운 완료 제출인 경우 슬랙 채널 생성
    let slackChannelId = existingSubmission?.slackChannelId || null;

    if (isNewSubmission && userInfo && !slackChannelId) {
      // 슬랙 채널 생성
      slackChannelId = await createSubmissionChannel({
        clientName: userInfo.clientName,
        userName: userInfo.name,
        userEmail: userInfo.email,
        userPhone: userInfo.phone,
      });

      if (slackChannelId) {
        console.log(`✅ 슬랙 채널 생성 완료: ${slackChannelId}`);

        // 제출 정보를 슬랙에 전송
        await pushSubmissionToSlack({
          channelId: slackChannelId,
          submissionData: {
            brandName,
            contactEmail,
            contactPhone,
            deliveryAddress,
            websiteStyle,
            websiteColor,
            blogDesignNote,
            additionalNote,
          },
        });

        // 프로필 사진을 슬랙에 업로드 (R2 URL에서)
        if (profilePhoto) {
          await uploadFileToSlackFromUrl({
            channelId: slackChannelId,
            fileUrl: profilePhoto,
            fileName: "프로필사진.webp",
            title: "프로필 사진",
          });
        }
      }
    }

    // upsert: 없으면 생성, 있으면 업데이트
    const submission = await prisma.submission.upsert({
      where: { userId: user.userId },
      create: {
        userId: user.userId,
        businessLicense: null, // 민감정보는 DB에 저장 안함
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
        slackChannelId,
      },
      update: {
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
        slackChannelId: slackChannelId || existingSubmission?.slackChannelId,
      },
    });

    // 새로 제출된 경우 관리자에게 알림
    if (isNewSubmission && userInfo) {
      sendAdminNotification(userInfo.name, userInfo.clientName);
    }

    return NextResponse.json({
      success: true,
      submission,
      slackChannelId,
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
