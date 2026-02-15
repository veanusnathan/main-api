import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { Role } from './role.entity';
import { CreateRoleDto } from './dtos/create-role.dto';
import { UpdateRoleDto } from './dtos/update-role.dto';

export interface RoleWithUsersResponse {
  id: number;
  name: string;
  users: { id: number; username: string; email: string }[];
}

function toRoleWithUsers(role: Role): RoleWithUsersResponse {
  const users = Array.isArray(role.users)
    ? role.users
    : (role.users as { getItems?: () => unknown[] })?.getItems?.() ?? [];
  return {
    id: role.id,
    name: role.name,
    users: users.map((u: { id: number; username: string; email: string }) => ({
      id: u.id,
      username: u.username,
      email: u.email,
    })),
  };
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: EntityRepository<Role>,
  ) {}

  async findAll(): Promise<{ id: number; name: string }[]> {
    const roles = await this.roleRepo.findAll({ orderBy: { id: 'ASC' } });
    return roles.map((r) => ({ id: r.id, name: r.name }));
  }

  async findOne(id: number, withUsers = false): Promise<RoleWithUsersResponse | { id: number; name: string }> {
    const role = await this.roleRepo.findOne(
      { id },
      { populate: withUsers ? ['users'] : false },
    );
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    if (withUsers) return toRoleWithUsers(role);
    return { id: role.id, name: role.name };
  }

  async create(dto: CreateRoleDto): Promise<{ id: number; name: string }> {
    const name = dto.name.toLowerCase();
    const existing = await this.roleRepo.findOne({ name });
    if (existing) {
      throw new ConflictException({ errors: ['Role name already exists'] });
    }
    const role = this.roleRepo.create({ name } as any);
    await this.roleRepo.persistAndFlush(role);
    return { id: role.id, name: role.name };
  }

  async update(id: number, dto: UpdateRoleDto): Promise<{ id: number; name: string }> {
    const role = await this.roleRepo.findOne({ id });
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    if (dto.name != null) {
      const name = dto.name.toLowerCase();
      const existing = await this.roleRepo.findOne({ name, id: { $ne: id } });
      if (existing) throw new ConflictException({ errors: ['Role name already exists'] });
      role.name = name;
    }
    await this.roleRepo.flush();
    return { id: role.id, name: role.name };
  }

  async remove(id: number): Promise<void> {
    const role = await this.roleRepo.findOne({ id });
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    await this.roleRepo.removeAndFlush(role);
  }
}
