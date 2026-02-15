import { Entity, ManyToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { User } from '../user/user.entity';

export const ROLE_NAMES = [
  'superuser',
  'finance',
  'marketing',
  'seo',
  'it-support',
  'outsource',
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

@Entity({ tableName: 'roles' })
export class Role {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(50)', unique: true })
  name: string;

  @ManyToMany(() => User, (u) => u.roles)
  users = new Array<User>();

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
