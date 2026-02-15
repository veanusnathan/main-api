import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { config } from '../../config';
import type { JwtPayload } from '../auth.service';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException({ errors: ['access token is invalid'] });
    }
    const user = await this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({ errors: ['access token is invalid'] });
    }
    const roles = Array.isArray(user.roles)
      ? (user.roles as { name: string }[]).map((r) => r.name)
      : (user.roles as { getItems?: () => { name: string }[] })?.getItems?.()?.map((r) => r.name) ?? [];
    return { id: user.id, username: user.username, email: user.email, roles };
  }
}
