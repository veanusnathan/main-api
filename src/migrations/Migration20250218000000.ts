import { Migration } from '@mikro-orm/migrations';

export class Migration20250218000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists "domain_groups" (
        "id" serial primary key,
        "name" varchar(255) not null,
        "description" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
    `);
    this.addSql(`
      alter table "domains"
        add column if not exists "group_id" int null
        references "domain_groups" ("id") on update cascade on delete set null;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`alter table "domains" drop column if exists "group_id";`);
    this.addSql(`drop table if exists "domain_groups";`);
  }
}
