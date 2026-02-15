import { Migration } from '@mikro-orm/migrations';

export class Migration20250206170000 extends Migration {
  async up(): Promise<void> {
    this.addSql('drop table if exists "sync_metadata";');
    this.addSql(
      `create table "sync_log" (
        "id" serial primary key,
        "service_name" int2 not null check ("service_name" in (1, 2)),
        "timestamp" timestamptz not null
      );`,
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "sync_log";');
    this.addSql(
      `create table "sync_metadata" (
        "id" serial primary key,
        "last_namecheap_sync" timestamptz null,
        "last_name_server_sync" timestamptz null
      );`,
    );
    this.addSql(`insert into "sync_metadata" ("id") values (1);`);
  }
}
