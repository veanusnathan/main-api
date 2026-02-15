import { Migration } from '@mikro-orm/migrations';

export class Migration20250206130000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "cpanel_data" (
        "id" serial primary key,
        "ip_server" varchar(255) not null,
        "username" varchar(255) not null,
        "password" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );
    this.addSql(
      `create table "wordpress_data" (
        "id" serial primary key,
        "domain" varchar(255) not null,
        "username" varchar(255) not null,
        "password" varchar(255) not null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "cpanel_data";');
    this.addSql('drop table if exists "wordpress_data";');
  }
}
