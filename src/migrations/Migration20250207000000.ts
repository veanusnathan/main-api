import { Migration } from '@mikro-orm/migrations';

export class Migration20250207000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "domains" add column "category" text check ("category" in ('MS', 'WP', 'LP', 'RTP', 'Other')) null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`alter table "domains" drop column if exists "category";`);
  }
}
