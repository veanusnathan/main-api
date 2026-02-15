import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { WordPressData } from './wordpress.entity';
import { CreateWordPressDto } from './dtos/create-wordpress.dto';
import { UpdateWordPressDto } from './dtos/update-wordpress.dto';

@Injectable()
export class WordPressService {
  constructor(
    @InjectRepository(WordPressData)
    private readonly repo: EntityRepository<WordPressData>,
  ) {}

  async findAll(): Promise<WordPressData[]> {
    return this.repo.findAll({ orderBy: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<WordPressData> {
    const item = await this.repo.findOne({ id });
    if (!item) throw new NotFoundException(`WordPress data with id ${id} not found`);
    return item;
  }

  async create(dto: CreateWordPressDto): Promise<WordPressData> {
    const now = new Date();
    const item = this.repo.create({
      domain: dto.domain,
      username: dto.username,
      password: dto.password,
      createdAt: now,
      updatedAt: now,
    });
    await this.repo.persistAndFlush(item);
    return item;
  }

  async update(id: number, dto: UpdateWordPressDto): Promise<WordPressData> {
    const item = await this.findOne(id);
    if (dto.domain != null) item.domain = dto.domain;
    if (dto.username != null) item.username = dto.username;
    if (dto.password != null) item.password = dto.password;
    await this.repo.flush();
    return item;
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.repo.removeAndFlush(item);
  }
}
