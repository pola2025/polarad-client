import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

    // 관리자에게 알림
    sendAdminNotification(user.name, user.clientName, title);

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
