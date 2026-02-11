/**
 * Wallets Service
 * User wallet management
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create user wallet
   */
  async getOrCreateWallet(userId: string): Promise<any> {
    let wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          type: 'USER',
          fiatBalance: 0,
          tokenBalance: BigInt(0),
        },
      });
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(userId: string): Promise<{
    fiatBalance: number;
    tokenBalance: string;
  }> {
    const wallet = await this.getOrCreateWallet(userId);

    return {
      fiatBalance: parseFloat(wallet.fiatBalance.toString()),
      tokenBalance: wallet.tokenBalance.toString(),
    };
  }
}
