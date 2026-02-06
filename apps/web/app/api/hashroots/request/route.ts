import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Extract and validate fields
    const seedId = body?.seed_id;
    let hashnameHandle = body?.hashname_handle ? body.hashname_handle.toString().trim() : "";
    const requesterLabel = body?.requester_label ? body.requester_label.toString().trim() : "anonymous";

    // Validate seed_id
    if (!Number.isFinite(seedId) || seedId < 1) {
      return NextResponse.json({ error: "Valid seed_id is required." }, { status: 400 });
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

    // 1) Lookup hashname by handle
    const { data: hashname, error: hashnameError } = await supabase
      .from("hashnames")
      .select("id, handle, is_active")
      .eq("handle", hashnameHandle)
      .single();

    if (hashnameError || !hashname || !hashname.is_active) {
      return NextResponse.json({ error: "Unknown HashName." }, { status: 400 });
    }

    // 2) Check for existing pending request (idempotent)
    const { data: existingRequest, error: existingError } = await supabase
      .from("hashroot_requests")
      .select("id, status, seed_id")
      .eq("seed_id", seedId)
      .eq("hashname_id", hashname.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message ?? "Failed to check existing request." },
        { status: 500 }
      );
    }

    if (existingRequest) {
      return NextResponse.json({
        request_id: existingRequest.id,
        status: existingRequest.status,
        seed_id: existingRequest.seed_id,
        hashname_handle: hashnameHandle,
      });
    }

    // 3) Insert new request
    const { data: newRequest, error: insertError } = await supabase
      .from("hashroot_requests")
      .insert({
        seed_id: seedId,
        hashname_id: hashname.id,
        requester_label: requesterLabel,
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
