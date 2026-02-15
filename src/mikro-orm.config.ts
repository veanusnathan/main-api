import { defineConfig } from '@mikro-orm/postgresql';
import { config } from './config';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

export default defineConfig({
  host: config.postgresHost,
  port: config.postgresPort,
  user: config.postgresUser,
  password: config.postgresPassword,
  dbName: config.postgresDb,
  metadataProvider: TsMorphMetadataProvider,
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: config.nodeEnv === 'development',
  migrations: {
    snapshot: false,
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    disableForeignKeys: false,
  },
  logger:
    config.nodeEnv === 'test'
      ? () => {
          return null;
        }
      : undefined,
  allowGlobalContext: config.nodeEnv === 'test',
});
