import 'dotenv/config'; // Load env vars
import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import { tokenStore } from '../src/utils/tokenStore.js';

describe('Token Store Encryption', () => {

    it('should encrypt and decrypt data correctly', () => {
        // Ensure we have an encryption key (auto-generated if missing)
        if (!tokenStore.encryptionKey) {
            tokenStore.encryptionKey = '1234567890123456789012345678901212345678901234567890123456789012'; // Mock hex key
        }

        const originalData = { access_token: 'abc-123', refresh_token: 'xyz-789' };

        // Encrypt
        const encrypted = tokenStore.encryptToken(originalData);

        assert.ok(encrypted.iv);
        assert.ok(encrypted.authTag);
        assert.ok(encrypted.encryptedData);

        // Decrypt
        const decrypted = tokenStore.decryptToken(encrypted);

        assert.deepStrictEqual(decrypted, originalData);
    });

    it('should return null for invalid encrypted data', () => {
        const result = tokenStore.decryptToken(null);
        assert.strictEqual(result, null);
    });

});
