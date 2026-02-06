import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key);
}

type Props = {
  params: Promise<{ handle: string }>;
};

export async function GET(req: Request, { params }: Props) {
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
    const { handle: rawHandle } = await params;
    
    // Normalize handle: decode, ensure starts with "#", lowercase
    let handle = decodeURIComponent(rawHandle);
    if (!handle.startsWith("#")) {
      handle = `#${handle}`;
    }
    handle = handle.toLowerCase();

    // Fetch hashname
    const { data: hashname, error: hashnameError } = await supabase
      .from("hashnames")
      .select("id, handle, owner_label, is_active")
      .eq("handle", handle)
      .single();

    if (hashnameError || !hashname) {
      return NextResponse.json({ error: "HashName not found." }, { status: 404 });
    }

    // Fetch pending requests for this hashname
    const { data: pendingRequests, error: requestsError } = await supabase
      .from("hashroot_requests")
      .select("id, seed_id, requester_label, created_at")
      .eq("hashname_id", hashname.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      return NextResponse.json(
        { error: requestsError.message ?? "Failed to fetch requests." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hashname,
      pending_requests: pendingRequests || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid request." }, { status: 500 });
  }
}
