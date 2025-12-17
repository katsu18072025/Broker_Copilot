#!/usr/bin/env node

/**
 * Generate a secure encryption key for token storage
 * 
 * Usage:
 *   node generateEncryptionKey.js
 * 
 * This will generate a 32-byte (256-bit) random hex string
 * suitable for AES-256-GCM encryption.
 * 
 * Add the generated key to your .env file as:
 *   ENCRYPTION_KEY=<generated_key>
 */

import crypto from 'crypto';

const key = crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Generated Encryption Key for Token Storage\n');
console.log('━'.repeat(70));
console.log('\nAdd this to your .env file:\n');
console.log(`ENCRYPTION_KEY=${key}`);
console.log('\n' + '━'.repeat(70));
console.log('\n⚠️  IMPORTANT: Keep this key secret and never commit it to git!');
console.log('💡 This key is used to encrypt OAuth tokens at rest.\n');
