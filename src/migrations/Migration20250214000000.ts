import { Migration } from '@mikro-orm/migrations';

export class Migration20250214000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table "whitelisted_ips" (
        "id" serial primary key,
        "ip" varchar(45) not null,
        "description" varchar(255) null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      );
    `);
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "whitelisted_ips";`);
  }
}
