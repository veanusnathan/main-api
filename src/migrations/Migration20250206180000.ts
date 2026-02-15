import { Migration } from '@mikro-orm/migrations';

export class Migration20250206180000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`update "sync_log" set "service_name" = 1 where "service_name" = 2;`);
    this.addSql(`alter table "sync_log" drop constraint if exists "sync_log_service_name_check";`);
    this.addSql(`alter table "sync_log" add constraint "sync_log_service_name_check" check ("service_name" = 1);`);
  }

  async down(): Promise<void> {
    this.addSql(`alter table "sync_log" drop constraint if exists "sync_log_service_name_check";`);
    this.addSql(`alter table "sync_log" add constraint "sync_log_service_name_check" check ("service_name" in (1, 2));`);
  }
}
