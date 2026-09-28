import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AIService } from '../ai/ai.service';

@Injectable()
export class TrendService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
  ) {}

  async detectEmergingTrends() {
    // 1. Fetch recent reports from the last 30 days
    const recentReports = await this.prisma.civicReport.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        attachments: true,
      },
    });

    // 2. Simple clustering by category and distance (within 500m)
    // For a real app, this would be a PostGIS query
    const categories = Array.from(new Set(recentReports.map((r) => r.category)));
    const trends = [];

    for (const category of categories) {
      const reportsInCategory = recentReports.filter((r) => r.category === category);

      // Grouping reports that are close to each other (500m ~ 0.0045 degrees)
      const clusters: any[][] = [];
      const visited = new Set();

      for (let i = 0; i < reportsInCategory.length; i++) {
        if (visited.has(reportsInCategory[i].id)) continue;

        const cluster = [reportsInCategory[i]];
        visited.add(reportsInCategory[i].id);

        for (let j = i + 1; j < reportsInCategory.length; j++) {
          if (visited.has(reportsInCategory[j].id)) continue;

          const distance = this.calculateDistance(
            reportsInCategory[i].latitude,
            reportsInCategory[i].longitude,
            reportsInCategory[j].latitude,
            reportsInCategory[j].longitude,
          );

          if (distance <= 0.5) { // 500m
            cluster.push(reportsInCategory[j]);
            visited.add(reportsInCategory[j].id);
          }
        }

        if (cluster.length >= 3) { // Minimum 3 reports to be considered a trend
          clusters.push(cluster);
        }
      }

      for (const cluster of clusters) {
        const clusterData = {
          reports: cluster.map(r => ({ title: r.title, description: r.description })),
          category
        };

        const aiTrend = await this.aiService.detectCivicTrends(clusterData);

        // Update tags in DB
        await Promise.all(
          cluster.map(r =>
            this.prisma.civicReport.update({
              where: { id: r.id },
              data: {
                aiTrendTags: {
                  set: Array.from(new Set([...r.aiTrendTags, ...aiTrend.tags]))
                }
              }
            })
          )
        );

        trends.push({
          title: aiTrend.trendTitle,
          category,
          description: aiTrend.trendDescription,
          affectedAreas: aiTrend.affectedAreas,
          confidence: aiTrend.confidenceScore,
          tags: aiTrend.tags,
          affectedReports: cluster,
        });
      }
    }

    return trends;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
