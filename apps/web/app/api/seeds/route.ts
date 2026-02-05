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

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  console.log("[api/seeds] hit");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("[api/seeds] error: missing env");
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required." },
      { status: 500 }
    );
  }
  try {
    const supabase = getServiceRoleClient();
    const body = await req.json();
    console.log("[api/seeds] after json");
    const content = (body?.content ?? "").toString().trim();
    const parentIdRaw = body?.parent_seed_id ?? body?.parentId ?? null;

    if (!content) {
      return NextResponse.json({ error: "Content is required." }, { status: 400 });
    }

    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (parentId !== null && (!Number.isFinite(parentId) || parentId < 0)) {
      return NextResponse.json({ error: "Invalid parent seed id." }, { status: 400 });
    }

    // 1) Create seed (identity)
    console.log("[api/seeds] before seeds insert");
    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .insert({
        author_address: null,
        parent_seed_id: parentId,
        latest_version: 1,
      })
      .select("seed_id, parent_seed_id, latest_version")
      .single();
    console.log("[api/seeds] after seeds insert", seedError ? seedError.message : "ok");

    if (seedError || !seed) {
      return NextResponse.json({ error: seedError?.message ?? "Failed to create seed." }, { status: 500 });
    }

    // 2) Create version 1 (history)
    console.log("[api/seeds] before seed_versions insert");
    const { data: version, error: versionError } = await supabase
      .from("seed_versions")
      .insert({
        seed_id: seed.seed_id,
        version: 1,
        content,
      })
      .select("id, created_at")
      .single();
    console.log("[api/seeds] after seed_versions insert", versionError ? versionError.message : "ok");

    if (versionError || !version) {
      // cleanup: delete the seed row if version insert fails
      await supabase.from("seeds").delete().eq("seed_id", seed.seed_id);
      return NextResponse.json({ error: versionError?.message ?? "Failed to create version." }, { status: 500 });
    }

    return NextResponse.json({ seed_id: seed.seed_id });
  } catch (err: any) {
    console.log("[api/seeds] error", err?.message);
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Supabase request timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}