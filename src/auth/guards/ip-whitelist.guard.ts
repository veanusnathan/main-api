import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { WhitelistedIp } from '../../whitelisted-ip/whitelisted-ip.entity';
import { SKIP_IP_WHITELIST_KEY } from '../decorators/skip-ip-whitelist.decorator';

const isDev = process.env.NODE_ENV === 'development';

function getClientIp(request: { ip?: string; headers?: Record<string, string | string[] | undefined> }): string {
  const forwarded = request.headers?.['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first?.split(',')[0]?.trim() ?? '';
  }
  const realIp = request.headers?.['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return request.ip ?? '';
}

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(WhitelistedIp)
    private readonly whitelistedIpRepo: EntityRepository<WhitelistedIp>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Development: bypass IP whitelist check
    if (isDev) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_IP_WHITELIST_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const clientIp = getClientIp(request);

    if (!clientIp) {
      throw new UnauthorizedException({ errors: ['client IP could not be determined'] });
    }

    const isWhitelisted = await this.whitelistedIpRepo.findOne({ ip: clientIp });
    if (!isWhitelisted) {
      throw new UnauthorizedException({
        errors: [`IP ${clientIp} is not whitelisted`],
      });
    }

    return true;
  }
}
