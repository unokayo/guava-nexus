"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/useWallet";
import { useSignature } from "@/lib/useSignature";
import { WalletBar } from "@/components/WalletBar";

type HashnameData = {
  id: number;
  handle: string;
  owner_label: string;
  owner_address: string | null;
  is_active: boolean;
};

export default function HashnamePage() {
  const params = useParams();
  const encodedHandle = params.handle as string;
  const rawHandle = decodeURIComponent(encodedHandle);

  const [hashname, setHashname] = useState<HashnameData | null>(null);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const { address } = useWallet();
  const { requestSignature, isSigning } = useSignature();

  // Normalize handle: ensure starts with "#", lowercase
  const normalizedHandle = rawHandle.startsWith("#") ? rawHandle.toLowerCase() : `#${rawHandle.toLowerCase()}`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch hashname and counts
        const res = await fetch(`/api/hashnames/${encodeURIComponent(normalizedHandle)}`);
        if (!res.ok) {
          throw new Error("Failed to load HashName data");
        }
        const data = await res.json();
        setHashname(data.hashname);

        // Fetch counts (using Supabase client on server via API response or separate calls)
        // For simplicity, let's add counts to the API response
        // But since the existing API doesn't return counts, we'll keep it simple
        // and just show the data we have. The user can navigate to /requests to see counts
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [normalizedHandle]);

  const handleClaim = async () => {
    if (!address || !hashname) return;

    try {
      setClaiming(true);
      setError(null);

      // Request signature
      const signedData = await requestSignature(address, "claim_hashname");
      if (!signedData) {
        throw new Error("Failed to get signature");
      }

      // Call claim API
      const res = await fetch("/api/hashnames/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: hashname.handle,
          ...signedData,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to claim HashName");
      }

      // Update local state
      setHashname({ ...hashname, owner_address: address.toLowerCase() });
      alert(result.message || "HashName claimed successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to claim HashName");
      alert(err.message || "Failed to claim HashName");
    } finally {
      setClaiming(false);
    }
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
        <main className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-zinc-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !hashname) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
        <main className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-red-600 dark:text-red-400">{error || "HashName not found"}</p>
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 mt-4 inline-block">
            ← Back to home
          </Link>
        </main>
      </div>
    );
  }

  const isOwner = address && hashname.owner_address && address.toLowerCase() === hashname.owner_address.toLowerCase();
  const canClaim = address && !hashname.owner_address && hashname.is_active;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
              GUAVA NEXUS v0
            </h1>
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← Home
            </Link>
          </div>
        </header>

        <section className="rounded border border-zinc-200 bg-zinc-50/50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-900/30">
          <h2 className="text-3xl font-semibold text-zinc-800 dark:text-zinc-200 mb-6 font-mono">
            {hashname.handle}
          </h2>

          <dl className="space-y-4 text-sm mb-6">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Status</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.is_active ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    Inactive
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Owner Label</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.owner_label}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Owner (Off-chain)</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.owner_address ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{shortenAddress(hashname.owner_address)}</code>
                    <button
                      onClick={() => copyToClipboard(hashname.owner_address!)}
                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Copy
                    </button>
                  </div>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-500">Unclaimed</span>
                )}
              </dd>
            </div>
          </dl>

          {/* Wallet Connection Section */}
          <div className="mb-6">
            <WalletBar />
          </div>

          {/* Ownership Actions */}
          {isOwner && (
            <div className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <p className="font-medium">You own this HashName</p>
              <p className="mt-1 text-xs">You can approve or reject hashroot requests for this identity namespace.</p>
            </div>
          )}

          {canClaim && (
            <div className="mb-6">
              <button
                onClick={handleClaim}
                disabled={claiming || isSigning}
                className="w-full rounded border border-zinc-800 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
              >
                {claiming || isSigning ? "Claiming..." : "Claim this HashName"}
              </button>
            </div>
          )}

          {/* Authority copy */}
          <div className="mt-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium mb-1">Identity Namespace (Off-chain Ownership)</p>
            <p>
              This HashName is an identity namespace. Seeds can only attach by owner approval. Ownership is tracked off-chain via wallet signatures.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-zinc-200 dark:border-zinc-700 pt-6">
            {isOwner && (
              <Link
                href={`/hashnames/${encodeURIComponent(hashname.handle)}/requests`}
                className="inline-block rounded border border-zinc-800 bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Manage requests
              </Link>
            )}
            <Link
              href="/"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
