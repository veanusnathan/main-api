import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import * as bcrypt from 'bcryptjs';
import { User } from './user.entity';
import { Role } from '../role/role.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  roles: { id: number; name: string }[];
}

function toResponse(user: User): UserResponse {
  const roles = Array.isArray(user.roles)
    ? (user.roles as { id: number; name: string }[]).map((r) => ({ id: r.id, name: r.name }))
    : (user.roles as { getItems?: () => { id: number; name: string }[] })?.getItems?.()?.map((r) => ({ id: r.id, name: r.name })) ?? [];
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles,
  };
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: EntityRepository<Role>,
  ) {}

  async findAll(): Promise<UserResponse[]> {
    const users = await this.userRepo.findAll({ populate: ['roles'], orderBy: { id: 'ASC' } });
    return users.map(toResponse);
  }

  async findOne(id: number): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ id }, { populate: ['roles'] });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return toResponse(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.userRepo.findOne({ username: dto.username.toLowerCase() });
    if (existing) {
      throw new ConflictException({ errors: ['Username already taken'] });
    }
    const now = new Date();
    const roleEntities = dto.roleIds?.length
      ? await this.roleRepo.find({ id: { $in: dto.roleIds } })
      : [];
    const user = this.userRepo.create({
      username: dto.username.toLowerCase(),
      email: dto.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.password, 10),
      createdAt: now,
      updatedAt: now,
    });
    for (const role of roleEntities) {
      user.roles.add(role);
    }
    await this.userRepo.persistAndFlush(user);
    const created = await this.userRepo.findOne({ id: user.id }, { populate: ['roles'] });
    if (!created) throw new NotFoundException('User not found after create');
    return toResponse(created);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.userRepo.findOne({ id }, { populate: ['roles'] });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    if (dto.username != null) {
      const existing = await this.userRepo.findOne({
        username: dto.username.toLowerCase(),
        id: { $ne: id },
      });
      if (existing) throw new ConflictException({ errors: ['Username already taken'] });
      user.username = dto.username.toLowerCase();
    }
    if (dto.email != null) user.email = dto.email.toLowerCase();
    if (dto.password != null) user.passwordHash = await bcrypt.hash(dto.password, 10);
    if (dto.roleIds !== undefined) {
      const roleEntities =
        dto.roleIds.length > 0
          ? await this.roleRepo.find({ id: { $in: dto.roleIds } })
          : [];
      user.roles.removeAll();
      for (const role of roleEntities) {
        user.roles.add(role);
      }
    }
    await this.userRepo.flush();
    const updated = await this.userRepo.findOne({ id }, { populate: ['roles'] });
    if (!updated) throw new NotFoundException('User not found after update');
    return toResponse(updated);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepo.findOne({ id });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    await this.userRepo.removeAndFlush(user);
  }
}
