import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: 현재 사용자의 워크플로우 목록 조회
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const workflows = await prisma.workflow.findMany({
      where: { userId: currentUser.userId },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: workflows,
    });
  } catch (error) {
    console.error("Get user workflows error:", error);
    return NextResponse.json(
      { error: "워크플로우 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
