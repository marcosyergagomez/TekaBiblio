import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class ObservabilityService {
  private readonly registry = new Registry();

  private readonly httpRequestDurationSeconds: Histogram<
    'method' | 'route' | 'status_code'
  >;
  private readonly authFailuresTotal: Counter<'route' | 'reason'>;

  constructor() {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'tekabiblio_',
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'tekabiblio_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.authFailuresTotal = new Counter({
      name: 'tekabiblio_auth_failures_total',
      help: 'Total number of authentication failures',
      labelNames: ['route', 'reason'],
      registers: [this.registry],
    });
  }

  recordHttpRequest(input: {
    method: string;
    route: string;
    statusCode: number;
    durationMs: number;
  }): void {
    this.httpRequestDurationSeconds
      .labels(input.method, input.route, String(input.statusCode))
      .observe(input.durationMs / 1000);
  }

  recordAuthFailure(route: string, reason = 'unauthorized'): void {
    this.authFailuresTotal.labels(route, reason).inc();
  }

  async getMetricsSnapshot(): Promise<string> {
    return this.registry.metrics();
  }

  getMetricsContentType(): string {
    return this.registry.contentType;
  }
}
