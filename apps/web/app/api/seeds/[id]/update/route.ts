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
    
    // Extract auth fields
    const address = body?.address?.toString().toLowerCase();
    const signature = body?.signature?.toString();
    const nonce = body?.nonce?.toString();
    const timestamp = Number(body?.timestamp);

    if (!address || !signature || !nonce || !timestamp) {
      return NextResponse.json(
        { error: "Authentication required: address, signature, nonce, and timestamp must be provided" },
        { status: 401 }
      );
    }

    // Verify authentication
    const authResult = await verifyAuth(address, signature, nonce, timestamp, "update_seed", seedIdNum);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }
    
    // Check for identity fields - reject if present
    const identityFields = ['title', 'narrative_frame', 'root_category', 'hashroot', 'parent_seed_id'];
    const hasIdentityFields = identityFields.some(field => body[field] !== undefined);
    if (hasIdentityFields) {
      return NextResponse.json(
        { error: "Identity fields (title, narrative_frame, root_category, hashroot, parent_seed_id) cannot be updated. Only content_body and description can be updated." },
        { status: 400 },
      );
    }

    const contentBody = (body?.content_body ?? body?.content ?? "").toString().trim();
    const description = body?.description ? body.description.toString().trim() : null;

    if (!contentBody) {
      return NextResponse.json(
        { error: "Content body is required." },
        { status: 400 },
      );
    }

    // Validate content length (max 100k chars)
    if (contentBody.length > 100000) {
      return NextResponse.json(
        { error: "Content exceeds maximum length of 100,000 characters." },
        { status: 413 },
      );
    }

    // Fetch existing seed
    const { data: seed, error: seedError } = await supabase
      .from("seeds")
      .select("seed_id, latest_version, author_address")
      .eq("seed_id", seedIdNum)
      .single();

    if (seedError || !seed) {
      // Treat missing rows as 404; other cases as 500
      if ((seedError as any)?.code === "PGRST116" || !seed) {
        return NextResponse.json({ error: "Seed not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: (seedError as any)?.message ?? "Failed to load seed." },
        { status: 500 },
      );
    }

    // Enforce author-only updates
    if (seed.author_address?.toLowerCase() !== authResult.address) {
      return NextResponse.json(
        { error: "Only the original author can update this Seed" },
        { status: 403 }
      );
    }

    const nextVersion = (seed.latest_version ?? 0) + 1;

    // Insert new version row - only content_body and description
    const versionInsertData: any = {
      seed_id: seed.seed_id,
      version: nextVersion,
      content_body: contentBody,
    };
    
    if (description !== null) versionInsertData.description = description;

    const { error: versionError } = await supabase.from("seed_versions").insert(versionInsertData);

    if (versionError) {
      console.error(
        `[update seed] Failed to insert seed_versions for seed ${seed.seed_id} version ${nextVersion}:`,
        versionError,
      );
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
      // Log critical error: version row exists but seeds row not updated
      console.error(
        `[update seed] CRITICAL: seed_versions inserted successfully but failed to update seeds table for seed ${seed.seed_id} version ${nextVersion}:`,
        updateError,
      );
      return NextResponse.json(
        {
          error: `Failed to update seed metadata. Version ${nextVersion} was created but not linked. Contact support with seed_id: ${seed.seed_id}, version: ${nextVersion}. Error: ${updateError.message ?? "Unknown error"}`,
        },
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

