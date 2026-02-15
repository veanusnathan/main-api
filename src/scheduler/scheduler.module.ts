import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [ScheduleModule.forRoot(), DomainModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
