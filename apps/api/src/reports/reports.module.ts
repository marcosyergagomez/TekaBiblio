import { Module } from '@nestjs/common';
import { LoansModule } from '../loans/loans.module';
import { MaterialsModule } from '../materials/materials.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [LoansModule, MaterialsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
