import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Props = {
  params: Promise<{ id: string }>;
};

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  return createClient(url, key);
}

export default async function SeedReceiptPage({ params }: Props) {
  const { id } = await params;
  const seedId = Number(id);
  if (!Number.isFinite(seedId) || seedId < 1) {
    notFound();
  }

  const supabase = getServiceRoleClient();

  const { data: seed, error: seedError } = await supabase
    .from("seeds")
    .select("seed_id, parent_seed_id, latest_version, created_at")
    .eq("seed_id", seedId)
    .single();

  if (seedError || !seed) {
    notFound();
  }

  const { data: versionRow, error: versionError } = await supabase
    .from("seed_versions")
    .select("version, content, created_at")
    .eq("seed_id", seed.seed_id)
    .eq("version", seed.latest_version)
    .single();

  if (versionError || !versionRow) {
    notFound();
  }

  const createdAt =
    versionRow.created_at != null
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
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            Seed published
          </h2>
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Seed ID</dt>
              <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{seed.seed_id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Version</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">v{versionRow.version}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Timestamp</dt>
              <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{createdAt ?? "—"}</dd>
            </div>
            {seed.parent_seed_id != null && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Derived from</dt>
                <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{seed.parent_seed_id}</dd>
              </div>
            )}
          </dl>

          {versionRow.content != null && versionRow.content !== "" && (
            <div className="mt-6">
              <dt className="text-zinc-500 dark:text-zinc-500 text-sm mb-2 block">Content</dt>
              <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 border-t border-zinc-200 dark:border-zinc-700 pt-4 mt-2">
                {versionRow.content}
              </dd>
            </div>
          )}

          <div className="mt-8">
            <Link
              href="/"
              className="inline-block rounded border border-zinc-800 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Publish another
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
