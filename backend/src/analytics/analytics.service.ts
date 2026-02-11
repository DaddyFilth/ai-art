/**
 * Analytics Service
 * Data collection and analytics for the platform
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log data usage event
   */
  async logDataUsage(
    userId: string | null,
    dataType: string,
    action: string,
    description?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    // Check user's data sharing preference
    let consentGiven = false;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { dataSharingEnabled: true },
      });
      consentGiven = user?.dataSharingEnabled || false;
    }

    await this.prisma.dataUsageLog.create({
      data: {
        userId,
        dataType: dataType as any,
        action,
        description,
        consentGiven,
        isAnonymized: true,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get analytics dashboard data
   */
  async getDashboardData(): Promise<{
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
    totalGenerations: number;
    totalSales: number;
    averageSalePrice: number;
    topCreators: any[];
    popularStyles: any[];
  }> {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      dailyActiveUsers,
      monthlyActiveUsers,
      totalGenerations,
      salesStats,
      topCreators,
    ] = await Promise.all([
      // Daily active users (users who generated art in last 24h)
      this.prisma.asset.groupBy({
        by: ['creatorId'],
        where: {
          createdAt: {
            gte: new Date(today.getTime() - 24 * 60 * 60 * 1000),
          },
        },
      }).then((result) => result.length),

      // Monthly active users
      this.prisma.asset.groupBy({
        by: ['creatorId'],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
      }).then((result) => result.length),

      // Total generations
      this.prisma.asset.count(),

      // Sales statistics
      this.prisma.transaction.aggregate({
        where: {
          type: 'SALE',
          status: 'COMPLETED',
        },
        _count: { id: true },
        _avg: { fiatAmount: true },
        _sum: { fiatAmount: true },
      }),

      // Top creators by sales
      this.prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          type: 'SALE',
          status: 'COMPLETED',
        },
        _sum: {
          fiatAmount: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          _sum: {
            fiatAmount: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Get creator details
    const creatorIds = topCreators.map((c) => c.userId);
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    const topCreatorsWithDetails = topCreators.map((creator) => ({
      ...creator,
      user: creators.find((c) => c.id === creator.userId),
    }));

    return {
      dailyActiveUsers,
      monthlyActiveUsers,
      totalGenerations,
      totalSales: salesStats._count.id,
      averageSalePrice: parseFloat(salesStats._avg.fiatAmount?.toString() || '0'),
      topCreators: topCreatorsWithDetails,
      popularStyles: [], // Would be populated from generation params analysis
    };
  }

  /**
   * Get user activity analytics
   */
  async getUserActivity(userId: string): Promise<{
    generationsByDay: any[];
    salesByMonth: any[];
    tokenHistory: any[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const generations = await this.prisma.asset.groupBy({
      by: ['createdAt'],
      where: {
        creatorId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const sales = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        userId,
        type: 'SALE',
        status: 'COMPLETED',
      },
      _sum: { fiatAmount: true },
      _count: { id: true },
    });

    const tokens = await this.prisma.inGameTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return {
      generationsByDay: generations,
      salesByMonth: sales,
      tokenHistory: tokens,
    };
  }
}
