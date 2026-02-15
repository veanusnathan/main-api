import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { statusOkResponse } from '../swagger/fixtures';
import { Public } from '../auth/decorators/public.decorator';
import { SkipIpWhitelist } from '../auth/decorators/skip-ip-whitelist.decorator';

@Controller('/health')
@Public()
@SkipIpWhitelist()
export class HealthController {
  private readonly logger = new Logger();

  constructor(private readonly healthService: HealthService) {}

  @Get('/liveness')
  @ApiOkResponse(statusOkResponse)
  getLiveness() {
    return { status: 'OK' };
  }

  @Get('/readiness')
  @ApiOkResponse(statusOkResponse)
  @ApiServiceUnavailableResponse({
    description: 'Service unavailable',
  })
  async getReadiness() {
    try {
      await this.healthService.getReadiness();
      return { status: 'OK' };
    } catch (e) {
      this.logger.warn((e as Error).message, {
        error: e,
      });
      throw new ServiceUnavailableException();
    }
  }
}
