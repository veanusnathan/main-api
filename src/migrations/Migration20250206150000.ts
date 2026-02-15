import { Migration } from '@mikro-orm/migrations';

export class Migration20250206150000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`alter table "domains" add column "nawala" boolean not null default false;`);
  }

  async down(): Promise<void> {
    this.addSql(`alter table "domains" drop column "nawala";`);
  }
}
