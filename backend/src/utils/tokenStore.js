import crypto from 'crypto';
import fs from 'fs/promises';
import fssync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to encrypted token storage
const TOKEN_FILE_PATH = path.join(__dirname, '../../data/tokens.json');
const ENV_FILE_PATH = path.join(__dirname, '../../.env');

/**
 * TokenStore with encrypted file-based persistence
 * Features:
 * - AES-256-GCM encryption for tokens at rest
 * - Automatic save/load from disk
 * - Token expiry checking
 * - Auto-generates encryption key on first run
 */
class TokenStore {
  constructor() {
    this.tokens = {
      hubspot: null,
      google: null
    };

    // Encryption key from environment (32 bytes hex)
    this.encryptionKey = process.env.ENCRYPTION_KEY;

    // Auto-generate encryption key if missing
    if (!this.encryptionKey) {
      console.log('🔐 No ENCRYPTION_KEY found - generating new key...');
      this.encryptionKey = crypto.randomBytes(32).toString('hex');
      this.saveEncryptionKeyToEnv();
    }
  }

  /**
   * Save encryption key to .env file
   */
  saveEncryptionKeyToEnv() {
    try {
      let envContent = '';

      // Read existing .env if it exists
      if (fssync.existsSync(ENV_FILE_PATH)) {
        envContent = fssync.readFileSync(ENV_FILE_PATH, 'utf8');
      }

      // Check if ENCRYPTION_KEY already exists (shouldn't happen, but safety check)
      if (envContent.includes('ENCRYPTION_KEY=')) {
        console.log('ℹ️ ENCRYPTION_KEY already exists in .env');
        return;
      }

      // Append encryption key
      const newLine = envContent.endsWith('\n') || envContent === '' ? '' : '\n';
      const keyLine = `${newLine}\n# Auto-generated encryption key for OAuth token storage\nENCRYPTION_KEY=${this.encryptionKey}\n`;

      fssync.appendFileSync(ENV_FILE_PATH, keyLine, 'utf8');

      console.log('✅ Generated and saved ENCRYPTION_KEY to .env');
      console.log('💾 Token persistence is now ENABLED');
      console.log('⚠️ IMPORTANT: Keep .env file secure and never commit it to git!');
    } catch (error) {
      console.error('❌ Failed to save ENCRYPTION_KEY to .env:', error.message);
      console.warn('⚠️ Token persistence will work for this session only (in-memory)');
    }
  }

  /**
   * Encrypt token data using AES-256-GCM
   */
  encryptToken(tokenData) {
    if (!this.encryptionKey) return null;

    try {
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

      const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(tokenData), 'utf8'),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        encryptedData: encrypted.toString('hex')
      };
    } catch (error) {
      console.error('❌ Token encryption failed:', error.message);
      return null;
    }
  }

  /**
   * Decrypt token data using AES-256-GCM
   */
  decryptToken(encryptedToken) {
    if (!this.encryptionKey || !encryptedToken) return null;

    try {
      const key = Buffer.from(this.encryptionKey, 'hex');
      const iv = Buffer.from(encryptedToken.iv, 'hex');
      const authTag = Buffer.from(encryptedToken.authTag, 'hex');
      const encryptedData = Buffer.from(encryptedToken.encryptedData, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      console.error('❌ Token decryption failed:', error.message);
      return null;
    }
  }

  /**
   * Load tokens from disk on server startup
   */
  async loadFromDisk() {
    if (!this.encryptionKey) {
      console.log('ℹ️ Encryption disabled - using in-memory token storage only');
      return;
    }

    try {
      const fileContent = await fs.readFile(TOKEN_FILE_PATH, 'utf8');
      const encryptedTokens = JSON.parse(fileContent);

      // Decrypt HubSpot token if exists
      if (encryptedTokens.hubspot) {
        this.tokens.hubspot = this.decryptToken(encryptedTokens.hubspot);
        if (this.tokens.hubspot) {
          console.log('✅ Loaded HubSpot token from disk');
        }
      }

      // Decrypt Google token if exists
      if (encryptedTokens.google) {
        this.tokens.google = this.decryptToken(encryptedTokens.google);
        if (this.tokens.google) {
          console.log('✅ Loaded Google token from disk');
        }
      }

      console.log('💾 Token persistence active');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('ℹ️ No saved tokens found - starting fresh');
      } else {
        console.error('⚠️ Failed to load tokens from disk:', error.message);
        console.log('ℹ️ Starting with empty token store');
      }
    }
  }

  /**
   * Save tokens to disk (encrypted)
   */
  async saveToDisk() {
    if (!this.encryptionKey) {
      // Silently skip if encryption not configured
      return;
    }

    try {
      const encryptedTokens = {
        hubspot: this.tokens.hubspot ? this.encryptToken(this.tokens.hubspot) : null,
        google: this.tokens.google ? this.encryptToken(this.tokens.google) : null,
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(encryptedTokens, null, 2), 'utf8');
      console.log('💾 Tokens saved to disk (encrypted)');
    } catch (error) {
      console.error('❌ Failed to save tokens to disk:', error.message);
    }
  }

  /**
   * Set HubSpot token
   */
  setHubSpotToken(tokenData) {
    this.tokens.hubspot = {
      ...tokenData,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };
    console.log('✅ HubSpot token stored');

    // Auto-save to disk
    this.saveToDisk().catch(err =>
      console.error('⚠️ Auto-save failed:', err.message)
    );
  }

  /**
   * Get HubSpot token (with expiry check)
   */
  getHubSpotToken() {
    const token = this.tokens.hubspot;
    if (!token) return null;

    // Check if token is expired
    if (Date.now() >= token.expiresAt) {
      console.log('⚠️ HubSpot token expired');
      return null;
    }

    return token;
  }

  /**
   * Set Google token
   */
  setGoogleToken(tokenData) {
    this.tokens.google = {
      ...tokenData,
      expiresAt: Date.now() + (tokenData.expires_in * 1000)
    };
    console.log('✅ Google token stored');

    // Auto-save to disk
    this.saveToDisk().catch(err =>
      console.error('⚠️ Auto-save failed:', err.message)
    );
  }

  /**
   * Get Google token (with expiry check)
   */
  getGoogleToken() {
    const token = this.tokens.google;
    if (!token) return null;

    // Check if token is expired
    if (Date.now() >= token.expiresAt) {
      console.log('⚠️ Google token expired');
      return null;
    }

    return token;
  }

  /**
   * Check if HubSpot is connected
   */
  isHubSpotConnected() {
    return this.getHubSpotToken() !== null;
  }

  /**
   * Check if Google is connected
   */
  isGoogleConnected() {
    return this.getGoogleToken() !== null;
  }

  /**
   * Get connection health status
   */
  getHealthStatus() {
    return {
      hubspot: {
        connected: this.isHubSpotConnected(),
        tokenPersisted: !!this.encryptionKey && !!this.tokens.hubspot
      },
      google: {
        connected: this.isGoogleConnected(),
        tokenPersisted: !!this.encryptionKey && !!this.tokens.google
      },
      encryptionEnabled: !!this.encryptionKey
    };
  }

  /**
   * Clear all tokens (in-memory and disk)
   */
  async clearAll() {
    this.tokens = { hubspot: null, google: null };
    console.log('🗑️ All tokens cleared from memory');

    if (this.encryptionKey) {
      try {
        await fs.unlink(TOKEN_FILE_PATH);
        console.log('🗑️ Token file deleted from disk');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error('⚠️ Failed to delete token file:', error.message);
        }
      }
    }
  }

  /**
   * Optional: Clear tokens on graceful shutdown
   * (Currently NOT called - tokens persist by default)
   */
  async clearOnShutdown() {
    console.log('🛑 Clearing tokens on shutdown...');
    await this.clearAll();
  }
}

export const tokenStore = new TokenStore();