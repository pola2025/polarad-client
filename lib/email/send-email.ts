// 이메일 발송 모듈 (스텁)
// TODO: 실제 이메일 서비스 연동 시 구현 필요

export async function sendContractRequestNotification(
  email: string,
  contractNumber: string,
  companyName: string
): Promise<void> {
  console.log(`[Email] 계약 접수 알림 발송: ${email}, 계약번호: ${contractNumber}, 회사명: ${companyName}`);
  // TODO: 실제 이메일 발송 로직 구현
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  console.log(`[Email] 발송 대상: ${to}, 제목: ${subject}`);
  // TODO: 실제 이메일 발송 로직 구현
}
