"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  MousePointer,
  UserPlus,
  DollarSign,
  Target,
  AlertCircle,
} from "lucide-react";

interface DailyData {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  spend: number;
}

interface Totals {
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  spend: number;
  ctr: string;
  cpc: number;
  cpl: number;
}

interface Target {
  leads: number | null;
  spend: number | null;
  cpl: number | null;
}

interface AnalyticsData {
  daily: DailyData[];
  totals: Totals;
  target: Target | null;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noAccount, setNoAccount] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/user/analytics");
      const result = await res.json();
      if (result.success) {
        if (!result.data) {
          setNoAccount(true);
        } else {
          setData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("ko-KR").format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (noAccount) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          연동된 광고 계정이 없습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          광고 성과 확인을 위해서는 메타(Facebook/Instagram) 광고 계정 연동이 필요합니다.
          담당자에게 문의해주세요.
        </p>
      </div>
    );
  }

  if (!data || data.daily.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          아직 광고 데이터가 없습니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          광고가 시작되면 여기에서 성과를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  const stats = [
    {
      name: "노출 수",
      value: formatNumber(data.totals.impressions),
      icon: Eye,
      color: "bg-blue-500",
    },
    {
      name: "도달",
      value: formatNumber(data.totals.reach),
      icon: Users,
      color: "bg-purple-500",
    },
    {
      name: "클릭",
      value: formatNumber(data.totals.clicks),
      icon: MousePointer,
      color: "bg-cyan-500",
    },
    {
      name: "전환",
      value: formatNumber(data.totals.leads),
      icon: UserPlus,
      color: "bg-green-500",
    },
  ];

  const metrics = [
    {
      name: "광고비",
      value: formatCurrency(data.totals.spend),
      icon: DollarSign,
      target: data.target?.spend,
    },
    {
      name: "CTR",
      value: `${data.totals.ctr}%`,
      icon: MousePointer,
    },
    {
      name: "CPC",
      value: formatCurrency(data.totals.cpc),
      icon: MousePointer,
    },
    {
      name: "CPL",
      value: formatCurrency(data.totals.cpl),
      icon: Target,
      target: data.target?.cpl,
    },
  ];

  // 최근 7일 데이터
  const recentData = data.daily.slice(-7);

  // 최대값 계산 (차트용)
  const maxSpend = Math.max(...recentData.map((d) => d.spend));
  const maxLeads = Math.max(...recentData.map((d) => d.leads));

  return (
    <div className="space-y-6">
      {/* 목표 달성 현황 */}
      {data.target && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            이번 달 목표 달성 현황
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.target.leads && (
              <div>
                <p className="text-blue-200 text-sm">전환 목표</p>
                <p className="text-2xl font-bold">
                  {data.totals.leads} / {data.target.leads}
                </p>
                <div className="mt-2 h-2 bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min((data.totals.leads / data.target.leads) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm mt-1 text-blue-200">
                  {((data.totals.leads / data.target.leads) * 100).toFixed(1)}% 달성
                </p>
              </div>
            )}
            {data.target.spend && (
              <div>
                <p className="text-blue-200 text-sm">광고비 예산</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(data.totals.spend)} / {formatCurrency(data.target.spend)}
                </p>
                <div className="mt-2 h-2 bg-blue-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min((data.totals.spend / data.target.spend) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm mt-1 text-blue-200">
                  {((data.totals.spend / data.target.spend) * 100).toFixed(1)}% 사용
                </p>
              </div>
            )}
            {data.target.cpl && (
              <div>
                <p className="text-blue-200 text-sm">CPL 목표</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {formatCurrency(data.totals.cpl)}
                  {data.totals.cpl <= data.target.cpl ? (
                    <TrendingDown className="w-5 h-5 text-green-300" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-300" />
                  )}
                </p>
                <p className="text-sm mt-1 text-blue-200">
                  목표: {formatCurrency(data.target.cpl)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 주요 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 비용 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.name}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{metric.name}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* 최근 7일 추이 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          최근 7일 추이
        </h3>
        <div className="space-y-4">
          {/* 광고비 차트 */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">광고비</p>
            <div className="flex items-end gap-2 h-24">
              {recentData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{ height: `${maxSpend > 0 ? (day.spend / maxSpend) * 100 : 0}%`, minHeight: day.spend > 0 ? "4px" : "0" }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(day.date).getDate()}일
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 전환 차트 */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">전환</p>
            <div className="flex items-end gap-2 h-24">
              {recentData.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-500 rounded-t transition-all"
                    style={{ height: `${maxLeads > 0 ? (day.leads / maxLeads) * 100 : 0}%`, minHeight: day.leads > 0 ? "4px" : "0" }}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(day.date).getDate()}일
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 일별 상세 데이터 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">일별 상세</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 dark:text-gray-400 font-medium">날짜</th>
                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">노출</th>
                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">클릭</th>
                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">전환</th>
                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">광고비</th>
                <th className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 font-medium">CPL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {[...data.daily].reverse().slice(0, 14).map((day) => (
                <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">
                    {new Date(day.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatNumber(day.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatNumber(day.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatNumber(day.leads)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(day.spend)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    {day.leads > 0 ? formatCurrency(day.spend / day.leads) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
