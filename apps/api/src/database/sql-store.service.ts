import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  createPool,
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { readPositiveInt } from '../common/where-builder';

const EMPTY_RESULT = {
  affectedRows: 0,
  insertId: 0,
};

@Injectable()
export class SqlStoreService implements OnModuleDestroy {
  private pool: Pool | null = null;
  private poolPromise: Promise<Pool> | null = null;
  private readonly enabled: boolean;
  private readonly activeConnection = new AsyncLocalStorage<PoolConnection>();

  constructor() {
    if (
      process.env.DB_DISABLE === '1' &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new Error('DB_DISABLE cannot be enabled in production');
    }

    // Tests used to disable MySQL implicitly. E2E now hits a real database.
    // Unit tests construct repositories without this store. DB_DISABLE=1
    // remains an explicit switch for auth contract tests.
    this.enabled = process.env.DB_DISABLE !== '1';
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

    const connection = await this.currentConnection();
    const [rows] = await connection.query<T[]>(sql, params);
    return rows;
  }

  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<Pick<ResultSetHeader, 'affectedRows' | 'insertId'>> {
    if (!this.enabled) {
      return EMPTY_RESULT;
    }

    const connection = await this.currentConnection();
    const [result] = await connection.execute<ResultSetHeader>(sql, params);
    return result;
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (!this.enabled) {
      return work();
    }

    const pool = await this.getPool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await this.activeConnection.run(connection, work);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.poolPromise = null;
  }

  private async currentConnection(): Promise<Pool | PoolConnection> {
    return this.activeConnection.getStore() ?? this.getPool();
  }

  private getPool(): Promise<Pool> {
    if (!this.poolPromise) {
      this.poolPromise = this.createPool().catch((error: unknown) => {
        this.poolPromise = null;
        throw error;
      });
    }

    return this.poolPromise;
  }

  private async createPool(): Promise<Pool> {
    const pool = createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: readPositiveInt(process.env.DB_PORT, 3306),
      user: process.env.DB_USER ?? 'root',
      password: this.resolvePassword(),
      database: process.env.DB_NAME ?? 'tekabiblio',
      waitForConnections: true,
      connectionLimit: readPositiveInt(process.env.DB_POOL_SIZE, 10),
      queueLimit: readPositiveInt(process.env.DB_QUEUE_LIMIT, 50),
      connectTimeout: 10_000,
      enableKeepAlive: true,
      decimalNumbers: true,
      timezone: 'Z',
    });

    try {
      await pool.query('SELECT 1');
    } catch (error) {
      await pool.end();
      throw error;
    }

    this.pool = pool;
    return pool;
  }

  private resolvePassword(): string {
    const password = process.env.DB_PASSWORD;
    if (process.env.NODE_ENV === 'production') {
      if (!password || password === 'root' || password.length < 12) {
        throw new Error(
          'DB_PASSWORD must be a non-default value of at least 12 characters in production',
        );
      }

      return password;
    }

    return password ?? 'root';
  }
}

export function assertMemoryStoreIsTestOnly(
  sqlStore: { isEnabled(): boolean } | undefined,
  owner: string,
): void {
  if (sqlStore?.isEnabled()) {
    return;
  }

  if (process.env.NODE_ENV === 'test' || process.env.DB_DISABLE === '1') {
    return;
  }

  throw new Error(
    `${owner} requires MySQL. In-memory persistence is only available in unit tests or when DB_DISABLE=1.`,
  );
}
