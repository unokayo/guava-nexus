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
  console.log("[api/hashroots/resolve] hit");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("[api/hashroots/resolve] error: missing env");
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required." },
      { status: 500 }
    );
  }

  try {
    const supabase = getServiceRoleClient();
    const body = await req.json();
    console.log("[api/hashroots/resolve] after json");

    // Extract and validate fields
    const requestId = body?.request_id;
    const action = body?.action;
    const resolverLabel = body?.resolver_label ? body.resolver_label.toString().trim() : "";
    const note = body?.note ? body.note.toString().trim() : null;

    // Validate request_id
    if (!Number.isFinite(requestId) || requestId < 1) {
      return NextResponse.json({ error: "Valid request_id is required." }, { status: 400 });
    }

    // Validate action
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "Action must be 'accept' or 'reject'." }, { status: 400 });
    }

    if (!resolverLabel) {
      return NextResponse.json({ error: "Resolver label is required." }, { status: 400 });
    }

    // 1) Fetch the request with associated hashname
    console.log("[api/hashroots/resolve] fetching request:", requestId);
    const { data: request, error: requestError } = await supabase
      .from("hashroot_requests")
      .select(`
        request_id,
        seed_id,
        hashname_id,
        status,
        hashnames!inner(
          hashname_id,
          handle,
          owner_label
        )
      `)
      .eq("request_id", requestId)
      .single();

    if (requestError || !request) {
      console.log("[api/hashroots/resolve] request not found");
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    // Extract hashname data (Supabase returns joined data as object or array)
    const hashname = Array.isArray(request.hashnames) ? request.hashnames[0] : request.hashnames;
    if (!hashname) {
      console.error("[api/hashroots/resolve] hashname join failed");
      return NextResponse.json({ error: "Failed to load hashname data." }, { status: 500 });
    }

    // 2) Check if request is already resolved
    if (request.status !== "pending") {
      console.log("[api/hashroots/resolve] request already resolved:", request.status);
      return NextResponse.json({ error: "Request already resolved." }, { status: 400 });
    }

    // 3) TEMP AUTH: Check if resolver_label matches hashname.owner_label
    if (resolverLabel !== hashname.owner_label) {
      console.log("[api/hashroots/resolve] auth failed: resolver does not match owner");
      return NextResponse.json(
        { error: "Only HashName owner can resolve requests." },
        { status: 403 }
      );
    }

    // 4) Process action
    if (action === "accept") {
      console.log("[api/hashroots/resolve] accepting request");

      // Insert into seed_hashroots (idempotent - ignore if already exists)
      const { error: attachError } = await supabase
        .from("seed_hashroots")
        .insert({
          seed_id: request.seed_id,
          hashname_id: request.hashname_id,
          attached_by_label: resolverLabel,
        })
        .select()
        .single();

      // If duplicate key error, treat as ok (idempotent)
      if (attachError && (attachError as any)?.code !== "23505") {
        console.error("[api/hashroots/resolve] failed to attach hashroot:", attachError);
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
        .eq("request_id", requestId);

      if (updateError) {
        console.error("[api/hashroots/resolve] failed to update request:", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "Failed to update request status." },
          { status: 500 }
        );
      }

      console.log("[api/hashroots/resolve] accepted successfully");
      return NextResponse.json({
        ok: true,
        status: "accepted",
        seed_id: request.seed_id,
        hashname_handle: hashname.handle,
      });
    } else {
      // action === "reject"
      console.log("[api/hashroots/resolve] rejecting request");

      // Update request status to rejected
      const { error: updateError } = await supabase
        .from("hashroot_requests")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          decision_note: note,
        })
        .eq("request_id", requestId);

      if (updateError) {
        console.error("[api/hashroots/resolve] failed to update request:", updateError);
        return NextResponse.json(
          { error: updateError.message ?? "Failed to update request status." },
          { status: 500 }
        );
      }

      console.log("[api/hashroots/resolve] rejected successfully");
      return NextResponse.json({
        ok: true,
        status: "rejected",
        seed_id: request.seed_id,
        hashname_handle: hashname.handle,
      });
    }
  } catch (err: any) {
    console.log("[api/hashroots/resolve] error", err?.message);
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Supabase request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}
