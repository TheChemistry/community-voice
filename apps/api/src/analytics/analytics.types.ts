import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { CivicReport } from '../reports/reports.resolver';

@ObjectType()
export class MunicipalOverview {
  @Field(() => Int)
  totalReports: number;

  @Field(() => Int)
  resolvedCount: number;

  @Field(() => Int)
  unresolvedCount: number;

  @Field(() => Float)
  averagePriorityScore: number;

  @Field(() => [CivicReport])
  topHighPriorityIssues: CivicReport[];
}

@ObjectType()
export class DistrictIssueCount {
  @Field()
  district: string;

  @Field(() => Int)
  count: number;
}

@ObjectType()
export class SatisfactionTrend {
  @Field()
  period: string;

  @Field(() => Float)
  averageRating: number;
}

@ObjectType()
export class PriorityTrend {
  @Field()
  period: string;

  @Field(() => Int)
  highPriorityCount: number;
}

@ObjectType()
export class AccountabilityMetrics {
  @Field(() => Float)
  avgResponseTimeHours: number;

  @Field(() => Float)
  avgResolutionTimeHours: number;

  @Field(() => Int)
  openIssues: number;

  @Field(() => Int)
  resolvedIssues: number;

  @Field(() => Float)
  resolutionPercentage: number;
}

@ObjectType()
export class DepartmentAccountability {
  @Field()
  department: string;

  @Field(() => AccountabilityMetrics)
  metrics: AccountabilityMetrics;

  @Field(() => Float)
  satisfactionScore: number;
}

@ObjectType()
export class AccountabilityScorecard {
  @Field(() => AccountabilityMetrics)
  overallMetrics: AccountabilityMetrics;

  @Field(() => [DepartmentAccountability])
  departmentMetrics: DepartmentAccountability[];
}

@ObjectType()
export class EmergingTrend {
  @Field()
  category: string;

  @Field()
  description: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => [String])
  tags: string[];

  @Field(() => [CivicReport])
  affectedReports: CivicReport[];
}
