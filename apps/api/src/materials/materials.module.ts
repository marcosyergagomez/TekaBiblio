import { Module } from '@nestjs/common';
import { MaterialsController, MembersController } from './materials.controller';
import { MaterialsRepository } from './materials.repository';
import { MaterialsService } from './materials.service';

@Module({
  controllers: [MaterialsController, MembersController],
  providers: [MaterialsService, MaterialsRepository],
  exports: [MaterialsService],
})
export class MaterialsModule {}
