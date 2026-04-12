import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';

@Injectable()
export class SqlStoreService implements OnModuleDestroy {
  private pool: Pool | null = null;
  private readonly enabled: boolean;

  constructor() {
    this.enabled =
      process.env.NODE_ENV !== 'test' && process.env.DB_DISABLE !== '1';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async query<T extends RowDataPacket>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    if (!this.enabled) {
      return [];
    }

    const pool = await this.getPool();
    const [rows] = await pool.query<T[]>(sql, params);
    return rows;
  }

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const pool = await this.getPool();
    await pool.execute(sql, params);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private async getPool(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    this.pool = createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? 'root',
      database: process.env.DB_NAME ?? 'tekabiblio',
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
      queueLimit: 0,
      decimalNumbers: true,
      timezone: 'Z',
    });

    await this.pool.query('SELECT 1');
    return this.pool;
  }
}
