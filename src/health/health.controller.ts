import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { execSync } from 'node:child_process';
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

  /** Debug: what route does this process see for Trust Positif? GET /api/health/nawala-route-debug */
  @Get('/nawala-route-debug')
  @ApiOkResponse({ description: 'Output of ip route get 182.23.79.198 from this process' })
  getNawalaRouteDebug() {
    try {
      const out = execSync('ip route get 182.23.79.198', { encoding: 'utf-8', timeout: 5000 });
      return { route: out.trim(), note: 'If you see "dev tun0" then routing is correct from this process. If you see "dev eth0" then this process cannot use the VPN.' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { error: msg, route: null };
    }
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
