"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Palette,
  Clock,
  CheckCircle,
  RefreshCw,
  Eye,
  ChevronRight,
} from "lucide-react";

interface Design {
  id: string;
  workflowId: string;
  status: "PENDING_REVIEW" | "REVISION_REQUESTED" | "APPROVED";
  currentVersion: number;
  approvedAt: string | null;
  approvedVersion: number | null;
  createdAt: string;
  updatedAt: string;
  hasUnreadAdminFeedback: boolean;
  workflow: {
    id: string;
    type: string;
    status: string;
  };
  versions: {
    id: string;
    version: number;
    url: string;
    note: string | null;
    createdAt: string;
    feedbacks: {
      id: string;
      content: string;
      authorType: string;
      authorName: string;
      createdAt: string;
    }[];
  }[];
}

const WORKFLOW_TYPE_KOREAN: Record<string, string> = {
  NAMECARD: "명함",
  NAMETAG: "명찰",
  CONTRACT: "계약서",
  ENVELOPE: "대봉투",
  WEBSITE: "홈페이지",
  BLOG: "블로그",
  META_ADS: "메타광고",
  NAVER_ADS: "네이버광고",
};

const statusConfig = {
  PENDING_REVIEW: {
    label: "확인 대기",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: Eye,
  },
  REVISION_REQUESTED: {
    label: "수정 요청",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    icon: RefreshCw,
  },
  APPROVED: {
    label: "확정",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
};

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const res = await fetch("/api/designs");
      const data = await res.json();
      if (data.success) {
        setDesigns(data.designs);
      }
    } catch (error) {
      console.error("Failed to fetch designs:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "어제";
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 상태별 그룹핑
  const pendingDesigns = designs.filter(d => d.status === "PENDING_REVIEW");
  const revisionDesigns = designs.filter(d => d.status === "REVISION_REQUESTED");
  const approvedDesigns = designs.filter(d => d.status === "APPROVED");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">내 시안 관리</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          업로드된 시안을 확인하고 피드백을 남겨주세요
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">확인 대기</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            {pendingDesigns.length}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-300">수정 요청</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {revisionDesigns.length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">확정</span>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
            {approvedDesigns.length}
          </p>
        </div>
      </div>

      {/* 시안 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {designs.length === 0 ? (
          <div className="p-12 text-center">
            <Palette className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">아직 업로드된 시안이 없습니다</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              시안이 업로드되면 알림을 보내드릴게요
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {designs.map((design) => {
              const config = statusConfig[design.status];
              const StatusIcon = config.icon;
              const latestVersion = design.versions[0];
              const typeKorean = WORKFLOW_TYPE_KOREAN[design.workflow.type] || design.workflow.type;

              return (
                <li key={design.id}>
                  <Link
                    href={`/dashboard/designs/${design.id}`}
                    className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Palette className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0 ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${config.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                        {design.hasUnreadAdminFeedback && (
                          <span className="w-2 h-2 bg-blue-600 rounded-full" title="새 피드백" />
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {typeKorean}
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          v{design.currentVersion}
                        </span>
                      </h3>
                      {latestVersion?.feedbacks[0] && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                          {latestVersion.feedbacks[0].authorType === "admin" ? "관리자: " : ""}
                          {latestVersion.feedbacks[0].content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(design.updatedAt)}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
