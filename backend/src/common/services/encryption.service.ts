/**
 * Enterprise Encryption Service
 * AES-256-GCM for data at rest
 * Secure key management and rotation support
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

export interface EncryptedField {
  encrypted: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltLength = 64;
  private readonly iterations = 100000;
  private readonly digest = 'sha512';
  
  private masterKey: Buffer;
  private keyVersion: number = 1;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key || key.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }
    // Derive a 256-bit key from the provided key
    this.masterKey = crypto.scryptSync(key, 'salt', this.keyLength);
    this.logger.log('Encryption service initialized with AES-256-GCM');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      if (!plaintext) {
        throw new Error('Cannot encrypt empty data');
      }

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Encrypt
      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');
      
      // Get authentication tag
      const tag = cipher.getAuthTag();
      
      return {
        ciphertext,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        version: this.keyVersion,
      };
    } catch (error) {
      this.logger.error('Encryption failed', error.stack);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      if (!encryptedData?.ciphertext || !encryptedData?.iv || !encryptedData?.tag) {
        throw new Error('Invalid encrypted data format');
      }

      // Convert hex strings back to buffers
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const tag = Buffer.from(encryptedData.tag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt
      let plaintext = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');
      
      return plaintext;
    } catch (error) {
      this.logger.error('Decryption failed', error.stack);
      throw new Error('Decryption failed - data may be corrupted or tampered');
    }
  }

  /**
   * Encrypt a field for database storage
   */
  encryptField(value: string): string {
    const encrypted = this.encrypt(value);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt a field from database storage
   */
  decryptField(encryptedValue: string): string {
    try {
      const parsed: EncryptedData = JSON.parse(encryptedValue);
      return this.decrypt(parsed);
    } catch (error) {
      this.logger.error('Field decryption failed', error.stack);
      throw new Error('Field decryption failed');
    }
  }

  /**
   * Hash sensitive data (one-way, for search/indexing)
   */
  hash(value: string, salt?: string): string {
    const useSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
    const hash = crypto.pbkdf2Sync(
      value,
      useSalt,
      this.iterations,
      this.keyLength,
      this.digest
    );
    return `${useSalt}$${hash.toString('hex')}`;
  }

  /**
   * Verify a hash
   */
  verifyHash(value: string, hashedValue: string): boolean {
    const [salt] = hashedValue.split('$');
    const newHash = this.hash(value, salt);
    return crypto.timingSafeEqual(
      Buffer.from(newHash),
      Buffer.from(hashedValue)
    );
  }

  /**
   * Generate HMAC for data integrity verification
   */
  hmac(data: string): string {
    return crypto
      .createHmac('sha256', this.masterKey)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHmac(data: string, signature: string): boolean {
    const expectedHmac = this.hmac(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedHmac)
    );
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Derive key from password
   */
  deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.iterations,
      this.keyLength,
      this.digest
    );
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  secureCompare(a: string, b: string): boolean {
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Encrypt object fields selectively
   */
  encryptObjectFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field] !== undefined && encrypted[field] !== null) {
        const value = String(encrypted[field]);
        (encrypted as any)[field] = this.encryptField(value);
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt object fields selectively
   */
  decryptObjectFields<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field] !== undefined && decrypted[field] !== null) {
        try {
          const value = String(decrypted[field]);
          (decrypted as any)[field] = this.decryptField(value);
        } catch (error) {
          this.logger.warn(`Failed to decrypt field ${String(field)}`);
          // Keep original value if decryption fails
        }
      }
    }
    
    return decrypted;
  }

  /**
   * Create SHA-256 hash for ledger entries
   */
  sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create SHA-512 hash
   */
  sha512(data: string): string {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  /**
   * Rotate encryption key (for key rotation strategy)
   */
  rotateKey(newKey: string): void {
    if (!newKey || newKey.length < 32) {
      throw new Error('New key must be at least 32 characters');
    }
    
    this.masterKey = crypto.scryptSync(newKey, 'salt', this.keyLength);
    this.keyVersion++;
    
    this.logger.log(`Encryption key rotated to version ${this.keyVersion}`);
  }

  /**
   * Get current key version
   */
  getKeyVersion(): number {
    return this.keyVersion;
  }
}
