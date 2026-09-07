import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard IV length for AES-GCM

/**
 * Derive a 32-byte encryption key from ENCRYPTION_SECRET or JWT_SECRET
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    'placetrack-super-secret-encryption-key-32chars';
  
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a plain text sensitive string (e.g. PAN, Aadhaar)
 * Result format: `enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 */
export function encryptSensitive(text?: string | null): string | null {
  if (!text) return null;
  const strText = String(text).trim();
  if (!strText) return null;

  // Don't double encrypt
  if (strText.startsWith('enc:')) {
    return strText;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(strText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return strText; // fallback to text on unexpected failure
  }
}

/**
 * Decrypt an encrypted sensitive string
 * Format expected: `enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 * Returns original text if already unencrypted (legacy backward compatibility)
 */
export function decryptSensitive(ciphertext?: string | null): string | null {
  if (!ciphertext) return null;
  const strText = String(ciphertext).trim();
  if (!strText) return null;

  // If not encrypted format, return as plain text (legacy data support)
  if (!strText.startsWith('enc:')) {
    return strText;
  }

  try {
    const parts = strText.split(':');
    if (parts.length !== 4) return strText;

    const [, ivHex, authTagHex, encryptedHex] = parts;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Fallback to text if decryption fails (e.g. key mismatch or bad data)
    return strText;
  }
}

/**
 * Decrypt PAN and Aadhaar fields in a student object
 */
export function decryptStudentSensitiveData<T extends Record<string, any>>(student: T): T;
export function decryptStudentSensitiveData<T extends Record<string, any>>(student: T | null | undefined): T | null | undefined;
export function decryptStudentSensitiveData<T extends Record<string, any>>(student: T | null | undefined): T | null | undefined {
  if (!student) return student;

  const copy: Record<string, any> = { ...student };
  if (copy.panNumber !== undefined && copy.panNumber !== null) {
    copy.panNumber = decryptSensitive(copy.panNumber);
  }
  if (copy.aadharNumber !== undefined && copy.aadharNumber !== null) {
    copy.aadharNumber = decryptSensitive(copy.aadharNumber);
  }
  return copy as T;
}

/**
 * Encrypt PAN and Aadhaar fields in a student data payload
 */
export function encryptStudentSensitiveData<T extends Record<string, any>>(data: T): T {
  if (!data) return data;

  const copy: Record<string, any> = { ...data };
  if (copy.panNumber !== undefined && copy.panNumber !== null && String(copy.panNumber).trim() !== '') {
    copy.panNumber = encryptSensitive(copy.panNumber);
  }
  if (copy.aadharNumber !== undefined && copy.aadharNumber !== null && String(copy.aadharNumber).trim() !== '') {
    copy.aadharNumber = encryptSensitive(copy.aadharNumber);
  }
  return copy as T;
}
