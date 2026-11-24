import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LoansModule } from '../loans/loans.module';
import { PenaltiesController } from './penalties.controller';
import { PenaltiesRepository } from './penalties.repository';
import { PenaltiesService } from './penalties.service';

@Module({
  imports: [forwardRef(() => LoansModule), AuditModule],
  controllers: [PenaltiesController],
  providers: [PenaltiesService, PenaltiesRepository],
  exports: [PenaltiesService, PenaltiesRepository],
})
export class PenaltiesModule {}
