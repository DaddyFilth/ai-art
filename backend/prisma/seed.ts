/**
 * Database Seed Script
 * Creates initial admin user and wallet
 */
// @ts-nocheck

import { PrismaClient, UserRole, WalletType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin wallet
  const adminWalletId = process.env.ADMIN_WALLET_ID || '00000000-0000-0000-0000-000000000000';
  
  const adminWallet = await prisma.wallet.upsert({
    where: { id: adminWalletId },
    update: {},
    create: {
      id: adminWalletId,
      type: WalletType.ADMIN_UPKEEP,
      fiatBalance: 0,
      tokenBalance: BigInt(0),
    },
  });

  console.log('Admin wallet created:', adminWallet.id);

  // Create admin user if credentials provided
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (adminEmail && adminPasswordHash) {
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        emailHash: await bcrypt.hash(adminEmail, 10),
        passwordHash: adminPasswordHash,
        username: 'admin',
        displayName: 'Platform Administrator',
        role: UserRole.SUPER_ADMIN,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
      },
    });

    console.log('Admin user created:', adminUser.id);

    // Create wallet for admin user
    await prisma.wallet.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        type: WalletType.USER,
        fiatBalance: 0,
        tokenBalance: BigInt(0),
      },
    });

    // Create generation counter for admin
    await prisma.generationCounter.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        totalGenerated: 0,
        adminClaimed: 0,
      },
    });
  }

  // Create sample challenges
  const challenges = [
    {
      title: 'First Creation',
      description: 'Generate your first piece of AI artwork',
      requirement: 'generate_art',
      targetValue: 1,
      tokenReward: BigInt(500),
      startsAt: new Date(),
      isActive: true,
    },
    {
      title: 'Daily Streak 7',
      description: 'Log in for 7 consecutive days',
      requirement: 'login_streak',
      targetValue: 7,
      tokenReward: BigInt(1000),
      startsAt: new Date(),
      isActive: true,
    },
    {
      title: 'First Sale',
      description: 'Sell your first artwork on the marketplace',
      requirement: 'sell_artwork',
      targetValue: 1,
      tokenReward: BigInt(2000),
      startsAt: new Date(),
      isActive: true,
    },
  ];

  for (const challenge of challenges) {
    await prisma.challenge.upsert({
      where: { title: challenge.title },
      update: {},
      create: challenge,
    });
  }

  console.log('Sample challenges created');

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
