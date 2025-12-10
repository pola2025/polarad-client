import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: 현재 사용자의 시안 목록 조회
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자의 워크플로우 ID 목록 조회
    const workflows = await prisma.workflow.findMany({
      where: { userId: user.userId },
      select: { id: true },
    });

    const workflowIds = workflows.map((w) => w.id);

    // 해당 워크플로우의 시안 목록 조회
    const designs = await prisma.design.findMany({
      where: {
        workflowId: { in: workflowIds },
        status: { not: "DRAFT" }, // 임시저장 상태는 고객에게 미공개
      },
      include: {
        workflow: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1, // 최신 버전만
          include: {
            feedbacks: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { status: "asc" }, // PENDING_REVIEW 우선
        { updatedAt: "desc" },
      ],
    });

    // 읽지 않은 관리자 피드백 수 계산
    const designsWithUnread = designs.map((design) => {
      const latestVersion = design.versions[0];
      const latestFeedback = latestVersion?.feedbacks[0];
      const hasUnreadAdminFeedback =
        latestFeedback && latestFeedback.authorType === "admin";

      return {
        ...design,
        hasUnreadAdminFeedback,
      };
    });

    return NextResponse.json({
      success: true,
      designs: designsWithUnread,
    });
  } catch (error) {
    console.error("Get designs error:", error);
    return NextResponse.json(
      { error: "시안 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
