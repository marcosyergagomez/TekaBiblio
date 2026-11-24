import { Module, forwardRef } from '@nestjs/common';
import { MaterialsModule } from '../materials/materials.module';
import { PenaltiesModule } from '../penalties/penalties.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { LoansController } from './loans.controller';
import { LoanDomainPolicyService } from './loan-domain-policy.service';
import { LoansRepository } from './loans.repository';
import { LoansService } from './loans.service';

@Module({
  imports: [
    MaterialsModule,
    ReservationsModule,
    forwardRef(() => PenaltiesModule),
  ],
  controllers: [LoansController],
  providers: [LoansService, LoansRepository, LoanDomainPolicyService],
  exports: [LoansService],
})
export class LoansModule {}
