import { Injectable } from '@nestjs/common';
import { CreateCopyDto } from './dto/create-copy.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListCopiesDto } from './dto/list-copies.dto';
import { ListMaterialsDto } from './dto/list-materials.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MaterialsRepository } from './materials.repository';
import { CopyRecord, CopyStatus, MaterialRecord } from './materials.types';

@Injectable()
export class MaterialsService {
  constructor(private readonly materialsRepository: MaterialsRepository) {}

  async listMaterials(): Promise<MaterialRecord[]> {
    return this.materialsRepository.listMaterials();
  }

  async searchMaterials(query: ListMaterialsDto): Promise<{
    items: MaterialRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.materialsRepository.searchMaterials(query);
  }

  async listCopies(): Promise<CopyRecord[]> {
    return this.materialsRepository.listCopies();
  }

  async searchCopies(query: ListCopiesDto): Promise<{
    items: CopyRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.materialsRepository.searchCopies(query);
  }

  async createMaterial(input: CreateMaterialDto): Promise<MaterialRecord> {
    return this.materialsRepository.createMaterial(input);
  }

  async updateMaterial(
    materialId: string,
    input: UpdateMaterialDto,
  ): Promise<MaterialRecord> {
    return this.materialsRepository.updateMaterial(materialId, input);
  }

  async deleteMaterial(
    materialId: string,
  ): Promise<{ deleted: boolean; materialId: string }> {
    return this.materialsRepository.deleteMaterial(materialId);
  }

  async createCopy(input: CreateCopyDto): Promise<CopyRecord> {
    return this.materialsRepository.createCopy(input);
  }

  async getMaterialOrThrow(materialId: string): Promise<MaterialRecord> {
    return this.materialsRepository.getMaterialOrThrow(materialId);
  }

  async getCopyOrThrow(copyId: string): Promise<CopyRecord> {
    return this.materialsRepository.getCopyOrThrow(copyId);
  }

  async lockCopy(copyId: string): Promise<CopyRecord> {
    return this.materialsRepository.lockCopy(copyId);
  }

  async findAvailableCopy(
    materialId: string,
    branchId: string,
  ): Promise<CopyRecord | undefined> {
    return this.materialsRepository.findAvailableCopy(materialId, branchId);
  }

  async claimAvailableCopy(
    copyId: string,
    status: CopyStatus,
  ): Promise<CopyRecord> {
    return this.materialsRepository.claimAvailableCopy(copyId, status);
  }

  async updateCopyStatus(
    copyId: string,
    status: CopyStatus,
  ): Promise<CopyRecord> {
    return this.materialsRepository.updateCopyStatus(copyId, status);
  }
}
