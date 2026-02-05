"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (isPublishing) {
      return;
    }
  
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please write something before publishing.");
      return;
    }
  
    const parentIdNum = parentId.trim()
      ? parseInt(parentId.trim(), 10)
      : null;
  
    const validParent =
      parentIdNum !== null && !Number.isNaN(parentIdNum)
        ? parentIdNum
        : null;
  
    try {
      setIsPublishing(true);

      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          parent_seed_id: validParent,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(
          json?.error ??
            "Publishing failed. Please review your Seed and try again."
        );
        return;
      }

      router.push(`/seed/${json.seed_id}`);
    } catch (err) {
      setError(
        "We couldn’t reach the server. Check your connection and try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
            GUAVA NEXUS v0
          </h1>
          <p className="mt-2 text-base text-zinc-500 dark:text-zinc-500">
            Publish with authorship and lineage
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your Seed here. This will be published as an authored work."
              className="min-h-[280px] w-full resize-y rounded border border-zinc-200 bg-transparent px-4 py-3 text-lg leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Seed content"
            />
          </div>

          <div>
            <label htmlFor="parentId" className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500">
              Derived from (optional)
            </label>
            <input
              id="parentId"
              type="text"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="Parent Seed ID…"
              className="w-full rounded border border-zinc-200 bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
              aria-label="Parent Seed ID"
            />
          </div>

          {error && (
            <p className="text-sm text-amber-600 dark:text-amber-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isPublishing}
              className="w-full rounded border border-zinc-800 bg-zinc-800 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isPublishing ? "Publishing…" : "Publish Seed"}
            </button>
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-500">
              Publishing anchors authorship and version history on-chain.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
