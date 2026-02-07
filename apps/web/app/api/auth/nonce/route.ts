import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase credentials");
  }
  return createClient(url, key);
}

const NONCE_EXPIRY_MINUTES = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const address = body?.address?.toLowerCase();

    if (!address || !/^0x[a-f0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { error: "Valid Ethereum address required" },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const nonce = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    // Upsert nonce (replace if address already has one)
    const { error } = await supabase
      .from("auth_nonces")
      .upsert(
        {
          address,
          nonce,
          expires_at: expiresAt,
        },
        { onConflict: "address" }
      );

    if (error) {
      console.error("[auth/nonce] Database error:", error);
      return NextResponse.json(
        { error: "Failed to generate nonce" },
        { status: 500 }
      );
    }

    return NextResponse.json({ nonce, expiresAt });
  } catch (err: any) {
    console.error("[auth/nonce] Error:", err);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 500 }
    );
  }
}
