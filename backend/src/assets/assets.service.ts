/**
 * Assets Service
 * Asset management and retrieval
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<any> {
    return this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        auctions: {
          where: { status: { in: ['ACTIVE', 'SCHEDULED'] } },
        },
      },
    });
  }

  /**
   * Get user's assets
   */
  async getUserAssets(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ assets: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.asset.count({ where: { creatorId: userId } }),
    ]);

    return { assets, total };
  }

  /**
   * Get public assets feed
   */
  async getPublicFeed(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{ assets: any[]; total: number }> {
    const { limit = 20, offset = 0, search } = options;

    const where: any = {
      status: 'ACTIVE',
      isMature: false,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { assets, total };
  }

  /**
   * Update asset
   */
  async updateAsset(
    assetId: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      isForSale?: boolean;
    },
  ): Promise<any> {
    // Verify ownership
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, creatorId: userId },
    });

    if (!asset) {
      throw new Error('Asset not found or not owned by user');
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data,
    });
  }

  /**
   * Delete asset (soft delete)
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    // Verify ownership
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, creatorId: userId },
    });

    if (!asset) {
      throw new Error('Asset not found or not owned by user');
    }

    await this.prisma.asset.update({
      where: { id: assetId },
      data: { status: 'REMOVED' },
    });
  }
}
