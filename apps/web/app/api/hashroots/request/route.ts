import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/verifyAuth";

const SUPABASE_TIMEOUT_MS = 10_000;

function fetchWithTimeout(ms: number): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key, {
    global: { fetch: fetchWithTimeout(SUPABASE_TIMEOUT_MS) },
  });
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

    // Extract auth fields
    const address = body?.address?.toString().toLowerCase();
    const signature = body?.signature?.toString();
    const nonce = body?.nonce?.toString();
    const timestamp = Number(body?.timestamp);
    const seedId = body?.seed_id;
    let hashnameHandle = body?.hashname_handle ? body.hashname_handle.toString().trim() : "";

    // Validate required auth fields
    if (!address || !signature || !nonce || !timestamp) {
      return NextResponse.json(
        { error: "Authentication required: address, signature, nonce, and timestamp must be provided" },
        { status: 401 }
      );
    }

    // Validate seed_id
    if (!Number.isFinite(seedId) || seedId < 1) {
      return NextResponse.json({ error: "Valid seed_id is required." }, { status: 400 });
    }

    // Verify authentication
    const authResult = await verifyAuth(address, signature, nonce, timestamp, "request_hashroot", seedId);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Validate seed exists and get author
    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .select("seed_id, author_address")
      .eq("seed_id", seedId)
      .single();

    if (seedError || !seed) {
      return NextResponse.json(
        { error: `Seed #${seedId} does not exist.` },
        { status: 404 }
      );
    }

    // Check for null author_address (legacy seeds)
    if (!seed.author_address) {
      return NextResponse.json(
        { error: "Seed has no author address (legacy seed). Cannot request HashRoot." },
        { status: 403 }
      );
    }

    // Enforce author-only requests
    if (seed.author_address.toLowerCase() !== authResult.address) {
      return NextResponse.json(
        { error: "Only the Seed author can request HashRoot attachment" },
        { status: 403 }
      );
    }

    // Validate and normalize hashname_handle
    if (!hashnameHandle) {
      return NextResponse.json({ error: "Hashname handle is required." }, { status: 400 });
    }

    // Normalize: trim, ensure it starts with "#", lowercase
    if (!hashnameHandle.startsWith("#")) {
      hashnameHandle = `#${hashnameHandle}`;
    }
    hashnameHandle = hashnameHandle.toLowerCase();

    // Lookup hashname by handle
    const { data: hashname, error: hashnameError } = await supabase
      .from("hashnames")
      .select("id, handle, is_active")
      .eq("handle", hashnameHandle)
      .single();

    if (hashnameError || !hashname) {
      return NextResponse.json({ error: "HashName not found." }, { status: 404 });
    }

    if (!hashname.is_active) {
      return NextResponse.json({ error: "HashName is not active." }, { status: 400 });
    }

    // Check if already approved (seed_hashroots table)
    const { data: existingAttachment, error: attachmentError } = await supabase
      .from("seed_hashroots")
      .select("seed_id, hashname_id")
      .eq("seed_id", seedId)
      .eq("hashname_id", hashname.id)
      .maybeSingle();

    if (attachmentError && (attachmentError as any)?.code !== "PGRST116") {
      return NextResponse.json(
        { error: attachmentError.message ?? "Failed to check existing attachment." },
        { status: 500 }
      );
    }

    if (existingAttachment) {
      return NextResponse.json({
        ok: true,
        status: "already_approved",
        seed_id: seedId,
        hashname_handle: hashnameHandle,
      });
    }

    // Check for existing pending request (idempotent)
    const { data: existingRequest, error: existingError } = await supabase
      .from("hashroot_requests")
      .select("id, status, seed_id")
      .eq("seed_id", seedId)
      .eq("hashname_id", hashname.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError && (existingError as any)?.code !== "PGRST116") {
      return NextResponse.json(
        { error: existingError.message ?? "Failed to check existing request." },
        { status: 500 }
      );
    }

    if (existingRequest) {
      return NextResponse.json({
        ok: true,
        request_id: existingRequest.id,
        status: existingRequest.status,
        seed_id: existingRequest.seed_id,
        hashname_handle: hashnameHandle,
      });
    }

    // Insert new request (if rejected previously, allow retry)
    const { data: newRequest, error: insertError } = await supabase
      .from("hashroot_requests")
      .insert({
        seed_id: seedId,
        hashname_id: hashname.id,
        requester_label: authResult.address,
        status: "pending",
      })
      .select("id, status, seed_id")
      .single();

    if (insertError || !newRequest) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to create request." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      request_id: newRequest.id,
      status: newRequest.status,
      seed_id: newRequest.seed_id,
      hashname_handle: hashnameHandle,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Supabase request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}
