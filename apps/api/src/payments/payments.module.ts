import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PenaltiesModule } from '../penalties/penalties.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PenaltiesModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
