import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import { MaterialType } from '../loans/loan-policies';
import { paginateFromQuery } from '../common/pagination';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListCopiesDto } from './dto/list-copies.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CopyRecord, CopyStatus, MaterialRecord } from './materials.types';

type MaterialRow = RowDataPacket & {
  id: string;
  title: string;
  materialType: string;
  releaseDate: Date | string;
  homeBranchId: string;
  basePrice: number;
};

type CopyRow = RowDataPacket & {
  id: string;
  materialId: string;
  branchId: string;
  status: string;
};

@Injectable()
export class MaterialsRepository {
  private readonly materials = new Map<string, MaterialRecord>();
  private readonly copies = new Map<string, CopyRecord>();

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {
    if (!this.isSqlEnabled()) {
      this.bootstrapInMemorySeed();
    }
  }

  async listMaterials(): Promise<MaterialRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.materials.values());
    }

    const rows = await this.sqlStore!.query<MaterialRow>(
      `SELECT id, title, material_type AS materialType, release_date AS releaseDate,
              home_branch_id AS homeBranchId, base_price AS basePrice
       FROM materials
       ORDER BY title ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      materialType: row.materialType as MaterialRecord['materialType'],
      releaseDate: this.dateToIsoDate(row.releaseDate),
      homeBranchId: row.homeBranchId,
      basePrice: Number(row.basePrice),
    }));
  }

  async listCopies(): Promise<CopyRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.copies.values());
    }

    const rows = await this.sqlStore!.query<CopyRow>(
      `SELECT id, material_id AS materialId, branch_id AS branchId, status
       FROM copies
       ORDER BY id ASC`,
    );

    return rows.map((row) => ({
      id: row.id,
      materialId: row.materialId,
      branchId: row.branchId,
      status: row.status as CopyStatus,
    }));
  }

  async createMaterial(input: CreateMaterialDto): Promise<MaterialRecord> {
    const material: MaterialRecord = {
      id: `mat_${randomUUID().slice(0, 8)}`,
      title: input.title,
      materialType: input.materialType,
      releaseDate: input.releaseDate,
      homeBranchId: input.homeBranchId,
      basePrice: input.basePrice,
    };

    if (!this.isSqlEnabled()) {
      this.materials.set(material.id, material);
      return material;
    }

    await this.sqlStore!.execute(
      `INSERT INTO materials (id, title, material_type, release_date, home_branch_id, base_price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        material.id,
        material.title,
        material.materialType,
        material.releaseDate,
        material.homeBranchId,
        material.basePrice,
      ],
    );

    return material;
  }

  async createCopy(input: CreateCopyDto): Promise<CopyRecord> {
    await this.getMaterialOrThrow(input.materialId);

    const copy: CopyRecord = {
      id: `copy_${randomUUID().slice(0, 8)}`,
      materialId: input.materialId,
      branchId: input.branchId,
      status: CopyStatus.AVAILABLE,
    };

    if (!this.isSqlEnabled()) {
      this.copies.set(copy.id, copy);
      return copy;
    }

    await this.sqlStore!.execute(
      `INSERT INTO copies (id, material_id, branch_id, inventory_code, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        copy.id,
        copy.materialId,
        copy.branchId,
        `INV-${copy.id.toUpperCase()}`,
        copy.status,
      ],
    );

    return copy;
  }

  async getMaterialOrThrow(materialId: string): Promise<MaterialRecord> {
    if (!this.isSqlEnabled()) {
      const material = this.materials.get(materialId);
      if (!material) {
        throw new NotFoundException(`Material ${materialId} not found`);
      }

      return material;
    }

    const rows = await this.sqlStore!.query<MaterialRow>(
      `SELECT id, title, material_type AS materialType, release_date AS releaseDate,
              home_branch_id AS homeBranchId, base_price AS basePrice
       FROM materials
       WHERE id = ?
       LIMIT 1`,
      [materialId],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Material ${materialId} not found`);
    }

    return {
      id: row.id,
      title: row.title,
      materialType: row.materialType as MaterialRecord['materialType'],
      releaseDate: this.dateToIsoDate(row.releaseDate),
      homeBranchId: row.homeBranchId,
      basePrice: Number(row.basePrice),
    };
  }

  async getCopyOrThrow(copyId: string): Promise<CopyRecord> {
    if (!this.isSqlEnabled()) {
      const copy = this.copies.get(copyId);
      if (!copy) {
        throw new NotFoundException(`Copy ${copyId} not found`);
      }

      return copy;
    }

    const rows = await this.sqlStore!.query<CopyRow>(
      `SELECT id, material_id AS materialId, branch_id AS branchId, status
       FROM copies
       WHERE id = ?
       LIMIT 1`,
      [copyId],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Copy ${copyId} not found`);
    }

    return {
      id: row.id,
      materialId: row.materialId,
      branchId: row.branchId,
      status: row.status as CopyStatus,
    };
  }

  async updateCopyStatus(
    copyId: string,
    status: CopyStatus,
  ): Promise<CopyRecord> {
    const copy = await this.getCopyOrThrow(copyId);

    if (!this.isSqlEnabled()) {
      copy.status = status;
      this.copies.set(copyId, copy);
      return copy;
    }

    await this.sqlStore!.execute(`UPDATE copies SET status = ? WHERE id = ?`, [
      status,
      copyId,
    ]);
    return {
      ...copy,
      status,
    };
  }

  async searchMaterials(query: ListMaterialsDto): Promise<{
    items: MaterialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let items = await this.listMaterials();

    if (query.q) {
      const normalized = query.q.toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(normalized),
      );
    }

    if (query.materialType) {
      items = items.filter((item) => item.materialType === query.materialType);
    }

    if (query.homeBranchId) {
      items = items.filter((item) => item.homeBranchId === query.homeBranchId);
    }

    if (query.availableOnly) {
      const copies = await this.listCopies();
      const availableMaterialIds = new Set(
        copies
          .filter((copy) => copy.status === CopyStatus.AVAILABLE)
          .map((copy) => copy.materialId),
      );
      items = items.filter((item) => availableMaterialIds.has(item.id));
    }

    return paginateFromQuery(items, query, 20);
  }

  async searchCopies(query: ListCopiesDto): Promise<{
    items: CopyRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let items = await this.listCopies();

    if (query.materialId) {
      items = items.filter((item) => item.materialId === query.materialId);
    }

    if (query.branchId) {
      items = items.filter((item) => item.branchId === query.branchId);
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    return paginateFromQuery(items, query, 20);
  }

  async updateMaterial(
    materialId: string,
    input: UpdateMaterialDto,
  ): Promise<MaterialRecord> {
    const current = await this.getMaterialOrThrow(materialId);
    const next: MaterialRecord = {
      ...current,
      title: input.title ?? current.title,
      materialType: input.materialType ?? current.materialType,
      releaseDate: input.releaseDate ?? current.releaseDate,
      homeBranchId: input.homeBranchId ?? current.homeBranchId,
      basePrice: input.basePrice ?? current.basePrice,
    };

    if (!this.isSqlEnabled()) {
      this.materials.set(materialId, next);
      return next;
    }

    await this.sqlStore!.execute(
      `UPDATE materials
       SET title = ?, material_type = ?, release_date = ?, home_branch_id = ?, base_price = ?
       WHERE id = ?`,
      [
        next.title,
        next.materialType,
        next.releaseDate,
        next.homeBranchId,
        next.basePrice,
        materialId,
      ],
    );

    return next;
  }

  async deleteMaterial(
    materialId: string,
  ): Promise<{ deleted: boolean; materialId: string }> {
    await this.getMaterialOrThrow(materialId);

    if (!this.isSqlEnabled()) {
      const hasCopies = Array.from(this.copies.values()).some(
        (copy) => copy.materialId === materialId,
      );
      if (hasCopies) {
        throw new ConflictException(
          `Cannot delete material ${materialId} because copies still exist`,
        );
      }

      this.materials.delete(materialId);
      return { deleted: true, materialId };
    }

    const references = await this.sqlStore!.query<
      RowDataPacket & { total: number }
    >('SELECT COUNT(*) AS total FROM copies WHERE material_id = ?', [
      materialId,
    ]);

    if (Number(references[0]?.total ?? 0) > 0) {
      throw new ConflictException(
        `Cannot delete material ${materialId} because copies still exist`,
      );
    }

    await this.sqlStore!.execute('DELETE FROM materials WHERE id = ?', [
      materialId,
    ]);
    return { deleted: true, materialId };
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private bootstrapInMemorySeed(): void {
    if (this.materials.size > 0) {
      return;
    }

    const material: MaterialRecord = {
      id: 'mat_00001',
      title: 'Dune',
      materialType: MaterialType.LIBRO,
      releaseDate: '1965-08-01',
      homeBranchId: 'branch_centro',
      basePrice: 2.5,
    };

    const copy: CopyRecord = {
      id: 'copy_00001',
      materialId: material.id,
      branchId: 'branch_centro',
      status: CopyStatus.AVAILABLE,
    };

    this.materials.set(material.id, material);
    this.copies.set(copy.id, copy);
  }

  private dateToIsoDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
  }
}
