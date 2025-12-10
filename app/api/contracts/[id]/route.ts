import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 텔레그램 관리자 알림 발송
async function sendAdminNotification(userName: string, clientName: string, contractNumber: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

  try {
    const message = "📋 <b>계약서 제출</b>\n\n" + userName + "님(" + clientName + ")이 계약서를 제출했습니다.\n\n📄 <b>계약번호:</b> " + contractNumber + "\n\n관리자 페이지에서 확인해주세요.";

    await fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[Telegram] 관리자 알림 발송 실패:", error);
  }
}

// GET: 계약 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        package: true,
        logs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다" }, { status: 404 });
    }

    return NextResponse.json({ contract });
  } catch (error) {
    console.error("계약 상세 조회 오류:", error);
    return NextResponse.json(
      { error: "계약 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 계약서 작성 및 제출 (PENDING -> SUBMITTED)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      companyName,
      ceoName,
      businessNumber,
      address,
      contactName,
      contactPhone,
      contactEmail,
      clientSignature,
    } = body;

    // 계약 조회
    const contract = await prisma.contract.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다" }, { status: 404 });
    }

    // PENDING 상태만 수정 가능
    if (contract.status !== "PENDING") {
      return NextResponse.json(
        { error: "이미 제출된 계약서는 수정할 수 없습니다" },
        { status: 400 }
      );
    }

    // 필수 필드 검증
    if (!companyName || !ceoName || !businessNumber || !address || !contactName || !contactPhone || !contactEmail || !clientSignature) {
      return NextResponse.json(
        { error: "모든 필수 정보와 서명을 입력해주세요" },
        { status: 400 }
      );
    }

    // IP 가져오기
    const forwarded = request.headers.get("x-forwarded-for");
    const signedIp = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

    // 계약서 업데이트 (SUBMITTED 상태로 변경)
    const updatedContract = await prisma.contract.update({
      where: { id },
      data: {
        companyName,
        ceoName,
        businessNumber,
        address,
        contactName,
        contactPhone,
        contactEmail,
        clientSignature,
        signedAt: new Date(),
        signedIp,
        status: "SUBMITTED",
      },
    });

    // 로그 생성
    await prisma.contractLog.create({
      data: {
        contractId: id,
        fromStatus: "PENDING",
        toStatus: "SUBMITTED",
        changedBy: user.userId,
        note: "사용자가 계약서 작성 완료 및 제출",
      },
    });

    // 관리자에게 알림
    sendAdminNotification(user.name, user.clientName, contract.contractNumber);

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      message: "계약서가 제출되었습니다. 관리자 검토 후 안내드리겠습니다.",
    });
  } catch (error) {
    console.error("계약서 제출 오류:", error);
    return NextResponse.json(
      { error: "계약서 제출 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
