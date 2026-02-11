/**
 * Content Moderation Service
 * AI-powered and manual content moderation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, ReportType, ReportStatus, ModerationStatus } from '@prisma/client';

export interface ContentReportInput {
  reportedUserId?: string;
  assetId?: string;
  reportType: ReportType;
  reason: string;
}

export interface ModerationActionInput {
  reportId: string;
  action: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'BAN_USER' | 'REMOVE_CONTENT';
  notes?: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  // Blocked content patterns
  private readonly blockedPatterns = [
    /\b(child|minor|underage)\s+(porn|sex|nude|naked)\b/i,
    /\b(cp|child\s*porn)\b/i,
    /\b(bestiality|zoophilia)\b/i,
    /\b(rape|forced\s*sex)\b/i,
    /\b(non\s*consensual)\b/i,
    /\b(revenge\s*porn)\b/i,
    /\bterrorist\b/i,
    /\bextremist\s+(content|material)\b/i,
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Scan prompt for prohibited content
   */
  async scanPrompt(prompt: string): Promise<{
    isClean: boolean;
    flags: string[];
    score: number;
  }> {
    const flags: string[] = [];
    let score = 0;

    for (const pattern of this.blockedPatterns) {
      if (pattern.test(prompt)) {
        flags.push(pattern.source);
        score += 0.25;
      }
    }

    // Check for extreme content indicators
    const extremeWords = ['violent', 'gore', 'death', 'kill', 'murder'];
    for (const word of extremeWords) {
      if (prompt.toLowerCase().includes(word)) {
        score += 0.1;
      }
    }

    return {
      isClean: flags.length === 0 && score < 0.5,
      flags,
      score: Math.min(score, 1),
    };
  }

  /**
   * Scan image (placeholder for AI image classification)
   */
  async scanImage(imageUrl: string): Promise<{
    isClean: boolean;
    flags: string[];
    score: number;
  }> {
    // This would integrate with an AI image classification service
    // such as AWS Rekognition, Google Vision, or Azure Computer Vision
    
    // Placeholder implementation
    return {
      isClean: true,
      flags: [],
      score: 0,
    };
  }

  /**
   * Submit content report
   */
  async submitReport(
    reporterId: string,
    input: ContentReportInput,
  ): Promise<void> {
    await this.prisma.contentReport.create({
      data: {
        reporterId,
        reportedUserId: input.reportedUserId,
        assetId: input.assetId,
        reportType: input.reportType,
        reason: input.reason,
        status: ReportStatus.PENDING,
      },
    });

    this.logger.log(`Content report submitted by ${reporterId}`);

    // Auto-moderate if certain report types
    if (input.reportType === 'ILLEGAL_CONTENT') {
      await this.autoEscalateReport(input.assetId);
    }
  }

  /**
   * Get pending reports (for moderators)
   */
  async getPendingReports(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<{ reports: any[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [reports, total] = await Promise.all([
      this.prisma.contentReport.findMany({
        where: {
          status: {
            in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
        include: {
          reporter: {
            select: {
              id: true,
              username: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              username: true,
            },
          },
          asset: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.contentReport.count({
        where: {
          status: {
            in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
      }),
    ]);

    return { reports, total };
  }

  /**
   * Process moderation action
   */
  async processAction(
    moderatorId: string,
    input: ModerationActionInput,
  ): Promise<void> {
    const report = await this.prisma.contentReport.findUnique({
      where: { id: input.reportId },
      include: { asset: true },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update report
      await tx.contentReport.update({
        where: { id: input.reportId },
        data: {
          status: input.action === 'ESCALATE' ? ReportStatus.ESCALATED : ReportStatus.RESOLVED,
          resolvedBy: moderatorId,
          resolvedAt: new Date(),
          resolution: input.notes,
          actionTaken: input.action,
        },
      });

      // Log moderation action
      await tx.moderationLog.create({
        data: {
          moderatorId,
          userId: report.reportedUserId,
          assetId: report.assetId,
          action: input.action as any,
          reason: input.notes || report.reason,
        },
      });

      // Apply action
      switch (input.action) {
        case 'REMOVE_CONTENT':
          if (report.assetId) {
            await tx.asset.update({
              where: { id: report.assetId },
              data: { status: 'REMOVED' },
            });
          }
          break;
        case 'BAN_USER':
          if (report.reportedUserId) {
            await tx.user.update({
              where: { id: report.reportedUserId },
              data: {
                isBanned: true,
                bannedAt: new Date(),
                banReason: input.notes || 'Violation of terms',
              },
            });
          }
          break;
      }
    });

    this.logger.log(`Moderation action ${input.action} applied to report ${input.reportId}`);
  }

  /**
   * Auto-escalate report for illegal content
   */
  private async autoEscalateReport(assetId?: string): Promise<void> {
    if (assetId) {
      // Hide content immediately
      await this.prisma.asset.update({
        where: { id: assetId },
        data: { status: 'UNDER_REVIEW' },
      });
    }

    // Notify administrators (placeholder)
    this.logger.warn(`Illegal content report escalated for asset: ${assetId}`);
  }

  /**
   * Get moderation statistics
   */
  async getStats(): Promise<{
    pendingReports: number;
    resolvedToday: number;
    totalReports: number;
    bannedUsers: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingReports, resolvedToday, totalReports, bannedUsers] = await Promise.all([
      this.prisma.contentReport.count({
        where: {
          status: {
            in: [ReportStatus.PENDING, ReportStatus.UNDER_REVIEW],
          },
        },
      }),
      this.prisma.contentReport.count({
        where: {
          status: ReportStatus.RESOLVED,
          resolvedAt: {
            gte: today,
          },
        },
      }),
      this.prisma.contentReport.count(),
      this.prisma.user.count({
        where: { isBanned: true },
      }),
    ]);

    return {
      pendingReports,
      resolvedToday,
      totalReports,
      bannedUsers,
    };
  }
}
