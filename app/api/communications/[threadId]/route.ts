import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

// GET: 특정 스레드와 모든 메시지 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const { threadId } = await params;

    const thread = await prisma.communicationThread.findFirst({
      where: {
        id: threadId,
        userId: user.userId, // 본인 스레드만 조회 가능
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!thread) {
      return NextResponse.json(
        { error: "스레드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 읽지 않은 관리자 메시지를 읽음 처리
    await prisma.communicationMessage.updateMany({
      where: {
        threadId,
        authorType: "admin",
        isReadByUser: false,
      },
      data: {
        isReadByUser: true,
        readByUserAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json(
      { error: "스레드 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
