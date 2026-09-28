import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppResolver } from './app.resolver';
import { PrismaService } from './prisma.service';
import { MediaService } from './reports/media.service';
import { ReportsService } from './reports/reports.service';
import { ReportsResolver } from './reports/reports.resolver';
import { LifecycleService } from './reports/lifecycle.service';
import { AIService } from './ai/ai.service';
import { MediaProcessor } from './processors/media.processor';
import { SurveyService } from './surveys/survey.service';
import { SurveyResolver } from './surveys/survey.resolver';
import { VoteService } from './reports/vote.service';
import { VoteResolver } from './reports/vote.resolver';
import { TaskForceService } from './taskforce/taskforce.service';
import { TaskForceResolver } from './taskforce/taskforce.resolver';
import { AnalyticsModule } from './analytics/analytics.module';
import { OpenDataController } from './open-data/open-data.controller';
import { OpenDataService } from './open-data/open-data.service';

@Module({
  imports: [
    AnalyticsModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
  ],
  controllers: [AppController, OpenDataController],
  providers: [
    AppResolver,
    PrismaService,
    MediaService,
    ReportsService,
    ReportsResolver,
    LifecycleService,
    VoteService,
    VoteResolver,
    AIService,
    MediaProcessor,
    SurveyService,
    SurveyResolver,
    TaskForceService,
    TaskForceResolver,
    OpenDataService,
  ],
})
export class AppModule {}
