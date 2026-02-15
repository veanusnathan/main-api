import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { WhitelistedIp } from './whitelisted-ip.entity';
import { IpWhitelistGuard } from '../auth/guards/ip-whitelist.guard';
import { WhitelistedIpController } from './whitelisted-ip.controller';
import { WhitelistedIpService } from './whitelisted-ip.service';

@Module({
  imports: [MikroOrmModule.forFeature([WhitelistedIp])],
  controllers: [WhitelistedIpController],
  providers: [WhitelistedIpService, IpWhitelistGuard],
  exports: [MikroOrmModule.forFeature([WhitelistedIp]), IpWhitelistGuard],
})
export class WhitelistedIpModule {}
