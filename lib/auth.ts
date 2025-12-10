import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "polarad-secret-key-change-in-production"
);

// 사용자 JWT 페이로드
export interface UserJWTPayload {
  userId: string;
  email: string;
  name: string;
  clientName: string;
  type: "user";
}

// 현재 사용자 세션 가져오기
export async function getCurrentUser(): Promise<UserJWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    // user 타입만 허용
    if ((payload as { type?: string }).type !== "user") {
      return null;
    }

    return payload as unknown as UserJWTPayload;
  } catch {
    return null;
  }
}

// 사용자 인증 필수
export async function requireUser(): Promise<UserJWTPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}
