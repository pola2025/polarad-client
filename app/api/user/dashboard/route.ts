import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// 워크플로우 타입 한글 변환
const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  NAMECARD: "명함",
  NAMETAG: "명찰",
  CONTRACT: "계약서",
  ENVELOPE: "대봉투",
  WEBSITE: "홈페이지",
  BLOG: "블로그",
  META_ADS: "메타 광고",
  NAVER_ADS: "네이버 광고",
};

// 워크플로우 상태 한글 변환
const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  SUBMITTED: "제출완료",
  IN_PROGRESS: "진행중",
  DESIGN_UPLOADED: "시안확인",
  ORDER_REQUESTED: "발주요청",
  ORDER_APPROVED: "발주승인",
  COMPLETED: "완료",
  SHIPPED: "발송완료",
  CANCELLED: "취소됨",
};

// 제출 항목 정의
const SUBMISSION_FIELDS = [
  { key: "businessLicense", name: "사업자등록증" },
  { key: "profilePhoto", name: "프로필 사진" },
  { key: "brandName", name: "브랜드명" },
  { key: "contactEmail", name: "대표 이메일" },
  { key: "contactPhone", name: "대표 번호" },
  { key: "bankAccount", name: "계좌 정보" },
];

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        name: true,
        clientName: true,
        email: true,
        submission: true,
        workflows: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 제출 현황 계산
    const submissionItems = SUBMISSION_FIELDS.map((field) => ({
      name: field.name,
      completed: user.submission
        ? Boolean(user.submission[field.key as keyof typeof user.submission])
        : false,
    }));

    const completedCount = submissionItems.filter((item) => item.completed).length;

    const submissionStatus = {
      total: SUBMISSION_FIELDS.length,
      completed: completedCount,
      items: submissionItems,
    };

    // 워크플로우 현황
    const workflows = user.workflows.map((wf) => ({
      id: wf.id,
      type: WORKFLOW_TYPE_LABELS[wf.type] || wf.type,
      status: WORKFLOW_STATUS_LABELS[wf.status] || wf.status,
      statusCode: wf.status,
      designUrl: wf.designUrl,
      trackingNumber: wf.trackingNumber,
      courier: wf.courier,
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: user.name,
          clientName: user.clientName,
          email: user.email,
        },
        submission: submissionStatus,
        workflows,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "대시보드 데이터 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
