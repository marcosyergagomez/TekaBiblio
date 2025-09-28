import { Controller, Get, HttpCode } from '@nestjs/common';

@Controller('health') // base path
export class HealthController {
  @Get()              // GET /health
  @HttpCode(200)      // respuesta 200 explícita
  check() {
    return { status: 'ok' };
  }
}
