import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { WhitelistedIp } from './whitelisted-ip.entity';
import { UpdateWhitelistedIpDto } from './dtos/update-whitelisted-ip.dto';

@Injectable()
export class WhitelistedIpService {
  constructor(
    @InjectRepository(WhitelistedIp)
    private readonly repo: EntityRepository<WhitelistedIp>,
  ) {}

  async findAll(): Promise<WhitelistedIp[]> {
    return this.repo.findAll({ orderBy: { id: 'ASC' } });
  }

  async update(id: number, dto: UpdateWhitelistedIpDto): Promise<WhitelistedIp> {
    const entity = await this.repo.findOne({ id });
    if (!entity) {
      throw new NotFoundException(`Whitelisted IP with id ${id} not found`);
    }
    if (dto.ip !== undefined) entity.ip = dto.ip.trim();
    if (dto.description !== undefined) entity.description = dto.description?.trim() || null;
    await this.repo.flush();
    return entity;
  }

  async create(ip: string, description?: string | null): Promise<WhitelistedIp> {
    const now = new Date();
    const entity = this.repo.create({
      ip: ip.trim(),
      description: description?.trim() || null,
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.persistAndFlush(entity);
    return entity;
  }

  async remove(id: number): Promise<void> {
    const entity = await this.repo.findOne({ id });
    if (!entity) {
      throw new NotFoundException(`Whitelisted IP with id ${id} not found`);
    }
    await this.repo.removeAndFlush(entity);
  }
}
