import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../user/user.entity';
import { Role } from '../role/role.entity';
import { config } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RoleController } from '../role/role.controller';
import { RoleService } from '../role/role.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Role]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: config.jwtSecret,
      signOptions: {
        expiresIn: config.jwtAccessExpiry,
      },
    }),
  ],
  controllers: [AuthController, RoleController],
  providers: [AuthService, JwtStrategy, RoleService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
