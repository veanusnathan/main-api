import {
  Entity,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';

@Entity({
  tableName: 'namecheap_config',
})
export class NamecheapConfig {
  @PrimaryKey({ autoincrement: true })
  id: number;

  /** Namecheap API User (often same as username) */
  @Property({ columnType: 'varchar(255)', fieldName: 'api_user' })
  apiUser: string;

  /** Namecheap account username (UserName in API) */
  @Property({ columnType: 'varchar(255)', fieldName: 'username' })
  username: string;

  /** Stored for reference; input manually in DB */
  @Property({ columnType: 'varchar(255)', nullable: true, default: null })
  password?: string | null;

  /** Namecheap API Key */
  @Property({ columnType: 'varchar(255)', fieldName: 'api_key' })
  apiKey: string;

  /** Client IP whitelisted in Namecheap account */
  @Property({ columnType: 'varchar(45)', fieldName: 'client_ip' })
  clientIp: string;

  /** Optional: override API base URL (e.g. sandbox) */
  @Property({ columnType: 'varchar(500)', nullable: true, default: null, fieldName: 'base_url' })
  baseUrl?: string | null;

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
