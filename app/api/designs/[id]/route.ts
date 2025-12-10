import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 관리자에게 Slack 알림 발송
async function sendSlackNotification(params: {
  channelId: string;
  userName: string;
  clientName: string;
  workflowType: string;
  feedbackContent?: string;
  isRevisionRequest?: boolean;
}) {
  // TODO: Slack 알림 로직 구현
  console.log("[Slack] 알림 발송:", params);
}

// GET: 시안 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            id: true,
            type: true,
            status: true,
            userId: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
          include: {
            feedbacks: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    if (!design) {
      return NextResponse.json(
        { error: "시안을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 본인의 시안인지 확인
    if (design.workflow.userId !== user.userId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 임시저장 상태는 고객에게 미공개
    if (design.status === "DRAFT") {
      return NextResponse.json(
        { error: "아직 공개되지 않은 시안입니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      design,
    });
  } catch (error) {
    console.error("Get design error:", error);
    return NextResponse.json(
      { error: "시안 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 시안 액션 (승인, 수정요청, 피드백)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, content } = body;

    // action: "approve" | "request_revision" | "feedback"

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            id: true,
            type: true,
            userId: true,
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
    });

    if (!design) {
      return NextResponse.json(
        { error: "시안을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 본인의 시안인지 확인
    if (design.workflow.userId !== user.userId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    const currentVersion = design.versions[0];
    if (!currentVersion) {
      return NextResponse.json(
        { error: "시안 버전을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    let responseMessage = "";

    switch (action) {
      case "approve": {
        // 시안 확정
        await prisma.$transaction([
          prisma.design.update({
            where: { id },
            data: {
              status: "APPROVED",
              approvedAt: new Date(),
              approvedVersion: design.currentVersion,
            },
          }),
          prisma.designFeedback.create({
            data: {
              versionId: currentVersion.id,
              authorId: user.userId,
              authorType: "user",
              authorName: user.name,
              content: content || "시안을 확정합니다.",
            },
          }),
          // 워크플로우 상태도 업데이트
          prisma.workflow.update({
            where: { id: design.workflowId },
            data: {
              status: "ORDER_REQUESTED",
              orderRequestedAt: new Date(),
            },
          }),
        ]);
        responseMessage = "시안이 확정되었습니다.";

        // 관리자 Slack 알림
        const submission = await prisma.submission.findFirst({
          where: { userId: user.userId },
          select: { slackChannelId: true },
        });

        if (submission?.slackChannelId) {
          sendSlackNotification({
            channelId: submission.slackChannelId,
            userName: user.name,
            clientName: user.clientName,
            workflowType: design.workflow.type,
          });
        }
        break;
      }

      case "request_revision": {
        if (!content) {
          return NextResponse.json(
            { error: "수정 요청 내용을 입력해주세요" },
            { status: 400 }
          );
        }

        // 수정 요청
        await prisma.$transaction([
          prisma.design.update({
            where: { id },
            data: { status: "REVISION_REQUESTED" },
          }),
          prisma.designFeedback.create({
            data: {
              versionId: currentVersion.id,
              authorId: user.userId,
              authorType: "user",
              authorName: user.name,
              content,
            },
          }),
        ]);
        responseMessage = "수정 요청이 전달되었습니다.";

        // 관리자 Slack 알림
        const submissionForRevision = await prisma.submission.findFirst({
          where: { userId: user.userId },
          select: { slackChannelId: true },
        });

        if (submissionForRevision?.slackChannelId) {
          sendSlackNotification({
            channelId: submissionForRevision.slackChannelId,
            userName: user.name,
            clientName: user.clientName,
            workflowType: design.workflow.type,
            feedbackContent: content,
            isRevisionRequest: true,
          });
        }
        break;
      }

      case "feedback": {
        if (!content) {
          return NextResponse.json(
            { error: "피드백 내용을 입력해주세요" },
            { status: 400 }
          );
        }

        // 일반 피드백
        await prisma.designFeedback.create({
          data: {
            versionId: currentVersion.id,
            authorId: user.userId,
            authorType: "user",
            authorName: user.name,
            content,
          },
        });
        responseMessage = "피드백이 전송되었습니다.";

        // 관리자 Slack 알림
        const submissionForFeedback = await prisma.submission.findFirst({
          where: { userId: user.userId },
          select: { slackChannelId: true },
        });

        if (submissionForFeedback?.slackChannelId) {
          sendSlackNotification({
            channelId: submissionForFeedback.slackChannelId,
            userName: user.name,
            clientName: user.clientName,
            workflowType: design.workflow.type,
            feedbackContent: content,
          });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "유효하지 않은 액션입니다" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
    });
  } catch (error) {
    console.error("Design action error:", error);
    return NextResponse.json(
      { error: "처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
