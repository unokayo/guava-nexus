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

    // Extract and validate fields
    const requestId = body?.request_id;
    const action = body?.action;
    const note = body?.note ? body.note.toString().trim() : null;
    const address = body?.address;
    const signature = body?.signature;
    const nonce = body?.nonce;
    const timestamp = body?.timestamp;

    // Validate request_id
    if (!Number.isFinite(requestId) || requestId < 1) {
      return NextResponse.json({ error: "Valid request_id is required." }, { status: 400 });
    }

    // Validate action
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Action must be 'accept' or 'reject'." }, { status: 400 });
    }

    // Validate authentication fields
    if (!address || !signature || !nonce || !timestamp) {
      return NextResponse.json({ 
        error: "Authentication fields (address, signature, nonce, timestamp) are required." 
      }, { status: 400 });
    }

    // Verify authentication
    const authResult = await verifyAuth(
      address,
      signature,
      nonce,
      timestamp,
      "resolve_hashroot",
      requestId
    );

    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const verifiedAddress = authResult.address; // normalized (lowercase)

    // 1) Fetch the request with associated hashname
    const { data: request, error: requestError } = await supabase
      .from("hashroot_requests")
      .select(`
        id,
        seed_id,
        hashname_id,
        status,
        hashnames!inner(
          id,
          handle,
          owner_address
        )
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    // Extract hashname data (Supabase returns joined data as object or array)
    const hashname = Array.isArray(request.hashnames) ? request.hashnames[0] : request.hashnames;
    if (!hashname) {
      return NextResponse.json({ error: "Failed to load hashname data." }, { status: 500 });
    }

    // 2) Check if request is already resolved
    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already resolved." }, { status: 400 });
    }

    // 3) Check if verified address owns the hashname
    if (!hashname.owner_address) {
      return NextResponse.json(
        { error: "HashName is unclaimed. Claim it first before resolving requests." },
        { status: 403 }
      );
    }

    if (hashname.owner_address !== verifiedAddress) {
      return NextResponse.json(
        { error: "Only the HashName owner can resolve requests." },
        { status: 403 }
      );
    }

    // 4) Process action
    if (action === "accept") {
      // Insert into seed_hashroots (idempotent - ignore if already exists)
      const { error: attachError } = await supabase
        .from("seed_hashroots")
        .insert({
          seed_id: request.seed_id,
          hashname_id: request.hashname_id,
          attached_by_label: verifiedAddress,
        })
        .select()
        .single();

      // If duplicate key error, treat as ok (idempotent)
      if (attachError && (attachError as any)?.code !== "23505") {
        return NextResponse.json(
          { error: attachError.message ?? "Failed to attach hashroot." },
          { status: 500 }
        );
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from("hashroot_requests")
        .update({
          status: "accepted",
          resolved_at: new Date().toISOString(),
          decision_note: note,
        })
        .eq("id", requestId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message ?? "Failed to update request status." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: "accepted",
        seed_id: request.seed_id,
        hashname_handle: hashname.handle,
      });
    } else {
      // action === "reject"
      // Update request status to rejected
      const { error: updateError } = await supabase
        .from("hashroot_requests")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          decision_note: note,
        })
        .eq("id", requestId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message ?? "Failed to update request status." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        status: "rejected",
        seed_id: request.seed_id,
        hashname_handle: hashname.handle,
      });
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Supabase request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}
