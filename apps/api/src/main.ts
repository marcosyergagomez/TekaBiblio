import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';
import { JsonLoggerService } from './common/logging/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(JsonLoggerService));
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.disable('x-powered-by');
  expressApp.use(
    helmet({
      // CSP is handled at reverse proxy/web layer for this monorepo.
      contentSecurityPolicy: false,
    }),
  );

  const authRateLimitWindowMs = Number(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
  );
  const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 30);

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
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ],
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
      .setTitle('TekaBliblio')
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
