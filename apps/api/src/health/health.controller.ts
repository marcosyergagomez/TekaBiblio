import { Controller, Get, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health') // base path
export class HealthController {
  @Public()
  @Get()
  @HttpCode(200)
  check() {
    return { status: 'ok' };
  }
}
