# PRD: 자료제출 파일 업로드 시스템

## 개요

클라이언트 자료제출 시스템을 URL 입력 방식에서 파일 직접 업로드 방식으로 변경합니다.
민감정보(신분증, 통장사본, 사업자등록증)는 서버에 저장하지 않고 슬랙으로 직접 전송합니다.

## 현재 상태 (WIP)

### 완료된 작업

| 항목 | 파일 | 상태 |
|------|------|------|
| 슬랙 클라이언트 | `lib/slack/index.ts` | ✅ 완료 |
| 한글→로마자 변환 | `lib/utils/koreanToRoman.ts` | ✅ 완료 |
| R2 업로드 + WebP 압축 | `lib/r2.ts` | ✅ 완료 |
| 파일 업로드 API | `app/api/upload/route.ts` | ✅ 완료 |
| Submissions API | `app/api/submissions/route.ts` | ✅ 완료 |
| Submissions 페이지 UI | `app/(dashboard)/dashboard/submissions/page.tsx` | ✅ 완료 |
| 패키지 추가 | `package.json` | ✅ 완료 |

### 남은 작업

1. **환경변수 설정 (Vercel)**
2. **빌드 테스트**
3. **배포 및 테스트**
4. **버그 수정 (발생 시)**

---

## 환경변수 설정 (필수)

Vercel Dashboard → Settings → Environment Variables에 추가:

```env
# Slack (F:\startpackage\.env 참고)
SLACK_BOT_TOKEN=xoxb-xxx...
SLACK_ADMIN_EMAILS=mkt@polarad.co.kr,imagine20002@gmail.com

# Cloudflare R2 (F:\startpackage\.env 참고)
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=polarad-client-files
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**주의**: R2_PUBLIC_URL은 새 버킷 생성 후 Public URL 확인 필요

---

## 시스템 구조

### 파일 업로드 플로우

```
[클라이언트] → [/api/upload] → 파일 타입 확인
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            [민감정보 파일]                   [일반 파일]
                    ↓                               ↓
            WebP 압축                         WebP 압축
                    ↓                               ↓
            슬랙 직접 전송                    R2 업로드
            (서버 미저장)                          ↓
                    ↓                         슬랙에도 공유
            응답: { isSensitive: true }            ↓
                                            응답: { publicUrl }
```

### 민감정보 파일 종류

- `businessLicense` - 사업자등록증
- `idCard` - 신분증
- `bankBook` - 통장사본

### 슬랙 채널 생성 규칙

- 채널명: `polarad-YYYYMMDD-클라이언트명(로마자)`
- 예: `polarad-20251210-pollaseilseu`
- 관리자 자동 초대 (SLACK_ADMIN_EMAILS)

---

## 테스트 체크리스트

### 1. 파일 업로드 테스트

- [ ] 이미지 파일 업로드 → WebP 압축 확인
- [ ] PDF 파일 업로드 → 원본 유지 확인
- [ ] 10MB 초과 파일 → 에러 메시지 확인
- [ ] 허용되지 않는 파일 형식 → 에러 메시지 확인

### 2. 민감정보 테스트

- [ ] 사업자등록증 업로드 → 슬랙 전송 확인
- [ ] 신분증 업로드 → 슬랙 전송 확인
- [ ] 통장사본 업로드 → 슬랙 전송 확인
- [ ] R2에 저장되지 않음 확인

### 3. 슬랙 연동 테스트

- [ ] 첫 제출 시 채널 생성 확인
- [ ] 관리자 초대 확인
- [ ] 제출 정보 메시지 전송 확인
- [ ] 프로필 사진 파일 공유 확인

### 4. 전체 플로우 테스트

- [ ] 회원가입 → 로그인 → 자료제출 → 슬랙 확인

---

## 알려진 이슈

### 1. 민감정보 업로드 순서 문제

**문제**: 민감정보 파일 업로드 시 슬랙 채널이 아직 생성되지 않은 상태일 수 있음

**현재 동작**: "슬랙 채널이 생성되지 않았습니다" 에러 반환

**해결 방안 (선택)**:
1. 민감정보는 제출 완료 시점에 일괄 전송
2. 임시 채널 생성 후 민감정보 업로드 허용
3. 현재 동작 유지 (제출 후 민감정보 재업로드)

### 2. R2 버킷 설정

- 새 버킷 `polarad-client-files` 생성 필요
- Public Access 설정 필요
- CORS 설정 필요 (클라이언트 직접 업로드 시)

---

## 다음 세션 작업 순서

1. **환경변수 설정**
   - Vercel에 위 환경변수 추가
   - R2 버킷 생성 및 설정

2. **빌드 테스트**
   ```bash
   npm run build
   ```

3. **Push 및 배포**
   ```bash
   git push origin main
   ```

4. **테스트**
   - 프로덕션에서 자료제출 테스트
   - 슬랙 채널 및 파일 확인

5. **버그 수정** (발생 시)

---

## 참고 파일

- startpackage 슬랙 클라이언트: `F:\startpackage\lib\notification\slackClient.ts`
- startpackage 환경변수: `F:\startpackage\.env`
