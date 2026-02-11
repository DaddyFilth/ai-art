/**
 * Admin Service
 * Administrative functions for platform management
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<{
    users: {
      total: number;
      active: number;
      newToday: number;
    };
    assets: {
      total: number;
      generatedToday: number;
      forSale: number;
    };
    transactions: {
      total: number;
      volumeToday: number;
    };
    auctions: {
      active: number;
      endedToday: number;
    };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalAssets,
      assetsToday,
      assetsForSale,
      totalTransactions,
      volumeToday,
      activeAuctions,
      endedAuctionsToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.asset.count(),
      this.prisma.asset.count({ where: { createdAt: { gte: today } } }),
      this.prisma.asset.count({ where: { isForSale: true } }),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        where: { createdAt: { gte: today }, status: 'COMPLETED' },
        _sum: { fiatAmount: true },
      }),
      this.prisma.auction.count({ where: { status: 'ACTIVE' } }),
      this.prisma.auction.count({
        where: {
          status: { in: ['ENDED', 'SETTLED'] },
          endsAt: { gte: today },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
      },
      assets: {
        total: totalAssets,
        generatedToday: assetsToday,
        forSale: assetsForSale,
      },
      transactions: {
        total: totalTransactions,
        volumeToday: parseFloat(volumeToday._sum.fiatAmount?.toString() || '0'),
      },
      auctions: {
        active: activeAuctions,
        endedToday: endedAuctionsToday,
      },
    };
  }

  /**
   * Get revenue statistics
   */
  async getRevenueStats(): Promise<{
    totalSales: number;
    platformFees: number;
    adRevenue: number;
    dataMonetization: number;
  }> {
    const [sales, fees, adRevenue, dataSales] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { type: 'SALE', status: 'COMPLETED' },
        _sum: { fiatAmount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'FEE', status: 'COMPLETED' },
        _sum: { fiatAmount: true },
      }),
      this.prisma.adRevenueLog.aggregate({
        _sum: { amount: true },
      }),
      this.prisma.dataMonetizationSale.aggregate({
        _sum: { saleAmount: true },
      }),
    ]);

    return {
      totalSales: parseFloat(sales._sum.fiatAmount?.toString() || '0'),
      platformFees: parseFloat(fees._sum.fiatAmount?.toString() || '0'),
      adRevenue: parseFloat(adRevenue._sum.amount?.toString() || '0'),
      dataMonetization: parseFloat(dataSales._sum.saleAmount?.toString() || '0'),
    };
  }

  /**
   * List all users (with pagination)
   */
  async getUsers(options: { limit?: number; offset?: number; search?: string } = {}) {
    const { limit = 20, offset = 0, search } = options;

    const where: any = {};
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          isBanned: true,
          createdAt: true,
          _count: {
            select: {
              assets: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Ban/unban user
   */
  async setUserBanStatus(userId: string, isBanned: boolean, reason?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned,
        bannedAt: isBanned ? new Date() : null,
        banReason: isBanned ? reason : null,
      },
    });

    this.logger.log(`User ${userId} ${isBanned ? 'banned' : 'unbanned'}`);
  }

  /**
   * Set user role
   */
  async setUserRole(userId: string, role: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });

    this.logger.log(`User ${userId} role changed to ${role}`);
  }
}
