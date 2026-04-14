import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JsonLoggerService } from '../common/logging/json-logger.service';
import { MetricsController } from './metrics.controller';
import { ObservabilityService } from './observability.service';
import { RequestObservabilityInterceptor } from './request-observability.interceptor';

@Module({
  controllers: [MetricsController],
  providers: [
    ObservabilityService,
    JsonLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestObservabilityInterceptor,
    },
  ],
  exports: [ObservabilityService, JsonLoggerService],
})
export class ObservabilityModule {}
