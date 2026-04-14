import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ObservabilityService } from './observability.service';

@Controller()
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Public()
  @Get('metrics')
  async metrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    res.setHeader('Content-Type', this.observability.getMetricsContentType());
    return this.observability.getMetricsSnapshot();
  }
}
