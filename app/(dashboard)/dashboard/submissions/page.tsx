"use client";

import { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Building,
  User,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Palette,
  Save,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface Submission {
  id: string;
  businessLicense: string | null;
  profilePhoto: string | null;
  brandName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  bankAccount: string | null;
  deliveryAddress: string | null;
  websiteStyle: string | null;
  websiteColor: string | null;
  blogDesignNote: string | null;
  additionalNote: string | null;
  status: string;
  isComplete: boolean;
}

export default function SubmissionsPage() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    businessLicense: "",
    profilePhoto: "",
    brandName: "",
    contactEmail: "",
    contactPhone: "",
    bankAccount: "",
    deliveryAddress: "",
    websiteStyle: "",
    websiteColor: "",
    blogDesignNote: "",
    additionalNote: "",
  });

  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      const res = await fetch("/api/submissions");
      const data = await res.json();
      if (data.submission) {
        setSubmission(data.submission);
        setFormData({
          businessLicense: data.submission.businessLicense || "",
          profilePhoto: data.submission.profilePhoto || "",
          brandName: data.submission.brandName || "",
          contactEmail: data.submission.contactEmail || "",
          contactPhone: data.submission.contactPhone || "",
          bankAccount: data.submission.bankAccount || "",
          deliveryAddress: data.submission.deliveryAddress || "",
          websiteStyle: data.submission.websiteStyle || "",
          websiteColor: data.submission.websiteColor || "",
          blogDesignNote: data.submission.blogDesignNote || "",
          additionalNote: data.submission.additionalNote || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch submission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "저장 실패");
      }

      setSubmission(data.submission);
      setMessage({ type: "success", text: data.message });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "저장 중 오류가 발생했습니다",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isComplete = !!(
    formData.businessLicense &&
    formData.profilePhoto &&
    formData.brandName &&
    formData.contactEmail &&
    formData.contactPhone &&
    formData.bankAccount
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 상태 표시 */}
      <div className={`p-4 rounded-xl flex items-center gap-3 ${
        submission?.isComplete
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
      }`}>
        {submission?.isComplete ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">자료 제출 완료</p>
              <p className="text-sm text-green-600 dark:text-green-400">모든 필수 자료가 제출되었습니다.</p>
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">자료 제출 필요</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">필수 자료를 모두 입력해주세요.</p>
            </div>
          </>
        )}
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === "success"
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            기본 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                사업자등록증 URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={formData.businessLicense}
                  onChange={(e) => handleChange("businessLicense", e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                프로필 사진 URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  value={formData.profilePhoto}
                  onChange={(e) => handleChange("profilePhoto", e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                브랜드명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.brandName}
                onChange={(e) => handleChange("brandName", e.target.value)}
                placeholder="브랜드명을 입력하세요"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 연락처 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            연락처 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                담당자 이메일 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                담당자 연락처 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange("contactPhone", e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                정산 계좌 정보 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.bankAccount}
                  onChange={(e) => handleChange("bankAccount", e.target.value)}
                  placeholder="은행명 / 계좌번호 / 예금주"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                배송 주소
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleChange("deliveryAddress", e.target.value)}
                  placeholder="배송받을 주소를 입력하세요"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 디자인 정보 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            디자인 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                웹사이트 스타일
              </label>
              <input
                type="text"
                value={formData.websiteStyle}
                onChange={(e) => handleChange("websiteStyle", e.target.value)}
                placeholder="선호하는 스타일 (모던, 클래식 등)"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                브랜드 컬러
              </label>
              <input
                type="text"
                value={formData.websiteColor}
                onChange={(e) => handleChange("websiteColor", e.target.value)}
                placeholder="주요 색상 (예: #3B82F6, 파란색)"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                블로그 디자인 요청사항
              </label>
              <textarea
                value={formData.blogDesignNote}
                onChange={(e) => handleChange("blogDesignNote", e.target.value)}
                placeholder="블로그 디자인에 대한 요청사항을 입력하세요"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        {/* 추가 요청사항 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            추가 요청사항
          </h3>
          <textarea
            value={formData.additionalNote}
            onChange={(e) => handleChange("additionalNote", e.target.value)}
            placeholder="기타 요청사항이 있으시면 입력해주세요"
            rows={4}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
              isComplete
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            } disabled:opacity-50`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isComplete ? "제출하기" : "임시저장"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
