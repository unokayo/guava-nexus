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
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  return createClient(url, key, {
    global: { fetch: fetchWithTimeout(SUPABASE_TIMEOUT_MS) },
  });
}

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, { params }: RouteParams) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
      },
      { status: 500 },
    );
  }

  try {
    const supabase = getServiceRoleClient();

    const { id } = await params;
    const seedIdNum = Number(id);
    if (!Number.isFinite(seedIdNum) || seedIdNum < 1) {
      return NextResponse.json({ error: "Invalid seed id." }, { status: 400 });
    }

    const body = await req.json();
    const content = (body?.content ?? "").toString().trim();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 },
      );
    }

    // Fetch existing seed
    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .select("seed_id, latest_version")
      .eq("seed_id", seedIdNum)
      .single();

    if (seedError || !seed) {
      // Treat missing rows as 404; other cases as 500
      if ((seedError as any)?.code === "PGRST116" || !seed) {
        return NextResponse.json({ error: "Seed not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: seedError?.message ?? "Failed to load seed." },
        { status: 500 },
      );
    }

    const nextVersion = (seed.latest_version ?? 0) + 1;

    // Insert new version row
    const { error: versionError } = await supabase.from("seed_versions").insert({
      seed_id: seed.seed_id,
      version: nextVersion,
      content,
    });

    if (versionError) {
      return NextResponse.json(
        { error: versionError.message ?? "Failed to create version." },
        { status: 500 },
      );
    }

    // Update seed latest_version and updated_at
    const { error: updateError } = await supabase
      .from("seeds")
      .update({
        latest_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("seed_id", seed.seed_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message ?? "Failed to update seed." },
        { status: 500 },
      );
    }

    return NextResponse.json({ seed_id: seed.seed_id, version: nextVersion });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { error: "Supabase request timed out" },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: err?.message ?? "Invalid request." },
      { status: 500 },
    );
  }
}

