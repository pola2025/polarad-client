import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@polarad/database";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "polarad-secret-key-change-in-production"
);

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token.value, JWT_SECRET);

    if (payload.type !== "user") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
    }

    const userId = payload.userId as string;

    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        clientName: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Submission 정보 가져오기
    const submission = await prisma.submission.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        isComplete: true,
        submittedAt: true,
        reviewedAt: true,
        brandName: true,
        businessLicense: true,
        profilePhoto: true,
        contactEmail: true,
        contactPhone: true,
        bankAccount: true,
      },
    });

    // Submission 진행률 계산
    const submissionFields = submission ? [
      submission.brandName,
      submission.businessLicense,
      submission.profilePhoto,
      submission.contactEmail,
      submission.contactPhone,
      submission.bankAccount,
    ] : [];
    const filledFields = submissionFields.filter(Boolean).length;
    const submissionProgress = Math.round((filledFields / 6) * 100);

    // 워크플로우 통계 가져오기
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      select: { status: true, type: true },
    });

    const workflowStats = {
      total: workflows.length,
      completed: workflows.filter((w) => ["COMPLETED", "SHIPPED"].includes(w.status)).length,
      inProgress: workflows.filter((w) =>
        ["IN_PROGRESS", "DESIGN_UPLOADED", "ORDER_REQUESTED", "ORDER_APPROVED"].includes(
          w.status
        )
      ).length,
      pending: workflows.filter((w) =>
        ["PENDING", "SUBMITTED"].includes(w.status)
      ).length,
    };

    // 전체 진행률 계산 (워크플로우 기준)
    const overallProgress = workflows.length > 0
      ? Math.round((workflowStats.completed / workflows.length) * 100)
      : 0;

    // 계약 정보 가져오기
    const contract = await prisma.contract.findFirst({
      where: { userId },
      include: {
        package: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      user,
      submission: submission
        ? {
            status: submission.status,
            isComplete: submission.isComplete,
            submittedAt: submission.submittedAt,
            reviewedAt: submission.reviewedAt,
            progress: submissionProgress,
          }
        : null,
      workflows: workflowStats,
      overallProgress,
      contract: contract
        ? {
            packageName: contract.package.displayName,
            status: contract.status,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
