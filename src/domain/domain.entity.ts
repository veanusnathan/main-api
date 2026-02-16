import {
  Entity,
  EntityRepositoryType,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { DomainRepository } from './domain.repository';
import { CpanelData } from '../cpanel/cpanel.entity';
import { DomainGroup } from './domain-group.entity';

export enum DomainCategory {
  MS = 'MS',
  WP = 'WP',
  LP = 'LP',
  RTP = 'RTP',
  Other = 'Other',
}

@Entity({
  customRepository: () => DomainRepository,
  tableName: 'domains',
})
export class Domain {
  [EntityRepositoryType]?: DomainRepository;

  @PrimaryKey({ autoincrement: true })
  id: number;

  /** Namecheap domain ID (from getList). Used to match on sync. */
  @Property({
    columnType: 'varchar(50)',
    nullable: true,
    default: null,
    fieldName: 'namecheap_id',
  })
  namecheapId?: string | null;

  @Property({ columnType: 'varchar(255)' })
  name: string;

  /** User account under which the domain is registered (Namecheap) */
  @Property({ columnType: 'varchar(255)', nullable: true, default: null })
  user?: string | null;

  /** Domain creation date from Namecheap (e.g. 02/15/2016) */
  @Property({ columnType: 'varchar(20)', nullable: true, default: null })
  created?: string | null;

  /** Whether domain is expired (from Namecheap IsExpired) */
  @Property({ default: false, fieldName: 'is_expired' })
  isExpired: boolean;

  /** Whether domain is locked (from Namecheap IsLocked) */
  @Property({ default: false, fieldName: 'is_locked' })
  isLocked: boolean;

  /** Whether auto-renew is set (from Namecheap AutoRenew) */
  @Property({ default: false, fieldName: 'auto_renew' })
  autoRenew: boolean;

  @Property({ columnType: 'varchar(50)', nullable: true, default: null, fieldName: 'whois_guard' })
  whoisGuard?: string | null;

  @Property({ nullable: true, default: null, fieldName: 'is_premium' })
  isPremium?: boolean | null;

  @Property({ nullable: true, default: null, fieldName: 'is_our_dns' })
  isOurDns?: boolean | null;

  /** Legacy: kept for compatibility; prefer isExpired from Namecheap */
  @Property({ default: true })
  active: boolean;

  @Property({ columnType: 'date', fieldName: 'expiry_date' })
  expiryDate: Date;

  /** User notes; preserved when syncing from Namecheap */
  @Property({ columnType: 'text', nullable: true, default: null })
  description?: string | null;

  @Property({
    columnType: 'varchar(255)',
    nullable: true,
    default: null,
    fieldName: 'name_server1',
  })
  nameServer1?: string | null;

  @Property({
    columnType: 'varchar(255)',
    nullable: true,
    default: null,
    fieldName: 'name_server2',
  })
  nameServer2?: string | null;

  /** CPanel this domain is linked to; null = not linked */
  @ManyToOne(() => CpanelData, { nullable: true, fieldName: 'cpanel_id', onDelete: 'set null' })
  cpanel?: CpanelData | null;

  /** Whether domain is blocked (nawala); read-only, not user-editable. false = Not blocked, true = Blocked */
  @Property({ default: false })
  nawala: boolean;

  /** Whether domain is in use. false = Not used, true = Used */
  @Property({ default: false, fieldName: 'is_used' })
  isUsed: boolean;

  /** Domain category: MS, WP, LP, RTP, or Other */
  @Enum({ items: () => DomainCategory, nullable: true, default: null })
  category?: DomainCategory | null;

  /** Whether domain is used for defense (e.g. Trust Positif / nawala context) */
  @Property({ default: false, fieldName: 'is_defense' })
  isDefense: boolean;

  /** Whether domain is used as link alt */
  @Property({ default: false, fieldName: 'is_link_alt' })
  isLinkAlt: boolean;

  /** Group this domain belongs to; null = no group */
  @ManyToOne(() => DomainGroup, { nullable: true, fieldName: 'group_id', onDelete: 'set null' })
  group?: DomainGroup | null;

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
