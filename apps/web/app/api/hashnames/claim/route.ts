import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/verifyAuth";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key);
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required." },
      { status: 500 }
    );
  }

  try {
    const supabase = getServiceRoleClient();
    const body = await req.json();

    // Extract fields
    let handle = body?.handle ? body.handle.toString().trim() : "";
    const address = body?.address;
    const signature = body?.signature;
    const nonce = body?.nonce;
    const timestamp = body?.timestamp;

    // Validate required fields
    if (!handle) {
      return NextResponse.json({ error: "Handle is required." }, { status: 400 });
    }
    if (!address || !signature || !nonce || !timestamp) {
      return NextResponse.json({ 
        error: "Authentication fields (address, signature, nonce, timestamp) are required." 
      }, { status: 400 });
    }

    // Normalize handle: trim, ensure starts with "#", lowercase
    if (!handle.startsWith("#")) {
      handle = `#${handle}`;
    }
    handle = handle.toLowerCase();

    // Verify authentication
    const authResult = await verifyAuth(
      address,
      signature,
      nonce,
      timestamp,
      "claim_hashname",
      undefined
    );

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const verifiedAddress = authResult.address; // normalized (lowercase)

    // Lookup hashname by handle
    const { data: hashname, error: hashnameError } = await supabase
      .from("hashnames")
      .select("id, handle, owner_address, is_active")
      .eq("handle", handle)
      .single();

    if (hashnameError || !hashname) {
      return NextResponse.json({ error: "HashName not found." }, { status: 404 });
    }

    // Check if active
    if (!hashname.is_active) {
      return NextResponse.json({ error: "HashName is not active." }, { status: 400 });
    }

    // Check ownership status
    if (hashname.owner_address === null) {
      // Unclaimed - claim it for the verified address
      const { error: updateError } = await supabase
        .from("hashnames")
        .update({ owner_address: verifiedAddress })
        .eq("id", hashname.id)
        .eq("owner_address", null); // ensure it's still unclaimed

      if (updateError) {
        // Could be race condition - check again
        const { data: recheck } = await supabase
          .from("hashnames")
          .select("owner_address")
          .eq("id", hashname.id)
          .single();

        if (recheck && recheck.owner_address === verifiedAddress) {
          // Someone else (or us in race) claimed it for the same address - ok
          return NextResponse.json({
            ok: true,
            handle,
            owner_address: verifiedAddress,
            message: "HashName claimed successfully.",
          });
        }

        return NextResponse.json(
          { error: updateError.message ?? "Failed to claim HashName." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        handle,
        owner_address: verifiedAddress,
        message: "HashName claimed successfully.",
      });
    } else if (hashname.owner_address === verifiedAddress) {
      // Already owned by this address - idempotent
      return NextResponse.json({
        ok: true,
        handle,
        owner_address: verifiedAddress,
        message: "You already own this HashName.",
      });
    } else {
      // Already claimed by someone else
      return NextResponse.json(
        { error: "HashName already claimed by another wallet." },
        { status: 409 }
      );
    }
  } catch (err: any) {
    console.error("[hashnames/claim] Error:", err);
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}
