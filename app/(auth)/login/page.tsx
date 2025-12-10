"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LogIn } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(justRegistered);

  const [formData, setFormData] = useState({
    clientName: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    if (justRegistered) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [justRegistered]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 유효성 검사
    if (!formData.clientName) {
      setError("클라이언트명을 입력해주세요");
      setIsLoading(false);
      return;
    }
    if (!formData.phone) {
      setError("연락처를 입력해주세요");
      setIsLoading(false);
      return;
    }
    if (!formData.password || formData.password.length !== 4) {
      setError("4자리 비밀번호를 입력해주세요");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientName: formData.clientName,
          phone: formData.phone.replace(/-/g, ""),
          password: formData.password,
        }),
      });

      const data = await response.json();
      console.log("Login response:", response.status, data);

      if (!response.ok) {
        throw new Error(data.error || "로그인에 실패했습니다");
      }

      // 성공 시 대시보드로 이동 (전체 페이지 새로고침으로 쿠키 반영)
      console.log("Login success, redirecting to /dashboard...");
      window.location.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Polarad
            </span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            마케팅 패키지 로그인
          </p>
        </div>

        {/* 회원가입 완료 메시지 */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                회원가입이 완료되었습니다
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                가입 정보로 로그인해주세요
              </p>
            </div>
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 에러 메시지 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* 클라이언트명 */}
            <div>
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                클라이언트명 (업체명)
              </label>
              <input
                id="clientName"
                type="text"
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
                placeholder="예: 폴라세일즈"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                연락처
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                비밀번호 (4자리 숫자)
              </label>
              <input
                id="password"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인
                </>
              )}
            </button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          아직 계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
