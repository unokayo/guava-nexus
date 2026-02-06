"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState("");
  const [parentIdError, setParentIdError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const charCount = content.length;
  const hasLengthWarning = charCount > 10000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setParentIdError("");
    if (isPublishing) {
      return;
    }
  
    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please write something before publishing.");
      return;
    }

    // Validate parent ID before making request
    let validParent: number | null = null;
    if (parentId.trim()) {
      const parentIdNum = parseInt(parentId.trim(), 10);
      if (Number.isNaN(parentIdNum) || parentIdNum < 1) {
        setParentIdError("Parent Seed ID must be a positive integer.");
        return;
      }
      validParent = parentIdNum;
    }
  
    try {
      setIsPublishing(true);

      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_body: trimmed,
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

      // Clear form state before navigation
      setContent("");
      setParentId("");
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
                GUAVA NEXUS v0
              </h1>
              <p className="mt-2 text-base text-zinc-500 dark:text-zinc-500">
                Publish with authorship and lineage
              </p>
            </div>
            <Link
              href="/seeds"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Browse seeds →
            </Link>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {charCount.toLocaleString()} characters
              </span>
              {hasLengthWarning && (
                <span className="text-xs text-amber-600 dark:text-amber-500">
                  Warning: content is very long ({charCount.toLocaleString()} chars)
                </span>
              )}
            </div>
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
              onChange={(e) => {
                setParentId(e.target.value);
                setParentIdError("");
              }}
              placeholder="Parent Seed ID…"
              className={`w-full rounded border bg-transparent px-4 py-2 text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder:text-zinc-500 ${
                parentIdError
                  ? "border-amber-600 focus:border-amber-500 dark:border-amber-500"
                  : "border-zinc-200 focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              }`}
              aria-label="Parent Seed ID"
            />
            {parentIdError && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                {parentIdError}
              </p>
            )}
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
