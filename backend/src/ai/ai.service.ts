/**
 * AI Art Generation Service
 * Handles image generation with admin claim logic based on data sharing settings
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { User, Asset, OwnershipType } from '@prisma/client';

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
  model?: string;
}

export interface GenerationResult {
  asset: Asset;
  ownershipType: OwnershipType;
  isAdminClaimed: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiApiUrl: string;
  private readonly aiApiKey: string;
  private readonly adminClaimRatioEnabled: number;
  private readonly adminClaimRatioDisabled: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService,
  ) {
    this.aiApiUrl = this.configService.get<string>('AI_API_URL');
    this.aiApiKey = this.configService.get<string>('AI_API_KEY');
    this.adminClaimRatioEnabled = this.configService.get<number>(
      'ADMIN_CLAIM_RATIO_ENABLED',
      5,
    );
    this.adminClaimRatioDisabled = this.configService.get<number>(
      'ADMIN_CLAIM_RATIO_DISABLED',
      2,
    );
  }

  /**
   * Generate AI art with ownership logic
   */
  async generateArt(
    user: User,
    request: GenerationRequest,
    ipAddress?: string,
  ): Promise<GenerationResult> {
    // Validate prompt
    this.validatePrompt(request.prompt);

    // Check if user has sufficient tokens/credits
    const wallet = await this.prisma.wallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    // Calculate generation cost (in tokens)
    const generationCost = this.calculateGenerationCost(request);

    if (wallet.tokenBalance < generationCost) {
      throw new BadRequestException(
        `Insufficient tokens. Required: ${generationCost}, Available: ${wallet.tokenBalance}`,
      );
    }

    // Get or create generation counter
    let counter = await this.prisma.generationCounter.findUnique({
      where: { userId: user.id },
    });

    if (!counter) {
      counter = await this.prisma.generationCounter.create({
        data: { userId: user.id },
      });
    }

    // Determine ownership based on data sharing and claim ratio
    const isAdminClaimed = this.shouldClaimForAdmin(
      user.dataSharingEnabled,
      counter.totalGenerated,
    );

    const ownershipType = isAdminClaimed ? OwnershipType.ADMIN : OwnershipType.USER;

    // Deduct tokens
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        tokenBalance: {
          decrement: generationCost,
        },
      },
    });

    // Log token usage
    await this.prisma.inGameTransaction.create({
      data: {
        userId: user.id,
        type: 'SPENT',
        amount: BigInt(generationCost),
        source: 'PURCHASE',
        usedFor: 'AI_GENERATION',
        usedAmount: BigInt(generationCost),
        description: `AI generation: ${request.prompt.substring(0, 50)}...`,
      },
    });

    // Call AI generation API
    const generationResult = await this.callAiGenerationApi(request);

    // Create asset record
    const asset = await this.prisma.asset.create({
      data: {
        creatorId: user.id,
        ownershipType,
        claimedByAdminAt: isAdminClaimed ? new Date() : null,
        title: this.generateTitle(request.prompt),
        description: request.prompt,
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        imageUrl: generationResult.imageUrl,
        thumbnailUrl: generationResult.thumbnailUrl,
        watermarkUrl: generationResult.watermarkUrl,
        width: request.width || 1024,
        height: request.height || 1024,
        fileSize: generationResult.fileSize,
        mimeType: 'image/png',
        generationParams: {
          style: request.style,
          model: request.model || 'default',
          seed: generationResult.seed,
        },
        modelUsed: request.model || 'default',
        seed: generationResult.seed,
        status: 'ACTIVE',
      },
    });

    // Update generation counter
    await this.prisma.generationCounter.update({
      where: { id: counter.id },
      data: {
        totalGenerated: {
          increment: 1,
        },
        adminClaimed: isAdminClaimed
          ? { increment: 1 }
          : undefined,
      },
    });

    // Log data usage if data sharing is enabled
    if (user.dataSharingEnabled) {
      await this.prisma.dataUsageLog.create({
        data: {
          userId: user.id,
          dataType: 'PROMPT_METADATA',
          action: 'AI_GENERATION',
          description: 'Prompt metadata collected for generation',
          consentGiven: true,
          isAnonymized: true,
          metadata: {
            promptLength: request.prompt.length,
            style: request.style,
            model: request.model,
          },
          ipAddress,
        },
      });
    }

    this.logger.log(
      `Asset generated: ${asset.id} for user ${user.id}, ownership: ${ownershipType}`,
    );

    return {
      asset,
      ownershipType,
      isAdminClaimed,
    };
  }

  /**
   * Validate and sanitize prompt
   */
  private validatePrompt(prompt: string): void {
    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }

    if (prompt.length > 1000) {
      throw new BadRequestException('Prompt must be less than 1000 characters');
    }

    // Check for blocked content
    const blockedPatterns = [
      /\b(child|minor|underage)\s+(porn|sex|nude|naked)\b/i,
      /\b(cp|child\s*porn)\b/i,
      /\b(bestiality|zoophilia)\b/i,
      /\b(rape|forced\s*sex)\b/i,
      /\b(non\s*consensual)\b/i,
      /\b(revenge\s*porn)\b/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(prompt)) {
        throw new BadRequestException(
          'Prompt contains prohibited content',
        );
      }
    }
  }

  /**
   * Calculate generation cost based on parameters
   */
  private calculateGenerationCost(request: GenerationRequest): number {
    // Base cost
    let cost = 100;

    // Adjust for resolution
    const pixels = (request.width || 1024) * (request.height || 1024);
    if (pixels > 1024 * 1024) {
      cost += 50; // High resolution
    }

    // Adjust for model
    if (request.model === 'premium') {
      cost += 100;
    }

    return cost;
  }

  /**
   * Determine if asset should be claimed by admin
   */
  private shouldClaimForAdmin(
    dataSharingEnabled: boolean,
    totalGenerated: number,
  ): boolean {
    const ratio = dataSharingEnabled
      ? this.adminClaimRatioEnabled
      : this.adminClaimRatioDisabled;

    // Every Nth generation is claimed by admin (0-indexed)
    return (totalGenerated + 1) % ratio === 0;
  }

  /**
   * Generate title from prompt
   */
  private generateTitle(prompt: string): string {
    // Extract first few words or use first 30 chars
    const words = prompt.split(' ').slice(0, 5).join(' ');
    return words.length > 30 ? words.substring(0, 30) + '...' : words;
  }

  /**
   * Call external AI generation API
   */
  private async callAiGenerationApi(
    request: GenerationRequest,
  ): Promise<{
    imageUrl: string;
    thumbnailUrl: string;
    watermarkUrl: string;
    fileSize: number;
    seed: string;
  }> {
    // This is a placeholder for the actual AI generation API call
    // In production, this would call services like:
    // - Stability AI
    // - Midjourney API
    // - DALL-E
    // - Stable Diffusion

    try {
      const response = await fetch(this.aiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.aiApiKey}`,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          width: request.width || 1024,
          height: request.height || 1024,
          style: request.style,
          model: request.model || 'default',
        }),
      });

      if (!response.ok) {
        throw new Error(`AI generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        imageUrl: result.image_url,
        thumbnailUrl: result.thumbnail_url,
        watermarkUrl: result.watermark_url,
        fileSize: result.file_size,
        seed: result.seed,
      };
    } catch (error) {
      this.logger.error('AI generation API error:', error.message);
      
      // For development/demo purposes, return mock data
      // In production, this should throw the error
      if (process.env.NODE_ENV === 'development') {
        return {
          imageUrl: `https://placeholder.ai/generated/${this.encryption.generateUUID()}.png`,
          thumbnailUrl: `https://placeholder.ai/thumbnail/${this.encryption.generateUUID()}.png`,
          watermarkUrl: `https://placeholder.ai/watermark/${this.encryption.generateUUID()}.png`,
          fileSize: 1024 * 1024, // 1MB
          seed: Math.floor(Math.random() * 1000000).toString(),
        };
      }

      throw new BadRequestException('AI generation failed: ' + error.message);
    }
  }

  /**
   * Get user's generation history
   */
  async getGenerationHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ assets: Asset[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.asset.count({
        where: { creatorId: userId },
      }),
    ]);

    return { assets, total };
  }

  /**
   * Get generation statistics for user
   */
  async getGenerationStats(userId: string): Promise<{
    totalGenerated: number;
    adminClaimed: number;
    userOwned: number;
  }> {
    const counter = await this.prisma.generationCounter.findUnique({
      where: { userId },
    });

    if (!counter) {
      return { totalGenerated: 0, adminClaimed: 0, userOwned: 0 };
    }

    const userOwned = await this.prisma.asset.count({
      where: {
        creatorId: userId,
        ownershipType: 'USER',
      },
    });

    return {
      totalGenerated: counter.totalGenerated,
      adminClaimed: counter.adminClaimed,
      userOwned,
    };
  }
}
