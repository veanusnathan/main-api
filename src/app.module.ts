import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmMiddleware, MikroOrmModule } from '@mikro-orm/nestjs';
import defineConfig from './mikro-orm.config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { IpWhitelistGuard } from './auth/guards/ip-whitelist.guard';
import { HealthModule } from './health/health.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { DomainModule } from './domain/domain.module';
import { CpanelModule } from './cpanel/cpanel.module';
import { WordPressModule } from './wordpress/wordpress.module';
import { WhitelistedIpModule } from './whitelisted-ip/whitelisted-ip.module';
import { UserModule } from './user/user.module';
import { LoggerMiddleware } from './logger/logger.midleware';

@Module({
  imports: [
    MikroOrmModule.forRoot(defineConfig),
    WhitelistedIpModule,
    AuthModule,
    UserModule,
    HealthModule,
    SchedulerModule,
    DomainModule,
    CpanelModule,
    WordPressModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: IpWhitelistGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    await this.orm.getMigrator().up();
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MikroOrmMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
