/**
 * Payments Service
 * Stripe integration with webhook security
 * Fiat deposits and token purchases
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { User, TransactionType } from '@prisma/client';
import Stripe from 'stripe';

export interface CreatePaymentIntentInput {
  amount: number; // in cents
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface TokenPackage {
  id: string;
  name: string;
  tokenAmount: number;
  price: number; // in cents
  currency: string;
  bonusTokens?: number;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  // Token packages
  private readonly TOKEN_PACKAGES: TokenPackage[] = [
    { id: 'basic', name: 'Basic', tokenAmount: 1000, price: 499, currency: 'usd' },
    { id: 'standard', name: 'Standard', tokenAmount: 2500, price: 999, currency: 'usd', bonusTokens: 250 },
    { id: 'premium', name: 'Premium', tokenAmount: 6000, price: 1999, currency: 'usd', bonusTokens: 750 },
    { id: 'ultimate', name: 'Ultimate', tokenAmount: 15000, price: 4999, currency: 'usd', bonusTokens: 2500 },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    // Using Stripe API version 2023-10-16 for TypeScript compatibility
    // The stripe package type definitions are pinned to this version
    // TODO: Update to newer version when stripe package updates its types
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  /**
   * Create a Stripe customer for user
   */
  async createCustomer(user: User): Promise<Stripe.Customer> {
    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.displayName || user.username,
      metadata: {
        userId: user.id,
      },
    });

    // Store Stripe customer ID
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Store in a separate field or metadata
      },
    });

    this.logger.log(`Stripe customer created: ${customer.id} for user ${user.id}`);

    return customer;
  }

  /**
   * Create payment intent for deposit
   */
  async createDepositIntent(
    user: User,
    input: CreatePaymentIntentInput,
  ): Promise<Stripe.PaymentIntent> {
    // Get or create Stripe customer
    let customerId = await this.getStripeCustomerId(user.id);

    if (!customerId) {
      const customer = await this.createCustomer(user);
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency || 'usd',
      customer: customerId,
      description: input.description || 'Account deposit',
      metadata: {
        userId: user.id,
        type: 'deposit',
        ...input.metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    this.logger.log(`Payment intent created: ${paymentIntent.id}`);

    return paymentIntent;
  }

  /**
   * Create payment intent for token purchase
   */
  async createTokenPurchaseIntent(
    user: User,
    packageId: string,
  ): Promise<{ paymentIntent: Stripe.PaymentIntent; package: TokenPackage }> {
    const tokenPackage = this.TOKEN_PACKAGES.find((p) => p.id === packageId);

    if (!tokenPackage) {
      throw new BadRequestException('Invalid token package');
    }

    // Get or create Stripe customer
    let customerId = await this.getStripeCustomerId(user.id);

    if (!customerId) {
      const customer = await this.createCustomer(user);
      customerId = customer.id;
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: tokenPackage.price,
      currency: tokenPackage.currency,
      customer: customerId,
      description: `Purchase ${tokenPackage.name} package (${tokenPackage.tokenAmount} tokens)`,
      metadata: {
        userId: user.id,
        type: 'token_purchase',
        packageId: tokenPackage.id,
        tokenAmount: tokenPackage.tokenAmount,
        bonusTokens: tokenPackage.bonusTokens || 0,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    this.logger.log(`Token purchase intent created: ${paymentIntent.id}`);

    return { paymentIntent, package: tokenPackage };
  }

  /**
   * Process Stripe webhook
   */
  async processWebhook(payload: string, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error.message);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { userId, type, packageId, tokenAmount } = paymentIntent.metadata;

    if (!userId) {
      this.logger.error('Payment intent missing userId');
      return;
    }

    const wallet = await this.prisma.wallet.findFirst({
      where: { userId },
    });

    if (!wallet) {
      this.logger.error(`Wallet not found for user: ${userId}`);
      return;
    }

    if (type === 'deposit') {
      // Process deposit
      const amount = new (await import('@prisma/client/runtime/library')).Decimal(
        paymentIntent.amount / 100,
      ); // Convert cents to dollars

      await this.ledger.createTransaction({
        type: TransactionType.DEPOSIT,
        toWalletId: wallet.id,
        userId,
        fiatAmount: amount,
        currency: paymentIntent.currency.toUpperCase(),
        description: 'Account deposit via Stripe',
        metadata: {
          stripePaymentId: paymentIntent.id,
        },
      });

      this.logger.log(`Deposit processed: ${paymentIntent.id}, amount: ${amount}`);
    } else if (type === 'token_purchase') {
      // Process token purchase
      const totalTokens =
        parseInt(tokenAmount, 10) +
        parseInt(paymentIntent.metadata.bonusTokens || '0', 10);

      await this.prisma.$transaction(async (tx) => {
        // Update wallet token balance
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            tokenBalance: {
              increment: BigInt(totalTokens),
            },
          },
        });

        // Create in-game transaction
        await tx.inGameTransaction.create({
          data: {
            userId,
            type: 'EARNED',
            amount: BigInt(totalTokens),
            source: 'PURCHASE',
            description: `Purchased ${totalTokens} tokens (${packageId} package)`,
            metadata: {
              stripePaymentId: paymentIntent.id,
              packageId,
              baseTokens: parseInt(tokenAmount, 10),
              bonusTokens: parseInt(paymentIntent.metadata.bonusTokens || '0', 10),
            },
          },
        });
      });

      this.logger.log(`Token purchase processed: ${paymentIntent.id}, tokens: ${totalTokens}`);
    }

    // Update payment intent record
    await this.prisma.transaction.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: { status: 'COMPLETED' },
    });
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const { userId } = paymentIntent.metadata;

    if (!userId) {
      return;
    }

    // Update transaction status
    await this.prisma.transaction.updateMany({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        metadata: {
          failureMessage: paymentIntent.last_payment_error?.message,
        },
      },
    });

    this.logger.log(`Payment failed: ${paymentIntent.id}`);
  }

  /**
   * Handle charge refund
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (!paymentIntentId) {
      return;
    }

    // Find original transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripePaymentId: paymentIntentId },
    });

    if (!transaction) {
      this.logger.error(`Original transaction not found for refund: ${paymentIntentId}`);
      return;
    }

    // Process refund
    await this.ledger.reverseTransaction(
      transaction.id,
      'Customer refund',
      'stripe-webhook',
    );

    this.logger.log(`Refund processed: ${charge.id}`);
  }

  /**
   * Get available token packages
   */
  getTokenPackages(): TokenPackage[] {
    return this.TOKEN_PACKAGES;
  }

  /**
   * Get user's Stripe customer ID
   */
  private async getStripeCustomerId(userId: string): Promise<string | null> {
    // This would typically be stored in the user record or a separate table
    // For now, we'll query Stripe by metadata
    // Security: Validate userId format to prevent query injection
    // UUIDs should only contain alphanumeric characters and hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(userId)) {
      this.logger.warn(`Invalid userId format for Stripe search: ${userId}`);
      return null;
    }
    
    const customers = await this.stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
    });

    return customers.data[0]?.id || null;
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ payments: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: {
            in: ['DEPOSIT', 'TOKEN_PURCHASE'],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: {
          userId,
          type: {
            in: ['DEPOSIT', 'TOKEN_PURCHASE'],
          },
        },
      }),
    ]);

    return { payments: transactions, total };
  }
}
