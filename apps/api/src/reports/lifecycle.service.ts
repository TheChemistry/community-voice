import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReportStatus, Role } from '@community-voice/database';

@Injectable()
export class LifecycleService {
  constructor(private prisma: PrismaService) {}

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    user: { id: string; role: Role },
    officialId?: string,
    content?: string,
  ) {
    const report = await this.prisma.civicReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Validate transitions
    const officialOnlyStatuses: ReportStatus[] = [
      ReportStatus.ACKNOWLEDGED,
      ReportStatus.ASSIGNED,
      ReportStatus.IN_PROGRESS,
      ReportStatus.RESOLVED,
      ReportStatus.CLOSED,
    ];

    if (officialOnlyStatuses.includes(status) && user.role !== Role.MUNICIPAL_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only municipal admins can update report to this status');
    }

    const updateData: any = { status };

    // Update relevant timestamps
    if (status === ReportStatus.ACKNOWLEDGED) updateData.acknowledgedAt = new Date();
    if (status === ReportStatus.ASSIGNED) updateData.assignedAt = new Date();
    if (status === ReportStatus.IN_PROGRESS) updateData.inProgressAt = new Date();
    if (status === ReportStatus.RESOLVED) updateData.resolvedAt = new Date();
    if (status === ReportStatus.CLOSED) updateData.closedAt = new Date();

    const updatedReport = await this.prisma.civicReport.update({
      where: { id: reportId },
      data: updateData,
    });

    // If officialId and content are provided, create a GovernmentResponse
    if (officialId && content) {
      await this.prisma.governmentResponse.create({
        data: {
          reportId,
          officialId,
          content,
          statusChange: status,
        },
      });
    }

    // Trigger a "Status Changed" event (placeholder)
    console.log(`[Event] Report ${reportId} status changed to ${status}`);

    return updatedReport;
  }

  async verifyResolution(
    reportId: string,
    userId: string,
    afterPhotoKey: string,
    comment?: string,
  ) {
    const report = await this.prisma.civicReport.findUnique({
      where: { id: reportId },
      include: { attachments: true },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.RESOLVED) {
      throw new ForbiddenException('Only resolved reports can be verified');
    }

    const beforePhotoKey = report.attachments[0]?.s3Key || '';

    const verification = await this.prisma.resolutionVerification.create({
      data: {
        reportId,
        userId,
        beforePhotoKey,
        afterPhotoKey,
        comment,
        isVerified: true, // Auto-verify for Phase 4 prototype
      },
    });

    await this.prisma.civicReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.VERIFIED_RESOLVED,
        verifiedAt: new Date(),
      },
    });

    return verification;
  }

  async isReportWatched(userId: string, reportId: string) {
    const count = await this.prisma.watchlist.count({
      where: { userId, reportId },
    });
    return count > 0;
  }

  async getWatchlist(userId: string) {
    return this.prisma.watchlist.findMany({
      where: { userId },
      include: {
        report: {
          include: {
            attachments: true,
          },
        },
      },
    });
  }

  async toggleWatchlist(userId: string, reportId: string) {
    const existing = await this.prisma.watchlist.findUnique({
      where: {
        userId_reportId: { userId, reportId },
      },
    });

    if (existing) {
      await this.prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return false;
    } else {
      await this.prisma.watchlist.create({
        data: { userId, reportId },
      });
      return true;
    }
  }
}
