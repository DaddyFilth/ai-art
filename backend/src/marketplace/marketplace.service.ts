/**
 * Marketplace Service
 * Handles auctions, buy-it-now sales, and bidding
 * Enforces revenue sharing rules at the database level
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  Auction,
  Bid,
  Asset,
  User,
  AuctionStatus,
  BidStatus,
  TransactionType,
  OwnershipType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreateAuctionInput {
  assetId: string;
  startingPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  startsAt?: Date;
  endsAt: Date;
}

export interface PlaceBidInput {
  auctionId: string;
  amount: number;
  maxBid?: number;
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Create a new auction
   */
  async createAuction(
    user: User,
    input: CreateAuctionInput,
  ): Promise<Auction> {
    // Verify asset ownership
    const asset = await this.prisma.asset.findUnique({
      where: { id: input.assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.creatorId !== user.id) {
      throw new ForbiddenException('You do not own this asset');
    }

    if (asset.status !== 'ACTIVE') {
      throw new BadRequestException('Asset is not available for sale');
    }

    if (asset.isForSale) {
      throw new BadRequestException('Asset is already listed for sale');
    }

    // Validate prices
    if (input.reservePrice && input.reservePrice < input.startingPrice) {
      throw new BadRequestException('Reserve price must be >= starting price');
    }

    if (input.buyNowPrice && input.buyNowPrice <= input.startingPrice) {
      throw new BadRequestException('Buy now price must be > starting price');
    }

    // Validate dates
    const startsAt = input.startsAt || new Date();
    const endsAt = new Date(input.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException('End date must be after start date');
    }

    if (endsAt <= new Date()) {
      throw new BadRequestException('End date must be in the future');
    }

    // Create auction
    const auction = await this.prisma.auction.create({
      data: {
        assetId: input.assetId,
        startingPrice: new Decimal(input.startingPrice),
        reservePrice: input.reservePrice
          ? new Decimal(input.reservePrice)
          : null,
        buyNowPrice: input.buyNowPrice
          ? new Decimal(input.buyNowPrice)
          : null,
        startsAt,
        endsAt,
        status: startsAt <= new Date() ? 'ACTIVE' : 'SCHEDULED',
        createdBy: user.id,
      },
    });

    // Update asset as for sale
    await this.prisma.asset.update({
      where: { id: input.assetId },
      data: {
        isForSale: true,
        saleType: input.buyNowPrice ? 'BOTH' : 'AUCTION',
        buyNowPrice: input.buyNowPrice
          ? new Decimal(input.buyNowPrice)
          : null,
      },
    });

    this.logger.log(`Auction created: ${auction.id} for asset ${input.assetId}`);

    return auction;
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(user: User, input: PlaceBidInput): Promise<Bid> {
    // Get auction
    const auction = await this.prisma.auction.findUnique({
      where: { id: input.auctionId },
      include: { asset: true },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status !== 'ACTIVE') {
      throw new BadRequestException('Auction is not active');
    }

    if (auction.endsAt <= new Date()) {
      throw new BadRequestException('Auction has ended');
    }

    // Prevent bidding on own auction
    if (auction.asset.creatorId === user.id) {
      throw new ForbiddenException('Cannot bid on your own auction');
    }

    // Validate bid amount
    const bidAmount = new Decimal(input.amount);
    const minBid = auction.currentPrice
      ? auction.currentPrice.mul(1.05) // 5% increment
      : auction.startingPrice;

    if (bidAmount.lessThan(minBid)) {
      throw new BadRequestException(
        `Bid must be at least ${minBid.toFixed(2)}`,
      );
    }

    // Check if buy now price reached
    if (auction.buyNowPrice && bidAmount.greaterThanOrEqualTo(auction.buyNowPrice)) {
      // Execute buy now
      await this.executeBuyNow(auction.id, user.id);
      throw new BadRequestException('Buy now price reached, sale completed');
    }

    // Get bidder's wallet
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    if (wallet.fiatBalance.lessThan(bidAmount)) {
      throw new BadRequestException('Insufficient balance');
    }

    // Create bid
    const bid = await this.prisma.bid.create({
      data: {
        auctionId: input.auctionId,
        bidderId: user.id,
        amount: bidAmount,
        maxBid: input.maxBid ? new Decimal(input.maxBid) : null,
        status: 'ACTIVE',
      },
    });

    // Update auction
    await this.prisma.auction.update({
      where: { id: input.auctionId },
      data: {
        currentPrice: bidAmount,
        currentBidderId: user.id,
        bidCount: { increment: 1 },
      },
    });

    // Mark previous bids as outbid
    if (auction.currentBidderId) {
      await this.prisma.bid.updateMany({
        where: {
          auctionId: input.auctionId,
          bidderId: auction.currentBidderId,
          status: 'ACTIVE',
        },
        data: { status: 'OUTBID' },
      });
    }

    this.logger.log(`Bid placed: ${bid.id} on auction ${input.auctionId}`);

    return bid;
  }

  /**
   * Execute buy now purchase
   */
  async executeBuyNow(auctionId: string, buyerId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { asset: true },
    });

    if (!auction || !auction.buyNowPrice) {
      throw new NotFoundException('Auction or buy now price not found');
    }

    const buyerWallet = await this.prisma.wallet.findFirst({
      where: { userId: buyerId },
    });

    if (!buyerWallet) {
      throw new BadRequestException('Buyer wallet not found');
    }

    // Process the sale
    await this.processSale(
      auction.asset,
      buyerWallet.id,
      auction.buyNowPrice,
      buyerId,
    );

    // Close auction
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: 'SETTLED',
        finalPrice: auction.buyNowPrice,
        winnerId: buyerId,
        settledAt: new Date(),
      },
    });

    this.logger.log(`Buy now executed: auction ${auctionId}, buyer ${buyerId}`);
  }

  /**
   * Close auction and process sale
   */
  async closeAuction(auctionId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { asset: true, bids: { where: { status: 'ACTIVE' } } },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status === 'SETTLED' || auction.status === 'CANCELLED') {
      return; // Already closed
    }

    // Check if reserve price met
    const winningBid = auction.bids[0];
    const reserveMet =
      !auction.reservePrice ||
      (auction.currentPrice &&
        auction.currentPrice.greaterThanOrEqualTo(auction.reservePrice));

    if (winningBid && reserveMet) {
      // Process sale
      const buyerWallet = await this.prisma.wallet.findFirst({
        where: { userId: winningBid.bidderId },
      });

      if (buyerWallet) {
        await this.processSale(
          auction.asset,
          buyerWallet.id,
          winningBid.amount,
          winningBid.bidderId,
        );
      }

      // Update auction
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'SETTLED',
          finalPrice: winningBid.amount,
          winnerId: winningBid.bidderId,
          settledAt: new Date(),
        },
      });

      // Mark winning bid
      await this.prisma.bid.update({
        where: { id: winningBid.id },
        data: { status: 'WON' },
      });

      this.logger.log(`Auction settled: ${auctionId}, winner: ${winningBid.bidderId}`);
    } else {
      // No sale - reserve not met or no bids
      await this.prisma.auction.update({
        where: { id: auctionId },
        data: {
          status: 'ENDED',
        },
      });

      // Remove asset from sale
      await this.prisma.asset.update({
        where: { id: auction.assetId },
        data: {
          isForSale: false,
          saleType: null,
          buyNowPrice: null,
        },
      });

      this.logger.log(`Auction ended without sale: ${auctionId}`);
    }
  }

  /**
   * Process asset sale with revenue split
   */
  private async processSale(
    asset: Asset,
    buyerWalletId: string,
    saleAmount: Decimal,
    buyerId: string,
  ): Promise<void> {
    const adminWalletId = process.env.ADMIN_WALLET_ID;

    // Determine revenue split based on ownership
    if (asset.ownershipType === OwnershipType.USER) {
      // User-owned: 90% to creator, 10% to admin
      const creatorShare = saleAmount.mul(0.9);
      const adminShare = saleAmount.mul(0.1);

      const creatorWallet = await this.prisma.wallet.findFirst({
        where: { userId: asset.creatorId },
      });

      if (!creatorWallet) {
        throw new BadRequestException('Creator wallet not found');
      }

      // Transfer to creator (90%)
      await this.ledger.createTransaction({
        type: TransactionType.SALE,
        fromWalletId: buyerWalletId,
        toWalletId: creatorWallet.id,
        userId: asset.creatorId,
        assetId: asset.id,
        fiatAmount: creatorShare,
        description: `Asset sale revenue (90%) - Asset: ${asset.id}`,
      });

      // Transfer to admin (10%)
      await this.ledger.createTransaction({
        type: TransactionType.FEE,
        fromWalletId: buyerWalletId,
        toWalletId: adminWalletId,
        userId: asset.creatorId,
        assetId: asset.id,
        fiatAmount: adminShare,
        description: `Platform fee (10%) - Asset: ${asset.id}`,
      });
    } else {
      // Admin-owned: 90% to admin, 10% to original creator
      const adminShare = saleAmount.mul(0.9);
      const creatorShare = saleAmount.mul(0.1);

      const creatorWallet = await this.prisma.wallet.findFirst({
        where: { userId: asset.creatorId },
      });

      // Transfer to admin (90%)
      await this.ledger.createTransaction({
        type: TransactionType.SALE,
        fromWalletId: buyerWalletId,
        toWalletId: adminWalletId,
        userId: asset.creatorId,
        assetId: asset.id,
        fiatAmount: adminShare,
        description: `Admin asset sale revenue (90%) - Asset: ${asset.id}`,
      });

      // Transfer to creator (10% royalty)
      if (creatorWallet) {
        await this.ledger.createTransaction({
          type: TransactionType.SALE,
          fromWalletId: adminWalletId,
          toWalletId: creatorWallet.id,
          userId: asset.creatorId,
          assetId: asset.id,
          fiatAmount: creatorShare,
          description: `Creator royalty (10%) - Asset: ${asset.id}`,
        });
      }
    }

    // Transfer ownership
    await this.prisma.asset.update({
      where: { id: asset.id },
      data: {
        creatorId: buyerId,
        ownershipType: OwnershipType.USER,
        isForSale: false,
        saleType: null,
        buyNowPrice: null,
        status: 'SOLD',
      },
    });

    this.logger.log(`Sale processed: asset ${asset.id}, amount: ${saleAmount}`);
  }

  /**
   * Get active auctions
   */
  async getActiveAuctions(options: {
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<{ auctions: any[]; total: number }> {
    const { limit = 20, offset = 0, search } = options;

    const where: any = {
      status: 'ACTIVE',
      endsAt: { gt: new Date() },
    };

    if (search) {
      where.asset = {
        title: { contains: search, mode: 'insensitive' },
      };
    }

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              thumbnailUrl: true,
              creatorId: true,
            },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: { endsAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.auction.count({ where }),
    ]);

    return { auctions, total };
  }

  /**
   * Get auction details
   */
  async getAuctionDetails(auctionId: string): Promise<any> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        asset: true,
        bids: {
          include: {
            bidder: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    return auction;
  }

  /**
   * Get user's bids
   */
  async getUserBids(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ bids: Bid[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where: { bidderId: userId },
        include: {
          auction: {
            include: {
              asset: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.bid.count({ where: { bidderId: userId } }),
    ]);

    return { bids, total };
  }

  /**
   * Cancel auction (only by seller)
   */
  async cancelAuction(userId: string, auctionId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { asset: true },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.asset.creatorId !== userId) {
      throw new ForbiddenException('Only the seller can cancel the auction');
    }

    if (auction.status !== 'ACTIVE' && auction.status !== 'SCHEDULED') {
      throw new BadRequestException('Auction cannot be cancelled');
    }

    if (auction.bidCount > 0) {
      throw new BadRequestException('Cannot cancel auction with bids');
    }

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { status: 'CANCELLED' },
    });

    await this.prisma.asset.update({
      where: { id: auction.assetId },
      data: {
        isForSale: false,
        saleType: null,
        buyNowPrice: null,
      },
    });

    this.logger.log(`Auction cancelled: ${auctionId}`);
  }
}
