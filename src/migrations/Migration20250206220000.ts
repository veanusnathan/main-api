import { Migration } from '@mikro-orm/migrations';

export class Migration20250206220000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table "roles" ("id" serial primary key, "name" varchar(50) not null, "created_at" timestamptz not null);`,
    );
    this.addSql(`alter table "roles" add constraint "roles_name_unique" unique ("name");`);

    this.addSql(
      `create table "user_roles" ("user_id" int not null, "role_id" int not null, constraint "user_roles_pkey" primary key ("user_id", "role_id"));`,
    );
    this.addSql(
      `alter table "user_roles" add constraint "user_roles_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete cascade;`,
    );
    this.addSql(
      `alter table "user_roles" add constraint "user_roles_role_id_foreign" foreign key ("role_id") references "roles" ("id") on update cascade on delete cascade;`,
    );

    // Seed roles
    this.addSql(
      `insert into "roles" ("name", "created_at") values 
        ('superuser', now()),
        ('finance', now()),
        ('marketing', now()),
        ('seo', now()),
        ('it-support', now()),
        ('outsource', now());`,
    );
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "user_roles" cascade;`);
    this.addSql(`drop table if exists "roles" cascade;`);
  }
}
