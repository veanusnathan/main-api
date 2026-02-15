import { Migration } from '@mikro-orm/migrations';

export class Migration20250206210000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "users" ("id" serial primary key, "username" varchar(255) not null, "email" varchar(255) not null, "password_hash" varchar(255) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    );
    this.addSql(`alter table "users" add constraint "users_username_unique" unique ("username");`);
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "users" cascade;`);
  }
}
