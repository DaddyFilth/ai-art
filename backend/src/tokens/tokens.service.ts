/**
 * In-Game Token Service
 * Manages token economy: earning, spending, and balance tracking
 * Tokens cannot be converted to fiat
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, InGameTransactionType, TokenSource } from '@prisma/client';

export interface TokenReward {
  amount: number;
  source: TokenSource;
  description: string;
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  // Token reward amounts
  private readonly REWARDS = {
    DAILY_LOGIN: {
      base: 50,
      streakBonus: 10, // Additional per day of streak
      maxStreakBonus: 100,
    },
    REFERRAL: {
      referrer: 200,
      referred: 100,
    },
    AD_VIEW: 10,
    CHALLENGE_COMPLETION: 500,
    ENGAGEMENT_MILESTONE: 100,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user's token balance
   */
  async getBalance(userId: string): Promise<{
    balance: bigint;
    totalEarned: bigint;
    totalSpent: bigint;
  }> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      return { balance: BigInt(0), totalEarned: BigInt(0), totalSpent: BigInt(0) };
    }

    const earned = await this.prisma.inGameTransaction.aggregate({
      where: {
        userId,
        type: 'EARNED',
      },
      _sum: {
        amount: true,
      },
    });

    const spent = await this.prisma.inGameTransaction.aggregate({
      where: {
        userId,
        type: 'SPENT',
      },
      _sum: {
        amount: true,
      },
    });

    return {
      balance: wallet.tokenBalance,
      totalEarned: earned._sum.amount || BigInt(0),
      totalSpent: spent._sum.amount || BigInt(0),
    };
  }

  /**
   * Award tokens to user
   */
  async awardTokens(
    userId: string,
    amount: number,
    source: TokenSource,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          tokenBalance: {
            increment: BigInt(amount),
          },
        },
      });

      // Create transaction record
      await tx.inGameTransaction.create({
        data: {
          userId,
          type: 'EARNED',
          amount: BigInt(amount),
          source,
          description,
          metadata,
          status: 'COMPLETED',
        },
      });
    });

    this.logger.log(`Awarded ${amount} tokens to ${userId} from ${source}`);
  }

  /**
   * Spend tokens from user
   */
  async spendTokens(
    userId: string,
    amount: number,
    usedFor: string,
    description: string,
  ): Promise<boolean> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.tokenBalance < BigInt(amount)) {
      return false; // Insufficient balance
    }

    await this.prisma.$transaction(async (tx) => {
      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          tokenBalance: {
            decrement: BigInt(amount),
          },
        },
      });

      // Create transaction record
      await tx.inGameTransaction.create({
        data: {
          userId,
          type: 'SPENT',
          amount: BigInt(amount),
          source: 'PURCHASE',
          usedFor,
          usedAmount: BigInt(amount),
          description,
          status: 'COMPLETED',
        },
      });
    });

    this.logger.log(`Spent ${amount} tokens from ${userId} for ${usedFor}`);
    return true;
  }

  /**
   * Process daily login reward
   */
  async processDailyLogin(userId: string, ipAddress?: string): Promise<{
    awarded: number;
    streakDay: number;
    isNewDay: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already logged in today
    const existingLogin = await this.prisma.dailyLogin.findUnique({
      where: {
        userId_loginDate: {
          userId,
          loginDate: today,
        },
      },
    });

    if (existingLogin) {
      return {
        awarded: 0,
        streakDay: existingLogin.streakDay,
        isNewDay: false,
      };
    }

    // Get yesterday's login for streak calculation
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayLogin = await this.prisma.dailyLogin.findUnique({
      where: {
        userId_loginDate: {
          userId,
          loginDate: yesterday,
        },
      },
    });

    const streakDay = yesterdayLogin ? yesterdayLogin.streakDay + 1 : 1;

    // Calculate reward
    const baseReward = this.REWARDS.DAILY_LOGIN.base;
    const streakBonus = Math.min(
      (streakDay - 1) * this.REWARDS.DAILY_LOGIN.streakBonus,
      this.REWARDS.DAILY_LOGIN.maxStreakBonus,
    );
    const totalReward = baseReward + streakBonus;

    // Award tokens
    await this.awardTokens(
      userId,
      totalReward,
      'DAILY_LOGIN',
      `Daily login reward (Day ${streakDay} streak)`,
      { streakDay, baseReward, streakBonus },
    );

    // Record login
    await this.prisma.dailyLogin.create({
      data: {
        userId,
        loginDate: today,
        tokensAwarded: BigInt(totalReward),
        streakDay,
        ipAddress,
      },
    });

    return {
      awarded: totalReward,
      streakDay,
      isNewDay: true,
    };
  }

  /**
   * Process referral reward
   */
  async processReferralReward(
    referrerId: string,
    referredId: string,
  ): Promise<void> {
    // Award referrer
    await this.awardTokens(
      referrerId,
      this.REWARDS.REFERRAL.referrer,
      'REFERRAL',
      `Referral reward for inviting user ${referredId}`,
      { referredId, type: 'referrer' },
    );

    // Award referred user
    await this.awardTokens(
      referredId,
      this.REWARDS.REFERRAL.referred,
      'REFERRAL',
      'Welcome bonus from referral',
      { referrerId, type: 'referred' },
    );

    // Update referral record
    await this.prisma.referral.updateMany({
      where: {
        referrerId,
        referredId,
      },
      data: {
        referrerTokensAwarded: BigInt(this.REWARDS.REFERRAL.referrer),
        referredTokensAwarded: BigInt(this.REWARDS.REFERRAL.referred),
        convertedAt: new Date(),
      },
    });
  }

  /**
   * Process ad view reward
   */
  async processAdViewReward(userId: string): Promise<{
    awarded: number;
    cooldownRemaining?: number;
  }> {
    // Check cooldown (30 seconds between ad views)
    const cooldownKey = `ad-cooldown:${userId}`;
    const lastView = await this.prisma.inGameTransaction.findFirst({
      where: {
        userId,
        source: 'AD_VIEW',
      },
      orderBy: { createdAt: 'desc' },
    });

    const cooldownMs = 30000; // 30 seconds
    if (lastView) {
      const timeSinceLastView = Date.now() - lastView.createdAt.getTime();
      if (timeSinceLastView < cooldownMs) {
        return {
          awarded: 0,
          cooldownRemaining: Math.ceil((cooldownMs - timeSinceLastView) / 1000),
        };
      }
    }

    // Award tokens
    await this.awardTokens(
      userId,
      this.REWARDS.AD_VIEW,
      'AD_VIEW',
      'Reward for watching advertisement',
    );

    return { awarded: this.REWARDS.AD_VIEW };
  }

  /**
   * Process challenge completion reward
   */
  async processChallengeReward(
    userId: string,
    challengeId: string,
  ): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || !challenge.isActive) {
      throw new Error('Challenge not found or inactive');
    }

    // Check if already completed
    const existingCompletion = await this.prisma.challengeCompletion.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId,
        },
      },
    });

    if (existingCompletion?.completedAt) {
      throw new Error('Challenge already completed');
    }

    // Award tokens
    await this.awardTokens(
      userId,
      Number(challenge.tokenReward),
      'CHALLENGE',
      `Completed challenge: ${challenge.title}`,
      { challengeId },
    );

    // Update completion record
    if (existingCompletion) {
      await this.prisma.challengeCompletion.update({
        where: { id: existingCompletion.id },
        data: {
          completedAt: new Date(),
          tokensAwarded: challenge.tokenReward,
        },
      });
    }
  }

  /**
   * Get token transaction history
   */
  async getTransactionHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ transactions: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [transactions, total] = await Promise.all([
      this.prisma.inGameTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.inGameTransaction.count({ where: { userId } }),
    ]);

    return { transactions, total };
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(): Promise<any[]> {
    const now = new Date();

    return this.prisma.challenge.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create referral code/link
   */
  async createReferral(referrerId: string, referredId: string): Promise<void> {
    await this.prisma.referral.create({
      data: {
        referrerId,
        referredId,
      },
    });
  }

  /**
   * Get referral stats
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    convertedReferrals: number;
    totalEarned: bigint;
  }> {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
    });

    const convertedReferrals = referrals.filter((r) => r.convertedAt);
    const totalEarned = convertedReferrals.reduce(
      (sum, r) => sum + (r.referrerTokensAwarded || BigInt(0)),
      BigInt(0),
    );

    return {
      totalReferrals: referrals.length,
      convertedReferrals: convertedReferrals.length,
      totalEarned,
    };
  }
}
