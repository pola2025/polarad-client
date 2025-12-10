"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Shield,
  X,
  Image,
  ExternalLink,
  Globe,
} from "lucide-react";

// 웹사이트 스타일 옵션 (startpackage에서 가져옴)
const WEBSITE_STYLES = [
  { url: "https://financialhealing.imweb.me/", name: "스타일 1" },
  { url: "https://mjgood.imweb.me/", name: "스타일 2" },
  { url: "https://jmbiz.imweb.me/", name: "스타일 3" },
  { url: "https://ksupport-center.imweb.me/", name: "스타일 4" },
  { url: "https://dkcenter.imweb.me/", name: "스타일 5" },
  { url: "https://fpbiz.imweb.me/", name: "스타일 6" },
];

interface Submission {
  id: string;
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
  slackChannelId: string | null;
}

interface UploadedFile {
  name: string;
  uploaded: boolean;
  url?: string;
  isSensitive?: boolean;
}

// 민감정보 파일 타입
const SENSITIVE_FILE_TYPES = ["businessLicense", "idCard", "bankBook"];

export default function SubmissionsPage() {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [styleDialogOpen, setStyleDialogOpen] = useState<string | null>(null);
  const colorSectionRef = useRef<HTMLDivElement>(null);

  // 파일 업로드 상태
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({
    businessLicense: { name: "", uploaded: false, isSensitive: true },
    idCard: { name: "", uploaded: false, isSensitive: true },
    bankBook: { name: "", uploaded: false, isSensitive: true },
    profilePhoto: { name: "", uploaded: false },
    blogDesignRef: { name: "", uploaded: false }, // 블로그 참고디자인
  });

  // 계좌 정보 분리
  const [bankInfo, setBankInfo] = useState({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });

  const [formData, setFormData] = useState({
    profilePhoto: "",
    brandName: "",
    contactEmail: "",
    contactPhone: "",
    bankAccount: "",
    deliveryAddress: "",
    websiteStyle: "",
    websiteColor: "#3B82F6",
    blogDesignNote: "", // 이제 파일 URL 저장
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
          profilePhoto: data.submission.profilePhoto || "",
          brandName: data.submission.brandName || "",
          contactEmail: data.submission.contactEmail || "",
          contactPhone: data.submission.contactPhone || "",
          bankAccount: data.submission.bankAccount || "",
          deliveryAddress: data.submission.deliveryAddress || "",
          websiteStyle: data.submission.websiteStyle || "",
          websiteColor: data.submission.websiteColor || "#3B82F6",
          blogDesignNote: data.submission.blogDesignNote || "",
          additionalNote: data.submission.additionalNote || "",
        });
        // 계좌 정보 파싱 (은행명 / 계좌번호 / 예금주 형식)
        if (data.submission.bankAccount) {
          const parts = data.submission.bankAccount.split(" / ");
          if (parts.length === 3) {
            setBankInfo({
              bankName: parts[0] || "",
              accountNumber: parts[1] || "",
              accountHolder: parts[2] || "",
            });
          }
        }
        // 이미 업로드된 프로필 사진 상태 복원
        if (data.submission.profilePhoto) {
          setUploadedFiles(prev => ({
            ...prev,
            profilePhoto: { name: "프로필사진", uploaded: true, url: data.submission.profilePhoto },
          }));
        }
        // 블로그 참고디자인 복원
        if (data.submission.blogDesignNote) {
          setUploadedFiles(prev => ({
            ...prev,
            blogDesignRef: { name: "참고디자인", uploaded: true, url: data.submission.blogDesignNote },
          }));
        }
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

  // 파일 업로드 핸들러
  const handleFileUpload = useCallback(async (
    file: File,
    fileType: string,
    title: string
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);
    formData.append("title", title);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "업로드 실패");
      }

      setUploadedFiles(prev => ({
        ...prev,
        [fileType]: {
          name: file.name,
          uploaded: true,
          url: data.publicUrl,
          isSensitive: data.isSensitive,
        },
      }));

      // 일반 파일인 경우 URL 저장
      if (!data.isSensitive && data.publicUrl) {
        // blogDesignRef는 blogDesignNote에 저장
        const fieldName = fileType === "blogDesignRef" ? "blogDesignNote" : fileType;
        setFormData(prev => ({ ...prev, [fieldName]: data.publicUrl }));
      }

      return true;
    } catch (error) {
      console.error(`파일 업로드 실패 (${fileType}):`, error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "파일 업로드에 실패했습니다",
      });
      return false;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // 민감정보 파일들이 모두 업로드되었는지 확인
    const sensitiveFilesUploaded = SENSITIVE_FILE_TYPES.every(
      type => uploadedFiles[type]?.uploaded
    );

    // 계좌 정보 합치기
    const bankAccount = bankInfo.bankName && bankInfo.accountNumber && bankInfo.accountHolder
      ? `${bankInfo.bankName} / ${bankInfo.accountNumber} / ${bankInfo.accountHolder}`
      : "";

    try {
      const res = await fetch("/api/submissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          bankAccount,
          sensitiveFilesUploaded,
        }),
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

  // 파일 입력 컴포넌트
  const FileUploadField = ({
    label,
    fileType,
    required,
    isSensitive,
  }: {
    label: string;
    fileType: string;
    required?: boolean;
    isSensitive?: boolean;
  }) => {
    const [uploading, setUploading] = useState(false);
    const fileState = uploadedFiles[fileType];

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      await handleFileUpload(file, fileType, label);
      setUploading(false);
    };

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
          {isSensitive && (
            <span className="ml-2 inline-flex items-center text-xs text-amber-600 dark:text-amber-400">
              <Shield className="w-3 h-3 mr-1" />
              서버 미저장
            </span>
          )}
        </label>
        <div className="relative">
          {fileState?.uploaded ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300 truncate flex-1">
                {fileState.name}
              </span>
              {isSensitive && (
                <span className="text-xs text-green-600 dark:text-green-400">슬랙 전송 완료</span>
              )}
              <button
                type="button"
                onClick={() => setUploadedFiles(prev => ({
                  ...prev,
                  [fileType]: { name: "", uploaded: false, isSensitive },
                }))}
                className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {uploading ? "업로드 중..." : "파일을 선택하세요 (jpg, png, pdf)"}
              </span>
            </label>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sensitiveFilesComplete = SENSITIVE_FILE_TYPES.every(
    type => uploadedFiles[type]?.uploaded
  );

  const bankInfoComplete = !!(
    bankInfo.bankName &&
    bankInfo.accountNumber &&
    bankInfo.accountHolder
  );

  const isComplete = !!(
    formData.profilePhoto &&
    formData.brandName &&
    formData.contactEmail &&
    formData.contactPhone &&
    bankInfoComplete &&
    sensitiveFilesComplete
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
              <p className="text-sm text-yellow-600 dark:text-yellow-400">필수 자료를 모두 업로드해주세요.</p>
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
        {/* 민감정보 파일 업로드 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
          <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-600" />
            민감정보 서류 (서버 미저장)
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            아래 서류는 보안을 위해 서버에 저장되지 않고, 슬랙 채널로 직접 전송됩니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUploadField
              label="사업자등록증"
              fileType="businessLicense"
              required
              isSensitive
            />
            <FileUploadField
              label="신분증"
              fileType="idCard"
              required
              isSensitive
            />
            <FileUploadField
              label="통장사본"
              fileType="bankBook"
              required
              isSensitive
            />
          </div>
        </div>

        {/* 일반 파일 업로드 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            프로필 정보
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUploadField
              label="프로필 사진"
              fileType="profilePhoto"
              required
            />
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                고객 입금계좌 정보 <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                광고비 정산 시 입금받으실 계좌 정보를 입력해주세요
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={bankInfo.bankName}
                    onChange={(e) => setBankInfo(prev => ({ ...prev, bankName: e.target.value }))}
                    placeholder="은행명"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  value={bankInfo.accountNumber}
                  onChange={(e) => setBankInfo(prev => ({ ...prev, accountNumber: e.target.value }))}
                  placeholder="계좌번호"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={bankInfo.accountHolder}
                  onChange={(e) => setBankInfo(prev => ({ ...prev, accountHolder: e.target.value }))}
                  placeholder="예금주"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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

          {/* 웹사이트 스타일 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              웹사이트 스타일 선택
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              원하시는 홈페이지 스타일을 선택해주세요. 클릭하면 미리보기를 볼 수 있습니다.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {WEBSITE_STYLES.map((style) => (
                <div
                  key={style.url}
                  className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                    formData.websiteStyle === style.url
                      ? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
                      : "border-gray-200 dark:border-gray-600 hover:border-blue-300"
                  }`}
                  onClick={() => handleChange("websiteStyle", style.url)}
                >
                  {/* 썸네일 */}
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-700 relative group">
                    <iframe
                      src={style.url}
                      className="w-full h-full scale-[0.33] origin-top-left pointer-events-none"
                      style={{ width: '300%', height: '300%' }}
                      title={style.name}
                    />
                    <a
                      href={style.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center"
                    >
                      <span className="opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        새 탭에서 보기
                      </span>
                    </a>
                  </div>
                  {/* 스타일 이름 */}
                  <div className="p-2 text-center bg-gray-50 dark:bg-gray-700">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{style.name}</span>
                    {formData.websiteStyle === style.url && (
                      <CheckCircle className="w-4 h-4 text-blue-500 inline ml-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 브랜드 컬러 (컬러피커) */}
          <div className="mb-6" ref={colorSectionRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              브랜드 컬러
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={formData.websiteColor}
                onChange={(e) => handleChange("websiteColor", e.target.value)}
                className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.websiteColor}
                  onChange={(e) => handleChange("websiteColor", e.target.value)}
                  placeholder="#3B82F6"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  컬러피커에서 선택하거나 HEX 코드를 직접 입력하세요
                </p>
              </div>
              {/* 선택된 컬러 미리보기 */}
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: formData.websiteColor }}
              />
            </div>
          </div>

          {/* 블로그 참고 디자인 (파일 업로드) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              블로그 참고 디자인
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              원하시는 블로그 디자인 참고 이미지를 업로드해주세요
            </p>
            <FileUploadField
              label=""
              fileType="blogDesignRef"
            />
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
