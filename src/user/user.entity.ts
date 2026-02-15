import { Entity, ManyToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Role } from '../role/role.entity';

@Entity({
  tableName: 'users',
})
export class User {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(255)', unique: true })
  username: string;

  @Property({ columnType: 'varchar(255)' })
  email: string;

  @Property({ columnType: 'varchar(255)', fieldName: 'password_hash' })
  passwordHash: string;

  @ManyToMany(() => Role, (r) => r.users, { owner: true, pivotTable: 'user_roles' })
  roles = new Array<Role>();

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date;

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
