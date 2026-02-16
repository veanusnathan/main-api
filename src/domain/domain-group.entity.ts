import { Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Domain } from './domain.entity';

@Entity({
  tableName: 'domain_groups',
})
export class DomainGroup {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(255)' })
  name: string;

  @Property({ columnType: 'text', nullable: true, default: null })
  description?: string | null;

  @OneToMany(() => Domain, (d) => d.group)
  domains?: Domain[];

  @Property({
    onCreate: () => new Date(),
    columnType: 'timestamptz',
    hidden: true,
    fieldName: 'created_at',
  })
  createdAt: Date = new Date();

  @Property({
    onUpdate: () => new Date(),
    columnType: 'timestamptz',
    hidden: true,
    fieldName: 'updated_at',
  })
  updatedAt: Date = new Date();
}
