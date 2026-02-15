import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CpanelData } from './cpanel.entity';
import { CpanelController } from './cpanel.controller';
import { CpanelService } from './cpanel.service';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([CpanelData]),
    DomainModule,
  ],
  controllers: [CpanelController],
  providers: [CpanelService],
  exports: [CpanelService],
})
export class CpanelModule {}
