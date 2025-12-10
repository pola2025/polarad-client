import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@polarad/database";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "polarad-secret-key-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientName, phone, password } = body;

    // 필수 필드 검증
    if (!clientName || !phone || !password) {
      return NextResponse.json(
        { error: "모든 정보를 입력해주세요" },
        { status: 400 }
      );
    }

    // 비밀번호 검증 (4자리 숫자)
    if (!/^\d{4}$/.test(password)) {
      return NextResponse.json(
        { error: "비밀번호는 4자리 숫자입니다" },
        { status: 400 }
      );
    }

    // 사용자 찾기 (클라이언트명 + 연락처)
    const user = await prisma.user.findFirst({
      where: {
        clientName,
        phone: phone.replace(/-/g, ""),
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "등록된 정보를 찾을 수 없습니다" },
        { status: 401 }
      );
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다" },
        { status: 401 }
      );
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // JWT 토큰 생성
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      clientName: user.clientName,
      type: "user",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // 응답 생성 후 쿠키 설정
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clientName: user.clientName,
      },
    });

    // 쿠키를 응답 헤더에 직접 설정
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
