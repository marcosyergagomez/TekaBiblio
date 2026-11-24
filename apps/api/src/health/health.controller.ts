import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SqlStoreService } from '../database/sql-store.service';

@Controller('health')
export class HealthController {
  constructor(private readonly sqlStore: SqlStoreService) {}

  @Public()
  @Get()
  @HttpCode(200)
  async check(): Promise<{ status: string }> {
    if (this.sqlStore.isEnabled()) {
      try {
        await this.sqlStore.query('SELECT 1 AS ok');
      } catch {
        throw new ServiceUnavailableException({ status: 'degraded' });
      }
    }

    return { status: 'ok' };
  }
}
