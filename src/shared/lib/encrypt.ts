const ALGORITHM = 'AES-GCM';
const PREFIX = 'ENC:';
const IV_LENGTH = 12;
const KEY_BYTES = 32;

function getKeyHex(): string {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not defined');
  }
  return keyHex;
}

async function getCryptoKey(): Promise<CryptoKey> {
  const keyHex = getKeyHex();
  const keyData = Uint8Array.from(Buffer.from(keyHex, 'hex'));

  return await crypto.subtle.importKey('raw', keyData, { name: ALGORITHM, length: KEY_BYTES * 8 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, new TextEncoder().encode(plaintext));

  const encryptedArray = new Uint8Array(encrypted);
  const authTag = encryptedArray.slice(encryptedArray.length - 16);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);

  return `${PREFIX}${Buffer.from(iv).toString('hex')}:${Buffer.from(authTag).toString('hex')}:${Buffer.from(ciphertext).toString('hex')}`;
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getCryptoKey();
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.slice(PREFIX.length).split(':');

  const iv = Uint8Array.from(Buffer.from(ivHex, 'hex'));
  const authTag = Uint8Array.from(Buffer.from(authTagHex, 'hex'));
  const ciphertext = Uint8Array.from(Buffer.from(ciphertextHex, 'hex'));

  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext);
  combined.set(authTag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, combined);

  return new TextDecoder().decode(decrypted);
}

export function isEncrypted(token: string): boolean {
  return token.startsWith(PREFIX);
}

export function getEncryptionKey(): string {
  return getKeyHex();
}
