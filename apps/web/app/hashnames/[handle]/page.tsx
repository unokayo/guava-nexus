import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ handle: string }>;
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key);
}

export default async function HashnamePage({ params }: Props) {
  const { handle: rawHandle } = await params;
  
  // Normalize handle: decode, ensure starts with "#", lowercase
  let handle = decodeURIComponent(rawHandle);
  if (!handle.startsWith("#")) {
    handle = `#${handle}`;
  }
  handle = handle.toLowerCase();

  const supabase = getServiceRoleClient();

  // Fetch hashname
  const { data: hashname, error: hashnameError } = await supabase
    .from("hashnames")
    .select("id, handle, owner_label, is_active")
    .eq("handle", handle)
    .single();

  if (hashnameError || !hashname) {
    notFound();
  }

  // Fetch counts
  const { count: approvedCount } = await supabase
    .from("seed_hashroots")
    .select("*", { count: "exact", head: true })
    .eq("hashname_id", hashname.id);

  const { count: pendingCount } = await supabase
    .from("hashroot_requests")
    .select("*", { count: "exact", head: true })
    .eq("hashname_id", hashname.id)
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
            GUAVA NEXUS v0
          </h1>
        </header>

        <section className="rounded border border-zinc-200 bg-zinc-50/50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-900/30">
          <h2 className="text-3xl font-semibold text-zinc-800 dark:text-zinc-200 mb-6 font-mono">
            {hashname.handle}
          </h2>

          <dl className="space-y-4 text-sm mb-6">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Status</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    Inactive
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Owner Label</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.owner_label}
              </dd>
            </div>
          </dl>

          {/* Authority copy */}
          <div className="mt-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium mb-1">Identity Namespace</p>
            <p>
              This HashName is an identity namespace. Seeds can only attach by owner approval.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              <dt className="text-xs text-zinc-500 dark:text-zinc-500">Approved Attachments</dt>
              <dd className="mt-1 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
                {approvedCount ?? 0}
              </dd>
            </div>
            <div className="rounded border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              <dt className="text-xs text-zinc-500 dark:text-zinc-500">Pending Requests</dt>
              <dd className="mt-1 text-2xl font-semibold text-zinc-800 dark:text-zinc-200">
                {pendingCount ?? 0}
              </dd>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {pendingCount && pendingCount > 0 ? (
              <Link
                href={`/hashnames/${encodeURIComponent(hashname.handle)}/requests`}
                className="inline-block rounded border border-zinc-800 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Review {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}
              </Link>
            ) : (
              <Link
                href={`/hashnames/${encodeURIComponent(hashname.handle)}/requests`}
                className="inline-block rounded border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                View inbox
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Back to home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
