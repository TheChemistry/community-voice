import { Controller, Get, UseGuards } from '@nestjs/common';
import { OpenDataService } from './open-data.service';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('api/v1/opendata')
export class OpenDataController {
  constructor(private readonly openDataService: OpenDataService) {}

  @Get()
  getManifest() {
    return this.openDataService.getManifest();
  }

  @Get('reports')
  @UseGuards(ThrottlerGuard)
  getReports() {
    return this.openDataService.getPublicReports();
  }

  @Get('stats')
  @UseGuards(ThrottlerGuard)
  getStats() {
    return this.openDataService.getStats();
  }

  @Get('trends')
  @UseGuards(ThrottlerGuard)
  getTrends() {
    return this.openDataService.getTrends();
  }
}
