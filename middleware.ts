import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'polarad-secret-key-change-in-production'
)

// 공개 경로 (인증 불필요)
const publicPaths = [
  '/login',
  '/signup',
]

// 정적 파일 패턴
const staticPatterns = [
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/robots.txt',
]

function isPublicPath(pathname: string): boolean {
  return publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
}

function isStaticPath(pathname: string): boolean {
  return staticPatterns.some(pattern => pathname.startsWith(pattern))
}

async function getTokenPayload(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log('[Middleware] Token valid, type:', (payload as { type?: string }).type)
    return payload as { type: string; userId: string }
  } catch (error) {
    console.log('[Middleware] Token verify failed:', error)
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 디버그 로그
  console.log('[Middleware]', pathname, 'Cookie:', request.cookies.get('auth-token')?.value?.substring(0, 20))

  // 1. 정적 파일 스킵
  if (isStaticPath(pathname)) {
    return NextResponse.next()
  }

  // 2. 공개 경로 체크
  if (isPublicPath(pathname)) {
    // 이미 로그인된 사용자가 로그인 페이지 접근 시 리다이렉트
    const token = await getTokenPayload(request)

    if (token && token.type === 'user' && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  }

  // 3. 토큰 검증
  const token = await getTokenPayload(request)

  // 4. 사용자 인증 체크
  if (pathname.startsWith('/dashboard')) {
    if (!token || token.type !== 'user') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  }

  // 5. API 경로는 세션 체크 없이 통과 (API 내부에서 처리)
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 6. 루트 경로 처리
  if (pathname === '/') {
    const token = await getTokenPayload(request)
    if (token && token.type === 'user') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 7. 기타 경로는 인증 필요
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
