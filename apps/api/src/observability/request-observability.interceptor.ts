import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ObservabilityService } from './observability.service';

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestObservabilityInterceptor.name);

  constructor(private readonly observability: ObservabilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      path: string;
      headers: Record<string, string | string[] | undefined>;
      user?: { userId?: string; role?: string };
      route?: { path?: string };
    }>();
    const response = http.getResponse<{
      setHeader: (name: string, value: string) => void;
      statusCode: number;
    }>();

    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.trim().length > 0
        ? requestIdHeader
        : randomUUID();

    response.setHeader('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const finishedAt = process.hrtime.bigint();
        const durationMs = Number(finishedAt - startedAt) / 1_000_000;
        const route = request.route?.path ?? request.path;

        this.observability.recordHttpRequest({
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs,
        });

        if (response.statusCode === 401 && request.path.startsWith('/auth')) {
          this.observability.recordAuthFailure(request.path);
        }

        const slowThresholdMs = Number(
          process.env.REQUEST_SLOW_THRESHOLD_MS ?? 1000,
        );

        const payload = {
          event: 'http_request',
          requestId,
          method: request.method,
          path: request.path,
          route,
          statusCode: response.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
          userId: request.user?.userId,
          userRole: request.user?.role,
        };

        if (durationMs >= slowThresholdMs) {
          this.logger.warn(JSON.stringify({ ...payload, slow: true }));
          return;
        }

        this.logger.log(JSON.stringify(payload));
      }),
    );
  }
}
