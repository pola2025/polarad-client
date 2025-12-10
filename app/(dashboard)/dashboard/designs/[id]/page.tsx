"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  RefreshCw,
  Eye,
  Send,
  MessageSquare,
  User,
  UserCog,
  Clock,
} from "lucide-react";

interface DesignFeedback {
  id: string;
  versionId: string;
  authorId: string;
  authorType: "user" | "admin";
  authorName: string;
  content: string;
  createdAt: string;
}

interface DesignVersion {
  id: string;
  designId: string;
  version: number;
  url: string;
  note: string | null;
  uploadedBy: string;
  createdAt: string;
  feedbacks: DesignFeedback[];
}

interface Design {
  id: string;
  workflowId: string;
  status: "PENDING_REVIEW" | "REVISION_REQUESTED" | "APPROVED";
  currentVersion: number;
  approvedAt: string | null;
  approvedVersion: number | null;
  createdAt: string;
  updatedAt: string;
  workflow: {
    id: string;
    type: string;
    status: string;
    userId: string;
  };
  versions: DesignVersion[];
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

export default function DesignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 피드백/수정요청
  const [feedbackContent, setFeedbackContent] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  // 메시지
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchDesign = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/designs/${id}`);
      const data = await res.json();

      if (data.success) {
        setDesign(data.design);
      } else {
        alert(data.error || "시안을 불러올 수 없습니다.");
        router.push("/dashboard/designs");
      }
    } catch (error) {
      console.error("Fetch design error:", error);
      alert("시안을 불러오는 중 오류가 발생했습니다.");
      router.push("/dashboard/designs");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchDesign();
    }
  }, [id, fetchDesign]);

  const handleAction = async (action: "approve" | "request_revision" | "feedback", content?: string) => {
    if ((action === "request_revision" || action === "feedback") && !content?.trim()) {
      setMessage({ type: "error", text: "내용을 입력해주세요" });
      return;
    }

    if (action === "approve") {
      if (!confirm("시안을 확정하시겠습니까?\n확정 후에는 제작이 진행됩니다.")) {
        return;
      }
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/designs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "처리에 실패했습니다");
      }

      setMessage({ type: "success", text: data.message });
      setFeedbackContent("");
      setShowRevisionForm(false);
      await fetchDesign();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">시안을 찾을 수 없습니다.</p>
        <Link
          href="/dashboard/designs"
          className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const currentVersion = design.versions[0];
  const typeKorean = WORKFLOW_TYPE_KOREAN[design.workflow.type] || design.workflow.type;
  const config = statusConfig[design.status];
  const StatusIcon = config.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/designs"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {typeKorean} 시안
              </h2>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${config.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              현재 버전: v{design.currentVersion}
              {design.approvedVersion && (
                <span className="text-green-600 ml-2">
                  (v{design.approvedVersion} 확정됨)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-xl ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 현재 시안 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">
          현재 시안 (v{design.currentVersion})
        </h3>

        {currentVersion ? (
          <>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 flex flex-col items-center gap-4 mb-6">
              <a
                href={currentVersion.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-lg font-medium"
              >
                <ExternalLink className="w-5 h-5" />
                시안 확인하기 (새 탭에서 열기)
              </a>
              {currentVersion.note && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  {currentVersion.note}
                </p>
              )}
            </div>

            {/* 액션 버튼 */}
            {design.status !== "APPROVED" && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  시안 확정
                </button>
                <button
                  onClick={() => setShowRevisionForm(!showRevisionForm)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  수정 요청
                </button>
              </div>
            )}

            {/* 수정 요청 폼 */}
            {showRevisionForm && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <textarea
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  placeholder="수정이 필요한 부분을 상세히 작성해주세요"
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    onClick={() => {
                      setShowRevisionForm(false);
                      setFeedbackContent("");
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleAction("request_revision", feedbackContent)}
                    disabled={actionLoading || !feedbackContent.trim()}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    요청 전송
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">시안 버전이 없습니다.</p>
        )}
      </div>

      {/* 버전 히스토리 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          버전 히스토리
        </h3>
        <div className="space-y-3">
          {design.versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-3 rounded-lg ${
                index === 0
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    v{version.version}
                    {index === 0 && (
                      <span className="text-xs text-blue-600 ml-1">(현재)</span>
                    )}
                  </span>
                  {design.approvedVersion === version.version && (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                      확정
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(version.createdAt)}
                </span>
              </div>
              {version.note && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {version.note}
                </p>
              )}
              <a
                href={version.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                시안 보기
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* 피드백 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          피드백
        </h3>

        {/* 피드백 목록 */}
        <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
          {design.versions.flatMap((version) =>
            version.feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className={`p-4 rounded-lg ${
                  feedback.authorType === "user"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400"
                    : "bg-gray-50 dark:bg-gray-700 border-l-4 border-gray-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {feedback.authorType === "user" ? (
                    <User className="w-4 h-4 text-blue-600" />
                  ) : (
                    <UserCog className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {feedback.authorType === "user" ? "나" : "관리자"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                    v{version.version} · {formatDate(feedback.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.content}
                </p>
              </div>
            ))
          )}
          {design.versions.every((v) => v.feedbacks.length === 0) && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              아직 피드백이 없습니다
            </p>
          )}
        </div>

        {/* 피드백 입력 */}
        {design.status !== "APPROVED" && !showRevisionForm && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="피드백을 입력하세요..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && feedbackContent.trim()) {
                    e.preventDefault();
                    handleAction("feedback", feedbackContent);
                  }
                }}
              />
              <button
                onClick={() => handleAction("feedback", feedbackContent)}
                disabled={actionLoading || !feedbackContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
