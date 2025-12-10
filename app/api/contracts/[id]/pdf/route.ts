import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateContractPDF } from "@/lib/pdf/generate-contract-pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        package: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "계약을 찾을 수 없습니다" }, { status: 404 });
    }

    // 본인 계약인지 확인
    if (contract.userId !== user.userId) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 승인된 계약만 PDF 생성 가능
    if (!["APPROVED", "ACTIVE", "EXPIRED"].includes(contract.status)) {
      return NextResponse.json(
        { error: "승인된 계약만 PDF를 다운로드할 수 있습니다" },
        { status: 400 }
      );
    }

    const pdfBuffer = await generateContractPDF({
      contractNumber: contract.contractNumber,
      companyName: contract.companyName,
      ceoName: contract.ceoName,
      businessNumber: contract.businessNumber,
      address: contract.address,
      contactName: contract.contactName,
      contactPhone: contract.contactPhone,
      contactEmail: contract.contactEmail,
      packageName: contract.package.name,
      packageDisplayName: contract.package.displayName,
      monthlyFee: contract.monthlyFee,
      contractPeriod: contract.contractPeriod,
      totalAmount: contract.totalAmount,
      startDate: contract.startDate || new Date(),
      endDate: contract.endDate || new Date(),
      signedAt: contract.signedAt || new Date(),
      clientSignature: contract.clientSignature || undefined,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contract-${contract.contractNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF 생성 오류:", error);
    return NextResponse.json(
      { error: "PDF 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
