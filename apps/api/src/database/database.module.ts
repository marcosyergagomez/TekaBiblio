import { Global, Module } from '@nestjs/common';
import { SqlStoreService } from './sql-store.service';

@Global()
@Module({
  providers: [SqlStoreService],
  exports: [SqlStoreService],
})
export class DatabaseModule {}
