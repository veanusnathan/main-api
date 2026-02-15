import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'whitelisted_ips' })
export class WhitelistedIp {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(45)' })
  ip: string;

  @Property({ columnType: 'varchar(255)', nullable: true })
  description?: string | null;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
