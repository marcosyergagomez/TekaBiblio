import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { SqlStoreService } from '../database/sql-store.service';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListCopiesDto } from './dto/list-copies.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateCopyStatusDto } from './dto/update-copy-status.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsService } from './materials.service';

@Controller()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Public()
  @Get('materials')
  async listMaterials(
    @Query() query: ListMaterialsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const scopedQuery: ListMaterialsDto = {
      ...query,
    };

    if (
      (req.user?.role === UserRole.ADMIN_SEDE ||
        req.user?.role === UserRole.BIBLIOTECARIO) &&
      req.user.branchId
    ) {
      scopedQuery.homeBranchId = scopedQuery.homeBranchId ?? req.user.branchId;
    }

    return this.materialsService.searchMaterials(scopedQuery);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('materials')
  async createMaterial(@Body() body: CreateMaterialDto) {
    return this.materialsService.createMaterial(body);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Patch('materials/:materialId')
  async updateMaterial(
    @Param('materialId') materialId: string,
    @Body() body: UpdateMaterialDto,
  ) {
    return this.materialsService.updateMaterial(materialId, body);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE)
  @Delete('materials/:materialId')
  async deleteMaterial(@Param('materialId') materialId: string) {
    return this.materialsService.deleteMaterial(materialId);
  }

  @Public()
  @Get('copies')
  async listCopies(
    @Query() query: ListCopiesDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const scopedQuery: ListCopiesDto = {
      ...query,
    };

    if (
      (req.user?.role === UserRole.ADMIN_SEDE ||
        req.user?.role === UserRole.BIBLIOTECARIO) &&
      req.user.branchId
    ) {
      scopedQuery.branchId = scopedQuery.branchId ?? req.user.branchId;
    }

    return this.materialsService.searchCopies(scopedQuery);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('copies')
  async createCopy(@Body() body: CreateCopyDto) {
    return this.materialsService.createCopy(body);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Patch('copies/:copyId/status')
  async updateCopyStatus(
    @Param('copyId') copyId: string,
    @Body() body: UpdateCopyStatusDto,
  ) {
    return this.materialsService.updateCopyStatus(copyId, body.status);
  }
}

type MemberListItem = {
  id: string;
  fullName: string;
  membershipLevel: string;
  homeBranchId: string;
};

@Controller('members')
export class MembersController {
  constructor(private readonly sqlStore: SqlStoreService) {}

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Get()
  async list(): Promise<{ items: MemberListItem[] }> {
    if (!this.sqlStore.isEnabled()) {
      return { items: [] };
    }

    const rows = await this.sqlStore.query<
      MemberListItem & import('mysql2/promise').RowDataPacket
    >(
      `SELECT m.id AS id, u.full_name AS fullName, m.membership_level AS membershipLevel,
              m.home_branch_id AS homeBranchId
       FROM members m
       INNER JOIN users u ON u.id = m.user_id
       ORDER BY u.full_name ASC`,
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        membershipLevel: row.membershipLevel,
        homeBranchId: row.homeBranchId,
      })),
    };
  }
}
