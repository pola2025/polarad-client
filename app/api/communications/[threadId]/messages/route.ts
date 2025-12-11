import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { postMessage } from "@/lib/slack";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

// 텔레그램 관리자 알림 발송
async function sendAdminNotification(userName: string, clientName: string, threadTitle: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    return;
  }

  try {
    const message = `💬 <b>새 답변</b>\n\n${userName}님(${clientName})이 문의에 답변했습니다.\n\n📝 <b>제목:</b> ${threadTitle}\n\n관리자 페이지에서 확인해주세요.`;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[Telegram] 알림 발송 실패:", error);
  }
}

// 슬랙 알림 발송 (클라이언트 채널로)
async function sendSlackNotification(
  slackChannelId: string | null,
  userName: string,
  threadTitle: string,
  content: string,
  attachments: string[]
) {
  if (!slackChannelId) {
    console.log("[Slack] 클라이언트 슬랙 채널 없음 - 알림 건너뜀");
    return;
  }

  try {
    await postMessage({
      channelId: slackChannelId,
      text: `💬 고객 답변: ${threadTitle}`,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `💬 *${userName}*님이 문의에 답변했습니다.` },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*제목:* ${threadTitle}` },
        },
        ...(content ? [{
          type: "section" as const,
          text: { type: "mrkdwn" as const, text: `*내용:*\n${content.substring(0, 500)}${content.length > 500 ? "..." : ""}` },
        }] : []),
        ...(attachments.length > 0
          ? [
              {
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: `*📎 첨부파일 (${attachments.length}개):*` },
              },
              ...attachments.map((url, i) => ({
                type: "section" as const,
                text: { type: "mrkdwn" as const, text: `• <${url}|첨부파일 ${i + 1}>` },
              })),
            ]
          : []),
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `👤 *고객* | 📅 ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` },
          ],
        },
      ],
    });

    console.log("[Slack] 답변 알림 발송 성공:", slackChannelId);
  } catch (error) {
    console.error("[Slack] 답변 알림 발송 실패:", error);
  }
}

// POST: 메시지 추가
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const { threadId } = await params;
    const body = await request.json();
    const { content, attachments } = body;

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: "내용 또는 첨부파일이 필요합니다" },
        { status: 400 }
      );
    }

    // 스레드 존재 및 소유권 확인
    const thread = await prisma.communicationThread.findFirst({
      where: {
        id: threadId,
        userId: user.userId,
      },
    });

    // 사용자의 슬랙 채널 ID 조회
    const submission = await prisma.submission.findUnique({
      where: { userId: user.userId },
      select: { slackChannelId: true },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "스레드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 완료된 스레드에는 메시지 추가 불가
    if (thread.status === "RESOLVED") {
      return NextResponse.json(
        { error: "완료된 문의에는 답변할 수 없습니다" },
        { status: 400 }
      );
    }

    // 메시지 생성 및 스레드 업데이트
    const [message] = await prisma.$transaction([
      prisma.communicationMessage.create({
        data: {
          threadId,
          authorId: user.userId,
          authorType: "user",
          authorName: user.name,
          content,
          attachments: attachments || [],
          isReadByUser: true,
          isReadByAdmin: false,
        },
      }),
      prisma.communicationThread.update({
        where: { id: threadId },
        data: {
          lastReplyAt: new Date(),
          // 관리자가 답변 대기 상태로 변경
          status: "OPEN",
        },
      }),
    ]);

    // 관리자에게 알림 (텔레그램 + 슬랙)
    sendAdminNotification(user.name, user.clientName, thread.title);
    sendSlackNotification(
      submission?.slackChannelId || null,
      user.name,
      thread.title,
      content || "",
      attachments || []
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Create message error:", error);
    return NextResponse.json(
      { error: "메시지 추가 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
