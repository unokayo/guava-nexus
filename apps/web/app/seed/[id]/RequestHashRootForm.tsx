"use client";

import { useState } from "react";

type Props = {
  seedId: number;
  onSuccess: () => void;
};

export function RequestHashRootForm({ seedId, onSuccess }: Props) {
  const [hashnameHandle, setHashnameHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedHandle = hashnameHandle.trim();
    if (!trimmedHandle) {
      setError("HashName handle is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/hashroots/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_id: seedId,
          hashname_handle: trimmedHandle,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to submit request");
      }

      setSuccess(`Request submitted for ${result.hashname_handle}`);
      setHashnameHandle("");
      
      // Refresh the page after a short delay to show the pending request
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to submit request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="hashnameHandle" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          Request HashRoot Attachment
        </label>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
          Request to attach this Seed to a HashName identity namespace. The HashName owner must approve.
        </p>
        <div className="flex gap-2">
          <input
            id="hashnameHandle"
            type="text"
            value={hashnameHandle}
            onChange={(e) => {
              setHashnameHandle(e.target.value);
              setError(null);
            }}
            placeholder="e.g., #tamadxyz or tamadxyz"
            disabled={isSubmitting}
            className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            aria-label="HashName handle"
          />
          <button
            type="submit"
            disabled={isSubmitting || !hashnameHandle.trim()}
            className="rounded border border-zinc-800 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
          >
            {isSubmitting ? "Submitting..." : "Request attachment"}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 dark:text-green-400">
          {success}
        </p>
      )}
    </form>
  );
}
