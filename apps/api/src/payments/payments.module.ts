import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LoansModule } from '../loans/loans.module';
import { PenaltiesModule } from '../penalties/penalties.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PenaltiesModule, LoansModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
