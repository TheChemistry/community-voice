import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MediaService } from './media.service';
import { CreateReportInput } from '@community-voice/shared-types';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  async createReport(userId: string, input: CreateReportInput) {
    const { title, description, category, latitude, longitude, mediaKeys } = input;

    return this.prisma.civicReport.create({
      data: {
        userId,
        title,
        description,
        category,
        latitude,
        longitude,
        status: 'SUBMITTED',
        attachments: {
          create: mediaKeys?.map((key) => ({
            s3Key: key,
            url: this.mediaService.getPublicUrl(key),
            mimeType: 'image/jpeg', // Default for now
            fileSize: 0, // Default for now
          })) || [],
        },
      },
      include: {
        attachments: true,
        user: true,
      },
    });
  }

  async getReport(id: string) {
    return this.prisma.civicReport.findUnique({
      where: { id },
      include: {
        attachments: true,
        user: true,
        responses: {
          orderBy: { createdAt: 'desc' },
        },
        verifications: true,
      },
    });
  }

  async getVerifications(reportId: string) {
    return this.prisma.resolutionVerification.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listReports(filters: { status?: string; category?: string }) {
    return this.prisma.civicReport.findMany({
      where: {
        status: filters.status as any,
        category: filters.category,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        attachments: true,
        user: true,
        responses: true,
      },
    });
  }

  async getDashboardStats() {
    const totalReports = await this.prisma.civicReport.count();
    const resolvedIssues = await this.prisma.civicReport.count({
      where: { status: 'RESOLVED' },
    });
    const highPriorityIssues = await this.prisma.civicReport.count({
      where: { priorityScore: { gt: 75 } },
    });

    return { totalReports, resolvedIssues, highPriorityIssues };
  }

  async getTrendingCategories() {
    const categories = await this.prisma.civicReport.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        _count: {
          category: 'desc',
        },
      },
      take: 5,
    });

    return categories.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));
  }

  async updatePriorityScore(reportId: string) {
    const report = await this.prisma.civicReport.findUnique({
      where: { id: reportId },
      include: {
        votes: true,
        attachments: true,
      },
    });

    if (!report) return;

    let votesScore = 0;
    for (const vote of report.votes) {
      if (vote.direction === 1) {
        votesScore += 5;
      } else if (vote.direction === -1) {
        votesScore -= 2;
      }
    }

    let evidenceQualityScore = 0;
    let severityScore = 0;
    let hasAiAnalysis = false;

    for (const attachment of report.attachments) {
      evidenceQualityScore += 5;
      if (attachment.aiAnalysis) {
        hasAiAnalysis = true;
        const attachmentSeverity = (attachment.aiAnalysis as any)?.severityScore || (attachment.aiAnalysis as any)?.severity || 0;
        severityScore += attachmentSeverity;
      }
    }

    if (hasAiAnalysis) {
      evidenceQualityScore += 10;
    }

    const baseScore = votesScore + evidenceQualityScore + severityScore;

    const ageInDays = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyFactor = Math.max(0, (30 - ageInDays) / 30);
    const finalScore = Math.min(100, Math.max(0, baseScore * recencyFactor));

    return this.prisma.civicReport.update({
      where: { id: reportId },
      data: { priorityScore: finalScore },
    });
  }

  async listReportsForMap() {
    return this.prisma.civicReport.findMany({
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        category: true,
        priorityScore: true,
      },
    });
  }
}
