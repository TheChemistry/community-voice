import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AccountabilityService } from './accountability.service';
import { TrendService } from './trend.service';
import { AnalyticsResolver } from './analytics.resolver';
import { PrismaService } from '../prisma.service';
import { AIService } from '../ai/ai.service';

@Module({
  providers: [
    AnalyticsService,
    AccountabilityService,
    TrendService,
    AnalyticsResolver,
    PrismaService,
    AIService,
  ],
  exports: [AnalyticsService, AccountabilityService, TrendService],
})
export class AnalyticsModule {}
