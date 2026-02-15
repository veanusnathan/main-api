import { Migration } from '@mikro-orm/migrations';

export class Migration20250206120000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "namecheap_config" (
        "id" serial primary key,
        "api_user" varchar(255) not null,
        "username" varchar(255) not null,
        "password" varchar(255) null,
        "api_key" varchar(255) not null,
        "client_ip" varchar(45) not null,
        "base_url" varchar(500) null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "namecheap_config";');
  }
}
