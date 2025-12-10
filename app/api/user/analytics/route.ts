import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      );
    }

    // 사용자의 clientId 가져오기
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { clientId: true },
    });

    if (!user?.clientId) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "연동된 광고 계정이 없습니다",
      });
    }

    // 최근 30일 데이터 조회
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rawData = await prisma.rawData.findMany({
      where: {
        clientId: user.clientId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // 일별 집계
    const dailyData = rawData.reduce((acc, row) => {
      const dateKey = row.date.toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          impressions: 0,
          reach: 0,
          clicks: 0,
          leads: 0,
          spend: 0,
        };
      }
      acc[dateKey].impressions += row.impressions;
      acc[dateKey].reach += row.reach;
      acc[dateKey].clicks += row.clicks;
      acc[dateKey].leads += row.leads;
      acc[dateKey].spend += Number(row.spend);
      return acc;
    }, {} as Record<string, { date: string; impressions: number; reach: number; clicks: number; leads: number; spend: number }>);

    // 총합 계산
    const totals = rawData.reduce(
      (acc, row) => ({
        impressions: acc.impressions + row.impressions,
        reach: acc.reach + row.reach,
        clicks: acc.clicks + row.clicks,
        leads: acc.leads + row.leads,
        spend: acc.spend + Number(row.spend),
      }),
      { impressions: 0, reach: 0, clicks: 0, leads: 0, spend: 0 }
    );

    // CTR, CPC, CPL 계산
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;

    // 목표 조회
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const target = await prisma.clientTarget.findFirst({
      where: {
        clientId: user.clientId,
        targetMonth: currentMonth,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        daily: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
        totals: {
          ...totals,
          ctr: ctr.toFixed(2),
          cpc: Math.round(cpc),
          cpl: Math.round(cpl),
        },
        target: target
          ? {
              leads: target.targetLeads,
              spend: target.targetSpend ? Number(target.targetSpend) : null,
              cpl: target.targetCpl ? Number(target.targetCpl) : null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return NextResponse.json(
      { error: "광고 데이터 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
