import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { ObservabilityService } from './observability.service';

@Controller()
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Public()
  @Get('metrics')
  async metrics(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    if (!this.isMetricsRequestAllowed(req.headers.authorization)) {
      throw new UnauthorizedException('Metrics endpoint is not public');
    }

    res.setHeader('Content-Type', this.observability.getMetricsContentType());
    return this.observability.getMetricsSnapshot();
  }

  private isMetricsRequestAllowed(authorization?: string): boolean {
    const configuredToken = process.env.METRICS_TOKEN;
    if (configuredToken) {
      const provided = authorization?.startsWith('Bearer ')
        ? authorization.slice('Bearer '.length)
        : '';
      return this.tokensMatch(provided, configuredToken);
    }

    return process.env.NODE_ENV !== 'production';
  }

  private tokensMatch(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);
    if (
      providedBuffer.length === 0 ||
      providedBuffer.length !== expectedBuffer.length
    ) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
