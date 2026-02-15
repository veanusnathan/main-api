import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'wordpress_data' })
export class WordPressData {
  @PrimaryKey({ autoincrement: true })
  id: number;

  @Property({ columnType: 'varchar(255)' })
  domain: string;

  @Property({ columnType: 'varchar(255)' })
  username: string;

  @Property({ columnType: 'varchar(255)' })
  password: string;

  @Property({
    onCreate: () => new Date(),
    columnType: 'timestamptz',
    fieldName: 'created_at',
  })
  createdAt: Date = new Date();

  @Property({
    onUpdate: () => new Date(),
    columnType: 'timestamptz',
    fieldName: 'updated_at',
  })
  updatedAt: Date = new Date();
}
