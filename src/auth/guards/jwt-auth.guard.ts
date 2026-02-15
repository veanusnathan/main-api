import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const isDev = process.env.NODE_ENV === 'development';

/** Mock user attached when auth is disabled in development. */
const DEV_MOCK_USER = {
  id: 1,
  username: 'dev',
  email: 'dev@local',
  roles: ['superuser'],
};

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Development: disable auth and attach mock user so all routes are allowed
    if (isDev) {
      const request = context.switchToHttp().getRequest();
      request.user = DEV_MOCK_USER;
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser,
    _info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (err) throw err;
    if (!user) {
      const message =
        _info && typeof _info === 'object' && 'name' in _info && _info.name === 'TokenExpiredError'
          ? 'access token is expired'
          : 'access token is invalid';
      throw new UnauthorizedException({ errors: [message] });
    }
    return user;
  }
}
