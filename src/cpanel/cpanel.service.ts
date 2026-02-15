import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { CpanelData } from './cpanel.entity';
import { CreateCpanelDto } from './dtos/create-cpanel.dto';
import { UpdateCpanelDto } from './dtos/update-cpanel.dto';

@Injectable()
export class CpanelService {
  constructor(
    @InjectRepository(CpanelData)
    private readonly repo: EntityRepository<CpanelData>,
  ) {}

  async findAll(): Promise<CpanelData[]> {
    return this.repo.findAll({ orderBy: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<CpanelData> {
    const item = await this.repo.findOne({ id });
    if (!item) throw new NotFoundException(`CPanel data with id ${id} not found`);
    return item;
  }

  async create(dto: CreateCpanelDto): Promise<CpanelData> {
    const now = new Date();
    const item = this.repo.create({
      ipServer: dto.ipServer,
      username: dto.username,
      password: dto.password,
      package: dto.package ?? null,
      mainDomain: dto.mainDomain ?? null,
      email: dto.email ?? null,
      nameServer: dto.nameServer ?? null,
      status: dto.status ?? null,
      domains: [],
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.persistAndFlush(item);
    return item;
  }

  async update(id: number, dto: UpdateCpanelDto): Promise<CpanelData> {
    const item = await this.findOne(id);
    if (dto.ipServer != null) item.ipServer = dto.ipServer;
    if (dto.username != null) item.username = dto.username;
    if (dto.password != null) item.password = dto.password;
    if (dto.package !== undefined) item.package = dto.package ?? null;
    if (dto.mainDomain !== undefined) item.mainDomain = dto.mainDomain ?? null;
    if (dto.email !== undefined) item.email = dto.email ?? null;
    if (dto.nameServer !== undefined) item.nameServer = dto.nameServer ?? null;
    if (dto.status !== undefined) item.status = dto.status ?? null;
    await this.repo.flush();
    return item;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.removeAndFlush(item);
  }
}
