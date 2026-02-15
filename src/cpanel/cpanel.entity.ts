import { Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Domain } from '../domain/domain.entity';

@Entity({ tableName: 'cpanel_data' })
export class CpanelData {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(255)', fieldName: 'ip_server' })
  ipServer: string;

  @Property({ columnType: 'varchar(255)' })
  username: string;

  @Property({ columnType: 'varchar(255)' })
  password: string;

  @Property({ columnType: 'varchar(255)', nullable: true, fieldName: 'package' })
  package?: string | null;

  @Property({ columnType: 'varchar(255)', nullable: true, fieldName: 'main_domain' })
  mainDomain?: string | null;

  @Property({ columnType: 'varchar(255)', nullable: true })
  email?: string | null;

  @Property({ columnType: 'varchar(512)', nullable: true, fieldName: 'name_server' })
  nameServer?: string | null;

  /** Status: Full | Available */
  @Property({ columnType: 'varchar(50)', nullable: true })
  status?: string | null;

  @OneToMany(() => Domain, (d) => d.cpanel, { orphanRemoval: false })
  domains = new Array<Domain>();

  @Property({
    onCreate: () => new Date(),
    columnType: 'timestamptz',
    fieldName: 'created_at',
  })
  createdAt: Date = new Date();

  @Property({
    onUpdate: () => new Date(),
    columnType: 'timestamptz',
    fieldName: 'updated_at',
  })
  updatedAt: Date = new Date();
}
