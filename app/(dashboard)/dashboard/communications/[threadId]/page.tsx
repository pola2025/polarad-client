"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Shield,
  Calendar,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  createdAt: string;
  expectedCompletionDate?: string;
}

interface Thread {
  id: string;
  title: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  expectedCompletionDate?: string;
  createdAt: string;
  messages: Message[];
}

const statusConfig = {
  OPEN: {
    label: "대기중",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: AlertCircle,
  },
  IN_PROGRESS: {
    label: "진행중",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Clock,
  },
  RESOLVED: {
    label: "완료",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: CheckCircle,
  },
};

export default function ThreadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThread();
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchThread = async () => {
    try {
      const res = await fetch(`/api/communications/${threadId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setThread(data.thread);
    } catch (error) {
      console.error("Failed to fetch thread:", error);
      router.push("/dashboard/communications");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const res = await fetch(`/api/communications/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setNewMessage("");
      fetchThread();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">스레드를 찾을 수 없습니다</p>
        <Link
          href="/dashboard/communications"
          className="text-blue-600 hover:text-blue-700 mt-4 inline-block"
        >
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isResolved = thread.status === "RESOLVED";

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex items-start gap-4">
          <Link
            href="/dashboard/communications"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[thread.status].color}`}
              >
                {statusConfig[thread.status].label}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {thread.category}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {thread.title}
            </h2>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>등록일: {formatShortDate(thread.createdAt)}</span>
              {thread.expectedCompletionDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  예상 완료: {formatShortDate(thread.expectedCompletionDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-4">
        {thread.messages.map((msg) => {
          const isAdmin = msg.authorType === "admin";
          return (
            <div
              key={msg.id}
              className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] ${
                  isAdmin
                    ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    : "bg-blue-600 text-white"
                } rounded-2xl px-4 py-3`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {isAdmin ? (
                    <Shield className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      isAdmin ? "text-gray-900 dark:text-white" : "text-white"
                    }`}
                  >
                    {msg.authorName}
                  </span>
                  <span
                    className={`text-xs ${
                      isAdmin ? "text-gray-500 dark:text-gray-400" : "text-blue-100"
                    }`}
                  >
                    {formatDate(msg.createdAt)}
                  </span>
                </div>
                <p
                  className={`whitespace-pre-wrap ${
                    isAdmin ? "text-gray-700 dark:text-gray-300" : "text-white"
                  }`}
                >
                  {msg.content}
                </p>
                {msg.expectedCompletionDate && (
                  <div
                    className={`mt-2 pt-2 border-t ${
                      isAdmin
                        ? "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        : "border-blue-500 text-blue-100"
                    } text-xs flex items-center gap-1`}
                  >
                    <Calendar className="w-3 h-3" />
                    예상 완료일: {formatShortDate(msg.expectedCompletionDate)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      {!isResolved ? (
        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="메시지를 입력하세요..."
              rows={2}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors self-end"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">
            이 문의는 완료되었습니다
          </p>
        </div>
      )}
    </div>
  );
}
