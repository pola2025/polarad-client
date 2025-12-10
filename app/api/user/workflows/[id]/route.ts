import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: 워크플로우 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 본인 워크플로우만 조회 가능
    if (workflow.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error("Get workflow error:", error);
    return NextResponse.json(
      { error: "워크플로우 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 시안 승인/수정 요청
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, revisionNote } = body;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "워크플로우를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 본인 워크플로우만 수정 가능
    if (workflow.userId !== currentUser.userId) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다" },
        { status: 403 }
      );
    }

    // 시안 업로드 상태에서만 승인/수정 요청 가능
    if (workflow.status !== "DESIGN_UPLOADED") {
      return NextResponse.json(
        { error: "현재 상태에서는 이 작업을 수행할 수 없습니다" },
        { status: 400 }
      );
    }

    const now = new Date();

    // 디지털 유형 (홈페이지, 블로그) - 승인 시 바로 완료
    const DIGITAL_TYPES = ["WEBSITE", "BLOG"];
    const isDigital = DIGITAL_TYPES.includes(workflow.type);

    if (action === "approve") {
      if (isDigital) {
        // 디지털: 시안 승인 → 완료
        await prisma.workflow.update({
          where: { id },
          data: {
            status: "COMPLETED",
            completedAt: now,
          },
        });

        await prisma.workflowLog.create({
          data: {
            workflowId: id,
            fromStatus: "DESIGN_UPLOADED",
            toStatus: "COMPLETED",
            changedBy: currentUser.userId,
            note: "고객 시안 승인 - 완료",
          },
        });

        return NextResponse.json({
          success: true,
          message: "시안이 승인되었습니다. 작업이 완료되었습니다.",
        });
      } else {
        // 인쇄물: 시안 승인 → 발주 요청
        await prisma.workflow.update({
          where: { id },
          data: {
            status: "ORDER_REQUESTED",
            orderRequestedAt: now,
          },
        });

        await prisma.workflowLog.create({
          data: {
            workflowId: id,
            fromStatus: "DESIGN_UPLOADED",
            toStatus: "ORDER_REQUESTED",
            changedBy: currentUser.userId,
            note: "고객 시안 승인",
          },
        });

        return NextResponse.json({
          success: true,
          message: "시안이 승인되었습니다. 발주가 요청되었습니다.",
        });
      }
    } else if (action === "revision") {
      // 수정 요청
      if (!revisionNote) {
        return NextResponse.json(
          { error: "수정 요청 내용을 입력해주세요" },
          { status: 400 }
        );
      }

      await prisma.workflow.update({
        where: { id },
        data: {
          status: "IN_PROGRESS",
          revisionNote,
          revisionCount: workflow.revisionCount + 1,
          designStartedAt: now,
        },
      });

      await prisma.workflowLog.create({
        data: {
          workflowId: id,
          fromStatus: "DESIGN_UPLOADED",
          toStatus: "IN_PROGRESS",
          changedBy: currentUser.userId,
          note: `수정 요청: ${revisionNote}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: "수정 요청이 접수되었습니다.",
      });
    }

    return NextResponse.json(
      { error: "유효하지 않은 요청입니다" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update workflow error:", error);
    return NextResponse.json(
      { error: "워크플로우 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
