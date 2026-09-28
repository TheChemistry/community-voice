import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

@Injectable()
export class SurveyService {
  constructor(private prisma: PrismaService) {}

  async createSurvey(input: any) {
    return this.prisma.survey.create({
      data: {
        title: input.title,
        description: input.description,
        schemaJson: input.schemaJson,
        isActive: input.isActive ?? true,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }

  async getActiveSurveys() {
    const now = new Date();
    return this.prisma.survey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSurvey(id: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        responses: true,
      },
    });
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
    return survey;
  }

  async submitSurveyResponse(userId: string | null, input: any) {
    const { surveyId, answers } = input;

    const survey = await this.getSurvey(surveyId);

    // Validate answers against schemaJson using ajv
    try {
      const validate = ajv.compile(survey.schemaJson as any);
      const valid = validate(answers);
      if (!valid) {
        const errors = ajv.errorsText(validate.errors);
        throw new BadRequestException(`Survey answers do not match the required schema: ${errors}`);
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Invalid schema or schema validation error: ${err.message}`);
    }

    // Save response (handles anonymous when userId is null, registered when userId is a string)
    return this.prisma.surveyResponse.create({
      data: {
        surveyId,
        userId: userId || undefined,
        answers: answers as any,
      },
    });
  }

  // Placeholder for basic sentiment or aggregation results for the survey
  async calculateSentimentOrAggregation(surveyId: string) {
    const survey = await this.getSurvey(surveyId);
    const totalResponses = survey.responses?.length || 0;

    return {
      surveyId,
      totalResponses,
      sentimentPlaceholder: 'Positive',
      averageScorePlaceholder: 4.5,
      aggregationSummary: `Calculated summary for ${totalResponses} responses.`,
    };
  }
}
