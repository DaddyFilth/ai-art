/**
 * Authentication Service
 * Enterprise-grade authentication with security hardening
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EncryptionService } from '../common/services/encryption.service';
import { User, UserRole } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60; // 15 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    username: string,
    displayName?: string
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash email for privacy
    const emailHash = this.encryption.hash(email.toLowerCase());

    // Hash password
    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        emailHash,
        passwordHash,
        username: username.toLowerCase(),
        displayName: displayName || username,
        role: UserRole.USER,
      },
    });

    // Create wallet for user
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
        type: 'USER',
      },
    });

    // Create generation counter
    await this.prisma.generationCounter.create({
      data: {
        userId: user.id,
      },
    });

    this.logger.log(`New user registered: ${user.id}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Authenticate user with email/password
   */
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$' + 'a'.repeat(53));
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new ForbiddenException(
        `Account locked. Try again in ${remainingMinutes} minutes.`
      );
    }

    // Check if account is banned
    if (user.isBanned) {
      throw new ForbiddenException('Account has been suspended');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= this.maxLoginAttempts;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + this.lockoutDuration * 1000)
            : null,
        },
      });

      if (shouldLock) {
        this.logger.warn(`Account locked due to failed attempts: ${user.id}`);
        throw new ForbiddenException(
          'Too many failed attempts. Account locked for 15 minutes.'
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts and update login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
      },
    });

    this.logger.log(`User logged in: ${user.id} from ${ipAddress}`);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.redis.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive || user.isBanned) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Blacklist old refresh token
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.blacklistToken(refreshToken, ttl);
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      this.logger.error('Token refresh failed:', error.message);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user and invalidate tokens
   */
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Decode tokens to get expiration
      const accessPayload = this.jwtService.decode(accessToken) as any;
      const refreshPayload = this.jwtService.decode(refreshToken) as any;

      // Blacklist tokens
      if (accessPayload?.exp) {
        const accessTtl = accessPayload.exp - Math.floor(Date.now() / 1000);
        if (accessTtl > 0) {
          await this.redis.blacklistToken(accessToken, accessTtl);
        }
      }

      if (refreshPayload?.exp) {
        const refreshTtl = refreshPayload.exp - Math.floor(Date.now() / 1000);
        if (refreshTtl > 0) {
          await this.redis.blacklistToken(refreshToken, refreshTtl);
        }
      }

      this.logger.log(`User logged out: ${accessPayload?.sub}`);
    } catch (error) {
      this.logger.error('Logout error:', error.message);
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenPayload> {
    try {
      // Check if blacklisted
      const isBlacklisted = await this.redis.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Verify token
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user: ${userId}`);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = this.encryption.generateToken(32);
    const resetExpiry = 3600; // 1 hour

    // Store in Redis
    await this.redis.set(
      `password-reset:${resetToken}`,
      { userId: user.id },
      resetExpiry
    );

    // TODO: Send email with reset link
    this.logger.log(`Password reset requested for: ${user.id}`);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetData = await this.redis.get<{ userId: string }>(
      `password-reset:${token}`
    );

    if (!resetData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    this.validatePasswordStrength(newPassword);

    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds);

    await this.prisma.user.update({
      where: { id: resetData.userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate reset token
    await this.redis.del(`password-reset:${token}`);

    this.logger.log(`Password reset completed for: ${resetData.userId}`);
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const jti = this.encryption.generateUUID();

    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti,
    };

    const refreshPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: this.encryption.generateUUID(),
    };

    const accessToken = this.jwtService.sign(accessPayload);
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });

    // Store session in Redis
    await this.redis.setSession(
      jti,
      {
        userId: user.id,
        role: user.role,
        createdAt: new Date().toISOString(),
      },
      900 // 15 minutes
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    const minLength = 12;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new BadRequestException(
        `Password must be at least ${minLength} characters long`
      );
    }

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new BadRequestException(
        'Password must contain uppercase, lowercase, number, and special character'
      );
    }
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Partial<User> {
    const {
      passwordHash,
      mfaSecret,
      emailHash,
      maturePasswordHash,
      ...sanitized
    } = user;
    return sanitized;
  }
}
