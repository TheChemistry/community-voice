import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { SurveyService } from './survey.service';
import { PrismaService } from '../prisma.service';
import { Survey, SurveyResponse, CreateSurveyInput, SubmitSurveyResponseInput } from './survey.types';

@Resolver(() => Survey)
export class SurveyResolver {
  constructor(
    private surveyService: SurveyService,
    private prisma: PrismaService,
  ) {}

  @Query(() => [Survey], { name: 'getActiveSurveys' })
  async getActiveSurveys() {
    return this.surveyService.getActiveSurveys();
  }

  @Query(() => Survey, { name: 'survey', nullable: true })
  async getSurvey(@Args('id', { type: () => ID }) id: string) {
    return this.surveyService.getSurvey(id);
  }

  @Mutation(() => SurveyResponse, { name: 'submitSurveyResponse' })
  async submitSurveyResponse(
    @Args('input') input: SubmitSurveyResponseInput,
    @Context() context: any,
  ) {
    const req = context.req;
    let userId: string | null = null;

    // Optional authentication check for anonymous vs registered participants
    const user = req?.user || context.user;
    if (user) {
      userId = user.id || user.sub || null;
    } else {
      let token = req?.headers?.authorization?.split(' ')[1];
      if (!token) {
        token = req?.cookies?.['authjs.session-token'] || req?.cookies?.['__Secure-authjs.session-token'];
      }
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            userId = decoded?.id || decoded?.sub || null;
          }
        } catch (e) {
          // Ignore invalid token to allow anonymous submission
        }
      }
    }

    return this.surveyService.submitSurveyResponse(userId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Survey, { name: 'createSurvey' })
  async createSurvey(
    @Args('input') input: CreateSurveyInput,
    @CurrentUser() user: any,
  ) {
    if (!user) {
      throw new ForbiddenException('Admin access required');
    }

    // Verify admin role via token or DB lookup
    const userId = user.id || user.sub;
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const userRole = dbUser?.role || user.role;
    if (userRole !== 'MUNICIPAL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    return this.surveyService.createSurvey(input);
  }
}
