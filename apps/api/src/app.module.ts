import { Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { LoansModule } from './loans/loans.module';
import { MaterialsModule } from './materials/materials.module';
import { PaymentsModule } from './payments/payments.module';
import { PenaltiesModule } from './penalties/penalties.module';
import { ReportsModule } from './reports/reports.module';
import { ReservationsModule } from './reservations/reservations.module';
@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule,
    MaterialsModule,
    LoansModule,
    ReservationsModule,
    ReportsModule,
    PenaltiesModule,
    PaymentsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
