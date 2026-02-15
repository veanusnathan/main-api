import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Domain } from './domain.entity';
import { NamecheapConfig } from './namecheap-config.entity';
import { SyncLog } from './sync-log.entity';
import { CpanelData } from '../cpanel/cpanel.entity';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { NamecheapConfigService } from './namecheap-config.service';
import { NamecheapService } from './namecheap/namecheap.service';
import { TrustPositifService } from './trust-positif/trust-positif.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Domain, NamecheapConfig, SyncLog, CpanelData]),
    HttpModule.register({ timeout: 30000, maxRedirects: 0 }),
  ],
  controllers: [DomainController],
  providers: [DomainService, NamecheapConfigService, NamecheapService, TrustPositifService],
  exports: [DomainService],
})
export class DomainModule {}
