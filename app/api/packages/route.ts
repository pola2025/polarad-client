import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        displayName: true,
        price: true,
        description: true,
        features: true,
      },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error("패키지 조회 오류:", error);
    return NextResponse.json(
      { error: "패키지 정보를 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}
