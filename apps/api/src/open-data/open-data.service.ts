import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OpenDataService {
  constructor(private prisma: PrismaService) {}

  async getPublicReports() {
    const reports = await this.prisma.civicReport.findMany({
      select: {
        title: true,
        category: true,
        department: true,
        status: true,
        priorityScore: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    return reports.map((report) => ({
      title: report.title,
      category: report.category,
      department: report.department,
      status: report.status,
      priority: report.priorityScore,
      location: {
        latitude: parseFloat(report.latitude.toFixed(3)),
        longitude: parseFloat(report.longitude.toFixed(3)),
      },
      createdAt: report.createdAt,
    }));
  }

  async getStats() {
    const totalReports = await this.prisma.civicReport.count();
    const resolvedReports = await this.prisma.civicReport.count({
      where: { status: 'RESOLVED' },
    });

    const reportsWithTimestamps = await this.prisma.civicReport.findMany({
      where: {
        acknowledgedAt: { not: null },
      },
      select: {
        createdAt: true,
        acknowledgedAt: true,
      },
    });

    const totalResponseTime = reportsWithTimestamps.reduce((acc, report) => {
      return acc + (report.acknowledgedAt!.getTime() - report.createdAt.getTime());
    }, 0);

    const avgResponseTimeMs = reportsWithTimestamps.length > 0
      ? totalResponseTime / reportsWithTimestamps.length
      : 0;

    return {
      totalReports,
      resolutionRate: totalReports > 0 ? resolvedReports / totalReports : 0,
      avgResponseTimeHours: parseFloat((avgResponseTimeMs / (1000 * 60 * 60)).toFixed(2)),
      lastUpdated: new Date().toISOString(),
    };
  }

  async getTrends() {
    const reports = await this.prisma.civicReport.findMany({
      select: { aiTrendTags: true },
    });

    const tagCounts: Record<string, number> = {};
    reports.forEach(report => {
      report.aiTrendTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const sortedTrends = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      topTrends: sortedTrends,
      summary: "AI-detected patterns across municipal reporting data.",
      analysisVersion: "1.0.0",
      lastUpdated: new Date().toISOString(),
    };
  }

  getManifest() {
    return {
      apiVersion: 'v1',
      service: 'Open Data API',
      manifest: [
        { path: '/api/v1/opendata/reports', method: 'GET', description: 'Aggregated civic reports with PII redacted' },
        { path: '/api/v1/opendata/stats', method: 'GET', description: 'Municipal performance metrics and response rates' },
        { path: '/api/v1/opendata/trends', method: 'GET', description: 'AI-detected civic trend summaries' },
      ],
      usageTerms: {
        policy: 'Evidence First',
        purpose: 'Research Only',
        piiPolicy: 'All personally identifiable information is removed prior to publication',
        locationPrivacy: 'Coordinates rounded to 3 decimal places (approx. 110m precision)',
      },
    };
  }
}
