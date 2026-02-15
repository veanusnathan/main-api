import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

const isDev = process.env.NODE_ENV === 'development';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    // Development: bypass role check (e.g. whitelist IP management)
    if (isDev) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.roles?.length) return false;

    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
