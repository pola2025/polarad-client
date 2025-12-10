/**
 * Prisma Client 인스턴스
 *
 * 프로젝트 구조:
 * - 독립 프로젝트 (모노레포 아님)
 * - packages/database: Prisma 스키마 및 클라이언트 설정
 * - packages/lib: 유틸리티 함수 (email, telegram, pdf 등)
 *
 * Import 방법:
 * - prisma: import { prisma } from "@/lib/prisma"
 * - types: import { WorkflowType, User } from "@prisma/client"
 *
 * 참고: @polarad/database, @polarad/lib는 tsconfig.json의 paths로 매핑된 내부 패키지
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
