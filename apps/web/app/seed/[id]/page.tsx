import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CopyLinkButton } from "./CopyLinkButton";
import { UpdateSeedForm } from "./UpdateSeedForm";
import { CopyProvenanceButton } from "./CopyProvenanceButton";
import { CopyAddressButton } from "./CopyAddressButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key);
}

export default async function SeedReceiptPage({ params, searchParams }: Props) {
  const { id } = await params;
  const routeSeedId = Number(id);
  if (!Number.isFinite(routeSeedId) || routeSeedId < 1) {
    notFound();
  }

  const supabase = getServiceRoleClient();

  const { data: seed, error: seedError } = await supabase
    .from("seeds")
    .select("seed_id, title, narrative_frame, root_category, parent_seed_id, latest_version, created_at, author_address")
    .eq("seed_id", routeSeedId)
    .single();

  if (seedError || !seed) {
    notFound();
  }

  // Fetch all versions for this seed
  const { data: allVersions, error: versionsError } = await supabase
    .from("seed_versions")
    .select("id, version, content_body, description, created_at")
    .eq("seed_id", seed.seed_id)
    .order("version", { ascending: false });

  if (versionsError || !allVersions || allVersions.length === 0) {
    notFound();
  }

  // Fetch accepted HashRoots
  const { data: acceptedHashroots } = await supabase
    .from("seed_hashroots")
    .select(`
      hashname_id,
      attached_at,
      hashnames!inner(handle)
    `)
    .eq("seed_id", seed.seed_id)
    .order("attached_at", { ascending: false });

  // Fetch pending HashRoot requests
  const { data: pendingRequests } = await supabase
    .from("hashroot_requests")
    .select(`
      id,
      requester_label,
      created_at,
      hashnames!inner(handle)
    `)
    .eq("seed_id", seed.seed_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Fetch rejected HashRoot requests (Archive)
  const { data: rejectedRequests } = await supabase
    .from("hashroot_requests")
    .select(`
      id,
      requester_label,
      decision_note,
      resolved_at,
      hashnames!inner(handle)
    `)
    .eq("seed_id", seed.seed_id)
    .eq("status", "rejected")
    .order("resolved_at", { ascending: false });

  // Determine which version to display
  const query = await searchParams;
  const requestedVersion = query.v ? Number(query.v) : null;
  const targetVersion =
    requestedVersion !== null && Number.isFinite(requestedVersion)
      ? requestedVersion
      : seed.latest_version;

  const versionRow = allVersions.find((v) => v.version === targetVersion);

  // Show "version not found" if requested version doesn't exist
  const versionNotFound = !versionRow;

  const createdAt =
    versionRow?.created_at != null
      ? new Date(versionRow.created_at).toISOString()
      : null;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
            GUAVA NEXUS v0
          </h1>
        </header>

        <section className="rounded border border-zinc-200 bg-zinc-50/50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-900/30">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-6">
            {seed.title || `Untitled Seed #${seed.seed_id}`}
          </h2>
          
          {!versionNotFound && versionRow.version !== seed.latest_version && (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              Viewing historical version v{versionRow.version} (latest is{" "}
              <Link
                href={`/seed/${seed.seed_id}`}
                className="font-medium underline hover:no-underline"
              >
                v{seed.latest_version}
              </Link>
              )
            </div>
          )}

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Seed ID</dt>
                <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">
                  {seed.seed_id}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Version</dt>
                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                  {versionNotFound ? (
                    <span className="text-amber-600 dark:text-amber-500">
                      Version not found
                    </span>
                  ) : (
                    `v${versionRow.version}`
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">
                  Created
                </dt>
                <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">
                  {createdAt ?? "—"}
                </dd>
              </div>
              {seed.narrative_frame && (
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-500">
                    Narrative Frame
                  </dt>
                  <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                    {seed.narrative_frame}
                  </dd>
                </div>
              )}
              {seed.root_category && (
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-500">
                    Root Category
                  </dt>
                  <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                    {seed.root_category}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">
                  Wallet Author
                </dt>
                <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                  {seed.author_address ? (
                    <span className="flex items-center">
                      <span className="font-mono">
                        {seed.author_address.slice(0, 6)}...{seed.author_address.slice(-4)}
                      </span>
                      <CopyAddressButton address={seed.author_address} />
                    </span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-500 italic">
                      Unknown (pre-auth seed)
                    </span>
                  )}
                </dd>
              </div>
              {seed.parent_seed_id != null && (
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-500">
                    Derived from
                  </dt>
                  <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">
                    {seed.parent_seed_id}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-2 flex flex-col gap-2 md:mt-0">
              <CopyLinkButton />
              {!versionNotFound && (
                <CopyProvenanceButton
                  seedId={seed.seed_id}
                  parentSeedId={seed.parent_seed_id}
                  version={versionRow.version}
                  versionUuid={versionRow.id}
                  createdAt={createdAt}
                />
              )}
            </div>
          </div>

          {/* HashRoots Section */}
          <div className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              HashRoots (Approved)
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              Approved HashRoots are consented semantic attachments to a HashName.
            </p>
            {acceptedHashroots && acceptedHashroots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {acceptedHashroots.map((hr) => {
                  const hashname = Array.isArray(hr.hashnames) ? hr.hashnames[0] : hr.hashnames;
                  const handle = hashname?.handle || "unknown";
                  return (
                    <Link
                      key={hr.hashname_id}
                      href={`/hashnames/${encodeURIComponent(handle)}/requests`}
                      className="inline-flex items-center rounded-full bg-zinc-800 px-3 py-1 text-xs font-mono text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      {handle}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-500">No approved HashRoots yet.</p>
            )}
          </div>

          {/* Pending Requests Section */}
          {pendingRequests && pendingRequests.length > 0 && (
            <div className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                HashRoot Requests (Pending)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                Pending requests require confirmation by the HashName owner.
              </p>
              <ul className="space-y-2">
                {pendingRequests.map((req) => {
                  const hashname = Array.isArray(req.hashnames) ? req.hashnames[0] : req.hashnames;
                  const handle = hashname?.handle || "unknown";
                  return (
                    <li key={req.id} className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-3 py-2 opacity-60">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">{handle}</span>
                        <span className="text-zinc-500 dark:text-zinc-500 text-[0.7rem]">
                          Awaiting approval
                        </span>
                      </div>
                      <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                        Requested by: {req.requester_label || 'anonymous'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Rejected Requests Archive */}
          {rejectedRequests && rejectedRequests.length > 0 && (
            <details className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
              <summary className="cursor-pointer text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 hover:text-zinc-900 dark:hover:text-zinc-100">
                HashRoot Archive (Rejected) ({rejectedRequests.length})
              </summary>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 mt-2">
                Rejected requests are archived and do not attach to the HashName.
              </p>
              <ul className="space-y-2">
                {rejectedRequests.map((req) => {
                  const hashname = Array.isArray(req.hashnames) ? req.hashnames[0] : req.hashnames;
                  const handle = hashname?.handle || "unknown";
                  return (
                    <li key={req.id} className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-3 py-2 opacity-50">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-zinc-700 dark:text-zinc-300">{handle}</span>
                        <span className="text-zinc-500 dark:text-zinc-500 text-[0.7rem]">
                          {req.resolved_at ? new Date(req.resolved_at).toISOString().split('T')[0] : '—'}
                        </span>
                      </div>
                      <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                        Requested by: {req.requester_label || 'anonymous'}
                      </div>
                      {req.decision_note ? (
                        <div className="mt-1 text-zinc-500 dark:text-zinc-500 italic">
                          Note: {req.decision_note}
                        </div>
                      ) : (
                        <div className="mt-1 text-zinc-500 dark:text-zinc-500">
                          Rejected
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          {/* Versions list */}
          <div className="mt-6 border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Versions
            </h3>
            <ul className="space-y-2">
              {allVersions.map((v) => {
                const isActive = !versionNotFound && v.version === versionRow.version;
                const vCreatedAt = v.created_at
                  ? new Date(v.created_at).toISOString()
                  : "—";
                return (
                  <li key={v.version}>
                    <Link
                      href={`/seed/${seed.seed_id}?v=${v.version}`}
                      className={`block rounded px-3 py-2 text-xs transition-colors ${
                        isActive
                          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="font-medium">v{v.version}</span>
                      <span className="ml-2 font-mono text-[0.7rem]">
                        {vCreatedAt}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {versionNotFound ? (
            <div className="mt-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              The requested version does not exist for this Seed.
            </div>
          ) : (
            <>
              {versionRow.content_body != null && versionRow.content_body !== "" && Number.isFinite(seed.seed_id as any) && (
                <div className="mt-6 space-y-4">
                  {versionRow.description && (
                    <div>
                      <dt className="text-zinc-500 dark:text-zinc-500 text-sm mb-2 block">
                        Description
                      </dt>
                      <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-2">
                        {versionRow.description}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500 text-sm mb-2 block">
                      Content
                    </dt>
                    <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-2">
                      {versionRow.content_body}
                    </dd>
                  </div>

                  {versionRow.version === seed.latest_version && (
                    <div className="pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-700">
                      <UpdateSeedForm
                        seedId={Number(seed.seed_id)}
                        initialContent={versionRow.content_body ?? ""}
                        initialVersion={versionRow.version}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-block rounded border border-zinc-800 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Publish another
            </Link>
            <Link
              href="/seeds"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              All seeds →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
