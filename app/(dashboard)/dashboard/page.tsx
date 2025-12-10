"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Package,
  ArrowRight,
  Upload,
} from "lucide-react";

interface DashboardData {
  user: {
    clientName: string;
    name: string;
  };
  submission: {
    status: string;
    isComplete: boolean;
    submittedAt: string | null;
    reviewedAt: string | null;
    progress: number;
  } | null;
  workflows: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  overallProgress: number;
  contract: {
    packageName: string;
    status: string;
  } | null;
}

const SUBMISSION_STATUS_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: "작성 중", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-700" },
  SUBMITTED: { label: "검토 대기", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  IN_REVIEW: { label: "검토 중", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  APPROVED: { label: "승인 완료", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 대시보드 데이터 가져오기
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      name: "전체 항목",
      value: data?.workflows.total || 0,
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      name: "완료",
      value: data?.workflows.completed || 0,
      icon: CheckCircle,
      color: "bg-green-500",
    },
    {
      name: "진행 중",
      value: data?.workflows.inProgress || 0,
      icon: Clock,
      color: "bg-yellow-500",
    },
    {
      name: "대기",
      value: data?.workflows.pending || 0,
      icon: AlertCircle,
      color: "bg-gray-500",
    },
  ];

  const submissionStatus = data?.submission?.status
    ? SUBMISSION_STATUS_LABELS[data.submission.status]
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome message with overall progress */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              안녕하세요, {data?.user?.clientName || "고객"}님!
            </h2>
            <p className="mt-1 text-blue-100">
              마케팅 패키지 진행 현황을 확인하세요.
            </p>
          </div>
          {(data?.workflows?.total ?? 0) > 0 && (
            <div className="text-right">
              <p className="text-sm text-blue-200">전체 진행률</p>
              <p className="text-3xl font-bold">{data?.overallProgress}%</p>
            </div>
          )}
        </div>
        {/* Progress bar */}
        {(data?.workflows?.total ?? 0) > 0 && (
          <div className="mt-4">
            <div className="h-2 bg-blue-800/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${data?.overallProgress ?? 0}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-blue-200">
              <span>{data?.workflows?.completed ?? 0}개 완료</span>
              <span>{data?.workflows?.total ?? 0}개 중</span>
            </div>
          </div>
        )}
      </div>

      {/* Submission Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            자료 제출 현황
          </h3>
          {submissionStatus && (
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${submissionStatus.bgColor} ${submissionStatus.color}`}>
              {submissionStatus.label}
            </span>
          )}
        </div>

        {data?.submission ? (
          <div className="space-y-4">
            {/* Submission Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">필수 자료 입력</span>
                <span className="font-medium text-gray-900 dark:text-white">{data.submission.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.submission.progress === 100 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${data.submission.progress}%` }}
                />
              </div>
            </div>

            {/* Status Steps */}
            <div className="flex items-center justify-between pt-4">
              {[
                { key: "DRAFT", label: "작성", icon: FileText },
                { key: "SUBMITTED", label: "제출", icon: Upload },
                { key: "IN_REVIEW", label: "검토", icon: Clock },
                { key: "APPROVED", label: "승인", icon: CheckCircle },
              ].map((step, index, arr) => {
                const statusOrder = ["DRAFT", "SUBMITTED", "IN_REVIEW", "APPROVED"];
                const currentIndex = statusOrder.indexOf(data.submission?.status || "DRAFT");
                const stepIndex = statusOrder.indexOf(step.key);
                const isCompleted = stepIndex < currentIndex;
                const isCurrent = stepIndex === currentIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`mt-2 text-xs ${isCurrent ? "font-medium text-blue-600" : "text-gray-500"}`}>
                        {step.label}
                      </span>
                    </div>
                    {index < arr.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            {data.submission.status !== "APPROVED" && (
              <a
                href="/dashboard/submissions"
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {data.submission.status === "DRAFT" ? "자료 제출하기" : "제출 내용 확인"}
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              아직 제출된 자료가 없습니다
            </p>
            <a
              href="/dashboard/submissions"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              자료 제출 시작
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>

      {/* Contract info */}
      {data?.contract && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                이용 중인 패키지
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {data.contract.packageName}
              </p>
            </div>
            <span className="ml-auto px-3 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              {data.contract.status === "ACTIVE" ? "진행 중" : data.contract.status}
            </span>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          빠른 메뉴
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/dashboard/submissions"
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900 dark:text-white">
              자료 제출하기
            </span>
          </a>
          <a
            href="/dashboard/workflows"
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-gray-900 dark:text-white">
              제작 현황 보기
            </span>
          </a>
          <a
            href="/dashboard/analytics"
            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900 dark:text-white">
              광고 성과 확인
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
