import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendContractRequestNotification } from "@polarad/lib/email";
import { sendTelegramMessage, formatContractSubmittedMessage } from "@polarad/lib/telegram";

// 계약번호 생성 (YYYYMMDD-XXXX)
async function generateContractNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

  // 오늘 생성된 계약 수 조회
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const todayCount = await prisma.contract.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(todayCount + 1).padStart(4, "0");
  return `${dateStr}-${sequence}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const contracts = await prisma.contract.findMany({
      where: { userId: user.userId },
      include: {
        package: {
          select: {
            name: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contracts });
  } catch (error) {
    console.error("계약 조회 오류:", error);
    return NextResponse.json(
      { error: "계약 정보를 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const {
      packageId,
      companyName,
      ceoName,
      businessNumber,
      address,
      contactName,
      contactPhone,
      contactEmail,
      contractPeriod,
      additionalNotes,
      clientSignature,
    } = body;

    // 필수 필드 검증
    if (!packageId || !companyName || !ceoName || !businessNumber || !address || !contactName || !contactPhone || !contactEmail || !clientSignature) {
      return NextResponse.json(
        { error: "필수 정보를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    // 패키지 정보 조회
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      return NextResponse.json(
        { error: "유효하지 않은 패키지입니다" },
        { status: 400 }
      );
    }

    // 이미 진행 중인 계약이 있는지 확인
    const existingContract = await prisma.contract.findFirst({
      where: {
        userId: user.userId,
        status: { in: ["PENDING", "SUBMITTED"] },
      },
    });

    if (existingContract) {
      return NextResponse.json(
        { error: "이미 진행 중인 계약 요청이 있습니다" },
        { status: 400 }
      );
    }

    // 계약번호 생성
    const contractNumber = await generateContractNumber();

    // 금액 계산
    const monthlyFee = pkg.price;
    const totalAmount = monthlyFee * (contractPeriod || 12);

    // 클라이언트 IP 가져오기
    const forwarded = request.headers.get("x-forwarded-for");
    const signedIp = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";

    // 계약 생성 (항상 SUBMITTED 상태로 생성, 관리자 승인 필요)
    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        userId: user.userId,
        packageId,
        companyName,
        ceoName,
        businessNumber,
        address,
        contactName,
        contactPhone,
        contactEmail,
        contractPeriod: contractPeriod || 12,
        monthlyFee,
        totalAmount,
        additionalNotes,
        clientSignature,
        signedAt: new Date(),
        signedIp,
        status: "SUBMITTED",
      },
    });

    // 계약 로그 생성
    await prisma.contractLog.create({
      data: {
        contractId: contract.id,
        fromStatus: null,
        toStatus: "SUBMITTED",
        changedBy: user.userId,
        note: "계약 요청 제출",
      },
    });

    // 접수 확인 이메일 발송
    try {
      await sendContractRequestNotification(contactEmail, contractNumber, companyName);
    } catch (emailError) {
      console.error("접수 확인 이메일 발송 오류:", emailError);
    }

    // 텔레그램 알림 발송 (사용자 정보 조회)
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          telegramChatId: true,
          telegramEnabled: true,
        },
      });

      if (userData?.telegramEnabled && userData?.telegramChatId) {
        const telegramMessage = formatContractSubmittedMessage(
          companyName,
          contractNumber,
          pkg.displayName
        );
        await sendTelegramMessage(userData.telegramChatId, telegramMessage);
      }
    } catch (telegramError) {
      console.error("텔레그램 알림 발송 오류:", telegramError);
    }

    return NextResponse.json({
      success: true,
      contractNumber,
      message: "계약 요청이 제출되었습니다. 관리자 승인 후 이메일로 안내드리겠습니다.",
    });
  } catch (error) {
    console.error("계약 생성 오류:", error);
    return NextResponse.json(
      { error: "계약 요청 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
