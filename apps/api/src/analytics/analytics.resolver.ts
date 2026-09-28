import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AccountabilityService } from './accountability.service';
import { TrendService } from './trend.service';
import { PrismaService } from '../prisma.service';
import {
  MunicipalOverview,
  DistrictIssueCount,
  SatisfactionTrend,
  PriorityTrend,
  AccountabilityScorecard,
  EmergingTrend,
} from './analytics.types';

@Resolver()
export class AnalyticsResolver {
  constructor(
    private analyticsService: AnalyticsService,
    private accountabilityService: AccountabilityService,
    private trendService: TrendService,
    private prisma: PrismaService,
  ) {}

  private async checkAdminAccess(user: any) {
    if (!user) {
      throw new ForbiddenException('Admin access required');
    }

    const userId = user.id || user.sub;
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = dbUser?.role || user.role;
    if (userRole !== 'MUNICIPAL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only Municipal Admins or Super Admins can access analytics',
      );
    }
  }

  @UseGuards(AuthGuard)
  @Query(() => MunicipalOverview)
  async municipalOverview(@CurrentUser() user: any) {
    await this.checkAdminAccess(user);
    return this.analyticsService.getMunicipalOverview();
  }

  @UseGuards(AuthGuard)
  @Query(() => [DistrictIssueCount])
  async wardLevelAnalytics(@CurrentUser() user: any) {
    await this.checkAdminAccess(user);
    return this.analyticsService.getWardLevelAnalytics();
  }

  @UseGuards(AuthGuard)
  @Query(() => [SatisfactionTrend])
  async satisfactionTrends(@CurrentUser() user: any) {
    await this.checkAdminAccess(user);
    return this.analyticsService.getSatisfactionTrends();
  }

  @UseGuards(AuthGuard)
  @Query(() => [PriorityTrend])
  async priorityTrends(@CurrentUser() user: any) {
    await this.checkAdminAccess(user);
    return this.analyticsService.getPriorityTrends();
  }

  @UseGuards(AuthGuard)
  @Query(() => AccountabilityScorecard)
  async accountabilityScorecard(@CurrentUser() user: any) {
    // Publicly accessible for high-transparency
    const overallMetrics = await this.accountabilityService.getMunicipalityMetrics();
    const departmentMetrics = await this.accountabilityService.getDepartmentMetrics();
    return {
      overallMetrics,
      departmentMetrics,
    };
  }

  @UseGuards(AuthGuard)
  @Query(() => [EmergingTrend])
  async emergingTrends(@CurrentUser() user: any) {
    // Publicly accessible for high-transparency
    return this.trendService.detectEmergingTrends();
  }
}
