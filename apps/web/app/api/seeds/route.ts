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
    
    // Extract fields from body (backward compatible: content → content_body)
    const contentBody = (body?.content_body ?? body?.content ?? "").toString().trim();
    const title = body?.title ? body.title.toString().trim() : null;
    const narrativeFrame = body?.narrative_frame ? body.narrative_frame.toString().trim() : null;
    const narrativeBranch = body?.narrative_branch ? body.narrative_branch.toString().trim() : null;
    const rootCategory = body?.root_category ? body.root_category.toString().trim() : null;
    const hashroot = body?.hashroot ? body.hashroot.toString().trim() : null;
    const description = body?.description ? body.description.toString().trim() : null;
    const parentIdRaw = body?.parent_seed_id ?? body?.parentId ?? null;

    // Validate required fields
    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }
    
    if (!contentBody) {
      return NextResponse.json({ error: "Content body is required." }, { status: 400 });
    }
    
    if (!narrativeFrame) {
      return NextResponse.json({ error: "Narrative frame is required." }, { status: 400 });
    }
    
    if (!narrativeBranch) {
      return NextResponse.json({ error: "Narrative branch is required." }, { status: 400 });
    }
    
    if (!rootCategory) {
      return NextResponse.json({ error: "Root category (Idea Pillar) is required." }, { status: 400 });
    }

    // Validate narrative_branch belongs to narrative_frame
    const NARRATIVE_BRANCHES: Record<string, string[]> = {
      MAD: ["TAMAD XYZ", "Philosophy", "Art"],
      GUAVA: ["HashChat", "Blockchain", "Dots"],
    };
    
    const validBranches = NARRATIVE_BRANCHES[narrativeFrame];
    if (!validBranches || !validBranches.includes(narrativeBranch)) {
      return NextResponse.json({ 
        error: `Invalid narrative branch "${narrativeBranch}" for narrative frame "${narrativeFrame}".` 
      }, { status: 400 });
    }

    const parentId =
      parentIdRaw === null || parentIdRaw === undefined || parentIdRaw === ""
        ? null
        : Number(parentIdRaw);

    if (parentId !== null && (!Number.isFinite(parentId) || parentId < 0)) {
      return NextResponse.json({ error: "Invalid parent seed id." }, { status: 400 });
    }

    // 1) Create seed (identity) - includes identity fields
    // NOTE: seeds.narrative_branch column must exist in database
    console.log("[api/seeds] before seeds insert");
    const seedInsertData: any = {
      author_address: null,
      parent_seed_id: parentId,
      latest_version: 1,
      title: title,
      narrative_frame: narrativeFrame,
      narrative_branch: narrativeBranch,
      root_category: rootCategory,
    };
    
    if (hashroot !== null) seedInsertData.hashroot = hashroot;

    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .insert(seedInsertData)
      .select("seed_id, parent_seed_id, latest_version")
      .single();
    console.log("[api/seeds] after seeds insert", seedError ? seedError.message : "ok");

    if (seedError || !seed) {
      return NextResponse.json({ error: seedError?.message ?? "Failed to create seed." }, { status: 500 });
    }

    // 2) Create version 1 (history) - includes content_body and description
    console.log("[api/seeds] before seed_versions insert");
    const versionInsertData: any = {
      seed_id: seed.seed_id,
      version: 1,
      content_body: contentBody,
    };
    
    if (description !== null) versionInsertData.description = description;

    const { data: version, error: versionError } = await supabase
      .from("seed_versions")
      .insert(versionInsertData)
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