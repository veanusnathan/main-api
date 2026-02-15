import { Migration } from '@mikro-orm/migrations';

export class Migration20250206140000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `alter table "cpanel_data" add column "package" varchar(255) null, add column "main_domain" varchar(255) null, add column "email" varchar(255) null, add column "name_server" varchar(512) null, add column "status" varchar(50) null;`,
    );
    this.addSql(`alter table "domains" add column "cpanel_id" int null;`);
    this.addSql(
      `alter table "domains" add constraint "domains_cpanel_id_foreign" foreign key ("cpanel_id") references "cpanel_data" ("id") on update cascade on delete set null;`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`alter table "domains" drop constraint "domains_cpanel_id_foreign";`);
    this.addSql(`alter table "domains" drop column "cpanel_id";`);
    this.addSql(
      `alter table "cpanel_data" drop column "package", drop column "main_domain", drop column "email", drop column "name_server", drop column "status";`,
    );
  }
}
