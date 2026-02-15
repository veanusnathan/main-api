import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/** Enum for sync service types: 1 = Domain Sync (Namecheap + DNS), 2 = Nawala check, 3 = Name server refresh only */
export enum SyncServiceName {
  DomainSync = 1,
  NawalaCheck = 2,
  NameServerRefresh = 3,
}

/** Log table: each sync writes a new row with serviceName and timestamp */
@Entity({ tableName: 'sync_log' })
export class SyncLog {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'int2', fieldName: 'service_name' })
  serviceName: SyncServiceName;

  @Property({ columnType: 'timestamptz', fieldName: 'timestamp' })
  timestamp: Date;
}
