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
  private readonly ollamaModel: string;
  private readonly sdApiUrl: string;
  private readonly adminClaimRatioEnabled: number;
  private readonly adminClaimRatioDisabled: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService,
  ) {
    this.aiApiUrl = this.configService.get<string>('AI_API_URL', 'http://localhost:11434');
    this.ollamaModel = this.configService.get<string>('OLLAMA_MODEL', 'llava');
    this.sdApiUrl = this.configService.get<string>('SD_API_URL', 'http://localhost:7860');
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
   * Call Ollama API for image generation
   * Uses Ollama's local API with vision models
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
    // Ollama API endpoint for image generation
    // Uses models like llava, bakllava, or other vision models
    // Note: Ollama primarily supports text generation and vision understanding
    // For actual image generation, you may need to integrate with Stable Diffusion WebUI
    // or use Ollama with a custom endpoint that wraps SD

    try {
      const model = request.model || this.ollamaModel;
      
      // Generate a seed for reproducibility
      const seed = Math.floor(Math.random() * 1000000).toString();

      // For Ollama, we'll use the /api/generate endpoint
      // This is a text-to-image prompt that would work with SD integration
      const response = await fetch(`${this.aiApiUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: this.buildOllamaPrompt(request),
          stream: false,
          options: {
            seed: parseInt(seed),
            temperature: 0.8,
            num_predict: 512,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Since Ollama doesn't directly generate images, we need to handle this differently
      // Option 1: Use Ollama response to generate via SD WebUI
      // Option 2: Store the prompt and generate placeholder
      // Option 3: Integrate with local Stable Diffusion instance
      
      // For now, we'll create a workflow that saves the Ollama-enhanced prompt
      // and generates images via a local Stable Diffusion instance
      const enhancedPrompt = result.response || request.prompt;
      
      // Call local Stable Diffusion API (typically running on port 7860)
      const sdUrl = this.sdApiUrl;
      const sdResponse = await this.callStableDiffusionApi(sdUrl, {
        prompt: enhancedPrompt,
        negative_prompt: request.negativePrompt || '',
        width: request.width || 1024,
        height: request.height || 1024,
        seed: parseInt(seed),
        steps: 30,
        cfg_scale: 7,
        sampler_name: 'DPM++ 2M Karras',
      });

      return sdResponse;
    } catch (error) {
      this.logger.error('Ollama/SD generation error:', error.message);
      
      // For development/demo purposes, return mock data
      // In production, this should throw the error
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('Using mock data for development - configure Ollama and SD for production');
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
   * Build enhanced prompt using Ollama
   */
  private buildOllamaPrompt(request: GenerationRequest): string {
    let prompt = `You are an expert AI art prompt engineer. Enhance and expand the following image generation prompt to create a detailed, high-quality description for Stable Diffusion. Keep it concise but descriptive.\n\nOriginal prompt: ${request.prompt}`;
    
    if (request.style) {
      prompt += `\nStyle: ${request.style}`;
    }
    
    prompt += `\n\nProvide only the enhanced prompt, no additional text:`;
    
    return prompt;
  }

  /**
   * Call Stable Diffusion WebUI API for actual image generation
   */
  private async callStableDiffusionApi(
    sdUrl: string,
    params: {
      prompt: string;
      negative_prompt: string;
      width: number;
      height: number;
      seed: number;
      steps: number;
      cfg_scale: number;
      sampler_name: string;
    },
  ): Promise<{
    imageUrl: string;
    thumbnailUrl: string;
    watermarkUrl: string;
    fileSize: number;
    seed: string;
  }> {
    try {
      const response = await fetch(`${sdUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`SD API failed: ${response.statusText}`);
      }

      const result = await response.json();

      // SD returns base64 encoded images
      // We need to save these to S3 or local storage
      const imageData = result.images[0]; // Base64 string
      const imageUrls = await this.saveGeneratedImage(imageData, params.seed.toString());

      return {
        imageUrl: imageUrls.full,
        thumbnailUrl: imageUrls.thumbnail,
        watermarkUrl: imageUrls.watermark,
        fileSize: imageUrls.fileSize,
        seed: params.seed.toString(),
      };
    } catch (error) {
      this.logger.error('Stable Diffusion API error:', error.message);
      throw error;
    }
  }

  /**
   * Save generated image to storage (S3 or local)
   */
  private async saveGeneratedImage(
    base64Image: string,
    seed: string,
  ): Promise<{
    full: string;
    thumbnail: string;
    watermark: string;
    fileSize: number;
  }> {
    // TODO: Implement actual image saving to S3 or local storage
    // For now, return placeholder URLs
    const uuid = this.encryption.generateUUID();
    
    return {
      full: `/uploads/generated/${uuid}-${seed}.png`,
      thumbnail: `/uploads/thumbnails/${uuid}-${seed}.png`,
      watermark: `/uploads/watermarked/${uuid}-${seed}.png`,
      fileSize: 1024 * 1024, // Placeholder 1MB
    };
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
