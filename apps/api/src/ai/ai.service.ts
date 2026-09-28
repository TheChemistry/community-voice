import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface KeyframeInput {
  buffer: Buffer;
  mimeType: string;
  timestamp?: string;
}

export interface AIDetectionResult {
  movements: string[];
  vehicles: string[];
  pedestrians: string[];
  environmentalConditions: string[];
  neutralDescription: string;
  redactionRegions?: { x: number; y: number; width: number; height: number; type: 'face' | 'plate' | 'person' }[];
}

export interface ReportAssistantResult {
  reportSummary: string;
  executiveSummary: string;
  timeline: { timestamp?: string; event: string }[];
  suggestedActions: string[];
}

export interface CommunicationGenerationResult {
  mayorLetter: string;
  councillorLetter: string;
  municipalDepartmentSubmission: string;
  mediaRelease: string;
  communityNewsletterArticle: string;
}

export interface ModerationResult {
  aiFlagged: boolean;
  aiConfidence: number; // 0.0 to 1.0
  aiReasoning: string;
  aiRiskCategory: 'Defamation' | 'Harassment' | 'Doxxing' | 'Hate Speech' | 'None';
}

export interface EvidenceComparisonResult {
  resolutionConfidence: number;
  descriptionOfWork: string;
  isResolved: boolean;
}

export interface CivicTrendResult {
  trendTitle: string;
  trendDescription: string;
  affectedAreas: string[];
  confidenceScore: number;
  tags: string[];
}

export interface CivicHealthReport {
  reportContent: string;
  summary: {
    issuesSubmittedCount: number;
    issuesResolvedCount: number;
    avgResponseTime: string;
    topConcerns: string[];
    emergingConcerns: string[];
  };
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
    } else {
      this.logger.warn('GEMINI_API_KEY is not defined in the environment variables.');
    }
  }

  /**
   * Helper to parse JSON safely from LLM responses, stripping potential markdown blocks.
   */
  private parseJSONResponse<T>(text: string, fallback: T): T {
    try {
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      return JSON.parse(cleanText.trim()) as T;
    } catch (error) {
      this.logger.error('Failed to parse AI JSON response. Raw text: ' + text, error);
      return fallback;
    }
  }

  /**
   * 1. AI Detection: Analyzes video keyframes using Gemini.
   * Adheres strictly to the Evidence-First Philosophy (neutral, factual reporting).
   */
  async analyzeKeyframes(keyframes: KeyframeInput[]): Promise<AIDetectionResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert AI vision analyzer adhering strictly to an Evidence-First Philosophy.
      Analyze the provided video keyframe(s) and detect movement, vehicles, pedestrians, and environmental conditions.

      CRITICAL INSTRUCTION: Your analysis must be entirely objective, neutral, and fact-based. Do not impute intent, guilt, or criminal actions.
      - Incorrect: "A thief is stealing a car."
      - Correct: "A person appears near the vehicle, holding an object."
      - Incorrect: "Vandals damaging property."
      - Correct: "Two individuals are standing near the wall with spray cans."

      Return your response strictly as a JSON object matching this structure:
      {
        "movements": ["description of movement 1", ...],
        "vehicles": ["description of vehicle 1 details", ...],
        "pedestrians": ["description of pedestrian appearance/actions", ...],
        "environmentalConditions": ["weather, time of day, lighting", ...],
        "neutralDescription": "A comprehensive objective narrative of the keyframes.",
        "redactionRegions": [
          { "x": 100, "y": 150, "width": 50, "height": 50, "type": "face" }
        ]
      }
      The redactionRegions should contain bounding boxes for any faces or license plates detected. Coordinates (x, y, width, height) should be normalized (0-1000).
    `;

    const parts: any[] = [prompt];

    for (const keyframe of keyframes) {
      parts.push({
        inlineData: {
          data: keyframe.buffer.toString('base64'),
          mimeType: keyframe.mimeType,
        },
      });
    }

    try {
      const result = await model.generateContent(parts);
      const responseText = result.response.text();

      const fallback: AIDetectionResult = {
        movements: [],
        vehicles: [],
        pedestrians: [],
        environmentalConditions: [],
        neutralDescription: 'Factual keyframe analysis failed to parse correctly.',
      };

      return this.parseJSONResponse<AIDetectionResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during analyzeKeyframes execution', error);
      throw error;
    }
  }

  /**
   * 2. Report Assistant: Uses Gemini to generate a formal report summary, executive summary, timeline, and suggested actions.
   */
  async generateReportAssistant(
    reportTitle: string,
    reportDescription: string,
    detectionResults?: AIDetectionResult[],
  ): Promise<ReportAssistantResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert civic report assistant. Based on the report details and the object detection results below, generate a formal report summary, an executive summary, a factual event timeline, and suggested actions.

      Report Title: ${reportTitle}
      Report Description: ${reportDescription}
      Detection Insights: ${JSON.stringify(detectionResults || [])}

      Adhere strictly to the Evidence-First Philosophy. Maintain absolute neutrality, documenting only visible and verifiable facts. Do not assume intent or draw legal conclusions.

      Return a JSON object with the following structure:
      {
        "reportSummary": "Concise 2-3 sentence summary.",
        "executiveSummary": "Detailed, formal overview of the situation and its impact.",
        "timeline": [
          { "timestamp": "relative time or frame reference if available, else sequential", "event": "neutral description of event" }
        ],
        "suggestedActions": ["Action item 1", "Action item 2", ...]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const fallback: ReportAssistantResult = {
        reportSummary: '',
        executiveSummary: '',
        timeline: [],
        suggestedActions: [],
      };

      return this.parseJSONResponse<ReportAssistantResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during generateReportAssistant execution', error);
      throw error;
    }
  }

  /**
   * 3. Communication Generation: Generates tailored letters/submissions for Mayor, Councillor, Municipal Department, Media, and Community Newsletter using Gemini.
   */
  async generateCommunications(
    reportData: {
      title: string;
      description: string;
      assistantResult: ReportAssistantResult;
    },
    tone?: string,
  ): Promise<CommunicationGenerationResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are a public communications expert working on civic engagement. Based on the following factual report summary and executive insights, generate five tailored formal letters/submissions/articles for different target audiences.

      Title: ${reportData.title}
      Factual Summary: ${reportData.assistantResult.reportSummary}
      Executive Summary: ${reportData.assistantResult.executiveSummary}
      Suggested Actions: ${reportData.assistantResult.suggestedActions.join(', ')}
      Requested Tone: ${tone || 'Professional'}

      Generate high-quality communication drafts for each of the following audiences tailored to the requested tone (${tone || 'Professional'}):
      1. Mayor: A formal letter urging executive attention and policy-level consideration.
      2. Councillor: A localized letter focused on district representation and constituent impact.
      3. Municipal Department: A detailed technical submission highlighting specific action items and infrastructure/service requests.
      4. Media: A neutral press release summarizing the facts, community impact, and call to action.
      5. Community Newsletter: An informative, engaging article summarizing the report for local residents and calling for collective neighborhood awareness or participation.

      Adhere strictly to the Evidence-First Philosophy. Do not include defamatory, speculative, or highly charged emotional language. Keep the overall delivery aligned with a ${tone || 'Professional'} tone, while remaining constructive and fact-driven.

      Return a JSON object with the following structure:
      {
        "mayorLetter": "Full text of the letter...",
        "councillorLetter": "Full text of the letter...",
        "municipalDepartmentSubmission": "Full text of the submission...",
        "mediaRelease": "Full text of the press release...",
        "communityNewsletterArticle": "Full text of the article..."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const fallback: CommunicationGenerationResult = {
        mayorLetter: 'Failed to generate letter to Mayor.',
        councillorLetter: 'Failed to generate letter to Councillor.',
        municipalDepartmentSubmission: 'Failed to generate submission to Municipal Department.',
        mediaRelease: 'Failed to generate Media release.',
        communityNewsletterArticle: 'Failed to generate Community Newsletter article.',
      };

      return this.parseJSONResponse<CommunicationGenerationResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during generateCommunications execution', error);
      throw error;
    }
  }

  /**
   * 4. Moderation: Checks for defamation, harassment, doxxing, and hate speech using Gemini.
   */
  async moderateContent(text: string): Promise<ModerationResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert AI content moderator for a civic engagement platform. Analyze the text below for violations: defamation, harassment, doxxing, and hate speech.

      Text to analyze: "${text}"

      Definitions:
      - Defamation: Unsubstantiated false statements damaging a person's reputation.
      - Harassment: Intimidating, abusive, or hostile text targeting individuals.
      - Doxxing: Publishing private or personally identifying information without consent.
      - Hate Speech: Content attacking protected groups based on race, ethnicity, religion, gender, sexual orientation, disability, etc.

      Evaluate the content objectively.
      Return a JSON object matching this structure:
      {
        "aiFlagged": true/false,
        "aiConfidence": 0.95, // float between 0.0 and 1.0
        "aiReasoning": "Detailed explanation of why it was flagged or why it is clean.",
        "aiRiskCategory": "Defamation" | "Harassment" | "Doxxing" | "Hate Speech" | "None"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const fallback: ModerationResult = {
        aiFlagged: false,
        aiConfidence: 0.0,
        aiReasoning: 'Failed to run automated content moderation.',
        aiRiskCategory: 'None',
      };

      return this.parseJSONResponse<ModerationResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during moderateContent execution', error);
      throw error;
    }
  }

  /**
   * 5. Evidence Comparison: Compares before and after images to verify civic repairs.
   * Adheres to the Evidence-First Philosophy.
   */
  async compareEvidence(
    beforeBuffer: Buffer,
    afterBuffer: Buffer,
  ): Promise<EvidenceComparisonResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
      Compare these two images (Before vs After) for a civic repair. Identify if the issue (e.g., pothole, graffiti, illegal dumping) has been resolved.
      Adhere strictly to the Evidence-First Philosophy: maintain absolute neutrality and document only visible facts.

      Return your response strictly as a JSON object matching this structure:
      {
        "resolutionConfidence": 0.95, // float between 0.0 and 1.0
        "descriptionOfWork": "A neutral, factual narrative describing the changes observed between the before and after images.",
        "isResolved": true/false
      }
    `;

    const parts = [
      prompt,
      {
        inlineData: {
          data: beforeBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
      {
        inlineData: {
          data: afterBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ];

    try {
      const result = await model.generateContent(parts);
      const responseText = result.response.text();

      const fallback: EvidenceComparisonResult = {
        resolutionConfidence: 0.0,
        descriptionOfWork: 'Failed to compare evidence images.',
        isResolved: false,
      };

      return this.parseJSONResponse<EvidenceComparisonResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during compareEvidence execution', error);
      throw error;
    }
  }

  /**
   * 6. Trend Detection: Analyzes clusters of reports to identify emerging civic trends.
   */
  async detectCivicTrends(clusterData: any): Promise<CivicTrendResult> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
      Analyze this cluster of civic reports from a specific neighborhood. Identify recurring patterns, emerging issues, or infrastructure failures.
      Cluster Data: ${JSON.stringify(clusterData)}

      Return your response strictly as a JSON object matching this structure:
      {
        "trendTitle": "Short descriptive title of the trend",
        "trendDescription": "Detailed analysis of the patterns identified in the reports.",
        "affectedAreas": ["Street Name 1", "Zone A", ...],
        "confidenceScore": 0.85, // float between 0.0 and 1.0
        "tags": ["tag1", "tag2", ...]
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const fallback: CivicTrendResult = {
        trendTitle: 'Unknown Trend',
        trendDescription: 'Analysis failed to identify significant patterns.',
        affectedAreas: [],
        confidenceScore: 0.0,
        tags: [],
      };

      return this.parseJSONResponse<CivicTrendResult>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during detectCivicTrends execution', error);
      throw error;
    }
  }

  /**
   * 7. Civic Health Report: Generates a professional Quarterly Report based on report and metric data.
   */
  async generateCivicHealthReport(
    reportData: any,
    metricData: any,
  ): Promise<CivicHealthReport> {
    if (!this.genAI) {
      throw new Error('Google Generative AI client is not initialized. Check GEMINI_API_KEY.');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `
      Generate a professional "Civic Health Quarterly Report" based on the following report data and metrics.

      Report Data Summary: ${JSON.stringify(reportData)}
      Metrics: ${JSON.stringify(metricData)}

      The report should include:
      - Issues Submitted
      - Issues Resolved
      - Avg Response Time
      - Top Concerns
      - Emerging Concerns

      Return your response strictly as a JSON object matching this structure:
      {
        "reportContent": "Full markdown-formatted report text, professional and comprehensive.",
        "summary": {
          "issuesSubmittedCount": 123,
          "issuesResolvedCount": 100,
          "avgResponseTime": "4.5 days",
          "topConcerns": ["Concern 1", ...],
          "emergingConcerns": ["Concern A", ...]
        }
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const fallback: CivicHealthReport = {
        reportContent: 'Failed to generate civic health report.',
        summary: {
          issuesSubmittedCount: 0,
          issuesResolvedCount: 0,
          avgResponseTime: 'N/A',
          topConcerns: [],
          emergingConcerns: [],
        },
      };

      return this.parseJSONResponse<CivicHealthReport>(responseText, fallback);
    } catch (error) {
      this.logger.error('Error during generateCivicHealthReport execution', error);
      throw error;
    }
  }
}
