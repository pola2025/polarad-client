"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSignature,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Hash,
  Package,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  companyName: string | null;
  ceoName: string | null;
  businessNumber: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  monthlyFee: number;
  setupFee: number;
  contractPeriod: number;
  totalAmount: number;
  additionalNotes: string | null;
  isPromotion: boolean;
  package: {
    displayName: string;
    features: string[];
  };
}

interface FormData {
  companyName: string;
  ceoName: string;
  businessNumber: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export default function ContractWritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    ceoName: "",
    businessNumber: "",
    address: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(true);
  const [termsAgreed, setTermsAgreed] = useState(false);

  useEffect(() => {
    fetch(`/api/contracts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContract(data.contract);
          // 기존 데이터가 있으면 폼에 채우기
          if (data.contract) {
            setFormData({
              companyName: data.contract.companyName || "",
              ceoName: data.contract.ceoName || "",
              businessNumber: data.contract.businessNumber || "",
              address: data.contract.address || "",
              contactName: data.contract.contactName || "",
              contactPhone: data.contract.contactPhone || "",
              contactEmail: data.contract.contactEmail || "",
            });
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("계약서를 불러올 수 없습니다");
        setLoading(false);
      });
  }, [id]);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [contract]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 서명 관련 함수들
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const startDrawing = (pos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (pos: { x: number; y: number }) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAgreed) {
      alert("계약 조항을 확인하고 동의해주세요.");
      return;
    }

    if (!hasSignature) {
      alert("서명을 해주세요.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signature = canvas.toDataURL("image/png");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          clientSignature: signature,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "제출 실패");
      }

      alert(data.message || "계약서가 제출되었습니다.");
      router.push("/dashboard/contracts");
    } catch (err) {
      alert(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-700 dark:text-red-300">{error || "계약서를 찾을 수 없습니다"}</p>
        <Link
          href="/dashboard/contracts"
          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  if (contract.status !== "PENDING") {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/contracts"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Link>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
            이미 제출된 계약서입니다
          </h3>
          <p className="text-blue-700 dark:text-blue-400 mt-2">
            계약서 번호: {contract.contractNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/contracts"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        목록으로 돌아가기
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">온라인 서비스 계약서</h1>
              <p className="text-blue-100 text-sm mt-0.5">
                계약번호: {contract.contractNumber}
              </p>
            </div>
          </div>
        </div>

        {/* 계약 정보 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            계약 내용
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">패키지</p>
              <p className="font-medium text-gray-900 dark:text-white">{contract.package.displayName}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">계약 기간</p>
              <p className="font-medium text-gray-900 dark:text-white">{contract.contractPeriod}개월</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">패키지 비용</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.monthlyFee)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">총 금액</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(contract.totalAmount)}</p>
            </div>
          </div>

          {contract.package.features && contract.package.features.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">포함 서비스</p>
              <ul className="space-y-1">
                {contract.package.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {feature.includes('호스팅') && feature.includes('무료')
                      ? `${feature} *기본 트래픽 내, 9조 3항 참고`
                      : feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contract.additionalNotes && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>추가 사항:</strong> {contract.additionalNotes}
              </p>
            </div>
          )}
        </div>

        {/* 계약 조항 전문 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setTermsExpanded(!termsExpanded)}
            className="w-full flex items-center justify-between font-semibold text-gray-900 dark:text-white"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              계약 조항 전문 (필수 확인)
            </span>
            {termsExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {termsExpanded && (
            <div className="mt-4 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300 space-y-6">
              {/* 제3조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제3조 서비스 내용 및 범위</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>을은 갑에게 선택한 패키지에 포함된 약정된 서비스 제작 및 광고관리지원을 제공한다.</li>
                  <li>서비스의 구체적인 내용은 별첨 서비스 명세서에 따른다.</li>
                  <li>광고 집행에 필요한 광고비는 갑이 직접 결제하며, 을은 광고 설정 및 리포트 등 제반 서비스를 제공한다.</li>
                  <li>주요 광고 서비스는 Meta(Facebook, Instagram) 플랫폼을 중심으로 제공하며, 기타 플랫폼은 상호 협의 하에 제공 여부를 결정한다.</li>
                  <li>광고 소재(광고문구, 영상, 이미지 등)의 제작은 본 서비스에 포함되지 않으며, 갑이 직접 제작하여 을에게 제공해야 한다.</li>
                  <li>갑이 광고 소재를 제공하지 않을 경우 광고 집행이 불가하며, 이로 인한 지연에 대해 을은 책임지지 않는다.</li>
                </ol>
              </div>

              {/* 제4조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제4조 비용 및 결제</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>갑은 계약 체결 시 총 계약 금액을 선금으로 결제해야 하며, 결제 완료 후 서비스가 착수된다.</li>
                  <li>결제가 완료되지 않은 경우 서비스 제공이 개시되지 않는다.</li>
                  <li>세금계산서는 결제 완료 후 익월 10일 이내에 발행된다.</li>
                </ol>
              </div>

              {/* 제5조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제5조 계약의 해지</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>갑이 계약 기간 중 해지를 원할 경우, 최소 30일 전에 서면으로 통보해야 한다.</li>
                  <li>중도 해지 시 위약금이 발생할 수 있다.</li>
                  <li>을의 귀책사유로 서비스가 중단될 경우, 해당 기간만큼 서비스 기간을 연장한다.</li>
                </ol>
              </div>

              {/* 제6조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제6조 제작 진행 및 협조 의무</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>갑은 계약 체결 후 제작에 필요한 자료(로고, 이미지, 텍스트 등)를 30일 이내에 을에게 제공해야 한다.</li>
                  <li>갑이 자료를 30일 이내에 제공하지 않을 경우, 을은 별도 통보 없이 계약을 해지할 수 있으며, 이 경우 기납입된 금액은 반환하지 않는다.</li>
                  <li>시안에 대한 피드백은 시안 전달일로부터 3영업일 이내에 제공해야 한다. 기한 내 피드백이 없을 경우 시안이 승인된 것으로 간주한다.</li>
                  <li>기본 수정 횟수는 3회로 제한되며, 초과 수정 시 회당 50,000원의 추가 비용이 발생한다.</li>
                  <li>수정 범위는 기존 시안의 부분 수정에 한하며, 전면 재시작 수준의 수정은 별도 견적이 필요하다.</li>
                </ol>
              </div>

              {/* 제7조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제7조 환불 규정</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>모든 제작물 제작 전 해지 시: 납입 금액의 <strong>100% 환불</strong></li>
                  <li>디자인(인쇄물) 제작 완료 후 해지 시: 납입 금액의 <strong>40% 환불</strong> (인쇄물 제작 완료 후, 홈페이지 제작 중 해지 시 홈페이지 제작은 중단됩니다.)</li>
                  <li>모든 제작물 완료 후 해지 시: <strong>환불 불가</strong> (서비스 용역이 모두 제공된 것으로 간주)</li>
                  <li>환불 시 제작된 홈페이지는 즉시 사용이 중단된다.</li>
                  <li>환불 시 광고지원 서비스는 모두 중단된다.</li>
                  <li>갑의 자료 미제공, 연락 두절 등 갑의 귀책사유로 인한 진행 불가 시: <strong>환불 불가</strong></li>
                  <li>환불 신청은 서면(이메일 포함)으로만 접수되며, 환불은 신청일로부터 7영업일 이내에 처리된다.</li>
                </ol>
              </div>

              {/* 제8조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제8조 면책 및 책임의 제한</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>갑이 제공한 자료(이미지, 텍스트, 상표 등)로 인해 발생하는 저작권, 초상권, 상표권 등 제3자와의 분쟁에 대해 을은 책임을 지지 않으며, 갑이 전적으로 책임진다.</li>
                  <li>을이 직접 제작하거나 제공한 자료(이미지, 폰트, 템플릿 등)로 인해 발생하는 저작권 등 제3자와의 분쟁에 대해서는 을이 책임진다.</li>
                  <li>갑의 요청에 따라 제작된 콘텐츠가 관계 법령에 위반될 경우, 그에 따른 법적 책임은 갑에게 있다.</li>
                  <li>천재지변, 시스템 장애, 외부 플랫폼(Google, Meta 등)의 정책 변경 등 을이 통제할 수 없는 사유로 인한 서비스 중단 또는 손해에 대해 을은 책임을 지지 않는다.</li>
                  <li>광고 성과는 시장 상황, 경쟁 환경, 상품 특성 등에 따라 달라질 수 있으며, 을은 특정 성과를 보장하지 않는다.</li>
                </ol>
              </div>

              {/* 제9조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제9조 유지 비용 및 추가 비용</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>웹사이트 제작 서비스를 이용하는 경우, <strong>{contract.isPromotion ? '계약일로부터 2년간' : '계약일로부터 1년간'}</strong> 도메인 및 호스팅이 무료로 제공된다.</li>
                  <li>호스팅 트래픽이 월 100GB를 초과하는 경우, 초과 트래픽에 대해 별도 비용이 청구될 수 있다. (계약 기간 중에도 동일하게 적용) 단, 트래픽 기본 사용량 정책은 서비스 제공사(Vercel)의 정책에 따라 변동될 수 있다.</li>
                  <li>Meta 광고 연동 서비스(광고 자동화, 알림, 대시보드 등)는 <strong>{contract.isPromotion ? '계약일로부터 2년간' : '계약일로부터 1년간'}</strong> 무료로 제공된다. 단, 광고 소재 제작은 포함되지 않는다.</li>
                  <li>Meta 광고 연동 서비스 무료 기간 종료 후 계속 이용 시 <strong>200,000원/월 (부가세 별도), 3개월 단위 결제</strong>가 필요하다.</li>
                  <li>유지비용 미납 시 서비스가 중단될 수 있으며, 중단 후 30일 경과 시 데이터가 삭제될 수 있다.</li>
                  <li>갑은 계약 종료 전 데이터 백업을 요청할 수 있으며, 을은 합리적인 범위 내에서 협조한다.</li>
                </ol>
              </div>

              {/* 제10조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제10조 지식재산권</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>을이 제작한 결과물의 저작권은 최종 대금 완납 시 갑에게 양도된다.</li>
                  <li>대금 완납 전까지 결과물의 저작권은 을에게 귀속된다.</li>
                </ol>
              </div>

              {/* 제11조 */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">제11조 분쟁 해결</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>본 계약과 관련하여 분쟁이 발생할 경우, 양 당사자는 상호 협의하여 원만히 해결하도록 노력한다.</li>
                  <li>협의가 이루어지지 않을 경우, 을의 주소지 관할 법원을 전속관할로 한다.</li>
                </ol>
              </div>
            </div>
          )}

          {/* 약관 동의 체크박스 */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="text-blue-700 dark:text-blue-400">위 계약 조항을 모두 읽었으며, 이에 동의합니다.</strong>
                <br />
                <span className="text-gray-500 dark:text-gray-400">
                  계약 조항에 동의하셔야 서명 및 계약서 제출이 가능합니다.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* 계약자 정보 입력 폼 */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              계약자 정보
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  회사명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                    placeholder="주식회사 예시"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  대표자명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="ceoName"
                    value={formData.ceoName}
                    onChange={handleInputChange}
                    required
                    placeholder="홍길동"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사업자등록번호 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="businessNumber"
                    value={formData.businessNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="123-45-67890"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  사업장 주소 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="서울시 강남구 테헤란로 123"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pt-4">
              <User className="w-5 h-5 text-blue-600" />
              담당자 정보
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  담당자명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    required
                    placeholder="김담당"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    required
                    placeholder="010-1234-5678"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="example@company.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 서명 영역 */}
            <div className="pt-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <FileSignature className="w-5 h-5 text-blue-600" />
                서명 <span className="text-red-500">*</span>
              </h2>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full max-w-md mx-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white cursor-crosshair touch-none"
                  onMouseDown={(e) => startDrawing(getMousePos(e))}
                  onMouseMove={(e) => draw(getMousePos(e))}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    startDrawing(getTouchPos(e));
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    draw(getTouchPos(e));
                  }}
                  onTouchEnd={stopDrawing}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    위 영역에 서명해 주세요
                  </p>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    지우기
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/contracts"
                className="flex-1 px-4 py-3 text-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={submitting || !termsAgreed}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    제출 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    계약서 제출
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
