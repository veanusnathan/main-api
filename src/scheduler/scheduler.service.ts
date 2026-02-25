import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DomainService } from '../domain/domain.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly domainService: DomainService) {}

  /** Run every 1 hour: refresh name servers via DNS lookup */
  @Cron('0 * * * *')
  async handleNameServerRefresh() {
    this.logger.log('Running scheduled name server refresh');
    try {
      const result = await this.domainService.runNameServerRefresh();
      this.logger.log(`Name server refresh done: ${result.updated} domains updated`);
    } catch (err) {
      this.logger.error('Name server refresh failed', err instanceof Error ? err.stack : err);
    }
  }

  /** Run every 15 minutes: refresh nawala (Trust Positif) status for used domains. Set TRUST_POSITIF_SKIP_SCHEDULED=1 to disable (e.g. when VPN from this process fails). */
  @Cron('*/15 * * * *')
  async handleNawalaRefresh() {
    if (process.env.TRUST_POSITIF_SKIP_SCHEDULED === '1' || process.env.TRUST_POSITIF_SKIP_SCHEDULED === 'true') {
      return;
    }
    this.logger.log('Running scheduled nawala refresh');
    try {
      const result = await this.domainService.refreshNawala();
      this.logger.log(
        `Nawala refresh done: ${result.checked} checked, ${result.updated} updated`,
      );
    } catch (err) {
      this.logger.error('Nawala refresh failed', err instanceof Error ? err.stack : err);
    }
  }
}
