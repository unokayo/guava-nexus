"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

type PendingRequest = {
  id: number;
  seed_id: number;
  requester_label: string;
  created_at: string;
  seeds?: { title: string } | { title: string }[];
};

type TabView = "pending" | "approved" | "archive";

export default function HashnameRequestsPage() {
  const params = useParams();
  const router = useRouter();
  const encodedHandle = params.handle as string;
  const handle = decodeURIComponent(encodedHandle);

  const [hashname, setHashname] = useState<HashnameData | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("pending");

  const { address } = useWallet();
  const { requestSignature, isSigning } = useSignature();

  // Normalize handle: ensure starts with "#", lowercase
  const normalizedHandle = handle.startsWith("#") ? handle.toLowerCase() : `#${handle.toLowerCase()}`;

  useEffect(() => {
    fetchData();
  }, [normalizedHandle]);

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

  const handleResolve = async (requestId: number, action: "accept" | "reject", note?: string) => {
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
      setActionSuccess(null);

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
          note: note || "",
          ...signedData,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to resolve request");
      }

      // Remove from list and show success
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      setActionSuccess(`Request ${action === "accept" ? "approved" : "rejected"} successfully`);
      
      // Refresh after short delay to show updated state
      setTimeout(() => {
        router.refresh();
        fetchData();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to resolve request");
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  if (error && !hashname) {
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

  if (!hashname) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans)]">
        <main className="mx-auto max-w-2xl px-6 py-16">
          <p className="text-zinc-500">HashName not found</p>
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
          <h2 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2 font-mono">
            {hashname.handle}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            HashName Owner Inbox
          </p>

          {/* Authority copy */}
          <div className="mb-6 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium mb-1">You control what associates with this HashName.</p>
            <p>
              Approving a Seed makes it part of this HashName&apos;s public semantic graph.
            </p>
          </div>

          {/* HashName Metadata */}
          <dl className="space-y-3 text-sm mb-6 border-b border-zinc-200 dark:border-zinc-700 pb-6">
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
          <div className="mb-6">
            <WalletBar />
          </div>

          {/* Not Owner Warning */}
          {address && !isOwner && (
            <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">You are not the owner of this HashName</p>
              <p className="mt-1 text-xs">Only the owner can approve or reject requests.</p>
            </div>
          )}

          {/* Action Success Toast */}
          {actionSuccess && (
            <div className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <p>{actionSuccess}</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              <p>{error}</p>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-zinc-200 dark:border-zinc-700 mb-6">
            <nav className="flex gap-4">
              <button
                onClick={() => setActiveTab("pending")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "pending"
                    ? "border-zinc-800 text-zinc-800 dark:border-zinc-200 dark:text-zinc-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                Pending ({requests.length})
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "approved"
                    ? "border-zinc-800 text-zinc-800 dark:border-zinc-200 dark:text-zinc-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setActiveTab("archive")}
                className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "archive"
                    ? "border-zinc-800 text-zinc-800 dark:border-zinc-200 dark:text-zinc-200"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                Archive
              </button>
            </nav>
          </div>

          {/* Pending Requests Tab */}
          {activeTab === "pending" && (
            <div>
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Pending Association Requests
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                Review requests from Seed authors to associate their work with this HashName.
              </p>
              {requests.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-700 rounded">
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-2">No pending requests</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600">
                    When Seed authors request association, they&apos;ll appear here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {requests.map((req) => {
                    const seedData = Array.isArray(req.seeds) ? req.seeds[0] : req.seeds;
                    const seedTitle = seedData?.title || `Seed #${req.seed_id}`;
                    
                    return (
                      <li key={req.id} className="rounded border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2">
                              <Link 
                                href={`/seed/${req.seed_id}`}
                                className="font-medium text-zinc-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                {seedTitle}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 dark:text-zinc-500">Seed ID:</span>
                              <Link 
                                href={`/seed/${req.seed_id}`}
                                className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                              >
                                {req.seed_id}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-zinc-500 dark:text-zinc-500">Requester:</span>
                              <button
                                onClick={() => copyToClipboard(req.requester_label || "anonymous")}
                                className="text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Click to copy"
                              >
                                {req.requester_label ? `${req.requester_label.slice(0, 6)}...${req.requester_label.slice(-4)}` : "anonymous"}
                              </button>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-500">
                              {new Date(req.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => handleResolve(req.id, "accept")}
                              disabled={!canResolve || processingId === req.id || isSigning}
                              className="rounded bg-green-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
                            >
                              {processingId === req.id ? "Processing..." : "Approve"}
                            </button>
                            <button
                              onClick={() => handleResolve(req.id, "reject")}
                              disabled={!canResolve || processingId === req.id || isSigning}
                              className="rounded bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
                            >
                              {processingId === req.id ? "Processing..." : "Reject"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Approved Tab */}
          {activeTab === "approved" && (
            <div>
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Approved Associations
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                Seeds that are part of this HashName&apos;s semantic graph.
              </p>
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-700 rounded">
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-2">View approved Seeds on the HashName page</p>
                <Link
                  href={`/hashnames/${encodeURIComponent(normalizedHandle)}`}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Go to HashName page →
                </Link>
              </div>
            </div>
          )}

          {/* Archive Tab */}
          {activeTab === "archive" && (
            <div>
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                Request Archive
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                Rejected requests are archived here for reference.
              </p>
              <div className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-700 rounded">
                <p className="text-sm text-zinc-500 dark:text-zinc-500">No archived requests</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 pt-6 border-t border-zinc-200 dark:border-zinc-700">
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
