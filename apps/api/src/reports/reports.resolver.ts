import { Resolver, Mutation, Query, ResolveField, Parent, Args, ObjectType, Field, ID, Float, InputType, registerEnumType } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReportsService } from './reports.service';
import { MediaService } from './media.service';
import { AIService } from '../ai/ai.service';
import { LifecycleService } from './lifecycle.service';
import { ReportStatus, Role } from '@community-voice/database';

registerEnumType(ReportStatus, {
  name: 'ReportStatus',
});

@InputType()
class CreateCivicReportInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  category: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => [String], { nullable: true })
  mediaKeys?: string[];
}

@ObjectType()
class MediaAttachment {
  @Field(() => ID)
  id: string;

  @Field()
  url: string;

  @Field()
  s3Key: string;
}

@ObjectType()
class AITimelineItem {
  @Field({ nullable: true })
  timestamp?: string;

  @Field()
  event: string;
}

@ObjectType()
class AIAssistantResult {
  @Field()
  reportSummary: string;

  @Field()
  executiveSummary: string;

  @Field(() => [AITimelineItem])
  timeline: AITimelineItem[];

  @Field(() => [String])
  suggestedActions: string[];
}

@ObjectType()
class AICommunicationResult {
  @Field()
  mayorLetter: string;

  @Field()
  councillorLetter: string;

  @Field()
  municipalDepartmentSubmission: string;

  @Field()
  mediaRelease: string;

  @Field()
  communityNewsletterArticle: string;
}

@ObjectType()
export class GovernmentResponse {
  @Field(() => ID)
  id: string;

  @Field()
  content: string;

  @Field(() => ReportStatus, { nullable: true })
  statusChange?: ReportStatus;

  @Field()
  officialId: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class ResolutionVerification {
  @Field(() => ID)
  id: string;

  @Field()
  afterPhotoKey: string;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  isVerified: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class CivicReport {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  category: string;

  @Field(() => ReportStatus)
  status: ReportStatus;

  @Field(() => Float)
  priorityScore: number;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => [MediaAttachment])
  attachments: MediaAttachment[];

  @Field(() => AIAssistantResult, { nullable: true })
  aiAssistant?: AIAssistantResult;

  @Field(() => AICommunicationResult, { nullable: true })
  aiCommunications?: AICommunicationResult;

  @Field(() => [GovernmentResponse], { nullable: true })
  responses?: GovernmentResponse[];

  @Field(() => [ResolutionVerification], { nullable: true })
  verifications?: ResolutionVerification[];

  @Field(() => Boolean)
  isWatched?: boolean;

  @Field({ nullable: true })
  acknowledgedAt?: Date;

  @Field({ nullable: true })
  assignedAt?: Date;

  @Field({ nullable: true })
  inProgressAt?: Date;

  @Field({ nullable: true })
  resolvedAt?: Date;

  @Field({ nullable: true })
  verifiedAt?: Date;

  @Field({ nullable: true })
  closedAt?: Date;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class CivicReportMapItem {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field()
  category: string;

  @Field(() => Float)
  priorityScore: number;
}

@ObjectType()
class PresignedUrlResponse {
  @Field()
  uploadUrl: string;

  @Field()
  key: string;
}

@ObjectType()
class DashboardStats {
  @Field()
  totalReports: number;

  @Field()
  resolvedIssues: number;

  @Field()
  highPriorityIssues: number;
}

@ObjectType()
class TrendingCategory {
  @Field()
  category: string;

  @Field()
  count: number;
}

@Resolver(() => CivicReport)
export class ReportsResolver {
  constructor(
    private reportsService: ReportsService,
    private mediaService: MediaService,
    private aiService: AIService,
    private lifecycleService: LifecycleService,
  ) {}

  @UseGuards(AuthGuard)
  @Query(() => DashboardStats)
  async dashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @UseGuards(AuthGuard)
  @Query(() => [TrendingCategory])
  async trendingCategories() {
    return this.reportsService.getTrendingCategories();
  }

  @UseGuards(AuthGuard)
  @Query(() => [CivicReport], { name: 'listReports' })
  async listReports(
    @Args('status', { type: () => ReportStatus, nullable: true }) status?: ReportStatus,
    @Args('category', { type: () => String, nullable: true }) category?: string,
  ) {
    return this.reportsService.listReports({ status, category });
  }

  @UseGuards(AuthGuard)
  @Query(() => CivicReport, { name: 'civicReport', nullable: true })
  async getCivicReport(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.reportsService.getReport(id);
  }

  @ResolveField(() => AIAssistantResult, { nullable: true })
  async aiAssistant(@Parent() report: any) {
    try {
      return await this.aiService.generateReportAssistant(report.title, report.description);
    } catch (e) {
      return null;
    }
  }

  @ResolveField(() => AICommunicationResult, { nullable: true })
  async aiCommunications(
    @Parent() report: any,
    @Args('tone', { type: () => String, defaultValue: 'Professional' }) tone: string,
  ) {
    try {
      const assistantResult = await this.aiService.generateReportAssistant(report.title, report.description);
      return await this.aiService.generateCommunications({
        title: report.title,
        description: report.description,
        assistantResult,
      }, tone);
    } catch (e) {
      return null;
    }
  }

  @ResolveField(() => Boolean)
  async isWatched(
    @Parent() report: any,
    @CurrentUser() user: any,
  ) {
    if (!user) return false;
    const userId = user.sub || user.id;
    return this.lifecycleService.isReportWatched(userId, report.id);
  }

  @ResolveField(() => [ResolutionVerification])
  async verifications(@Parent() report: any) {
    return this.reportsService.getVerifications(report.id);
  }

  @UseGuards(AuthGuard)
  @Query(() => [CivicReport], { name: 'watchlist' })
  async getWatchlist(@CurrentUser() user: any) {
    const userId = user.sub || user.id;
    const watchlist = await this.lifecycleService.getWatchlist(userId);
    return watchlist.map(w => w.report);
  }

  @UseGuards(AuthGuard)
  @Query(() => [CivicReportMapItem], { name: 'listReportsForMap' })
  async listReportsForMap() {
    return this.reportsService.listReportsForMap();
  }

  @UseGuards(AuthGuard)
  @Mutation(() => CivicReport)
  async createCivicReport(
    @Args('input') input: CreateCivicReportInput,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    return this.reportsService.createReport(userId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => CivicReport)
  async respondToReport(
    @Args('reportId', { type: () => ID }) reportId: string,
    @Args('content') content: string,
    @Args('status', { type: () => ReportStatus }) status: ReportStatus,
    @CurrentUser() user: any,
  ) {
    if (user.role !== Role.MUNICIPAL_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only officials can respond to reports');
    }
    const officialId = user.sub || user.id;
    return this.lifecycleService.updateReportStatus(reportId, status, user, officialId, content);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => CivicReport)
  async acknowledgeReport(
    @Args('reportId', { type: () => ID }) reportId: string,
    @CurrentUser() user: any,
  ) {
    if (user.role !== Role.MUNICIPAL_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only officials can acknowledge reports');
    }
    return this.lifecycleService.updateReportStatus(reportId, ReportStatus.ACKNOWLEDGED, user);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  async watchlist(
    @Args('reportId', { type: () => ID }) reportId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    return this.lifecycleService.toggleWatchlist(userId, reportId);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => ResolutionVerification)
  async verifyResolution(
    @Args('reportId', { type: () => ID }) reportId: string,
    @Args('afterPhotoKey') afterPhotoKey: string,
    @Args('comment', { nullable: true }) comment: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    return this.lifecycleService.verifyResolution(reportId, userId, afterPhotoKey, comment);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => PresignedUrlResponse)
  async getUploadUrl(
    @Args('fileName') fileName: string,
    @Args('contentType') contentType: string,
  ) {
    const key = `reports/${Date.now()}-${fileName}`;
    const uploadUrl = await this.mediaService.getPresignedUrl(key, contentType);
    return { uploadUrl, key };
  }
}
