import { Migration } from '@mikro-orm/migrations';

export class Migration20250206190000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "domains" add column "is_used" boolean not null default false;`);
  }

  async down(): Promise<void> {
    this.addSql(`alter table "domains" drop column "is_used";`);
  }
}
