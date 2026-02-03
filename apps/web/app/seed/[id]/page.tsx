import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ parentId?: string }>;
};

export default async function SeedReceiptPage({ params, searchParams }: Props) {
  const { id } = await params;
  const resolved = await searchParams;
  const parentId = resolved?.parentId ?? null;
  const timestamp = new Date().toISOString();

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
              <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Version</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">v1</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Timestamp</dt>
              <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{timestamp}</dd>
            </div>
            {parentId != null && parentId !== "" && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Derived from</dt>
                <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">{parentId}</dd>
              </div>
            )}
          </dl>

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
