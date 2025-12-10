/**
 * 계약서 PDF 생성
 * TODO: 실제 PDF 생성 로직 구현 필요
 */

export interface ContractPDFData {
  contractNumber: string;
  companyName: string | null;
  ceoName: string | null;
  businessNumber: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  packageName: string;
  packageDisplayName: string;
  monthlyFee: number;
  contractPeriod: number;
  totalAmount: number;
  startDate: Date;
  endDate: Date;
  signedAt: Date;
  clientSignature?: string;
}

export async function generateContractPDF(data: ContractPDFData): Promise<Buffer> {
  // TODO: 실제 PDF 생성 로직 구현
  // 현재는 임시로 빈 PDF 반환
  throw new Error("PDF 생성 기능이 아직 구현되지 않았습니다.");
}
