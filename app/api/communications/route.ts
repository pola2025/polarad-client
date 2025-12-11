import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { postMessage } from "@/lib/slack";

// 슬랙 알림 발송 (클라이언트 채널로)
async function sendSlackNotification(
  slackChannelId: string | null,
  userName: string,
  clientName: string,
  title: string,
  category: string,
  content: string,
  attachments: string[]
) {
  if (!slackChannelId) {
    console.log("[Slack] 클라이언트 슬랙 채널 없음 - 알림 건너뜀");
    return;
  }

  try {
    const attachmentText = attachments.length > 0
      ? `\n📎 첨부파일: ${attachments.length}개`
      : "";

    await postMessage({
      channelId: slackChannelId,
      text: `🙋 고객 문의: ${title}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🙋 고객 문의 접수", emoji: true },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${userName}*님이 새 문의를 등록했습니다.` },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*📌 제목:*\n${title}` },
            { type: "mrkdwn", text: `*🏷️ 카테고리:*\n${category}` },
          ],
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: `*📝 내용:*\n${content.substring(0, 500)}${content.length > 500 ? "..." : ""}` },
        },
        ...(attachments.length > 0
          ? [
              {
                type: "divider" as const,
              },
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

    console.log("[Slack] 문의 알림 발송 성공:", slackChannelId);
  } catch (error) {
    console.error("[Slack] 문의 알림 발송 실패:", error);
  }
}

// 텔레그램 관리자 알림 발송
async function sendAdminNotification(userName: string, clientName: string, title: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) {
    console.log("[Telegram] 관리자 알림 설정 없음");
    return;
  }

  try {
    const message = `💬 <b>새 문의</b>\n\n${userName}님(${clientName})이 새 문의를 등록했습니다.\n\n📝 <b>제목:</b> ${title}\n\n관리자 페이지에서 확인해주세요.`;

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

// GET: 현재 사용자의 스레드 목록 조회
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const threads = await prisma.communicationThread.findMany({
      where: { userId: user.userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // 최신 메시지 1개만
        },
      },
      orderBy: { lastReplyAt: "desc" },
    });

    // 읽지 않은 관리자 메시지 수 계산
    const threadsWithUnread = threads.map((thread) => {
      const lastMessage = thread.messages[0];
      const hasUnreadAdminMessage =
        lastMessage &&
        lastMessage.authorType === "admin" &&
        !lastMessage.isReadByUser;

      return {
        ...thread,
        lastMessage: lastMessage || null,
        hasUnreadAdminMessage,
      };
    });

    return NextResponse.json({
      success: true,
      threads: threadsWithUnread,
    });
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json(
      { error: "스레드 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 새 스레드 생성
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
    const { title, category, content, attachments } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다" },
        { status: 400 }
      );
    }

    // 사용자의 슬랙 채널 ID 조회 (자료제출 시 생성된 채널)
    const submission = await prisma.submission.findUnique({
      where: { userId: user.userId },
      select: { slackChannelId: true },
    });

    // 트랜잭션으로 스레드와 첫 메시지 동시 생성
    const thread = await prisma.communicationThread.create({
      data: {
        userId: user.userId,
        title,
        category: category || "일반",
        status: "OPEN",
        messages: {
          create: {
            authorId: user.userId,
            authorType: "user",
            authorName: user.name,
            content,
            attachments: attachments || [],
            isReadByUser: true, // 본인이 작성한 메시지
            isReadByAdmin: false,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // 관리자에게 알림 (텔레그램 + 슬랙)
    sendAdminNotification(user.name, user.clientName, title);
    sendSlackNotification(
      submission?.slackChannelId || null,
      user.name,
      user.clientName,
      title,
      category || "일반",
      content,
      attachments || []
    );

    return NextResponse.json({
      success: true,
      thread,
      message: "문의가 등록되었습니다",
    });
  } catch (error) {
    console.error("Create thread error:", error);
    return NextResponse.json(
      { error: "문의 등록 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
