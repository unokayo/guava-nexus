import Link from "next/link";
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

export default async function SeedsIndexPage() {
  const supabase = getServiceRoleClient();

  const { data: seeds, error } = await supabase
    .from("seeds")
    .select("seed_id, parent_seed_id, latest_version, created_at, updated_at")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
        <main className="mx-auto max-w-5xl px-6 py-16">
          <header className="mb-12">
            <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
              GUAVA NEXUS v0
            </h1>
          </header>
          <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Failed to load seeds: {error.message}
          </div>
        </main>
      </div>
    );
  }

  const seedList = seeds ?? [];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
              GUAVA NEXUS v0
            </h1>
            <p className="mt-2 text-base text-zinc-500 dark:text-zinc-500">
              All seeds
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Home
          </Link>
        </header>

        <section className="rounded border border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/30">
          {seedList.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-500">
              No seeds found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-700">
                    <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                      Seed ID
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                      Parent
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {seedList.map((seed) => {
                    const timestamp = seed.updated_at ?? seed.created_at;
                    const displayTime = timestamp
                      ? new Date(timestamp).toISOString()
                      : "—";

                    return (
                      <tr
                        key={seed.seed_id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-6 py-4 font-mono text-zinc-800 dark:text-zinc-200">
                          {seed.seed_id}
                        </td>
                        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300">
                          v{seed.latest_version}
                        </td>
                        <td className="px-6 py-4 font-mono text-zinc-700 dark:text-zinc-300">
                          {seed.parent_seed_id ?? "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {displayTime}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/seed/${seed.seed_id}`}
                            className="text-xs font-medium text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Showing {seedList.length} most recent {seedList.length === 1 ? "seed" : "seeds"}
        </div>
      </main>
    </div>
  );
}
