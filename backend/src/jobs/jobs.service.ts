/**
 * Automation Jobs Service
 * Scheduled tasks for auction closing, revenue distribution, and maintenance
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { LedgerService } from '../ledger/ledger.service';
import { EncryptionService } from '../common/services/encryption.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketplace: MarketplaceService,
    private readonly ledger: LedgerService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Close expired auctions every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredAuctions(): Promise<void> {
    this.logger.debug('Running auction closing job...');

    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: { lte: new Date() },
      },
    });

    for (const auction of expiredAuctions) {
      try {
        await this.marketplace.closeAuction(auction.id);
        this.logger.log(`Auction closed: ${auction.id}`);
      } catch (error) {
        this.logger.error(`Failed to close auction ${auction.id}:`, error.message);
      }
    }

    if (expiredAuctions.length > 0) {
      this.logger.log(`Closed ${expiredAuctions.length} expired auctions`);
    }
  }

  /**
   * Verify ledger integrity hourly
   */
  @Cron(CronExpression.EVERY_HOUR)
  async verifyLedgerIntegrity(): Promise<void> {
    this.logger.debug('Running ledger integrity check...');

    try {
      const result = await this.ledger.verifyLedgerIntegrity();

      if (result.valid) {
        this.logger.log(`Ledger integrity verified: ${result.checkedEntries} entries checked`);
      } else {
        this.logger.error(`Ledger integrity issues found: ${result.errors.length} errors`);
        for (const error of result.errors) {
          this.logger.error(`  - ${error}`);
        }
        // Alert administrators
        await this.alertAdministrators('Ledger Integrity Alert', result.errors.join('\n'));
      }
    } catch (error) {
      this.logger.error('Ledger integrity check failed:', error.message);
    }
  }

  /**
   * Clean up expired sessions every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions(): Promise<void> {
    this.logger.debug('Running session cleanup...');

    // This would interact with Redis to clean up expired sessions
    // Implementation depends on session storage strategy

    this.logger.log('Session cleanup completed');
  }

  /**
   * Process pending transactions every 5 minutes
   */
  @Cron('*/5 * * * *')
  async processPendingTransactions(): Promise<void> {
    this.logger.debug('Processing pending transactions...');

    const pendingTransactions = await this.prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: new Date(Date.now() - 5 * 60 * 1000) }, // Older than 5 minutes
      },
      take: 100,
    });

    for (const transaction of pendingTransactions) {
      try {
        // Check if transaction should be marked as failed
        const age = Date.now() - transaction.createdAt.getTime();
        if (age > 30 * 60 * 1000) { // 30 minutes
          await this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' },
          });
          this.logger.log(`Marked stale transaction as failed: ${transaction.id}`);
        }
      } catch (error) {
        this.logger.error(`Error processing transaction ${transaction.id}:`, error.message);
      }
    }
  }

  /**
   * Generate daily revenue report
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyRevenueReport(): Promise<void> {
    this.logger.debug('Generating daily revenue report...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Calculate revenue
      const salesRevenue = await this.prisma.transaction.aggregate({
        where: {
          type: 'SALE',
          status: 'COMPLETED',
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
        _sum: {
          fiatAmount: true,
        },
      });

      const depositRevenue = await this.prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
        _sum: {
          fiatAmount: true,
        },
      });

      const adRevenue = await this.prisma.adRevenueLog.aggregate({
        where: {
          periodStart: {
            gte: yesterday,
            lt: today,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const report = {
        date: yesterday.toISOString().split('T')[0],
        salesRevenue: salesRevenue._sum.fiatAmount?.toString() || '0',
        depositRevenue: depositRevenue._sum.fiatAmount?.toString() || '0',
        adRevenue: adRevenue._sum.amount?.toString() || '0',
        totalRevenue: (
          parseFloat(salesRevenue._sum.fiatAmount?.toString() || '0') +
          parseFloat(depositRevenue._sum.fiatAmount?.toString() || '0') +
          parseFloat(adRevenue._sum.amount?.toString() || '0')
        ).toString(),
      };

      this.logger.log(`Daily revenue report: ${JSON.stringify(report)}`);

      // Store report (could be in a separate table)
      // await this.prisma.dailyRevenueReport.create({ data: report });

    } catch (error) {
      this.logger.error('Failed to generate daily revenue report:', error.message);
    }
  }

  /**
   * Clean up old data (soft-deleted records)
   */
  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldData(): Promise<void> {
    this.logger.debug('Running data cleanup...');

    try {
      const deletedCount = await this.prisma.cleanupSoftDeleted(30); // 30 days retention
      this.logger.log(`Cleaned up ${deletedCount} soft-deleted records`);
    } catch (error) {
      this.logger.error('Data cleanup failed:', error.message);
    }
  }

  /**
   * Expire old tokens
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async expireOldTokens(): Promise<void> {
    this.logger.debug('Processing token expirations...');

    const now = new Date();

    try {
      const expiredTokens = await this.prisma.inGameTransaction.findMany({
        where: {
          type: 'EARNED',
          status: 'COMPLETED',
          expiresAt: { lte: now },
        },
      });

      for (const token of expiredTokens) {
        await this.prisma.$transaction(async (tx) => {
          // Deduct from wallet
          await tx.wallet.updateMany({
            where: { userId: token.userId },
            data: {
              tokenBalance: {
                decrement: token.amount,
              },
            },
          });

          // Mark as expired
          await tx.inGameTransaction.update({
            where: { id: token.id },
            data: { status: 'EXPIRED' },
          });
        });
      }

      this.logger.log(`Expired ${expiredTokens.length} token transactions`);
    } catch (error) {
      this.logger.error('Token expiration failed:', error.message);
    }
  }

  /**
   * Security anomaly detection
   */
  @Interval(300000) // Every 5 minutes
  async detectSecurityAnomalies(): Promise<void> {
    try {
      // Check for suspicious login patterns
      const suspiciousLogins = await this.prisma.user.findMany({
        where: {
          failedLoginAttempts: { gte: 3 },
        },
        take: 10,
      });

      for (const user of suspiciousLogins) {
        this.logger.warn(`Suspicious activity detected: User ${user.id} has ${user.failedLoginAttempts} failed login attempts`);
      }

      // Check for unusual transaction patterns
      const recentTransactions = await this.prisma.transaction.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 300000) },
        },
        take: 100,
      });

      // Group by user and check for unusual patterns
      const userTransactionCounts = new Map<string, number>();
      for (const tx of recentTransactions) {
        const count = userTransactionCounts.get(tx.userId) || 0;
        userTransactionCounts.set(tx.userId, count + 1);
      }

      for (const [userId, count] of userTransactionCounts.entries()) {
        if (count > 20) { // More than 20 transactions in 5 minutes
          this.logger.warn(`High transaction volume detected: User ${userId} has ${count} transactions in 5 minutes`);
        }
      }
    } catch (error) {
      this.logger.error('Anomaly detection failed:', error.message);
    }
  }

  /**
   * Alert administrators
   */
  private async alertAdministrators(subject: string, message: string): Promise<void> {
    // This would send email/SMS alerts to administrators
    // Implementation depends on notification service
    this.logger.warn(`ADMIN ALERT - ${subject}: ${message}`);
  }
}
