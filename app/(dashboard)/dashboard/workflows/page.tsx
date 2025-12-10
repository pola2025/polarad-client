"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Package,
  Check,
  Edit3,
  Loader2,
  X,
} from "lucide-react";

interface WorkflowLog {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

interface Workflow {
  id: string;
  type: string;
  status: string;
  submittedAt: string | null;
  designStartedAt: string | null;
  designUploadedAt: string | null;
  orderRequestedAt: string | null;
  orderApprovedAt: string | null;
  completedAt: string | null;
  shippedAt: string | null;
  designUrl: string | null;
  finalUrl: string | null;
  courier: string | null;
  trackingNumber: string | null;
  revisionCount: number;
  revisionNote: string | null;
  adminNote: string | null;
  createdAt: string;
  logs: WorkflowLog[];
}

const WORKFLOW_TYPE_LABELS: Record<string, string> = {
  NAMECARD: "명함",
  NAMETAG: "명찰",
  CONTRACT: "계약서",
  ENVELOPE: "봉투",
  WEBSITE: "웹사이트",
  BLOG: "블로그",
  META_ADS: "메타 광고",
  NAVER_ADS: "네이버 광고",
};

const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  PENDING: "대기",
  SUBMITTED: "접수됨",
  IN_PROGRESS: "제작 중",
  DESIGN_UPLOADED: "디자인 완료",
  ORDER_REQUESTED: "주문 요청",
  ORDER_APPROVED: "주문 승인",
  COMPLETED: "완료",
  SHIPPED: "배송됨",
  CANCELLED: "취소됨",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  PENDING: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-600 dark:text-gray-400", icon: Clock },
  SUBMITTED: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", icon: FileText },
  IN_PROGRESS: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-600 dark:text-yellow-400", icon: Clock },
  DESIGN_UPLOADED: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", icon: FileText },
  ORDER_REQUESTED: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", icon: Package },
  ORDER_APPROVED: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", icon: CheckCircle },
  COMPLETED: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", icon: CheckCircle },
  SHIPPED: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", icon: Truck },
  CANCELLED: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", icon: AlertCircle },
};

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRevisionModal, setShowRevisionModal] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/user/workflows");
      const data = await res.json();
      if (data.success) {
        setWorkflows(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch workflows:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (workflowId: string) => {
    if (!confirm("시안을 승인하시겠습니까? 승인 후에는 발주가 진행됩니다.")) return;
    setActionLoading(workflowId);
    try {
      const res = await fetch(`/api/user/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchWorkflows();
      } else {
        alert(data.error || "처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Approve error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevisionRequest = async (workflowId: string) => {
    if (!revisionNote.trim()) {
      alert("수정 요청 내용을 입력해주세요.");
      return;
    }
    setActionLoading(workflowId);
    try {
      const res = await fetch(`/api/user/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revision", revisionNote: revisionNote.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowRevisionModal(null);
        setRevisionNote("");
        fetchWorkflows();
      } else {
        alert(data.error || "처리 중 오류가 발생했습니다.");
      }
    } catch (error) {
      console.error("Revision error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ko-KR", {
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

  if (workflows.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          진행 중인 제작 항목이 없습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          자료 제출 후 제작이 시작되면 여기에서 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 수정 요청 모달 */}
      {showRevisionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">수정 요청</h3>
              <button onClick={() => { setShowRevisionModal(null); setRevisionNote(""); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <textarea value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="수정이 필요한 부분을 자세히 설명해주세요..." className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowRevisionModal(null); setRevisionNote(""); }} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">취소</button>
              <button onClick={() => handleRevisionRequest(showRevisionModal)} disabled={actionLoading === showRevisionModal || !revisionNote.trim()} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading === showRevisionModal ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Edit3 className="w-4 h-4" />수정 요청</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">전체</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{workflows.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">진행 중</p>
          <p className="text-2xl font-bold text-yellow-600">
            {workflows.filter((w) => ["SUBMITTED", "IN_PROGRESS", "DESIGN_UPLOADED"].includes(w.status)).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">완료</p>
          <p className="text-2xl font-bold text-green-600">
            {workflows.filter((w) => ["COMPLETED", "SHIPPED"].includes(w.status)).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">대기</p>
          <p className="text-2xl font-bold text-gray-600">
            {workflows.filter((w) => w.status === "PENDING").length}
          </p>
        </div>
      </div>

      {/* 워크플로우 목록 */}
      <div className="space-y-3">
        {workflows.map((workflow) => {
          const statusStyle = STATUS_COLORS[workflow.status] || STATUS_COLORS.PENDING;
          const StatusIcon = statusStyle.icon;
          const isExpanded = expandedId === workflow.id;

          return (
            <div
              key={workflow.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* 헤더 */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusStyle.bg}`}>
                  <StatusIcon className={`w-5 h-5 ${statusStyle.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {WORKFLOW_TYPE_LABELS[workflow.type] || workflow.type}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(workflow.createdAt)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                  {WORKFLOW_STATUS_LABELS[workflow.status] || workflow.status}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {/* 상세 내용 */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="pt-4 space-y-4">
                    {/* 진행 상태 타임라인 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">접수</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(workflow.submittedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">디자인 시작</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(workflow.designStartedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">디자인 완료</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(workflow.designUploadedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">완료</p>
                        <p className="font-medium text-gray-900 dark:text-white">{formatDateTime(workflow.completedAt)}</p>
                      </div>
                    </div>

                    {/* 디자인/결과물 링크 */}
                    {(workflow.designUrl || workflow.finalUrl) && (
                      <div className="flex flex-wrap gap-3">
                        {workflow.designUrl && (
                          <a
                            href={workflow.designUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30"
                          >
                            <FileText className="w-4 h-4" />
                            디자인 확인
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {workflow.finalUrl && (
                          <a
                            href={workflow.finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          >
                            <ExternalLink className="w-4 h-4" />
                            결과물 확인
                          </a>
                        )}
                      </div>
                    )}

                    {/* 시안 승인/수정 요청 버튼 */}
                    {workflow.status === "DESIGN_UPLOADED" && (
                      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                          시안이 준비되었습니다. 확인 후 승인하거나 수정을 요청해주세요.
                          {workflow.revisionCount > 0 && <span className="ml-2 text-orange-600 dark:text-orange-400">(수정 {workflow.revisionCount}회)</span>}
                        </p>
                        <div className="flex gap-3">
                          <button onClick={() => handleApprove(workflow.id)} disabled={actionLoading === workflow.id} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {actionLoading === workflow.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" />시안 승인</>}
                          </button>
                          <button onClick={() => setShowRevisionModal(workflow.id)} disabled={actionLoading === workflow.id} className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            <Edit3 className="w-4 h-4" />수정 요청
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 수정 요청 내용 표시 */}
                    {workflow.revisionNote && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">수정 요청 내용:</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">{workflow.revisionNote}</p>
                      </div>
                    )}

                    {/* 배송 정보 */}
                    {workflow.courier && workflow.trackingNumber && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          <Truck className="w-4 h-4 inline mr-2" />
                          {workflow.courier}: {workflow.trackingNumber}
                        </p>
                      </div>
                    )}

                    {/* 메모 */}
                    {workflow.adminNote && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{workflow.adminNote}</p>
                      </div>
                    )}

                    {/* 히스토리 */}
                    {workflow.logs.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">진행 기록</p>
                        <div className="space-y-2">
                          {workflow.logs.map((log) => (
                            <div key={log.id} className="flex items-center gap-3 text-sm">
                              <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                              <span className="text-gray-500 dark:text-gray-400">
                                {formatDateTime(log.createdAt)}
                              </span>
                              <span className="text-gray-900 dark:text-white">
                                {WORKFLOW_STATUS_LABELS[log.toStatus] || log.toStatus}
                              </span>
                              {log.note && (
                                <span className="text-gray-500 dark:text-gray-400">- {log.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
