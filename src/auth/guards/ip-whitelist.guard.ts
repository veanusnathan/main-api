import { networkInterfaces } from 'node:os';
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

/** Get all IPs of this machine (loopback + network interfaces). Requests from these are allowed automatically. */
function getServerIps(): Set<string> {
  const ips = new Set<string>(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    const iface = nets[name];
    if (!iface) continue;
    for (const config of iface) {
      if (config.family === 'IPv4' && config.address) {
        ips.add(config.address);
      } else if (config.family === 'IPv6' && config.address) {
        ips.add(config.address);
        if (config.address.includes('.')) {
          ips.add(config.address); // scoped IPv6 might have %zone
        }
      }
    }
  }
  return ips;
}

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly serverIps = getServerIps();

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

    // Allow requests from this server's own IPs (localhost, VPS IP, etc.) so the app is usable when frontend/curl hit the same host
    if (this.serverIps.has(clientIp.trim())) return true;

    // When no IPs are whitelisted in DB, allow all (avoids locking out everyone in production)
    const whitelistCount = await this.whitelistedIpRepo.count();
    if (whitelistCount === 0) return true;

    const isWhitelisted = await this.whitelistedIpRepo.findOne({ ip: clientIp });
    if (!isWhitelisted) {
      throw new UnauthorizedException({
        errors: [`IP ${clientIp} is not whitelisted`],
      });
    }

    return true;
  }
}
