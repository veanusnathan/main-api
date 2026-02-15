import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/core';
import { User } from '../user/user.entity';
import * as bcrypt from 'bcryptjs';
import { config } from '../config';

export interface JwtPayload {
  sub: number;
  username: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; username: string; email: string; roles: string[] };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: EntityRepository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ username: username.toLowerCase() });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException({ errors: ['Invalid username or password'] });
    }
    const userWithRoles = await this.userRepo.findOne(
      { id: user.id },
      { populate: ['roles'] },
    );
    const u = userWithRoles ?? user;
    const tokens = await this.signTokens(u);
    const roleNames = Array.isArray(u.roles)
      ? (u.roles as { name: string }[]).map((r) => r.name)
      : (u.roles as { getItems?: () => { name: string }[] })?.getItems?.()?.map((r) => r.name) ?? [];
    return {
      ...tokens,
      user: {
        id: String(u.id),
        username: u.username,
        email: u.email,
        roles: roleNames,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: config.jwtSecret,
      });
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException({ errors: ['refresh token is invalid'] });
      }
      const user = await this.userRepo.findOne({ id: payload.sub });
      if (!user) {
        throw new UnauthorizedException({ errors: ['refresh token is invalid'] });
      }
      const accessToken = this.jwtService.sign(
        { sub: user.id, username: user.username, type: 'access' } as JwtPayload,
        { secret: config.jwtSecret, expiresIn: config.jwtAccessExpiry },
      );
      return { access_token: accessToken };
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) throw err;
      const message =
        err && typeof err === 'object' && 'name' in err && err.name === 'TokenExpiredError'
          ? 'refresh token is expired'
          : 'refresh token is invalid';
      throw new UnauthorizedException({ errors: [message] });
    }
  }

  private async signTokens(user: User): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: user.id, username: user.username, type: 'access' } as JwtPayload,
      { secret: config.jwtSecret, expiresIn: config.jwtAccessExpiry },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id, username: user.username, type: 'refresh' } as JwtPayload,
      { secret: config.jwtSecret, expiresIn: config.jwtRefreshExpiry },
    );
    const expiresIn = config.jwtAccessExpiry === '1h' ? 3600 : 3600;
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    };
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepo.findOne({ id }, { populate: ['roles'] });
  }
}
