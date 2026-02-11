/**
 * Mature Content Service
 * Handles age verification and mature content access
 */

import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { User, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export interface AgeVerificationInput {
  documentType: string;
  documentNumber: string;
  verificationData: string;
}

export interface MatureAccessInput {
  password: string;
}

@Injectable()
export class MatureService {
  private readonly logger = new Logger(MatureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Submit age verification request
   */
  async submitAgeVerification(
    userId: string,
    input: AgeVerificationInput,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Check if already verified
    const existing = await this.prisma.ageVerificationRecord.findUnique({
      where: { userId },
    });

    if (existing?.status === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Age already verified');
    }

    // Hash document number for privacy
    const documentNumberHash = this.encryption.hash(input.documentNumber);

    // Encrypt verification data
    const encryptedData = this.encryption.encryptField(input.verificationData);

    // Create or update verification record
    await this.prisma.ageVerificationRecord.upsert({
      where: { userId },
      update: {
        documentType: input.documentType,
        documentNumberHash,
        verificationData: encryptedData,
        status: VerificationStatus.PENDING,
        attemptedAt: new Date(),
        ipAddress,
        userAgent,
      },
      create: {
        userId,
        method: 'DOCUMENT_UPLOAD',
        documentType: input.documentType,
        documentNumberHash,
        verificationData: encryptedData,
        status: VerificationStatus.PENDING,
        attemptedAt: new Date(),
        ipAddress,
        userAgent,
      },
    });

    this.logger.log(`Age verification submitted for user: ${userId}`);
  }

  /**
   * Approve age verification (admin only)
   */
  async approveAgeVerification(userId: string, adminId: string): Promise<void> {
    const record = await this.prisma.ageVerificationRecord.findUnique({
      where: { userId },
    });

    if (!record) {
      throw new BadRequestException('Verification record not found');
    }

    if (record.status === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Already verified');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update verification record
      await tx.ageVerificationRecord.update({
        where: { userId },
        data: {
          status: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
          verifiedBy: adminId,
        },
      });

      // Update user
      await tx.user.update({
        where: { id: userId },
        data: {
          isAgeVerified: true,
          ageVerifiedAt: new Date(),
        },
      });
    });

    this.logger.log(`Age verification approved for user: ${userId} by admin: ${adminId}`);
  }

  /**
   * Enable mature content access
   */
  async enableMatureAccess(
    user: User,
    input: MatureAccessInput,
  ): Promise<void> {
    // Check age verification
    if (!user.isAgeVerified) {
      throw new ForbiddenException('Age verification required');
    }

    // Validate password strength
    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash the mature content password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        matureAccessEnabled: true,
        matureAccessGrantedAt: new Date(),
        maturePasswordHash: passwordHash,
      },
    });

    this.logger.log(`Mature access enabled for user: ${user.id}`);
  }

  /**
   * Verify mature content password
   */
  async verifyMaturePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { maturePasswordHash: true },
    });

    if (!user?.maturePasswordHash) {
      return false;
    }

    return bcrypt.compare(password, user.maturePasswordHash);
  }

  /**
   * Get mature content feed
   */
  async getMatureContent(options: {
    limit?: number;
    offset?: number;
    userId: string;
  }): Promise<{ assets: any[]; total: number }> {
    const { limit = 20, offset = 0, userId } = options;

    // Verify user has mature access
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { matureAccessEnabled: true },
    });

    if (!user?.matureAccessEnabled) {
      throw new ForbiddenException('Mature content access not enabled');
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: {
          isMature: true,
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          creatorId: true,
          createdAt: true,
        },
      }),
      this.prisma.asset.count({
        where: {
          isMature: true,
          status: 'ACTIVE',
        },
      }),
    ]);

    return { assets, total };
  }

  /**
   * Disable mature content access
   */
  async disableMatureAccess(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        matureAccessEnabled: false,
        maturePasswordHash: null,
      },
    });

    this.logger.log(`Mature access disabled for user: ${userId}`);
  }
}
