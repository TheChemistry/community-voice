import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { AIService, KeyframeInput } from '../ai/ai.service';
import { MediaService } from '../reports/media.service';
import * as ffmpeg from 'fluent-ffmpeg';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

@Injectable()
export class MediaProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProcessor.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly mediaService: MediaService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      'media-processing',
      async (job: Job<{ attachmentId: string }>) => {
        await this.processMedia(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
  }

  private async processMedia(job: Job<{ attachmentId: string }>): Promise<any> {
    const { attachmentId } = job.data;
    this.logger.log(`Processing media attachment: ${attachmentId}`);

    const attachment = await this.prisma.mediaAttachment.findUnique({
      where: { id: attachmentId },
      include: { report: true },
    });

    if (!attachment) {
      this.logger.error(`Attachment ${attachmentId} not found`);
      return;
    }

    const tempDir = path.join(os.tmpdir(), `media-${attachmentId}`);
    if (!fs.existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    const videoPath = path.join(tempDir, `video-${attachmentId}`);

    try {
      // 1. Download video from S3
      this.logger.log(`Downloading video from S3 for attachment ${attachmentId}`);
      const videoBuffer = await this.mediaService.downloadFile(attachment.s3Key);
      await writeFile(videoPath, videoBuffer);

      // 2. Extract Keyframes
      const keyframesDir = path.join(tempDir, 'keyframes');
      await mkdir(keyframesDir, { recursive: true });

      this.logger.log(`Extracting keyframes for attachment ${attachmentId}`);
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            count: 5,
            folder: keyframesDir,
            filename: 'keyframe-%i.png',
            size: '1280x?',
          })
          .on('end', resolve)
          .on('error', reject);
      });

      const keyframeFiles = fs.readdirSync(keyframesDir).filter((f) => f.endsWith('.png'));
      const keyframeInputs: KeyframeInput[] = await Promise.all(
        keyframeFiles.map(async (file) => {
          const filePath = path.join(keyframesDir, file);
          const buffer = fs.readFileSync(filePath);
          return {
            buffer,
            mimeType: 'image/png',
            timestamp: file.split('-')[1].split('.')[0],
          };
        }),
      );

      // 3. AI Analysis
      this.logger.log(`Running AI analysis for attachment ${attachmentId}`);
      const analysisResult = await this.aiService.analyzeKeyframes(keyframeInputs);

      // 4. Privacy Redaction (MVP: Redact keyframes and generate a redacted thumbnail)
      const redactedKeyframesDir = path.join(tempDir, 'redacted');
      await mkdir(redactedKeyframesDir, { recursive: true });

      this.logger.log(`Applying redaction for attachment ${attachmentId}`);
      for (let i = 0; i < keyframeInputs.length; i++) {
        const input = keyframeInputs[i];
        const fileName = keyframeFiles[i];
        const outputPath = path.join(redactedKeyframesDir, `redacted-${fileName}`);

        const image = sharp(input.buffer);
        const metadata = await image.metadata();

        if (analysisResult.redactionRegions && analysisResult.redactionRegions.length > 0) {
          const compositeOperations: any[] = [];
          for (const region of analysisResult.redactionRegions) {
            const left = Math.round((region.x / 1000) * (metadata.width || 1280));
            const top = Math.round((region.y / 1000) * (metadata.height || 720));
            const width = Math.round((region.width / 1000) * (metadata.width || 1280));
            const height = Math.round((region.height / 1000) * (metadata.height || 720));

            const safeLeft = Math.max(0, left);
            const safeTop = Math.max(0, top);
            const safeWidth = Math.min(width, (metadata.width || 1280) - safeLeft);
            const safeHeight = Math.min(height, (metadata.height || 720) - safeTop);

            if (safeWidth > 0 && safeHeight > 0) {
              const blurredRegion = await sharp(input.buffer)
                .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
                .blur(20)
                .toBuffer();

              compositeOperations.push({
                input: blurredRegion,
                top: safeTop,
                left: safeLeft,
              });
            }
          }
          if (compositeOperations.length > 0) {
            await image.composite(compositeOperations).toFile(outputPath);
          } else {
            await image.toFile(outputPath);
          }
        } else {
          await image.toFile(outputPath);
        }
      }

      // Upload the first redacted keyframe as the redactedUrl (MVP)
      const representativeRedactedKeyframe = fs.readFileSync(
        path.join(redactedKeyframesDir, `redacted-${keyframeFiles[0]}`),
      );
      const redactedKey = `redacted/${attachment.s3Key.split('/').pop()}-thumbnail.png`;
      const redactedUrl = await this.mediaService.uploadFile(
        redactedKey,
        representativeRedactedKeyframe,
        'image/png',
      );

      // 5. AI Moderation
      let moderationResult = { aiFlagged: false, aiConfidence: 0, aiReasoning: '', aiRiskCategory: 'None' as any };
      if (attachment.report) {
        this.logger.log(`Running AI moderation for report ${attachment.report.id}`);
        moderationResult = await this.aiService.moderateContent(attachment.report.description);
      }

      // 6. Persistence
      this.logger.log(`Updating database for attachment ${attachmentId}`);
      await this.prisma.mediaAttachment.update({
        where: { id: attachmentId },
        data: {
          redactedUrl,
          aiAnalysis: analysisResult as any,
          isFlagged: moderationResult.aiFlagged,
        },
      });

      if (attachment.report) {
        this.logger.log(`Generating report assistant insights for report ${attachment.report.id}`);
        const reportResult = await this.aiService.generateReportAssistant(
          attachment.report.title,
          attachment.report.description,
          [analysisResult],
        );

        await this.prisma.civicReport.update({
          where: { id: attachment.reportId! },
          data: {
            aiSummary: reportResult.executiveSummary,
            aiTimeline: reportResult.timeline as any,
          },
        });

        if (moderationResult.aiFlagged) {
          this.logger.log(`Flagging report ${attachment.report.id} for moderation`);
          await this.prisma.moderationQueue.create({
            data: {
              reportId: attachment.reportId!,
              aiFlagged: true,
              aiConfidence: moderationResult.aiConfidence,
              aiReasoning: moderationResult.aiReasoning,
              aiRiskCategory: moderationResult.aiRiskCategory,
            },
          });
        }
      }

      this.logger.log(`Successfully processed attachment ${attachmentId}`);
    } catch (error) {
      this.logger.error(`Error processing attachment ${attachmentId}: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (cleanupError) {
        this.logger.warn(`Failed to cleanup temp dir ${tempDir}: ${cleanupError.message}`);
      }
    }
  }
}
