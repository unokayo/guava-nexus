"use client";

import { useState } from "react";

type Props = {
  seedId: number;
  parentSeedId: number | null;
  version: number;
  versionUuid: string;
  createdAt: string | null;
};

export function CopyProvenanceButton({
  seedId,
  parentSeedId,
  version,
  versionUuid,
  createdAt,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    setError(null);

    const lines = [
      `Seed ID: ${seedId}`,
      parentSeedId != null ? `Parent: ${parentSeedId}` : null,
      `Version: v${version}`,
      createdAt ? `Created: ${createdAt}` : null,
      versionUuid ? `Version UUID: ${versionUuid}` : null,
    ].filter(Boolean);

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("Unable to copy provenance.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center rounded border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {copied ? "Copied" : "Copy provenance"}
      </button>
      {error && (
        <p className="max-w-xs text-xs text-amber-600 dark:text-amber-500">
          {error}
        </p>
      )}
    </div>
  );
}
