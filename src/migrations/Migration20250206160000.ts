import { Migration } from '@mikro-orm/migrations';

export class Migration20250206160000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "sync_metadata" (
        "id" serial primary key,
        "last_namecheap_sync" timestamptz null,
        "last_name_server_sync" timestamptz null
      );`,
    );
    this.addSql(`insert into "sync_metadata" ("id") values (1);`);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "sync_metadata";');
  }
}
