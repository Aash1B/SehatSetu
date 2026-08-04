import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private key: Buffer;

  onModuleInit() {
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be set in .env as a 64-character hex string');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plainText: string | null | undefined): string | null {
    if (plainText === null || plainText === undefined) return null;

    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(cipherText: string | null | undefined): string | null {
    if (cipherText === null || cipherText === undefined) return null;

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // Not in our encrypted format — likely legacy plaintext data from before encryption was added
      return cipherText;
    }

    try {
      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Decryption failed (tampered data, wrong key, or corrupted) — fail safe rather than crash
      return null;
    }
  }
}