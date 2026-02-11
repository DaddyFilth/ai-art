/**
 * Legal Service
 * Manages legal documents and user consent
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsentType } from '@prisma/client';

export interface ConsentRecord {
  userId: string;
  consentType: ConsentType;
  action: 'ACCEPTED' | 'DECLINED';
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record user consent
   */
  async recordConsent(input: ConsentRecord): Promise<void> {
    await this.prisma.consentHistory.create({
      data: {
        userId: input.userId,
        consentType: input.consentType,
        action: input.action,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    // Update user record based on consent type
    const updateData: any = {};
    const now = new Date();

    switch (input.consentType) {
      case 'TERMS_OF_SERVICE':
        updateData.acceptedTermsAt = input.action === 'ACCEPTED' ? now : null;
        break;
      case 'PRIVACY_POLICY':
        updateData.acceptedPrivacyAt = input.action === 'ACCEPTED' ? now : null;
        break;
      case 'DATA_SHARING':
        updateData.dataSharingEnabled = input.action === 'ACCEPTED';
        updateData.dataSharingChangedAt = now;
        break;
      case 'MATURE_CONTENT':
        updateData.acceptedMatureTermsAt = input.action === 'ACCEPTED' ? now : null;
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: input.userId },
        data: updateData,
      });
    }
  }

  /**
   * Get user's consent history
   */
  async getConsentHistory(userId: string): Promise<any[]> {
    return this.prisma.consentHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if user has accepted required documents
   */
  async hasAcceptedRequiredDocuments(userId: string): Promise<{
    termsOfService: boolean;
    privacyPolicy: boolean;
    allAccepted: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        acceptedTermsAt: true,
        acceptedPrivacyAt: true,
      },
    });

    const termsOfService = !!user?.acceptedTermsAt;
    const privacyPolicy = !!user?.acceptedPrivacyAt;

    return {
      termsOfService,
      privacyPolicy,
      allAccepted: termsOfService && privacyPolicy,
    };
  }

  /**
   * Get legal document content
   */
  getLegalDocument(type: string): { title: string; content: string } {
    const documents: Record<string, { title: string; content: string }> = {
      terms: {
        title: 'Terms of Service',
        content: this.getTermsOfService(),
      },
      privacy: {
        title: 'Privacy Policy',
        content: this.getPrivacyPolicy(),
      },
      revenue: {
        title: 'Revenue Sharing Disclosure',
        content: this.getRevenueDisclosure(),
      },
      data: {
        title: 'Data Monetization Disclosure',
        content: this.getDataDisclosure(),
      },
    };

    return documents[type] || { title: 'Not Found', content: 'Document not found' };
  }

  private getTermsOfService(): string {
    return `
# Terms of Service

## AI Art Revenue Exchange Platform

**Last Updated: February 11, 2026**

### 1. Acceptance of Terms

By accessing or using the AI Art Revenue Exchange platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Platform.

### 2. Eligibility

You must be at least 18 years old to use the Platform. By using the Platform, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms.

### 3. Account Registration

3.1. You must create an account to use certain features of the Platform.
3.2. You agree to provide accurate, current, and complete information during registration.
3.3. You are responsible for maintaining the confidentiality of your account credentials.

### 4. AI Art Generation

4.1. The Platform uses artificial intelligence to generate digital artwork based on user prompts.
4.2. **Ownership Claim Rule**: Every 5th generated asset (or every 2nd if data sharing is disabled) becomes the property of the Platform.
4.3. For Admin Claimed assets, the original creator retains a 10% royalty on all future sales.
4.4. For User Owned assets, the creator receives 90% of sale proceeds.

### 5. Token Economy

5.1. Tokens can be earned through daily logins, referrals, challenges, and ad views.
5.2. Tokens can be used for AI generation credits and premium features.
5.3. **Tokens have no cash value and cannot be converted to fiat currency.**

### 6. Prohibited Activities

Users may not use the Platform for illegal purposes, attempt to circumvent security measures, harass other users, or upload malicious content.

### 7. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE PLATFORM SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

### 8. Contact

For questions about these Terms, contact: legal@aiartexchange.com
`;
  }

  private getPrivacyPolicy(): string {
    return `
# Privacy Policy

## AI Art Revenue Exchange Platform

**Last Updated: February 11, 2026**

### 1. Information We Collect

We collect personal information including email address, username, payment information, and usage data.

### 2. Data Sharing

If you opt into data sharing:
- Prompt metadata may be collected and anonymized
- Usage analytics may be collected
- Data may be aggregated and sold as datasets
- **No personally identifiable information is ever sold**

### 3. Your Rights

You have the right to access, correct, delete, and port your personal information.

### 4. Contact

For privacy-related questions, contact: privacy@aiartexchange.com
`;
  }

  private getRevenueDisclosure(): string {
    return `
# Revenue Sharing Disclosure

## Asset Sales

### User-Owned Assets
- Creator: 90%
- Platform: 10%

### Admin-Owned Assets
- Platform: 90%
- Original Creator (Royalty): 10%

### Ad Revenue
- Platform: 100%
- Users: 0%

## Token Economy
Tokens have no cash value and cannot be converted to fiat currency.
`;
  }

  private getDataDisclosure(): string {
    return `
# Data Monetization Disclosure

## Data Collection (With Consent)

When you enable data sharing, we may collect:
- Prompt metadata (anonymized)
- Behavioral usage analytics
- Engagement metrics
- Performance trends
- Aggregated style data

## Data Usage

Collected data may be:
- Aggregated and anonymized
- Packaged into datasets
- Sold to third parties

## What We Never Sell

- Personally identifiable information
- Email addresses
- Payment information
- Private messages
`;
  }
}
