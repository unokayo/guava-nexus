"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/lib/useWallet";
import { useSignature } from "@/lib/useSignature";

type HashnameData = {
  id: number;
  handle: string;
  owner_label: string;
  owner_address: string | null;
  is_active: boolean;
};

type PendingRequest = {
  id: number;
  seed_id: number;
  requester_label: string;
  created_at: string;
};

export default function HashnameRequestsPage() {
  const params = useParams();
  const encodedHandle = params.handle as string;
  const handle = decodeURIComponent(encodedHandle);

  const [hashname, setHashname] = useState<HashnameData | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { address, connect, isConnecting } = useWallet();
  const { requestSignature, isSigning } = useSignature();

  // Normalize handle: ensure starts with "#", lowercase
  const normalizedHandle = handle.startsWith("#") ? handle.toLowerCase() : `#${handle.toLowerCase()}`;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch hashname and pending requests
        const res = await fetch(`/api/hashnames/${encodeURIComponent(normalizedHandle)}`);
        if (!res.ok) {
          throw new Error("Failed to load HashName data");
        }
        const data = await res.json();
        setHashname(data.hashname);
        setRequests(data.pending_requests || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [normalizedHandle]);

  const handleResolve = async (requestId: number, action: "accept" | "reject") => {
    if (!address || !hashname) {
      alert("Please connect your wallet first");
      return;
    }

    if (!hashname.owner_address) {
      alert("This HashName is unclaimed. Claim it first to resolve requests.");
      return;
    }

    if (hashname.owner_address.toLowerCase() !== address.toLowerCase()) {
      alert("Only the HashName owner can resolve requests");
      return;
    }

    try {
      setProcessingId(requestId);
      setError(null);

      // Request signature with request_id as seed_id
      const signedData = await requestSignature(address, "resolve_hashroot", requestId);
      if (!signedData) {
        throw new Error("Failed to get signature");
      }

      // Call resolve API
      const res = await fetch("/api/hashroots/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          note: "",
          ...signedData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to resolve request");
      }

      // Remove from list on success
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      alert(`Request ${action === "accept" ? "approved" : "rejected"} successfully`);
    } catch (err: any) {
      setError(err.message || "Failed to resolve request");
      alert(err.message || "Failed to resolve request");
    } finally {
      setProcessingId(null);
    }
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
  const canResolve = isOwner;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
      <main className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-2xl font-normal tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
            GUAVA NEXUS v0
          </h1>
        </header>

        <section className="rounded border border-zinc-200 bg-zinc-50/50 px-6 py-8 dark:border-zinc-700 dark:bg-zinc-900/30">
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-4 font-mono">
            {hashname.handle}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            HashName Inbox
          </p>

          {/* Authority copy */}
          <div className="mb-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium mb-1">You control what associates with this HashName.</p>
            <p>
              Approving a Seed makes it part of this HashName&apos;s public semantic graph.
            </p>
          </div>

          <dl className="space-y-3 text-sm mb-6">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Handle</dt>
              <dd className="mt-0.5 font-mono text-zinc-800 dark:text-zinc-200">
                {hashname.handle}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Owner Label</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.owner_label}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Status</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.is_active ? "Active" : "Inactive"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Owner (Off-chain)</dt>
              <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                {hashname.owner_address ? (
                  <code className="text-xs">{hashname.owner_address}</code>
                ) : (
                  <span className="text-zinc-500 dark:text-zinc-500">Unclaimed</span>
                )}
              </dd>
            </div>
          </dl>

          {/* Wallet Connection */}
          {!address && (
            <div className="mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium mb-2">Connect wallet to manage requests</p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="rounded border border-zinc-800 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            </div>
          )}

          {/* Not Owner Warning */}
          {address && !isOwner && (
            <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">You are not the owner of this HashName</p>
              <p className="mt-1 text-xs">Only the owner can approve or reject requests.</p>
            </div>
          )}

          {/* Pending Requests */}
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Pending Association Requests ({requests.length})
            </h3>
            {requests.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-500">No pending requests.</p>
            ) : (
              <ul className="space-y-3">
                {requests.map((req) => (
                  <li key={req.id} className="rounded border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="flex items-start justify-between">
                      <div className="text-sm">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200">
                          Seed ID: <Link href={`/seed/${req.seed_id}`} className="underline hover:no-underline">{req.seed_id}</Link>
                        </div>
                        <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          Requested by: {req.requester_label || "anonymous"}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                          {new Date(req.created_at).toISOString()}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleResolve(req.id, "accept")}
                          disabled={!canResolve || processingId === req.id || isSigning}
                          className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
                        >
                          {processingId === req.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleResolve(req.id, "reject")}
                          disabled={!canResolve || processingId === req.id || isSigning}
                          className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
                        >
                          {processingId === req.id ? "..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/hashnames/${encodeURIComponent(normalizedHandle)}`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              ← HashName page
            </Link>
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
