/**
 * JWT Authentication Strategy
 * Validates JWT access tokens
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TokenPayload } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      issuer: 'ai-art-exchange',
      audience: 'ai-art-exchange-api',
      algorithms: ['HS256'],
      passReqToCallback: false,
    });
  }

  async validate(payload: TokenPayload): Promise<User> {
    // Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token is blacklisted
    const tokenJti = payload.jti;
    const isBlacklisted = await this.redis.isTokenBlacklisted(tokenJti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Get user from database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.isBanned) {
      throw new UnauthorizedException('Account has been suspended');
    }

    // Update session activity
    await this.redis.set(
      `session:${tokenJti}:last-active`,
      Date.now(),
      900 // 15 minutes
    );

    return user;
  }
}
