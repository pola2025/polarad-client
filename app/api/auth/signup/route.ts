import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { WorkflowType } from "@polarad/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, email, name, phone, password, smsConsent, emailConsent } = body;

    // 필수 필드 검증
    if (!clientName || !email || !name || !phone || !password) {
      return NextResponse.json(
        { error: "필수 정보를 모두 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식을 입력해주세요" },
        { status: 400 }
      );
    }

    // 비밀번호 검증 (4자리 숫자)
    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json(
        { error: "비밀번호는 4자리 숫자로 입력해주세요" },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다" },
        { status: 400 }
      );
    }

    // 같은 클라이언트명 + 연락처 중복 확인
    const existingUserByClient = await prisma.user.findFirst({
      where: {
        clientName,
        phone: phone.replace(/-/g, ""),
      },
    });

    if (existingUserByClient) {
      return NextResponse.json(
        { error: "이미 가입된 클라이언트입니다" },
        { status: 400 }
      );
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성 + 제출 양식 + 워크플로우 생성 (트랜잭션)
    const user = await prisma.$transaction(async (tx) => {
      // 사용자 생성
      const newUser = await tx.user.create({
        data: {
          clientName,
          email,
          name,
          phone: phone.replace(/-/g, ""),
          password: hashedPassword,
          smsConsent: smsConsent ?? false,
          emailConsent: emailConsent ?? false,
        },
      });

      // 자료 제출 양식 생성
      await tx.submission.create({
        data: {
          userId: newUser.id,
        },
      });

      // 기본 워크플로우 생성 (명함, 명찰, 계약서, 대봉투, 홈페이지)
      const defaultWorkflows: WorkflowType[] = [
        "NAMECARD",
        "NAMETAG",
        "CONTRACT",
        "ENVELOPE",
        "WEBSITE",
      ];

      await tx.workflow.createMany({
        data: defaultWorkflows.map((type) => ({
          userId: newUser.id,
          type,
        })),
      });

      return newUser;
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          clientName: user.clientName,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
