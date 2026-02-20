import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { DomainGroup } from './domain-group.entity';
import { CreateDomainGroupDto } from './dtos/create-domain-group.dto';
import { UpdateDomainGroupDto } from './dtos/update-domain-group.dto';

export interface DomainGroupResponse {
  id: number;
  name: string;
  description: string | null;
}

function toResponse(g: DomainGroup): DomainGroupResponse {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? null,
  };
}

@Injectable()
export class DomainGroupService {
  constructor(
    @InjectRepository(DomainGroup)
    private readonly groupRepo: EntityRepository<DomainGroup>,
  ) {}

  async findAll(): Promise<DomainGroupResponse[]> {
    const list = await this.groupRepo.findAll({ orderBy: { name: 'ASC' } });
    return list.map(toResponse);
  }

  async findOne(id: number): Promise<DomainGroupResponse> {
    const group = await this.groupRepo.findOne({ id });
    if (!group) {
      throw new NotFoundException(`Group dengan id ${id} tidak ditemukan`);
    }
    return toResponse(group);
  }

  async create(dto: CreateDomainGroupDto): Promise<DomainGroupResponse> {
    const now = new Date();
    const group = this.groupRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await this.groupRepo.persistAndFlush(group);
    return toResponse(group);
  }

  async update(id: number, dto: UpdateDomainGroupDto): Promise<DomainGroupResponse> {
    const group = await this.groupRepo.findOne({ id });
    if (!group) {
      throw new NotFoundException(`Group dengan id ${id} tidak ditemukan`);
    }
    if (dto.name !== undefined) group.name = dto.name;
    if (dto.description !== undefined) group.description = dto.description ?? null;
    await this.groupRepo.flush();
    return toResponse(group);
  }

  async remove(id: number): Promise<void> {
    const group = await this.groupRepo.findOne({ id });
    if (!group) {
      throw new NotFoundException(`Group dengan id ${id} tidak ditemukan`);
    }
    await this.groupRepo.removeAndFlush(group);
  }
}
