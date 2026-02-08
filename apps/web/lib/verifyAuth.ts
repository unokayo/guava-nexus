import { createClient } from "@supabase/supabase-js";
import { verifySignature, generateSigningMessage, isTimestampValid, type SignaturePayload } from "./auth";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(url, key);
}

export type AuthVerificationResult =
  | { success: true; address: string }
  | { success: false; error: string; status: number };

/**
 * Verify signature and nonce for write operations
 */
export async function verifyAuth(
  address: string,
  signature: string,
  nonce: string,
  timestamp: number,
  action: string,
  seed_id?: number
): Promise<AuthVerificationResult> {
  const normalizedAddress = address.toLowerCase();

  // Validate address format
  if (!/^0x[a-f0-9]{40}$/i.test(normalizedAddress)) {
    return { success: false, error: "Invalid address format", status: 400 };
  }

  // Validate timestamp
  if (!isTimestampValid(timestamp)) {
    return { success: false, error: "Signature expired", status: 401 };
  }

  // Verify nonce exists and hasn't expired
  const supabase = getServiceRoleClient();
  const { data: nonceData, error: nonceError } = await supabase
    .from("auth_nonces")
    .select("nonce, expires_at")
    .eq("address", normalizedAddress)
    .single();

  if (nonceError || !nonceData) {
    return { success: false, error: "Invalid or expired nonce", status: 401 };
  }

  if (nonceData.nonce !== nonce) {
    return { success: false, error: "Nonce mismatch", status: 401 };
  }

  if (new Date(nonceData.expires_at) < new Date()) {
    return { success: false, error: "Nonce expired", status: 401 };
  }

  // Verify signature
  const payload: SignaturePayload = { 
    address: normalizedAddress, 
    nonce, 
    timestamp,
    action,
    seed_id
  };
  const message = generateSigningMessage(payload);
  const isValid = await verifySignature(message, signature, normalizedAddress);

  if (!isValid) {
    return { success: false, error: "Invalid signature", status: 401 };
  }

  // Delete used nonce (single-use)
  await supabase.from("auth_nonces").delete().eq("address", normalizedAddress);

  return { success: true, address: normalizedAddress };
}
