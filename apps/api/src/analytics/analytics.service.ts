import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  async getMunicipalOverview() {
    const totalReports = await this.prisma.civicReport.count();
    const resolvedCount = await this.prisma.civicReport.count({
      where: { status: 'RESOLVED' },
    });
    const unresolvedCount = totalReports - resolvedCount;

    const aggregations = await this.prisma.civicReport.aggregate({
      _avg: {
        priorityScore: true,
      },
    });

    const topHighPriorityIssues = await this.prisma.civicReport.findMany({
      orderBy: {
        priorityScore: 'desc',
      },
      take: 3,
      include: {
        attachments: true,
        user: true,
      },
    });

    return {
      totalReports,
      resolvedCount,
      unresolvedCount,
      averagePriorityScore: aggregations._avg.priorityScore || 0,
      topHighPriorityIssues,
    };
  }

  async getWardLevelAnalytics() {
    // Mock for now: using categories as placeholder for districts
    // In a production app, we would use PostGIS to group by ward geometry
    const categoryCounts = await this.prisma.civicReport.groupBy({
      by: ['category'],
      _count: {
        id: true,
      },
    });

    return categoryCounts.map((c) => ({
      district: c.category,
      count: c._count.id,
    }));
  }

  async getSatisfactionTrends() {
    const responses = await this.prisma.surveyResponse.findMany({
      select: {
        answers: true,
        submittedAt: true,
      },
    });

    const trends: Record<string, { total: number; count: number }> = {};

    responses.forEach((r) => {
      const answers = r.answers as any;
      // Heuristic: check for common rating field names
      const satisfaction = answers.satisfaction ?? answers.rating ?? answers.score;

      if (typeof satisfaction === 'number') {
        const date = new Date(r.submittedAt);
        const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!trends[period]) {
          trends[period] = { total: 0, count: 0 };
        }
        trends[period].total += satisfaction;
        trends[period].count += 1;
      }
    });

    return Object.entries(trends)
      .map(([period, data]) => ({
        period,
        averageRating: data.total / data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async getPriorityTrends() {
    const highPriorityReports = await this.prisma.civicReport.findMany({
      where: {
        priorityScore: { gt: 70 },
      },
      select: {
        createdAt: true,
      },
    });

    const trends: Record<string, number> = {};
    highPriorityReports.forEach((r) => {
      const date = new Date(r.createdAt);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      trends[period] = (trends[period] || 0) + 1;
    });

    return Object.entries(trends)
      .map(([period, count]) => ({
        period,
        highPriorityCount: count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  async generateQuarterlyReport() {
    // 1. Fetch relevant data for the last quarter (approx 90 days)
    const lastQuarter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const reports = await this.prisma.civicReport.findMany({
      where: {
        createdAt: { gte: lastQuarter },
      },
      select: {
        title: true,
        description: true,
        status: true,
        category: true,
        createdAt: true,
        resolvedAt: true,
      },
    });

    const issuesSubmitted = reports.length;
    const issuesResolved = reports.filter(
      (r) => r.status === 'RESOLVED' || r.status === 'VERIFIED_RESOLVED',
    ).length;

    const resolveTimes = reports
      .filter((r) => r.resolvedAt)
      .map((r) => r.resolvedAt!.getTime() - r.createdAt.getTime());
    const avgResponseTimeMs =
      resolveTimes.length > 0
        ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length
        : 0;
    const avgResponseTimeDays = (avgResponseTimeMs / (1000 * 60 * 60 * 24)).toFixed(1);

    // 2. Prepare simplified data for AI analysis
    const reportDataSummary = reports.map((r) => ({
      title: r.title,
      category: r.category,
      resolved: !!r.resolvedAt,
    }));

    const metricData = {
      issuesSubmitted,
      issuesResolved,
      avgResponseTime: `${avgResponseTimeDays} days`,
    };

    // 3. Generate the professional report using AIService
    return this.aiService.generateCivicHealthReport(reportDataSummary, metricData);
  }
}
