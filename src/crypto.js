/**
 * VaultNote — 2-Tier Cryptographic Engine (Web Crypto API)
 * Tier 1: App Entry Lock (PIN / Password Verification + Idle Auto-Lock)
 * Tier 2: Zero-Knowledge AES-256-GCM + PBKDF2 (100,000 iterations) for Secure Vault & Locked Notes
 */

const ITERATIONS = 100000;

function bufToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export const VaultCrypto = {
  /**
   * Create a verification verifier for App Entry Lock or Vault Master Password
   */
  async createVerifier(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode('VAULTNOTE_VERIFIED_OK_V1')
    );
    return {
      v: 1,
      salt: bufToBase64(salt.buffer),
      iv: bufToBase64(iv.buffer),
      cipher: bufToBase64(cipher)
    };
  },

  /**
   * Verify a password against a stored verifier
   */
  async verifyPassword(password, verifier) {
    if (!verifier || !verifier.salt || !verifier.iv || !verifier.cipher) return false;
    try {
      const salt = new Uint8Array(base64ToBuf(verifier.salt));
      const iv = new Uint8Array(base64ToBuf(verifier.iv));
      const key = await deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        base64ToBuf(verifier.cipher)
      );
      const text = new TextDecoder().decode(decrypted);
      return text === 'VAULTNOTE_VERIFIED_OK_V1';
    } catch {
      return false;
    }
  },

  /**
   * Encrypt any JS object or string with AES-256-GCM
   */
  async encryptData(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const enc = new TextEncoder();
    const jsonStr = JSON.stringify(data);
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(jsonStr)
    );
    return {
      __encrypted: true,
      v: 1,
      alg: 'AES-256-GCM',
      kdf: 'PBKDF2-SHA256',
      iter: ITERATIONS,
      salt: bufToBase64(salt.buffer),
      iv: bufToBase64(iv.buffer),
      cipher: bufToBase64(cipher),
      updatedAt: new Date().toISOString()
    };
  },

  /**
   * Decrypt an AES-256-GCM envelope back into original JS data
   */
  async decryptData(envelope, password) {
    if (!envelope || !envelope.__encrypted) return envelope;
    const salt = new Uint8Array(base64ToBuf(envelope.salt));
    const iv = new Uint8Array(base64ToBuf(envelope.iv));
    const key = await deriveKey(password, salt);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      base64ToBuf(envelope.cipher)
    );
    const jsonStr = new TextDecoder().decode(plainBuffer);
    return JSON.parse(jsonStr);
  }
};
