/**
 * Double-Entry Ledger Service
 * Financial-grade transaction recording with SHA-256 hashing
 * Immutable audit trail for all financial operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { LedgerEntryType, TransactionType, Prisma } from '@prisma/client';

export interface LedgerEntryInput {
  transactionId: string;
  walletId?: string;
  userId: string;
  entryType: LedgerEntryType;
  fiatAmount?: Decimal;
  tokenAmount?: bigint;
  description: string;
  currency?: string;
}

export interface TransactionInput {
  type: TransactionType;
  subType?: string;
  fromWalletId?: string;
  toWalletId?: string;
  userId: string;
  assetId?: string;
  auctionId?: string;
  fiatAmount?: Decimal;
  tokenAmount?: bigint;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a financial transaction with double-entry ledger entries
   * This is the core method for all financial operations
   */
  async createTransaction(
    input: TransactionInput,
  ): Promise<{ transaction: any; ledgerEntries: any[] }> {
    return this.prisma.executeTransaction(
      async (tx) => {
        // Check idempotency
        if (input.idempotencyKey) {
          const existing = await tx.transaction.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (existing) {
            this.logger.log(`Idempotent transaction found: ${existing.id}`);
            const entries = await tx.ledgerEntry.findMany({
              where: { transactionId: existing.id },
            });
            return { transaction: existing, ledgerEntries: entries };
          }
        }

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: input.type,
            subType: input.subType,
            fromWalletId: input.fromWalletId,
            toWalletId: input.toWalletId,
            userId: input.userId,
            assetId: input.assetId,
            auctionId: input.auctionId,
            fiatAmount: input.fiatAmount?.toString(),
            tokenAmount: input.tokenAmount,
            currency: input.currency || 'USD',
            status: 'COMPLETED',
            idempotencyKey: input.idempotencyKey,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: input.metadata || {},
            description: input.description,
          },
        });

        // Create ledger entries
        const ledgerEntries: any[] = [];

        // Debit entry (from wallet)
        if (input.fromWalletId && (input.fiatAmount || input.tokenAmount)) {
          const fromWallet = await tx.wallet.findUnique({
            where: { id: input.fromWalletId },
          });

          if (!fromWallet) {
            throw new Error('Source wallet not found');
          }

          // Calculate new balance
          const newFiatBalance = fromWallet.fiatBalance.sub(input.fiatAmount || 0);
          const newTokenBalance =
            fromWallet.tokenBalance - (input.tokenAmount || BigInt(0));

          // Verify sufficient funds
          if (newFiatBalance.lessThan(0)) {
            throw new Error('Insufficient fiat balance');
          }
          if (newTokenBalance < 0) {
            throw new Error('Insufficient token balance');
          }

          // Update wallet
          await tx.wallet.update({
            where: { id: input.fromWalletId },
            data: {
              fiatBalance: newFiatBalance,
              tokenBalance: newTokenBalance,
            },
          });

          // Create debit ledger entry
          const debitEntry = await this.createLedgerEntry(tx, {
            transactionId: transaction.id,
            walletId: input.fromWalletId,
            userId: fromWallet.userId || input.userId,
            entryType: 'DEBIT',
            fiatAmount: input.fiatAmount,
            tokenAmount: input.tokenAmount,
            description: `Debit: ${input.description || input.type}`,
          });

          ledgerEntries.push(debitEntry);
        }

        // Credit entry (to wallet)
        if (input.toWalletId && (input.fiatAmount || input.tokenAmount)) {
          const toWallet = await tx.wallet.findUnique({
            where: { id: input.toWalletId },
          });

          if (!toWallet) {
            throw new Error('Destination wallet not found');
          }

          // Calculate new balance
          const newFiatBalance = toWallet.fiatBalance.add(input.fiatAmount || 0);
          const newTokenBalance =
            toWallet.tokenBalance + (input.tokenAmount || BigInt(0));

          // Update wallet
          await tx.wallet.update({
            where: { id: input.toWalletId },
            data: {
              fiatBalance: newFiatBalance,
              tokenBalance: newTokenBalance,
            },
          });

          // Create credit ledger entry
          const creditEntry = await this.createLedgerEntry(tx, {
            transactionId: transaction.id,
            walletId: input.toWalletId,
            userId: toWallet.userId || input.userId,
            entryType: 'CREDIT',
            fiatAmount: input.fiatAmount,
            tokenAmount: input.tokenAmount,
            description: `Credit: ${input.description || input.type}`,
          });

          ledgerEntries.push(creditEntry);
        }

        this.logger.log(`Transaction created: ${transaction.id}`);

        return { transaction, ledgerEntries };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxRetries: 3,
      },
    );
  }

  /**
   * Create a single ledger entry with hash chain
   */
  private async createLedgerEntry(
    tx: Prisma.TransactionClient,
    input: LedgerEntryInput,
  ): Promise<any> {
    // Get previous entry for hash chain
    const previousEntry = await tx.ledgerEntry.findFirst({
      where: { walletId: input.walletId },
      orderBy: { createdAt: 'desc' },
    });

    // Get current wallet balance
    const wallet = await tx.wallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found for ledger entry');
    }

    // Calculate entry hash
    const entryData = `${input.transactionId}:${input.walletId}:${input.entryType}:${input.fiatAmount}:${input.tokenAmount}:${Date.now()}`;
    const entryHash = this.encryption.sha256(entryData);

    // Create ledger entry
    const ledgerEntry = await tx.ledgerEntry.create({
      data: {
        transactionId: input.transactionId,
        walletId: input.walletId,
        userId: input.userId,
        entryType: input.entryType,
        fiatDebit: input.entryType === 'DEBIT' ? input.fiatAmount?.toString() : null,
        fiatCredit: input.entryType === 'CREDIT' ? input.fiatAmount?.toString() : null,
        tokenDebit: input.entryType === 'DEBIT' ? input.tokenAmount : null,
        tokenCredit: input.entryType === 'CREDIT' ? input.tokenAmount : null,
        fiatBalance: wallet.fiatBalance,
        tokenBalance: wallet.tokenBalance,
        entryHash,
        previousHash: previousEntry?.entryHash || null,
        description: input.description,
      },
    });

    return ledgerEntry;
  }

  /**
   * Verify ledger integrity by checking hash chain
   */
  async verifyLedgerIntegrity(walletId?: string): Promise<{
    valid: boolean;
    errors: string[];
    checkedEntries: number;
  }> {
    const errors: string[] = [];
    let checkedEntries = 0;

    const where = walletId ? { walletId } : {};

    const entries = await this.prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      checkedEntries++;

      // Verify hash chain
      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.entryHash) {
          errors.push(
            `Hash chain broken at entry ${entry.id}: expected ${previousEntry.entryHash}, got ${entry.previousHash}`,
          );
        }
      }

      // Recalculate and verify entry hash
      const entryData = `${entry.transactionId}:${entry.walletId}:${entry.entryType}:${entry.fiatDebit || entry.fiatCredit}:${entry.tokenDebit || entry.tokenCredit}:${new Date(entry.createdAt).getTime()}`;
      const calculatedHash = this.encryption.sha256(entryData);

      if (calculatedHash !== entry.entryHash) {
        errors.push(
          `Hash mismatch at entry ${entry.id}: entry may have been tampered`,
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      checkedEntries,
    };
  }

  /**
   * Get wallet balance history
   */
  async getBalanceHistory(
    walletId: string,
    options: { from?: Date; to?: Date; limit?: number } = {},
  ): Promise<any[]> {
    const { from, to, limit = 100 } = options;

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        walletId,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries;
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(
    userId: string,
    options: {
      type?: TransactionType;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ transactions: any[]; total: number }> {
    const { type, from, to, limit = 20, offset = 0 } = options;

    const where: any = { userId };

    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        include: {
          ledgerEntries: true,
          asset: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  /**
   * Reverse a transaction (for refunds, disputes, etc.)
   */
  async reverseTransaction(
    originalTransactionId: string,
    reason: string,
    processedBy: string,
  ): Promise<any> {
    return this.prisma.executeTransaction(async (tx) => {
      // Get original transaction
      const original = await tx.transaction.findUnique({
        where: { id: originalTransactionId },
        include: { ledgerEntries: true },
      });

      if (!original) {
        throw new Error('Original transaction not found');
      }

      if (original.status === 'REFUNDED') {
        throw new Error('Transaction already refunded');
      }

      // Create reversal transaction
      const reversal = await this.createTransaction({
        type: TransactionType.REFUND,
        subType: `REVERSAL_OF_${original.id}`,
        fromWalletId: original.toWalletId,
        toWalletId: original.fromWalletId,
        userId: original.userId,
        fiatAmount: original.fiatAmount
          ? new Decimal(original.fiatAmount.toString())
          : undefined,
        tokenAmount: original.tokenAmount,
        currency: original.currency,
        description: `Reversal of transaction ${original.id}: ${reason}`,
        metadata: {
          originalTransactionId,
          reversalReason: reason,
        },
      });

      // Mark original as refunded
      await tx.transaction.update({
        where: { id: originalTransactionId },
        data: {
          status: 'REFUNDED',
          metadata: {
            ...((original.metadata as object) || {}),
            reversedAt: new Date().toISOString(),
            reversedBy: processedBy,
            reversalTransactionId: reversal.transaction.id,
          },
        },
      });

      this.logger.log(
        `Transaction ${originalTransactionId} reversed by ${processedBy}`,
      );

      return reversal;
    });
  }

  /**
   * Process revenue split for asset sale
   */
  async processAssetSaleRevenue(
    assetId: string,
    saleAmount: Decimal,
    buyerWalletId: string,
    ownershipType: 'USER' | 'ADMIN',
    creatorId: string,
  ): Promise<any> {
    const adminWalletId = this.configService.get<string>('ADMIN_WALLET_ID');
    const platformFeePercent = 10; // 10% platform fee

    let sellerWalletId: string;
    let creatorWalletId: string;
    let sellerShare: Decimal;
    let creatorShare: Decimal;

    if (ownershipType === 'USER') {
      // User-owned asset: 90% to creator, 10% to admin
      const sellerWallet = await this.prisma.wallet.findFirst({
        where: { userId: creatorId },
      });
      if (!sellerWallet) {
        throw new Error('Creator wallet not found');
      }
      sellerWalletId = sellerWallet.id;
      sellerShare = saleAmount.mul(0.9);
      creatorShare = saleAmount.mul(0.1);
      creatorWalletId = adminWalletId;
    } else {
      // Admin-owned asset: 90% to admin, 10% to original creator
      sellerWalletId = adminWalletId;
      sellerShare = saleAmount.mul(0.9);
      creatorShare = saleAmount.mul(0.1);

      const creatorWallet = await this.prisma.wallet.findFirst({
        where: { userId: creatorId },
      });
      creatorWalletId = creatorWallet?.id || adminWalletId;
    }

    // Create transaction with splits
    return this.createTransaction({
      type: TransactionType.SALE,
      fromWalletId: buyerWalletId,
      toWalletId: sellerWalletId,
      userId: creatorId,
      assetId,
      fiatAmount: saleAmount,
      description: `Asset sale: ${assetId}`,
      metadata: {
        ownershipType,
        sellerShare: sellerShare.toString(),
        creatorShare: creatorShare.toString(),
        creatorWalletId,
      },
    });
  }

}
