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
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  authorType: string;
  authorName: string;
  content: string;
  attachments?: string[];
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
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name}: 파일 크기는 10MB를 초과할 수 없습니다`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("fileType", "communication");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "업로드 실패");
        }

        setAttachments((prev) => [...prev, { name: file.name, url: data.publicUrl }]);
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("파일 업로드에 실패했습니다");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 첨부파일 제거
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;

    setSending(true);

    try {
      const res = await fetch(`/api/communications/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          attachments: attachments.map((a) => a.url),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setNewMessage("");
      setAttachments([]);
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
                {msg.content && (
                  <p
                    className={`whitespace-pre-wrap ${
                      isAdmin ? "text-gray-700 dark:text-gray-300" : "text-white"
                    }`}
                  >
                    {msg.content}
                  </p>
                )}
                {/* 첨부파일 표시 */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className={`mt-2 space-y-1 ${msg.content ? "pt-2 border-t" : ""} ${
                    isAdmin ? "border-gray-200 dark:border-gray-600" : "border-blue-500"
                  }`}>
                    {msg.attachments.map((url, i) => {
                      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                      return (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-sm ${
                            isAdmin
                              ? "text-blue-600 hover:text-blue-700"
                              : "text-blue-100 hover:text-white"
                          }`}
                        >
                          {isImage ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          첨부파일 {i + 1}
                        </a>
                      );
                    })}
                  </div>
                )}
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
          {/* 첨부파일 목록 */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                >
                  <Paperclip className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300 max-w-[150px] truncate">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {/* 파일 첨부 버튼 */}
            <label className={`p-2 rounded-lg cursor-pointer transition-colors self-end ${
              uploading ? "bg-gray-200 dark:bg-gray-600" : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}>
              {uploading ? (
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5 text-gray-500" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                accept="image/*,.pdf"
                className="hidden"
              />
            </label>
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
              disabled={(!newMessage.trim() && attachments.length === 0) || sending}
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
