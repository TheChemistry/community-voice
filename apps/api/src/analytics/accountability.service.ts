import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AccountabilityService {
  constructor(private prisma: PrismaService) {}

  async getMunicipalityMetrics() {
    const reports = await this.prisma.civicReport.findMany({
      where: {
        status: { in: ['ACKNOWLEDGED', 'RESOLVED', 'VERIFIED_RESOLVED', 'CLOSED'] },
      },
      select: {
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
        status: true,
      },
    });

    const openIssues = await this.prisma.civicReport.count({
      where: {
        status: { notIn: ['RESOLVED', 'VERIFIED_RESOLVED', 'CLOSED', 'REJECTED'] },
      },
    });

    const resolvedIssues = await this.prisma.civicReport.count({
      where: {
        status: { in: ['RESOLVED', 'VERIFIED_RESOLVED', 'CLOSED'] },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;

    reports.forEach((report) => {
      if (report.acknowledgedAt) {
        totalResponseTime +=
          (report.acknowledgedAt.getTime() - report.createdAt.getTime()) / (1000 * 60 * 60);
        responseCount++;
      }
      if (report.resolvedAt) {
        totalResolutionTime +=
          (report.resolvedAt.getTime() - report.createdAt.getTime()) / (1000 * 60 * 60);
        resolutionCount++;
      }
    });

    const totalReports = await this.prisma.civicReport.count();

    return {
      avgResponseTimeHours: responseCount > 0 ? totalResponseTime / responseCount : 0,
      avgResolutionTimeHours: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
      openIssues,
      resolvedIssues,
      resolutionPercentage: totalReports > 0 ? (resolvedIssues / totalReports) * 100 : 0,
    };
  }

  async getDepartmentMetrics() {
    const departments = await this.prisma.civicReport.groupBy({
      by: ['department'],
    });

    const departmentMetrics = await Promise.all(
      departments.map(async (d) => {
        const dept = d.department || 'Unassigned';
        const reports = await this.prisma.civicReport.findMany({
          where: { department: d.department },
          select: {
            createdAt: true,
            acknowledgedAt: true,
            resolvedAt: true,
            status: true,
            id: true,
          },
        });

        let totalResponseTime = 0;
        let responseCount = 0;
        let totalResolutionTime = 0;
        let resolutionCount = 0;
        let resolvedCount = 0;

        reports.forEach((report) => {
          if (report.acknowledgedAt) {
            totalResponseTime +=
              (report.acknowledgedAt.getTime() - report.createdAt.getTime()) / (1000 * 60 * 60);
            responseCount++;
          }
          if (report.resolvedAt) {
            totalResolutionTime +=
              (report.resolvedAt.getTime() - report.createdAt.getTime()) / (1000 * 60 * 60);
            resolutionCount++;
          }
          if (['RESOLVED', 'VERIFIED_RESOLVED', 'CLOSED'].includes(report.status)) {
            resolvedCount++;
          }
        });

        const openCount = reports.length - resolvedCount;

        // Satisfaction score calculation (mocked/simplified)
        // In a real scenario, we'd join with SurveyResponse or ResolutionVerification
        const verifications = await this.prisma.resolutionVerification.findMany({
          where: { reportId: { in: reports.map((r) => r.id) } },
          select: { aiConfidence: true },
        });

        const avgConfidence =
          verifications.length > 0
            ? verifications.reduce((acc, v) => acc + v.aiConfidence, 0) / verifications.length
            : 0.75; // Default mock score

        return {
          department: dept,
          metrics: {
            avgResponseTimeHours: responseCount > 0 ? totalResponseTime / responseCount : 0,
            avgResolutionTimeHours: resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0,
            openIssues: openCount,
            resolvedIssues: resolvedCount,
            resolutionPercentage: reports.length > 0 ? (resolvedCount / reports.length) * 100 : 0,
          },
          satisfactionScore: avgConfidence * 100,
        };
      }),
    );

    return departmentMetrics;
  }
}
