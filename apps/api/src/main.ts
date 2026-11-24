import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import { JsonLoggerService } from './common/logging/json-logger.service';
import { readPositiveInt } from './common/where-builder';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function readCorsOrigins(): string[] {
  const configured = process.env.CORS_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (configured && configured.length > 0) {
    return configured;
  }

  return DEFAULT_CORS_ORIGINS;
}

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    if (
      process.env.ALLOW_DEMO_PASSWORD_AUTH === '1' ||
      process.env.DB_DISABLE === '1' ||
      process.env.ALLOW_INSECURE_HEADER_AUTH === '1'
    ) {
      throw new Error(
        'ALLOW_DEMO_PASSWORD_AUTH, DB_DISABLE and ALLOW_INSECURE_HEADER_AUTH cannot be enabled in production',
      );
    }
  }

  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(JsonLoggerService));
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  if (process.env.TRUST_PROXY === '1') {
    expressApp.set('trust proxy', 1);
  }

  expressApp.disable('x-powered-by');
  expressApp.use(
    helmet({
      // CSP is handled at reverse proxy/web layer for this monorepo.
      contentSecurityPolicy: false,
    }),
  );

  const authRateLimitWindowMs = readPositiveInt(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  );
  const authRateLimitMax = readPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 30);

  expressApp.use(
    '/auth/login',
    rateLimit({
      windowMs: authRateLimitWindowMs,
      max: authRateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  expressApp.use(
    '/auth/refresh',
    rateLimit({
      windowMs: authRateLimitWindowMs,
      max: authRateLimitMax * 2,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.enableCors({
    origin: readCorsOrigins(),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,x-request-id',
    exposedHeaders: 'x-request-id',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const enableSwagger =
    process.env.ENABLE_SWAGGER === '1' || process.env.NODE_ENV !== 'production';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('TekaBiblio')
      .setDescription('APIs del proyecto TekaBiblio')
      .setVersion('1.0')
      .addTag('biblio')
      .build();

    const documentFactory = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1', app, documentFactory);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
