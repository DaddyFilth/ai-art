/**
 * Transactions Service
 * Transaction history and management
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user transaction history
   */
  async getTransactionHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ transactions: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          asset: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where: { userId } }),
    ]);

    return { transactions, total };
  }
}
