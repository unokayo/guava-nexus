"use client";

import { useState } from "react";

type Props = {
  address: string;
};

export function CopyAddressButton({ address }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }

  return (
    <button
      onClick={copyToClipboard}
      className="ml-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
      title="Copy full address"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}
