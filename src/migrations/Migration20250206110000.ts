import { Migration } from '@mikro-orm/migrations';

export class Migration20250206110000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "domains" add column "namecheap_id" varchar(50) null;`,
    );
    this.addSql(
      `alter table "domains" add column "user" varchar(255) null;`,
    );
    this.addSql(
      `alter table "domains" add column "created" varchar(20) null;`,
    );
    this.addSql(
      `alter table "domains" add column "is_expired" boolean not null default false;`,
    );
    this.addSql(
      `alter table "domains" add column "is_locked" boolean not null default false;`,
    );
    this.addSql(
      `alter table "domains" add column "auto_renew" boolean not null default false;`,
    );
    this.addSql(
      `alter table "domains" add column "whois_guard" varchar(50) null;`,
    );
    this.addSql(
      `alter table "domains" add column "is_premium" boolean null;`,
    );
    this.addSql(
      `alter table "domains" add column "is_our_dns" boolean null;`,
    );
    this.addSql(
      `create unique index "domains_namecheap_id_unique" on "domains" ("namecheap_id") where "namecheap_id" is not null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists "domains_namecheap_id_unique";');
    this.addSql('alter table "domains" drop column "namecheap_id";');
    this.addSql('alter table "domains" drop column "user";');
    this.addSql('alter table "domains" drop column "created";');
    this.addSql('alter table "domains" drop column "is_expired";');
    this.addSql('alter table "domains" drop column "is_locked";');
    this.addSql('alter table "domains" drop column "auto_renew";');
    this.addSql('alter table "domains" drop column "whois_guard";');
    this.addSql('alter table "domains" drop column "is_premium";');
    this.addSql('alter table "domains" drop column "is_our_dns";');
  }
}
