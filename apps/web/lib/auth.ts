import { verifyMessage, type Address } from 'viem';

const NONCE_EXPIRY_MINUTES = 10;

export type SignaturePayload = {
  address: string;
  nonce: string;
  timestamp: number;
  action: string;
  seed_id?: number;
};

/**
 * Generate a signing message for the user
 */
export function generateSigningMessage(payload: SignaturePayload): string {
  const lines = [
    'Guava Nexus Authentication',
    '',
    `Address: ${payload.address}`,
    `Action: ${payload.action}`,
    `Nonce: ${payload.nonce}`,
    `Timestamp: ${payload.timestamp}`,
  ];

  if (payload.seed_id !== undefined) {
    lines.push(`Seed ID: ${payload.seed_id}`);
  }

  lines.push('');
  lines.push('By signing this message, you prove ownership of this wallet address.');
  lines.push(`This signature is valid for ${NONCE_EXPIRY_MINUTES} minutes.`);

  return lines.join('\n');
}

/**
 * Verify a signature matches the expected address
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: expectedAddress as Address,
      message,
      signature: signature as `0x${string}`,
    });
    return isValid;
  } catch (error) {
    console.error('[auth] Signature verification failed:', error);
    return false;
  }
}

/**
 * Check if timestamp is within allowed window
 */
export function isTimestampValid(timestamp: number): boolean {
  const now = Date.now();
  const maxAge = NONCE_EXPIRY_MINUTES * 60 * 1000;
  return now - timestamp < maxAge && timestamp <= now;
}
