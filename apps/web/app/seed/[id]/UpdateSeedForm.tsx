"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  seedId: number;
  initialContent: string;
  initialVersion: number;
};

export function UpdateSeedForm({ seedId, initialContent, initialVersion }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isContentUnchanged = content.trim() === initialContent.trim();

  // Check for success message from URL params
  useEffect(() => {
    const updated = searchParams.get("updated");
    if (updated) {
      setMessage(`Published v${updated}.`);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isPublishing) return;

    setError(null);
    setMessage(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setError("Please write something before publishing an update.");
      return;
    }

    const numericSeedId = Number(seedId);
    if (!Number.isFinite(numericSeedId) || numericSeedId < 1) {
      setError("Invalid Seed. Please refresh the page and try again.");
      return;
    }

    try {
      setIsPublishing(true);

      const res = await fetch(`/api/seeds/${numericSeedId}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_body: trimmed }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Surface server error verbatim with safe fallback
        setError(
          json?.error ||
            "Publishing update failed. Please review your Seed and try again.",
        );
        return;
      }

      const version = typeof json?.version === "number" ? json.version : initialVersion + 1;
      
      // Navigate with success indicator to persist message after refresh
      router.push(`/seed/${seedId}?updated=${version}`);
      router.refresh();
    } catch (err) {
      setError(
        "We couldn’t reach the server. Check your connection and try again.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="update-content"
          className="mb-1 block text-sm text-zinc-500 dark:text-zinc-500"
        >
          Update Seed
        </label>
        <textarea
          id="update-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[160px] w-full resize-y rounded border border-zinc-200 bg-transparent px-3 py-2 text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
          placeholder="Write an updated version of this Seed."
        />
      </div>

      {error && (
        <p className="text-xs text-amber-600 dark:text-amber-500" role="alert">
          {error}
        </p>
      )}

      {message && !error && (
        <p className="text-xs text-emerald-600 dark:text-emerald-500">
          {message}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPublishing || isContentUnchanged}
          className="inline-flex w-full justify-center rounded border border-zinc-800 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPublishing ? "Publishing…" : "Publish update"}
        </button>
        {isContentUnchanged && !isPublishing && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            No changes to publish
          </p>
        )}
      </div>
    </form>
  );
}

