"use client";

import { useState, useEffect } from "react";
import { FileSignature, Clock, CheckCircle, XCircle, Loader2, ArrowRight, Edit } from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  companyName: string | null;
  status: string;
  monthlyFee: number;
  contractPeriod: number;
  totalAmount: number;
  createdAt: string;
  package: {
    displayName: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: "작성 대기", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  SUBMITTED: { label: "승인 대기", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  APPROVED: { label: "승인 완료", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  ACTIVE: { label: "진행 중", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  REJECTED: { label: "거절됨", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  EXPIRED: { label: "만료", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-700" },
  CANCELLED: { label: "취소", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-700" },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contracts")
      .then((res) => res.json())
      .then((data) => {
        setContracts(data.contracts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount) + "원";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const pendingContract = contracts.find((c) => c.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">계약서 관리</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">계약 현황을 확인하고 관리하세요.</p>
      </div>

      {/* 작성 대기 중인 계약서 알림 */}
      {pendingContract && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center flex-shrink-0">
              <Edit className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800 dark:text-orange-300">
                작성 대기 중인 계약서가 있습니다
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                {pendingContract.package.displayName} 패키지 계약서를 작성해주세요.
              </p>
              <a
                href={`/dashboard/contracts/${pendingContract.id}`}
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
              >
                계약서 작성하기
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 계약서 목록 */}
      {contracts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileSignature className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            계약 내역이 없습니다
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            관리자가 계약서를 발송하면 이곳에서 확인하실 수 있습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.PENDING;
            const isPending = contract.status === "PENDING";

            return (
              <div
                key={contract.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* 아이콘 */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isPending ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                  }`}>
                    <FileSignature className={`w-6 h-6 ${
                      isPending ? "text-orange-600" : "text-blue-600"
                    }`} />
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-gray-500 dark:text-gray-400">
                          {contract.contractNumber}
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                          {contract.package.displayName}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatCurrency(contract.monthlyFee)}/월</span>
                      <span>{contract.contractPeriod}개월</span>
                      <span>총 {formatCurrency(contract.totalAmount)}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(contract.createdAt)}</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  {isPending && (
                    <a
                      href={`/dashboard/contracts/${contract.id}`}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      작성하기
                    </a>
                  )}

                  {contract.status === "SUBMITTED" && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      검토 중
                    </div>
                  )}

                  {contract.status === "APPROVED" && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      승인됨
                    </div>
                  )}

                  {contract.status === "REJECTED" && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <XCircle className="w-4 h-4" />
                      거절됨
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
