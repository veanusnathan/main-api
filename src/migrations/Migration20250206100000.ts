import { Migration } from '@mikro-orm/migrations';

export class Migration20250206100000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "domains" (
        "id" serial primary key,
        "name" varchar(255) not null,
        "active" boolean not null default true,
        "expiry_date" date not null,
        "description" text null,
        "name_server1" varchar(255) null,
        "name_server2" varchar(255) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );
    this.addSql('create index "domains_name_index" on "domains" ("name");');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "domains";');
  }
}
