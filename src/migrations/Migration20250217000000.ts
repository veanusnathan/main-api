import { Migration } from '@mikro-orm/migrations';

export class Migration20250217000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      alter table "domains"
        add column if not exists "is_defense" boolean not null default false,
        add column if not exists "is_link_alt" boolean not null default false;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      alter table "domains"
        drop column if exists "is_defense",
        drop column if exists "is_link_alt";
    `);
  }
}
