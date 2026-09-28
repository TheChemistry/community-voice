import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ReportsService } from './reports.service';

@Injectable()
export class VoteService {
  constructor(
    private prisma: PrismaService,
    private reportsService: ReportsService,
  ) {}

  async vote(userId: string, reportId: string, direction: number) {
    await this.prisma.vote.upsert({
      where: {
        userId_reportId: {
          userId,
          reportId,
        },
      },
      update: {
        direction,
      },
      create: {
        userId,
        reportId,
        direction,
      },
    });

    await this.reportsService.updatePriorityScore(reportId);

    return this.reportsService.getReport(reportId);
  }
}
