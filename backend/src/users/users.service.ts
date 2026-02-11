/**
 * Users Service
 * User profile management
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        website: true,
        role: true,
        isAgeVerified: true,
        matureAccessEnabled: true,
        dataSharingEnabled: true,
        createdAt: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      website?: string;
      avatarUrl?: string;
    },
  ): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        website: true,
      },
    });
  }

  /**
   * Update data sharing preference
   */
  async updateDataSharing(userId: string, enabled: boolean): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        dataSharingEnabled: enabled,
        dataSharingChangedAt: new Date(),
      },
    });
  }

  /**
   * Get public user profile
   */
  async getPublicProfile(username: string): Promise<any> {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        website: true,
        createdAt: true,
        _count: {
          select: {
            assets: true,
          },
        },
      },
    });
  }
}
